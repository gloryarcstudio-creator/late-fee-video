"""Fill the near-black band at the bottom of the scene backgrounds (rows 1368..1440 of 2560x1440, ~5 %) with the counter front.

The art ends in a flat dark band under the counter's lit bottom edge; on screen it read as a black bar under the HUD.
The band (and the lit edge) is replaced by the rows above it mirrored downward, darkened toward the bottom to 72 %,
so the counter front runs off the bottom of the frame. Stills are patched in place, the counter slices are re-cut from
the patched 2560 picture (rows 1122..1440, left 800 px, as layout() maps them), the live loops are patched per frame.

usage: python3 tools/art/fill_bg_bottom.py src/assets/bg
"""
import os, subprocess, sys
from PIL import Image

Y0, FULL, DARK = 1368, 1440, 0.72
D = sys.argv[1]


def patch(im):
    im = im.convert('RGB'); w, h = im.size; y0 = round(Y0 * h / FULL); n = h - y0
    src = im.crop((0, y0 - n, w, y0)).transpose(Image.FLIP_TOP_BOTTOM)
    shade = Image.new('L', (1, n)); shade.putdata([round(255 * (1 - (1 - DARK) * (k + 1) / n)) for k in range(n)])
    src = Image.composite(src, Image.new('RGB', src.size), shade.resize((w, n)))
    im.paste(src, (0, y0)); return im


def save(im, p, q):
    im.save(p, quality=q, method=6); print(p, im.size, os.path.getsize(p))


for name, q in [('bg_land', 86), ('bg_bonus', 86), ('bg_land_m', 86), ('bg_bonus_m', 86)]:
    p = os.path.join(D, name + '.webp'); im = patch(Image.open(p)); save(im, p, q)
    if not name.endswith('_m'):
        save(im.crop((0, 1122, 800, 1440)), os.path.join(D, name.replace('bg_', 'counter_') + '.webp'), 88)

# live loops: 1280x720, band from row 684 (36 rows), same mirror + shade via a gradient overlay
grad = os.path.join(D, '_grad.png'); n = 36
g = Image.new('RGBA', (1280, n)); g.putdata([(0, 0, 0, round(255 * (1 - DARK) * (k + 1) / n)) for k in range(n) for _ in range(1280)]); g.save(grad)
fg = f'[0:v]split=2[m][s];[s]crop=1280:{n}:0:{720 - 2 * n},vflip[f];[f][1:v]overlay=0:0[fd];[m][fd]overlay=0:{720 - n}'
for name in ['bg_land', 'bg_bonus']:
    for ext, args in [('mp4', ['-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']),
                      ('webm', ['-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1', '-pix_fmt', 'yuv420p'])]:
        p = os.path.join(D, f'{name}_loop.{ext}'); tmp = p + '.new.' + ext
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', p, '-i', grad, '-filter_complex', fg, '-an', *args, tmp], check=True)
        os.replace(tmp, p); print(p, os.path.getsize(p))
os.remove(grad)
