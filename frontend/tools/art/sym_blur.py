"""Motion-blurred copies of the symbol stills for the reel spin: a vertical box blur over premultiplied RGBA (no CSS filter, which
Safari renders badly on moving sprites), written at 256 px.

usage: python3 tools/art/sym_blur.py src/assets/symbols src/assets/symbols/blur [length_px]
"""
import os, sys
import cv2, numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]; L = int(sys.argv[3]) if len(sys.argv) > 3 else 34
os.makedirs(out, exist_ok=True)
for f in sorted(os.listdir(src)):
    if not (f.startswith('sym_') and f.endswith('.webp')): continue
    im = Image.open(os.path.join(src, f)).convert('RGBA').resize((256, 256), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255; a[..., :3] *= a[..., 3:4]
    pad = L; a = np.pad(a, ((pad, pad), (0, 0), (0, 0)))
    k = np.ones((L, 1), np.float32) / L
    b = cv2.filter2D(a, -1, k, borderType=cv2.BORDER_CONSTANT)[pad:-pad]
    al = np.clip(b[..., 3:4], 1e-6, 1); b[..., :3] = np.where(b[..., 3:4] > 0, b[..., :3] / al, 0)
    b[..., 3] = np.clip(b[..., 3] * 1.15, 0, 1)
    Image.fromarray((np.clip(b, 0, 1) * 255 + .5).astype(np.uint8), 'RGBA').save(os.path.join(out, f), 'WEBP', quality=70, method=6)
    print(f)
