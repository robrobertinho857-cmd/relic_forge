"""Deterministic development simulation report for Relic Forge bonus modes.

This is an engineering sampler, not a certified RTP calculation or optimized
production math output. It deliberately samples the normal freegame criterion
without the force-file wincap criterion.
"""

import argparse
import json

from game_config import GameConfig
from gamestate import GameState


BONUS_MODES = ("STANDARD_BONUS", "SUPER_BONUS", "MYTHIC_BONUS")


def _mode_cost(config, mode_name):
    return next(mode.get_cost() for mode in config.bet_modes if mode.get_name() == mode_name)


def simulate_mode(mode_name, simulations):
    config = GameConfig()
    gamestate = GameState(config)
    cost = _mode_cost(config, mode_name)
    total_wins = []
    feature_wins = []
    sticky_counts = []
    multipliers = []
    features_with_relic_wild = 0

    mode_seed_offset = BONUS_MODES.index(mode_name) * 10_000_000
    for simulation in range(simulations):
        gamestate.betmode = mode_name
        gamestate.criteria = "freegame"
        gamestate.run_spin(simulation, mode_seed_offset + simulation)

        total_wins.append(float(gamestate.book.payout_multiplier))
        feature_wins.append(float(gamestate.book.freegame_wins))
        events = gamestate.book.events
        landed = [
            wild
            for event in events
            if event["type"] == "newRelicWilds"
            for wild in event["wilds"]
        ]
        state_counts = [
            len(event["stickyRelicWilds"])
            for event in events
            if event["type"] == "relicWildState" and not event["cleared"]
        ]
        sticky_counts.append(max(state_counts, default=0))
        if landed:
            features_with_relic_wild += 1
            multipliers.extend(wild["multiplier"] for wild in landed)

    total_return = sum(total_wins)
    return {
        "mode": mode_name,
        "simulations": simulations,
        "cost_x_bet": cost,
        "development_rtp": total_return / (simulations * cost),
        "feature_average_win_x_bet": sum(feature_wins) / simulations,
        "relic_wild_feature_frequency": features_with_relic_wild / simulations,
        "average_sticky_wilds_per_feature": sum(sticky_counts) / simulations,
        "average_landed_wild_multiplier": (
            sum(multipliers) / len(multipliers) if multipliers else 0
        ),
        "maximum_observed_multiplier": max(multipliers, default=0),
        "maximum_observed_feature_win_x_bet": max(feature_wins, default=0),
        "hit_frequency": sum(win > 0 for win in total_wins) / simulations,
        "maximum_observed_total_win_x_bet": max(total_wins, default=0),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sims", type=int, default=10_000)
    args = parser.parse_args()
    if args.sims <= 0:
        parser.error("--sims must be positive")
    report = {
        "classification": "development simulation; not production-certified",
        "modes": [simulate_mode(mode, args.sims) for mode in BONUS_MODES],
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
