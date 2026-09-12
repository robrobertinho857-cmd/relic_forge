import type {
	BonusFlightId,
	CreatureId,
	FlightEvent,
	FlightRound,
	FlightStageId,
	HazardType,
	LaunchStyle,
} from './types';

export const BONUS_TICKETS = 10_000;
export type BonusFlight = {
	id: BonusFlightId;
	name: string;
	description: string;
	costMultiplier: number;
	gateCount: number;
	// Payout multipliers are relative to the base bet, not the entry cost.
	outcomes: readonly { multiplier: number; tickets: number }[];
};
export const BONUS_FLIGHTS: readonly BonusFlight[] = [
	{
		id: 'storm-run',
		name: 'Storm Run',
		description: 'Three gates through the storm. Ride the currents to a ridge landing.',
		costMultiplier: 20,
		gateCount: 3,
		outcomes: [
			{ multiplier: 0, tickets: 4000 },
			{ multiplier: 10, tickets: 3000 },
			{ multiplier: 30, tickets: 2000 },
			{ multiplier: 80, tickets: 900 },
			{ multiplier: 300, tickets: 100 },
		],
	},
	{
		id: 'summit-expedition',
		name: 'Summit Expedition',
		description:
			'Five gates from the forest to the snowy summit. A longer route with a wider payout range.',
		costMultiplier: 50,
		gateCount: 5,
		outcomes: [
			{ multiplier: 0, tickets: 5000 },
			{ multiplier: 20, tickets: 2500 },
			{ multiplier: 80, tickets: 1500 },
			{ multiplier: 200, tickets: 800 },
			{ multiplier: 600, tickets: 190 },
			{ multiplier: 3600, tickets: 10 },
		],
	},
];
export function getBonusFlight(id: BonusFlightId): BonusFlight {
	const feature = BONUS_FLIGHTS.find((item) => item.id === id);
	if (!feature) throw new RangeError('Unknown bonus flight');
	return feature;
}
export function bonusEntryCost(bet: number, id: BonusFlightId): number {
	if (
		!Number.isFinite(bet) ||
		bet < 0.1 ||
		bet > 100 ||
		Math.abs(bet * 100 - Math.round(bet * 100)) > 1e-6
	)
		throw new RangeError('Invalid base bet');
	return (Math.round(bet * 100) * getBonusFlight(id).costMultiplier) / 100;
}
export function drawBonusTicket(): number {
	// Local demo only. Rejection sampling avoids modulo bias; production must use authoritative results.
	const limit = Math.floor(2 ** 32 / BONUS_TICKETS) * BONUS_TICKETS;
	const values = new Uint32Array(1);
	do {
		globalThis.crypto.getRandomValues(values);
	} while (values[0] >= limit);
	return values[0] % BONUS_TICKETS;
}
export function createBonusRound(
	id: BonusFlightId,
	bet: number,
	roundId: number,
	ticket: number,
	options: { creature: CreatureId; launchStyle: LaunchStyle },
): FlightRound {
	const feature = getBonusFlight(id);
	const entryCost = bonusEntryCost(bet, id);
	if (!Number.isInteger(ticket) || ticket < 0 || ticket >= BONUS_TICKETS)
		throw new RangeError('Invalid bonus ticket');
	let remaining = ticket;
	const outcome = feature.outcomes.find((item) => {
		remaining -= item.tickets;
		return remaining < 0;
	});
	if (!outcome) throw new Error('Incomplete bonus distribution');
	const won = outcome.multiplier > 0;
	const storm = id === 'storm-run';
	const events: FlightEvent[] = [{ type: 'launch', path: 'danger' }];
	const stagePlan: FlightRound['stagePlan'] = [];
	const stages: FlightStageId[] = storm
		? ['STORM_HIGHLANDS', 'STORM_HIGHLANDS', 'SKY_PEAKS']
		: ['MOUNTAIN_VALLEY', 'FOREST_GORGE', 'STORM_HIGHLANDS', 'SKY_PEAKS', 'SKY_PEAKS'];
	const hazards: HazardType[] = storm
		? ['windPass', 'cliffGap', 'windPass']
		: ['cliffGap', 'forestPass', 'windPass', 'rockSpires', 'cliffGap'];
	for (let gate = 1; gate <= feature.gateCount; gate += 1) {
		stagePlan.push({ stage: stages[gate - 1], eventIndex: gate === 1 ? 0 : events.length });
		const gateBase = {
			type: 'gate' as const,
			gate,
			hazard: hazards[gate - 1],
			gapRatio: [0.48, 0.44, 0.5, 0.46, 0.5][gate - 1],
		};
		if (!won && gate === feature.gateCount) {
			events.push({ ...gateBase, result: 'crash', crashSide: ticket % 2 ? 'upper' : 'lower' });
			break;
		}
		events.push({ ...gateBase, result: 'pass' });
		// Zero outcomes show no provisional reward that could be confused with a banked win.
		if (won) {
			const multiplier = Math.round(((outcome.multiplier * gate) / feature.gateCount) * 100) / 100;
			events.push(
				storm
					? { type: 'current', currentType: 'risingCurrent', multiplier }
					: { type: 'pickup', pickupType: 'skyCrystal', multiplier },
			);
		}
	}
	const ending = won ? (storm ? 'ridgeLanding' : 'summitLanding') : 'crash';
	if (won)
		events.push({
			type: 'ending',
			ending: storm ? 'ridgeLanding' : 'summitLanding',
			multiplier: outcome.multiplier,
		});
	const finalWin = (Math.round(bet * 100) * outcome.multiplier) / 100;
	events.push({ type: 'finalWin', multiplier: outcome.multiplier, win: finalWin });
	return {
		id: roundId,
		seed: ticket,
		bet,
		risk: 'danger',
		...options,
		bonusFlight: id,
		entryCost,
		weather: storm ? 'storm' : 'snow',
		timeOfDay: storm ? 'day' : 'dawn',
		events,
		stagePlan,
		ending,
		finalMultiplier: outcome.multiplier,
		finalWin,
	};
}
