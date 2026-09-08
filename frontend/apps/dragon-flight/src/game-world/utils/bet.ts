import { MAX_PROTOTYPE_BET, MIN_PROTOTYPE_BET } from '../config';
import { roundToTwoDecimals } from './number';

export const roundBet = roundToTwoDecimals;

export function clampBet(value: number) {
	return roundBet(Math.min(MAX_PROTOTYPE_BET, Math.max(MIN_PROTOTYPE_BET, value)));
}

export function isBetInputValid(value: string) {
	if (!/^\d+(?:\.\d{0,2})?$/.test(value)) return false;
	const numericValue = Number(value);
	return Number.isFinite(numericValue) && numericValue >= MIN_PROTOTYPE_BET && numericValue <= MAX_PROTOTYPE_BET;
}

export function sanitizeBetInput(value: string, fallback: string) {
	const normalized = value.trim().replace(',', '.');
	return /^\d*(?:\.\d{0,2})?$/.test(normalized) ? normalized : fallback;
}
