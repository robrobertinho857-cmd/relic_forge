"""Relic Forge overrides for multiplier assignment and persistent state."""

from game_executables import GameExecutables
from src.calculations.statistics import get_random_outcome


class GameStateOverride(GameExecutables):
    def reset_book(self):
        super().reset_book()
        self.sticky_relic_wilds = []
        self.relic_feature_variant = "standard"

    def assign_special_sym_function(self):
        self.special_symbol_functions = {"wild": [self.assign_relic_wild_multiplier]}

    def assign_relic_wild_multiplier(self, symbol):
        multiplier = 1
        if self.gametype == self.config.freegame_type and hasattr(self, "betmode"):
            multiplier = get_random_outcome(
                self.get_current_distribution_conditions()["mult_values"][self.gametype]
            )
        symbol.assign_attribute({"multiplier": multiplier})

    def check_repeat(self):
        super().check_repeat()
