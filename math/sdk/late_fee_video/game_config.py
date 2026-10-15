"""Late Fee Video — game configuration for the Stake Math SDK."""

import os
from math import comb
from src.config.config import Config
from src.config.distributions import Distribution
from src.config.betmode import BetMode

# Line pays in line-bet units; converted to total-bet multiples (20 lines) below.
LINE_PAYS = {
    "P": (50, 250, 1000),
    "H1": (40, 150, 500),
    "H2": (30, 120, 400),
    "H3": (24, 100, 300),
    "M1": (20, 60, 200),
    "M2": (14, 50, 150),
    "M3": (14, 40, 120),
    "L1": (10, 24, 100),
    "L2": (10, 24, 100),
    "L3": (10, 20, 70),
    "L4": (10, 20, 70),
}
NUM_LINES = 20

SCATTER_PAY = {3: 2.0, 4: 10.0, 5: 50.0}  # x total bet
REWIND_MULTS = [2, 3, 5, 10]
MAX_FREE_SPINS = 50
LATE_FEE_MULTS = [1, 2, 4, 6, 10, 15, 25]
BAND_MULTS = [1, 2, 3]
BAND_REELS = [1, 2, 3]
WINCAP = 15000.0
TARGET_RTP = 0.96


def scatter_trigger_weights(reels, scatter="S"):
    """Natural 3/4/5-scatter frequency ratio for a reel set (one scatter max per reel, 3 visible rows)."""
    probs = [3 * sum(1 for s in reel if s == scatter) / len(reel) for reel in reels]
    weights = {}
    for k in (3, 4, 5):
        total = 0.0
        # exact sum over reel subsets of size k
        from itertools import combinations

        for subset in combinations(range(5), k):
            p = 1.0
            for r in range(5):
                p *= probs[r] if r in subset else (1 - probs[r])
            total += p
        weights[k] = total
    scale = 1e6 / weights[3]
    return {k: max(1, int(round(v * scale))) for k, v in weights.items()}


