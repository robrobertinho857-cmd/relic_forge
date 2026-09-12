"""Reward semantics shared by generation and strict event validation."""


def pickup_for_increment(units: int) -> str:
    """A higher-value collectible always belongs to a higher increment band."""
    if units <= 0 or units % 10:
        raise ValueError("Pickup increments must be positive multiples of 0.1x")
    if units < 50:
        return "feather"
    if units < 100:
        return "amberCrystal"
    if units < 500:
        return "greenCrystal"
    if units < 1000:
        return "goldenFeather"
    return "skyCrystal"


def ending_for_payout(units: int) -> str:
    if units == 0:
        return "crash"
    if units < 150:
        return "safeLanding"
    if units < 300:
        return "meadowLanding"
    if units < 1000:
        return "ridgeLanding"
    if units < 5000:
        return "hiddenValley"
    return "summitLanding"


def multiplier_fields(units: int) -> dict:
    # Integer units are authoritative. `multiplier` is a display convenience
    # matching the existing UI convention; it must never settle wallet money.
    return {"multiplierUnits": units, "multiplier": units / 100}


def outcome_for_payout(units: int) -> str:
    """Returning the stake is distinct from making a profit."""
    return "loss" if units == 0 else "breakEven" if units == 100 else "profit"
