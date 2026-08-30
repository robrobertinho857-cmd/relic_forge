import { createFlightStagePlan } from './stages';
import type {
	CreatureId,
	FlightEnding,
	FlightEvent,
	FlightRisk,
	FlightRound,
	LaunchStyle,
	RelicType,
} from './types';

export type DevScenarioId =
	| 'random'
	| 'earlyCrash'
	| 'midCrash'
	| 'safeLanding'
	| 'relicRun'
	| 'chaosPortal'
	| 'bossPass'
	| 'bossCrash'
	| 'forgeVault'
	| 'dragonVault'
	| 'ancientVault'
	| 'mythicRealm'
	| 'bigWin'
	| 'mythicWin';

export type ForcedDevScenarioId = Exclude<DevScenarioId, 'random'>;

export const DEV_SCENARIOS: readonly { id: DevScenarioId; name: string }[] = [
	{ id: 'random', name: 'RANDOM' },
	{ id: 'earlyCrash', name: 'EARLY CRASH' },
	{ id: 'midCrash', name: 'MID CRASH' },
	{ id: 'safeLanding', name: 'SAFE LANDING' },
	{ id: 'relicRun', name: 'RELIC RUN' },
	{ id: 'chaosPortal', name: 'CHAOS PORTAL' },
	{ id: 'bossPass', name: 'BOSS PASS' },
	{ id: 'bossCrash', name: 'BOSS CRASH' },
	{ id: 'forgeVault', name: 'FORGE VAULT' },
	{ id: 'dragonVault', name: 'DRAGON VAULT' },
	{ id: 'ancientVault', name: 'ANCIENT VAULT' },
	{ id: 'mythicRealm', name: 'MYTHIC REALM' },
	{ id: 'bigWin', name: 'BIG WIN' },
	{ id: 'mythicWin', name: 'MYTHIC WIN' },
] as const;

type DevRoundSelections = {
	bet: number;
	risk: FlightRisk;
	roundId: number;
	creature: CreatureId;
	relic: RelicType;
	launchStyle: LaunchStyle;
};

type ScenarioBlueprint = {
	events: FlightEvent[];
	ending: FlightEnding;
	finalMultiplier: number;
};

const launch = (risk: FlightRisk): FlightEvent => ({ type: 'launch', path: risk });

