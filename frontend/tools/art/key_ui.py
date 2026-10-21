"""Key a UI element painted on flat #00FF00 (batch 10) and save it cropped to its alpha bbox.
Unlike key_symbol.py every green region is removed, not only the one touching the border, so holes such as the windows
of the tape spool become transparent too (the UI kit has no green parts). Edge despill keeps cyan reflections intact.

usage: python3 tools/art/key_ui.py IN.png OUT.(png|webp) [height=0: keep] [pad=2]   (or import key())
"""
import sys
import cv2, numpy as np
from PIL import Image


def key(src, PAD=2):
  a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32); r, g, b = a[..., 0], a[..., 1], a[..., 2]
  d = np.sqrt(r ** 2 + (255 - g) ** 2 + b ** 2)                      # distance to pure green
  core = (d < 90) & (g > 150)
  core = cv2.morphologyEx(core.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
  n, lab, st, _ = cv2.connectedComponentsWithStats(core, connectivity=4)
  bg = np.zeros(core.shape, bool)
  for i in range(1, n):
      if st[i, cv2.CC_STAT_AREA] >= 400: bg |= lab == i                # specks of green-ish glare stay
  band = cv2.dilate(bg.astype(np.uint8), np.ones((13, 13), np.uint8)).astype(bool)
  spill = np.clip((g - np.maximum(r, b)) / 255.0, 0, 1)                # how much greener than the other two channels
  alpha = np.where(band, np.clip(1.0 - (spill - 0.06) / 0.30, 0, 1), 1.0)
  alpha[bg] = 0
  alpha = cv2.GaussianBlur(alpha.astype(np.float32), (3, 3), 0)
  alpha[bg] = 0
  g2 = np.where(band, np.minimum(g, np.maximum(r, b) + 6), g)          # despill only on the rim
  rgba = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
  ys, xs = np.where(alpha > 0.05)
  x0, y0, x1, y1 = max(0, xs.min() - PAD), max(0, ys.min() - PAD), min(a.shape[1], xs.max() + 1 + PAD), min(a.shape[0], ys.max() + 1 + PAD)
  return Image.fromarray(rgba, 'RGBA').crop((x0, y0, x1, y1)), (x0, y0, x1 - x0, y1 - y0), a.shape[1::-1]


if __name__ == '__main__':
  src, dst = sys.argv[1], sys.argv[2]
  H = int(sys.argv[3]) if len(sys.argv) > 3 else 0
  im, (x0, y0, w, h), (W0, H0) = key(src, int(sys.argv[4]) if len(sys.argv) > 4 else 2)
  if H: im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
  if dst.endswith('.webp'): im.save(dst, quality=90, method=4)
  else: im.save(dst, optimize=True)
  print(f'{dst}: {im.width}x{im.height} (bbox {x0},{y0} {w}x{h} of {W0}x{H0})')
