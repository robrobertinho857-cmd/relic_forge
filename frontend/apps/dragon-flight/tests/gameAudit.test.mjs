import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { loadTypescript } from './typescript.mjs';
import { evaluateProfile, settledReturn } from './baseMath.mjs';

const load = (name, options) =>
	loadTypescript(new URL(`../src/game-world/${name}.ts`, import.meta.url), options);
const { generateMockRound, RISK_PROFILES } = await load('mockRound');
const { payoutForMultiplier } = await load('utils/number');
const { formatLocalAmount } = await load('utils/format');
const { isBetInputValid, sanitizeBetInput } = await load('utils/bet');
const { CREATURES } = await load('creatures');
const { createPlayer, steerPlayer } = await load('physics');
const { DEV_SCENARIOS, createDevFlightRound } = await load('devScenarios');
const appearance = { creature: 'dragon', launchStyle: 'glide' };

test('normal profiles target 96% and retain increasing volatility across risks', () => {
	const profiles = ['safe', 'balanced', 'danger'].map((risk) =>
		evaluateProfile(RISK_PROFILES[risk]),
	);
	for (const profile of profiles) {
		assert(Math.abs(profile.rtp - 0.96) < 1e-10, `RTP drift: ${profile.rtp}`);
		assert(Math.abs([...profile.payouts.values()].reduce((a, b) => a + b, 0) - 1) < 1e-10);
		assert(Math.abs(settledReturn(profile.payouts, 100) - 0.96) < 1e-10);
	}
	for (let index = 1; index < profiles.length; index++) {
		assert(profiles[index].survival < profiles[index - 1].survival);
		assert(profiles[index].variance > profiles[index - 1].variance);
	}
});

test('every supported cent bet settles at 96% theoretical return', () => {
	for (const profile of Object.values(RISK_PROFILES)) {
		const { payouts } = evaluateProfile(profile);
		for (let cents = 10; cents <= 10000; cents++) {
			assert(Math.abs(settledReturn(payouts, cents) - 0.96) < 1e-10);
		}
	}
});

