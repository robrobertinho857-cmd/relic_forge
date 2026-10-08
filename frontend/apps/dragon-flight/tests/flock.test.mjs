import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadTypescript } from './typescript.mjs';
const load = (name) => loadTypescript(new URL(`../src/game-world/${name}.ts`, import.meta.url));
const { generateMockRound, generateLegacyMockRound } = await load('mockRound');
const { validateFlock } = await load('flock/outcome');
const { createFlock, stepFlock, eliminateBird, startChampion, resizeFlock } =
	await load('flock/presentation');
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

const { PresentationTimeline, presentationSpeed } = await load('flock/timeline');
const { presentationKind, buildFlockTimeline, runFlockTimeline } = await load('flock/director');
const { settleRoundOnce } = await load('flock/settlement');

test('launch uses 100ms stagger and finishes the four arcs within 0.9s', () => {
	const bounds = { width: 390, height: 300, floorY: 266 };
	let birds = createFlock(bounds, samples[0]);
	assert.deepEqual(
		birds.map((b) => Math.round(b.launchDelay * 1000)),
		[0, 100, 200, 300],
	);
	const startY = birds.map((b) => b.body.position.y);
	assert.equal(new Set(startY).size, 4);
	for (let i = 0; i < 54; i++) birds = stepFlock(birds, 1 / 60, bounds, 170, true, 0);
	assert(birds.every((b) => b.launched && b.body.position.x > 0));
	assert.equal(new Set(birds.map((b) => b.frame)).size > 1, true);
});
test('formation is frame-rate independent, bounded and preserves positions after elimination', () => {
	for (const width of [320, 390, 768, 1280]) {
		const bounds = { width, height: 300, floorY: 266 };
		const run = (hz) => {
			let birds = createFlock(bounds, samples[0]);
			for (let i = 0; i < hz * 4; i++) birds = stepFlock(birds, 1 / hz, bounds, 190, true, 0);
			return birds;
		};
		const fine = run(120);
		for (const hz of [30, 60]) {
			const coarse = run(hz);
			for (let i = 0; i < 4; i++)
				assert(
					Math.hypot(
						coarse[i].body.position.x - fine[i].body.position.x,
						coarse[i].body.position.y - fine[i].body.position.y,
					) < 3,
				);
		}
		const before = run(60);
		let after = eliminateBird(before, 'azure-swift', 'terrain');
		for (let i = 0; i < 4; i++) assert.deepEqual(before[i].body.position, after[i].body.position);
		const oneTick = stepFlock(after, 1 / 60, bounds, 150, true, 0);
		for (const bird of oneTick.filter((b) => b.alive)) {
			const original = before.find((b) => b.id === bird.id);
			assert(
				Math.hypot(
					bird.body.position.x - original.body.position.x,
					bird.body.position.y - original.body.position.y,
				) < 4,
			);
		}
		for (let i = 0; i < 150; i++) after = stepFlock(after, 1 / 60, bounds, 150, true, 0);
		const dead = after.find((b) => b.id === 'azure-swift');
		assert.equal(dead.alive, false);
		assert.equal(dead.visible, false);
		const handoff = startChampion(after);
		assert.equal(handoff.find((b) => b.id === 'azure-swift').alive, false);
		for (let i = 0; i < 4; i++) assert.deepEqual(after[i].body, handoff[i].body);
	}
});
test('hidden-tab gap is clamped and Champion handoff never resets its leader', () => {
	const bounds = { width: 768, height: 450, floorY: 408 };
	let birds = createFlock(bounds, samples[0]);
	for (let i = 0; i < 120; i++) birds = stepFlock(birds, 1 / 60, bounds, 240, true, 0);
	const champion = startChampion(birds);
	assert.deepEqual(
		champion.find((b) => b.id === 'archaeopteryx').body,
		birds.find((b) => b.id === 'archaeopteryx').body,
	);
	const resumed = stepFlock(champion, 40, bounds, 240, true, 0);
	const arch = resumed.find((b) => b.id === 'archaeopteryx');
	const old = champion.find((b) => b.id === arch.id);
	assert(
		Math.hypot(
			arch.body.position.x - old.body.position.x,
			arch.body.position.y - old.body.position.y,
		) < 45,
	);
	assert.equal(arch.age - old.age <= 0.100001, true);
});
test('timeline applies playback speed once, supports changes, cancellation and hidden gaps', async () => {
	for (const speed of [1, 1.5, 2]) {
		const clock = new PresentationTimeline();
		let p = 0;
		const result = clock.animate(900, 1, (value) => (p = value));
		for (let i = 0; i < 6; i++) clock.tick(0.05, speed, 1);
		assert(Math.abs(p - speed / 3) < 1e-8);
		clock.tick(20, speed, 1, true);
		assert(Math.abs(p - speed / 3) < 1e-8);
		clock.cancel();
		assert.equal(await result, false);
		let staleWrites = 0;
		const stale = clock.animate(100, 1, () => staleWrites++);
		clock.tick(0.05, speed, 2);
		assert.equal(await stale, false);
		assert.equal(staleWrites, 1);
		assert.equal(clock.pending, 0);
	}
	const clock = new PresentationTimeline();
	let p = 0;
	const result = clock.animate(900, 1, (x) => (p = x));
	for (let i = 0; i < 6; i++) clock.tick(0.05, 1, 1);
	for (let i = 0; i < 6; i++) clock.tick(0.05, 2, 1);
	assert.equal(await result, true);
	assert.equal(p, 1);
	assert.equal(presentationSpeed(2, true), 1);
});
test('dispatcher respects authored elimination causes; timing stays readable in long books', () => {
	for (const reason of ['hunter', 'terrain', 'wind', 'predator'])
		assert.equal(presentationKind({ type: 'elimination', bird: 'eagle', reason }), reason);
	assert.equal(presentationKind({ type: 'gate', hazard: 'forestPass' }), 'terrain');
	assert.equal(presentationKind({ type: 'gate', hazard: 'windPass' }), 'wind');
	for (const round of samples) {
		const plan = buildFlockTimeline(round);
		assert.equal(plan.filter((s) => s.event.type === 'launch')[0].duration, 800);
		const championIndex = round.events.findIndex((e) => e.type === 'championFlight');
		const baseMs = plan
			.filter((s) => championIndex < 0 || s.index < championIndex)
			.reduce((n, s) => n + s.duration + s.travel, 0);
		assert(baseMs >= 6999 && baseMs <= 12000);
		for (const step of plan) if (step.event.type !== 'finalWin') assert(step.duration >= 400);
		if (round.flock.bonusTriggered) {
			const bonus = plan
				.filter((s) => s.index >= round.events.findIndex((e) => e.type === 'championFlight'))
				.reduce((n, s) => n + s.duration, 0);
			assert(bonus >= 5000 && bonus <= 8000);
		}
	}
});
test('director preserves replay commit order, cancels stale events and settles exactly once', async () => {
	const round = samples.find((r) => r.flock.bonusTriggered);
	const run = async () => {
		const commits = [];
		let settlements = 0;
		const progress = [];
		await runFlockTimeline(round, {
			valid: () => true,
			animate: async (_d, update) => {
				for (const p of [0, 0.3, 0.6, 1]) update(p);
			},
			begin: () => {},
			frame: () => {},
			commit: (e) => commits.push(e),
			progress: (p) => progress.push(p),
			settle: async () => {
				settlements++;
			},
		});
		assert.equal(settlements, 1);
		assert(progress.every((p, i) => i === 0 || p >= progress[i - 1]));
		return commits;
	};
	assert.deepEqual(await run(), await run());
	let valid = true;
	const commits = [];
	let settled = 0;
	await runFlockTimeline(round, {
		valid: () => valid,
		animate: async (_d, update) => {
			update(0.2);
			valid = false;
			update(1);
		},
		begin: () => {},
		frame: () => {},
		commit: (e) => commits.push(e),
		progress: () => {},
		settle: async () => {
			settled++;
		},
	});
	assert.equal(commits.length, 0);
	assert.equal(settled, 0);
});
test('concurrent settlement shares one server request and records completion once', async () => {
	const pending = new Map();
	const done = new Set();
	let calls = 0;
	let finish;
	const settle = () => {
		calls++;
		return new Promise((resolve) => (finish = resolve));
	};
	const a = settleRoundOnce(9, settle, pending, done);
	const b = settleRoundOnce(9, settle, pending, done);
	assert.equal(calls, 1);
	finish();
	await Promise.all([a, b]);
	assert(done.has(9));
	assert.equal(pending.size, 0);
	await settleRoundOnce(9, settle, pending, done);
	assert.equal(calls, 1);
});

