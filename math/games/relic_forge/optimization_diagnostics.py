"""Preflight checks for official Relic Forge optimization inputs.

The Rust optimizer works on the generated lookup table and force records, not
on the quota report.  This module mirrors its fence partitioning closely
enough to report impossible targets before the expensive ancestor search.
It intentionally does not change weights or outcomes.
"""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path

import zstandard as zstd


MIN_OPTIMIZATION_BOOKS = 10_000


class OptimizationInputError(RuntimeError):
    """Raised when generated optimizer inputs cannot satisfy a fence."""


def _load_lookup(path: Path) -> dict[int, float]:
    lookup: dict[int, float] = {}
    with path.open("r", encoding="utf-8", newline="") as stream:
        for row in csv.reader(stream):
            if not row:
                continue
            if len(row) < 3:
                raise OptimizationInputError(f"Malformed lookup row in {path}: {row!r}")
            lookup[int(row[0])] = int(row[2]) / 100.0
    return lookup


def _count_books(path: Path) -> int:
    with path.open("rb") as stream:
        reader = zstd.ZstdDecompressor().stream_reader(stream)
        try:
            return sum(1 for line in io.TextIOWrapper(reader, encoding="utf-8") if line.strip())
        finally:
            reader.close()


def _load_force_records(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as stream:
        data = json.load(stream)
    if not isinstance(data, list):
        raise OptimizationInputError(f"Force record must be a list: {path}")
    return data


def _condition_matches(record: dict, search: dict[str, str]) -> bool:
    values = {(str(item["name"]), str(item["value"])) for item in record.get("search", [])}
    return all((str(key), str(value)) in values for key, value in search.items())


def _resolve_targets(conditions: dict, cost: float) -> list[dict]:
    """Mirror parse_fence_info and residual-hr handling in the Rust binary."""

    resolved = []
    total_probability = 0.0
    for name, condition in conditions.items():
        rtp = float(condition.get("rtp", -1))
        avg_win = float(condition.get("av_win", -1))
        hr_value = condition.get("hr")
        hr = -1.0 if hr_value in (None, "x") else float(hr_value)

        if hr_value != "x" and hr > 0 and rtp > 0:
            avg_win = hr * rtp
        if hr_value != "x" and hr > 0 and avg_win > 0:
            rtp = avg_win / hr
        if hr_value != "x" and hr < 0 and rtp > 0 and avg_win > 0:
            hr = avg_win / rtp / cost
        if hr > 0:
            total_probability += 1.0 / hr

        resolved.append(
            {
                "name": name,
                "condition": condition,
                "rtp": rtp,
                "avg_win": avg_win,
                "hr": hr,
                "target_hit_rate": 0.0 if hr <= 0 else 1.0 / hr,
                "target_raw_win": avg_win if condition.get("search_range", [-1, -1])[0] >= 0 else avg_win * cost,
            }
        )

    for item in resolved:
        if item["condition"].get("hr") == "x":
            item["hr"] = 1.0 / (1.0 - total_probability)
            item["avg_win"] = item["hr"] * item["rtp"]
            item["target_hit_rate"] = 1.0 / item["hr"]
            item["target_raw_win"] = item["avg_win"] * cost
    return resolved


def diagnose_mode(game_config, mode_name: str, minimum_books: int = MIN_OPTIMIZATION_BOOKS) -> dict:
    """Print and return source counts/ranges for every optimizer fence."""

    library = Path(game_config.library_path)
    lookup_path = library / "lookup_tables" / f"lookUpTable_{mode_name}.csv"
    books_path = library / "publish_files" / f"books_{mode_name}.jsonl.zst"
    force_path = library / "forces" / f"force_record_{mode_name}.json"
    missing = [str(path) for path in (lookup_path, books_path, force_path) if not path.exists()]
    if missing:
        raise OptimizationInputError(f"Missing optimizer source files for {mode_name}: {', '.join(missing)}")
    if lookup_path.stat().st_mtime < books_path.stat().st_mtime:
        raise OptimizationInputError(
            f"Stale lookup for {mode_name}: {lookup_path.name} predates {books_path.name}. Regenerate books."
        )

    lookup = _load_lookup(lookup_path)
    book_count = _count_books(books_path)
    force_records = _load_force_records(force_path)
    if len(lookup) != book_count:
        raise OptimizationInputError(
            f"Source mismatch for {mode_name}: lookup entries={len(lookup)}, books={book_count}."
        )
    if book_count < minimum_books:
        raise OptimizationInputError(
            f"{mode_name} has only {book_count} source books; official optimization requires at least "
            f"{minimum_books}. The 1,000-book smoke library is not valid optimizer input."
        )

    mode = next(mode for mode in game_config.bet_modes if mode.get_name() == mode_name)
    conditions = game_config.opt_params[mode_name]["conditions"]
    remaining = set(lookup)
    report = {"mode": mode_name, "cost": mode.get_cost(), "source_books": book_count, "fences": []}
    for target in _resolve_targets(conditions, mode.get_cost()):
        condition = target["condition"]
        search_range = condition.get("search_range", [-1, -1])
        force_search = condition.get("force_search", {})
        if search_range[0] >= 0 and search_range[0] == search_range[1]:
            candidate_ids = {book_id for book_id in remaining if lookup[book_id] == float(search_range[0])}
        elif force_search:
            candidate_ids = set()
            for record in force_records:
                if _condition_matches(record, force_search):
                    candidate_ids.update(int(book_id) for book_id in record.get("bookIds", []))
            candidate_ids &= remaining
        else:
            candidate_ids = set(remaining)

        payouts = [lookup[book_id] for book_id in candidate_ids]
        target_raw = float(target["target_raw_win"])
        reachable = bool(payouts) and min(payouts) <= target_raw <= max(payouts)
        fence_report = {
            "name": target["name"],
            "candidate_books": len(payouts),
            "min_payout": min(payouts) if payouts else None,
            "max_payout": max(payouts) if payouts else None,
            "mean_payout": sum(payouts) / len(payouts) if payouts else None,
            "target_avg_win": target["avg_win"],
            "target_raw_payout": target_raw,
            "requested_rtp": target["rtp"],
            "target_hit_rate": target["target_hit_rate"],
            "reachable": reachable,
            "search_range": search_range,
            "force_search": force_search,
        }
        report["fences"].append(fence_report)
        remaining -= candidate_ids

    report["unassigned_books"] = len(remaining)
    print(f"\nOptimizer input diagnostics: {mode_name} ({book_count} books, cost {mode.get_cost()}x)")
    for fence in report["fences"]:
        print(
            "  {name}: candidates={candidate_books} range={min_payout}..{max_payout} "
            "mean={mean_payout} target_avg_win={target_avg_win:.6f} target_raw={target_raw_payout:.6f} "
            "rtp={requested_rtp:.6f} hit={target_hit_rate:.6f} reachable={reachable}".format(**fence)
        )
    print(f"  unassigned after fences: {report['unassigned_books']}")
    unreachable = [fence for fence in report["fences"] if not fence["reachable"]]
    if unreachable:
        details = "; ".join(
            f"{f['name']}: {f['candidate_books']} books, range {f['min_payout']}..{f['max_payout']}, "
            f"target {f['target_raw_payout']}" for f in unreachable
        )
        raise OptimizationInputError(f"Unreachable optimizer fence(s) for {mode_name}: {details}")
    if remaining:
        raise OptimizationInputError(
            f"{mode_name} left {len(remaining)} books outside all optimization fences. "
            "Add a mutually exclusive final fence instead of silently preserving source weights."
        )
    return report
