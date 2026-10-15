"""Per-frame stabilisation offsets for Del's pose transitions (the generated in/out clips drift and jump sideways).
usage: python3 tools/art/del_offsets.py src/assets/del  → prints the OFF table for js/del.js
Measures the shoes (lowest 45 px of the figure) on the 384×754 strips: centroid x and the feet line. The shoes are the steady
ground contact (idle's shoes move <1 px while its knees bend), so locking them keeps Del planted. Hold poses (lean, pause,
bored) get one constant shift that puts their feet where idle's are; in/out clips lock every frame's shoes to the same spot (both ends
pinned to the anchors). Idle and the one-shots stay unshifted.
Values are frame pixels (384 wide); del.js scales them for the phone frames.
Also prints BW: per clip, how much of each frame step the in-between fade may use (digit d → d/9 of the step). Consecutive frames
whose silhouettes overlap well (idle, loops) fade over the whole step; big pose jumps in the generated transitions fade only
near the end of the step, so the fade reads as motion and not as a see-through double image."""
import sys
from PIL import Image
import numpy as np
D = sys.argv[1]
CL = {'lean_in': 12, 'lean_loop': 24, 'lean_out': 12, 'pause_in': 12, 'pause_loop': 24, 'pause_out': 12,
      'bored_in': 18, 'bored_loop': 36, 'bored_out': 12, 'idle': 48}
COLS = {'idle': 24}
DUP = {'pause_in': {1: 0}}   # as in split_del_frames.py: these frames ship as a copy of their neighbour
SHOTS = {'cheer_t': 30, 'wow_t': 36, 'rew_t': 30}
def frames(name):
    n = CL.get(name) or SHOTS[name]; cols = COLS.get(name, n); a = np.array(Image.open(f'{D}/del_{name}_strip.webp').convert('RGBA'))[:, :, 3]
    rows = -(-n // cols); fw, fh = a.shape[1] // cols, a.shape[0] // rows
    f = [a[(i // cols) * fh:(i // cols + 1) * fh, (i % cols) * fw:(i % cols + 1) * fw] / 255 for i in range(n)]
    return [f[DUP.get(name, {}).get(i, i)] for i in range(n)]
def legs(a):
    ys, xs = np.nonzero(a > .5); bot = ys.max(); m = a[bot - 45:bot + 1] > .5; ly, lx = np.nonzero(m)
    return lx.mean(), float(np.percentile(ys, 99.7))
ref_x, ref_y = legs(frames('idle')[0])
out = {}
for pose in ('lean', 'pause', 'bored'):
    lp = [legs(f) for f in frames(f'{pose}_loop')]
    hx = ref_x - float(np.median([x for x, _ in lp])); hy = ref_y - float(np.median([y for _, y in lp]))
    out[f'{pose}_loop'] = ([hx] * CL[f'{pose}_loop'], [hy] * CL[f'{pose}_loop'])
    for part, a0, a1 in (('in', (0, 0), (hx, hy)), ('out', (hx, hy), (0, 0))):
        m = [legs(f) for f in frames(f'{pose}_{part}')]
        dx = [ref_x - x for x, _ in m]; dy = [ref_y - y for _, y in m]
        dx[0], dy[0] = a0; dx[-1], dy[-1] = a1   # exact lock: smoothing left 5 px of the generated jumps in
        out[f'{pose}_{part}'] = (dx, dy)
f = lambda v: ','.join(f'{x:.1f}'.rstrip('0').rstrip('.') if abs(x) >= .05 else '0' for x in v)
print('  const OFF = {')
for k, (dx, dy) in out.items():
    if len(set(dx)) == 1 and len(set(dy)) == 1: dx, dy = dx[:1], dy[:1]   # a hold loop: one shift for every frame
    print(f"    {k}: ['{f(dx)}', '{f(dy)}'],")
print('  };')

# fade windows from the silhouette overlap of consecutive frames, after the shifts above
def window(name, n):
    fs = frames(name); o = out.get(name)
    def sh(i):
        a = fs[i] > .5
        if not o: return a
        dx = o[0][i if len(o[0]) > 1 else 0]; dy = o[1][i if len(o[1]) > 1 else 0]
        return np.roll(np.roll(a, int(round(dx)), 1), int(round(dy)), 0)
    F = [sh(i) for i in range(n)]
    iou = [(F[i] & F[i + 1]).sum() / (F[i] | F[i + 1]).sum() for i in range(n - 1)]
    return ''.join(str(round(9 * min(1, max(.2, (v - .72) / .24)))) for v in iou)
print('  const BW = {')
for name, n in list(CL.items()) + list(SHOTS.items()):
    if name.endswith('_loop') or name == 'idle': continue
    print(f"    {name}: '{window(name, n)}',")
print('  };')
