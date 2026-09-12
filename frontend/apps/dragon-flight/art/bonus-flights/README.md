# Bonus flights: local demo

Storm Run and Summit Expedition are purchased demo routes available through Bonus Flights below the main controls. Illustrations are in `static/bonuses/`; [exact built-in generation prompts](PROMPTS.md) are retained alongside this file.

Storm Run costs 20 times the base bet and presents three gates with rising currents in a storm. Summit Expedition costs 50 times the base bet and presents five gates from the valley through the forest to snowy peaks. Successful flights finish at the ridge or summit. Zero outcomes crash at the final gate and pay zero. Buying guarantees the route, not a payout. Risk settings apply only to normal flights. Bonus weather and time do not overwrite the normal appearance settings.

## Math and accounting

`src/game-world/bonusFlights.ts` defines 10,000 equally likely tickets per route. One complete outcome is drawn before presentation with Web Crypto rejection sampling. Appearance, playback speed and on-screen collisions never choose or modify the payout.

| Route             | Base-bet payout multipliers | Ticket counts                  |
| ----------------- | --------------------------- | ------------------------------ |
| Storm Run         | 0, 10, 30, 80, 300          | 4000, 3000, 2000, 900, 100     |
| Summit Expedition | 0, 20, 80, 200, 600, 3600   | 5000, 2500, 1500, 800, 190, 10 |

Expected payout per unit base bet is 19.2 for Storm Run and 48 for Summit Expedition. Dividing by entry prices 20 and 50 gives exactly 96% theoretical return for these local tables. The UI exposes every payout, chance and total entry price before starting. The displayed multiplier uses the base bet; entry cost and net result are separate. Celebration tiers use return relative to the entry cost, and payouts below cost do not show a win celebration.

This is a frontend demo implementation with no wallet, funds deduction, backend purchase or certified game math. Production integration requires authoritative bonus-mode results and purchase settlement. The existing normal-flight generator is unchanged; its return is not described by the bonus tables.

## History and replay

The last 20 completed flights are kept in memory for the current session. History shows entry, payout, net result and base-bet multiplier. Replay presents the same stored events at no cost, carries a visible replay label and adds no history entry. Fly Again / Buy Again starts a new round with the previous base bet and route; its button displays the full price. Change Settings returns to the normal controls.

## Checks

Run `pnpm test`. The tests use the existing Vite TypeScript transformer and work with the workspace test runner. Tests exhaust both ticket distributions, verify accounting and terminal events, check invalid inputs and rejection sampling, and exercise actual component actions for repeated clicks, history limits, replay and repeat purchase. Component action tests stub rendering and animation boundaries; they do not replace browser layout checks.
