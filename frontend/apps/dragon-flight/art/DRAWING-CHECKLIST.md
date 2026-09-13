# Dragon Flight drawing checklist

Audit date: 2026-09-12. These are gaps in the current game, not a request to redraw every existing image.

| Priority | Artwork | What to deliver | Current state |
| --- | --- | --- | --- |
| First | Playable Dragon | One character design; recommended 8–10-frame flying loop | Green CSS placeholder |
| First | Playable Firebird | One character design; recommended 8–10-frame flying loop | CSS placeholder |
| First | Playable Wyvern | One character design; recommended 8–10-frame flying loop | CSS placeholder |
| First | Ridge Dragon encounter | Distinct predator design; flying loop, with attack pose optional | Angular SVG placeholder; separate from playable Dragon |
| First | Mountain Raptor encounter | Distinct predator design; flying loop, with dive pose optional | Same SVG silhouette as Ridge Dragon, recolored |
| Already available | Pickups | Five transparent icons: feather, golden feather, green crystal, amber crystal, sky crystal | Painted WebP artwork integrated into the game |
| Optional | Creature portraits | One portrait per playable creature, five total | Existing birds reuse flight frames; others use placeholders |
| Optional | Landing and hit poses | One landed/rest pose and one hit pose per playable creature | Flight artwork is reused/rotated today |
| Already available | Azure Swift and Archaeopteryx | No new images required unless replacing their style | Nine and eight flight frames respectively |
| Already available | Backgrounds | No new images required | Nine scenes; weather/time grading handles combinations |
| Already available | Finish and result backgrounds | No new images required | Meadow, ridge and summit, each with day/night art; shared with results |
| Already available | Mountains and trees | No new images required | Six active terrain sprites, including snow variants; upper rocks reuse the lower mountain upside down |
| Already available | Menu and bonus cards | No new images required | Twelve customize images and two bonus illustrations |

## Delivery brief

- Playable creatures face right. For predators approaching from the right, a left-facing design is recommended.
- Use transparent backgrounds, consistent canvas dimensions, body scale and body pivot throughout each animation. Keep the entire wingspan inside the canvas with consistent padding.
- Draw a complete wing cycle that loops smoothly; 8–10 frames is a suggested initial budget, not a renderer requirement.
- Keep editable originals. Deliver transparent PNG masters if convenient; ship lossless WebP assets in the game. Do not bake weather, sky, labels or UI text into character/pickup art.
- A 1024-pixel-wide working canvas is a reasonable starting point; agree on the full wing envelope before drawing every frame. The existing frame crop/scale settings will need adjustment for new artwork.
- Day/night/weather versions of every creature are unnecessary: reuse the artwork and apply scene lighting.

The active normal demo only generates successful predator encounters. An encounter crash is currently a development scenario; attack-specific animation can wait until that behavior is finalized.

There are 67 shipped WebP files, of which 57 are currently referenced. Ten older terrain files remain unused; they are not missing drawing tasks.
