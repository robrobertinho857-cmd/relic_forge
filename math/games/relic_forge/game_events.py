"""Presentation and recovery events for authoritative sticky Relic Wild state."""

from copy import deepcopy


NEW_RELIC_WILDS = "newRelicWilds"
RELIC_WILD_STATE = "relicWildState"
RELIC_WILD_WIN = "relicWildWin"


def _client_wild(wild):
    return {
        "reel": int(wild["reel"]),
        "row": int(wild["row"]),
        "multiplier": int(wild["multiplier"]),
    }


def new_relic_wilds_event(gamestate, new_wilds):
    """Announce authoritative new sticky positions after the reel reveal."""
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": NEW_RELIC_WILDS,
            "variant": gamestate.relic_feature_variant,
            "wilds": [_client_wild(wild) for wild in new_wilds],
        }
    )


def relic_wild_state_event(gamestate, *, cleared=False):
    """Snapshot all persistent feature state so a book replay can recover it."""
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": RELIC_WILD_STATE,
            "variant": gamestate.relic_feature_variant,
            "remainingFreeSpins": max(0, int(gamestate.tot_fs - gamestate.fs)),
            "featureWin": int(round(min(gamestate.win_manager.freegame_wins, gamestate.config.wincap) * 100)),
            "stickyRelicWilds": []
            if cleared
            else [_client_wild(wild) for wild in gamestate.sticky_relic_wilds],
            "cleared": bool(cleared),
        }
    )


def relic_wild_win_event(gamestate):
    """Expose the SDK-calculated per-line additive multiplier breakdown."""
    sticky_by_position = {
        (wild["reel"], wild["row"]): wild for wild in gamestate.sticky_relic_wilds
    }
    multiplied_wins = []
    for win in deepcopy(gamestate.win_data.get("wins", [])):
        participants = [
            sticky_by_position[(position["reel"], position["row"])]
            for position in win["positions"]
            if (position["reel"], position["row"]) in sticky_by_position
        ]
        if not participants:
            continue
        multiplied_wins.append(
            {
                "lineIndex": int(win["meta"]["lineIndex"]),
                "baseWin": int(round(win["meta"]["winWithoutMult"] * 100)),
                "multiplier": int(win["meta"]["lineMultiplier"]),
                "win": int(round(win["win"] * 100)),
                "relicWilds": [_client_wild(wild) for wild in participants],
            }
        )

    if multiplied_wins:
        gamestate.book.add_event(
            {
                "index": len(gamestate.book.events),
                "type": RELIC_WILD_WIN,
                "wins": multiplied_wins,
                "totalWin": int(round(gamestate.win_data["totalWin"] * 100)),
            }
        )