test('cancellation inside a frame callback also cancels queued sibling effects', async () => {
	const clock = new PresentationTimeline();
	let writes = 0;
	const first = clock.animate(100, 1, (p) => {
		if (p > 0) clock.cancel();
	});
	const second = clock.animate(100, 1, (p) => {
		if (p > 0) writes++;
	});
	clock.tick(0.05, 1, 1);
	assert.deepEqual(await Promise.all([first, second]), [false, false]);
	assert.equal(writes, 0);
	assert.equal(clock.pending, 0);
});

test('responsive resizing preserves normalized positions and survivor state', () => {
	const before = { width: 1280, height: 520, floorY: 478 };
	const after = { width: 320, height: 300, floorY: 266 };
	let birds = createFlock(before, samples[0]);
	for (let i = 0; i < 90; i++) birds = stepFlock(birds, 1 / 60, before, 220, true, 0);
	birds = eliminateBird(birds, 'eagle', 'wind');
	const resized = resizeFlock(birds, before, after);
	for (let i = 0; i < 4; i++) {
		assert.equal(resized[i].alive, birds[i].alive);
		assert(
			Math.abs(resized[i].body.position.x / after.width - birds[i].body.position.x / before.width) <
				1e-9,
		);
		assert(
			Math.abs(
				resized[i].body.position.y / after.height - birds[i].body.position.y / before.height,
			) < 1e-9,
		);
	}
});

test('director stops on an explicitly cancelled clock job even before token changes', async () => {
	let began = 0,
		committed = 0,
		settled = 0;
	await runFlockTimeline(samples[0], {
		valid: () => true,
		animate: async () => false,
		begin: () => began++,
		frame: () => {},
		progress: () => {},
		commit: () => committed++,
		settle: async () => {
			settled++;
		},
	});
	assert.equal(began, 1);
	assert.equal(committed, 0);
	assert.equal(settled, 0);
});