test('settlement preserves fractional cents; only displayed amounts are rounded', () => {
	assert.equal(payoutForMultiplier(0.1, 1.45), 0.145);
	assert.equal(formatLocalAmount(0.145), '$0.15');
	assert.equal(formatLocalAmount(0.125), '$0.13');
	assert.equal(formatLocalAmount(-0.145), '$-0.15');
	assert.equal(formatLocalAmount(12), '$12.00');
	for (let cents = 10; cents <= 10000; cents += 7)
		for (let hundredths = 100; hundredths <= 5000; hundredths += 5) {
			const integerProduct = BigInt(cents) * BigInt(hundredths);
			const expected = Number(integerProduct) / 10000;
			assert.equal(payoutForMultiplier(cents / 100, hundredths / 100), expected);
		}
});
test('normal rounds reject invalid bets, risk and round IDs', () => {
	for (const bet of [NaN, Infinity, -1, 0, 0.09, 1.001, 100.01])
		assert.throws(() => generateMockRound(bet, 'safe', 1, appearance));
	for (const id of [NaN, 0, -1, 0.5, Infinity])
		assert.throws(() => generateMockRound(1, 'safe', id, appearance));
	for (const risk of ['unknown', 'constructor'])
		assert.throws(() => generateMockRound(1, risk, 1, appearance));
	for (const input of ['', '-1', '1e2', 'Infinity', '0.09', '1.001'])
		assert.equal(isBetInputValid(input), false);
	assert.equal(sanitizeBetInput('1,25', '1.00'), '1.25');
});
function auditRound(round) {
	assert(Number.isFinite(round.finalWin));
	assert.equal(round.finalWin, payoutForMultiplier(round.bet, round.finalMultiplier));
	assert.equal(round.events[0].type, 'launch');
	assert.deepEqual(round.events.at(-1), {
		type: 'finalWin',
		multiplier: round.finalMultiplier,
		win: round.finalWin,
	});
	assert.equal(round.events.filter((e) => e.type === 'finalWin').length, 1);
	assert.equal(round.finalWin === 0, round.ending === 'crash');
	const fatal = round.events.findIndex(
		(e) => (e.type === 'gate' || e.type === 'encounter') && e.result === 'crash',
	);
	if (fatal >= 0) assert.equal(fatal, round.events.length - 2);
	assert(
		round.stagePlan.every(
			(s, i) =>
				s.eventIndex < round.events.length &&
				(i === 0 || s.eventIndex > round.stagePlan[i - 1].eventIndex),
		),
	);
}
for (const [risk, profile] of Object.entries(RISK_PROFILES)) {
	test(`${risk}: 100,000 seeded rounds agree with profile expectation and event accounting`, () => {
		const theory = evaluateProfile(profile);
		let total = 0,
			wins = 0;
		for (let id = 1; id <= 100000; id++) {
			const round = generateMockRound(1, risk, id, appearance);
			auditRound(round);
			total += round.finalWin;
			wins += round.finalWin > 0 ? 1 : 0;
		}
		assert(Math.abs(total / 100000 - theory.rtp) < 6 * Math.sqrt(theory.variance / 100000));
		assert(
			Math.abs(wins / 100000 - theory.survival) <
				6 * Math.sqrt((theory.survival * (1 - theory.survival)) / 100000),
		);
		console.log(
			JSON.stringify({
				risk,
				theoreticalRtp: theory.rtp,
				observedRtp: total / 100000,
				survival: theory.survival,
			}),
		);
	});
}
test('all creatures and launch choices preserve base-game outcomes', () => {
	for (const risk of Object.keys(RISK_PROFILES))
		for (let id = 1; id <= 100; id++) {
			const baseline = generateMockRound(1.23, risk, id, appearance);
			for (const creature of CREATURES)
				for (const launchStyle of ['glide', 'boost', 'dive']) {
					const other = generateMockRound(1.23, risk, id, { creature: creature.id, launchStyle });
					assert.deepEqual(other.events, baseline.events);
					assert.equal(other.finalWin, baseline.finalWin);
				}
		}
});
test('all 13 forced development scenarios have consistent terminal events', () => {
	for (const scenario of DEV_SCENARIOS.filter((s) => s.id !== 'random'))
		for (const risk of Object.keys(RISK_PROFILES)) {
			auditRound(createDevFlightRound(scenario.id, { bet: 1.23, risk, roundId: 1, ...appearance }));
		}
});
test('creature steering stays finite and inside world bounds at common frame rates', () => {
	for (const width of [292, 390, 870, 1200])
		for (const height of [262, 650])
			for (const fps of [20, 30, 60, 120])
				for (const creature of CREATURES) {
					const bounds = { width, height, floorY: height - 34 };
					let player = createPlayer(bounds);
					for (let frame = 0; frame < fps * 4; frame++) {
						player = steerPlayer(
							player,
							frame < fps * 2 ? 20 : height - 10,
							1 / fps,
							bounds,
							creature,
						);
						assert(Number.isFinite(player.position.x) && Number.isFinite(player.position.y));
						assert(
							player.position.y >= player.radius &&
								player.position.y <= bounds.floorY - player.radius,
						);
					}
				}
});
test('all live artwork URLs resolve at root and under a deployment subpath', async () => {
	for (const base of ['', '/dragon-flight']) {
		const { CREATURES } = await load('creatures', { base });
		const { getLandscapeBackground, getFinishBackground } = await load('backgrounds', { base });
		const { getTerrainArtwork } = await load('terrainArtwork', { base });
		const { PICKUP_ARTWORK } = await load('pickupArtwork', { base });
		const paths = new Set();
		for (const file of Object.values(PICKUP_ARTWORK)) paths.add(file);
		for (const creature of CREATURES)
			for (const file of creature.flightAnimation?.frames ?? []) paths.add(file);
		for (const weather of ['clear', 'rain', 'storm', 'fog', 'snow'])
			for (const time of ['dawn', 'day', 'sunset', 'night', 'eclipse']) {
				paths.add(getLandscapeBackground(weather, time));
				for (const ending of [
					'safeLanding',
					'meadowLanding',
					'ridgeLanding',
					'hiddenValley',
					'summitLanding',
				])
					paths.add(getFinishBackground(ending, weather, time));
			}
		for (const material of ['rock', 'tree'])
			for (const side of ['upper', 'lower'])
				for (const snow of [false, true]) {
					const art = getTerrainArtwork(material, side, snow);
					paths.add(art.src);
					paths.add(art.silhouette);
				}
		for (const name of [
			'day',
			'dawn',
			'sunset',
			'night',
			'eclipse',
			'rain',
			'storm',
			'fog',
			'snow',
			'glide',
			'boost',
			'dive',
		])
			paths.add(`${base}/customize/${name}.webp`);
		for (const name of ['storm-run', 'summit-expedition'])
			paths.add(`${base}/bonuses/${name}.webp`);
		assert.equal(paths.size, 57);
		for (const file of paths) {
			assert(file.startsWith(base + '/'));
			assert(file.endsWith('.webp'));
			const bytes = fs.readFileSync(
				new URL('../static' + file.slice(base.length), import.meta.url),
			);
			assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
			assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
		}
	}
});
