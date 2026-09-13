import { base } from '$app/paths';

export type TerrainMaterial = 'rock' | 'tree';
export type TerrainSide = 'upper' | 'lower';

// Display crops align the painted silhouette with the existing flight opening.
// Snow uses the same base silhouette, so weather cannot move the obstacle edge.
const CROPS = {
	'rock-upper': { top: 109, bottom: 1536 },
	'rock-lower': { top: 109, bottom: 1536 },
	'tree-upper': { top: 0, bottom: 1520 },
	'tree-lower': { top: 0, bottom: 1536 },
} as const;

export function getTerrainVisualWidth(
	material: TerrainMaterial,
	upperHeight: number,
	lowerHeight: number,
) {
	const upper = CROPS[`${material}-upper`];
	const lower = CROPS[`${material}-lower`];
	return Math.max(
		0,
		(upperHeight * 1024) / (upper.bottom - upper.top),
		(lowerHeight * 1024) / (lower.bottom - lower.top),
	);
}

export function getTerrainArtwork(material: TerrainMaterial, side: TerrainSide, snowy: boolean) {
	const name = `${material}-${side}` as const;
	const crop = CROPS[name];
	// Reuse the lower mountain for a matching, rounded upper overhang.
	const assetName = material === 'rock' ? 'rock-lower-rounded' : name;
	return {
		flipVertical: material === 'rock' && side === 'upper',
		src: `${base}/terrain/natural/${assetName}${snowy ? '-snow' : ''}.webp`,
		silhouette: `${base}/terrain/natural/${assetName}.webp`,
		width: 1024,
		height: 1536,
		cropHeight: crop.bottom - crop.top,
		viewBox: `0 ${crop.top} 1024 ${crop.bottom - crop.top}`,
	};
}
