"""Key a symbol painted on flat #00FF00 into a 512 px master with alpha, safe for green objects (batch 09 Horror case).
The plain green key is applied only in a thin band next to the background that touches the image border; everything further
inside stays opaque, so green plastic or fog inside the object is never cut. Square canvas around the alpha bbox + margin.

usage: python3 tools/art/key_symbol.py IN.png OUT.png [size=512] [margin=0.06] [band=8]
"""
import sys
import cv2, numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
SZ = int(sys.argv[3]) if len(sys.argv) > 3 else 512
MARGIN = float(sys.argv[4]) if len(sys.argv) > 4 else 0.06
BAND = int(sys.argv[5]) if len(sys.argv) > 5 else 8

a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32); r, g, b = a[..., 0], a[..., 1], a[..., 2]
d = np.sqrt(r ** 2 + (255 - g) ** 2 + b ** 2)                      # distance to pure green
core = (d < 60).astype(np.uint8)
n, lab = cv2.connectedComponents(core, connectivity=4)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(edge)).astype(np.uint8)                       # the background that reaches the border
band = cv2.dilate(bg, np.ones((2 * BAND + 1, 2 * BAND + 1), np.uint8)).astype(bool)
spill = np.clip((g - np.maximum(r, b)) / 255.0, 0, 1)
alpha = np.where(band, np.clip(1.0 - (spill - 0.08) / 0.35, 0, 1), 1.0)
alpha[bg.astype(bool)] = 0
alpha = cv2.GaussianBlur(alpha.astype(np.float32), (3, 3), 0) * (1 - bg) + 0
g2 = np.where(band, np.minimum(g, np.maximum(r, b) * 1.05 + 8), g)  # despill only on the rim
rgba = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
im = Image.fromarray(rgba, 'RGBA')
ys, xs = np.where(alpha > 0.06); x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
side = int(max(x1 - x0, y1 - y0) * (1 + 2 * MARGIN)); cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0)); canvas.paste(im.crop((x0, y0, x1, y1)), (side // 2 - (cx - x0), side // 2 - (cy - y0)))
canvas.resize((SZ, SZ), Image.LANCZOS).save(dst)
print(dst, 'bbox', (x1 - x0, y1 - y0))
