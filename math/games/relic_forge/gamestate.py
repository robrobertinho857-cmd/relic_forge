"""Authoritative Relic Forge round generation."""

from game_events import new_relic_wilds_event, relic_wild_state_event
from game_override import GameStateOverride
from src.events.events import reveal_event


class GameState(GameStateOverride):
    def run_sims(self, *args, **kwargs):
        """Keep SDK payout sidecars scoped to one mode/batch for RGS verification."""
        self._payout_ints = []
        return super().run_sims(*args, **kwargs)

    def run_spin(self, sim, simulation_seed=None):
        self.reset_seed(sim, simulation_seed)
        self.repeat = True
        while self.repeat:
            self.reset_book()
            self.draw_board()
            self.evaluate_lines_board()
            self.win_manager.update_gametype_wins(self.gametype)

            if self.check_fs_condition() and self.check_freespin_entry():
                self.run_freespin_from_base()

            self.evaluate_finalwin()
            self.check_repeat()
        self.imprint_wins()

    def run_freespin(self):
        self.reset_fs_spin()
        self.sticky_relic_wilds = []
        conditions = self.get_current_distribution_conditions()
        self.relic_feature_variant = conditions.get("relic_wild_feature", "standard")

        while self.fs < self.tot_fs and not self.wincap_triggered:
            self.update_freespin()
            self.draw_board(emit_event=False)
            self.restore_sticky_relic_wilds()
            self.ensure_guaranteed_starting_wild()
            new_wilds = self.collect_new_relic_wilds()

            reveal_event(self)
            if new_wilds:
                new_relic_wilds_event(self, new_wilds)
            relic_wild_state_event(self)

            self.evaluate_lines_board()
            self.win_manager.update_gametype_wins(self.gametype)

        relic_wild_state_event(self, cleared=True)
        self.sticky_relic_wilds = []
        self.end_freespin()
