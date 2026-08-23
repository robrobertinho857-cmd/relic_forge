"""Deterministic development analysis for the six Relic Forge bet modes.

This command samples the configured development distribution quotas, including
the explicit loss and wincap criteria. It does not read or create an optimized
lookup table, so reports are labelled as quota-based development results until
the official Rust optimizer has completed successfully.
"""

import argparse
from collections import Counter
import json
import random
from statistics import mean, pstdev

from game_config import GameConfig
from gamestate import GameState


MODES = (
    "BASE",
    "FORGE_BOOST",
    "DRAGON_BOOST",
    "STANDARD_BONUS",
    "SUPER_BONUS",
    "MYTHIC_BONUS",
)


def _mode(config, mode_name):
    return next(mode for mode in config.bet_modes if mode.get_name() == mode_name)


def _criteria_assignments(mode, simulations, seed):
    distributions = mode.get_distributions()
    weights = [distribution.get_quota() for distribution in distributions]
    if any(weight is None or weight <= 0 for weight in weights):
        raise RuntimeError(f"Mode {mode.get_name()} has a non-positive development quota.")
    counts = [max(1, int(simulations * weight)) for weight in weights]
    while sum(counts) > simulations:
        index = max(range(len(counts)), key=lambda candidate: counts[candidate])
        if counts[index] <= 1:
            raise RuntimeError(f"Mode {mode.get_name()} quotas exceed the simulation count.")
        counts[index] -= 1
    fractions = [simulations * weight - int(simulations * weight) for weight in weights]
    while sum(counts) < simulations:
        index = max(range(len(counts)), key=lambda candidate: fractions[candidate])
        counts[index] += 1
        fractions[index] = -1

    assignments = [
        distribution.get_criteria()
        for distribution, count in zip(distributions, counts)
        for _ in range(count)
    ]
    random.Random(seed).shuffle(assignments)
    return assignments


def _event_count(events, event_type):
    return sum(event.get("type") == event_type for event in events)


def simulate_mode(config, mode_name, simulations):
    mode = _mode(config, mode_name)
    cost = mode.get_cost()
    gamestate = GameState(config)
    mode_seed_offset = MODES.index(mode_name) * 10_000_000
    criteria_assignments = _criteria_assignments(mode, simulations, mode_seed_offset + 1_000_000_000)

    raw_payouts = []
    normalized_payouts = []
    freegame_wins = []
    triggered_freegame_wins = []
    sticky_counts = []
    feature_wild_rounds = 0
    feature_rounds = 0
    max_win_rounds = 0
    multiplier_counts = Counter()
    max_combined_multiplier = 0
    criteria_counts = Counter()

    for simulation in range(simulations):
        simulation_seed = mode_seed_offset + simulation
        criteria = criteria_assignments[simulation]
        criteria_counts[criteria] += 1
        gamestate.betmode = mode_name
        gamestate.criteria = criteria
        gamestate.run_spin(simulation, simulation_seed)

        payout = float(gamestate.book.payout_multiplier)
        normalized_payout = payout / cost
        raw_payouts.append(payout)
        normalized_payouts.append(normalized_payout)
        feature_win = float(gamestate.book.freegame_wins)
        freegame_wins.append(feature_win)

        events = gamestate.book.events
        has_feature = _event_count(events, "freeSpinTrigger") > 0
        if has_feature:
            feature_rounds += 1
            triggered_freegame_wins.append(feature_win)
        new_wilds = [
            wild
            for event in events
            if event.get("type") == "newRelicWilds"
            for wild in event.get("wilds", [])
        ]
        if new_wilds:
            feature_wild_rounds += 1
            multiplier_counts.update(str(wild["multiplier"]) for wild in new_wilds)

        states = [
            len(event.get("stickyRelicWilds", []))
            for event in events
            if event.get("type") == "relicWildState" and not event.get("cleared")
        ]
        sticky_counts.append(max(states, default=0))
        for event in events:
            if event.get("type") != "relicWildWin":
                continue
            for win in event.get("wins", []):
                max_combined_multiplier = max(
                    max_combined_multiplier, int(win.get("multiplier", 0))
                )

        if payout >= config.wincap:
            max_win_rounds += 1

        # GeneralGameState keeps generated books for the production writer.
        # An analysis report consumes only the metrics above, so release those
        # per-spin sidecars or a 100k run needlessly grows to gigabytes.
        gamestate.library.clear()
        gamestate.recorded_events.clear()
        gamestate._payout_ints.clear()

    hit_count = sum(payout > 0 for payout in raw_payouts)
    zero_count = simulations - hit_count
    feature_average = mean(triggered_freegame_wins) if triggered_freegame_wins else 0.0
    return {
        "mode": mode_name,
        "simulations": simulations,
        "cost_x_bet": cost,
        "target_rtp": config.rtp,
        "distribution_source": "configured development quotas; not optimized LUT",
        "criteria_counts": dict(sorted(criteria_counts.items())),
        "observed_rtp": sum(normalized_payouts) / simulations,
        "hit_frequency": hit_count / simulations,
        "zero_win_frequency": zero_count / simulations,
        "average_payout_x_bet": mean(normalized_payouts),
        "average_raw_payout_x_bet": mean(raw_payouts),
        "payout_stddev_x_bet": pstdev(normalized_payouts),
        "maximum_observed_win_x_bet": max(normalized_payouts, default=0.0),
        "maximum_observed_raw_payout_x_bet": max(raw_payouts, default=0.0),
        "max_win_frequency": max_win_rounds / simulations,
        "feature_frequency": feature_rounds / simulations,
        "average_free_spins_win_x_bet": feature_average / cost,
        "average_free_spins_win_raw_x_bet": feature_average,
        "relic_wild_feature_frequency": feature_wild_rounds / simulations,
        "average_sticky_wild_count": mean(sticky_counts),
        "multiplier_distribution": dict(sorted(multiplier_counts.items(), key=lambda item: int(item[0]))),
        "maximum_combined_relic_multiplier": max_combined_multiplier,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sims", type=int, default=10_000)
    args = parser.parse_args()
    if args.sims <= 0:
        parser.error("--sims must be positive")

    config = GameConfig()
    report = {
        "classification": "development quota analysis; not production-certified",
        "target_rtp": config.rtp,
        "wincap_x_bet": config.wincap,
        "modes": [simulate_mode(config, mode, args.sims) for mode in MODES],
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
