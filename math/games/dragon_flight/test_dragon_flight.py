"""Financial invariants, event semantics, and on-disk Stake Engine contracts."""

import csv
import json
from copy import deepcopy
from fractions import Fraction

import pytest
import zstandard

from games.dragon_flight.game_config import CURRENT_FACTORS, MODES, TARGET_RTP, UINT64_MAX, exact_distribution
from games.dragon_flight.game_events import ending_for_payout, pickup_for_increment
from games.dragon_flight.gamestate import GameState
from games.dragon_flight.publish import build_library
from games.dragon_flight.validation import validate_book, verify_library


@pytest.mark.parametrize("name,max_win", [("safe", 20), ("balanced", 100), ("danger", 1000)])
def test_exact_financial_model(name, max_win):
    mode = MODES[name]
    assert mode.rtp == TARGET_RTP == Fraction(24, 25)
    assert mode.max_win_units == max_win * 100
    assert mode.total_weight <= UINT64_MAX
    assert all(row.weight > 0 and row.units % 10 == 0 for row in mode.payouts)
    assert all(row.units == 0 or row.units >= 100 for row in mode.payouts)
    assert len({row.units for row in mode.payouts}) == len(mode.payouts)


def test_risk_changes_variance_and_frequency_without_changing_return():
    stats = [mode.statistics() for mode in MODES.values()]
    assert stats[0]["standardDeviation"] < stats[1]["standardDeviation"] < stats[2]["standardDeviation"]
    assert stats[0]["paidRoundRate"] > stats[1]["paidRoundRate"] > stats[2]["paidRoundRate"]
    for stat in stats:
        assert stat["paidRoundRate"] + stat["crashRate"] == pytest.approx(1)
        assert stat["profitRoundRate"] + stat["breakEvenRate"] == pytest.approx(stat["paidRoundRate"])
        assert stat["rtp"] == 0.96


@pytest.mark.parametrize("name", MODES)
def test_every_payout_generates_valid_reachable_rounds(name):
    state = GameState(name)
    seen_pickups, seen_currents, seen_endings, crash_types = set(), set(), set(), set()
    for payout in state.mode.payouts:
        for variant in range(16):
            book = state.build_book(payout.units, variant, 1)
            validate_book(book, name)
            seen_endings.add(book["ending"])
            for event in book["events"]:
                if event["type"] == "pickup":
                    seen_pickups.add(event["pickupType"])
                if event["type"] == "current":
                    seen_currents.add(event["currentType"])
                if event.get("result") == "crash":
                    crash_types.add(event["type"])
            assert "bet" not in book and "creature" not in book
            assert all("win" not in event for event in book["events"])
    assert crash_types == {"gate", "encounter"}
    assert "crash" in seen_endings and "safeLanding" in seen_endings
    assert "feather" in seen_pickups and "greenCrystal" in seen_pickups
    assert "risingCurrent" in seen_currents
    if name == "danger":
        assert seen_currents == set(CURRENT_FACTORS)
        assert len(seen_pickups) == 5
        assert "summitLanding" in seen_endings


@pytest.mark.parametrize("name", MODES)
def test_sampling_boundaries_match_exact_weight_intervals(name):
    state = GameState(name)

    class Ticket:
        def __init__(self, ticket):
            self.ticket = ticket

        def randrange(self, total):
            assert total == state.mode.total_weight
            return self.ticket

    start = 0
    for row in state.mode.payouts:
        assert state.sample_payout(Ticket(start)) == row.units
        assert state.sample_payout(Ticket(start + row.weight - 1)) == row.units
        start += row.weight


def test_seed_controls_only_offline_route_variation():
    state = GameState("danger")
    book = state.build_book(100000, 3, 9, seed=7)
    assert book == state.build_book(100000, 3, 9, seed=7)
    changed = state.build_book(100000, 3, 9, seed=8)
    assert changed["events"] != book["events"]
    assert changed["payoutMultiplier"] == book["payoutMultiplier"] == 100000
    assert state.build_book(100000, 3, 10, seed=7)["events"] == book["events"]
    with pytest.raises(TypeError):
        state.build_book(100000, 3, 9, bet=1)
    with pytest.raises(TypeError):
        state.build_book(100000, 3, 9, creature="archaeopteryx")


@pytest.mark.parametrize("name", MODES)
def test_crashes_include_early_late_and_lost_pickups(name):
    state = GameState(name)
    books = [state.build_book(0, variant, variant + 1) for variant in range(128)]
    assert any(book["events"][-2].get("gate") == 1 for book in books)
    assert any(book["events"][-2].get("gate", 0) >= 3 for book in books)
    assert any(any(event["type"] == "pickup" for event in book["events"]) for book in books)
    assert sum(book["events"][-2]["type"] == "encounter" for book in books) == 32
    for book in books:
        assert book["events"][-1]["multiplierUnits"] == 0
        assert book["events"][-2]["result"] == "crash"
        assert not any(event["type"] == "ending" for event in book["events"])


