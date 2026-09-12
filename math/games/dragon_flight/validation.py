"""Fail-closed validation of flight semantics and the actual published weights."""

import csv
import json
from collections import Counter
from decimal import Decimal, InvalidOperation
from fractions import Fraction
from hashlib import file_digest
from io import TextIOWrapper
from itertools import zip_longest
from pathlib import Path

import zstandard

from games.dragon_flight.game_config import CURRENT_FACTORS, MODES, PREDATORS, SCHEMA_VERSION, STAGES, STAGE_HAZARDS, TARGET_RTP, UINT64_MAX, get_mode
from games.dragon_flight.game_events import ending_for_payout, outcome_for_payout, pickup_for_increment


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def uint(value, name: str, minimum: int = 0) -> int:
    require(type(value) is int and minimum <= value <= UINT64_MAX, f"Invalid {name}: expected uint64 >= {minimum}")
    return value


def check_multiplier(event: dict, expected: int) -> None:
    require(uint(event.get("multiplierUnits"), "multiplierUnits") == expected, "Multiplier does not reconcile")
    try:
        display = Decimal(str(event.get("multiplier")))
        require(display.is_finite() and display * 100 == expected, "Display multiplier disagrees with integer units")
    except InvalidOperation as error:
        raise ValueError("Invalid display multiplier") from error


def validate_book(book: dict, mode_name: str) -> None:
    mode = get_mode(mode_name)
    require(isinstance(book, dict), "Book must be an object")
    uint(book.get("id"), "book ID", 1)
    payout = uint(book.get("payoutMultiplier"), "payoutMultiplier")
    require(payout in {row.units for row in mode.payouts}, "Payout is outside this mode's distribution")
    require(type(book.get("schemaVersion")) is int and book["schemaVersion"] == SCHEMA_VERSION, "Unknown event schema")
    require(book.get("mode") == mode_name, "Book mode mismatch")
    require(book.get("ending") == ending_for_payout(payout), "Landing is inconsistent with reward tier")
    events = book.get("events")
    require(isinstance(events, list) and 3 <= len(events) <= 40, "Invalid flight event count")
    require(all(isinstance(event, dict) for event in events), "Event must be an object")
    require(not {"bet", "win", "balance", "creature", "weather", "timeOfDay", "launchStyle"}.intersection(book), "Math books must be independent of stake and cosmetic selections")
    require(events[0].get("type") == "launch" and events[-1].get("type") == "finalWin", "Invalid round boundaries")
    current, last_gate = 100, 0
    terminal = None
    stage_plan = [{"stage": STAGES[0], "eventIndex": 0}]
    for index, event in enumerate(events):
        require(not {"bet", "win", "balance"}.intersection(event), "Math events cannot contain wallet amounts")
        require(uint(event.get("index"), "event index") == index, "Event indexes must be consecutive")
        kind = event.get("type")
        require(terminal is None or kind == "finalWin", "Event after a terminal crash or landing")
        if kind == "launch":
            require(index == 0 and event.get("path") == mode_name, "Invalid launch")
        elif kind in ("gate", "encounter"):
            gate = uint(event.get("gate"), "gate number", 1)
            result = event.get("result")
            require(result in ("pass", "crash"), "Invalid obstacle result")
            if kind == "gate" or result == "crash":
                require(gate == last_gate + 1, "Skipped or repeated gate")
                last_gate = gate
            else:
                require(gate == last_gate and gate > 1, "Encounter is not on the active gate")
            require(gate <= max(5, mode.gate_range[1]), "Flight exceeds the route length limit")
            stage = STAGES[min(gate - 1, len(STAGES) - 1)]
            require(event.get("stage") == stage, "Obstacle is in the wrong stage")
            if stage != stage_plan[-1]["stage"]:
                stage_plan.append({"stage": stage, "eventIndex": index})
            if kind == "gate":
                require(event.get("hazard") in STAGE_HAZARDS[stage], "Hazard does not belong to its landscape")
                gap = event.get("gapRatio")
                require(type(gap) in (float, int) and 0.28 <= gap <= 0.72, "Invalid flight gap")
                if result == "crash":
                    require(event.get("crashSide") in ("upper", "lower"), "Missing crash side")
                else:
                    require("crashSide" not in event, "Passing gate has crash metadata")
            else:
                require(event.get("encounterType") in PREDATORS, "Unknown predator")
                check_multiplier(event, 0 if result == "crash" else current)
            if result == "crash":
                require(payout == 0, "A crashed flight pays a positive amount")
                terminal = "crash"
                current = 0
        elif kind == "pickup":
            require(last_gate > 0, "Pickup before entering the route")
            increment = uint(event.get("incrementUnits"), "pickup increment", 1)
            require(event.get("pickupType") == pickup_for_increment(increment), "Collectible does not match reward value")
            require(event.get("potential") is True, "Flight pickups must be marked as unbanked potential")
            current += increment
            check_multiplier(event, current)
        elif kind == "current":
            require(last_gate > 0, "Air current before entering the route")
            factor = CURRENT_FACTORS.get(event.get("currentType"))
            require(factor is not None and type(event.get("factor")) is int and event["factor"] == factor, "Invalid current factor")
            require(event.get("potential") is True, "Current reward must be marked as unbanked potential")
            current *= factor
            check_multiplier(event, current)
        elif kind == "ending":
            require(payout > 0 and current == payout, "Landing cannot secretly add or remove rewards")
            require(last_gate >= mode.gate_range[0], "Landing before the minimum route length")
            require(event.get("ending") == ending_for_payout(payout), "Wrong landing tier")
            check_multiplier(event, payout)
            terminal = "landing"
        elif kind == "finalWin":
            require(index == len(events) - 1 and terminal is not None, "Final win before a terminal event")
            require(uint(event.get("payoutMultiplier"), "final payout") == payout, "Book and final payout disagree")
            check_multiplier(event, payout)
            require(event.get("outcome") == outcome_for_payout(payout), "Profit, break-even and loss classification disagree")
        else:
            raise ValueError(f"Unknown flight event: {kind}")
        require(0 <= current <= mode.max_win_units, "Potential reward exceeds the mode cap")
        if payout > 0:
            require(current <= payout, "Displayed reward exceeds the eventual landing payout")
    milestones = book.get("stagePlan")
    require(isinstance(milestones, list), "Missing stage milestones")
    for milestone in milestones:
        require(isinstance(milestone, dict), "Invalid stage milestone")
        uint(milestone.get("eventIndex"), "stage event index")
    require(milestones == stage_plan, "Stage milestones disagree with the event stream")


