<script lang="ts">
	import { getWeather } from '../weather';
	import type { LaunchStyle, WeatherCondition } from '../types';
	import { VFX_ASSETS } from '../vfx';

	type Props = {
		weather: WeatherCondition;
		stageIntensity: number;
		parallaxOffset: number;
		launchStyle: LaunchStyle;
		active: boolean;
	};

	let { weather, stageIntensity, parallaxOffset, launchStyle, active }: Props = $props();
	const presentation = $derived(getWeather(weather));
</script>

<div
	class={`weather-effect ${presentation.className} launch-${launchStyle}`}
	class:active
	style={`--weather-intensity:${presentation.particleIntensity};--weather-wind:${presentation.windIntensity};--weather-fog:${presentation.fogIntensity};--weather-stage:${stageIntensity};--weather-far:${-parallaxOffset * 0.2}px;--weather-near:${-parallaxOffset * 0.62}px;`}
	aria-hidden="true"
>
	<!-- Rain, lightning, and storm-cloud PNGs are omitted because their checkerboards are baked pixels, not transparency. -->
	<div class="weather-tone"></div>
	<div class="weather-back"></div>
	<div class="weather-mid"></div>
	<div class="weather-front"></div>
	{#if weather === 'fog'}
		<img
			class="weather-asset fog-layer fog-primary"
			src={VFX_ASSETS.weather.fogSoft}
			alt=""
			draggable="false"
		/>
		<img
			class="weather-asset fog-layer fog-secondary"
			src={VFX_ASSETS.weather.fogSoft}
			alt=""
			draggable="false"
		/>
	{/if}
	{#if weather === 'inferno'}
		<img
			class="weather-asset inferno-lava-stones"
			src={VFX_ASSETS.lava.stones}
			alt=""
			draggable="false"
		/>
	{/if}
	{#if presentation.lightning}
		<div class="weather-screen-flash"></div>
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
	.weather-asset {
		position: absolute;
		display: block;
		max-width: none;
		user-select: none;
		pointer-events: none;
		will-change: transform, opacity;
	}
	.weather-tone {
		z-index: 1;
		transition:
			background 0.45s ease,
			opacity 0.45s ease;
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
	.weather-screen-flash {
		z-index: 9;
		opacity: 0;
		background: rgba(220, 239, 255, 0.38);
		animation: lightning-screen-cycle 8.4s steps(1, end) infinite;
		will-change: opacity;
	}
	.fog-layer {
		z-index: 7;
		height: auto;
		object-fit: contain;
	}
	.fog-primary {
		bottom: -20%;
		left: -18%;
		width: 122%;
		opacity: calc(0.18 + var(--weather-fog) * 0.14);
		animation: fog-image-drift 17s ease-in-out infinite alternate;
	}
	.fog-secondary {
		top: 8%;
		right: -31%;
		width: 105%;
		opacity: calc(0.1 + var(--weather-stage) * 0.08);
		transform: scale(0.82);
		animation: fog-image-drift-secondary 11s ease-in-out infinite alternate;
	}

	.inferno-lava-stones {
		z-index: 7;
		bottom: -42%;
		left: 8%;
		width: min(84%, 960px);
		height: auto;
		opacity: calc(0.28 + var(--weather-stage) * 0.12);
		animation: inferno-image-rise 9s linear infinite;
	}

	.weather-clear .weather-tone {
		opacity: 0.18;
		background: linear-gradient(rgba(84, 129, 112, 0.08), transparent 58%);
	}
	.weather-clear .weather-back {
		opacity: calc(0.1 + var(--weather-stage) * 0.08);
		background:
			radial-gradient(ellipse at 25% 22%, rgba(198, 220, 205, 0.14), transparent 24%),
			radial-gradient(ellipse at 76% 31%, rgba(185, 215, 201, 0.1), transparent 27%);
		transform: translateX(var(--weather-far));
	}

	.weather-rain .weather-tone {
		opacity: calc(0.18 + var(--weather-stage) * 0.14);
		background: linear-gradient(
			rgba(22, 55, 65, 0.7),
			rgba(19, 47, 45, 0.08) 62%,
			rgba(84, 145, 136, 0.12)
		);
		mix-blend-mode: color;
	}
	.weather-rain .weather-mid {
		top: auto;
		height: 18%;
		opacity: 0.3;
		background: repeating-radial-gradient(
			ellipse at 50% 100%,
			rgba(152, 224, 218, 0.36) 0 2px,
			transparent 3px 25px
		);
		filter: blur(0.6px);
	}

	.weather-storm .weather-tone {
		opacity: calc(0.38 + var(--weather-stage) * 0.2);
		background: radial-gradient(
			ellipse at 50% -12%,
			rgba(12, 20, 32, 0.96),
			rgba(22, 35, 40, 0.68) 40%,
			transparent 76%
		);
	}
	.weather-storm.active {
		animation: storm-pressure 2.6s ease-in-out infinite alternate;
	}

	.weather-fog .weather-tone {
		opacity: calc(0.18 + var(--weather-stage) * 0.1);
		background: rgba(156, 170, 157, 0.16);
	}
	.weather-snow .weather-tone {
		opacity: calc(0.16 + var(--weather-stage) * 0.09);
		background: linear-gradient(rgba(76, 109, 123, 0.32), transparent 62%);
	}
	.weather-snow .weather-back,
	.weather-snow .weather-front {
		background-image:
			radial-gradient(circle, rgba(235, 248, 242, 0.72) 0 1.5px, transparent 2px),
			radial-gradient(circle, rgba(205, 229, 224, 0.58) 0 2px, transparent 2.5px);
		background-size:
			70px 82px,
			115px 126px;
		background-position:
			var(--weather-far) 0,
			var(--weather-near) 24px;
		animation: snow-fall 8s linear infinite;
	}
	.weather-snow .weather-back {
		z-index: 2;
		opacity: calc(0.22 + var(--weather-stage) * 0.15);
		filter: blur(0.5px);
	}
	.weather-snow .weather-front {
		opacity: calc(0.32 + var(--weather-intensity) * 0.28);
		background-size:
			92px 108px,
			148px 164px;
		animation-duration: 5.8s;
	}

	.weather-inferno .weather-tone {
		opacity: calc(0.24 + var(--weather-stage) * 0.24);
		background:
			radial-gradient(ellipse at 50% 110%, rgba(255, 69, 6, 0.55), transparent 54%),
			linear-gradient(rgba(116, 29, 7, 0.16), transparent 52%);
		mix-blend-mode: screen;
	}
	.weather-inferno .weather-mid {
		inset: auto 0 0;
		height: 30%;
		opacity: calc(0.2 + var(--weather-stage) * 0.25);
		background: repeating-radial-gradient(
			ellipse at 50% 100%,
			rgba(255, 89, 9, 0.45) 0 7%,
			transparent 8% 18%
		);
		filter: blur(5px);
		animation: heat-shimmer 1.7s ease-in-out infinite alternate;
	}

	.active.launch-dive.weather-fog .weather-front {
		animation-duration: 3.8s;
		opacity: 0.2;
	}
	.active.launch-glide.weather-snow .weather-front {
		animation-duration: 7.4s;
	}

	@keyframes storm-pressure {
		to {
			transform: translate(-2px, 1px);
		}
	}
	@keyframes fog-image-drift {
		from {
			transform: translate3d(-4%, 2%, 0) scale(1.02);
		}
		to {
			transform: translate3d(16%, -2%, 0) scale(1.08);
		}
	}
	@keyframes fog-image-drift-secondary {
		from {
			transform: translate3d(9%, 0, 0) scale(0.82);
		}
		to {
			transform: translate3d(-16%, 3%, 0) scale(0.88);
		}
	}
	@keyframes snow-fall {
		to {
			background-position:
				calc(var(--weather-far) - 45px) 328px,
				calc(var(--weather-near) + 28px) 276px;
		}
	}
	@keyframes inferno-image-rise {
		from {
			transform: translate3d(-2%, 12%, 0) scale(1.03);
		}
		to {
			transform: translate3d(3%, -17%, 0) scale(1.08);
		}
	}
	@keyframes heat-shimmer {
		to {
			transform: scale(1.03, 1.08) translateY(-5px);
			filter: blur(8px);
		}
	}
	@keyframes lightning-screen-cycle {
		0%,
		61%,
		64%,
		100% {
			opacity: 0;
		}
		62% {
			opacity: calc(0.12 + var(--weather-stage) * 0.12);
		}
		63% {
			opacity: 0.015;
		}
		63.4% {
			opacity: calc(0.06 + var(--weather-stage) * 0.06);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.weather-effect,
		.weather-effect > div,
		.weather-asset {
			animation: none;
		}
		.weather-screen-flash {
			display: none;
		}
	}
</style>
