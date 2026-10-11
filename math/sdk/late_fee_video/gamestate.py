"""Round flow for Late Fee Video."""

from game_override import GameStateOverride


class GameState(GameStateOverride):

    def run_spin(self, sim, simulation_seed=None):
        self.reset_seed(sim)
        self.repeat = True
        while self.repeat:
            self.reset_book()
            self.draw_board()
            self.evaluate_lines_board()
            self.run_pause_chain()
            if self.check_fs_condition() and not self.get_current_distribution_conditions()["force_freegame"]:
                # PAUSE respin landed a bonus inside a no-bonus criteria: redraw the round
                self.repeat = True
                continue
            self.evaluate_scatter_pay()
            self.win_manager.update_gametype_wins(self.gametype)
            if self.check_fs_condition():
                self.run_freespin_from_base()
            self.evaluate_finalwin()
            self.check_repeat()
        self.imprint_wins()

    def run_freespin(self):
        self.reset_fs_spin()
        self.start_tape()
        while self.fs < self.tot_fs and not self.wincap_triggered:
            self.update_freespin()
            self.reveal_free_board()
            self.evaluate_lines_board()
            self.run_pause_chain()
            self.record_tape()
            if self.check_fs_condition():
                self.update_fs_retrigger_amt()
            self.run_rewind()
            self.win_manager.update_gametype_wins(self.gametype)
        self.end_freespin()
