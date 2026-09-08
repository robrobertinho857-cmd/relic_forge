<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { TimeOfDay, WeatherCondition } from '../types';
	import { TIME_BACKGROUNDS } from '../timeBackgrounds';
	import { WEATHER_BACKGROUNDS } from '../weatherBackgrounds';

	type Props = {
		weather: WeatherCondition;
		timeOfDay: TimeOfDay;
	};

	let { weather, timeOfDay }: Props = $props();
	const timeBackground = $derived(TIME_BACKGROUNDS[timeOfDay]);
	const weatherBackground = $derived(WEATHER_BACKGROUNDS[weather]);
	const showWeatherTexture = $derived(weather !== 'clear' && weather !== 'inferno');
</script>

<div class={`weather-background weather-${weather}`} aria-hidden="true">
	{#key timeBackground}
		<img
			class="time-background-image"
			src={timeBackground}
			alt=""
			draggable="false"
			in:fade={{ duration: 560 }}
			out:fade={{ duration: 560 }}
		/>
	{/key}
	{#if showWeatherTexture}
		{#key weatherBackground}
			<img
				class="weather-texture-image"
				src={weatherBackground}
				alt=""
				draggable="false"
				in:fade={{ duration: 560 }}
				out:fade={{ duration: 560 }}
			/>
		{/key}
	{/if}
</div>

<style>
	.weather-background {
		position: absolute;
		z-index: 0;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.weather-background img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.weather-background img {
		display: block;
		object-fit: cover;
		object-position: center;
		user-select: none;
		will-change: opacity;
	}

	.weather-texture-image {
		z-index: 1;
		opacity: 0.2;
	}
	.weather-rain .weather-texture-image {
		opacity: 0.24;
	}
	.weather-storm .weather-texture-image {
		opacity: 0.27;
	}
	.weather-fog .weather-texture-image {
		opacity: 0.25;
	}
	.weather-snow .weather-texture-image {
		opacity: 0.2;
	}
	.weather-inferno .weather-texture-image {
		opacity: 0.34;
	}

	@media (prefers-reduced-motion: reduce) {
		.weather-background img {
			transition: none;
		}
	}
</style>