class GameConfig(Config):
    """Singleton game configuration."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        super().__init__()
        self.game_id = "late_fee_video"
        self.provider_number = 0
        self.provider_name = "gloryarc"
        self.game_name = "late_fee_video"
        self.working_name = "Late Fee Video"
        self.wincap = WINCAP
        self.win_type = "lines"
        self.rtp = TARGET_RTP
        self.construct_paths()

        self.num_reels = 5
        self.num_rows = [3] * self.num_reels

        self.paytable = {}
        for sym, pays in LINE_PAYS.items():
            for kind, pay in zip((3, 4, 5), pays):
                self.paytable[(kind, sym)] = pay / NUM_LINES

        self.paylines = {
            1: [1, 1, 1, 1, 1],
            2: [0, 0, 0, 0, 0],
            3: [2, 2, 2, 2, 2],
            4: [0, 1, 2, 1, 0],
            5: [2, 1, 0, 1, 2],
            6: [0, 0, 1, 2, 2],
            7: [2, 2, 1, 0, 0],
            8: [1, 0, 0, 0, 1],
            9: [1, 2, 2, 2, 1],
            10: [1, 0, 1, 2, 1],
            11: [1, 2, 1, 0, 1],
            12: [0, 1, 0, 1, 0],
            13: [2, 1, 2, 1, 2],
            14: [1, 1, 0, 1, 1],
            15: [1, 1, 2, 1, 1],
            16: [0, 1, 1, 1, 0],
            17: [2, 1, 1, 1, 2],
            18: [0, 2, 0, 2, 0],
            19: [2, 0, 2, 0, 2],
            20: [0, 2, 2, 2, 0],
        }

        self.include_padding = True
        self.special_symbols = {"wild": ["W"], "scatter": ["S"], "rewind": ["R"]}

        self.scatter_pay = SCATTER_PAY
        self.rewind_mults = REWIND_MULTS
        self.max_free_spins = MAX_FREE_SPINS
        self.late_fee_mults = LATE_FEE_MULTS
        self.band_mults = BAND_MULTS
        self.band_reels = BAND_REELS
        self.freespin_triggers = {
            self.basegame_type: {3: 10, 4: 12, 5: 15},
            self.freegame_type: {2: 3, 3: 5, 4: 5, 5: 5},
        }
        self.anticipation_triggers = {self.basegame_type: 2, self.freegame_type: 2}

        reels = {"BR0": "BR0.csv", "ANTE2": "ANTE2.csv", "ANTE4": "ANTE4.csv", "FR0": "FR0.csv", "FRCAP": "FRCAP.csv", "FRB": "FRB.csv"}
        self.reels = {}
        for r, f in reels.items():
            self.reels[r] = self.read_reels_csv(os.path.join(self.reels_path, f))
        self.padding_reels[self.basegame_type] = self.reels["BR0"]
        self.padding_reels[self.freegame_type] = self.reels["FR0"]

        base_triggers = scatter_trigger_weights(self.reels["BR0"])
        ante2_triggers = scatter_trigger_weights(self.reels["ANTE2"])
        ante4_triggers = scatter_trigger_weights(self.reels["ANTE4"])
        pause = {self.basegame_type: 0.25, self.freegame_type: 0.20}
        pause_hot = {self.basegame_type: 0.25, self.freegame_type: 0.6}

        def cond(base_reel, free_reel="FR0", force_freegame=False, force_wincap=False, triggers=None, **extra):
            c = {
                "reel_weights": {self.basegame_type: {base_reel: 1}, self.freegame_type: {free_reel: 1}},
                "pause_chance": pause,
                "force_freegame": force_freegame,
                "force_wincap": force_wincap,
            }
            if triggers:
                c["scatter_triggers"] = triggers
            c.update(extra)
            return c

        def spin_modes(base_reel, triggers, buy=None, free_reel="FR0"):
            """Distributions for one bet mode. `buy` = dict of forced feature settings."""
            extra = buy or {}
            dists = [
                Distribution(
                    criteria="wincap",
                    quota=0.001,
                    win_criteria=WINCAP,
                    conditions=cond(base_reel, "FRCAP", True, True, {3: 1} if buy else triggers, pause_chance=pause_hot, **extra),
                ),
                Distribution(
                    criteria="freegame",
                    quota=0.999 if buy else 0.15,
                    conditions=cond(base_reel, free_reel, True, False, {3: 1} if buy else triggers, **extra),
                ),
            ]
            if not buy:
                dists += [
                    Distribution(criteria="0", quota=0.35, win_criteria=0.0, conditions=cond(base_reel)),
                    Distribution(criteria="basegame", quota=0.4995, conditions=cond(base_reel)),
                ]
            return dists

        self.bet_modes = [
            BetMode(
                name="base", cost=1.0, rtp=self.rtp, max_win=WINCAP, auto_close_disabled=False,
                is_feature=True, is_buybonus=False, distributions=spin_modes("BR0", base_triggers),
            ),
            BetMode(
                name="ante2", cost=2.0, rtp=self.rtp, max_win=WINCAP, auto_close_disabled=False,
                is_feature=True, is_buybonus=False, distributions=spin_modes("ANTE2", ante2_triggers),
            ),
            BetMode(
                name="ante4", cost=4.0, rtp=self.rtp, max_win=WINCAP, auto_close_disabled=False,
                is_feature=True, is_buybonus=False, distributions=spin_modes("ANTE4", ante4_triggers),
            ),
            BetMode(
                name="bonus", cost=100.0, rtp=self.rtp, max_win=WINCAP, auto_close_disabled=False,
                is_feature=False, is_buybonus=True,
                distributions=spin_modes("BR0", None, buy={"fs_amount": 10}),
            ),
            BetMode(
                name="double", cost=300.0, rtp=self.rtp, max_win=WINCAP, auto_close_disabled=False,
                is_feature=False, is_buybonus=True,
                distributions=spin_modes("BR0", None, buy={"fs_amount": 10, "force_rew_every": 3, "mult_start": 1}),
            ),
            BetMode(
                name="director", cost=600.0, rtp=self.rtp, max_win=WINCAP, auto_close_disabled=False,
                is_feature=False, is_buybonus=True,
                distributions=spin_modes("BR0", None, buy={"fs_amount": 13, "force_rew_every": 2, "mult_start": 2}),
            ),
            BetMode(
                name="latefee", cost=200.0, rtp=self.rtp, max_win=WINCAP, auto_close_disabled=False,
                is_feature=False, is_buybonus=True,
                distributions=spin_modes("BR0", None, buy={"fs_amount": 12, "late_fee": True}),
            ),
            BetMode(
                name="tracking", cost=400.0, rtp=self.rtp, max_win=WINCAP, auto_close_disabled=False,
                is_feature=False, is_buybonus=True,
                distributions=spin_modes("BR0", None, buy={"fs_amount": 8, "band": True}, free_reel="FRB"),
            ),
        ]

    def read_reels_csv(self, file_path):
        """Reel strips may have different lengths; blank cells are skipped."""
        strips = [[] for _ in range(5)]
        with open(os.path.abspath(file_path), "r", encoding="UTF-8") as file:
            for line in file:
                cells = line.strip().split(",")
                for i, cell in enumerate(cells[:5]):
                    cell = "".join(ch for ch in cell if ch.isalnum())
                    if cell:
                        strips[i].append(cell)
        assert all(len(s) > 3 for s in strips), f"bad reel file {file_path}"
        return strips
