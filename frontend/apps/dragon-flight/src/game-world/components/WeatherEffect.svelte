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
	};

	let {
		weather,
		stageIntensity,
		parallaxOffset,
		launchStyle,
		active,
		finishScene = false,
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

	.weather-rain .weather-back,
	.weather-storm .weather-back {
		opacity: 0;
	}

	.weather-rain .weather-front,
	.weather-storm .weather-front {
		opacity: 0;
	}
	.finish-scene.weather-rain .weather-front,
	.finish-scene.weather-storm .weather-front {
		opacity: 0.28;
		background-image: repeating-linear-gradient(
			108deg,
			transparent 0 64px,
			#daeafa88 65px,
			transparent 66px 116px
		);
		background-size: 190px 130px;
		mask-image: repeating-linear-gradient(
			0deg,
			transparent 0 14px,
			black 16px 32px,
			transparent 34px 70px
		);
		animation: rain-fall 0.65s linear infinite;
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
			background-position: -40px 130px;
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

		.weather-screen-flash {
			display: none;
		}
	}
</style>
