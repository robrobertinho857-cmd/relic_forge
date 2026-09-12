import type {
	EncounterType,
	CurrentType,
	PickupType,
	HazardType,
	FlightEnding,
} from './types/flight';
import type { WinTier } from './types/presentation';

export const WIN_TIERS: readonly WinTier[] = [
	{ id: 'normal', label: 'RESULT', minimumMultiplier: 0, duration: 480 },
	{ id: 'win', label: 'WIN', minimumMultiplier: 2, duration: 650 },
	{ id: 'big', label: 'BIG WIN', minimumMultiplier: 10, duration: 820 },
	{ id: 'great', label: 'GREAT WIN', minimumMultiplier: 25, duration: 980 },
	{ id: 'record', label: 'OUTSTANDING WIN', minimumMultiplier: 50, duration: 1200 },
];

export const getWinTier = (multiplier: number): WinTier => {
	for (let index = WIN_TIERS.length - 1; index >= 0; index -= 1) {
		const tier = WIN_TIERS[index];
		if (tier && multiplier >= tier.minimumMultiplier) return tier;
	}

	return WIN_TIERS[0];
};

export const PICKUP_LABELS: Record<PickupType, string> = {
	feather: 'FEATHER',
	amberCrystal: 'AMBER CRYSTAL',
	greenCrystal: 'GREEN CRYSTAL',
	goldenFeather: 'GOLDEN FEATHER',
	skyCrystal: 'SKY CRYSTAL',
};

export const CURRENT_LABELS: Record<CurrentType, string> = {
	risingCurrent: 'RISING CURRENT',
	ridgeCurrent: 'RIDGE CURRENT',
	valleyCurrent: 'VALLEY CURRENT',
	crosswind: 'CROSSWIND',
};

export const ENCOUNTER_LABELS: Record<EncounterType, string> = {
	ridgeDragon: 'RIDGE DRAGON',
	mountainRaptor: 'MOUNTAIN RAPTOR',
};

export const HAZARD_LABELS: Record<HazardType, string> = {
	cliffGap: 'CLIFF GAP',
	rockfall: 'ROCKFALL',
	forestPass: 'FOREST PASS',
	lavaColumn: 'LAVA COLUMN',
	rockSpires: 'ROCK SPIRES',
	windPass: 'WIND PASS',
};

export const ENDING_LABELS: Record<FlightEnding, string> = {
	crash: 'CRASH',
	safeLanding: 'SAFE LANDING',
	meadowLanding: 'MEADOW LANDING',
	ridgeLanding: 'RIDGE LANDING',
	hiddenValley: 'HIDDEN VALLEY',
	summitLanding: 'SUMMIT LANDING',
};
