<script lang="ts">
	import { getFinishBackground, LANDING_ANCHOR, type SuccessfulEnding } from '../backgrounds';
	import TimeOfDayEffect from './TimeOfDayEffect.svelte';
	import type { TimeOfDay, WeatherCondition } from '../types';
	let {
		ending,
		weather,
		timeOfDay,
	}: { ending: SuccessfulEnding; weather: WeatherCondition; timeOfDay: TimeOfDay } = $props();
</script>

<div class={`result-scenery weather-${weather}`} aria-hidden="true">
	<img
		src={getFinishBackground(ending, weather, timeOfDay)}
		alt=""
		style={`object-position:${LANDING_ANCHOR.x * 100}% ${LANDING_ANCHOR.y * 100}%;`}
	/>
	{#if timeOfDay !== 'night'}<TimeOfDayEffect {timeOfDay} />{/if}
	<div class="weather-tone"></div>
	<div class="scrim"></div>
</div>

<style>
	.result-scenery {
		position: absolute;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		pointer-events: none;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.weather-tone,
	.scrim {
		position: absolute;
		inset: 0;
		z-index: 2;
	}
	.weather-rain .weather-tone {
		background: #253d5140;
	}
	.weather-storm .weather-tone {
		background: #14273b77;
	}
	.weather-fog .weather-tone {
		background: #c4d1d355;
	}
	.scrim {
		z-index: 3;
		background: linear-gradient(#071d2b55, #071b1ecd 48%, #071916ed);
	}
</style>
