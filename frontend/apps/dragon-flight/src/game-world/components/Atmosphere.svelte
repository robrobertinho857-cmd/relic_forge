<script lang="ts">
	import type { LaunchStyle, TimeOfDay, WeatherCondition } from '../types';
	import TimeOfDayEffect from './TimeOfDayEffect.svelte';
	import WeatherEffect from './WeatherEffect.svelte';

	type Props = {
		weather: WeatherCondition;
		timeOfDay: TimeOfDay;
		stageIntensity: number;
		parallaxOffset: number;
		launchStyle: LaunchStyle;
		active: boolean;
		finishScene?: boolean;
	};

	let {
		weather,
		timeOfDay,
		stageIntensity,
		parallaxOffset,
		launchStyle,
		active,
		finishScene = false,
	}: Props = $props();
</script>

<!-- Clear scenes already contain their generated time-of-day lighting. -->
{#if finishScene ? timeOfDay !== 'night' : weather !== 'clear'}<TimeOfDayEffect {timeOfDay} />{/if}
<WeatherEffect {weather} {stageIntensity} {parallaxOffset} {launchStyle} {active} {finishScene} />
