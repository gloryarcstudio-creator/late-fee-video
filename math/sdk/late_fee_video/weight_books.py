"""Assign lookup-table weights so each mode reproduces the simulated model at exactly 96.00 % RTP.

Replaces the SDK's Rust optimizer for this game: books inside one criteria keep natural
(uniform) weights, criteria probabilities come from the reels, and the RTP is closed on the
"0" / "basegame" split (base, ante) or on a mild exponential tilt of the bonus books (buys).

Usage (from <math-sdk>/games/late_fee_video, PYTHONPATH=<math-sdk>):
    python3 weight_books.py            # write lookUpTable_<mode>_0.csv + configs + checks
"""

import csv
import math
import os
import sys
from itertools import combinations

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from game_config import GameConfig  # noqa: E402
from gamestate import GameState  # noqa: E402
from src.write_data.write_configs import generate_configs  # noqa: E402
from utils.rgs_verification import execute_all_tests  # noqa: E402

TOTAL_WEIGHT = 10**13
WINCAP_RTP = 0.001
# director: 15 000x at 1 in 25 000 pushes the >=10 000x share over the SDK volatility limit, so it is rarer
WINCAP_RTP_BY_MODE = {"director": 0.0005}


def scatter_trigger_probs(reels, scatter="S", rows=3):
    """Natural probability of exactly 3/4/5 scatters on a reveal (one scatter max per reel)."""
    probs = [rows * sum(1 for s in reel if s == scatter) / len(reel) for reel in reels]
    out = {}
    for k in (3, 4, 5):
        total = 0.0
        for subset in combinations(range(5), k):
            p = 1.0
            for r in range(5):
                p *= probs[r] if r in subset else (1 - probs[r])
            total += p
        out[k] = total
    return out


def trigger_kind_by_book(cfg, mode):
    """Book id -> number of scatters that triggered the bonus (from the force record)."""
    import json

    path = os.path.join(cfg.library_path, "forces", f"force_record_{mode}.json")
    kinds = {}
    for item in json.load(open(path, encoding="UTF-8")):
        search = {x["name"]: x["value"] for x in item["search"]}
        if search.get("symbol") == "scatter" and search.get("gametype") == "basegame":
            for b in item["bookIds"]:
                kinds[b] = int(search["kind"])
    return kinds


def read_mode(cfg, mode):
    lut = os.path.join(cfg.library_path, "lookup_tables", f"lookUpTable_{mode}.csv")
    seg = os.path.join(cfg.library_path, "lookup_tables", f"lookUpTableSegmented_{mode}.csv")
    payouts = {int(r[0]): int(r[2]) for r in csv.reader(open(lut))}
    criteria = {int(r[0]): r[1] for r in csv.reader(open(seg))}
    ids = sorted(payouts)
    return ids, payouts, criteria


def close_rtp(ids, payouts, weights, target_rtp, cost):
    """Adjust one zero-payout (or lowest-payout) book so Σw·p / Σw == target as exactly as integers allow."""
    target = target_rtp * cost * 100
    pivot = min(ids, key=lambda i: payouts[i])
    p_piv = payouts[pivot]
    others = [i for i in ids if i != pivot]
    a = sum(weights[i] * payouts[i] for i in others)
    b = sum(weights[i] for i in others)
    x = (a - target * b) / (target - p_piv)
    assert x > 0, f"cannot close RTP: pivot weight {x}"
    weights[pivot] = int(round(x))
    return weights


def base_like(cfg, mode, reelset):
    ids, payouts, criteria = read_mode(cfg, mode)
    cost = {bm.get_name(): bm.get_cost() for bm in cfg.bet_modes}[mode]
    groups = {}
    for i in ids:
        groups.setdefault(criteria[i], []).append(i)
    avg = {c: sum(payouts[i] for i in g) / len(g) / 100 / cost for c, g in groups.items()}

    p_cap = WINCAP_RTP * cost / cfg.wincap
    sc = scatter_trigger_probs(cfg.reels[reelset])
    p_free_total = sum(sc.values()) - p_cap
    # split freegame books by trigger kind so 3/4/5-scatter bonuses keep their natural share
    kinds = trigger_kind_by_book(cfg, mode)
    free_groups = {}
    for i in groups["freegame"]:
        free_groups.setdefault(kinds.get(i, 3), []).append(i)
    free_probs = {k: sc[k] / sum(sc.values()) * p_free_total for k in free_groups}
    rtp_free = sum(free_probs[k] * sum(payouts[i] for i in g) / len(g) / 100 / cost for k, g in free_groups.items())
    rtp_base = 0.96 - WINCAP_RTP - rtp_free
    p_basegame = rtp_base / avg["basegame"]
    p_zero = 1 - p_cap - p_free_total - p_basegame
    assert p_zero > 0.5, f"{mode}: zero share collapsed ({p_zero:.3f})"
    probs = {"wincap": p_cap, "freegame": p_free_total, "basegame": p_basegame, "0": p_zero,
             "free_by_kind": {k: (len(g), free_probs[k]) for k, g in free_groups.items()}}
    weights = {}
    for c, g in groups.items():
        if c == "freegame":
            continue
        w = max(1, int(round(probs[c] / len(g) * TOTAL_WEIGHT)))
        for i in g:
            weights[i] = w
    for k, g in free_groups.items():
        w = max(1, int(round(free_probs[k] / len(g) * TOTAL_WEIGHT)))
        for i in g:
            weights[i] = w
    weights = close_rtp(ids, payouts, weights, 0.96, cost)
    return ids, payouts, weights, probs


