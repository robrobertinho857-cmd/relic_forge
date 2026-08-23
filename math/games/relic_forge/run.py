"""Generate, optimize and verify Relic Forge math outputs."""

import argparse

from game_config import GameConfig
from gamestate import GameState
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs
from utils.rgs_verification import execute_all_tests
from game_optimization import MODES, OptimizationSetup
from optimization_diagnostics import diagnose_mode
from optimization_program.run_script import OptimizationExecution


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--command", choices=("smoke", "production", "optimize", "optimize-source", "config", "verify-strict"), default="smoke")
    parser.add_argument("--sims", type=int, default=None)
    parser.add_argument("--threads", type=int, default=1)
    parser.add_argument("--mode", choices=MODES, default=None)
    args = parser.parse_args()
    production = args.command == "production"
    config = GameConfig(production=production)
    gamestate = GameState(config)
    OptimizationSetup(config)
    if args.command == "optimize-source":
        mode = args.mode or "BASE"
        sims = args.sims or 20_000
        create_books(
            gamestate,
            config,
            {mode: sims},
            batch_size=1000,
            threads=1,
            compress=True,
            profiling=False,
        )
        generate_configs(gamestate)
        print(f"Generated {sims} optimization-source books for {mode}.")
        return
    if args.command == "optimize":
        # The optimizer consumes the generated math_config plus the books and
        # base lookup tables. Generate the config here so a fresh checkout
        # cannot accidentally optimize against a stale or empty file.
        generate_configs(gamestate)
        for mode in [mode.get_name() for mode in config.bet_modes]:
            # Stop at the first invalid mode. This is intentionally
            # sequential: later modes must not appear optimized when BASE
            # (or another earlier mode) has not passed its preflight.
            diagnose_mode(config, mode)
            OptimizationExecution.run_opt_single_mode(config, mode, args.threads)
        return
    if args.command == "config":
        generate_configs(gamestate)
        return
    if args.command == "verify-strict":
        execute_all_tests(config, strict=True)
        return
    num_sim_args = {
        mode.get_name(): args.sims or (100_000 if production else 1_000)
        for mode in config.bet_modes
    }
    create_books(
        gamestate,
        config,
        num_sim_args,
        batch_size=1000,
        threads=1,
        compress=True,
        profiling=False,
    )
    # Optimization metadata must describe the exact six-mode game that was
    # just simulated before backend/config files are emitted.
    generate_configs(gamestate)
    execute_all_tests(config, strict=production)


if __name__ == "__main__":
    main()
