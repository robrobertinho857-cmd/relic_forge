import { createFlightStagePlan } from './stages';
import { roundToTwoDecimals } from './utils/number';
import type {
	CreatureId,
	FlightEnding,
	FlightEvent,
	FlightRisk,
	FlightRound,
	LaunchStyle,
} from './types';

export type DevScenarioId =
	| 'random'
	| 'earlyCrash'
	| 'midCrash'
	| 'safeLanding'
	| 'pickupRun'
	| 'crosswind'
	| 'encounterPass'
	| 'encounterCrash'
	| 'meadowLanding'
	| 'ridgeLanding'
	| 'hiddenValley'
	| 'summitLanding'
	| 'bigWin'
	| 'recordWin';

export type ForcedDevScenarioId = Exclude<DevScenarioId, 'random'>;

export const DEV_SCENARIOS: readonly { id: DevScenarioId; name: string }[] = [
	{ id: 'random', name: 'RANDOM' },
	{ id: 'earlyCrash', name: 'EARLY CRASH' },
	{ id: 'midCrash', name: 'MID CRASH' },
	{ id: 'safeLanding', name: 'SAFE LANDING' },
	{ id: 'pickupRun', name: 'PICKUP RUN' },
	{ id: 'crosswind', name: 'CROSSWIND' },
	{ id: 'encounterPass', name: 'ENCOUNTER PASS' },
	{ id: 'encounterCrash', name: 'ENCOUNTER CRASH' },
	{ id: 'meadowLanding', name: 'MEADOW LANDING' },
	{ id: 'ridgeLanding', name: 'RIDGE LANDING' },
	{ id: 'hiddenValley', name: 'HIDDEN VALLEY' },
	{ id: 'summitLanding', name: 'SUMMIT LANDING' },
	{ id: 'bigWin', name: 'BIG WIN' },
	{ id: 'recordWin', name: 'OUTSTANDING WIN' },
] as const;

type DevRoundSelections = {
	bet: number;
	risk: FlightRisk;
	roundId: number;
	creature: CreatureId;
	launchStyle: LaunchStyle;
};

type ScenarioBlueprint = {
	events: FlightEvent[];
	ending: FlightEnding;
	finalMultiplier: number;
};

const launch = (risk: FlightRisk): FlightEvent => ({ type: 'launch', path: risk });

const passGate = (
	gate: number,
	hazard: Extract<FlightEvent, { type: 'gate' }>['hazard'],
	gapRatio: number,
): FlightEvent => ({
	type: 'gate',
	gate,
	hazard,
	gapRatio,
	result: 'pass',
});

const crashGate = (
	gate: number,
	hazard: Extract<FlightEvent, { type: 'gate' }>['hazard'],
	gapRatio: number,
	crashSide: 'upper' | 'lower',
): FlightEvent => ({ type: 'gate', gate, hazard, gapRatio, result: 'crash', crashSide });

const successfulEnding = (
	ending: Exclude<FlightEnding, 'crash'>,
	multiplier: number,
): FlightEvent => ({ type: 'ending', ending, multiplier });

