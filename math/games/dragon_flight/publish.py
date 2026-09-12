"""Stream exact-weight books into Stake Engine's documented upload format."""

import csv
import json
import os
from hashlib import file_digest
from pathlib import Path
from tempfile import TemporaryDirectory

import zstandard

from games.dragon_flight.game_config import MODES, SCHEMA_VERSION, UINT64_MAX
from games.dragon_flight.gamestate import GameState
from games.dragon_flight.validation import verify_library

DEFAULT_OUTPUT = Path(__file__).resolve().parent / "library" / "publish_files"


def build_library(directory: Path = DEFAULT_OUTPUT, variants: int = 1024, seed: int = 20260910) -> dict:
    """Equal variant counts per payout preserve exact probabilities at any size.

    Variants must be a multiple of four so 25% of the zero-payout weight is
    allocated to predator crashes. No optimizer or sampled weight fitting.
    """
    if type(variants) is not int or variants < 4 or variants % 4:
        raise ValueError("Variants must be a positive multiple of four, at least four")
    if type(seed) is not int or seed < 0:
        raise ValueError("Seed must be a non-negative integer")
    if any(mode.total_weight * variants > UINT64_MAX for mode in MODES.values()):
        raise ValueError("Published weights would exceed uint64")
    directory = Path(directory).resolve()
    directory.parent.mkdir(parents=True, exist_ok=True)
    # A failed generation/verification leaves any existing library intact.
    with TemporaryDirectory(prefix=".dragon-flight-build-", dir=directory.parent) as temporary:
        staging = Path(temporary)
        entries = []
        for name, mode in MODES.items():
            state = GameState(name)
            events_name = f"books_{name}.jsonl.zst"
            weights_name = f"lookUpTable_{name}_0.csv"
            with (staging / events_name).open("wb") as output, (staging / weights_name).open("w", newline="", encoding="utf-8") as lookup:
                writer = csv.writer(lookup, lineterminator="\n")
                with zstandard.ZstdCompressor(level=6).stream_writer(output) as compressed:
                    book_id = 0
                    for payout in mode.payouts:
                        for variant in range(variants):
                            book_id += 1
                            book = state.build_book(payout.units, variant, book_id, seed)
                            compressed.write((json.dumps(book, separators=(",", ":"), allow_nan=False) + "\n").encode())
                            writer.writerow((book_id, payout.weight, payout.units))
            entries.append({"name": name, "cost": 1.0, "events": events_name, "weights": weights_name})
            print(f"Generated {book_id:,} {name} books", flush=True)
        (staging / "index.json").write_text(json.dumps({"modes": entries}, indent=2) + "\n", encoding="utf-8")
        report = {"game": "dragon_flight", "schemaVersion": SCHEMA_VERSION, "seed": seed,
                  "variantsPerPayout": variants, "modes": verify_library(staging)}
        report["sha256"] = {}
        for file in sorted(staging.iterdir()):
            with file.open("rb") as stream:
                report["sha256"][file.name] = file_digest(stream, "sha256").hexdigest()
        (staging / "math_report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        directory.mkdir(parents=True, exist_ok=True)
        for file in staging.iterdir():
            if file.name != "index.json":
                os.replace(file, directory / file.name)
        os.replace(staging / "index.json", directory / "index.json")
        return report
