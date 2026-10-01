<script lang="ts">
	import { getWeather } from '../weather';
	import type { LaunchStyle, WeatherCondition } from '../types';

	type Props = {
		weather: WeatherCondition;
		stageIntensity: number;
		parallaxOffset: number;
		launchStyle: LaunchStyle;
		active: boolean;
		finishScene?: boolean;
		onThunder?: () => void;
	};

	let {
		weather,
		stageIntensity,
		parallaxOffset,
		launchStyle,
		active,
		finishScene = false,
		onThunder,
	}: Props = $props();
	const presentation = $derived(getWeather(weather));
	let lightningVisible = $state(false);

	$effect(() => {
		if (weather !== 'storm') {
			lightningVisible = false;
			return;
		}

		let cancelled = false;
		let flashTimer: ReturnType<typeof setTimeout>;
		let hideTimer: ReturnType<typeof setTimeout>;

		function scheduleFlash() {
			const delay = 2800 + Math.random() * 6200;
			flashTimer = setTimeout(() => {
				if (cancelled) return;
				lightningVisible = true;
				onThunder?.();
				hideTimer = setTimeout(
					() => {
						lightningVisible = false;
						if (!cancelled) scheduleFlash();
					},
					90 + Math.random() * 90,
				);
			}, delay);
		}

		scheduleFlash();
		return () => {
			cancelled = true;
			clearTimeout(flashTimer);
			clearTimeout(hideTimer);
		};
	});
</script>

<div
	class={`weather-effect ${presentation.className} launch-${launchStyle}`}
	class:active
	class:finish-scene={finishScene}
	style={`--weather-intensity:${presentation.particleIntensity};--weather-stage:${stageIntensity};--weather-far:${-parallaxOffset * 0.2}px;--weather-near:${-parallaxOffset * 0.62}px;`}
	aria-hidden="true"
>
	{#if finishScene}<div class="finish-weather-tone"></div>{/if}
	<div class="weather-back"></div>
	<div class="weather-mid"></div>
	<div class="weather-front"></div>
	{#if weather === 'rain' || weather === 'storm'}
		<div class="rain-layer" class:storm-rain={weather === 'storm'}>
			{#each Array.from({ length: 32 }, (_, i) => i) as drop (drop)}
				<span
					class="raindrop"
					style={`--drop-x:${(drop * 37 + 11) % 100}%;--drop-delay:${-((drop * 0.173) % 1.5)}s;--drop-duration:${0.85 + (drop % 5) * 0.13}s;--drop-length:${10 + (drop % 4) * 4}px;--drop-opacity:${0.16 + (drop % 3) * 0.07};`}
				></span>
			{/each}
		</div>
	{/if}

	{#if weather === 'storm'}
		<div class:visible={lightningVisible} class="weather-screen-flash"></div>
	{/if}
</div>

<style>
	.weather-effect,
	.weather-effect > div {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.weather-back {
		z-index: 2;
	}

	.weather-mid {
		z-index: 4;
	}

	.weather-front {
		z-index: 8;
	}

	.rain-layer {
		z-index: 8;
	}
	.raindrop {
		position: absolute;
		left: var(--drop-x);
		top: -28px;
		width: 1px;
		height: calc(100% + 56px);
		opacity: var(--drop-opacity);
		animation: rain-fall var(--drop-duration) linear var(--drop-delay) infinite;
	}
	.raindrop::before {
		content: '';
		position: absolute;
		width: 100%;
		height: var(--drop-length);
		border-radius: 2px;
		background: linear-gradient(transparent, #dfedff);
		transform: rotate(12deg);
	}
	.storm-rain .raindrop {
		width: 1.5px;
		opacity: calc(var(--drop-opacity) + 0.1);
		animation-duration: calc(var(--drop-duration) * 0.8);
	}
	.finish-weather-tone {
		z-index: 1;
	}
	.weather-rain .finish-weather-tone {
		background: #253d5140;
	}
	.weather-storm .finish-weather-tone {
		background: linear-gradient(#14273b99, #263c4e66);
	}
	.weather-fog .finish-weather-tone {
		background: linear-gradient(#c4d1d333, #c4d1d388);
	}
	@keyframes rain-fall {
		to {
			transform: translate3d(-32px, 100%, 0);
		}
	}

	.weather-screen-flash {
		z-index: 9;
		opacity: 0;
		background: rgba(220, 239, 255, 0.34);
		transition: opacity 35ms linear;
		will-change: opacity;
	}

	.weather-screen-flash.visible {
		opacity: calc(0.12 + var(--weather-stage) * 0.12);
	}

	.weather-snow .weather-back,
	.weather-snow .weather-front {
		background-image:
			radial-gradient(circle at 8% 14%, rgba(255, 255, 255, 0.96) 0 3px, transparent 4px),
			radial-gradient(circle at 21% 62%, rgba(235, 249, 255, 0.88) 0 2px, transparent 3px),
			radial-gradient(circle at 38% 27%, rgba(255, 255, 255, 0.92) 0 4px, transparent 5px),
			radial-gradient(circle at 54% 78%, rgba(225, 245, 255, 0.82) 0 2px, transparent 3px),
			radial-gradient(circle at 69% 18%, rgba(255, 255, 255, 0.94) 0 3px, transparent 4px),
			radial-gradient(circle at 86% 52%, rgba(230, 247, 255, 0.84) 0 2px, transparent 3px);
		background-size: 100% 100%;
		background-repeat: no-repeat;
		animation: snow-fall 8s linear infinite;
		will-change: transform, opacity;
	}

	.weather-snow .weather-back {
		opacity: calc(0.42 + var(--weather-stage) * 0.14);
	}

	.weather-snow .weather-front {
		opacity: calc(0.5 + var(--weather-intensity) * 0.2);
		transform: translate3d(28px, -48px, 0) scale(1.18);
		animation-duration: 5.8s;
	}

	.active.launch-glide.weather-snow .weather-front {
		animation-duration: 7.4s;
	}

	@keyframes snow-fall {
		to {
			transform: translate3d(-34px, 300px, 0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.weather-effect,
		.weather-effect > div {
			animation: none;
		}

		.rain-layer,
		.weather-screen-flash {
			display: none;
		}
	}
</style>
