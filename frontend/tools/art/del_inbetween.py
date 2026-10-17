"""In-between frames for Del's 12 fps clips: optical flow (DIS) between each pair of neighbours, both frames warped half way and
blended premultiplied, so the 24 fps result is drawn with hard frame steps (no cross-dissolve, which made Del see-through on big moves).

usage: python3 tools/art/del_inbetween.py SRC_DIR OUT_DIR [clip ...]
SRC_DIR holds <clip>_<i>.webp (12 fps); OUT_DIR gets <clip>_<i>.webp at 24 fps: even = source frame i/2, odd = in-between.
"""
import os, re, sys
import cv2, numpy as np
from PIL import Image

def load(p):
    a = np.asarray(Image.open(p).convert('RGBA')).astype(np.float32) / 255
    a[..., :3] *= a[..., 3:4]                      # premultiply
    return a

def gray(a):                                       # premultiplied over mid grey: silhouette edges count for the flow
    g = a[..., :3] + 0.5 * (1 - a[..., 3:4])
    return cv2.cvtColor((g * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)

DIS = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)

def mid(a, b):
    ga, gb = gray(a), gray(b)
    fab = DIS.calc(ga, gb, None); fba = DIS.calc(gb, ga, None)
    h, w = ga.shape; xs, ys = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    # sample A half a step back along B->A flow, B half a step along A->B flow (flow taken at the mid-frame pixel)
    wa = cv2.remap(a, xs + 0.5 * fba[..., 0], ys + 0.5 * fba[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    wb = cv2.remap(b, xs + 0.5 * fab[..., 0], ys + 0.5 * fab[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    m = 0.5 * wa + 0.5 * wb
    # where only one of the warps found the figure, take that one whole instead of half (no see-through edges)
    aa, ab = wa[..., 3:4], wb[..., 3:4]; lone = np.abs(aa - ab) > 0.5
    m = np.where(lone, np.where(aa > ab, wa, wb), m)
    return m

def save(a, p, q):
    o = a.copy(); al = np.clip(o[..., 3:4], 1e-6, 1); o[..., :3] = np.where(o[..., 3:4] > 0, o[..., :3] / al, 0)
    Image.fromarray((np.clip(o, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(p, 'WEBP', quality=q, method=6, alpha_quality=90)

def main():
    src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    clips = {}
    for f in os.listdir(src):
        m = re.match(r'(.+)_(\d+)\.webp$', f)
        if m: clips.setdefault(m.group(1), []).append(int(m.group(2)))
    only = sys.argv[3:]
    for c, idx in sorted(clips.items()):
        if only and c not in only: continue
        n = max(idx) + 1; fr = [load(f'{src}/{c}_{i}.webp') for i in range(n)]
        for i in range(n):
            Image.open(f'{src}/{c}_{i}.webp').save(f'{out}/{c}_{2 * i}.webp', 'WEBP', lossless=False, quality=86, method=6, alpha_quality=90) if False else \
                __import__('shutil').copyfile(f'{src}/{c}_{i}.webp', f'{out}/{c}_{2 * i}.webp')
            if i + 1 < n: save(mid(fr[i], fr[i + 1]), f'{out}/{c}_{2 * i + 1}.webp', 72)
        print(c, n, '->', 2 * n - 1)

if __name__ == '__main__':
    main()
