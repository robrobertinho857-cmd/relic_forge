import type { BossType, FlightEvent, PortalType, RelicEventType } from './flight';

export type WinTierId = 'normal' | 'win' | 'big' | 'epic' | 'mythic';

export type WinTier = {
	id: WinTierId;
	label: string;
	minimumMultiplier: number;
	duration: number;
};

export type StageAnnouncement = {
	id: number;
	name: string;
	order: number;
};

export type ActiveRelicPresentation = {
	relicType: RelicEventType;
	fromMultiplier: number;
	toMultiplier: number;
};

export type ActivePortalPresentation = {
	portalType: PortalType;
	phase: 'approach' | 'enter' | 'release';
	multiplier: number;
};

export type ActiveBossPresentation = {
	bossType: BossType;
	result: 'pass' | 'crash';
	phase: 'enter' | 'engage' | 'resolve';
};

export type WarningPresentation = {
	id: number;
	text: string;
	tone: 'danger' | 'portal' | 'vault';
};

export type ComboPresentation = {
	id: number;
	count: number;
};

export type ActiveGate = Extract<FlightEvent, { type: 'gate' }> & {
	x: number;
	width: number;
	gapCenterY: number;
	gapHeight: number;
};
