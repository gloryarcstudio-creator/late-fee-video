"""Fit a big-win intro clip (batch 09) onto its in-game loop and encode it.
usage: python3 tools/art/bw_intro.py IN.mp4 LOOP.mp4 OUT_BASE [crf_mp4=26] [crf_webm=36]
The game's loops (batch 08) were scaled and moved down inside a 960x540 frame; the intros were rendered on the 1920x1080 key.
The intro's last frame is matched to the loop's first frame (SIFT + RANSAC similarity), every frame gets the same transform
on black, so the cut from intro to loop is seamless. Writes OUT_BASE.mp4 (H.264) and OUT_BASE.webm (VP9), no audio."""
import sys, subprocess, cv2, numpy as np
src, loop, out = sys.argv[1:4]
CRF = int(sys.argv[4]) if len(sys.argv) > 4 else 26
CRFW = int(sys.argv[5]) if len(sys.argv) > 5 else 36
W, H = 960, 540

def frames(path):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={W}:{H}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(p, np.uint8).reshape(-1, H, W, 3)

fr, ref = frames(src), frames(loop)[0]
sift = cv2.SIFT_create(4000)
ka, da = sift.detectAndCompute(cv2.cvtColor(fr[-1], cv2.COLOR_BGR2GRAY), None)
kb, db = sift.detectAndCompute(cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY), None)
good = [m for m, n in cv2.BFMatcher().knnMatch(da, db, k=2) if m.distance < 0.75 * n.distance]
M, inl = cv2.estimateAffinePartial2D(np.float32([ka[m.queryIdx].pt for m in good]), np.float32([kb[m.trainIdx].pt for m in good]), method=cv2.RANSAC, ransacReprojThreshold=2)
out_fr = np.stack([cv2.warpAffine(f, M, (W, H), flags=cv2.INTER_AREA if np.hypot(M[0, 0], M[1, 0]) < 1 else cv2.INTER_CUBIC, borderValue=(0, 0, 0)) for f in fr])
print(f'{src}: {len(fr)} frames, scale {np.hypot(M[0, 0], M[1, 0]):.3f}, shift {M[0, 2]:.0f},{M[1, 2]:.0f}, inliers {int(inl.sum())}/{len(good)}, '
      f'last vs loop[0] {np.abs(out_fr[-1].astype(int) - ref.astype(int)).mean():.1f}/255')
raw = out_fr.tobytes()
inp = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '24', '-i', '-', '-an']
subprocess.run(inp + ['-c:v', 'libx264', '-profile:v', 'main', '-preset', 'slow', '-crf', str(CRF), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out + '.mp4'], input=raw, check=True)
subprocess.run(inp + ['-c:v', 'libvpx-vp9', '-crf', str(CRFW), '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1', '-pix_fmt', 'yuv420p', out + '.webm'], input=raw, check=True)
