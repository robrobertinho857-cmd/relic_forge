<script lang="ts">
	import { getWeather } from '../weather';
	import type { LaunchStyle, WeatherCondition } from '../types';

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
	<div class="weather-tone"></div>
	<div class="weather-back"></div>
	<div class="weather-mid"></div>
	<div class="weather-front"></div>
	{#if presentation.lightning}<div class="weather-lightning"></div>{/if}
</div>

<style>
	.weather-effect, .weather-effect > div { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
	.weather-effect { filter: brightness(var(--time-ambient, 1)) contrast(var(--time-contrast, 1)) sepia(var(--time-warmth, 0)) saturate(var(--time-glow, 1)); transition: filter 0.45s ease; }
	.weather-tone { z-index: 1; transition: background 0.45s ease, opacity 0.45s ease; }
	.weather-back { z-index: 2; }
	.weather-mid { z-index: 4; }
	.weather-front { z-index: 8; }
	.weather-lightning { z-index: 9; opacity: 0; background: linear-gradient(112deg, transparent 0 46%, rgba(228, 242, 255, 0.86) 48%, transparent 50%), rgba(199, 221, 255, 0.16); mix-blend-mode: screen; animation: lightning-cycle 8.4s steps(1, end) infinite; }

	.weather-clear .weather-tone { opacity: 0.18; background: linear-gradient(rgba(84, 129, 112, 0.08), transparent 58%); }
	.weather-clear .weather-back { opacity: calc(0.1 + var(--weather-stage) * 0.08); background: radial-gradient(ellipse at 25% 22%, rgba(198, 220, 205, 0.14), transparent 24%), radial-gradient(ellipse at 76% 31%, rgba(185, 215, 201, 0.1), transparent 27%); transform: translateX(var(--weather-far)); }

	.weather-rain .weather-tone { opacity: calc(0.18 + var(--weather-stage) * 0.14); background: linear-gradient(rgba(22, 55, 65, 0.7), rgba(19, 47, 45, 0.08) 62%, rgba(84, 145, 136, 0.12)); mix-blend-mode: color; }
	.weather-rain .weather-back, .weather-storm .weather-back { opacity: calc(0.3 + var(--weather-intensity) * 0.34 + var(--weather-stage) * 0.14); background-image: repeating-linear-gradient(106deg, transparent 0 18px, rgba(176, 220, 226, 0.42) 19px 20px, transparent 21px 37px); background-position: var(--weather-far) 0; background-size: 160px 120px; animation: rain-fall 0.72s linear infinite; }
	.weather-rain .weather-front, .weather-storm .weather-front { opacity: calc(0.2 + var(--weather-intensity) * 0.38 + var(--weather-stage) * 0.12); background-image: repeating-linear-gradient(108deg, transparent 0 28px, rgba(209, 239, 241, 0.55) 29px 31px, transparent 32px 54px); background-position: var(--weather-near) 0; background-size: 230px 160px; animation: rain-fall 0.48s linear infinite; }
	.weather-rain .weather-mid { top: auto; height: 18%; opacity: 0.3; background: repeating-radial-gradient(ellipse at 50% 100%, rgba(152, 224, 218, 0.36) 0 2px, transparent 3px 25px); filter: blur(0.6px); }

	.weather-storm .weather-tone { opacity: calc(0.38 + var(--weather-stage) * 0.2); background: radial-gradient(ellipse at 50% -12%, rgba(12, 20, 32, 0.96), rgba(22, 35, 40, 0.68) 40%, transparent 76%); }
	.weather-storm .weather-back { animation-duration: 0.42s; }
	.weather-storm .weather-front { animation-duration: 0.28s; filter: brightness(0.9); }
	.weather-storm .weather-mid { opacity: calc(0.26 + var(--weather-stage) * 0.28); background: repeating-linear-gradient(171deg, transparent 0 33px, rgba(125, 211, 207, 0.45) 34px 36px, transparent 37px 66px); animation: storm-wind 0.55s linear infinite; }
	.weather-storm.active { animation: storm-pressure 2.6s ease-in-out infinite alternate; }

	.weather-fog .weather-tone { opacity: calc(0.18 + var(--weather-stage) * 0.1); background: rgba(156, 170, 157, 0.16); }
	.weather-fog .weather-back, .weather-fog .weather-mid, .weather-fog .weather-front { background-repeat: repeat-x; background-size: 620px 100%; filter: blur(10px); }
	.weather-fog .weather-back { opacity: calc(0.25 + var(--weather-fog) * 0.25); background-image: radial-gradient(ellipse at 25% 46%, rgba(198, 207, 194, 0.48), transparent 42%), radial-gradient(ellipse at 78% 57%, rgba(177, 194, 181, 0.4), transparent 38%); background-position: var(--weather-far) 0; animation: fog-drift 13s linear infinite; }
	.weather-fog .weather-mid { opacity: calc(0.18 + var(--weather-stage) * 0.12); background-image: radial-gradient(ellipse at 42% 68%, rgba(220, 222, 205, 0.44), transparent 39%); background-position: var(--weather-near) 0; animation: fog-drift 8s linear infinite reverse; }
	.weather-fog .weather-front { top: 28%; opacity: calc(0.1 + var(--weather-stage) * 0.08); background-image: radial-gradient(ellipse at 62% 63%, rgba(225, 227, 213, 0.4), transparent 34%); animation: fog-drift 6s linear infinite; }

	.weather-snow .weather-tone { opacity: calc(0.16 + var(--weather-stage) * 0.09); background: linear-gradient(rgba(76, 109, 123, 0.32), transparent 62%); }
	.weather-snow .weather-back, .weather-snow .weather-front { background-image: radial-gradient(circle, rgba(235, 248, 242, 0.72) 0 1.5px, transparent 2px), radial-gradient(circle, rgba(205, 229, 224, 0.58) 0 2px, transparent 2.5px); background-size: 70px 82px, 115px 126px; background-position: var(--weather-far) 0, var(--weather-near) 24px; animation: snow-fall 8s linear infinite; }
	.weather-snow .weather-back { z-index: 2; opacity: calc(0.22 + var(--weather-stage) * 0.15); filter: blur(0.5px); }
	.weather-snow .weather-front { opacity: calc(0.32 + var(--weather-intensity) * 0.28); background-size: 92px 108px, 148px 164px; animation-duration: 5.8s; }

	.weather-inferno .weather-tone { opacity: calc(0.24 + var(--weather-stage) * 0.24); background: radial-gradient(ellipse at 50% 110%, rgba(255, 69, 6, 0.55), transparent 54%), linear-gradient(rgba(116, 29, 7, 0.16), transparent 52%); mix-blend-mode: screen; }
	.weather-inferno .weather-back, .weather-inferno .weather-front { background-image: radial-gradient(circle, #ffb12f 0 1px, transparent 2px), radial-gradient(circle, rgba(225, 92, 30, 0.82) 0 2px, transparent 3px), radial-gradient(circle, rgba(72, 61, 49, 0.72) 0 2px, transparent 3px); background-size: 62px 84px, 107px 133px, 145px 171px; background-position: var(--weather-far) 0, var(--weather-near) 25px, 30px 47px; animation: inferno-rise 5.2s linear infinite; }
	.weather-inferno .weather-back { opacity: calc(0.3 + var(--weather-stage) * 0.22); }
	.weather-inferno .weather-front { opacity: calc(0.28 + var(--weather-intensity) * 0.27); filter: blur(0.4px); animation-duration: 3.4s; }
	.weather-inferno .weather-mid { inset: auto 0 0; height: 30%; opacity: calc(0.2 + var(--weather-stage) * 0.25); background: repeating-radial-gradient(ellipse at 50% 100%, rgba(255, 89, 9, 0.45) 0 7%, transparent 8% 18%); filter: blur(5px); animation: heat-shimmer 1.7s ease-in-out infinite alternate; }

	.active.launch-boost.weather-rain .weather-front, .active.launch-boost.weather-storm .weather-front { animation-duration: 0.22s; }
	.active.launch-dive.weather-fog .weather-front { animation-duration: 3.8s; opacity: 0.2; }
	.active.launch-glide.weather-snow .weather-front { animation-duration: 7.4s; }

	@keyframes rain-fall { to { background-position: calc(var(--weather-near) - 120px) 240px; } }
	@keyframes storm-wind { to { background-position: -110px 0; } }
	@keyframes storm-pressure { to { transform: translate(-2px, 1px); } }
	@keyframes fog-drift { to { background-position-x: calc(var(--weather-far) - 620px); } }
	@keyframes snow-fall { to { background-position: calc(var(--weather-far) - 45px) 328px, calc(var(--weather-near) + 28px) 276px; } }
	@keyframes inferno-rise { to { background-position: var(--weather-far) -336px, var(--weather-near) -399px, 60px -342px; } }
	@keyframes heat-shimmer { to { transform: scale(1.03, 1.08) translateY(-5px); filter: blur(8px); } }
	@keyframes lightning-cycle { 0%, 61%, 64%, 100% { opacity: 0; } 62% { opacity: calc(0.28 + var(--weather-stage) * 0.32); } 63% { opacity: 0.05; } 63.4% { opacity: calc(0.16 + var(--weather-stage) * 0.2); } }

	@media (prefers-reduced-motion: reduce) {
		.weather-effect, .weather-effect > div { animation: none; }
		.weather-effect { transition: none; }
		.weather-lightning { display: none; }
	}
</style>
