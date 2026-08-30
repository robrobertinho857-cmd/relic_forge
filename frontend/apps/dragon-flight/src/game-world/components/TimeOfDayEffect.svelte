<script lang="ts">
	import { getTimeOfDay } from '../timeOfDay';
	import type { TimeOfDay, WeatherCondition } from '../types';

	type Props = {
		timeOfDay: TimeOfDay;
		weather: WeatherCondition;
		stageIntensity: number;
		parallaxOffset: number;
	};

	let { timeOfDay, weather, stageIntensity, parallaxOffset }: Props = $props();
	const presentation = $derived(getTimeOfDay(timeOfDay));
</script>

<div
	class={`time-effect ${presentation.overlayClass} with-${weather}`}
	style={`--time-stage:${stageIntensity};--time-scroll:${-parallaxOffset * 0.08}px;`}
	aria-hidden="true"
>
	<div class="time-tone"></div>
	<div class="time-horizon"></div>
	<div class="time-celestial"><i></i></div>
	<div class="time-haze"></div>
</div>

<style>
	.time-effect, .time-effect > div { position: absolute; inset: 0; pointer-events: none; }
	.time-effect { z-index: 1; overflow: hidden; }
	.time-tone { filter: brightness(var(--time-ambient, 1)) contrast(var(--time-contrast, 1)) sepia(var(--time-warmth, 0)); transition: background 0.45s ease, opacity 0.45s ease, filter 0.45s ease; }
	.time-horizon { top: 32%; transition: background 0.45s ease, opacity 0.45s ease; }
	.time-celestial { overflow: hidden; filter: brightness(var(--time-glow, 1)); }
	.time-celestial i { position: absolute; display: block; border-radius: 50%; }
	.time-haze { background-position-x: var(--time-scroll); opacity: var(--time-haze, 0.1); transition: opacity 0.45s ease; }

	.time-day .time-tone { opacity: 0.08; background: linear-gradient(rgba(174, 209, 191, 0.18), transparent 58%); mix-blend-mode: screen; }
	.time-day .time-horizon { opacity: 0.11; background: radial-gradient(ellipse at 50% 100%, rgba(187, 216, 190, 0.24), transparent 58%); }

	.time-dawn .time-tone { opacity: 0.34; background: linear-gradient(rgba(76, 111, 137, 0.3), transparent 50%); mix-blend-mode: color; }
	.time-dawn .time-horizon { opacity: calc(0.34 + var(--time-stage) * 0.08); background: radial-gradient(ellipse at 22% 100%, rgba(255, 190, 119, 0.55), rgba(190, 121, 109, 0.18) 36%, transparent 68%); }
	.time-dawn .time-haze { top: 35%; opacity: 0.24; background: repeating-radial-gradient(ellipse at 50% 90%, rgba(211, 217, 202, 0.3) 0 13%, transparent 14% 29%); filter: blur(8px); }

	.time-sunset .time-tone { opacity: calc(0.28 + var(--time-stage) * 0.12); background: linear-gradient(rgba(96, 23, 17, 0.38), transparent 53%, rgba(220, 91, 22, 0.14)); mix-blend-mode: color; }
	.time-sunset .time-horizon { opacity: 0.62; background: radial-gradient(ellipse at 18% 105%, rgba(255, 122, 39, 0.68), rgba(185, 46, 24, 0.25) 39%, transparent 67%); }
	.time-sunset .time-celestial i { left: 17%; top: 27%; width: clamp(38px, 7vw, 78px); aspect-ratio: 1; background: #ffbd57; box-shadow: 0 0 42px rgba(255, 109, 31, 0.65); }

	.time-night .time-tone { opacity: calc(0.48 + var(--time-stage) * 0.08); background: radial-gradient(circle at 80% 16%, rgba(82, 116, 157, 0.18), transparent 24%), linear-gradient(rgba(2, 8, 25, 0.82), rgba(3, 13, 25, 0.4) 65%, transparent); }
	.time-night .time-celestial i { right: 13%; top: 10%; width: clamp(34px, 6vw, 68px); aspect-ratio: 1; border: 1px solid rgba(202, 225, 226, 0.5); background: radial-gradient(circle at 38% 38%, #dbe3d8, #899ca6 58%, #354555); box-shadow: 0 0 33px rgba(158, 201, 218, 0.34); opacity: 0.65; }
	.time-night .time-horizon { opacity: 0.18; background: radial-gradient(ellipse at 50% 105%, rgba(65, 113, 129, 0.42), transparent 58%); }

	.time-eclipse .time-tone { opacity: calc(0.58 + var(--time-stage) * 0.1); background: radial-gradient(circle at 68% 24%, transparent 0 8%, rgba(85, 3, 4, 0.28) 19%, transparent 37%), linear-gradient(rgba(8, 2, 8, 0.88), rgba(25, 4, 6, 0.53) 68%, transparent); }
	.time-eclipse .time-celestial i { right: 25%; top: 13%; width: clamp(52px, 9vw, 106px); aspect-ratio: 1; border: 3px solid #b84928; background: #020202; box-shadow: 0 0 9px #ff7b3c, 0 0 36px rgba(196, 37, 21, 0.75), 0 0 65px rgba(123, 24, 28, 0.5); }
	.time-eclipse .time-horizon { opacity: 0.28; background: radial-gradient(ellipse at 50% 110%, rgba(143, 24, 14, 0.5), transparent 61%); }

	.time-dawn.with-fog .time-haze { opacity: 0.38; }
	.time-sunset.with-rain .time-horizon { mix-blend-mode: screen; }
	.time-night.with-storm .time-tone { opacity: calc(0.54 + var(--time-stage) * 0.12); }
	.time-day.with-snow .time-tone { opacity: 0.04; }
	.time-eclipse.with-inferno .time-horizon { opacity: 0.44; filter: saturate(1.4); }

	@media (prefers-reduced-motion: reduce) { .time-tone, .time-horizon, .time-haze { transition: none; } }
</style>
