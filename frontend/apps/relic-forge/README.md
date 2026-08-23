# Relic Forge

Relic Forge is a dark-fantasy 5x3, 20-payline slot frontend built as a separate app in the Stake Web SDK workspace. It uses Svelte 5, the shared Stake RGS request helpers, project-local fantasy artwork, and an authoritative event-driven presentation flow.

## Development

From `frontend/`:

```sh
volta run --node 22.16.0 pnpm install
volta run --node 22.16.0 pnpm --filter relic-forge dev
volta run --node 22.16.0 pnpm --filter relic-forge build
volta run --node 22.16.0 pnpm --filter relic-forge lint
volta run --node 22.16.0 pnpm --filter relic-forge exec svelte-check --tsconfig ./tsconfig.json
volta run --node 22.16.0 pnpm --filter relic-forge verify:browser
```

Open `http://localhost:3006/?demo=true` for explicit deterministic development fixture mode. Mock mode is development-only and must never be inferred from missing live-session parameters. The mode selector exposes Normal (1x), Forge Boost (2x), Dragon Boost (5x), and Standard/Super/Mythic Bonus Buy demonstrations (80x/250x/500x). These mock choices replay fixed Stake-style event books so the UI can be reviewed; they do not select symbols, multipliers, winning lines, or payouts at render time. A Stake Engine session URL (`sessionID`, `rgs_url`, and the other standard parameters) switches the adapter to `/wallet/play`, `/bet/event`, and `/wallet/end-round` through the official shared SDK helpers.

## Architecture

- `src/game/config.ts` owns symbol metadata, payline geometry, bet levels, and visual tokens used by the prototype.
- `src/game/modes.ts` owns display metadata and maps UI cards to authenticated RGS modes. Mock multipliers are presentation-fixture inputs only.
- `src/game/adapter.ts` is the RGS boundary. It never calculates a wager outcome in the browser; mock rounds are fixed fixtures for development only.
- `src/game/types.ts` defines the normalized round/event vocabulary consumed by the renderer.
- `src/components/Game.svelte` owns the explicit presentation phases, deterministic event playback, responsive UI, modal controls, and session recovery handoff.
- `src/components/RelicWildOverlay.svelte` presents authoritative sticky positions without letting locked cells visually spin away; `MultiplierCombine.svelte` presents the server-provided per-line base win, additive multiplier, and final win.
- `src/components/ModeSelection.svelte`, `ModeCard.svelte`, and `BonusConfirmModal.svelte` implement the reusable responsive mode and purchase-confirmation interface.
- `src/app.css` contains the replaceable dark-fantasy visual system. No runtime external fonts, image CDNs, or remote CSS are used.

## RGS / recovery

Authentication is provided by the workspace `Authenticate` component. It populates balance, bet levels, jurisdiction, replay data, and unfinished-round state. Relic Forge consumes the resumed state without placing a second wager and calls end-round only after the presentation sequence.

Play boosts and Bonus Buy cards are enabled in an RGS session only when authentication advertises their mapped modes with valid cost multipliers. Bonus modes accept the authenticated `buyBonus` contract (and legacy `feature` where supplied), while `disabledBuyFeature` is always honored. Replay URLs are read-only: they do not wager, buy features, record events, or complete rounds.

## Math

`math/games/relic_forge` is now an executable Stake Engine development game with reel strips, 20-line evaluation, Wild substitution, Scatter-triggered Free Spins, server-selected sticky Relic Wild multipliers, additive per-payline multiplier evaluation, six bet modes, event generation, deterministic simulation tooling, and a server-side 5000x cap. Its current reels, weights, costs, and distribution quotas are development inputs and are not production-certified; RTP/volatility optimization and approval remain required before deployment.

The adapter normalizes Stake API and book denominations for display but never derives a casino outcome. Live, mock, and recovered rounds all pass through the same normalized event consumer. Custom events are limited to Relic Wild state and presentation breakdowns; official `reveal`, `winInfo`, `setWin`, `setTotalWin`, Free Spin, `wincap`, and `finalWin` events remain authoritative.

From `math/`, use `env\\Scripts\\python.exe games\\relic_forge\\simulate.py --sims 10000` for a six-mode development report. Use `env\\Scripts\\python.exe games\\relic_forge\\run.py --command smoke` for deterministic book generation, `--command config` for configuration generation, `--command verify-strict` for verification, and `--command optimize` to invoke the official Rust optimizer after its prerequisites are installed. `--command production` requests 100,000 books per mode and requires real Stake provider name/number environment variables; it was not run as part of frontend QA.

## Visual QA

Check desktop landscape, tablet, mobile landscape, and mobile portrait. The reel frame is responsive rather than a single scaled bitmap, and reduced-motion preferences shorten the presentation to a static reveal.
