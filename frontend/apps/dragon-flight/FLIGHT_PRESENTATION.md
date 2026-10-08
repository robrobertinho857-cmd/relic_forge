# Flight presentation

`flock/director.ts` maps authored events into an ordered timeline. `flock/timeline.ts` is driven by the world's sole requestAnimationFrame loop. Milliseconds describe presentation only; payouts, probabilities, books and server settlement are unchanged.

At 1x launch takes 800ms (100ms bird stagger), ordinary events 400–800ms and eliminations 720ms. Continuous travel bridges bring short base books to 7–10.5 seconds without stretching individual hazards. Longer books retain readable events. Champion adds 5.05 seconds for a failure or 6.15 seconds for a successful landing. A 450ms result tail leaves impact effects time to finish. Network settlement may add time.

## Authoritative mapping

- Gate artwork follows its hazard: cliff/mountain gaps and forest passages use existing terrain assets; windPass uses the wind system.
- Current events preserve their currentType; encounter events preserve their encounterType and result.
- Eliminations preserve their explicit reason and bird. Hunter aims and shoots only for an explicit hunter elimination. Terrain/wind/predator eliminations never become hunter attacks.
- Legacy elimination records lack a hazard subtype. The documented cosmetic fallback is cliffGap for terrain, crosswind for wind and ridgeDragon for predator. These choices do not modify the authored survival result.
- The existing demo adapter explicitly authors hunter elimination reasons. This pass does not change that adapter or its calibrated outcomes. Its gates now show their original terrain/wind hazards instead of additional missed gunshots.
- Champion keeps the same paid round and Archaeopteryx body; other birds leave while the existing storm artwork crossfades in. Bonus failure displays BASE WIN RETAINED; bonus success displays the actual additive bonus amount.

## Rendering and safety

One clock scales presentation time once. Hidden tabs discard elapsed gaps; resumed frames are clamped to 50ms before scaling. Cancellation invalidates all pending clock jobs, including sibling effects cancelled from a frame callback. Live responses and decoded scenes have stale/disposal guards. Concurrent settlement shares one request; replay skips paid play and settlement.

Formation springs preserve position and velocity during elimination/handoff, normalize coordinates during resize and use separate flap phases. Decoded sprite frames and scene promises are reused. Sprite, terrain, floor, particle and progress motion use transforms; canvas redraws occur only when the decoded frame changes. Rain uses transformed tiled layers; lightning follows the shared scroll clock rather than random timers.

Local Node measurement of the warmed four-bird motion kernel over 10,000 ticks: median 0.00093ms and p95 0.00417ms per tick. This excludes Svelte, canvas, video decode and browser compositing; it is not a measured 60fps claim. Browser tools do not expose frame-timing instrumentation here.
