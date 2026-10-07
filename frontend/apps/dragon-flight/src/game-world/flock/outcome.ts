import type { FlightEvent, FlightRound } from '../types';
import { FLOCK_ORDER, type BirdRoundResult, type FlockOutcome } from './types';
import { createFlightStagePlan } from '../stages';

// This adapter is DEMO ONLY. It partitions an already-calibrated payout; it never
// changes that payout, its probability, or the single entry cost. RGS never calls it.
export function createDemoFlock(round: FlightRound): FlightRound {
	let state = round.seed ^ 0x46504c4b;
	const draw = () => {
		state = Math.imul(state ^ (state >>> 16), 0x45d9f3b);
		return (state >>> 0) / 4294967296;
	};
	const survivors =
		round.finalMultiplier === 0
			? 0
			: round.finalMultiplier >= 3 && draw() < 0.14
				? 4
				: 1 + Math.floor(draw() * 3);
	const finished = [...FLOCK_ORDER];
	for (let i = finished.length - 1; i > 0; i--) {
		const j = Math.floor(draw() * (i + 1));
		[finished[i], finished[j]] = [finished[j], finished[i]];
	}
	const lost = finished.slice(survivors);
	const events: FlightEvent[] = [];
	const birds: BirdRoundResult[] = FLOCK_ORDER.filter((id) => !lost.includes(id)).map((bird) => ({
		bird,
		status: 'finish',
	}));
	const gates = round.events.filter((event) => event.type === 'gate').length;
	let gateCursor = 0;
	for (const event of round.events) {
		if (event.type === 'finalWin' || event.type === 'ending') continue;
		if (event.type === 'gate') {
			events.push({
				type: 'gate',
				gate: event.gate,
				hazard: event.hazard,
				gapRatio: event.gapRatio,
				result: 'pass',
			});
			const quota = Math.ceil((++gateCursor * lost.length) / Math.max(1, gates));
			while (birds.filter((bird) => bird.status === 'eliminated').length < quota) {
				const id = lost[birds.filter((bird) => bird.status === 'eliminated').length];
				const reason = 'hunter';
				birds.push({
					bird: id,
					status: 'eliminated',
					eliminatedAtEventIndex: events.length,
					eliminationReason: reason,
				});
				events.push({ type: 'elimination', bird: id, reason });
			}
		} else if (event.type === 'encounter' && event.result === 'crash') {
			// Individual eliminations reveal the loss; never run a full-flock fatal fight.
			events.push({ type: 'current', currentType: 'crosswind', multiplier: event.multiplier });
		} else events.push(event);
		if (birds.filter((bird) => bird.status === 'eliminated').length === 4) break;
	}
	const bonusTriggered = survivors === 4;
	const bonusLost = bonusTriggered && draw() < 0.2;
	const baseMultiplier =
		bonusTriggered && !bonusLost
			? Math.round(round.finalMultiplier * 60) / 100
			: round.finalMultiplier;
	const bonusMultiplier = Math.round((round.finalMultiplier - baseMultiplier) * 100) / 100;
	if (bonusTriggered && !bonusLost) {
		for (let i = 0; i < events.length; i++) {
			const e = events[i];
			if (e.type === 'pickup' || e.type === 'current' || e.type === 'encounter')
				events[i] = {
					...e,
					multiplier: Math.min(baseMultiplier, Math.round(e.multiplier * 60) / 100),
				};
		}
	}
	if (survivors > 0)
		events.push({
			type: 'ending',
			ending: round.ending === 'crash' ? 'ridgeLanding' : round.ending,
			multiplier: baseMultiplier,
		});
	if (bonusTriggered) {
		events.push(
			{ type: 'championFlight', multiplier: baseMultiplier },
			{
				type: 'current',
				currentType: 'risingCurrent',
				multiplier: Math.round((baseMultiplier + bonusMultiplier / 3) * 100) / 100,
			},
			{ type: 'gate', gate: gates + 1, hazard: 'windPass', gapRatio: 0.42, result: 'pass' },
			{
				type: 'encounter',
				encounterType: 'ridgeDragon',
				result: bonusLost ? 'crash' : 'pass',
				multiplier: round.finalMultiplier,
			},
		);
		if (!bonusLost)
			events.push({ type: 'ending', ending: 'summitLanding', multiplier: round.finalMultiplier });
	}
	events.push({ type: 'finalWin', multiplier: round.finalMultiplier, win: round.finalWin });
	const flock: FlockOutcome = {
		version: 1,
		birds: FLOCK_ORDER.map((id) => birds.find((bird) => bird.bird === id)!),
		survivors,
		baseMultiplier,
		bonusTriggered,
		...(bonusTriggered
			? {
					bonus: {
						bird: 'archaeopteryx' as const,
						multiplier: bonusMultiplier,
						ending: bonusLost ? ('crash' as const) : ('summitLanding' as const),
					},
				}
			: {}),
	};
	const result = {
		...round,
		creature: 'archaeopteryx' as const,
		flock,
		events,
		stagePlan: createFlightStagePlan(events, round.ending),
		ending: bonusTriggered
			? bonusLost
				? ('crash' as const)
				: ('summitLanding' as const)
			: round.ending,
	};
	validateFlock(result);
	return result;
}

