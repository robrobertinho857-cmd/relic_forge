"""Executable Relic Wild persistence and line-evaluation behavior."""

import random
from copy import deepcopy

from game_calculations import GameCalculations
from game_events import relic_wild_win_event
from src.calculations.lines import Lines
from src.events.events import set_total_event, set_win_event, win_info_event


class GameExecutables(GameCalculations):
    def restore_sticky_relic_wilds(self):
        """Override freshly drawn cells before reveal; sticky positions never disappear."""
        for wild in self.sticky_relic_wilds:
            symbol = self.create_symbol("wild")
            symbol.assign_attribute({"multiplier": wild["multiplier"]})
            self.board[wild["reel"]][wild["row"]] = symbol
        self.get_special_symbols_on_board()

    def ensure_guaranteed_starting_wild(self):
        """Server-side first-spin guarantee used only by configured feature variants."""
        conditions = self.get_current_distribution_conditions()
        if not conditions.get("guaranteed_starting_wild") or self.fs != 1:
            return
        if any(symbol.name == "wild" for reel in self.board for symbol in reel):
            return
        reel = random.randrange(self.config.num_reels)
        row = random.randrange(self.config.num_rows[reel])
        self.board[reel][row] = self.create_symbol("wild")
        self.get_special_symbols_on_board()

    def collect_new_relic_wilds(self):
        """Persist multiplier values assigned by math when new Wilds land."""
        occupied = {(wild["reel"], wild["row"]) for wild in self.sticky_relic_wilds}
        new_wilds = []
        for reel, symbols in enumerate(self.board):
            for row, symbol in enumerate(symbols):
                if symbol.name != "wild" or (reel, row) in occupied:
                    continue
                wild = {
                    "reel": reel,
                    "row": row,
                    "multiplier": int(symbol.get_attribute("multiplier")),
                }
                new_wilds.append(wild)
                self.sticky_relic_wilds.append(deepcopy(wild))
                occupied.add((reel, row))
        self.sticky_relic_wilds.sort(key=lambda wild: (wild["reel"], wild["row"]))
        return new_wilds

    def evaluate_lines_board(self):
        """Use the SDK's additive per-symbol multiplier strategy per payline."""
        self.win_data = Lines.get_lines(
            self.board,
            self.config,
            wild_sym="wild",
            multiplier_method="symbol",
            global_multiplier=self.global_multiplier,
        )
        Lines.record_lines_wins(self)
        self.win_manager.update_spinwin(self.win_data["totalWin"])
        if self.win_manager.spin_win > 0:
            win_info_event(self, include_padding_index=False)
            self.evaluate_wincap()
            if not self.wincap_triggered:
                relic_wild_win_event(self)
            set_win_event(self)
        set_total_event(self)
