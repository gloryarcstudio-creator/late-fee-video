"""Mock Stake RGS serving real sampled books (src/demo/books_<mode>.json).

usage: python3 tools/mock_rgs.py ROOT BOOKS_DIR PORT
Control: GET /__ctl?force=<tag|id|win|zero>&balance=<micro>&currency=JPY&levels=a,b&def=x&social=true&round=none&jur=disabledTurbo,disabledAutoplay
Log: GET /__log
"""
import json, sys, random
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

ROOT, BOOKS, PORT = sys.argv[1], sys.argv[2], int(sys.argv[3])
COST = {"base": 1, "ante2": 2, "ante4": 4, "bonus": 100, "double": 300, "director": 600, "latefee": 200, "tracking": 400}
B = {m: json.load(open(f"{BOOKS}/books_{m}.json")) for m in COST}
S = {"balance": 10**9, "currency": "USD", "levels": [100000, 200000, 400000, 1000000, 2000000, 5000000, 10000000],
     "def": 1000000, "social": False, "round": None, "force": None, "log": [], "bodies": [], "jur": []}


class H(SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
    def end_headers(s):
        s.send_header("Access-Control-Allow-Origin", "*"); s.send_header("Access-Control-Allow-Headers", "*")
        s.send_header("Cache-Control", "no-store"); super().end_headers()
    def j(s, c, o):
        b = json.dumps(o).encode(); s.send_response(c); s.send_header("Content-Type", "application/json"); s.end_headers(); s.wfile.write(b)
    def do_OPTIONS(s): s.send_response(204); s.end_headers()

    def do_GET(s):
        u = urlparse(s.path)
        if u.path == "/__ctl":
            for k, v in parse_qs(u.query, keep_blank_values=True).items():
                v = v[0]
                if k == "reset": S["log"].clear(); S["bodies"].clear(); continue
                if k == "levels": S[k] = [int(x) for x in v.split(",")]
                elif k == "jur": S[k] = [x for x in v.split(",") if x]
                elif k == "social": S[k] = v == "true"
                elif v == "none": S[k] = None
                else: S[k] = int(v) if v.isdigit() else v
            return s.j(200, {"ok": 1})
        if u.path == "/__log": return s.j(200, S["log"])
        if u.path == "/__bodies": return s.j(200, S["bodies"])
        if u.path.startswith("/bet/replay/"):
            parts = u.path.split("/"); m, ev = parts[-2], parts[-1]; S["log"].append(u.path)
            if m not in B or not ev.isdigit(): return s.j(404, {"error": "ERR_VAL"})
            bk = next((b for b in B[m] if b["id"] == int(ev)), None)
            if not bk: return s.j(404, {"error": "ERR_VAL"})
            return s.j(200, {"payoutMultiplier": bk["payoutMultiplier"] / 100, "costMultiplier": COST[m], "state": bk["events"]})
        return super().do_GET()

    def do_POST(s):
        p = urlparse(s.path).path
        b = json.loads(s.rfile.read(int(s.headers.get("Content-Length") or 0)) or b"{}"); S["log"].append(p); S["bodies"].append({"path": p, "body": b})
        bal = {"amount": S["balance"], "currency": S["currency"]}
        if p == "/wallet/authenticate":
            if b.get("sessionID") != "sess-ok": return s.j(400, {"error": "ERR_VAL"})
            jur = {"socialCasino": S["social"]}
            for k in S["jur"]: jur[k] = True
            r = {"balance": bal, "config": {"betLevels": S["levels"], "defaultBetLevel": S["def"], "minBet": S["levels"][0],
                 "maxBet": S["levels"][-1], "stepBet": S["levels"][0], "jurisdiction": jur}}
            if S["round"]: r["round"] = S["round"]
            return s.j(200, r)
        if b.get("sessionID") != "sess-ok": return s.j(400, {"error": "ERR_VAL"})
        if p == "/wallet/play":
            if S["round"]: return s.j(400, {"error": "ERR_ACT"})
            a, m = int(b["amount"]), b["mode"]
            if a not in S["levels"] or m not in COST: return s.j(400, {"error": "ERR_VAL"})
            c = a * COST[m]
            if c > S["balance"]: return s.j(400, {"error": "ERR_IPB"})
            f = S["force"]; S["force"] = None; rows = B[m]
            if isinstance(f, int): pool = [r for r in rows if r["id"] == f]
            elif f == "win": pool = [r for r in rows if r["payoutMultiplier"] > 0]
            elif f: pool = [r for r in rows if f in r["tags"]]
            else: pool = [r for r in rows if r["drawn"]]
            bk = random.choice(pool or rows)
            pm = bk["payoutMultiplier"] / 100; S["balance"] -= c
            rd = {"betID": len(S["log"]), "amount": a, "mode": m, "payoutMultiplier": pm, "payout": round(pm * a),
                  "active": pm > 0, "state": bk["events"], "bookId": bk["id"]}
            S["round"] = rd if pm > 0 else None
            return s.j(200, {"balance": {"amount": S["balance"], "currency": S["currency"]}, "round": rd})
        if p == "/wallet/end-round":
            r = S["round"]
            if not r: return s.j(400, {"error": "ERR_VAL"})
            S["balance"] += r["payout"]; S["round"] = None
            return s.j(200, {"balance": {"amount": S["balance"], "currency": S["currency"]}})
        return s.j(404, {"error": "ERR_VAL"})


ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
