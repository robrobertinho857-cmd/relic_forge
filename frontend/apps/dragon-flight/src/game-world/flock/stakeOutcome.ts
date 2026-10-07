import type { FlightEnding } from '../types';
import {
	FLOCK_ORDER,
	type BirdRoundResult,
	type EliminationReason,
	type FlockOutcome,
} from './types';

const record = (value: unknown): Record<string, unknown> => {
	if (!value || typeof value !== 'object' || Array.isArray(value))
		throw new Error('Invalid flock book');
	return value as Record<string, unknown>;
};
const units = (value: unknown): number => {
	if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error('Invalid flock units');
	return value as number;
};
const reasons: readonly EliminationReason[] = ['terrain', 'wind', 'predator', 'hunter'];
const endings: readonly FlightEnding[] = [
	'crash',
	'safeLanding',
	'meadowLanding',
	'ridgeLanding',
	'hiddenValley',
	'summitLanding',
];

// Explicit v2 book envelope. Legacy array books remain legacy: never synthesize
// live survival data or a Champion bonus from a payout or client-side RNG.
export function readStakeFlock(value: unknown): { events: unknown[]; flock: FlockOutcome } {
	const state = record(value);
	if (state.schemaVersion !== 2 || !Array.isArray(state.events) || !Array.isArray(state.birds))
		throw new Error('Unsupported flock book version');
	const birds: BirdRoundResult[] = state.birds.map((value) => {
		const b = record(value);
		const bird = FLOCK_ORDER.find((id) => id === b.bird);
		if (!bird) throw new Error('Unknown flock bird');
		if (b.status === 'finish') return { bird, status: 'finish' };
		const reason = reasons.find((r) => r === b.eliminationReason);
		if (b.status !== 'eliminated' || !reason) throw new Error('Invalid flock status');
		return {
			bird,
			status: 'eliminated',
			eliminatedAtEventIndex: units(b.eliminatedAtEventIndex),
			eliminationReason: reason,
		};
	});
	let bonus: FlockOutcome['bonus'];
	if (state.bonus !== undefined) {
		const b = record(state.bonus);
		const ending = endings.find((e) => e === b.ending);
		if (b.bird !== 'archaeopteryx' || !ending) throw new Error('Invalid Champion bird');
		bonus = { bird: 'archaeopteryx', multiplier: units(b.multiplierUnits) / 100, ending };
	}
	if (typeof state.bonusTriggered !== 'boolean') throw new Error('Invalid Champion flag');
	return {
		events: state.events,
		flock: {
			version: 1,
			birds,
			survivors: units(state.survivors),
			baseMultiplier: units(state.baseMultiplierUnits) / 100,
			bonusTriggered: state.bonusTriggered,
			...(bonus ? { bonus } : {}),
		},
	};
}
