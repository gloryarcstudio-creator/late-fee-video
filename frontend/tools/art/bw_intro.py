"""Fit a big-win intro clip (batch 09) onto its in-game loop and encode it.
usage: python3 tools/art/bw_intro.py IN.mp4 LOOP.mp4 OUT_BASE [crf_mp4=26] [crf_webm=36] [--cut N --reveal K]
The game's loops (batch 08) were scaled and moved down inside a 960x540 frame; the intros were rendered on the 1920x1080 key.
The intro's last frame is matched to the loop's first frame (SIFT + RANSAC similarity), every frame gets the same transform
on black, so the cut from intro to loop is seamless. Writes OUT_BASE.mp4 (H.264) and OUT_BASE.webm (VP9), no audio.
--cut N --reveal K: keep only frames 0..N-1 (the batch 09 EPIC and CULT generations drift into the previous tier's scene after
that, then crossfade to their own key), black out the marquee-lamp ring near the frame edge, and end with K frames that bloom
from frame N-1 into the loop's first frame (crossfade under a decaying brightness boost)."""
import sys, subprocess, cv2, numpy as np
def flag(name):
    if name not in sys.argv: return None
    i = sys.argv.index(name); v = int(sys.argv[i + 1]); del sys.argv[i:i + 2]; return v
CUT, REVEAL = flag('--cut'), flag('--reveal') or 10
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
if CUT:
    # ring mask: 0 within ~4.5 % of the source frame edge (where the stray lamp border sits), feathered, then warped like the frames
    yy, xx = np.mgrid[0:H, 0:W]; d = np.minimum(np.minimum(xx, W - 1 - xx) / W, np.minimum(yy, H - 1 - yy) / H)
    ring = cv2.warpAffine(np.clip((d - 0.045) / 0.03, 0, 1).astype(np.float32), M, (W, H), borderValue=0)[..., None]
    keep = [f.astype(np.float32) * ring for f in out_fr[:CUT]]
    last, ref32 = keep[-1], ref.astype(np.float32)
    for i in range(1, REVEAL + 1):
        t = i / REVEAL; w = t * t * (3 - 2 * t)
        keep.append(((1 - w) * last + w * ref32) * (1 + 1.2 * (1 - t) ** 2))
    out_fr = np.stack([np.clip(f, 0, 255).astype(np.uint8) for f in keep])
    print(f'cut at {CUT}, reveal {REVEAL} frames -> {len(out_fr)} frames ({len(out_fr) / 24:.2f} s), last vs loop[0] {np.abs(out_fr[-1].astype(int) - ref.astype(int)).mean():.1f}/255')
raw = out_fr.tobytes()
inp = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '24', '-i', '-', '-an']
subprocess.run(inp + ['-c:v', 'libx264', '-profile:v', 'main', '-preset', 'slow', '-crf', str(CRF), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out + '.mp4'], input=raw, check=True)
subprocess.run(inp + ['-c:v', 'libvpx-vp9', '-crf', str(CRFW), '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1', '-pix_fmt', 'yuv420p', out + '.webm'], input=raw, check=True)
