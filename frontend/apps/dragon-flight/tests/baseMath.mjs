// Exact finite-distribution evaluation of the local profile, assuming independent uniform draws.
export function evaluateProfile(profile) {
	let rtp = 0,
		secondMoment = 0,
		survival = 0;
	let distribution = new Map([[100, 1]]);
	const payouts = new Map();
	function addReward(chance, increments) {
		const next = new Map();
		const add = (amount, probability) => next.set(amount, (next.get(amount) ?? 0) + probability);
		for (const [amount, probability] of distribution) {
			add(amount, probability * (1 - chance));
			for (const increment of increments)
				add(amount + Math.round(increment * 100), (probability * chance) / increments.length);
		}
		distribution = next;
	}
	for (let gate = 1; gate <= profile.gateCount[1]; gate++) {
		addReward(profile.pickupChance, profile.pickupIncrements);
		addReward(profile.currentChance, profile.currentIncrements);
		if (gate > 1) addReward(profile.encounterChance, profile.encounterIncrements);
		if (gate < profile.gateCount[0]) continue;
		const chance = profile.passChance ** gate / (profile.gateCount[1] - profile.gateCount[0] + 1);
		survival += chance;
		for (const [amount, probability] of distribution)
			for (const floor of profile.rewardMultipliers) {
				const payout = Math.max(amount / 100, floor),
					weight = (chance * probability) / profile.rewardMultipliers.length;
				rtp += weight * payout;
				secondMoment += weight * payout * payout;
				const hundredths = Math.round(payout * 100);
				payouts.set(hundredths, (payouts.get(hundredths) ?? 0) + weight);
			}
	}
	payouts.set(0, 1 - survival);
	return { rtp, survival, variance: secondMoment - rtp * rtp, payouts };
}

// Evaluate settlement in ten-thousandths independently of the runtime payout helper.
export function settledReturn(payouts, betCents) {
	let paidUnits = 0;
	for (const [hundredths, chance] of payouts) paidUnits += betCents * hundredths * chance;
	return paidUnits / (betCents * 100);
}
