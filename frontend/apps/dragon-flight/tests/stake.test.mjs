import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { loadTypescript } from './typescript.mjs';
const { StakeSession, decodeStakeRound, STAKE_MODES, loadStakeReplay } = await loadTypescript(
	new URL('../src/game-world/stake.ts', import.meta.url),
);
const fixtures = JSON.parse(
	fs.readFileSync(new URL('../art/submission/server-rounds.json', import.meta.url)),
);
const options = { creature: 'eagle', launchStyle: 'boost' };
test('public replay uses only GET, needs no session, and reproduces bonus cost and payout', async () => {
	const book = fixtures.find((x) => x.mode === 'summit-expedition' && x.payout > 0);
	const calls = [];
	const result = await loadStakeReplay(
		'?replay=true&game=game-id&version=1&mode=summit-expedition&event=7&rgs_url=rgs.example.test&amount=1000000&currency=EUR',
		async (url, init) => {
			calls.push([url, init]);
			return response({
				state: book.state,
				costMultiplier: 50,
				payoutMultiplier: book.payout / 1000000,
			});
		},
	);
	assert.equal(calls.length, 1);
	assert.equal(calls[0][0], 'https://rgs.example.test/bet/replay/game-id/1/summit-expedition/7');
	assert.equal(calls[0][1].body, undefined);
	assert.equal(result.round.entryCost, 50);
	assert.equal(result.round.finalWin, book.payout / 1e6);
	assert.equal(result.currency, 'EUR');
});
test('buy-feature restriction is enforced before any play request', async () => {
	let count = 0;
	const client = new StakeSession(
		() => {},
		async () => {
			count++;
			return response({
				balance,
				config: { ...config, jurisdiction: { disabledBuyFeature: true } },
			});
		},
	);
	await client.connect(search, false);
	await assert.rejects(client.play('storm-run', 1000000));
	assert.equal(count, 1);
});
test('exported server books render for every base payout and both bonus distributions', () => {
	assert(fixtures.length > 400);
	const seen = new Set();
	for (const fixture of fixtures) {
		const round = decodeStakeRound(fixture, options);
		seen.add(fixture.mode);
		assert.equal(round.finalWin, fixture.payout / 1e6);
		assert.equal(round.entryCost, STAKE_MODES[fixture.mode]);
		assert.equal(round.events.at(-1).win, round.finalWin);
		assert.equal(round.creature, 'eagle');
		assert.equal(round.ending === 'crash', fixture.payout === 0);
	}
	assert.deepEqual([...seen].sort(), Object.keys(STAKE_MODES).sort());
});
test('malformed, reordered and inconsistent payout streams fail closed', () => {
	const fixture = fixtures.find((x) => x.payout > 0);
	for (const mutate of [
		(x) => (x.payout += 100),
		(x) => (x.state[0].type = 'gate'),
		(x) => (x.state[1].index = 90),
		(x) => (x.state.at(-1).payoutMultiplier = 0),
		(x) => (x.mode = 'other'),
	]) {
		const bad = structuredClone(fixture);
		mutate(bad);
		assert.throws(() => decodeStakeRound(bad, options));
	}
});
const search = '?sessionID=test&rgs_url=rgs.example.test';
const balance = { amount: 500000000, currency: 'EUR' };
const config = {
	minBet: 100000,
	maxBet: 100000000,
	stepBet: 100000,
	betLevels: [100000, 1000000],
	jurisdiction: { disabledTurbo: true },
};
const response = (body) => ({ ok: true, json: async () => body });
test('authenticate, single play, server balance and settlement use documented units', async () => {
	const calls = [];
	const round = fixtures.find((x) => x.mode === 'storm-run' && x.payout > 0);
	let release;
	const client = new StakeSession(
		() => {},
		async (url, init) => {
			calls.push([url, JSON.parse(init.body)]);
			if (url.endsWith('authenticate')) return response({ balance, config });
			if (url.endsWith('play')) {
				await new Promise((r) => (release = r));
				return response({ balance: { ...balance, amount: 480000000 }, round });
			}
			return response({ balance: { ...balance, amount: 490000000 } });
		},
	);
	await client.connect(search, false);
	assert.equal(client.state.turboDisabled, true);
	const first = client.play('storm-run', 1000000);
	await assert.rejects(client.play('storm-run', 1000000));
	release();
	await first;
	assert.equal(client.state.amount, 480000000);
	assert.deepEqual(calls[1][1], {
		mode: 'storm-run',
		amount: 1000000,
		currency: 'EUR',
		sessionID: 'test',
	});
	await client.settle();
	await client.settle();
	assert.equal(calls.filter(([url]) => url.endsWith('end-round')).length, 1);
	assert.equal(client.state.amount, 490000000);
});
test('uncertain play never retries or falls back to demo; authenticate recovers the active round', async () => {
	let plays = 0,
		auths = 0;
	const round = fixtures[0];
	const client = new StakeSession(
		() => {},
		async (url) => {
			if (url.endsWith('play')) {
				plays++;
				throw new Error('timeout after debit');
			}
			auths++;
			return response({ balance, config, ...(auths > 1 ? { round } : {}) });
		},
	);
	await client.connect(search, false);
	await assert.rejects(client.play('safe', 1000000));
	await assert.rejects(client.play('safe', 1000000));
	assert.equal(client.state.ready, false);
	assert.equal(plays, 1);
	assert.deepEqual(await client.connect(search, false), round);
	assert.equal(client.state.active, true);
});
test('missing session blocks production; development demo is explicit; social mode is blocked', async () => {
	const client = new StakeSession(
		() => {},
		async () => response({ balance, config: { ...config, jurisdiction: { socialCasino: true } } }),
	);
	await client.connect('', false);
	assert.equal(client.state.ready, false);
	await client.connect('', true);
	assert.equal(client.state.live, false);
	await client.connect(search, false);
	assert.equal(client.state.ready, false);
});
test('failed settlement requires recovery and cannot start another bet', async () => {
	const client = new StakeSession(
		() => {},
		async (url) => {
			if (url.endsWith('end-round')) throw new Error('lost response');
			return response({ balance, config, round: fixtures[0] });
		},
	);
	await client.connect(search, false);
	await assert.rejects(client.settle());
	await assert.rejects(client.play('safe', 1000000));
	assert.equal(client.state.active, true);
});