function createBlueprint(scenario: ForcedDevScenarioId, risk: FlightRisk): ScenarioBlueprint {
	switch (scenario) {
		case 'earlyCrash':
			return {
				events: [launch(risk), crashGate(1, 'cliffGap', 0.43, 'upper')],
				ending: 'crash',
				finalMultiplier: 0,
			};
		case 'midCrash':
			return {
				events: [
					launch(risk),
					passGate(1, 'windPass', 0.48),
					{ type: 'pickup', pickupType: 'goldenFeather', multiplier: 2 },
					crashGate(2, 'forestPass', 0.37, 'lower'),
				],
				ending: 'crash',
				finalMultiplier: 0,
			};
		case 'safeLanding':
			return {
				events: [
					launch(risk),
					passGate(1, 'windPass', 0.52),
					passGate(2, 'cliffGap', 0.46),
					successfulEnding('safeLanding', 1.5),
				],
				ending: 'safeLanding',
				finalMultiplier: 1.5,
			};
		case 'pickupRun':
			return {
				events: [
					launch(risk),
					passGate(1, 'cliffGap', 0.44),
					{ type: 'pickup', pickupType: 'feather', multiplier: 1.5 },
					passGate(2, 'forestPass', 0.55),
					{ type: 'pickup', pickupType: 'greenCrystal', multiplier: 3 },
					passGate(3, 'rockSpires', 0.39),
					{ type: 'pickup', pickupType: 'goldenFeather', multiplier: 6 },
					successfulEnding('meadowLanding', 8),
				],
				ending: 'meadowLanding',
				finalMultiplier: 8,
			};
		case 'crosswind':
			return {
				events: [
					launch(risk),
					passGate(1, 'rockfall', 0.48),
					{ type: 'current', currentType: 'crosswind', multiplier: 3 },
					passGate(2, 'lavaColumn', 0.42),
					{ type: 'pickup', pickupType: 'amberCrystal', multiplier: 5 },
					passGate(3, 'windPass', 0.56),
					successfulEnding('meadowLanding', 8),
				],
				ending: 'meadowLanding',
				finalMultiplier: 8,
			};
		case 'encounterPass':
			return {
				events: [
					launch(risk),
					passGate(1, 'cliffGap', 0.45),
					passGate(2, 'rockSpires', 0.52),
					{ type: 'encounter', encounterType: 'ridgeDragon', result: 'pass', multiplier: 6 },
					passGate(3, 'windPass', 0.41),
					successfulEnding('ridgeLanding', 14),
				],
				ending: 'ridgeLanding',
				finalMultiplier: 14,
			};
		case 'encounterCrash':
			return {
				events: [
					launch(risk),
					passGate(1, 'forestPass', 0.5),
					{ type: 'pickup', pickupType: 'feather', multiplier: 2 },
					passGate(2, 'rockfall', 0.43),
					{ type: 'encounter', encounterType: 'mountainRaptor', result: 'crash', multiplier: 4 },
				],
				ending: 'crash',
				finalMultiplier: 0,
			};
		case 'meadowLanding':
			return {
				events: [
					launch(risk),
					passGate(1, 'cliffGap', 0.46),
					passGate(2, 'rockfall', 0.52),
					{ type: 'pickup', pickupType: 'greenCrystal', multiplier: 3 },
					passGate(3, 'forestPass', 0.4),
					successfulEnding('meadowLanding', 8),
				],
				ending: 'meadowLanding',
				finalMultiplier: 8,
			};
		case 'ridgeLanding':
			return {
				events: [
					launch(risk),
					passGate(1, 'cliffGap', 0.45),
					{ type: 'pickup', pickupType: 'amberCrystal', multiplier: 2.5 },
					passGate(2, 'lavaColumn', 0.53),
					{ type: 'current', currentType: 'ridgeCurrent', multiplier: 6 },
					passGate(3, 'rockSpires', 0.39),
					passGate(4, 'windPass', 0.5),
					successfulEnding('ridgeLanding', 18),
				],
				ending: 'ridgeLanding',
				finalMultiplier: 18,
			};
		case 'hiddenValley':
			return {
				events: [
					launch(risk),
					passGate(1, 'cliffGap', 0.48),
					{ type: 'pickup', pickupType: 'greenCrystal', multiplier: 2 },
					passGate(2, 'rockfall', 0.43),
					{ type: 'current', currentType: 'valleyCurrent', multiplier: 7 },
					passGate(3, 'forestPass', 0.55),
					{ type: 'encounter', encounterType: 'ridgeDragon', result: 'pass', multiplier: 14 },
					passGate(4, 'lavaColumn', 0.4),
					{ type: 'pickup', pickupType: 'goldenFeather', multiplier: 22 },
					passGate(5, 'rockSpires', 0.5),
					successfulEnding('hiddenValley', 36),
				],
				ending: 'hiddenValley',
				finalMultiplier: 36,
			};
		case 'summitLanding':
			return {
				events: [
					launch(risk),
					passGate(1, 'cliffGap', 0.46),
					{ type: 'pickup', pickupType: 'amberCrystal', multiplier: 2 },
					passGate(2, 'rockfall', 0.52),
					{ type: 'current', currentType: 'crosswind', multiplier: 6 },
					passGate(3, 'forestPass', 0.39),
					{ type: 'pickup', pickupType: 'goldenFeather', multiplier: 12 },
					passGate(4, 'lavaColumn', 0.55),
					{ type: 'encounter', encounterType: 'ridgeDragon', result: 'pass', multiplier: 24 },
					passGate(5, 'rockSpires', 0.43),
					{ type: 'current', currentType: 'valleyCurrent', multiplier: 40 },
					passGate(6, 'windPass', 0.5),
					{ type: 'pickup', pickupType: 'skyCrystal', multiplier: 58 },
					successfulEnding('summitLanding', 72),
				],
				ending: 'summitLanding',
				finalMultiplier: 72,
			};
		case 'bigWin':
			return {
				events: [
					launch(risk),
					passGate(1, 'windPass', 0.47),
					{ type: 'pickup', pickupType: 'greenCrystal', multiplier: 4 },
					passGate(2, 'rockSpires', 0.52),
					{ type: 'current', currentType: 'risingCurrent', multiplier: 10 },
					passGate(3, 'lavaColumn', 0.41),
					successfulEnding('ridgeLanding', 18),
				],
				ending: 'ridgeLanding',
				finalMultiplier: 18,
			};
		case 'recordWin':
			return {
				events: [
					launch(risk),
					passGate(1, 'cliffGap', 0.45),
					{ type: 'pickup', pickupType: 'goldenFeather', multiplier: 8 },
					passGate(2, 'forestPass', 0.52),
					{ type: 'current', currentType: 'crosswind', multiplier: 20 },
					passGate(3, 'lavaColumn', 0.4),
					{ type: 'encounter', encounterType: 'mountainRaptor', result: 'pass', multiplier: 38 },
					passGate(4, 'rockSpires', 0.54),
					successfulEnding('summitLanding', 60),
				],
				ending: 'summitLanding',
				finalMultiplier: 60,
			};
	}
}

export function createDevFlightRound(
	scenario: ForcedDevScenarioId,
	selections: DevRoundSelections,
): FlightRound {
	const blueprint = createBlueprint(scenario, selections.risk);
	const finalWin = roundToTwoDecimals(selections.bet * blueprint.finalMultiplier);
	const events: FlightEvent[] = [
		...blueprint.events,
		{ type: 'finalWin', multiplier: blueprint.finalMultiplier, win: finalWin },
	];

	return {
		id: selections.roundId,
		seed: 900_000 + DEV_SCENARIOS.findIndex((option) => option.id === scenario),
		bet: selections.bet,
		risk: selections.risk,
		creature: selections.creature,
		launchStyle: selections.launchStyle,
		events,
		stagePlan: createFlightStagePlan(events, blueprint.ending),
		ending: blueprint.ending,
		finalMultiplier: blueprint.finalMultiplier,
		finalWin,
	};
}
