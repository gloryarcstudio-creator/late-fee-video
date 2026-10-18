"""Cut symbol idle strips (batch 05) from generated clips.
usage: python3 tools/art/cut_sym_strips.py <clips_dir> <masters_dir> <out_dir> [frames=24] [size=256] [mobile=128]
clips_dir: sym_<ID>_idle.(mp4|webp|gif) per symbol; mp4 on flat green is keyed here, animated WebP/GIF with alpha is used as is.
masters_dir: art/masters/symbols/sym_<ID>.png (512x512 stills the game shows) — the first frame is aligned to the still
(scale + offset from the alpha bounding boxes) so the loop sits exactly over it. Writes sym_<ID>_strip.webp (+ m/) and idle.json."""
import sys, os, glob, json, subprocess, tempfile
from PIL import Image
import numpy as np
# --band: key only a thin rim next to the border-connected green (tools/art/key_symbol.py), for objects that are green themselves
BAND = '--band' in sys.argv; sys.argv = [x for x in sys.argv if x != '--band']
clips, masters, out = sys.argv[1:4]
N = int(sys.argv[4]) if len(sys.argv) > 4 else 24
SZ = int(sys.argv[5]) if len(sys.argv) > 5 else 256
MSZ = int(sys.argv[6]) if len(sys.argv) > 6 else 128
os.makedirs(os.path.join(out, 'm'), exist_ok=True)

def key_band(fr, band=8):
    import cv2
    a = np.asarray(fr.convert('RGB')).astype(np.float32); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.sqrt(r ** 2 + (255 - g) ** 2 + b ** 2)
    n, lab = cv2.connectedComponents((d < 60).astype(np.uint8), connectivity=4)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge)).astype(np.uint8)
    rim = cv2.dilate(bg, np.ones((2 * band + 1, 2 * band + 1), np.uint8)).astype(bool)
    spill = np.clip((g - np.maximum(r, b)) / 255.0, 0, 1)
    alpha = np.where(rim, np.clip(1.0 - (spill - 0.08) / 0.35, 0, 1), 1.0); alpha[bg.astype(bool)] = 0
    g2 = np.where(rim, np.minimum(g, np.maximum(r, b) * 1.05 + 8), g)
    return Image.fromarray(np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA')

def key_green(fr):
    if BAND: return key_band(fr, 4)
    a = np.asarray(fr.convert('RGB')).astype(np.float32); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    spill = np.clip((g - np.maximum(r, b)) / 255.0, 0, 1)           # how green over the other channels
    alpha = np.clip(1.0 - (spill - 0.08) / 0.35, 0, 1)                 # soft edge
    g2 = np.minimum(g, np.maximum(r, b) * 1.05 + 8)                    # despill
    rgba = np.dstack([r, g2, b, alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')

def frames_of(path):
    if path.endswith('.mp4'):
        d = tempfile.mkdtemp(); subprocess.run(['ffmpeg', '-v', 'error', '-i', path, os.path.join(d, 'f_%04d.png')], check=True)
        fr = [key_green(Image.open(f)) for f in sorted(glob.glob(os.path.join(d, 'f_*.png')))]
    else:
        im = Image.open(path); fr = []
        for i in range(getattr(im, 'n_frames', 1)): im.seek(i); fr.append(im.convert('RGBA').copy())
    # resample to N frames over the loop period (first frame kept; the source's closing frame, equal to the first, is the seam)
    idx = [min(len(fr) - 1, round(i * len(fr) / N)) for i in range(N)]
    return [fr[i] for i in idx]

def bbox(im):
    a = np.asarray(im)[..., 3]; ys, xs = np.where(a > 16)
    return (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1) if len(xs) else None

manifest = {}
for path in sorted(glob.glob(os.path.join(clips, 'sym_*_idle.*'))):
    sid = os.path.basename(path).split('_')[1]
    master = Image.open(os.path.join(masters, f'sym_{sid}.png')).convert('RGBA'); MW, MH = master.size
    fr = frames_of(path); mb, fb = bbox(master), bbox(fr[0])
    s = ((mb[2] - mb[0]) / (fb[2] - fb[0]) + (mb[3] - mb[1]) / (fb[3] - fb[1])) / 2  # clip -> master scale
    dx, dy = mb[0] - fb[0] * s, mb[1] - fb[1] * s
    def place(im):
        canvas = Image.new('RGBA', (MW, MH), (0, 0, 0, 0))
        r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        canvas.alpha_composite(r, (round(dx), round(dy))); return canvas
    placed = [place(f) for f in fr]
    diff = np.abs(np.asarray(placed[0]).astype(int) - np.asarray(master).astype(int))[..., :3].mean()
    for size, sub in ((SZ, ''), (MSZ, 'm')):
        sheet = Image.new('RGBA', (N * size, size), (0, 0, 0, 0))
        for i, f in enumerate(placed): sheet.paste(f.resize((size, size), Image.LANCZOS), (i * size, 0))
        sheet.save(os.path.join(out, sub, f'sym_{sid}_strip.webp'), 'WEBP', quality=84, method=6)
    manifest[sid] = {'n': N, 'sec': 2}
    print(f'{sid}: {len(fr)} frames, scale {s:.3f}, first-frame diff vs master {diff:.1f}/255')
json.dump(manifest, open(os.path.join(out, 'idle.json'), 'w'))
print('idle.json', manifest)
