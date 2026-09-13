export const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100;

// Both inputs have at most two decimal places. Preserve their integer product
// in ten-thousandths: rounding settlement to cents would distort small-bet RTP.
// Only the UI formatter rounds to two decimal places.
export const payoutForMultiplier = (bet: number, multiplier: number) =>
	(Math.round(bet * 100) * Math.round(multiplier * 100)) / 10_000;