def buy_like(cfg, mode):
    ids, payouts, criteria = read_mode(cfg, mode)
    cost = {bm.get_name(): bm.get_cost() for bm in cfg.bet_modes}[mode]
    cap = [i for i in ids if criteria[i] == "wincap"]
    free = [i for i in ids if criteria[i] != "wincap"]
    cap_rtp = WINCAP_RTP_BY_MODE.get(mode, WINCAP_RTP)
    p_cap = cap_rtp * cost / cfg.wincap
    target_avg = (0.96 - cap_rtp) * cost * 100 / (1 - p_cap)  # payout ints
    pays = [payouts[i] for i in free]
    mean = sum(pays) / len(pays)

    def tilted_mean(lam):
        xs = [lam * (p - mean) / 10000 for p in pays]
        top = max(xs)
        ws = [math.exp(x - top) for x in xs]  # log-space shift keeps large tilts finite
        return sum(w * p for w, p in zip(ws, pays)) / sum(ws), ws

    lo, hi = -50.0, 50.0
    for _ in range(200):
        mid = (lo + hi) / 2
        m, _ = tilted_mean(mid)
        if m < target_avg:
            lo = mid
        else:
            hi = mid
    lam = (lo + hi) / 2
    _, ws = tilted_mean(lam)
    scale = (1 - p_cap) * TOTAL_WEIGHT / sum(ws)
    weights = {i: max(1, int(round(w * scale))) for i, w in zip(free, ws)}
    for i in cap:
        weights[i] = max(1, int(round(p_cap / len(cap) * TOTAL_WEIGHT)))
    weights = close_rtp(ids, payouts, weights, 0.96, cost)
    return ids, payouts, weights, {"wincap": p_cap, "tilt_lambda": lam, "natural_avg": mean / 100 / cost}


def summarize(mode, cost, ids, payouts, weights):
    sw = sum(weights.values())
    x = {i: payouts[i] / 100 / cost for i in ids}
    rtp = sum(weights[i] * x[i] for i in ids) / sw
    sd = math.sqrt(sum(weights[i] * x[i] ** 2 for i in ids) / sw - rtp**2)
    zero = sum(weights[i] for i in ids if payouts[i] == 0) / sw
    mx = max(payouts.values())
    hr_max = sw / sum(weights[i] for i in ids if payouts[i] == mx)
    edges = [0, 1e-9, 1, 2, 5, 10, 20, 50, 100, 500, 1000, 5000, 15000 / cost, 1e18]
    dist = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        dist.append(sum(weights[i] for i in ids if lo <= x[i] < hi) / sw * 100)
    return {"mode": mode, "rtp": rtp, "sd": sd, "zero": zero, "hit": 1 / (1 - zero), "max": mx / 100,
            "hr_max": hr_max, "dist": dist, "books": len(ids), "min_w": min(weights.values()), "max_w": max(weights.values())}


if __name__ == "__main__":
    cfg = GameConfig()
    gamestate = GameState(cfg)
    costs = {bm.get_name(): bm.get_cost() for bm in cfg.bet_modes}
    plan = {"base": ("base", "BR0"), "ante2": ("base", "ANTE2"), "ante4": ("base", "ANTE4"), "bonus": ("buy",), "double": ("buy",), "director": ("buy",), "latefee": ("buy",), "tracking": ("buy",)}
    results = []
    for mode, spec in plan.items():
        if spec[0] == "base":
            ids, payouts, weights, info = base_like(cfg, mode, spec[1])
        else:
            ids, payouts, weights, info = buy_like(cfg, mode)
        out = os.path.join(cfg.publish_path, f"lookUpTable_{mode}_0.csv")
        with open(out, "w", encoding="UTF-8", newline="") as f:
            for i in ids:
                f.write(f"{i},{weights[i]},{payouts[i]}\n")
        s = summarize(mode, costs[mode], ids, payouts, weights)
        s["info"] = info
        results.append(s)
        print(mode, {k: (round(v, 6) if isinstance(v, float) else v) for k, v in s.items() if k != "dist"})
        print("   dist %:", [round(d, 4) for d in s["dist"]])
    generate_configs(gamestate)
    import json

    with open(os.path.join(cfg.library_path, "weight_summary.json"), "w", encoding="UTF-8") as f:
        json.dump(results, f, indent=1)
    execute_all_tests(cfg)  # run from the math-sdk root: the SDK checks read games/<game>/library by relative path
