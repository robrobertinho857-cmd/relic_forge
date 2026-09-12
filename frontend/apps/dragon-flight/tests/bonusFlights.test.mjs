import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { loadTypescript } from './typescript.mjs';
const { BONUS_FLIGHTS, BONUS_TICKETS, bonusEntryCost, createBonusRound, drawBonusTicket } =
	await loadTypescript(new URL('../src/game-world/bonusFlights.ts', import.meta.url));

const appearance = { creature: 'dragon', launchStyle: 'glide' };
for (const feature of BONUS_FLIGHTS) {
	test(`${feature.name}: exhaust all 10,000 tickets, accounting and terminal events`, () => {
		assert.equal(
			feature.outcomes.reduce((sum, item) => sum + item.tickets, 0),
			BONUS_TICKETS,
		);
		const counts = new Map();
		let totalPayoutCents = 0;
		for (let ticket = 0; ticket < BONUS_TICKETS; ticket++) {
			const round = createBonusRound(feature.id, 1.23, ticket, ticket, appearance);
			counts.set(round.finalMultiplier, (counts.get(round.finalMultiplier) ?? 0) + 1);
			totalPayoutCents += Math.round(round.finalWin * 100);
			assert.equal(round.entryCost, (123 * feature.costMultiplier) / 100);
			assert.equal(round.finalWin, (123 * round.finalMultiplier) / 100);
			assert.deepEqual(round.events.at(-1), {
				type: 'finalWin',
				multiplier: round.finalMultiplier,
				win: round.finalWin,
			});
			assert.equal(round.events.filter((e) => e.type === 'gate').length, feature.gateCount);
			assert.equal(round.stagePlan.length, feature.gateCount);
			assert(
				round.stagePlan.every(
					(stage, i) =>
						stage.eventIndex < round.events.length &&
						(i === 0 || stage.eventIndex > round.stagePlan[i - 1].eventIndex),
				),
			);
			const crashed = round.events.filter((e) => e.type === 'gate' && e.result === 'crash');
			assert.equal(crashed.length, round.finalWin === 0 ? 1 : 0);
			assert.equal(round.ending === 'crash', round.finalWin === 0);
			assert.equal(
				round.events.filter((e) => e.type === 'ending').length,
				round.finalWin === 0 ? 0 : 1,
			);
			for (const e of round.events)
				if ('multiplier' in e) assert(e.multiplier <= round.finalMultiplier);
		}
		for (const outcome of feature.outcomes)
			assert.equal(counts.get(outcome.multiplier), outcome.tickets);
		// Exact integer equality; no Monte Carlo approximation or rounded percentage.
		assert.equal(totalPayoutCents * 100, 123 * feature.costMultiplier * BONUS_TICKETS * 96);
	});
	test(`${feature.name}: prices, bet scaling and cosmetic independence`, () => {
		for (const bet of [0.1, 0.11, 1, 1.23, 99.99, 100]) {
			for (const ticket of [0, 3999, 4999, 7000, 9990, 9999]) {
				const a = createBonusRound(feature.id, bet, 1, ticket, appearance);
				const b = createBonusRound(feature.id, bet, 99, ticket, {
					creature: 'archaeopteryx',
					launchStyle: 'dive',
				});
				assert.equal(a.finalWin, b.finalWin);
				assert.deepEqual(a.events, b.events);
				assert.equal(a.entryCost, bonusEntryCost(bet, feature.id));
				assert.equal(a.finalWin, (Math.round(bet * 100) * a.finalMultiplier) / 100);
			}
		}
	});
}
test('reject invalid price inputs, unknown routes and out-of-range tickets', () => {
	for (const bet of [NaN, Infinity, -1, 0, 0.09, 1.001, 100.01])
		assert.throws(() => bonusEntryCost(bet, 'storm-run'));
	for (const ticket of [-1, 10000, 0.5, NaN, Infinity])
		assert.throws(() => createBonusRound('storm-run', 1, 1, ticket, appearance));
	assert.throws(() => bonusEntryCost(1, 'unknown'));
});
test('ticket sampling rejects the biased tail before accepting a uniform ticket', () => {
	const limit = Math.floor(2 ** 32 / BONUS_TICKETS) * BONUS_TICKETS;
	const samples = [limit, 2 ** 32 - 1, 39999];
	const random = mock.method(globalThis.crypto, 'getRandomValues', (array) => {
		array[0] = samples.shift();
		return array;
	});
	try {
		assert.equal(drawBonusTicket(), 9999);
		assert.equal(random.mock.callCount(), 3);
	} finally {
		random.mock.restore();
	}
});
