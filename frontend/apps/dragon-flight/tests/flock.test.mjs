import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadTypescript } from './typescript.mjs';
const load = (name) => loadTypescript(new URL(`../src/game-world/${name}.ts`, import.meta.url));
const { generateMockRound, generateLegacyMockRound } = await load('mockRound');
const { validateFlock } = await load('flock/outcome');
const { createFlock, stepFlock, eliminateBird, startChampion } = await load('flock/presentation');
const { decodeStakeRound, loadStakeReplay } = await load('stake');
const { FLOCK_ORDER } = await load('flock/types');
const { hunterTrajectory } = await load('flock/hunter');
const appearance = { creature: 'eagle', launchStyle: 'glide' };
const samples = [];

test('hunter bullets reach their authored target at desktop and mobile sizes', () => {
	for (const width of [390, 1280]) {
		const bounds = { width, height: 440, floorY: 405 };
		const target = { x: width * 0.25, y: 180 };
		const start = hunterTrajectory(bounds, { target, progress: 0, hit: true });
		const end = hunterTrajectory(bounds, { target, progress: 1, hit: true });
		assert.deepEqual(start.bullet, start.muzzle);
		assert.deepEqual(end.bullet, target);
		assert(start.muzzle.x > target.x);
		assert(Number.isFinite(end.angle));
	}
});
for (const risk of ['safe', 'balanced', 'danger']) {
	test(`${risk}: flock is deterministic and preserves every calibrated financial outcome`, () => {
		for (let id = 1; id <= 3000; id++) {
			const round = generateMockRound(1, risk, id, appearance);
			const original = generateLegacyMockRound(1, risk, id, appearance);
			validateFlock(round);
			assert.equal(round.flock.birds.length, 4);
			assert.deepEqual(
				round.flock.birds.map((b) => b.bird),
				FLOCK_ORDER,
			);
			assert.equal(
				round.flock.survivors,
				round.flock.birds.filter((b) => b.status === 'finish').length,
			);
			assert(round.flock.survivors >= 0 && round.flock.survivors <= 4);
			assert.equal(round.flock.bonusTriggered, round.flock.survivors === 4);
			assert.equal(round.finalWin, original.finalWin);
			assert.equal(round.finalMultiplier, original.finalMultiplier);
			assert.equal(round.entryCost, original.entryCost);
			assert.equal(round.events.filter((e) => e.type === 'finalWin').length, 1);
			if (id <= 15) assert.deepEqual(round, generateMockRound(1, risk, id, appearance));
			if (id <= 50)
				assert.deepEqual(
					round.flock,
					generateMockRound(1, risk, id, { creature: 'woodpecker', launchStyle: 'dive' }).flock,
				);
			samples.push(round);
		}
	});
}
test('Champion has win and loss outcomes; a loss keeps the paid base flight', () => {
	const winners = samples.filter((r) => r.flock.bonus?.ending === 'summitLanding');
	const losses = samples.filter((r) => r.flock.bonus?.ending === 'crash');
	assert(winners.length > 0);
	assert(losses.length > 0);
	for (const r of [...winners, ...losses]) {
		assert.equal(r.flock.survivors, 4);
		assert.equal(r.events.filter((e) => e.type === 'championFlight').length, 1);
		assert(Math.abs(r.flock.baseMultiplier + r.flock.bonus.multiplier - r.finalMultiplier) < 1e-8);
		assert.equal(r.finalWin, r.bet * r.finalMultiplier);
		if (r.flock.bonus.ending === 'crash') assert.equal(r.flock.bonus.multiplier, 0);
	}
});
function serverBook(round) {
	const f = round.flock;
	const events = round.events.map((e, index) => ({
		...e,
		index,
		...('multiplier' in e ? { multiplierUnits: Math.round(e.multiplier * 100) } : {}),
		...(e.type === 'finalWin' ? { payoutMultiplier: Math.round(e.multiplier * 100) } : {}),
	}));
	return {
		roundID: round.id,
		mode: round.risk,
		amount: 1e6,
		payout: Math.round(round.finalWin * 1e6),
		state: {
			schemaVersion: 2,
			birds: f.birds,
			survivors: f.survivors,
			baseMultiplierUnits: Math.round(f.baseMultiplier * 100),
			bonusTriggered: f.bonusTriggered,
			...(f.bonus
				? {
						bonus: {
							bird: 'archaeopteryx',
							ending: f.bonus.ending,
							multiplierUnits: Math.round(f.bonus.multiplier * 100),
						},
					}
				: {}),
			events,
		},
	};
}
test('live and public replay decode authoritative flock data without frontend RNG or a second bet', async () => {
	const selected = [
		samples.find((r) => r.flock.survivors === 0),
		samples.find((r) => r.flock.survivors === 2),
		samples.find((r) => r.flock.bonus?.ending === 'summitLanding'),
		samples.find((r) => r.flock.bonus?.ending === 'crash'),
	];
	const rng = Math.random;
	Math.random = () => {
		throw new Error('Live RNG called');
	};
	try {
		for (const round of selected) {
			const book = serverBook(round);
			const live = decodeStakeRound(book, appearance);
			assert.deepEqual(live.flock, round.flock);
			assert.deepEqual(live.events, round.events);
			assert.equal(live.entryCost, 1);
			assert.equal(live.finalWin, round.finalWin);
			let requests = 0;
			const replay = await loadStakeReplay(
				`?replay=true&rgs_url=example.test&game=game&version=2&mode=${round.risk}&event=${round.id}`,
				async (url, options) => {
					requests++;
					assert(url.includes('/bet/replay/'));
					assert.equal(options?.method, undefined);
					return {
						ok: true,
						json: async () => ({
							costMultiplier: 1,
							payoutMultiplier: round.finalMultiplier,
							state: book.state,
						}),
					};
				},
			);
			assert.equal(requests, 1);
			assert.deepEqual(replay.round.flock, round.flock);
			assert.deepEqual(replay.round.events, round.events);
		}
	} finally {
		Math.random = rng;
	}
});
test('malformed server flock metadata fails closed', () => {
	const original = serverBook(samples.find((r) => r.flock.survivors === 2));
	for (const mutate of [
		(b) => b.state.birds.pop(),
		(b) => (b.state.birds[1].bird = b.state.birds[0].bird),
		(b) => (b.state.survivors = 4),
		(b) => (b.state.bonusTriggered = true),
		(b) => b.state.baseMultiplierUnits++,
		(b) => (b.state.birds.find((b) => b.status === 'eliminated').eliminatedAtEventIndex = 0),
	]) {
		const book = structuredClone(original);
		mutate(book);
		assert.throws(() => decodeStakeRound(book, appearance));
	}
});
test('one shared tick stages launches, keeps formations separate and applies only scheduled eliminations', () => {
	const bounds = { width: 390, height: 290, floorY: 258 };
	const round = samples.find((r) => r.flock.survivors === 4);
	let birds = createFlock(bounds, round);
	assert.deepEqual(
		birds.map((b) => b.id),
		FLOCK_ORDER,
	);
	birds = stepFlock(birds, 0.05, bounds, 140, true, 0);
	assert.equal(birds.filter((b) => b.launched).length, 1);
	birds = stepFlock(birds, 0.1, bounds, 140, true, 0);
	assert.equal(birds.filter((b) => b.launched).length, 2);
	for (let i = 0; i < 60; i++) birds = stepFlock(birds, 1 / 60, bounds, 140, true, 0);
	assert.equal(birds.filter((b) => b.alive).length, 4);
	assert.equal(new Set(birds.map((b) => Math.round(b.body.position.y))).size, 4);
	for (const b of birds)
		assert(
			Number.isFinite(b.body.position.y) &&
				b.body.position.y > 0 &&
				b.body.position.y < bounds.floorY,
		);
	birds = eliminateBird(birds, 'woodpecker', 'wind');
	assert.equal(birds.filter((b) => b.alive).length, 3);
	for (let i = 0; i < 90; i++) birds = stepFlock(birds, 1 / 60, bounds, 140, true, 0);
	assert.equal(birds.find((b) => b.id === 'woodpecker').visible, false);
	const champion = startChampion(createFlock(bounds, round));
	assert.deepEqual(
		champion.filter((b) => !b.exiting).map((b) => b.id),
		['archaeopteryx'],
	);
});
