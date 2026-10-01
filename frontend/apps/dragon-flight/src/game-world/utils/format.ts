// Preserve wallet millionths in labels, including fractional bets and payouts.
export function formatLocalAmount(value: number, currency = 'USD') {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		maximumFractionDigits: 6,
		useGrouping: false,
	}).format(value);
}
