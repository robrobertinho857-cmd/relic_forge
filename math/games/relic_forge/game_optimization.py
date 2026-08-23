"""Official SDK optimizer inputs for Relic Forge.

This module only describes the optimizer search. It does not claim that an
optimized lookup table exists; the Rust optimizer must be run explicitly.
"""

from optimization_program.optimization_config import (
    ConstructConditions,
    ConstructFenceBias,
    ConstructParameters,
    ConstructScaling,
    verify_optimization_input,
)


MODES = ("BASE", "FORGE_BOOST", "DRAGON_BOOST", "STANDARD_BONUS", "SUPER_BONUS", "MYTHIC_BONUS")


def _quota(game_config, mode_name, criteria):
    """Return the simulation quota used to set a fence hit rate.

    The optimizer's ``hr`` is the inverse probability of selecting a fence.
    Keeping that value derived from the same distribution quotas used to make
    the source books prevents the residual ``hr: x`` fence from being given an
    arbitrary average win.
    """

    mode = next(mode for mode in game_config.bet_modes if mode.get_name() == mode_name)
    distribution = next(d for d in mode.get_distributions() if d.get_criteria() == criteria)
    if distribution.get_quota() is None or distribution.get_quota() <= 0:
        raise ValueError(f"{mode_name}/{criteria} must have a positive quota for optimization")
    return float(distribution.get_quota())


class OptimizationSetup:
    def __init__(self, game_config):
        self.game_config = game_config
        params = {}
        for mode in MODES:
            bonus = mode.endswith("BONUS")
            if bonus:
                conditions = {
                    "wincap": ConstructConditions(rtp=0.001, av_win=game_config.wincap, search_conditions=game_config.wincap).return_dict(),
                    # Bonus mode has only one non-wincap fence.  It is the
                    # final fence, so it must consume every remaining book;
                    # some zero-win/free-spin books do not have a force
                    # record and would otherwise be left unassigned.
                    "freegame": ConstructConditions(rtp=0.959, hr="x").return_dict(),
                }
                bias_criteria, bias_range = ["freegame"], [(200.0, 350.0)]
                test_spins = [10, 20, 50]
            else:
                free_hit_rate = 1.0 / _quota(game_config, mode, "freegame")
                base_hit_rate = 1.0 / _quota(game_config, mode, "basegame")
                conditions = {
                    "wincap": ConstructConditions(rtp=0.001, av_win=game_config.wincap, search_conditions=game_config.wincap).return_dict(),
                    "0": ConstructConditions(rtp=0, av_win=0, search_conditions=0).return_dict(),
                    # These are deliberately separate force-search fences.
                    # With both fences set to ``hr: x`` the Rust optimizer
                    # assigns the residual probability to the first one and
                    # creates the impossible BASE target avg_win=0.367.
                    "freegame": ConstructConditions(
                        rtp=0.367,
                        hr=free_hit_rate,
                        search_conditions={"gametype": "freegame"},
                    ).return_dict(),
                    "basegame": ConstructConditions(
                        rtp=0.592,
                        hr=base_hit_rate,
                        search_conditions={"gametype": "basegame"},
                    ).return_dict(),
                }
                bias_criteria, bias_range = ["basegame"], [(2.0, 3.0)]
                test_spins = [50, 100, 200]
            params[mode] = {
                "conditions": conditions,
                "scaling": ConstructScaling([]).return_dict(),
                "parameters": ConstructParameters(
                    # Show-pig acceptance is stochastic.  The original
                    # 20,000 candidates can leave the official optimizer
                    # with fewer than its fixed ten-result reporting set
                    # (notably for MYTHIC_BONUS), even when every fence is
                    # reachable.  Increase the source search budget instead
                    # of changing the objective or the Stake optimizer core.
                    num_show=50000,
                    num_per_fence=10000,
                    min_m2m=4,
                    max_m2m=8,
                    # This is the optimizer's long-run pass threshold, not a
                    # payout weight.  A 1.0 threshold makes a 96% target
                    # distribution produce too few valid show pigs for the
                    # SDK's fixed ten-result reporting stage.  Use the
                    # configured target while keeping the fence RTP values
                    # unchanged.
                    pmb_rtp=game_config.rtp,
                    sim_trials=5000,
                    test_spins=test_spins,
                    test_weights=[0.3, 0.4, 0.3],
                    score_type="rtp",
                ).return_dict(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=bias_criteria,
                    bias_ranges=bias_range,
                    bias_weights=[0.3],
                ).return_dict(),
            }
        game_config.opt_params = params
        verify_optimization_input(game_config, params)
