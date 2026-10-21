"""Batch 10 UI kit: green-screen PNGs -> keyed WebP assets for the bet bar, buttons, dialogs and pills.
Round parts (spin base, tape spool, small button) are cropped to the fitted ellipse and scaled to an exact square, so a
slightly oval painting becomes a circle and the spool turns about its own centre. Plates keep their aspect; the printed
slices are the 9-slice cuts in output pixels for game.css (border-image).

usage: python3 tools/art/ui_kit.py SRC_DIR OUT_DIR [MASTERS_DIR]
"""
import os, sys
import cv2, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from key_ui import key

SRC, OUT = sys.argv[1], sys.argv[2]
MASTERS = sys.argv[3] if len(sys.argv) > 3 else None
ROUND = {'spin': 384, 'hub': 272, 'round': 160}
# name: output height, 9-slice cuts in keyed-bbox pixels (top, right, bottom, left)
PLATE = {'deck': (192, (130, 210, 100, 210)), 'field': (160, (200, 240, 215, 240)), 'tape': (160, (254, 972, 171, 870)),
         'panel': (640, (210, 210, 210, 210)), 'key': (160, (160, 160, 160, 160))}

os.makedirs(OUT, exist_ok=True)
if MASTERS: os.makedirs(MASTERS, exist_ok=True)
for name in list(ROUND) + list(PLATE):
  im, _, _ = key(os.path.join(SRC, f'uk_{name}.png'))
  if MASTERS: im.save(os.path.join(MASTERS, f'uk_{name}.png'), optimize=True)
  if name in ROUND:
    m = (np.asarray(im)[..., 3] > 128).astype(np.uint8)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    (cx, cy), (d1, d2), ang = cv2.fitEllipse(max(cs, key=cv2.contourArea))
    if 45 < ang % 180 < 135: d1, d2 = d2, d1                         # d1 = horizontal axis
    rx, ry = d1 / 2 + 3, d2 / 2 + 3
    im = im.crop((round(cx - rx), round(cy - ry), round(cx + rx), round(cy + ry))).resize((ROUND[name],) * 2, Image.LANCZOS)
    note = f'ellipse {d1:.0f}x{d2:.0f}'
  else:
    h, cut = PLATE[name]; k = h / im.height
    im = im.resize((round(im.width * k), h), Image.LANCZOS)
    note = 'slice ' + ' '.join(str(round(c * k)) for c in cut)
  dst = os.path.join(OUT, f'uk_{name}.webp')
  im.save(dst, quality=90, method=4)
  print(f'uk_{name}.webp {im.width}x{im.height} {os.path.getsize(dst) // 1024} KB  {note}')
