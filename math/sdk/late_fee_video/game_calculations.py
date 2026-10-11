"""Board helpers specific to Late Fee Video."""

import random
from src.executables.executables import Executables
from src.calculations.lines import Lines


class GameCalculations(Executables):

    def line_wins(self):
        """Evaluate current board without touching the wallet."""
        return Lines.get_lines(self.board, self.config, global_multiplier=1)

    @staticmethod
    def winning_reels(wins):
        reels = set()
        for w in wins:
            for p in w["positions"]:
                reels.add(p["reel"])
        return reels

    def respin_reels(self, frozen):
        """Redraw every reel not in `frozen` from the current reel strip, keep the rest."""
        strip = self.reelstrip
        for reel in range(self.config.num_reels):
            if reel in frozen:
                continue
            length = len(strip[reel])
            pos = random.randrange(0, length)
            self.reel_positions[reel] = pos
            if self.config.include_padding:
                self.top_symbols[reel] = self.create_symbol(strip[reel][(pos - 1) % length])
                self.bottom_symbols[reel] = self.create_symbol(strip[reel][(pos + self.config.num_rows[reel]) % length])
            for row in range(self.config.num_rows[reel]):
                self.board[reel][row] = self.create_symbol(strip[reel][(pos + row) % length])
        self.get_special_symbols_on_board()

    def snapshot(self, wins, win):
        """Record a board for the tape."""
        return {
            "board": [[s for s in col] for col in self.board],
            "top": list(self.top_symbols),
            "bottom": list(self.bottom_symbols),
            "wins": wins,
            "win": win,
        }

    def restore(self, record):
        self.board = [[s for s in col] for col in record["board"]]
        self.top_symbols = list(record["top"])
        self.bottom_symbols = list(record["bottom"])
        self.get_special_symbols_on_board()

    def place_rewind_symbol(self):
        """Guaranteed REW: put R on a random row of reel 5 if it is not already there."""
        reel = self.config.num_reels - 1
        if any(s.name == "R" for s in self.board[reel]):
            return
        row = random.randrange(0, self.config.num_rows[reel])
        self.board[reel][row] = self.create_symbol("R")
        self.get_special_symbols_on_board()
