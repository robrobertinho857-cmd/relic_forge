"""Exact payout distributions; all multipliers use integer hundredths of a bet."""

from dataclasses import dataclass
from fractions import Fraction
from functools import reduce
from math import gcd, sqrt

TARGET_RTP = Fraction(24, 25)
MULTIPLIER_SCALE = 100
PAYOUT_STEP = 10
UINT64_MAX = (1 << 64) - 1
SCHEMA_VERSION = 1

STAGES = (
    "MOUNTAIN_VALLEY",
    "FOREST_GORGE",
    "VOLCANIC_CANYON",
    "STORM_HIGHLANDS",
    "SKY_PEAKS",
)
STAGE_HAZARDS = {
    "MOUNTAIN_VALLEY": ("cliffGap", "rockSpires", "windPass"),
    "FOREST_GORGE": ("forestPass", "cliffGap", "windPass"),
    "VOLCANIC_CANYON": ("rockfall", "lavaColumn", "rockSpires"),
    "STORM_HIGHLANDS": ("windPass", "rockfall", "cliffGap"),
    "SKY_PEAKS": ("windPass", "rockSpires", "cliffGap"),
}
CURRENT_FACTORS = {
    "risingCurrent": 2,
    "ridgeCurrent": 3,
    "valleyCurrent": 5,
    "crosswind": 10,
}
PREDATORS = ("ridgeDragon", "mountainRaptor")


@dataclass(frozen=True)
class Payout:
    units: int
    weight: int


def exact_distribution(bands: tuple[tuple[int, int, int, int], ...]) -> tuple[Payout, ...]:
    """Preserve the positive payout shape and solve the loss mass exactly.

    For shape weights w, S=sum(p*w), W=sum(w), target RTP=n/d:
    positive weights are 100*n*w and loss weight is d*S - 100*n*W.
    This gives sum(p*weight)/(100*sum(weight)) = n/d without an optimizer.
    """
    if not 0 < TARGET_RTP < 1:
        raise ValueError("Target RTP must be strictly between zero and one")
    shape: dict[int, int] = {}
    for start, stop, step, weight in bands:
        if any(type(value) is not int for value in (start, stop, step, weight)):
            raise ValueError("Payout bands and weights must be integers")
        if start < 100 or stop < start or step <= 0 or weight <= 0:
            raise ValueError("Invalid positive payout band")
        if (stop - start) % step:
            raise ValueError("Payout band endpoint is not reachable by its step")
        if any(value % PAYOUT_STEP for value in (start, stop, step)):
            raise ValueError("Payout bands must use 0.1x increments")
        for units in range(start, stop + 1, step):
            if units in shape:
                raise ValueError("Overlapping payout bands")
            shape[units] = weight
    if not shape:
        raise ValueError("A mode needs positive payouts")
    numerator, denominator = TARGET_RTP.numerator, TARGET_RTP.denominator
    positive_scale = MULTIPLIER_SCALE * numerator
    loss = denominator * sum(p * w for p, w in shape.items()) - positive_scale * sum(shape.values())
    if loss <= 0:
        raise ValueError("Payout shape cannot support the target RTP with a crash outcome")
    weights = {0: loss, **{p: w * positive_scale for p, w in shape.items()}}
    divisor = reduce(gcd, weights.values())
    distribution = tuple(Payout(p, w // divisor) for p, w in sorted(weights.items()))
    if sum(row.weight for row in distribution) > UINT64_MAX:
        raise ValueError("Distribution weights exceed uint64")
    return distribution


@dataclass(frozen=True)
class Mode:
    name: str
    gate_range: tuple[int, int]
    encounter_one_in: int
    preview_cap: int
    payouts: tuple[Payout, ...]

    @property
    def max_win_units(self) -> int:
        return self.payouts[-1].units

    @property
    def total_weight(self) -> int:
        return sum(row.weight for row in self.payouts)

    @property
    def rtp(self) -> Fraction:
        return Fraction(sum(row.units * row.weight for row in self.payouts), 100 * self.total_weight)

    def statistics(self) -> dict:
        total = self.total_weight
        probability = lambda predicate: sum(row.weight for row in self.payouts if predicate(row.units)) / total
        second_moment = Fraction(sum(row.units**2 * row.weight for row in self.payouts), 10000 * total)
        return {
            "rtp": float(self.rtp),
            "rtpExact": str(self.rtp),
            "cost": 1,
            "maxWin": self.max_win_units / 100,
            "paidRoundRate": probability(lambda p: p > 0),
            "profitRoundRate": probability(lambda p: p > 100),
            "breakEvenRate": probability(lambda p: p == 100),
            "crashRate": probability(lambda p: p == 0),
            "standardDeviation": sqrt(float(second_moment - self.rtp**2)),
            "maxWinOneIn": total / self.payouts[-1].weight,
            "uniquePayouts": len(self.payouts),
            "weightTotal": total,
        }


MODES = {
    "safe": Mode("safe", (2, 4), 16, 300, exact_distribution((
        (100, 190, 10, 10000), (200, 290, 10, 1000),
        (300, 490, 10, 100), (500, 990, 10, 5),
        (1000, 1900, 100, 1), (2000, 2000, 10, 1),
    ))),
    "balanced": Mode("balanced", (3, 5), 10, 500, exact_distribution((
        (100, 190, 10, 1000), (200, 490, 10, 200),
        (500, 990, 10, 30), (1000, 1900, 100, 10),
        (2000, 4900, 100, 1), (5000, 10000, 2500, 1),
    ))),
    "danger": Mode("danger", (4, 6), 6, 1000, exact_distribution((
        (100, 190, 10, 1000), (200, 490, 10, 400),
        (500, 990, 10, 120), (1000, 4900, 100, 30),
        (5000, 9900, 100, 5), (10000, 24000, 1000, 2),
        (25000, 25000, 10, 1), (50000, 50000, 10, 1), (100000, 100000, 10, 1),
    ))),
}


def get_mode(name: str) -> Mode:
    try:
        return MODES[name]
    except KeyError as error:
        raise ValueError(f"Unknown Dragon Flight mode: {name}") from error
