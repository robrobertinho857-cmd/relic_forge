export type SpinTimingProfile = {
	accelerationDuration: number;
	minimumSpinDuration: number;
	reelStopDelay: number;
	decelerationDuration: number;
	landingDuration: number;
	maximumVelocityCellsPerSecond: number;
	anticipationExtraDuration: number;
	freeSpinCadenceDelay: number;
};

export const NORMAL_SPIN: SpinTimingProfile = {
	accelerationDuration: 240,
	minimumSpinDuration: 650,
	reelStopDelay: 150,
	decelerationDuration: 165,
	landingDuration: 450,
	maximumVelocityCellsPerSecond: 17,
	anticipationExtraDuration: 600,
	freeSpinCadenceDelay: 900,
};

export const TURBO_SPIN: SpinTimingProfile = {
	accelerationDuration: 80,
	minimumSpinDuration: 120,
	reelStopDelay: 36,
	decelerationDuration: 65,
	landingDuration: 180,
	maximumVelocityCellsPerSecond: 25,
	anticipationExtraDuration: 180,
	freeSpinCadenceDelay: 300,
};

export const getSpinTiming = (turbo: boolean) => (turbo ? TURBO_SPIN : NORMAL_SPIN);

export const RELIC_WILD_PRESENTATION = {
	activationDuration: 720,
	combineDuration: 680,
} as const;
