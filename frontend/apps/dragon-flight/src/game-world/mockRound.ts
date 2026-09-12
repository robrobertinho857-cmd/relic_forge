import type {
	CreatureId,
	FlightEnding,
	FlightEvent,
	FlightRisk,
	FlightRound,
	HazardType,
	LaunchStyle,
	CurrentType,
	PickupType,
} from './types';
import { createFlightStagePlan } from './stages';
import { roundToTwoDecimals } from './utils/number';

// This is deliberately local prototype behavior. Replace this module with an
// authoritative game result later without moving selection or presentation code.

type RiskProfile = {
	gateCount: [number, number];
	passChance: number;
	pickupChance: number;
	currentChance: number;
	encounterChance: number;
	pickupPool: PickupType[];
	currentPool: CurrentType[];
	hazardPool: HazardType[];
	pickupIncrements: number[];
	currentIncrements: number[];
	encounterIncrements: number[];
	rewardMultipliers: number[];
	endings: Exclude<FlightEnding, 'crash'>[];
};

const RISK_PROFILES: Record<FlightRisk, RiskProfile> = {
	safe: {
		gateCount: [2, 3],
		passChance: 0.86,
		pickupChance: 0.3,
		currentChance: 0.06,
		encounterChance: 0.015,
		pickupPool: ['feather', 'greenCrystal'],
		currentPool: ['valleyCurrent', 'ridgeCurrent'],
		hazardPool: ['cliffGap', 'forestPass', 'windPass'],
		pickupIncrements: [0.15, 0.25, 0.5],
		currentIncrements: [0.25, 0.5],
		encounterIncrements: [0.5, 1],
		rewardMultipliers: [1.25, 1.5, 1.75, 2.25],
		endings: ['safeLanding', 'meadowLanding'],
	},
	balanced: {
		gateCount: [3, 5],
		passChance: 0.72,
		pickupChance: 0.42,
		currentChance: 0.2,
		encounterChance: 0.1,
		pickupPool: ['feather', 'greenCrystal', 'goldenFeather'],
		currentPool: ['risingCurrent', 'ridgeCurrent', 'valleyCurrent'],
		hazardPool: ['cliffGap', 'rockfall', 'forestPass', 'rockSpires', 'windPass'],
		pickupIncrements: [0.5, 0.75, 1, 1.5],
		currentIncrements: [0.75, 1.25, 2],
		encounterIncrements: [1, 2, 3],
		rewardMultipliers: [1.5, 2, 2.5, 4],
		endings: ['safeLanding', 'meadowLanding', 'ridgeLanding'],
	},
	danger: {
		gateCount: [5, 7],
		passChance: 0.56,
		pickupChance: 0.36,
		currentChance: 0.34,
		encounterChance: 0.2,
		pickupPool: ['amberCrystal', 'goldenFeather', 'skyCrystal'],
		currentPool: ['risingCurrent', 'crosswind', 'ridgeCurrent', 'valleyCurrent'],
		hazardPool: ['rockfall', 'lavaColumn', 'rockSpires', 'windPass', 'cliffGap'],
		pickupIncrements: [1, 1.5, 2.5, 4],
		currentIncrements: [1.5, 3, 6],
		encounterIncrements: [3, 6, 12],
		rewardMultipliers: [2, 3, 5, 8],
		endings: ['ridgeLanding', 'hiddenValley', 'summitLanding'],
	},
};

const hashSeed = (risk: FlightRisk, bet: number, roundId: number) => {
	// Creature and launch style are intentionally excluded: they are presentation-only.
	const source = `${risk}:${bet}:${roundId}`;
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

export const generateMockRound = (
	bet: number,
	risk: FlightRisk,
	roundId: number,
	options: {
		creature: CreatureId;
		launchStyle: LaunchStyle;
	},
): FlightRound => {
	const seed = hashSeed(risk, bet, roundId);
	const random = createRandom(seed);
	const profile = RISK_PROFILES[risk];
	const gateCount =
		profile.gateCount[0] + Math.floor(random() * (profile.gateCount[1] - profile.gateCount[0] + 1));
	const events: FlightEvent[] = [{ type: 'launch', path: risk }];
	let currentMultiplier = 1;
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

		if (random() < profile.pickupChance) {
			const increment = pick(profile.pickupIncrements, random);
			currentMultiplier = roundToTwoDecimals(currentMultiplier + increment);
			events.push({
				type: 'pickup',
				pickupType: pick(profile.pickupPool, random),
				multiplier: currentMultiplier,
			});
		}

		if (random() < profile.currentChance) {
			const increment = pick(profile.currentIncrements, random);
			currentMultiplier = roundToTwoDecimals(currentMultiplier + increment);
			events.push({
				type: 'current',
				currentType: pick(profile.currentPool, random),
				multiplier: currentMultiplier,
			});
		}

		if (gate > 1 && random() < profile.encounterChance) {
			const increment = pick(profile.encounterIncrements, random);
			currentMultiplier = roundToTwoDecimals(currentMultiplier + increment);
			events.push({
				type: 'encounter',
				encounterType: pick(['ridgeDragon', 'mountainRaptor'], random),
				result: 'pass',
				multiplier: currentMultiplier,
			});
		}
	}

	let ending: FlightEnding = 'crash';
	if (!crashed) {
		ending = pick(profile.endings, random);
		const rewardMultiplier = pick(profile.rewardMultipliers, random);
		currentMultiplier = roundToTwoDecimals(Math.max(currentMultiplier, rewardMultiplier));
		events.push({ type: 'ending', ending, multiplier: currentMultiplier });
	}

	const finalMultiplier = crashed ? 0 : currentMultiplier;
	const finalWin = roundToTwoDecimals(bet * finalMultiplier);
	events.push({ type: 'finalWin', multiplier: finalMultiplier, win: finalWin });
	// Stage milestones are attached after the outcome and financial summary are final.
	const stagePlan = createFlightStagePlan(events, ending);

	return {
		id: roundId,
		seed,
		bet,
		risk,
		creature: options.creature,
		launchStyle: options.launchStyle,
		events,
		stagePlan,
		ending,
		finalMultiplier,
		finalWin,
	};
};
