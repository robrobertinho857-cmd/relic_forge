const zeroFractionCurrencies = new Set(['JPY', 'KRW']);

export const formatCurrency = (amount: number, currency = 'USD') => {
	const code = currency.toUpperCase();
	const fractionDigits = zeroFractionCurrencies.has(code) ? 0 : 2;
	return new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: code,
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
	}).format(Number.isFinite(amount) ? amount : 0);
};
