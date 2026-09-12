import { base } from '$app/paths';
import type { FlightEnding, TimeOfDay, WeatherCondition } from './types';

export type SuccessfulEnding = Exclude<FlightEnding, 'crash'>;
export const LANDING_ANCHOR = { x: 0.73, y: 0.68 } as const;

const FINISH_BACKGROUNDS: Record<SuccessfulEnding, string> = {
	safeLanding: 'meadow',
	meadowLanding: 'meadow',
	hiddenValley: 'meadow',
	ridgeLanding: 'ridge',
	summitLanding: 'summit',
};

export function getFinishBackground(
	ending: SuccessfulEnding,
	weather: WeatherCondition,
	time: TimeOfDay,
): string {
	const name = weather === 'snow' ? 'summit' : FINISH_BACKGROUNDS[ending];
	return `${base}/finishes/generated/${name}${time === 'night' ? '-night' : ''}.png`;
}

const TIME_BACKGROUNDS: Record<TimeOfDay, string> = {
	day: 'clear-day',
	dawn: 'dawn',
	sunset: 'sunset',
	night: 'night',
	eclipse: 'eclipse',
};

export function getLandscapeBackground(weather: WeatherCondition, time: TimeOfDay): string {
	const name = weather === 'clear' ? TIME_BACKGROUNDS[time] : weather;
	return `${base}/backgrounds/generated/${name}.png`;
}
