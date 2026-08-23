"""Executable development configuration for Relic Forge.

The values in this file are development inputs, not certified production math.
All Relic Wild pools, guarantees, reel choices, costs, and distribution weights
are centralized here so simulation tuning does not require frontend changes.
"""

from copy import deepcopy
import os

from src.config.betmode import BetMode
from src.config.config import Config
from src.config.distributions import Distribution


RELIC_WILD_FEATURES = {
    "standard": {
        "multiplier_weights": {2: 85, 3: 15},
        "guaranteed_starting_wild": False,
        "free_reel_weights": {"FR_STANDARD": 1},
        "theme": "standard",
    },
    "super": {
        "multiplier_weights": {2: 30, 3: 30, 5: 40},
        "guaranteed_starting_wild": True,
        "free_reel_weights": {"FR_SUPER": 1},
        "theme": "super",
    },
    "mythic": {
        "multiplier_weights": {5: 45, 10: 30, 20: 25},
        "guaranteed_starting_wild": True,
        "free_reel_weights": {"FR_MYTHIC": 1},
        "theme": "mythic",
    },
}


# A small, explicit strip adjustment for each bought feature. The mechanic,
# symbol set and multiplier caps stay unchanged; only the free-spin reel
# composition is tuned so the three advertised Bonus Buy prices can be
# analysed against the same 96% target. Replacing Amber stops keeps reel
# lengths and all other symbol ordering deterministic.
FREE_REEL_EXTRA_WILDS = {
    "standard": 0,
    "super": 8,
    "mythic": 6,
}


