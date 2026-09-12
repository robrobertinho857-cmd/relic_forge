"""Build finite, outcome-conditioned flight books for selection by the RGS.

No browser, bet amount, creature, launch or atmosphere setting chooses a payout.
Seeds below are solely for reproducible OFFLINE book generation.
"""

from bisect import bisect_right
from hashlib import sha256
from itertools import accumulate
from random import Random

from games.dragon_flight.game_config import CURRENT_FACTORS, PREDATORS, SCHEMA_VERSION, STAGES, STAGE_HAZARDS, get_mode
from games.dragon_flight.game_events import ending_for_payout, multiplier_fields, outcome_for_payout, pickup_for_increment


class GameState:
    def __init__(self, mode: str):
        self.mode = get_mode(mode)
        self._cumulative = tuple(accumulate(row.weight for row in self.mode.payouts))
        self._payouts = frozenset(row.units for row in self.mode.payouts)

    def sample_payout(self, rng: Random) -> int:
        """Offline simulation only. Production selection belongs to the RGS."""
        return self.mode.payouts[bisect_right(self._cumulative, rng.randrange(self._cumulative[-1]))].units

    def build_book(self, payout_units: int, variant: int, book_id: int, seed: int = 20260910) -> dict:
        if type(payout_units) is not int or payout_units not in self._payouts:
            raise ValueError("Payout is not in this mode's distribution")
        if type(variant) is not int or variant < 0 or type(book_id) is not int or book_id < 1:
            raise ValueError("Invalid variant or book ID")
        if type(seed) is not int or seed < 0:
            raise ValueError("Seed must be a non-negative offline integer")
        digest = sha256(f"dragon-flight:v1:{seed}:{self.mode.name}:{payout_units}:{variant}".encode()).digest()
        rng = Random(int.from_bytes(digest, "big"))
        events: list[dict] = []
        stage_plan = [{"stage": STAGES[0], "eventIndex": 0}]

        def emit(kind: str, **fields) -> None:
            events.append({"index": len(events), "type": kind, **fields})

        emit("launch", path=self.mode.name)
        gate_count = rng.randint(*self.mode.gate_range)
        if payout_units >= 1000:
            gate_count = max(5, gate_count)
        # Zero-paying books include both early and later crashes. Every fourth
        # loss variant ends at a predator, making this a real failing obstacle.
        crash_gate = rng.randint(1, gate_count) if payout_units == 0 else None
        predator_crash = payout_units == 0 and variant % 4 == 3
        potential_target = payout_units or rng.randrange(100, self.mode.preview_cap + 1, 10)
        current = 100
        encounter_seen = False

        for gate in range(1, gate_count + 1):
            stage = STAGES[min(gate - 1, len(STAGES) - 1)]
            if stage != stage_plan[-1]["stage"]:
                stage_plan.append({"stage": stage, "eventIndex": len(events)})
            if gate == crash_gate and predator_crash:
                emit("encounter", encounterType=rng.choice(PREDATORS), result="crash", stage=stage,
                     gate=gate, **multiplier_fields(0))
                break
            gate_fields = {"gate": gate, "stage": stage, "hazard": rng.choice(STAGE_HAZARDS[stage]),
                           "gapRatio": rng.randrange(280, 721) / 1000}
            if gate == crash_gate:
                emit("gate", **gate_fields, result="crash", crashSide=rng.choice(("upper", "lower")))
                break
            emit("gate", **gate_fields, result="pass")

            checkpoint = 100 + ((potential_target - 100) * gate // gate_count // 10) * 10
            available = [kind for kind, factor in CURRENT_FACTORS.items() if current * factor <= checkpoint]
            if available and rng.randrange(3) == 0:
                kind = rng.choice(available)
                current *= CURRENT_FACTORS[kind]
                emit("current", currentType=kind, factor=CURRENT_FACTORS[kind], potential=True,
                     **multiplier_fields(current))
            increment = checkpoint - current
            if increment:
                current = checkpoint
                emit("pickup", pickupType=pickup_for_increment(increment), incrementUnits=increment,
                     potential=True, **multiplier_fields(current))

            if gate > 1 and not encounter_seen and rng.randrange(self.mode.encounter_one_in) == 0:
                emit("encounter", encounterType=rng.choice(PREDATORS), result="pass", gate=gate,
                     stage=stage, **multiplier_fields(current))
                encounter_seen = True

        ending = ending_for_payout(payout_units)
        if payout_units:
            if current != payout_units:
                raise RuntimeError("Flight rewards did not reconcile with the selected payout")
            emit("ending", ending=ending, **multiplier_fields(payout_units))
        emit("finalWin", payoutMultiplier=payout_units, outcome=outcome_for_payout(payout_units),
             **multiplier_fields(payout_units))
        return {"id": book_id, "payoutMultiplier": payout_units, "events": events,
                "schemaVersion": SCHEMA_VERSION, "mode": self.mode.name,
                "stagePlan": stage_plan, "ending": ending}
