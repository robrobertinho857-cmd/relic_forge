import type { BossType, PortalType, RelicEventType } from './types';

export type WinTierId = 'normal' | 'win' | 'big' | 'epic' | 'mythic';

export type WinTier = {
	id: WinTierId;
	label: string;
	minimumMultiplier: number;
	duration: number;
};

export const WIN_TIERS: readonly WinTier[] = [
	{ id: 'normal', label: 'RESULT', minimumMultiplier: 0, duration: 480 },
	{ id: 'win', label: 'WIN', minimumMultiplier: 2, duration: 650 },
	{ id: 'big', label: 'BIG WIN', minimumMultiplier: 10, duration: 820 },
	{ id: 'epic', label: 'EPIC WIN', minimumMultiplier: 25, duration: 980 },
	{ id: 'mythic', label: 'MYTHIC WIN', minimumMultiplier: 50, duration: 1200 },
];

export const getWinTier = (multiplier: number): WinTier => {
	for (let index = WIN_TIERS.length - 1; index >= 0; index -= 1) {
		const tier = WIN_TIERS[index];
		if (tier && multiplier >= tier.minimumMultiplier) return tier;
	}

	return WIN_TIERS[0];
};

export const RELIC_LABELS: Record<RelicEventType, string> = {
	commonRelic: 'COMMON RELIC',
	fireRelic: 'FIRE RELIC',
	emeraldRelic: 'EMERALD RELIC',
	ancientRelic: 'ANCIENT RELIC',
	mythicRelic: 'MYTHIC RELIC',
};

export const PORTAL_LABELS: Record<PortalType, string> = {
	multiplierPortal: 'MULTIPLIER PORTAL',
	relicPortal: 'RELIC PORTAL',
	vaultPortal: 'VAULT PORTAL',
	chaosPortal: 'CHAOS PORTAL',
};

export const BOSS_LABELS: Record<BossType, string> = {
	ancientWyrm: 'ANCIENT WYRM',
	forgeGuardian: 'FORGE GUARDIAN',
};
