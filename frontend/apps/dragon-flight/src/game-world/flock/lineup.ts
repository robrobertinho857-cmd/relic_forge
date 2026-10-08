import type { CreatureId, FlightRound } from '../types';
import { FLOCK_ORDER, type FlockLineup } from './types';

// Slot identities belong to the authored outcome. Species are cosmetic and may repeat.
export function copyLineup(value: unknown): FlockLineup {
	const ids =
		Array.isArray(value) && value.length === 4 && value.every((id) => FLOCK_ORDER.includes(id))
			? value
			: FLOCK_ORDER;
	return [ids[0], ids[1], ids[2], ids[3]];
}
export function setLineupBird(lineup: FlockLineup, slot: number, species: CreatureId): FlockLineup {
	const next = copyLineup(lineup);
	if (Number.isInteger(slot) && slot >= 0 && slot < 4 && FLOCK_ORDER.includes(species))
		next[slot] = species;
	return next;
}
export function attachLineup(
	round: FlightRound,
	lineup: FlockLineup,
	replay: boolean,
): FlightRound {
	if (!round.flock || replay) return round;
	return { ...round, lineup: copyLineup(round.lineup ?? lineup) };
}
