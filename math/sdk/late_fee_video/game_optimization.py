"""Optimization targets per bet mode (sum of condition RTPs = 0.96)."""

from optimization_program.optimization_config import (
    ConstructScaling,
    ConstructParameters,
    ConstructConditions,
    ConstructFenceBias,
    verify_optimization_input,
)

WINCAP_RTP = 0.001


def base_like(wincap, free_rtp, free_hr, base_hr):
    base_rtp = round(0.96 - WINCAP_RTP - free_rtp, 5)
    return {
        "conditions": {
            "wincap": ConstructConditions(rtp=WINCAP_RTP, av_win=wincap, search_conditions=wincap).return_dict(),
            "0": ConstructConditions(rtp=0, av_win=0, search_conditions=0).return_dict(),
            "freegame": ConstructConditions(rtp=free_rtp, hr=free_hr, search_conditions={"symbol": "scatter"}).return_dict(),
            "basegame": ConstructConditions(rtp=base_rtp, hr=base_hr).return_dict(),
        },
        "scaling": ConstructScaling([]).return_dict(),
        "parameters": ConstructParameters(
            num_show=5000, num_per_fence=10000, min_m2m=4, max_m2m=8, pmb_rtp=1.0, sim_trials=5000,
            test_spins=[50, 100, 200], test_weights=[0.3, 0.4, 0.3], score_type="rtp",
        ).return_dict(),
        "distribution_bias": ConstructFenceBias(applied_criteria=["basegame"], bias_ranges=[(1.0, 2.0)], bias_weights=[0.3]).return_dict(),
    }


def buy_like(wincap, m2m=(2, 6)):
    return {
        "conditions": {
            "wincap": ConstructConditions(rtp=WINCAP_RTP, av_win=wincap, search_conditions=wincap).return_dict(),
            "freegame": ConstructConditions(rtp=round(0.96 - WINCAP_RTP, 5), hr="x").return_dict(),
        },
        "scaling": ConstructScaling([]).return_dict(),
        "parameters": ConstructParameters(
            num_show=5000, num_per_fence=10000, min_m2m=m2m[0], max_m2m=m2m[1], pmb_rtp=1.0, sim_trials=5000,
            test_spins=[10, 20, 50], test_weights=[0.6, 0.2, 0.2], score_type="rtp",
        ).return_dict(),
        "distribution_bias": ConstructFenceBias(applied_criteria=["freegame"], bias_ranges=[(50.0, 150.0)], bias_weights=[0.2]).return_dict(),
    }


class OptimizationSetup:

    def __init__(self, game_config):
        self.game_config = game_config
        wincaps = {bm.get_name(): bm.get_wincap() for bm in game_config.bet_modes}
        self.game_config.opt_params = {
            "base": base_like(wincaps["base"], free_rtp=0.3585, free_hr=277, base_hr=4.4),
            "ante": base_like(wincaps["ante"], free_rtp=0.7568, free_hr=44.1, base_hr=4.63),
            "bonus": buy_like(wincaps["bonus"]),
            "double": buy_like(wincaps["double"]),
            "director": buy_like(wincaps["director"]),
        }
        verify_optimization_input(self.game_config, self.game_config.opt_params)
