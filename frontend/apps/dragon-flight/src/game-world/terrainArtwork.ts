import { base } from '$app/paths';

export type TerrainMaterial = 'rock' | 'tree';
export type TerrainSide = 'upper' | 'lower';

// Display crops align the painted silhouette with the existing flight opening.
// Snow uses the same base silhouette, so weather cannot move the obstacle edge.
const CROPS = {
	'rock-upper': { top: 0, bottom: 1017 },
	'rock-lower': { top: 116, bottom: 1536 },
	'tree-upper': { top: 0, bottom: 1520 },
	'tree-lower': { top: 0, bottom: 1536 },
} as const;

export function getTerrainArtwork(material: TerrainMaterial, side: TerrainSide, snowy: boolean) {
	const name = `${material}-${side}` as const;
	const crop = CROPS[name];
	return {
		src: `${base}/terrain/natural/${name}${snowy ? '-snow' : ''}.png`,
		silhouette: `${base}/terrain/natural/${name}.png`,
		width: 1024,
		height: 1536,
		viewBox: `0 ${crop.top} 1024 ${crop.bottom - crop.top}`,
	};
}
