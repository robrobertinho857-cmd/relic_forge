# Natural terrain artwork

The active assets are `rock-lower-rounded` (also flipped vertically for upper cliffs), `tree-upper`, and `tree-lower`, with their matching snow variants. Earlier unused rock variants have been removed from runtime assets. Generation prompts remain as historical records.

These replace the previous granite and bark polygon cutouts. Forest passes use pine trees; other hazards use weathered mountain rock. Snow weather and Sky Peaks use snowy artwork. Existing time and weather lighting still applies.

TerrainSprite scales to the available height at the artwork's natural aspect ratio. The sprite extends sideways beyond the gate anchor; its parent no longer clips those sides. Vertical display crops remove transparent padding at the free tip to keep the same flight opening. Each snow variant uses the corresponding base sprite's alpha silhouette, with a display-time alpha threshold to remove faint generated edge halos. Lossless WebP conversion preserves all visible pixels and alpha values.

New obstacles start far enough offscreen to contain their complete painted width. Opening sizes, movement speed, flight physics, round logic and payouts are unchanged.