class GameConfig(Config):
    """Relic Forge 5x3 / 20-line development math configuration."""

    def __init__(self, production=False, artifact_root=None):
        super().__init__()
        self.game_id = "relic_forge"
        self.artifact_root = artifact_root
        provider_name = os.environ.get("RELIC_FORGE_PROVIDER_NAME", "relic_forge_development")
        provider_number = os.environ.get("RELIC_FORGE_PROVIDER_NUMBER", "0")
        if production and (provider_name == "relic_forge_development" or provider_number == "0"):
            raise RuntimeError(
                "Production math requires RELIC_FORGE_PROVIDER_NAME and RELIC_FORGE_PROVIDER_NUMBER "
                "from Stake; development placeholders are not accepted."
            )
        self.provider_name = provider_name
        self.provider_number = int(provider_number)
        self.working_name = "Relic Forge"
        self.game_name = "Relic Forge"
        self.win_type = "lines"
        self.rtp = 0.96
        self.wincap = 5000.0
        self.construct_paths()

        self.num_reels = 5
        self.num_rows = [3] * self.num_reels
        self.include_padding = False
        self.paytable = {
            (3, "dragon"): 12,
            (4, "dragon"): 30,
            (5, "dragon"): 100,
            (3, "crown"): 8,
            (4, "crown"): 20,
            (5, "crown"): 60,
            (3, "sword"): 5,
            (4, "sword"): 12,
            (5, "sword"): 35,
            (3, "shield"): 4,
            (4, "shield"): 10,
            (5, "shield"): 25,
            (3, "ruby"): 2,
            (4, "ruby"): 5,
            (5, "ruby"): 12,
            (3, "emerald"): 1.5,
            (4, "emerald"): 4,
            (5, "emerald"): 10,
            (3, "sapphire"): 1,
            (4, "sapphire"): 3,
            (5, "sapphire"): 8,
            (3, "amber"): 0.8,
            (4, "amber"): 2,
            (5, "amber"): 6,
        }
        self.paylines = {
            index + 1: line
            for index, line in enumerate(
                [
                    [0, 0, 0, 0, 0],
                    [1, 1, 1, 1, 1],
                    [2, 2, 2, 2, 2],
                    [0, 1, 2, 1, 0],
                    [2, 1, 0, 1, 2],
                    [0, 0, 1, 2, 2],
                    [2, 2, 1, 0, 0],
                    [1, 0, 1, 2, 1],
                    [1, 2, 1, 0, 1],
                    [0, 1, 1, 1, 2],
                    [2, 1, 1, 1, 0],
                    [0, 1, 0, 1, 2],
                    [2, 1, 2, 1, 0],
                    [1, 1, 0, 1, 1],
                    [1, 1, 2, 1, 1],
                    [0, 2, 1, 0, 2],
                    [2, 0, 1, 2, 0],
                    [0, 0, 2, 0, 0],
                    [2, 2, 0, 2, 2],
                    [1, 0, 0, 0, 1],
                ]
            )
        }
        self.special_symbols = {
            "wild": ["wild"],
            "scatter": ["scatter"],
            "multiplier": ["wild"],
        }
        self.freespin_triggers = {
            self.basegame_type: {3: 8, 4: 8, 5: 8},
            self.freegame_type: {3: 0, 4: 0, 5: 0},
        }
        self.anticipation_triggers = {
            self.basegame_type: 2,
            self.freegame_type: 2,
        }

        reel_files = {"BR0": "BR0.csv", "FR0": "FR0.csv", "FRWCAP": "FRWCAP.csv"}
        self.reels = {
            reel_id: self.read_reels_csv(os.path.join(self.reels_path, filename))
            for reel_id, filename in reel_files.items()
        }

        free_reels = self.reels["FR0"]
        for variant, extra_wilds in FREE_REEL_EXTRA_WILDS.items():
            tuned_reels = deepcopy(free_reels)
            cursors = [0] * len(tuned_reels)
            for extra_index in range(extra_wilds):
                reel_index = extra_index % len(tuned_reels)
                for stop_index in range(cursors[reel_index], len(tuned_reels[reel_index])):
                    if tuned_reels[reel_index][stop_index] == "amber":
                        tuned_reels[reel_index][stop_index] = "wild"
                        cursors[reel_index] = stop_index + 1
                        break
                else:
                    raise RuntimeError(
                        f"Could not place tuned Relic Wild stop on free reel {reel_index}."
                    )
            self.reels[f"FR_{variant.upper()}"] = tuned_reels

        self.relic_wild_features = deepcopy(RELIC_WILD_FEATURES)
        self.bet_modes = self._build_bet_modes()

    def _conditions(self, variant="standard", force_freegame=False, force_wincap=False):
        feature = deepcopy(self.relic_wild_features[variant])
        return {
            "reel_weights": {
                self.basegame_type: {"BR0": 1},
                self.freegame_type: (
                    {"FRWCAP": 1} if force_wincap else feature["free_reel_weights"]
                ),
            },
            "scatter_triggers": {3: 100, 4: 10, 5: 2},
            "mult_values": {
                self.basegame_type: {1: 1},
                self.freegame_type: feature["multiplier_weights"],
            },
            "relic_wild_feature": variant,
            "guaranteed_starting_wild": feature["guaranteed_starting_wild"],
            "force_wincap": force_wincap,
            "force_freegame": force_freegame,
        }

    def _base_distributions(self, feature_quota, basegame_quota):
        wincap_quota = 0.0001
        return [
            Distribution(
                criteria="wincap",
                quota=wincap_quota,
                win_criteria=self.wincap,
                conditions=self._conditions(force_freegame=True, force_wincap=True),
            ),
            Distribution(
                criteria="freegame",
                quota=feature_quota,
                conditions=self._conditions(force_freegame=True),
            ),
            Distribution(
                criteria="0",
                quota=1.0 - wincap_quota - feature_quota - basegame_quota,
                win_criteria=0.0,
                conditions=self._conditions(),
            ),
            Distribution(
                criteria="basegame",
                quota=basegame_quota,
                conditions=self._conditions(),
            ),
        ]

    def _bonus_distributions(self, variant):
        return [
            Distribution(
                criteria="wincap",
                quota=0.0001,
                win_criteria=self.wincap,
                conditions=self._conditions(variant, force_freegame=True, force_wincap=True),
            ),
            Distribution(
                criteria="freegame",
                quota=0.9999,
                conditions=self._conditions(variant, force_freegame=True),
            ),
        ]

    def _mode(self, name, cost, distributions, *, feature, buy_bonus):
        return BetMode(
            name=name,
            cost=cost,
            rtp=self.rtp,
            max_win=self.wincap,
            auto_close_disabled=False,
            is_feature=feature,
            is_buybonus=buy_bonus,
            distributions=distributions,
        )

    def _build_bet_modes(self):
        return [
            self._mode("BASE", 1.0, self._base_distributions(0.005, 0.083), feature=True, buy_bonus=False),
            self._mode(
                "FORGE_BOOST", 2.0, self._base_distributions(0.01, 0.472), feature=True, buy_bonus=False
            ),
            self._mode(
                "DRAGON_BOOST", 5.0, self._base_distributions(0.04, 0.847), feature=True, buy_bonus=False
            ),
            self._mode(
                "STANDARD_BONUS",
                80.0,
                self._bonus_distributions("standard"),
                feature=False,
                buy_bonus=True,
            ),
            self._mode(
                "SUPER_BONUS",
                250.0,
                self._bonus_distributions("super"),
                feature=False,
                buy_bonus=True,
            ),
            self._mode(
                "MYTHIC_BONUS",
                500.0,
                self._bonus_distributions("mythic"),
                feature=False,
                buy_bonus=True,
            ),
        ]