export function validateFlock(round: FlightRound): void {
	const flock = round.flock;
	if (
		!flock ||
		flock.version !== 1 ||
		flock.birds.length !== 4 ||
		new Set(flock.birds.map((b) => b.bird)).size !== 4 ||
		!FLOCK_ORDER.every((id) => flock.birds.some((b) => b.bird === id))
	)
		throw new Error('Invalid four-bird outcome');
	if (
		flock.survivors !== flock.birds.filter((b) => b.status === 'finish').length ||
		flock.bonusTriggered !== (flock.survivors === 4) ||
		flock.bonusTriggered !== Boolean(flock.bonus)
	)
		throw new Error('Invalid Champion trigger');
	if (
		![flock.baseMultiplier, flock.bonus?.multiplier ?? 0].every(
			(v) => Number.isFinite(v) && v >= 0,
		) ||
		Math.abs(flock.baseMultiplier + (flock.bonus?.multiplier ?? 0) - round.finalMultiplier) > 1e-8
	)
		throw new Error('Inconsistent flock payout');
	const championIndex = round.events.findIndex((e) => e.type === 'championFlight');
	if (
		championIndex >= 0 !== flock.bonusTriggered ||
		round.events.filter((e) => e.type === 'championFlight').length > 1
	)
		throw new Error('Invalid Champion sequence');
	for (const bird of flock.birds) {
		const eliminations = round.events.flatMap((e, index) =>
			e.type === 'elimination' && e.bird === bird.bird ? [index] : [],
		);
		if (bird.status === 'finish') {
			if (eliminations.length) throw new Error('Finished bird eliminated');
		} else {
			const e = round.events[bird.eliminatedAtEventIndex];
			if (
				eliminations.length !== 1 ||
				e?.type !== 'elimination' ||
				e.bird !== bird.bird ||
				e.reason !== bird.eliminationReason ||
				(championIndex >= 0 && bird.eliminatedAtEventIndex >= championIndex)
			)
				throw new Error('Invalid elimination schedule');
		}
	}
	if (!flock.survivors && round.finalMultiplier !== 0) throw new Error('Empty flock paid');
	if (
		round.events[0]?.type !== 'launch' ||
		round.events.filter((e) => e.type === 'launch').length !== 1 ||
		round.events.at(-1)?.type !== 'finalWin' ||
		round.events.filter((e) => e.type === 'finalWin').length !== 1
	)
		throw new Error('Invalid single-round sequence');
	const final = round.events.at(-1);
	if (
		final?.type !== 'finalWin' ||
		final.multiplier !== round.finalMultiplier ||
		final.win !== round.finalWin
	)
		throw new Error('Invalid flock settlement');
	const baseEnd = round.events.find((e) => e.type === 'ending');
	const baseEndIndex = baseEnd ? round.events.indexOf(baseEnd) : round.events.length - 1;
	if (
		round.events.some(
			(e, index) =>
				(e.type === 'elimination' && index >= baseEndIndex) ||
				(e.type === 'gate' && e.result === 'crash') ||
				(e.type === 'encounter' &&
					e.result === 'crash' &&
					(championIndex < 0 || index < championIndex)),
		)
	)
		throw new Error('Invalid flock terminal event');
	const endings = round.events.filter((e) => e.type === 'ending');
	const expectedEndings =
		flock.survivors === 0 ? 0 : flock.bonus && flock.bonus.ending !== 'crash' ? 2 : 1;
	if (endings.length !== expectedEndings) throw new Error('Invalid destination count');
	if (
		flock.survivors > 0 &&
		(baseEnd?.type !== 'ending' || baseEnd.multiplier !== flock.baseMultiplier)
	)
		throw new Error('Invalid base destination');
	if (flock.bonus) {
		const trigger = round.events[championIndex];
		if (
			trigger.type !== 'championFlight' ||
			trigger.multiplier !== flock.baseMultiplier ||
			championIndex !== baseEndIndex + 1
		)
			throw new Error('Invalid Champion handoff');
		if (
			flock.bonus.ending !== round.ending ||
			(flock.bonus.ending === 'crash' && flock.bonus.multiplier !== 0)
		)
			throw new Error('Invalid Champion ending');
		const bonusEvents = round.events.slice(championIndex + 1, -1);
		const failureIndex = bonusEvents.findIndex(
			(e) => e.type === 'encounter' && e.result === 'crash',
		);
		if (
			failureIndex >= 0 !== (flock.bonus.ending === 'crash') ||
			(failureIndex >= 0 && failureIndex !== bonusEvents.length - 1)
		)
			throw new Error('Invalid Champion failure');
		if (flock.bonus.ending !== 'crash') {
			const ending = bonusEvents.at(-1);
			if (
				ending?.type !== 'ending' ||
				ending.ending !== flock.bonus.ending ||
				ending.multiplier !== round.finalMultiplier
			)
				throw new Error('Invalid Champion destination');
		}
	} else if (
		flock.survivors > 0 &&
		baseEnd?.type === 'ending' &&
		(baseEnd.ending !== round.ending || baseEndIndex !== round.events.length - 2)
	) {
		throw new Error('Inconsistent flock ending');
	}
	if (!flock.survivors && (round.ending !== 'crash' || round.events.at(-2)?.type !== 'elimination'))
		throw new Error('Invalid empty flock ending');
}
