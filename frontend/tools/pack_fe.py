#!/usr/bin/env python3
"""usage: tools/pack_fe.py N  ->  dist/late_fee_video_fe_vN.zip, or _part1.zip, _part2.zip ... when the build exceeds the 30 MB upload limit.
Parts are ordinary zips with disjoint files that all extract into one folder (index.html + assets); not a spanned archive.
After packing, every part is extracted into a temp folder and compared with fe_build file by file (sha256)."""
import hashlib, os, shutil, sys, tempfile, zipfile
N = sys.argv[1] if len(sys.argv) > 1 else '1'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD, DIST = os.path.join(ROOT, 'fe_build'), os.path.join(ROOT, 'dist')
LIMIT = 28_000_000  # bytes per part, under Stake's 30 MB with headroom for zip headers
os.makedirs(DIST, exist_ok=True)
for f in os.listdir(DIST):
    if f.startswith(f'late_fee_video_fe_v{N}'): os.remove(os.path.join(DIST, f))
files = []
for d, _, fs in os.walk(BUILD):
    for f in fs:
        p = os.path.join(d, f); files.append((os.path.relpath(p, BUILD), os.path.getsize(p)))
files.sort(key=lambda t: (t[0].startswith('assets/'), t[0]))  # index.html, css, js first, then media
total = sum(s for _, s in files)
parts, cur, size = [], [], 0
if total <= LIMIT:
    parts = [files]
else:
    # first-fit: index.html, css and js stay in part 1; big media fills parts in path order
    for rel, s in files:
        if cur and size + s > LIMIT: parts.append(cur); cur, size = [], 0
        cur.append((rel, s)); size += s
    if cur: parts.append(cur)
names = []
for i, part in enumerate(parts, 1):
    name = f'late_fee_video_fe_v{N}.zip' if len(parts) == 1 else f'late_fee_video_fe_v{N}_part{i}.zip'
    with zipfile.ZipFile(os.path.join(DIST, name), 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for rel, _ in part: z.write(os.path.join(BUILD, rel), rel)
    names.append(name)
# verify: extract all parts into a clean folder, compare with fe_build
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
tmp = tempfile.mkdtemp()
for name in names:
    with zipfile.ZipFile(os.path.join(DIST, name)) as z: z.extractall(tmp)
bad = [rel for rel, _ in files if not os.path.exists(os.path.join(tmp, rel)) or sha(os.path.join(tmp, rel)) != sha(os.path.join(BUILD, rel))]
extra = sum(len(fs) for _, _, fs in os.walk(tmp)) - len(files)
shutil.rmtree(tmp)
for name in names:
    sz = os.path.getsize(os.path.join(DIST, name)); print(f'{name}  {sz / 1e6:.1f} MB' + ('  OVER 30 MB' if sz > 30_000_000 else ''))
print(f'build {total / 1e6:.1f} MB in {len(files)} files, {len(names)} archive(s); verify: ' + ('OK' if not bad and extra == 0 else f'MISMATCH {bad[:5]} extra={extra}'))
sys.exit(1 if bad or extra else 0)
