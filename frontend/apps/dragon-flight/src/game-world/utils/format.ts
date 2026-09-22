const amountFormat = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
	useGrouping: false,
});

export function formatLocalAmount(value: number, currency = 'USD') {
	return currency === 'USD'
		? '$' + amountFormat.format(value)
		: `${amountFormat.format(value)} ${currency}`;
}
