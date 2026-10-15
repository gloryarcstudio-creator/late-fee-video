"""Game actions: line wins, scatter pay, PAUSE chain, tape and REWIND."""

import random
from game_calculations import GameCalculations
from src.calculations.lines import Lines
from src.events.events import set_win_event, set_total_event, reveal_event
from game_events import (
    scatter_win_event,
    pause_start_event,
    pause_respin_event,
    tape_record_event,
    rewind_event,
    second_take_event,
    rewind_mult_event,
    late_fee_event,
    late_fee_paid_event,
    tracking_band_event,
    band_win_event,
)


class GameExecutables(GameCalculations):

    def evaluate_lines_board(self):
        """Line wins for the revealed board (no events yet, PAUSE may extend them)."""
        self.win_data = Lines.get_lines(self.board, self.config, global_multiplier=1)
        Lines.record_lines_wins(self)
        self.win_manager.update_spinwin(self.win_data["totalWin"])
        Lines.emit_linewin_events(self)

    def run_pause_chain(self):
        """PAUSE: freeze winning reels, respin the rest while the line wins keep growing."""
        if self.win_data["totalWin"] <= 0 or self.wincap_triggered:
            return
        chance = self.get_current_distribution_conditions()["pause_chance"][self.gametype]
        if random.random() >= chance:
            return
        frozen = self.winning_reels(self.win_data["wins"])
        if len(frozen) >= self.config.num_reels:
            return
        pause_start_event(self, frozen)
        prev_total = self.win_data["totalWin"]
        while len(frozen) < self.config.num_reels and not self.wincap_triggered:
            self.respin_reels(frozen)
            new_data = self.line_wins()
            inc = round(new_data["totalWin"] - prev_total, 4)
            if inc < 0:
                inc = 0
            pause_respin_event(self, frozen, new_data["wins"], inc)
            if inc <= 0:
                break
            self.win_data = new_data
            self.record({"kind": "pause", "gametype": self.gametype})
            self.win_manager.update_spinwin(inc)
            self.evaluate_wincap()
            set_win_event(self)
            set_total_event(self)
            prev_total = new_data["totalWin"]
            frozen = self.winning_reels(new_data["wins"])

    def evaluate_scatter_pay(self):
        """Scatter pays anywhere on the final board."""
        count = self.count_special_symbols("scatter")
        if count >= 3:
            pay = self.config.scatter_pay[min(count, 5)]
            self.win_manager.update_spinwin(pay)
            scatter_win_event(self, count, pay, self.special_syms_on_board["scatter"])
            self.evaluate_wincap()
            set_win_event(self)
            set_total_event(self)

    def check_free_spin_entry(self):
        return self.check_fs_condition()

    # --- free game helpers -------------------------------------------------

    def start_tape(self):
        self.tape = []
        cond = self.get_current_distribution_conditions()
        self.rew_mult_index = cond.get("mult_start", 0)
        self.force_rew_every = cond.get("force_rew_every", 0)
        self.late_fee = cond.get("late_fee", False)
        self.late_days = 0
        self.band = cond.get("band", False)
        self.band_row = None

    def reveal_free_board(self):
        """Draw a free-spin board, forcing REW on the configured spins."""
        self.draw_board(emit_event=False)
        if self.force_rew_every and self.fs % self.force_rew_every == 0:
            self.place_rewind_symbol()
        if self.band:
            self.band_row = (self.fs - 1) % self.config.num_rows[0]
            self.band_mult = self.config.band_mults[min((self.fs - 1) // self.config.num_rows[0], len(self.config.band_mults) - 1)]
            placed = self.place_band()
            tracking_band_event(self, self.band_row, self.band_mult, placed)
        reveal_event(self)

    def record_tape(self):
        if self.win_data.get("totalWin", 0) > 0:
            self.tape.append(self.snapshot(self.win_data["wins"], self.win_data["totalWin"]))
            tape_record_event(self, len(self.tape) - 1, self.win_data["totalWin"])

    def run_rewind(self):
        """REW on reel 5: replay the best recording x mult, then the second take."""
        if self.count_special_symbols("rewind") == 0 or self.wincap_triggered:
            return
        mult = self.config.rewind_mults[self.rew_mult_index]
        if self.tape:
            best = max(range(len(self.tape)), key=lambda i: self.tape[i]["win"])
            rec = self.tape[best]
            self.record({"kind": "rewind", "mult": mult, "gametype": self.gametype})
            replay = round(rec["win"] * mult, 4)
            self.restore(rec)
            rewind_event(self, best, rec, mult, replay)
            self.win_manager.update_spinwin(replay)
            self.evaluate_wincap()
            set_win_event(self)
            set_total_event(self)
            if not self.wincap_triggered:
                frozen = self.winning_reels(rec["wins"])
                self.respin_reels(frozen)
                new_data = self.line_wins()
                take = round(max(0.0, new_data["totalWin"] - rec["win"]) * mult, 4)
                second_take_event(self, frozen, new_data["wins"], mult, take)
                if take > 0:
                    self.win_manager.update_spinwin(take)
                    self.evaluate_wincap()
                    set_win_event(self)
                    set_total_event(self)
        if self.rew_mult_index < len(self.config.rewind_mults) - 1:
            self.rew_mult_index += 1
        rewind_mult_event(self, self.config.rewind_mults[self.rew_mult_index])

    # --- buy-mode features -------------------------------------------------

    def respin_reels(self, frozen):
        super().respin_reels(frozen)
        if self.band and self.band_row is not None:
            self.place_band()

    def run_late_fee(self):
        """LATE FEE: an empty spin adds a day; a winning spin pays its line win x the fee multiplier."""
        if not self.late_fee or self.wincap_triggered:
            return
        win = self.win_manager.spin_win
        if win > 0:
            mult = self.config.late_fee_mults[min(self.late_days, len(self.config.late_fee_mults) - 1)]
            if mult > 1:
                extra = round(win * (mult - 1), 4)
                self.record({"kind": "latefee", "mult": mult, "gametype": self.gametype})
                late_fee_paid_event(self, self.late_days, mult, extra)
                self.win_manager.update_spinwin(extra)
                self.evaluate_wincap()
                set_win_event(self)
                set_total_event(self)
            self.late_days = 0
        else:
            self.late_days += 1
        mult = self.config.late_fee_mults[min(self.late_days, len(self.config.late_fee_mults) - 1)]
        late_fee_event(self, self.late_days, mult)

    def run_band_win(self):
        """TRACKING BAND: line wins that use a band wild pay x the band multiplier (extra paid on top)."""
        if not self.band or self.band_row is None or self.wincap_triggered:
            return
        mult = self.band_mult
        if mult > 1 and self.win_data.get("totalWin", 0) > 0:
            band_cells = set(self.band_cells)
            lines, base = [], 0.0
            for w in self.win_data["wins"]:
                if any((p["reel"], p["row"]) in band_cells for p in w["positions"]):
                    lines.append(w["meta"]["lineIndex"])
                    base += w["win"]
            if base > 0:
                extra = round(base * (mult - 1), 4)
                self.record({"kind": "band", "mult": mult, "gametype": self.gametype})
                band_win_event(self, mult, lines, extra)
                self.win_manager.update_spinwin(extra)
                self.evaluate_wincap()
                set_win_event(self)
                set_total_event(self)
        self.band_row = None
