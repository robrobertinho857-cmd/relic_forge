# Terrain and finish artwork

Eight assets generated with the built-in image_gen tool; see [the exact prompts](PROMPTS.md).

- `static/finishes/`: meadow, ridge and summit, each with a dedicated moonlit `-night` version.
- `static/terrain/`: original granite and bark materials, now superseded by [natural terrain sprites](../natural-terrain/README.md).

Safe and meadow landings and hidden valleys share the meadow scene. Ridge and summit endings have their own scenes. Snow weather selects the snowy summit terrain without changing the ending or payout. Night uses the moonlit asset; dawn, sunset and eclipse use lighting overlays. Weather overlays remain independent, supporting all 25 time/weather combinations.

The same finish image appears during the landing and behind the result panel. Image object-position and the landing animation share an anchor at 73% width and 68% height, keeping the ledge aligned even when narrow screens crop the image. Finish images preload when a successful local round starts.

TerrainObstacle now renders painted rock formations and pine trees with matching snowy variants. See the natural terrain documentation above. The finish artwork and landing behavior described here remain in use.
