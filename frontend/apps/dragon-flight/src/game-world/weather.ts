import type { WeatherCondition } from './types';

export type WeatherPresentation = {
	id: WeatherCondition;
	name: string;
	description: string;
	className: string;
	particleIntensity: number;
	windIntensity: number;
	fogIntensity: number;
	lightning: boolean;
};

export const WEATHER_OPTIONS: readonly WeatherPresentation[] = [
	{
		id: 'clear',
		name: 'CLEAR',
		description: 'Clean visibility',
		className: 'weather-clear',
		particleIntensity: 0.12,
		windIntensity: 0.08,
		fogIntensity: 0.08,
		lightning: false,
	},
	{
		id: 'rain',
		name: 'RAIN',
		description: 'Cool rain and wet glow',
		className: 'weather-rain',
		particleIntensity: 0.58,
		windIntensity: 0.32,
		fogIntensity: 0.18,
		lightning: false,
	},
	{
		id: 'storm',
		name: 'STORM',
		description: 'Heavy rain and lightning',
		className: 'weather-storm',
		particleIntensity: 0.9,
		windIntensity: 0.88,
		fogIntensity: 0.28,
		lightning: true,
	},
	{
		id: 'fog',
		name: 'FOG',
		description: 'Layered atmospheric depth',
		className: 'weather-fog',
		particleIntensity: 0.08,
		windIntensity: 0.14,
		fogIntensity: 0.82,
		lightning: false,
	},
	{
		id: 'snow',
		name: 'SNOW',
		description: 'Cold drifting snowfall',
		className: 'weather-snow',
		particleIntensity: 0.66,
		windIntensity: 0.2,
		fogIntensity: 0.2,
		lightning: false,
	},
	{
		id: 'inferno',
		name: 'INFERNO',
		description: 'Ash, embers and forge heat',
		className: 'weather-inferno',
		particleIntensity: 0.84,
		windIntensity: 0.24,
		fogIntensity: 0.16,
		lightning: false,
	},
] as const;

export function getWeather(condition: WeatherCondition): WeatherPresentation {
	return WEATHER_OPTIONS.find((weather) => weather.id === condition) ?? WEATHER_OPTIONS[0];
}