@pytest.mark.parametrize("units,kind", [(10, "feather"), (40, "feather"), (50, "amberCrystal"),
    (90, "amberCrystal"), (100, "greenCrystal"), (490, "greenCrystal"),
    (500, "goldenFeather"), (990, "goldenFeather"), (1000, "skyCrystal"), (99900, "skyCrystal")])
def test_collectible_values_have_nonoverlapping_bands(units, kind):
    assert pickup_for_increment(units) == kind


@pytest.mark.parametrize("units,ending", [(0, "crash"), (100, "safeLanding"), (140, "safeLanding"),
    (150, "meadowLanding"), (290, "meadowLanding"), (300, "ridgeLanding"), (990, "ridgeLanding"),
    (1000, "hiddenValley"), (4900, "hiddenValley"), (5000, "summitLanding"), (100000, "summitLanding")])
def test_landing_is_determined_by_actual_payout(units, ending):
    assert ending_for_payout(units) == ending


def valid_win():
    return GameState("danger").build_book(100000, 3, 1)


@pytest.mark.parametrize("mutation", [
    lambda b: b.update(payoutMultiplier=999999),
    lambda b: b.update(ending="safeLanding"),
    lambda b: b.update(mode="safe"),
    lambda b: b.update(schemaVersion=True),
    lambda b: b.update(id=True),
    lambda b: b.update(bet=10),
    lambda b: b["events"][0].update(path="safe"),
    lambda b: b["events"][1].update(hazard="lavaColumn"),
    lambda b: b["events"][1].update(stage="SKY_PEAKS"),
    lambda b: b["events"][1].update(gapRatio=float("nan")),
    lambda b: b["events"][1].update(gate=3),
    lambda b: b["events"][1].update(result="crash", crashSide="upper"),
    lambda b: b["events"][-1].update(payoutMultiplier=100),
    lambda b: b["events"][-1].update(multiplier=1),
    lambda b: b["events"][-1].update(win=1000),
    lambda b: b["events"][-1].update(outcome="breakEven"),
    lambda b: b["events"][-2].update(multiplierUnits=100),
    lambda b: b["events"][-2].update(ending="safeLanding"),
    lambda b: b["stagePlan"][0].update(eventIndex=False),
    lambda b: b["stagePlan"][-1].update(eventIndex=0),
    lambda b: b["events"].insert(1, {"index": 1, "type": "finalWin"}),
    lambda b: b["events"].__setitem__(0, None),
])
def test_rejects_inconsistent_or_stake_dependent_books(mutation):
    book = valid_win()
    mutation(book)
    with pytest.raises(ValueError):
        validate_book(book, "danger")


def test_rejects_wrong_pickup_value_and_current_factor():
    state = GameState("danger")
    candidates = (state.build_book(100000, i, 1) for i in range(100))
    book = next(book for book in candidates if any(event["type"] == "current" for event in book["events"]))
    current = next(e for e in book["events"] if e["type"] == "current")
    current["factor"] = 99
    with pytest.raises(ValueError, match="factor"):
        validate_book(book, "danger")
    book = valid_win()
    pickup = next(e for e in book["events"] if e["type"] == "pickup")
    pickup["pickupType"] = "feather"
    with pytest.raises(ValueError, match="Collectible"):
        validate_book(book, "danger")


def test_rejects_reward_after_crash():
    book = GameState("safe").build_book(0, 3, 1)
    book["events"].insert(-1, {"index": len(book["events"]) - 1, "type": "pickup"})
    book["events"][-1]["index"] += 1
    with pytest.raises(ValueError, match="terminal"):
        validate_book(book, "safe")


@pytest.fixture
def library(tmp_path):
    destination = tmp_path / "publish_files"
    build_library(destination, variants=4, seed=7)
    return destination


def test_published_weights_and_sdk_contract(library):
    from utils.rgs_verification import compare_payout_values, verify_books_and_payout_mults, verify_lookup_format
    reports = verify_library(library)
    for name, mode in MODES.items():
        assert reports[name]["rtpExact"] == "24/25"
        assert reports[name]["books"] == len(mode.payouts) * 4
        assert reports[name]["predatorCrashRate"] == pytest.approx(reports[name]["crashRate"] / 4)
        _, lut_payouts, _, _, _ = verify_lookup_format(str(library / f"lookUpTable_{name}_0.csv"))
        book_payouts, _ = verify_books_and_payout_mults(str(library / f"books_{name}.jsonl.zst"))
        compare_payout_values(book_payouts, lut_payouts)


def test_build_is_reproducible_and_size_does_not_change_math(library, tmp_path):
    original = {p.name: p.read_bytes() for p in library.iterdir()}
    build_library(library, variants=4, seed=7)
    assert original == {p.name: p.read_bytes() for p in library.iterdir()}
    report = build_library(tmp_path / "larger", variants=8, seed=123)
    for name in MODES:
        assert report["modes"][name]["rtpExact"] == "24/25"
        assert report["modes"][name]["paidRoundRate"] == MODES[name].statistics()["paidRoundRate"]


