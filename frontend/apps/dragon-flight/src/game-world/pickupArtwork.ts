import { base } from '$app/paths';
import type { PickupType } from './types';

export const PICKUP_ARTWORK: Record<PickupType, string> = {
	feather: `${base}/pickups/feather.webp`,
	goldenFeather: `${base}/pickups/golden-feather.webp`,
	greenCrystal: `${base}/pickups/green-crystal.webp`,
	amberCrystal: `${base}/pickups/amber-crystal.webp`,
	skyCrystal: `${base}/pickups/sky-crystal.webp`,
};
