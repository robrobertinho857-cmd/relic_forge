import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { loadTypescript, transpile } from './typescript.mjs';
const { createBonusRound } = await loadTypescript(
	new URL('../src/game-world/bonusFlights.ts', import.meta.url),
);
const { createPlayer } = await loadTypescript(
	new URL('../src/game-world/physics.ts', import.meta.url),
);

// Exercise the component's real action bodies, with only rendering/animation boundaries stubbed.
const source = fs.readFileSync(
	new URL('../src/game-world/GameWorld.svelte', import.meta.url),
	'utf8',
);
const actions = {};
for (const name of [
	'resetPresentation',
	'startFlight',
	'beginFlight',
	'flyAgain',
	'replayFlight',
	'presentFinalResult',
]) {
	const text = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\t}`))[0];
	actions[name] = await transpile(text);
}
function setup(ticket = 9999) {
	const ctx = {
		status: 'ready',
		selectedBet: 1,
		betInput: '1.00',
		betInputIsValid: true,
		selectedRisk: 'safe',
		selectedCreatureId: 'dragon',
		selectedLaunchStyle: 'glide',
		selectedWeather: 'clear',
		selectedTimeOfDay: 'night',
		roundSequence: 0,
		presentationToken: 0,
		flightHistory: [],
		isReplay: false,
		bonusOpen: true,
		bounds: { width: 900, height: 520, floorY: 478 },
		createPlayer,
		createBonusRound,
		drawBonusTicket: () => ticket,
		getFinishBackground: () => '/finish.png',
		cancelPresentation: () => {},
		Image: class {
			decode() {
				return Promise.resolve();
			}
		},
		getWinTier: (multiple) => ({ label: multiple >= 2 ? 'WIN' : 'RESULT', duration: 0 }),
		animatePresentationValues: async (_duration, update) => update(1),
		presentRound: () => {},
	};
	Object.defineProperty(ctx, 'controlsLocked', { get: () => ctx.status !== 'ready' });
	const scope = new Proxy(ctx, {
		has: () => true,
		get: (target, key) =>
			key === Symbol.unscopables ? undefined : key in target ? target[key] : globalThis[key],
		set: (target, key, value) => {
			target[key] = value;
			return true;
		},
	});
	for (const [name, js] of Object.entries(actions)) {
		ctx[name] = new Function('scope', `with(scope){ return (${js}); }`)(scope);
	}
	return ctx;
}
test('buy locks controls, repeated click cannot generate another round, and history records once', async () => {
	const ctx = setup();
	ctx.startFlight('storm-run');
	assert.equal(ctx.status, 'flying');
	assert.equal(ctx.currentRound.entryCost, 20);
	assert.equal(ctx.bonusOpen, false);
	ctx.startFlight('summit-expedition');
	assert.equal(ctx.roundSequence, 1);
	assert.equal(ctx.currentRound.bonusFlight, 'storm-run');
	await ctx.presentFinalResult(ctx.currentRound, ctx.presentationToken);
	await ctx.presentFinalResult(ctx.currentRound, ctx.presentationToken);
	assert.equal(ctx.flightHistory.length, 1);
	assert.equal(ctx.finalWin, 300);
});
test('history replay keeps original outcome, charges no new entry and never duplicates history', async () => {
	const ctx = setup(0);
	ctx.startFlight('summit-expedition');
	const original = ctx.currentRound;
	await ctx.presentFinalResult(original, ctx.presentationToken);
	ctx.replayFlight(original);
	assert.equal(ctx.isReplay, true);
	assert.equal(ctx.currentRound, original);
	assert.equal(ctx.roundSequence, 1);
	await ctx.presentFinalResult(original, ctx.presentationToken);
	assert.equal(ctx.finalWin, 0);
	assert.equal(ctx.flightHistory.length, 1);
});
test('Buy Again starts one fresh round at the same price without changing normal flight settings', async () => {
	const ctx = setup();
	ctx.startFlight('summit-expedition');
	await ctx.presentFinalResult(ctx.currentRound, ctx.presentationToken);
	ctx.drawBonusTicket = () => 0;
	ctx.flyAgain();
	assert.equal(ctx.roundSequence, 2);
	assert.equal(ctx.currentRound.entryCost, 50);
	assert.equal(ctx.currentRound.finalWin, 0);
	assert.equal(ctx.isReplay, false);
	assert.equal(ctx.selectedRisk, 'safe');
	assert.equal(ctx.selectedWeather, 'clear');
	assert.equal(ctx.selectedTimeOfDay, 'night');
});
test('history caps at 20 completed flights and rejects replay during an active flight', async () => {
	const ctx = setup();
	for (let i = 0; i < 25; i++) {
		ctx.resetPresentation();
		ctx.startFlight('storm-run');
		await ctx.presentFinalResult(ctx.currentRound, ctx.presentationToken);
	}
	assert.equal(ctx.flightHistory.length, 20);
	assert.equal(ctx.flightHistory[0].id, 25);
	assert.equal(ctx.flightHistory.at(-1).id, 6);
	ctx.resetPresentation();
	ctx.startFlight('storm-run');
	const active = ctx.currentRound;
	ctx.replayFlight(ctx.flightHistory[0]);
	assert.equal(ctx.currentRound, active);
	assert.equal(ctx.isReplay, false);
});
test('randomness failure leaves the flight ready and reports an error', () => {
	const ctx = setup();
	ctx.drawBonusTicket = () => {
		throw new Error('unavailable');
	};
	ctx.startFlight('storm-run');
	assert.equal(ctx.status, 'ready');
	assert.equal(ctx.currentRound, undefined);
	assert(ctx.flightError);
});
