# v31 reel window: the batch-09 tube textures (bright VCR blue / purple) regraded to a dark CRT glass, keeping their scanlines,
# glass glare and tracking noise. python3 tools/art/screen_dark.py tools/art/src src/assets/scene
# tools/art/src keeps the batch-09 screen_base.webp and screen_bonus.webp (no longer shipped); writes screen_crt.webp and screen_crt_bonus.webp.
import sys, numpy as np
from PIL import Image
src, out = sys.argv[1:3]
def grade(name, c0, c1, glow, dst):
    a = np.asarray(Image.open(f'{src}/{name}').convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    v = a.max(axis=2)
    t = v / np.median(v[h // 4:3 * h // 4, w // 4:3 * w // 4])          # 1 on the flat tube, <1 in scanline rows and the vignette, >1 on glare and noise
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.sqrt(((x - w / 2) / (w * .62)) ** 2 + ((y - h * .46) / (h * .66)) ** 2)
    k = np.clip((r - .15) / .85, 0, 1); k = k * k * (3 - 2 * k)              # smoothstep: phosphor glow in the middle, near black at the rim
    base = np.array(c0, np.float32) * (1 - k[..., None]) + np.array(c1, np.float32) * k[..., None]
    o = base * (0.25 + 0.75 * np.clip(t, 0, 1.6))[..., None]
    hl = np.clip((a[..., 1] - 28) / 70, 0, 1)                                 # the glass glare and the tracking streaks carry green, the flat tube none
    o += hl[..., None] * np.array(glow, np.float32) * .5
    Image.fromarray(np.clip(o, 0, 255).astype(np.uint8)).save(f'{out}/{dst}', quality=88, method=6)
grade('screen_base.webp', (18, 28, 74), (3, 4, 14), (150, 190, 255), 'screen_crt.webp')
grade('screen_bonus.webp', (46, 14, 70), (8, 3, 16), (255, 140, 230), 'screen_crt_bonus.webp')
