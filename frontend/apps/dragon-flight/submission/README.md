# Dragon Flight — Stake Engine test upload

Prepared 2026-09-22; audio restored 2026-09-23. All 31 original sound files and event mappings are included. This package is for ACP testing and review, not an assertion of platform approval. No upload has been performed.

## Upload

1. Import the contents of `frontend/` as the frontend version. `index.html` belongs at the version root. Assets use relative URLs so a game/version subdirectory works.
2. Import `math/index.json` and the ten files it references as the matching math version. `math_report.json` is a local audit record, not an extra mode.
3. Enable modes with these exact names and costs:

| Mode | Entry cost / base bet | Theoretical RTP | Maximum / base bet |
| --- | ---: | ---: | ---: |
| safe | 1 | 96% | 20 |
| balanced | 1 | 96% | 100 |
| danger | 1 | 96% | 1000 |
| storm-run | 20 | 96% | 300 |
| summit-expedition | 50 | 96% | 3600 |

4. Launch from ACP using its `sessionID` and `rgs_url`. Opening the production build without a session intentionally blocks betting. For the original local demo, use `pnpm dev` instead.
5. Use `replay-examples.json` for loss, profit and maximum-win simulation IDs per mode. Public replay URLs need `replay=true&game=GAME_ID&version=MATH_VERSION&mode=MODE&event=ID&rgs_url=RGS_HOST&amount=1000000&currency=USD`. They make no wallet calls. Press Play Replay to watch; Play Again replays without a charge.

## What was verified locally

- 34 automated tests: demo accounting, audio lifecycle, exported event compatibility, wallet money units, duplicate request protection, recovery after an uncertain play, failed settlement, restricted bonus buying, and public replay.
- Svelte: zero errors and warnings; ESLint and production build pass.
- Every compressed book was compared with its CSV row. All 445,462 IDs and payout multipliers agree, file hashes match, and exact integer-weighted return is 24/25 in every mode.
- Base modes use the existing `math/games/dragon_flight` model, read without modifying it. It differs from the old frontend demo distribution. Bonus exports preserve the existing displayed bonus payout probabilities.
- Uploaded results supply presentation events and wallet payout; the browser does not generate connected-play outcomes. Failed/ambiguous play requests are never automatically repeated. Reauthentication recovers an active round and shows its full animation again before settlement.

## Required ACP checks before requesting approval

These have NOT been verified against a live test RGS or in a browser during this preparation:

- Authentication, configured bet levels, currency, exact debit/payout/balance reconciliation in all five modes, including a loss that the RGS may already mark inactive.
- Reload mid-flight and after a lost play/end-round response: the round must recover, with no duplicate debit or payout. Authentication may return the last completed round; it must not be played as a new bet.
- Public replay links for every mode and maximum win. Verify the deployed replay response uses the documented multiplier scale and an event-array `state`.
- Mouse/touch, audio, fullscreen embedding, and portrait/landscape layouts, including 1200×870 and narrow phones. Background-tab and reconnect behavior.
- Jurisdiction settings: disabled turbo and disabled feature buy, session timer/net position/RTP. Confirm `minimumRoundDuration` uses milliseconds with the target RGS configuration.
- This candidate uses English text and real-money terminology. Social casino sessions/replays are explicitly blocked. Localization and social-casino support are unfinished; select a compatible test configuration and complete the required variants before approval if requested.
- Review the current platform checklist, game naming/metadata, art and sound rights, and marketing assets in ACP. Local tests do not establish approval or certification.

## Rebuild

Run in `frontend/apps/dragon-flight`:

```powershell
pnpm submission:math
../../../math/env/Scripts/python.exe -B scripts/verify-submission.py
pnpm test
pnpm run lint
pnpm exec svelte-check --tsconfig ./tsconfig.json
pnpm run build
```

The math command uses the existing repository Python environment (with zstandard). It writes only inside this app. After rebuilding, copy the fresh `build/` contents to `submission/frontend/` before uploading; never upload the source, art masters, tests, or session credentials.

Contracts used: [RGS API](https://github.com/StakeEngine/math-sdk/blob/main/docs/rgs_docs/RGS.md), [math format](https://github.com/StakeEngine/math-sdk/blob/main/docs/rgs_docs/data_format.md), [required replay behavior](https://stake-engine.com/docs/approval-guidelines/game-replay-requirements).
