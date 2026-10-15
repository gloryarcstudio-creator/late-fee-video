"""Split Del's sprite strips into one WebP per frame (assets/del/f/<clip>_<i>.webp, phones: assets/del/m/f/).
usage: python3 tools/art/split_del_frames.py art/del_strips src/assets/del [quality=90] [m]   (m: phone frames only)
The strips (cut_del_strips.py output) live in art/del_strips/ and are not shipped.
A whole strip is one huge image (idle: 9216×1508, 55 MB decoded); browsers keep only a budget of decoded image memory, and a
strip that falls out of it is decoded again while the frame is drawn without it, so Del vanished for whole passes. Single frames
(384×754, 1.2 MB decoded) are drawn by js/del.js on a canvas, which never draws a loaded image as blank."""
import sys, os
from multiprocessing import Pool
from PIL import Image
D, OUT = sys.argv[1], sys.argv[2]; Q = int(sys.argv[3]) if len(sys.argv) > 3 else 90; SUBS = ('m',) if 'm' in sys.argv[4:] else ('', 'm')
CL = {'idle': (48, 24), 'cheer_t': (30, 30), 'wow_t': (36, 36), 'rew_t': (30, 30), 'lean_in': (12, 12), 'lean_loop': (24, 24),
      'lean_out': (12, 12), 'pause_in': (12, 12), 'pause_loop': (24, 24), 'pause_out': (12, 12), 'bored_in': (18, 18),
      'bored_loop': (36, 36), 'bored_out': (12, 12)}
# source frames that are a double exposure (the provider's anchor blend) are replaced by their neighbour; del_offsets.py knows them
DUP = {'pause_in': {1: 0}}
def clip(job):
    sub, name, n, cols = job
    im = Image.open(os.path.join(D, sub, f'del_{name}_strip.webp')).convert('RGBA'); rows = -(-n // cols)
    fw, fh = im.width // cols, im.height // rows; out = os.path.join(OUT, sub, 'f'); total = 0
    for i in range(n):
        c, r = i % cols, i // cols; p = os.path.join(out, f'{name}_{i}.webp')
        j = DUP.get(name, {}).get(i, i); c, r = j % cols, j // cols
        im.crop((c * fw, r * fh, (c + 1) * fw, (r + 1) * fh)).save(p, 'WEBP', quality=Q, method=6)
        total += os.path.getsize(p)
    return sub, fw, fh, total
if __name__ == '__main__':
    for sub in SUBS: os.makedirs(os.path.join(OUT, sub, 'f'), exist_ok=True)
    with Pool() as pool: res = pool.map(clip, [(sub, k, n, c) for sub in SUBS for k, (n, c) in CL.items()])
    for sub in SUBS:
        r = [x for x in res if x[0] == sub]
        print(os.path.join(OUT, sub, 'f'), 'frames', sum(n for n, _ in CL.values()), 'size', r[0][1], 'x', r[0][2], 'total', sum(x[3] for x in r) // 1024, 'KB')
