# Dragon Flight backgrounds

Nine matching mountain-valley backgrounds generated with the built-in image
generation tool. The clear-day image is the composition reference for every
variant. Artwork contains scenery only, with open space above the valley for
the flying creatures.

All images are PNG, 1672 x 941 pixels (approximately 16:9). Original generated
files are preserved without resizing. The game uses these images in
`src/game-world/components/Landscape.svelte`, selected by `backgrounds.ts`.

| Background | File |
| --- | --- |
| Clear day | [clear-day.png](../../static/backgrounds/generated/clear-day.png) |
| Dawn | [dawn.png](../../static/backgrounds/generated/dawn.png) |
| Sunset | [sunset.png](../../static/backgrounds/generated/sunset.png) |
| Night | [night.png](../../static/backgrounds/generated/night.png) |
| Eclipse | [eclipse.png](../../static/backgrounds/generated/eclipse.png) |
| Rain | [rain.png](../../static/backgrounds/generated/rain.png) |
| Storm | [storm.png](../../static/backgrounds/generated/storm.png) |
| Fog | [fog.png](../../static/backgrounds/generated/fog.png) |
| Snow | [snow.png](../../static/backgrounds/generated/snow.png) |

Clear day serves both the Day and Clear reference. Dawn, sunset, night and
eclipse use calm weather; rain, storm, fog and snow use daylight. These are nine
standalone backgrounds, not a complete set of all 25 time/weather combinations
or transparent weather overlays. The mountain-valley scenery is shared; these
are not stage-specific forest or volcanic backgrounds.

In the game, Clear uses the selected time image. Other weather choices use
their weather image with time-of-day lighting layered over it, allowing all
25 menu combinations without resetting either choice. Time lighting is skipped
for Clear to preserve the generated colors. Stage labels, obstacles and rewards
still follow the round; the shared background scene remains the mountain valley.
Images cover the flight area without stretching, with a centered crop and a
small bounded drift. A replacement is decoded before switching; rapid selection
changes cancel stale swaps. Reduced motion disables the drift and crossfade.

Full generation/edit prompts are recorded in [PROMPTS.md](PROMPTS.md).