def verify_library(directory: Path) -> dict:
    directory = Path(directory)
    with (directory / "index.json").open(encoding="utf-8") as stream:
        index = json.load(stream)
    require(isinstance(index, dict) and isinstance(index.get("modes"), list), "Invalid index.json")
    entries = index["modes"]
    require(len(entries) == len(MODES), "Index must contain exactly three modes")
    require(all(isinstance(entry, dict) for entry in entries), "Invalid mode entry")
    require(all(isinstance(entry.get("name"), str) for entry in entries), "Invalid mode name")
    require({entry.get("name") for entry in entries} == set(MODES), "Index modes are missing or duplicated")
    reports = {}
    for entry in entries:
        name = entry["name"]
        mode = get_mode(name)
        require(type(entry.get("cost")) in (int, float) and entry["cost"] == 1, "All flight modes cost 1x")
        require(entry.get("events") == f"books_{name}.jsonl.zst", "Unexpected book filename")
        require(entry.get("weights") == f"lookUpTable_{name}_0.csv", "Unexpected weight filename")
        weights: Counter = Counter()
        counts: Counter = Counter()
        variant_weights: dict[int, int] = {}
        crash_types: Counter = Counter()
        books_count = 0
        with (directory / entry["events"]).open("rb") as compressed, (directory / entry["weights"]).open(newline="", encoding="utf-8") as lookup:
            with zstandard.ZstdDecompressor().stream_reader(compressed) as reader:
                with TextIOWrapper(reader, encoding="utf-8") as books:
                    for book_line, row in zip_longest(books, csv.reader(lookup)):
                        require(book_line is not None and row is not None, "Books and lookup have different lengths")
                        require(len(row) == 3 and all(cell.isascii() and cell.isdecimal() for cell in row), "Lookup values must be unsigned decimal integers")
                        row_id, weight, payout = map(int, row)
                        uint(row_id, "lookup ID", 1)
                        uint(weight, "lookup weight", 1)
                        uint(payout, "lookup payout")
                        books_count += 1
                        require(row_id == books_count, "Duplicate, missing or reordered lookup ID")
                        book = json.loads(book_line)
                        require(isinstance(book, dict), "Book must be an object")
                        require(book.get("id") == row_id and book.get("payoutMultiplier") == payout, "Lookup and book disagree")
                        validate_book(book, name)
                        weights[payout] += weight
                        counts[payout] += 1
                        require(variant_weights.setdefault(payout, weight) == weight, "Route variants within a payout must have equal weights")
                        for event in book["events"]:
                            if event.get("result") == "crash":
                                crash_types[event["type"]] += weight
        require(books_count > 0, "Empty mode library")
        total = sum(weights.values())
        require(total <= UINT64_MAX, "Total lookup weight exceeds uint64")
        require(set(weights) == {row.units for row in mode.payouts}, "Payout support differs from the model")
        require(len(set(counts.values())) == 1 and counts[0] >= 4 and counts[0] % 4 == 0, "Each payout needs the same multiple-of-four variant count")
        for row in mode.payouts:
            require(Fraction(weights[row.units], total) == Fraction(row.weight, mode.total_weight), "Published payout probability differs from the exact model")
        actual_rtp = Fraction(sum(p * w for p, w in weights.items()), 100 * total)
        require(actual_rtp == TARGET_RTP, "Published RTP differs from target")
        require(crash_types["encounter"] * 4 == weights[0] and crash_types["gate"] * 4 == weights[0] * 3, "Crash causes do not match the model's 25% predator / 75% obstacle split")
        reports[name] = {**mode.statistics(), "books": books_count, "publishedWeightTotal": total,
                         "predatorCrashRate": crash_types["encounter"] / total,
                         "obstacleCrashRate": crash_types["gate"] / total}
    report_path = directory / "math_report.json"
    if report_path.exists():
        with report_path.open(encoding="utf-8") as stream:
            saved = json.load(stream)
        require(isinstance(saved, dict), "Math report must be an object")
        require(saved.get("game") == "dragon_flight" and saved.get("schemaVersion") == SCHEMA_VERSION, "Invalid math report identity")
        variants = uint(saved.get("variantsPerPayout"), "report variant count", 4)
        require(all(report["books"] == variants * len(MODES[name].payouts) for name, report in reports.items()), "Reported variant count disagrees with the math files")
        require(saved.get("modes") == reports, "Saved statistics disagree with the actual math files")
        expected_files = {"index.json"} | {entry[key] for entry in entries for key in ("events", "weights")}
        hashes = saved.get("sha256")
        require(isinstance(hashes, dict) and set(hashes) == expected_files, "Incomplete file hash manifest")
        for filename in expected_files:
            with (directory / filename).open("rb") as stream:
                require(hashes[filename] == file_digest(stream, "sha256").hexdigest(), "Math artifact checksum mismatch")
    return reports
