"""Generate Relic Forge development books and SDK configuration outputs."""

from game_config import GameConfig
from gamestate import GameState
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs
from utils.rgs_verification import execute_all_tests


if __name__ == "__main__":
    config = GameConfig()
    gamestate = GameState(config)
    num_sim_args = {
        "BASE": 1000,
        "FORGE_BOOST": 1000,
        "DRAGON_BOOST": 1000,
        "STANDARD_BONUS": 1000,
        "SUPER_BONUS": 1000,
        "MYTHIC_BONUS": 1000,
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
    generate_configs(gamestate)
    execute_all_tests(config)
