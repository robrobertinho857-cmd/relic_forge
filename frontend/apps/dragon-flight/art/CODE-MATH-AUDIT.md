# Dragon Flight code and math audit

Updated: 2026-09-13. Scope: frontend/apps/dragon-flight only. This reviews the active frontend demo, not backend math or platform certification.

## Normal demo profiles rebalanced to 96%

| Mode | Profile expected return | Survival probability | Entry cost |
| --- | ---: | ---: | ---: |
| Safe | 96.0000% | 55.0680% | 1× base bet |
| Balanced | 96.0000% | 22.3941% | 1× base bet |
| Danger | 96.0000% | 5.0601% | 1× base bet |
| Storm Run | 96.0000% | Not comparable to base survival | 20× base bet |
| Summit Expedition | 96.0000% | Not comparable to base survival | 50× base bet |

Base values come from finite-distribution evaluation of RISK_PROFILES, assuming independent uniform draws. For each possible gate count, the evaluator convolves collectible/current/encounter increments, applies the terminal reward floor and weights by gate survival. The demo's seeded generator is not an independent production RNG, so the table describes its intended profile distribution.

The user authorized correction of the original 119.9722% / 120.1269% / 64.8009% profiles. Gate pass probabilities are now 0.7854086290121938 (Safe), 0.6795107974442285 (Balanced), and 0.5995773581787542 (Danger). They were solved offline by bisection against the full payout distribution, with no adaptive probability changes during play. Gate counts, reward increments, endings and artwork remain the same. Payout variance increases across the risks: 0.8228, 3.9003 and 21.6383 respectively.

Settlement now preserves four decimal places through integer multiplication of bet cents by multiplier hundredths. Example: $0.10 × 1.45 stores $0.145 and displays $0.15. This removes the small-bet RTP drift caused by settling every result to cents (Safe at $0.10 would otherwise return 97.9141%). Display rounding must never be written back into round history or authoritative settlement. Every one-cent bet from $0.10 through $100 was evaluated for each risk and returns 96% within numerical tolerance 1e-10. An eventual wallet integration must preserve sufficient precision and repeat these checks with its actual settlement rules.

Reproduce calibration and settlement ranges with `pnpm run math:audit`. Tests explicitly require the 96% target and increasing risk variance; merely agreeing with an arbitrary profile is no longer enough to pass.

Bonus return was checked by enumerating all 10,000 tickets for each route: Storm has expected payout 19.2 base bets for entry 20; Summit has expected payout 48 for entry 50. Both equal 96% of entry cost. This does not establish production readiness.

## Fixes made

- Preserved fractional cents in base-game and development-scenario round data; used decimal-aware formatting for the two-decimal display.
- Reject invalid normal-round bets, risk names and round IDs at the generator boundary.
- Included the application base path in both existing bird animation asset sets so subfolder deployments resolve their images.
- Updated stale Help references to the actual Fly Again and Change Settings controls.

## Validation

- 22 automated tests: fixed RTP target, all supported bet sizes, risk ordering, bonus distribution/accounting, invalid inputs, rejection sampling, double-click locks, history cap, free replay, Buy Again and RNG failure handling.
- 300,000 deterministic normal flights total, checking terminal event/accounting invariants and agreement within six standard errors of profile expectation.
- 4,500 creature/launch variants preserve normal outcomes; all 13 forced scenarios checked across three risks.
- Integer payout multiplication compared against BigInt arithmetic across a broad bet/multiplier grid; fractional-cent display cases checked separately.
- Steering checked at widths 292, 390, 870 and 1200, heights 262 and 650, and frame rates 20/30/60/120 for all five creatures. These are simulation tests, not browser layout tests.
- All 57 active artwork files exist and have WebP headers; root and subfolder URL resolution checked, including weather/time/finish mappings.
- ESLint and Svelte checks run across the application. Production build checked separately.

## Remaining limits

- Normal round randomness is deterministic from risk, bet and a session round ID. Reloading resets the sequence. The frontend has no authoritative wallet or Stake Engine outcome connection; both base and bonus modes remain local demos.
- Action tests execute the actual action functions with presentation stubs. They do not verify animation rendering, native dialog behavior or touch interaction.
- Browser visual verification remains outstanding. Automatic approval review rejected the attempted headless browser launch with a policy block; no workaround was used. A manual browser pass should cover 1200×870, 870×1200, 390×844 and narrow landscape, including every modal and terminal result.
- Artwork placeholders remain in three playable creatures and two encounter creatures. Pickups now have painted WebP artwork. See DRAWING-CHECKLIST.md.
