"""Build the front end: copy src/ to fe_build/ with ?v=N cache-busting on JS/CSS URLs.

usage: python3 tools/build_fe.py N [--no-demo]
--no-demo drops the local demo books (RGS-only package for upload).
"""
import os, re, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, "..", "src"); OUT = os.path.join(HERE, "..", "fe_build")
v = sys.argv[1] if len(sys.argv) > 1 else "1"
shutil.rmtree(OUT, ignore_errors=True)
shutil.copytree(SRC, OUT, ignore=shutil.ignore_patterns("demo") if "--no-demo" in sys.argv else None)
p = os.path.join(OUT, "index.html"); s = open(p).read()
s = re.sub(r'((?:src|href)="(?:js|css)/[^"?]+)"', r'\1?v=' + v + '"', s)
open(p, "w").write(s)
if "--no-demo" in sys.argv:
    n = os.path.join(OUT, "js", "net.js"); t = open(n).read()
    assert "const LOCAL_DEMO = true;" in t
    open(n, "w").write(t.replace("const LOCAL_DEMO = true;", "const LOCAL_DEMO = false;"))
total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(OUT) for f in fs)
print(f"fe_build v{v}: {total / 1e6:.2f} MB")