const passGate = (gate: number, hazard: Extract<FlightEvent, { type: 'gate' }>['hazard'], gapRatio: number): FlightEvent => ({
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
				events: [launch(risk), crashGate(1, 'fireGate', 0.43, 'upper')],
				ending: 'crash',
				finalMultiplier: 0,
			};
		case 'midCrash':
			return {
				events: [
					launch(risk),
					passGate(1, 'windTunnel', 0.48),
					{ type: 'relic', relicType: 'ancientRelic', multiplier: 2 },
					crashGate(2, 'chainTunnel', 0.37, 'lower'),
				],
				ending: 'crash',
				finalMultiplier: 0,
			};
		case 'safeLanding':
			return {
				events: [
					launch(risk),
					passGate(1, 'windTunnel', 0.52),
					passGate(2, 'fireGate', 0.46),
					successfulEnding('safeLanding', 1.5),
				],
				ending: 'safeLanding',
				finalMultiplier: 1.5,
			};
		case 'relicRun':
			return {
				events: [
					launch(risk),
					passGate(1, 'fireGate', 0.44),
					{ type: 'relic', relicType: 'commonRelic', multiplier: 1.5 },
					passGate(2, 'chainTunnel', 0.55),
					{ type: 'relic', relicType: 'emeraldRelic', multiplier: 3 },
					passGate(3, 'spikeGate', 0.39),
					{ type: 'relic', relicType: 'ancientRelic', multiplier: 6 },
					successfulEnding('forgeVault', 8),
				],
				ending: 'forgeVault',
				finalMultiplier: 8,
			};
		case 'chaosPortal':
			return {
				events: [
					launch(risk),
					passGate(1, 'forgeHammer', 0.48),
					{ type: 'portal', portalType: 'chaosPortal', multiplier: 3 },
					passGate(2, 'lavaColumn', 0.42),
					{ type: 'relic', relicType: 'fireRelic', multiplier: 5 },
					passGate(3, 'windTunnel', 0.56),
					successfulEnding('forgeVault', 8),
				],
				ending: 'forgeVault',
				finalMultiplier: 8,
			};
		case 'bossPass':
			return {
				events: [
					launch(risk),
					passGate(1, 'fireGate', 0.45),
					passGate(2, 'spikeGate', 0.52),
					{ type: 'boss', bossType: 'ancientWyrm', result: 'pass', multiplier: 6 },
					passGate(3, 'windTunnel', 0.41),
					successfulEnding('dragonVault', 14),
				],
				ending: 'dragonVault',
				finalMultiplier: 14,
			};
		case 'bossCrash':
			return {
				events: [
					launch(risk),
					passGate(1, 'chainTunnel', 0.5),
					{ type: 'relic', relicType: 'commonRelic', multiplier: 2 },
					passGate(2, 'forgeHammer', 0.43),
					{ type: 'boss', bossType: 'forgeGuardian', result: 'crash', multiplier: 4 },
				],
				ending: 'crash',
				finalMultiplier: 0,
			};
		case 'forgeVault':
			return {
				events: [
					launch(risk),
					passGate(1, 'fireGate', 0.46),
					passGate(2, 'forgeHammer', 0.52),
					{ type: 'relic', relicType: 'emeraldRelic', multiplier: 3 },
					passGate(3, 'chainTunnel', 0.4),
					successfulEnding('forgeVault', 8),
				],
				ending: 'forgeVault',
				finalMultiplier: 8,
			};
		case 'dragonVault':
			return {
				events: [
					launch(risk),
					passGate(1, 'fireGate', 0.45),
					{ type: 'relic', relicType: 'fireRelic', multiplier: 2.5 },
					passGate(2, 'lavaColumn', 0.53),
					{ type: 'portal', portalType: 'relicPortal', multiplier: 6 },
					passGate(3, 'spikeGate', 0.39),
					passGate(4, 'windTunnel', 0.5),
					successfulEnding('dragonVault', 18),
				],
				ending: 'dragonVault',
				finalMultiplier: 18,
			};
		case 'ancientVault':
			return {
				events: [
					launch(risk),
					passGate(1, 'fireGate', 0.48),
					{ type: 'relic', relicType: 'emeraldRelic', multiplier: 2 },
					passGate(2, 'forgeHammer', 0.43),
					{ type: 'portal', portalType: 'vaultPortal', multiplier: 7 },
					passGate(3, 'chainTunnel', 0.55),
					{ type: 'boss', bossType: 'ancientWyrm', result: 'pass', multiplier: 14 },
					passGate(4, 'lavaColumn', 0.4),
					{ type: 'relic', relicType: 'ancientRelic', multiplier: 22 },
					passGate(5, 'spikeGate', 0.5),
					successfulEnding('ancientVault', 36),
				],
				ending: 'ancientVault',
				finalMultiplier: 36,
			};
		case 'mythicRealm':
			return {
				events: [
					launch(risk),
					passGate(1, 'fireGate', 0.46),
					{ type: 'relic', relicType: 'fireRelic', multiplier: 2 },
					passGate(2, 'forgeHammer', 0.52),
					{ type: 'portal', portalType: 'chaosPortal', multiplier: 6 },
					passGate(3, 'chainTunnel', 0.39),
					{ type: 'relic', relicType: 'ancientRelic', multiplier: 12 },
					passGate(4, 'lavaColumn', 0.55),
					{ type: 'boss', bossType: 'ancientWyrm', result: 'pass', multiplier: 24 },
					passGate(5, 'spikeGate', 0.43),
					{ type: 'portal', portalType: 'vaultPortal', multiplier: 40 },
					passGate(6, 'windTunnel', 0.5),
					{ type: 'relic', relicType: 'mythicRelic', multiplier: 58 },
					successfulEnding('mythicRealm', 72),
				],
				ending: 'mythicRealm',
				finalMultiplier: 72,
			};
		case 'bigWin':
			return {
				events: [
					launch(risk),
					passGate(1, 'windTunnel', 0.47),
					{ type: 'relic', relicType: 'emeraldRelic', multiplier: 4 },
					passGate(2, 'spikeGate', 0.52),
					{ type: 'portal', portalType: 'multiplierPortal', multiplier: 10 },
					passGate(3, 'lavaColumn', 0.41),
					successfulEnding('dragonVault', 18),
				],
				ending: 'dragonVault',
				finalMultiplier: 18,
			};
		case 'mythicWin':
			return {
				events: [
					launch(risk),
					passGate(1, 'fireGate', 0.45),
					{ type: 'relic', relicType: 'ancientRelic', multiplier: 8 },
					passGate(2, 'chainTunnel', 0.52),
					{ type: 'portal', portalType: 'chaosPortal', multiplier: 20 },
					passGate(3, 'lavaColumn', 0.4),
					{ type: 'boss', bossType: 'forgeGuardian', result: 'pass', multiplier: 38 },
					passGate(4, 'spikeGate', 0.54),
					successfulEnding('mythicRealm', 60),
				],
				ending: 'mythicRealm',
				finalMultiplier: 60,
			};
	}
}

const roundAmount = (value: number) => Math.round(value * 100) / 100;

export function createDevFlightRound(
	scenario: ForcedDevScenarioId,
	selections: DevRoundSelections,
): FlightRound {
	const blueprint = createBlueprint(scenario, selections.risk);
	const finalWin = roundAmount(selections.bet * blueprint.finalMultiplier);
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
		relic: selections.relic,
		launchStyle: selections.launchStyle,
		events,
		stagePlan: createFlightStagePlan(events, blueprint.ending),
		ending: blueprint.ending,
		finalMultiplier: blueprint.finalMultiplier,
		finalWin,
	};
}
