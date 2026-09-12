# Dragon Flight theme update

Dragon Flight now uses natural landscapes, outdoor landings, feathers and crystals, air currents, and predator encounters. The compact setup order is Creature → Bet → Risk → Fly. Customize remains separate.

## Stages

1. Mountain Valley
2. Forest Gorge
3. Volcanic Canyon
4. Storm Highlands
5. Sky Peaks

Layered SVG scenery provides mountains, forest slopes, rivers, canyon cliffs and snowy peaks. Time and weather still customize the scene. Lava and volcanic embers belong to Volcanic Canyon.

## Terminology and presentation

| Previous concept                                     | New presentation                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Relics                                               | Feather, Amber Crystal, Green Crystal, Golden Feather, Sky Crystal |
| Portals                                              | Rising Current, Ridge Current, Valley Current, Crosswind           |
| Bosses                                               | Ridge Dragon and Mountain Raptor predator encounters               |
| Forge Hammer / Chain Tunnel / Fire Gate / Spike Gate | Rockfall / Forest Pass / Cliff Gap / Rock Spires                   |
| Forge / Dragon / Ancient vaults and Mythic Realm     | Meadow Landing / Ridge Landing / Hidden Valley / Summit Landing    |
| Inferno weather                                      | Ash                                                                |
| Epic / Mythic win labels                             | Great Win / Outstanding Win                                        |

Safe Landing, Lava Column, Safe / Balanced / Danger, and all five creatures remain. **Archaeopteryx is included**, with its existing animation and the description “A rare prehistoric flyer with broad feathered wings.” The guide now derives its creature and option lists from the same definitions as the menus.

Glowing chambers, magical rings, boss fire effects, forge scenery and fantasy lore have been replaced. Source artwork filenames under `static/vfx/forge/` remain because those images provide useful volcanic embers and lava; their filenames are not exposed in the UI.

## Files changed in this pass

Paths are relative to `frontend/apps/dragon-flight/`.

| Files                                                                                                                                      | Change                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `src/app.css`                                                                                                                              | Base typography and palette                                                                      |
| `src/game-world/GameWorld.svelte`                                                                                                          | Scene composition, labels, dock order, natural obstacle styling and dead CSS cleanup             |
| `src/game-world/components/Landscape.svelte`                                                                                               | New layered landscape component                                                                  |
| `src/game-world/components/AirCurrentEffect.svelte` (replaces `PortalEffect.svelte`)                                                       | Open air rings and current labels                                                                |
| `src/game-world/components/CollectiblePickup.svelte` (replaces `RelicPickup.svelte`)                                                       | Feather and crystal pickups                                                                      |
| `src/game-world/components/DangerEncounter.svelte` (replaces `BossEncounter.svelte`)                                                       | Flying predator silhouettes                                                                      |
| `src/game-world/components/VolcanicEnvironmentEffect.svelte` (replaces `ForgeEnvironmentEffect.svelte`)                                    | Volcanic ember presentation                                                                      |
| `src/game-world/components/LavaEnvironmentEffect.svelte`                                                                                   | Anchor existing lava artwork to the canyon floor                                                 |
| `src/game-world/components/CreaturePicker.svelte`                                                                                          | Grounded menu typography and colors                                                              |
| `src/game-world/components/CustomizeDrawer.svelte`                                                                                         | Simpler copy, Ash option, option descriptions and explanation of the existing time/weather reset |
| `src/game-world/components/HelpDialog.svelte`                                                                                              | Concise guide with shared creature, landscape, event and customization definitions               |
| `src/game-world/components/EndingEffect.svelte`                                                                                            | Outdoor landing ledges and windsocks                                                             |
| `src/game-world/components/EventWarning.svelte`                                                                                            | Current and predator notices                                                                     |
| `src/game-world/components/WeatherEffect.svelte`                                                                                           | Inferno-to-Ash identifiers                                                                       |
| `src/game-world/components/WinCelebration.svelte`                                                                                          | Simpler win labels and colors                                                                    |
| `src/game-world/creatures.ts`                                                                                                              | Natural-world creature descriptions, including Archaeopteryx                                     |
| `src/game-world/stages.ts`                                                                                                                 | New stage identities with the existing progression rules                                         |
| `src/game-world/presentation.ts`                                                                                                           | Shared labels for pickups, currents, encounters, hazards and endings                             |
| `src/game-world/mockRound.ts`                                                                                                              | One-to-one theme identifier renames; calculations, random draws and probability values preserved |
| `src/game-world/devScenarios.ts`                                                                                                           | Corresponding scenario and event names                                                           |
| `src/game-world/weather.ts`, `src/game-world/timeOfDay.ts`                                                                                 | Ash naming and clearer descriptions                                                              |
| `src/game-world/types/flight.ts`, `src/game-world/types/presentation.ts`, `src/game-world/types/world.ts`, `src/game-world/types/index.ts` | Consistent event, effect, stage and particle names                                               |
| `src/game-world/utils/format.ts`                                                                                                           | Remove the unused event-name formatter after adopting shared labels                              |
| `src/game-world/vfx.ts`                                                                                                                    | Volcanic asset key and removal of unused asset constants                                         |
| `THEME_NOTES.md`                                                                                                                           | Change inventory and validation results                                                          |

Existing atmosphere/weather work, previously deleted background modules, and supplied creature/weather artwork were preserved.

## Cleanup

- Removed obsolete inline pickup/chamber styles and animations, old forge layers, and unused Tiny Bat / Ancient Dragon styles.
- Removed 90 obsolete menu/guide CSS rule or selector groups.
- Removed duplicated, outdated creature and event lists from the guide.
- Removed unused weather, boss-fire and vault-particle asset constants and the unused event-name formatter.
- Replaced the old effect component names and their associated types, state names and event keys consistently.

## Validation

- Production build, ESLint, and Svelte/TypeScript checks pass.
- Compared 45,000 seeded rounds against the pre-edit generator across all risks, four bet values, all five creatures and all three launch styles. After one-to-one name mapping, every event value, seed, stage milestone, multiplier, ending and payout matched.
- Compared all 585 combinations of fixed development scenarios, risks, creatures and launch styles against the pre-edit versions.
- Browser checks covered desktop/mobile layout, dock order, creature selection, Archaeopteryx animation, night/snow customization, the existing time-to-Clear reset, the guide, locked active controls, a complete round and replay, without runtime exceptions.
- Rendered all five landscapes, five successful endings, four current effects, five pickups and both predator encounters, including reduced-motion presentation.

Bet handling, flight physics, result calculations, round sequencing, payout logic and active-control behavior are preserved. Validation fixtures and browser profiles were temporary and are not part of the app.
