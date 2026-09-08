export function formatLocalAmount(value: number) {
	return `$${value.toFixed(2)}`;
}

export function formatEventName(value: string) {
	return value.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
}
