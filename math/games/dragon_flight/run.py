"""Dragon Flight analysis, reproducible publishing and verification commands."""

import argparse
import json
import sys
from pathlib import Path
from random import Random

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from games.dragon_flight.game_config import MODES
from games.dragon_flight.gamestate import GameState
from games.dragon_flight.publish import DEFAULT_OUTPUT, build_library
from games.dragon_flight.validation import verify_library


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("analyse", "build", "verify", "simulate"))
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--variants", type=int, default=1024)
    parser.add_argument("--seed", type=int, default=20260910, help="Offline generation/simulation seed only")
    parser.add_argument("--rounds", type=int, default=1_000_000)
    args = parser.parse_args()
    if args.seed < 0:
        parser.error("--seed must be non-negative")
    if args.command == "analyse":
        result = {name: mode.statistics() for name, mode in MODES.items()}
    elif args.command == "build":
        result = build_library(args.output, args.variants, args.seed)
    elif args.command == "verify":
        result = verify_library(args.output)
    else:
        if args.rounds < 1:
            parser.error("--rounds must be positive")
        result = {}
        for name, mode in MODES.items():
            rng, state = Random(args.seed), GameState(name)
            total, paid = 0, 0
            for _ in range(args.rounds):
                payout = state.sample_payout(rng)
                total += payout
                paid += payout > 0
            result[name] = {"rounds": args.rounds, "observedRtp": total / (args.rounds * 100),
                            "exactRtp": float(mode.rtp), "observedPaidRoundRate": paid / args.rounds}
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
