# Dragon Flight math

This standalone math module replaces the prototype's inconsistent payout model
with finite, weighted flight outcomes. It does **not** change or connect the
frontend. The app still uses its existing mock until a separate RGS integration.

## Model

All modes cost 1x and have exactly **96% theoretical RTP** (4% house edge).
Risk changes payout frequency, variance and maximum payout; it does not change
the expected return. These are development parameters, not platform approval.

| Mode | Paid rounds | Profitable rounds | Break-even rounds | Crashes | Maximum payout | Payout standard deviation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Safe | 60.064% | 54.713% | 5.350% | 39.936% | 20x | 0.913x |
| Balanced | 34.486% | 32.531% | 1.956% | 65.514% | 100x | 2.050x |
| Danger | 17.528% | 16.934% | 0.595% | 82.472% | 1000x | 5.583x |

Payouts include the returned stake. A 1x result is break-even, 0x loses the
stake, and a result above 1x is profitable. There are no partial-stake payouts.
Maximum payout frequency is approximately 1 in 186,904 / 51,130 / 168,203
rounds for Safe / Balanced / Danger respectively. Maximum payout frequency alone
does not measure volatility; the whole distribution determines it.

`game_config.py` defines positive payout bands and relative shape weights.
For payout `p` in integer hundredths, shape weight `w`, and RTP `n/d`, let
`S = sum(p*w)` and `W = sum(w)`. Assign positive weights `100*n*w` and a
zero-payout weight of `d*S - 100*n*W`, then reduce all weights by their common
divisor. This makes `sum(p*weight)/(100*sum(weight))` exactly `24/25`.
The publisher repeats every payout with the same number of equally weighted
route variants, preserving these probabilities without sampled fitting.

## Round logic

- The RGS selects an entire weighted outcome before its animation. The Python
  random seed is solely for reproducible offline generation and simulation.
  Stake, creature, weather, time and launch style never select the payout.
- A flight starts at a potential 1x. Pickups add integer multiplier units;
  currents multiply the current potential by their stated 2/3/5/10 factor.
  Every displayed reward reconciles with that arithmetic. Collectible types
  represent value bands rather than a fixed value per icon; the exact increment
  is provided in the event.
- All rewards remain unbanked until landing. Any obstacle or predator crash
  settles at 0x, including crashes after collecting rewards. Exactly 25% of
  loss weight ends in a predator encounter and 75% in an obstacle.
- Landing does not secretly increase or reduce the reward. The ending tier
  follows the final payout: safe landing below 1.5x, meadow below 3x, ridge
  below 10x, hidden valley below 50x, and summit at 50x or more.
- Gates advance through Mountain Valley, Forest Gorge, Volcanic Canyon,
  Storm Highlands and Sky Peaks. Hazards belong to their landscape. Short
  routes may finish before the last stage; payouts of 10x or more visit all five.
- This is an automatic flight reveal. It has no cashout, timing advantage or
  player-controlled survival. Adding any such feature requires a new model.
  Route generation is conditioned on the selected payout, so visual obstacle
  counts and gaps must not be described as independent survival odds.

Loss routes use capped potential targets (3x/5x/10x), and checkpoint values
rise along the route. These are presentation choices, not additional random
bets. In particular, displayed progress can imply the eventual outcome; it
must never enable a cashout or another wager within this round.

## Files and commands

Run from the repository's `math/` directory with its existing Python environment:

```powershell
env/Scripts/python.exe games/dragon_flight/run.py analyse
env/Scripts/python.exe games/dragon_flight/run.py build
env/Scripts/python.exe games/dragon_flight/run.py verify
env/Scripts/python.exe games/dragon_flight/run.py simulate --rounds 1000000
env/Scripts/python.exe -m pytest games/dragon_flight/test_dragon_flight.py -q --basetemp=games/dragon_flight/library/test-tmp
```

The default build creates 1,024 variants per payout: 104,448 Safe, 137,216
Balanced and 203,776 Danger books (**445,440 total**). `--variants` must be a
multiple of four; small values are useful for local checks. `--seed` changes
offline routes without changing payout probabilities. `--output` overrides the
destination.

Generated files live in `library/publish_files/`, ignored by the repository's
existing library rule:

- `index.json`: mode names, cost, compressed event files and lookup filenames.
- `books_<mode>.jsonl.zst`: streamed JSON outcome books.
- `lookUpTable_<mode>_0.csv`: headerless `book_id,weight,payoutMultiplier` rows.
- `math_report.json`: exact model statistics, observed file counts, crash
  breakdown and SHA-256 hashes of the seven upload files. This is a local audit
  report, not an additional file referenced by the upload index.

The custom exporter follows the documented
[Stake Engine math file format](https://stake-engine.com/docs/math/math-file-format).
It stages and verifies the entire library before replacing existing files;
generation or validation failure preserves the previous library. Do not serve
these files during a build, since replacement of the whole set is not atomic.

## Event and integration contract

Each book has `id`, `payoutMultiplier`, and `events`. Each event has a consecutive
zero-based `index` and a `type`: `launch`, `gate`, `pickup`, `current`,
`encounter`, `ending`, or `finalWin`. Reward-bearing events carry exact integer
`multiplierUnits` and a display-only decimal `multiplier`. Pickups include
`incrementUnits`; currents include `factor`; both have `potential: true`.
The terminal `finalWin` includes the book's `payoutMultiplier` and an `outcome`
of `loss`, `breakEven`, or `profit`.

Multiplier units are hundredths: `100` means 1x and `100000` means 1000x.
These are **not wallet currency units**. Use the RGS-returned payout and balance
for financial settlement; do not round a browser-calculated amount to cents.

Book-level `schemaVersion`, `mode`, `stagePlan` and `ending` are local metadata.
An RGS response may expose only the event stream. The integration can derive
stages from gate/encounter events, the mode from launch, and the result from
`finalWin`; it must not depend on extra book fields reaching the browser.

The remaining frontend integration must authenticate with the RGS, request
the chosen mode, play the returned event stream, handle active-round recovery
and end-round settlement, and use server wallet amounts. It must also map
these events to the animation and show potential rewards and break-even
results accurately. Existing mock event types are not a drop-in adapter.
Nothing in this module uploads files, changes a live game, or implements that
connection.

## Verification

The validator reads actual compressed books and CSV rows together. It rejects
ID/payout mismatches, malformed integers, unexpected modes or file paths,
incorrect costs, unequal route weights, altered payout probabilities, wrong
crash proportions, broken reward arithmetic, post-crash rewards, incompatible
stages/hazards, and stale report statistics or checksums.

Tests cover every supported payout, weighted sampling boundaries, risk ordering,
early and late losses, predator failures, reward loss on crash, outcome
classification, deterministic exports, corruption rejection and compatibility
with the repository's SDK book/lookup validators. Exact rational verification
of all exported weights establishes theoretical RTP; Monte Carlo results are
only a sampling sanity check and naturally fluctuate, especially for Danger.

Source responsibilities: `game_config.py` owns distributions, `game_events.py`
owns reward/ending classifications, `gamestate.py` creates offline routes,
`validation.py` checks semantics and artifacts, `publish.py` exports, and
`run.py` provides the CLI.
