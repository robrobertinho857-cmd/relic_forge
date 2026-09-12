import type { EncounterType, FlightEvent, CurrentType, PickupType } from './flight';

export type WinTierId = 'normal' | 'win' | 'big' | 'great' | 'record';

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

export type ActivePickupPresentation = {
	pickupType: PickupType;
	fromMultiplier: number;
	toMultiplier: number;
};

export type ActiveCurrentPresentation = {
	currentType: CurrentType;
	phase: 'approach' | 'enter' | 'release';
	multiplier: number;
};

export type ActiveEncounterPresentation = {
	encounterType: EncounterType;
	result: 'pass' | 'crash';
	phase: 'enter' | 'engage' | 'resolve';
};

export type WarningPresentation = {
	id: number;
	text: string;
	tone: 'danger' | 'current' | 'reward';
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
