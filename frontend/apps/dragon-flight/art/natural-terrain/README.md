# Natural terrain artwork

Eight 1024 × 1536 PNG assets generated with the built-in image generation tool live in `static/terrain/natural/`: upper and lower rock formations and pine trees, each with a matching snow variant. See [exact prompts](PROMPTS.md).

These replace the previous granite and bark polygon cutouts. Forest passes use pine trees; other hazards use weathered mountain rock. Snow weather and Sky Peaks use snowy artwork. Existing time and weather lighting still applies.

TerrainSprite uses SVG display crops and uniform scaling, keeping the free edge aligned with the existing flight opening. Each snow variant uses the corresponding base sprite's alpha silhouette, with a display-time alpha threshold to remove faint generated edge halos. Original PNG files remain unchanged.

Obstacle positions, opening sizes, movement, flight physics, round logic and payouts are unchanged.
