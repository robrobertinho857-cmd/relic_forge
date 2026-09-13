# Runtime artwork format

All 67 raster assets in `static/` use lossless WebP, including backgrounds, finishes, menu illustrations, terrain masks, bird animation frames and pickups. SVG icons remain vector artwork.

Conversion with Sharp's lossless WebP encoder (effort 6) reduced the static artwork from 110,721,412 bytes to 71,576,016 bytes: 35.35% smaller. Dimensions, every alpha value, and every RGB value with nonzero alpha were compared after decoding. RGB values in fully transparent pixels do not affect appearance and were excluded from the comparison.

All runtime URLs and documentation links use `.webp`. Generation prompt records retain their original PNG filenames as historical inputs and outputs. Original source PNGs are backed up locally under `.svelte-kit/webp-originals/`, outside the deployed static assets. They are not part of the production build.

Per-file dimensions and before/after sizes for the original 62-file conversion are recorded in [webp-manifest.json](webp-manifest.json). The five later pickup assets use 256×256 runtime exports; their 1254×1254 WebP masters and generation prompts are in [pickups](pickups/README.md).
