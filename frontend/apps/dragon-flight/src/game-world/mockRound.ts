import type {
	CreatureId,
	FlightEnding,
	FlightEvent,
	FlightRisk,
	FlightRound,
	HazardType,
	LaunchStyle,
	PortalType,
	RelicEventType,
	RelicType,
} from './types';
import { createFlightStagePlan } from './stages';

// This is deliberately local prototype behavior. Replace this module with an
// authoritative game result later without moving selection or presentation code.

type RiskProfile = {
	gateCount: [number, number];
	passChance: number;
	relicChance: number;
	portalChance: number;
	bossChance: number;
	shieldChance: number;
	relicPool: RelicEventType[];
	portalPool: PortalType[];
	hazardPool: HazardType[];
	relicIncrements: number[];
	portalIncrements: number[];
	bossIncrements: number[];
	vaultMultipliers: number[];
	endings: Exclude<FlightEnding, 'crash'>[];
};

type RelicProfile = {
	passAdjustment: number;
	relicAdjustment: number;
	portalAdjustment: number;
	bossAdjustment: number;
	shieldAdjustment: number;
	relicPool: RelicEventType[];
	portalPool: PortalType[];
	endingAdjustment: number;
	multiplierScale: number;
};

const RISK_PROFILES: Record<FlightRisk, RiskProfile> = {
	safe: {
		gateCount: [2, 3],
		passChance: 0.86,
		relicChance: 0.3,
		portalChance: 0.06,
		bossChance: 0.015,
		shieldChance: 0.12,
		relicPool: ['commonRelic', 'emeraldRelic'],
		portalPool: ['vaultPortal', 'relicPortal'],
		hazardPool: ['fireGate', 'chainTunnel', 'windTunnel'],
		relicIncrements: [0.15, 0.25, 0.5],
		portalIncrements: [0.25, 0.5],
		bossIncrements: [0.5, 1],
		vaultMultipliers: [1.25, 1.5, 1.75, 2.25],
		endings: ['safeLanding', 'forgeVault'],
	},
	balanced: {
		gateCount: [3, 5],
		passChance: 0.72,
		relicChance: 0.42,
		portalChance: 0.2,
		bossChance: 0.1,
		shieldChance: 0.08,
		relicPool: ['commonRelic', 'emeraldRelic', 'ancientRelic'],
		portalPool: ['multiplierPortal', 'relicPortal', 'vaultPortal'],
		hazardPool: ['fireGate', 'forgeHammer', 'chainTunnel', 'spikeGate', 'windTunnel'],
		relicIncrements: [0.5, 0.75, 1, 1.5],
		portalIncrements: [0.75, 1.25, 2],
		bossIncrements: [1, 2, 3],
		vaultMultipliers: [1.5, 2, 2.5, 4],
		endings: ['safeLanding', 'forgeVault', 'dragonVault'],
	},
	danger: {
		gateCount: [4, 6],
		passChance: 0.56,
		relicChance: 0.36,
		portalChance: 0.34,
		bossChance: 0.2,
		shieldChance: 0.04,
		relicPool: ['fireRelic', 'ancientRelic', 'mythicRelic'],
		portalPool: ['multiplierPortal', 'chaosPortal', 'relicPortal', 'vaultPortal'],
		hazardPool: ['forgeHammer', 'lavaColumn', 'spikeGate', 'windTunnel', 'fireGate'],
		relicIncrements: [1, 1.5, 2.5, 4],
		portalIncrements: [1.5, 3, 6],
		bossIncrements: [3, 6, 12],
		vaultMultipliers: [2, 3, 5, 8],
		endings: ['dragonVault', 'ancientVault', 'mythicRealm'],
	},
};

const RELIC_PROFILES: Record<RelicType, RelicProfile> = {
	guardian: {
		passAdjustment: 0.09,
		relicAdjustment: 0.08,
		portalAdjustment: -0.08,
		bossAdjustment: -0.08,
		shieldAdjustment: 0.26,
		relicPool: ['commonRelic', 'ancientRelic'],
		portalPool: ['vaultPortal', 'relicPortal'],
		endingAdjustment: -0.12,
		multiplierScale: 0.78,
	},
	fortune: {
		passAdjustment: 0.01,
		relicAdjustment: 0.17,
		portalAdjustment: 0.05,
		bossAdjustment: 0,
		shieldAdjustment: 0,
		relicPool: ['commonRelic', 'emeraldRelic', 'ancientRelic'],
		portalPool: ['relicPortal', 'vaultPortal', 'multiplierPortal'],
		endingAdjustment: 0.08,
		multiplierScale: 1,
	},
	chaos: {
		passAdjustment: -0.08,
		relicAdjustment: -0.04,
		portalAdjustment: 0.11,
		bossAdjustment: 0.14,
		shieldAdjustment: -0.02,
		relicPool: ['fireRelic', 'ancientRelic', 'mythicRelic'],
		portalPool: ['chaosPortal', 'multiplierPortal', 'relicPortal'],
		endingAdjustment: 0.12,
		multiplierScale: 1.4,
	},
};

