import type { FlightRisk, LaunchStyle, WorldBounds } from './types';

export const MIN_PROTOTYPE_BET = 0.1;
export const MAX_PROTOTYPE_BET = 100;
export const PROTOTYPE_BET_STEP = 0.1;

export const INITIAL_BOUNDS: WorldBounds = {
	width: 900,
	height: 520,
	floorY: 478,
};

export const WORLD_SPEED = 285;

export const PATHS: readonly { risk: FlightRisk; note: string }[] = [
	{ risk: 'safe', note: 'Lower volatility · shorter flights · smaller potential' },
	{ risk: 'balanced', note: 'Medium volatility · balanced survival and reward' },
	{ risk: 'danger', note: 'High volatility · longer potential flights · larger rewards' },
];

export const LAUNCH_OPTIONS: readonly { id: LaunchStyle; name: string; note: string }[] = [
	{ id: 'glide', name: 'GLIDE', note: 'Smooth horizontal launch' },
	{ id: 'boost', name: 'BOOST', note: 'Dramatic upward launch' },
	{ id: 'dive', name: 'DIVE', note: 'High start with a diving entry' },
];