@pytest.mark.parametrize("corruption", ["weight", "id", "payout", "missing", "negative", "fractional", "overflow"])
def test_rejects_corrupted_lookup(library, corruption):
    file = library / "lookUpTable_safe_0.csv"
    rows = list(csv.reader(file.read_text().splitlines()))
    if corruption == "weight": rows[0][1] = str(int(rows[0][1]) + 1)
    elif corruption == "id": rows[1][0] = rows[0][0]
    elif corruption == "payout": rows[0][2] = "100"
    elif corruption == "missing": rows.pop()
    elif corruption == "negative": rows[0][1] = "-1"
    elif corruption == "fractional": rows[0][1] = "1.5"
    elif corruption == "overflow": rows[0][1] = str(UINT64_MAX + 1)
    with file.open("w", newline="") as stream:
        csv.writer(stream).writerows(rows)
    with pytest.raises(ValueError):
        verify_library(library)


def test_rejects_malformed_book_even_with_matching_payout(library):
    file = library / "books_safe.jsonl.zst"
    with file.open("rb") as stream, zstandard.ZstdDecompressor().stream_reader(stream) as reader:
        books = [json.loads(line) for line in reader.read().decode().splitlines()]
    books[0]["events"][-1]["multiplierUnits"] = 100
    file.write_bytes(zstandard.ZstdCompressor().compress("\n".join(json.dumps(b) for b in books).encode() + b"\n"))
    with pytest.raises(ValueError, match="reconcile"):
        verify_library(library)


@pytest.mark.parametrize("change", ["cost", "path", "missing_mode", "duplicate_mode", "invalid_name"])
def test_rejects_invalid_index(library, change):
    file = library / "index.json"
    index = json.loads(file.read_text())
    if change == "cost": index["modes"][0]["cost"] = 2
    elif change == "path": index["modes"][0]["events"] = "../books_safe.jsonl.zst"
    elif change == "missing_mode": index["modes"].pop()
    elif change == "invalid_name": index["modes"][0]["name"] = []
    else: index["modes"][1] = deepcopy(index["modes"][0])
    file.write_text(json.dumps(index))
    with pytest.raises(ValueError):
        verify_library(library)


def test_failed_verification_preserves_previous_library(library, monkeypatch):
    original = {p.name: p.read_bytes() for p in library.iterdir()}

    def reject(_):
        raise ValueError("Deliberate verification failure")

    monkeypatch.setattr("games.dragon_flight.publish.verify_library", reject)
    with pytest.raises(ValueError, match="Deliberate"):
        build_library(library, variants=4, seed=99)
    assert original == {p.name: p.read_bytes() for p in library.iterdir()}


@pytest.mark.parametrize("variants", [0, 1, 3, 5, -4, True, UINT64_MAX])
def test_rejects_invalid_library_sizes(tmp_path, variants):
    with pytest.raises(ValueError):
        build_library(tmp_path / "invalid", variants=variants)


@pytest.mark.parametrize("payout", [-1, True, 1.5, 110000, 111])
def test_rejects_unsupported_outcomes(payout):
    with pytest.raises(ValueError):
        GameState("danger").build_book(payout, 0, 1)


def test_rejects_invalid_config_and_modes():
    with pytest.raises(ValueError):
        GameState("unknown")
    for bands in [(), ((100, 200, 10, 0),), ((100, 200, 0, 1),), ((100, 190, 20, 1),),
                  ((100, 200, 10, True),), ((100, 190, 10, 1), (100, 100, 10, 1))]:
        with pytest.raises(ValueError):
            exact_distribution(bands)


@pytest.mark.parametrize("target", [Fraction(0), Fraction(1), Fraction(6, 5), Fraction(-1)])
def test_invalid_rtp_configuration_is_rejected(monkeypatch, target):
    monkeypatch.setattr("games.dragon_flight.game_config.TARGET_RTP", target)
    with pytest.raises(ValueError, match="RTP"):
        exact_distribution(((100, 200, 10, 1),))


@pytest.mark.parametrize("units,outcome", [(0, "loss"), (100, "breakEven"), (110, "profit")])
def test_stake_return_is_not_classified_as_profit(units, outcome):
    book = GameState("safe").build_book(units, 0, 1)
    assert book["events"][-1]["outcome"] == outcome


def test_rejects_reweighted_variants_even_if_rtp_is_unchanged(library):
    file = library / "lookUpTable_safe_0.csv"
    rows = list(csv.reader(file.read_text().splitlines()))
    rows[0][1] = str(int(rows[0][1]) - 1)
    rows[1][1] = str(int(rows[1][1]) + 1)
    with file.open("w", newline="") as stream:
        csv.writer(stream).writerows(rows)
    with pytest.raises(ValueError, match="equal weights"):
        verify_library(library)


@pytest.mark.parametrize("corruption", ["statistics", "checksum", "variants", "invalid_report"])
def test_rejects_stale_or_tampered_report(library, corruption):
    file = library / "math_report.json"
    report = json.loads(file.read_text())
    if corruption == "statistics":
        report["modes"]["safe"]["rtp"] = 1.2
    elif corruption == "variants":
        report["variantsPerPayout"] = 8
    elif corruption == "invalid_report":
        report = []
    else:
        report["sha256"]["index.json"] = "0" * 64
    file.write_text(json.dumps(report))
    with pytest.raises(ValueError):
        verify_library(library)
