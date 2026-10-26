"""Ease the turn of a ping-pong loop (Del's idle sway): the source reverses at full speed with a doubled frame at the turn,
which reads as a hitch every pass. The doubled frames are dropped, the steps around the turn are re-timed so the sway slows
to a stop and speeds up again (constant deceleration, speed matched at both ends of the window), and the new positions are
rendered as optical-flow in-betweens of the two nearest frames. The timing is measured on the first set and applied to every
set, so desktop and phone frames stay in step. The result keeps the loop convention of js/del.js: the last frame repeats frame 0.

usage: python3 tools/art/del_retime.py CLIP TURN DROP W SRC_DIR OUT_DIR [SRC_DIR OUT_DIR ...]
  TURN  frame at the turn; DROP  how many frames after it repeat it; W  frames on each side of the turn to re-time
"""
import os, sys
import cv2, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from del_inbetween import load, gray, save, DIS


def between(a, b, s):
    """A pose a fraction s of the way from a to b (s = 0.5 is del_inbetween.mid)."""
    ga, gb = gray(a), gray(b)
    fab = DIS.calc(ga, gb, None); fba = DIS.calc(gb, ga, None)
    h, w = ga.shape; xs, ys = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    wa = cv2.remap(a, xs + s * fba[..., 0], ys + s * fba[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    wb = cv2.remap(b, xs + (1 - s) * fab[..., 0], ys + (1 - s) * fab[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    m = (1 - s) * wa + s * wb
    aa, ab = wa[..., 3:4], wb[..., 3:4]; lone = np.abs(aa - ab) > 0.5
    return np.where(lone, np.where(aa > ab, wa, wb), m)


def sway(frames):
    """Horizontal position of the figure along the frames: summed mean flow of its upper three quarters."""
    x = [0.0]
    for a, b in zip(frames, frames[1:]):
        fl = DIS.calc(gray(a), gray(b), None); m = a[..., 3] > 0.8; m[int(m.shape[0] * .75):] = False
        x.append(x[-1] + float(fl[m][:, 0].mean()))
    return np.array(x)


def plan(x, turn, w):
    """Fractional positions in the frame list for every output step."""
    def ease(lo, hi, rising):
        seg = x[lo:hi + 1] if rising else x[lo:hi + 1][::-1]
        idx = np.arange(lo, hi + 1, dtype=float) if rising else np.arange(hi, lo - 1, -1, dtype=float)
        seg = np.maximum.accumulate(seg) if seg[-1] >= seg[0] else np.minimum.accumulate(seg)
        x0, x1 = seg[0], seg[-1]
        v = abs(x[lo] - x[lo - 4]) / 4 if rising else abs(x[hi + 4] - x[hi]) / 4     # speed entering / leaving the window
        n = max(2, round(2 * abs(x1 - x0) / max(v, 1e-3)))
        out = []
        for k in range(n):
            s = k / n
            xt = x0 + (x1 - x0) * (1 - (1 - s) ** 2)                                     # speed v at the window edge, 0 at the turn
            out.append(float(np.interp(xt, seg, idx) if x1 >= x0 else np.interp(-xt, -seg, idx)))
        return out
    into = ease(turn - w, turn, True)                  # from the window edge (full speed) to just before the turn
    away = ease(turn, turn + w, False)[::-1]           # from just after the turn to the far edge, which the tail repeats
    return list(range(0, turn - w)) + into + [float(turn)] + away[:-1] + list(range(turn + w, len(x)))


def main():
    clip, turn, drop, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
    pairs = list(zip(sys.argv[5::2], sys.argv[6::2]))
    order, P = None, None
    for src, out in pairs:
        n = len([f for f in os.listdir(src) if f.startswith(clip + '_') and f[len(clip) + 1:-5].isdigit()])
        keep = list(range(0, turn + 1)) + list(range(turn + 1 + drop, n))
        fr = [load(f'{src}/{clip}_{i}.webp') for i in keep]
        if P is None:
            x = sway(fr); P = plan(x, turn, w)
            v = np.diff(np.interp(P, np.arange(len(x)), x))
            print(f'{clip}: {n} frames -> {len(P) + 1}; sway {x.max() - x.min():.1f} px, speed per step max {np.abs(v).max():.2f}, '
                  f'largest change of speed {np.abs(np.diff(v)).max():.2f} (source {np.abs(np.diff(np.diff(x))).max():.2f})')
        os.makedirs(out, exist_ok=True)
        for f in os.listdir(out):
            if f.startswith(clip + '_') and f[len(clip) + 1:-5].isdigit(): os.remove(os.path.join(out, f))
        for j, p in enumerate(P + [0]):
            i = int(np.floor(p)); s = p - i
            if s < 0.02 or i + 1 >= len(fr): save(fr[min(i, len(fr) - 1)], f'{out}/{clip}_{j}.webp', 86)
            elif s > 0.98: save(fr[i + 1], f'{out}/{clip}_{j}.webp', 86)
            else: save(between(fr[i], fr[i + 1], s), f'{out}/{clip}_{j}.webp', 80)
        print(f'  {out}: {len(P) + 1} frames')


if __name__ == '__main__':
    main()
