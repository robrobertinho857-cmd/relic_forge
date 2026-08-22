"""Focused executable tests for the Relic Wild math contract."""

import pytest

from game_config import GameConfig, RELIC_WILD_FEATURES
from gamestate import GameState
from src.calculations.lines import Lines


def _symbol(gamestate, name, multiplier=None):
    symbol = gamestate.create_symbol(name)
    if multiplier is not None:
        symbol.assign_attribute({"multiplier": multiplier})
    return symbol


def test_multiplier_configuration_is_centralized():
    assert set(RELIC_WILD_FEATURES["standard"]["multiplier_weights"]) == {2, 3}
    assert set(RELIC_WILD_FEATURES["super"]["multiplier_weights"]) == {2, 3, 5}
    assert set(RELIC_WILD_FEATURES["mythic"]["multiplier_weights"]) == {5, 10, 20}
    assert not RELIC_WILD_FEATURES["standard"]["guaranteed_starting_wild"]
    assert RELIC_WILD_FEATURES["super"]["guaranteed_starting_wild"]
    assert RELIC_WILD_FEATURES["mythic"]["guaranteed_starting_wild"]


def test_two_participating_wild_multipliers_add_in_sdk_line_evaluation():
    config = GameConfig()
    gamestate = GameState(config)
    names = ["dragon", "crown", "sword", "shield", "ruby"]
    middle = [
        _symbol(gamestate, "amber"),
        _symbol(gamestate, "wild", 2),
        _symbol(gamestate, "amber"),
        _symbol(gamestate, "wild", 3),
        _symbol(gamestate, "amber"),
    ]
    board = [
        [_symbol(gamestate, names[reel]), middle[reel], _symbol(gamestate, "scatter")]
        for reel in range(config.num_reels)
    ]
    board[4][0] = _symbol(gamestate, "wild", 20)

    wins = Lines.get_lines(board, config, wild_sym="wild", multiplier_method="symbol")
    middle_line = next(win for win in wins["wins"] if win["meta"]["lineIndex"] == 2)
    assert middle_line["meta"]["winWithoutMult"] == 6
    assert middle_line["meta"]["lineMultiplier"] == 5
    assert middle_line["win"] == 30


@pytest.mark.parametrize(
    ("mode", "variant", "allowed", "guaranteed"),
    [
        ("STANDARD_BONUS", "standard", {2, 3}, False),
        ("SUPER_BONUS", "super", {2, 3, 5}, True),
        ("MYTHIC_BONUS", "mythic", {5, 10, 20}, True),
    ],
)
def test_generated_books_preserve_authoritative_sticky_state(mode, variant, allowed, guaranteed):
    config = GameConfig()
    gamestate = GameState(config)
    observed_multipliers = set()

    for seed in range(20):
        gamestate.betmode = mode
        gamestate.criteria = "freegame"
        gamestate.run_spin(seed, seed)
        events = gamestate.book.events
        new_events = [event for event in events if event["type"] == "newRelicWilds"]
        if guaranteed:
            first_update = next(i for i, event in enumerate(events) if event["type"] == "updateFreeSpin")
            next_update = next(
                (i for i in range(first_update + 1, len(events)) if events[i]["type"] == "updateFreeSpin"),
                len(events),
            )
            assert any(event["type"] == "newRelicWilds" for event in events[first_update:next_update])

        previous_positions = set()
        for event in events:
            if event["type"] == "newRelicWilds":
                observed_multipliers.update(wild["multiplier"] for wild in event["wilds"])
            if event["type"] == "relicWildState" and not event["cleared"]:
                assert event["variant"] == variant
                positions = {(wild["reel"], wild["row"]) for wild in event["stickyRelicWilds"]}
                assert positions.issuperset(previous_positions)
                previous_positions = positions

        clear_index = next(
            i
            for i, event in enumerate(events)
            if event["type"] == "relicWildState" and event["cleared"]
        )
        end_index = next(i for i, event in enumerate(events) if event["type"] == "freeSpinEnd")
        assert clear_index < end_index
        assert events[clear_index]["stickyRelicWilds"] == []

    assert observed_multipliers
    assert observed_multipliers.issubset(allowed)


@pytest.mark.parametrize("mode", ["STANDARD_BONUS", "SUPER_BONUS", "MYTHIC_BONUS"])
def test_server_side_wincap_is_enforced(mode):
    config = GameConfig()
    gamestate = GameState(config)
    gamestate.betmode = mode
    gamestate.criteria = "wincap"
    gamestate.run_spin(0, 91_337)
    final_win = next(event["amount"] for event in gamestate.book.events if event["type"] == "finalWin")
    assert final_win <= int(config.wincap * 100)
    assert any(event["type"] == "wincap" for event in gamestate.book.events)
