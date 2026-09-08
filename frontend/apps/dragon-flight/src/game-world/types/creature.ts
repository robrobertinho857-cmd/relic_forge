export type CreatureId = 'firebird' | 'wyvern' | 'dragon' | 'azure-swift' | 'archaeopteryx';

export type CreatureAssets = {
	portrait?: string;
	flight?: string;
	result?: string;
};

export type CreatureFlightAnimation = {
	frames: readonly string[];
	frameOrder: readonly number[];
	fps: number;
};

export type CreatureProfile = {
	id: CreatureId;
	name: string;
	className: string;
	assets?: CreatureAssets;
	flightAnimation?: CreatureFlightAnimation;
	sizeScale: number;
	agility: number;
	damping: number;
	maxVerticalSpeed: number;
	rotationDivisor: number;
	rotationLimit: number;
	flapDuration: number;
	hoverDuration: number;
	hoverLift: number;
	description: string;
};
