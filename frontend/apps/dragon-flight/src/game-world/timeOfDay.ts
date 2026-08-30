import type { TimeOfDay } from './types';

export type TimeOfDayPresentation = {
	id: TimeOfDay;
	name: string;
	description: string;
	ambientBrightness: number;
	warmth: number;
	contrast: number;
	haze: number;
	glowStrength: number;
	overlayClass: string;
};

export const TIME_OF_DAY_OPTIONS: readonly TimeOfDayPresentation[] = [
	{
		id: 'dawn',
		name: 'DAWN',
		description: 'Pale horizon and gentle mist',
		ambientBrightness: 0.9,
		warmth: 0.22,
		contrast: 0.96,
		haze: 0.32,
		glowStrength: 1.05,
		overlayClass: 'time-dawn',
	},
	{
		id: 'day',
		name: 'DAY',
		description: 'Bright neutral visibility',
		ambientBrightness: 1,
		warmth: 0,
		contrast: 1,
		haze: 0.08,
		glowStrength: 1,
		overlayClass: 'time-day',
	},
	{
		id: 'sunset',
		name: 'SUNSET',
		description: 'Warm dramatic horizon',
		ambientBrightness: 0.82,
		warmth: 0.54,
		contrast: 1.08,
		haze: 0.2,
		glowStrength: 1.15,
		overlayClass: 'time-sunset',
	},
	{
		id: 'night',
		name: 'NIGHT',
		description: 'Dark moonlit contrast',
		ambientBrightness: 0.66,
		warmth: 0,
		contrast: 1.22,
		haze: 0.12,
		glowStrength: 1.35,
		overlayClass: 'time-night',
	},
	{
		id: 'eclipse',
		name: 'ECLIPSE',
		description: 'Dark halo atmosphere',
		ambientBrightness: 0.52,
		warmth: 0.3,
		contrast: 1.34,
		haze: 0.08,
		glowStrength: 1.5,
		overlayClass: 'time-eclipse',
	},
] as const;

export function getTimeOfDay(timeOfDay: TimeOfDay): TimeOfDayPresentation {
	return TIME_OF_DAY_OPTIONS.find((option) => option.id === timeOfDay) ?? TIME_OF_DAY_OPTIONS[1];
}
