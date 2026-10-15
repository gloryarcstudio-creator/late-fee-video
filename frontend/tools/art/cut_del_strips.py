"""Cut Del sprite strips from the batch 04 animated WebP sources (720x1080, 12 fps).
usage: python3 tools/art/cut_del_strips.py <animated_dir> art/del_strips [scale=0.8] [mobile=0.6]
The game ships single frames cut from these strips (split_del_frames.py); the strips stay in art/del_strips/.
All clips share one crop box (union of the alpha over every frame of every clip, plus margin), so the
anchor poses stay aligned. Clips whose row would exceed 16000 px are laid out in 2+ rows (del.js reads
cols/rows from del_strips.json)."""
import sys, json, glob, os
from PIL import Image
import numpy as np
src, out = sys.argv[1], sys.argv[2]
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 0.8
mscale = float(sys.argv[4]) if len(sys.argv) > 4 else 0.6
MAXW = 16000
clips = {}
for f in sorted(glob.glob(os.path.join(src, 'del_*.webp'))):
    im = Image.open(f); frames = []
    for i in range(getattr(im, 'n_frames', 1)):
        im.seek(i); frames.append(im.convert('RGBA').copy())
    clips[os.path.basename(f)[4:-5]] = frames
U = None
for name, frames in clips.items():
    for fr in frames:
        a = np.array(fr)[:, :, 3]; ys, xs = np.where(a > 8)
        b = (xs.min(), ys.min(), xs.max(), ys.max())
        U = b if U is None else (min(U[0], b[0]), min(U[1], b[1]), max(U[2], b[2]), max(U[3], b[3]))
m = 8; W, H = frames[0].size
box = (max(0, U[0] - m), max(0, U[1] - m), min(W, U[2] + m + 1), min(H, U[3] + m + 1))
bw, bh = box[2] - box[0], box[3] - box[1]
print('union bbox', U, 'crop box', box, 'size', bw, bh, 'feet y', U[3])
meta = {'box': [int(v) for v in box], 'src': [W, H], 'clips': {}}
def cut(sub, s):
    fw, fh = round(bw * s), round(bh * s)
    os.makedirs(sub, exist_ok=True); total = 0
    for name, frames in clips.items():
        n = len(frames); cols = n; rows = 1
        # the row layout is decided by the full-size strip and shared by the phone copy (del.js knows one layout per clip)
        while cols * round(bw * scale) > MAXW: rows += 1; cols = -(-n // rows)
        sheet = Image.new('RGBA', (cols * fw, rows * fh), (0, 0, 0, 0))
        for i, fr in enumerate(frames):
            c = fr.crop(box).resize((fw, fh), Image.LANCZOS)
            sheet.paste(c, ((i % cols) * fw, (i // cols) * fh))
        p = os.path.join(sub, f'del_{name}_strip.webp'); sheet.save(p, 'WEBP', quality=82, method=6)
        total += os.path.getsize(p)
        if s == scale: meta['clips'][name] = {'n': n, 'cols': cols, 'rows': rows, 'fw': fw, 'fh': fh}
        print(f'{sub}/del_{name}_strip.webp {n} frames {cols}x{rows} {sheet.size} {os.path.getsize(p)//1024} KB')
    print(sub, 'total', total // 1024, 'KB')
cut(out, scale); cut(os.path.join(out, 'm'), mscale)
json.dump(meta, open(os.path.join(out, 'del_strips.json'), 'w'))