const hashSeed = (risk: FlightRisk, relic: RelicType, bet: number, roundId: number) => {
	// Creature and launch style are intentionally excluded: they are presentation-only.
	const source = `${risk}:${relic}:${bet}:${roundId}`;
	let hash = 2166136261;

	for (let index = 0; index < source.length; index += 1) {
		hash ^= source.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
};

const createRandom = (seed: number) => {
	let value = seed || 1;
	return () => {
		value += 0x6d2b79f5;
		let next = value;
		next = Math.imul(next ^ (next >>> 15), next | 1);
		next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
		return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
	};
};

const pick = <T>(values: T[], random: () => number) =>
	values[Math.min(values.length - 1, Math.floor(random() * values.length))];

const clampProbability = (value: number) => Math.min(0.95, Math.max(0.01, value));
const roundMultiplier = (value: number) => Math.round(value * 100) / 100;
const roundAmount = (value: number) => Math.round(value * 100) / 100;

const mergeUnique = <T>(primary: T[], secondary: T[]) => [...new Set([...primary, ...secondary])];

const mergeRiskAndRelic = (risk: FlightRisk, relic: RelicType) => {
	const riskProfile = RISK_PROFILES[risk];
	const relicProfile = RELIC_PROFILES[relic];

	return {
		...riskProfile,
		passChance: clampProbability(riskProfile.passChance + relicProfile.passAdjustment),
		relicChance: clampProbability(riskProfile.relicChance + relicProfile.relicAdjustment),
		portalChance: clampProbability(riskProfile.portalChance + relicProfile.portalAdjustment),
		bossChance: clampProbability(riskProfile.bossChance + relicProfile.bossAdjustment),
		shieldChance: clampProbability(riskProfile.shieldChance + relicProfile.shieldAdjustment),
		relicPool: mergeUnique(riskProfile.relicPool, relicProfile.relicPool),
		portalPool: mergeUnique(riskProfile.portalPool, relicProfile.portalPool),
		endingAdjustment: relicProfile.endingAdjustment,
		multiplierScale: relicProfile.multiplierScale,
	};
};

export const generateMockRound = (
	bet: number,
	risk: FlightRisk,
	roundId: number,
	options: {
		creature: CreatureId;
		relic: RelicType;
		launchStyle: LaunchStyle;
	},
): FlightRound => {
	const seed = hashSeed(risk, options.relic, bet, roundId);
	const random = createRandom(seed);
	const profile = mergeRiskAndRelic(risk, options.relic);
	const gateCount = profile.gateCount[0] + Math.floor(random() * (profile.gateCount[1] - profile.gateCount[0] + 1));
	const events: FlightEvent[] = [{ type: 'launch', path: risk }];
	let currentMultiplier = 1;
	let collectedRelic = false;
	let crashed = false;

	for (let gate = 1; gate <= gateCount; gate += 1) {
		const passed = random() < profile.passChance;
		const gateEvent = {
			type: 'gate' as const,
			gate,
			hazard: pick(profile.hazardPool, random),
			gapRatio: 0.28 + random() * 0.44,
		};
		events.push(
			passed
				? { ...gateEvent, result: 'pass' }
				: { ...gateEvent, result: 'crash', crashSide: random() < 0.5 ? 'upper' : 'lower' },
		);

		if (!passed) {
			crashed = true;
			break;
		}

		if (random() < profile.relicChance) {
			const protectedRelic = options.relic === 'guardian' && random() < profile.shieldChance;
			const increment = pick(profile.relicIncrements, random) * profile.multiplierScale;
			currentMultiplier = roundMultiplier(currentMultiplier + increment);
			collectedRelic = true;
			events.push({
				type: 'relic',
				relicType: protectedRelic ? 'ancientRelic' : pick(profile.relicPool, random),
				multiplier: currentMultiplier,
				protected: protectedRelic,
			});
		}

		if (random() < profile.portalChance) {
			const increment = pick(profile.portalIncrements, random) * profile.multiplierScale;
			currentMultiplier = roundMultiplier(currentMultiplier + increment);
			events.push({
				type: 'portal',
				portalType: pick(profile.portalPool, random),
				multiplier: currentMultiplier,
			});
		}

		if (gate > 1 && random() < profile.bossChance) {
			const increment = pick(profile.bossIncrements, random) * profile.multiplierScale;
			currentMultiplier = roundMultiplier(currentMultiplier + increment);
			events.push({
				type: 'boss',
				bossType: options.relic === 'guardian' ? 'forgeGuardian' : pick(['ancientWyrm', 'forgeGuardian'], random),
				result: 'pass',
				multiplier: currentMultiplier,
			});
		}
	}

	let ending: FlightEnding = 'crash';
	if (!crashed) {
		const endingIndex = Math.min(
			profile.endings.length - 1,
			Math.floor(random() * profile.endings.length + profile.endingAdjustment),
		);
		ending = profile.endings[Math.max(0, endingIndex)];
		const vaultMultiplier = pick(profile.vaultMultipliers, random) * profile.multiplierScale;
		currentMultiplier = roundMultiplier(Math.max(currentMultiplier, vaultMultiplier));
		events.push({ type: 'ending', ending, multiplier: currentMultiplier });
	}

	const finalMultiplier = crashed && !collectedRelic ? 0 : currentMultiplier;
	const finalWin = roundAmount(bet * finalMultiplier);
	events.push({ type: 'finalWin', multiplier: finalMultiplier, win: finalWin });
	// Stage milestones are attached after the outcome and financial summary are final.
	const stagePlan = createFlightStagePlan(events, ending);

	return {
		id: roundId,
		seed,
		bet,
		risk,
		creature: options.creature,
		relic: options.relic,
		launchStyle: options.launchStyle,
		events,
		stagePlan,
		ending,
		finalMultiplier,
		finalWin,
	};
};
