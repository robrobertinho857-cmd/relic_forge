import { loadTypescript } from './typescript.mjs';
import { evaluateProfile, settledReturn } from './baseMath.mjs';

const { RISK_PROFILES } = await loadTypescript(
	new URL('../src/game-world/mockRound.ts', import.meta.url),
);
// Offline calibration only. Outcome probabilities never adapt during play.
for (const [risk, profile] of Object.entries(RISK_PROFILES)) {
	let low = 0,
		high = 1;
	for (let iteration = 0; iteration < 48; iteration++) {
		const passChance = (low + high) / 2;
		if (evaluateProfile({ ...profile, passChance }).rtp < 0.96) low = passChance;
		else high = passChance;
	}
	const theory = evaluateProfile(profile);
	let min = { rtp: Infinity, betCents: 0 },
		max = { rtp: -Infinity, betCents: 0 };
	for (let betCents = 10; betCents <= 10000; betCents++) {
		const rtp = settledReturn(theory.payouts, betCents);
		if (rtp < min.rtp) min = { rtp, betCents };
		if (rtp > max.rtp) max = { rtp, betCents };
	}
	console.log(
		JSON.stringify({
			risk,
			calibratedPassChance: (low + high) / 2,
			configuredPassChance: profile.passChance,
			rtp: theory.rtp,
			survival: theory.survival,
			variance: theory.variance,
			settledMin: min,
			settledMax: max,
		}),
	);
}
