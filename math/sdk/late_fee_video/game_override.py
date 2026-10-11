"""Overrides of generic state behaviour."""

from game_executables import GameExecutables
from src.events.events import fs_trigger_event


class GameStateOverride(GameExecutables):

    def reset_book(self):
        super().reset_book()
        self.tape = []
        self.rew_mult_index = 0
        self.force_rew_every = 0

    def assign_special_sym_function(self):
        self.special_symbol_functions = {}

    def update_freespin_amount(self, scatter_key: str = "scatter"):
        """Buy modes take a fixed spin count from the distribution conditions."""
        cond = self.get_current_distribution_conditions()
        if "fs_amount" in cond:
            self.tot_fs = cond["fs_amount"]
        else:
            self.tot_fs = self.config.freespin_triggers[self.gametype][self.count_special_symbols(scatter_key)]
        fs_trigger_event(self, basegame_trigger=True, freegame_trigger=False)

    def update_fs_retrigger_amt(self, scatter_key: str = "scatter"):
        """Retrigger with the 50-spin cap; no event when the cap is already reached."""
        add = self.config.freespin_triggers[self.gametype][min(self.count_special_symbols(scatter_key), 5)]
        new_total = min(self.tot_fs + add, self.config.max_free_spins)
        if new_total > self.tot_fs:
            self.tot_fs = new_total
            self.record({"kind": "retrigger", "gametype": self.gametype})
            fs_trigger_event(self, freegame_trigger=True, basegame_trigger=False)

    def check_repeat(self):
        super().check_repeat()
        if self.repeat is False:
            win_criteria = self.get_current_betmode_distributions().get_win_criteria()
            if win_criteria is not None and self.final_win != win_criteria:
                self.repeat = True
                return
            if win_criteria is None and self.final_win == 0 and self.criteria == "basegame":
                self.repeat = True
                return
