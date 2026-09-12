# Natural terrain artwork

The active 1024 × 1536 PNG assets in `static/terrain/natural/` are upper and lower rock formations and pine trees, each with a matching snow variant. The upper cliff uses `rock-upper-sharp`; the lower mountain uses `rock-lower-rounded`. Both retain complete side contours. See [sharp upper cliff prompts](SHARP-UPPER-PROMPTS.md), [lower mountain prompts](UNCUT-PROMPTS.md) and [original tree and rock prompts](PROMPTS.md). Earlier rock PNGs are retained.

These replace the previous granite and bark polygon cutouts. Forest passes use pine trees; other hazards use weathered mountain rock. Snow weather and Sky Peaks use snowy artwork. Existing time and weather lighting still applies.

TerrainSprite scales to the available height at the artwork's natural aspect ratio. The sprite extends sideways beyond the gate anchor; its parent no longer clips those sides. Vertical display crops remove transparent padding at the free tip to keep the same flight opening. Each snow variant uses the corresponding base sprite's alpha silhouette, with a display-time alpha threshold to remove faint generated edge halos. Original PNG files remain unchanged.

New obstacles start far enough offscreen to contain their complete painted width. Opening sizes, movement speed, flight physics, round logic and payouts are unchanged.
