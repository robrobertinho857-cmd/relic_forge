const amountFormat = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
	useGrouping: false,
});

export function formatLocalAmount(value: number) {
	return `$${amountFormat.format(value)}`;
}
