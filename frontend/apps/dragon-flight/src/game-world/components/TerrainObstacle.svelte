<script lang="ts">
	import type { HazardType, TimeOfDay, WeatherCondition, FlightStageId } from '../types';
	import TerrainSprite from './TerrainSprite.svelte';

	type Props = {
		hazard: HazardType;
		stage: FlightStageId;
		weather: WeatherCondition;
		timeOfDay: TimeOfDay;
		gapTop: number;
		gapBottom: number;
	};
	let { hazard, stage, weather, timeOfDay, gapTop, gapBottom }: Props = $props();
	const material = $derived(hazard === 'forestPass' ? 'tree' : 'rock');
	const snowy = $derived(weather === 'snow' || stage === 'SKY_PEAKS');
</script>

<div class={`terrain-obstacle ${hazard} time-${timeOfDay} weather-${weather}`} aria-hidden="true">
	<div class="terrain-piece upper" style={`height:${Math.max(0, gapTop)}px;`}>
		<TerrainSprite {material} side="upper" {snowy} />
	</div>
	<div class="terrain-piece lower" style={`top:${gapBottom}px;bottom:0;`}>
		<TerrainSprite {material} side="lower" {snowy} />
	</div>
	{#if hazard === 'windPass'}
		<div
			class="wind"
			style={`top:${gapTop + 18}px;height:${Math.max(0, gapBottom - gapTop - 36)}px;`}
		></div>
	{/if}
</div>

<style>
	.terrain-obstacle {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.terrain-piece {
		position: absolute;
		left: 0;
		width: 100%;
		overflow: hidden;
		--light: 1;
		--saturation: 1;
		filter: brightness(var(--light)) saturate(var(--saturation));
	}
	.upper {
		top: 0;
	}
	.weather-rain .terrain-piece {
		--light: 0.88;
		--saturation: 0.85;
	}
	.weather-storm .terrain-piece {
		--light: 0.78;
		--saturation: 0.8;
	}
	.weather-fog .terrain-piece {
		--saturation: 0.65;
		opacity: 0.86;
	}
	.time-dawn .terrain-piece {
		--light: 0.95;
		--saturation: 0.9;
	}
	.time-sunset .terrain-piece {
		--light: 0.88;
		--saturation: 0.85;
	}
	.time-night .terrain-piece {
		--light: 0.6;
		--saturation: 0.65;
	}
	.time-eclipse .terrain-piece {
		--light: 0.68;
		--saturation: 0.7;
	}
	.lavaColumn .terrain-piece {
		filter: brightness(calc(var(--light) * 0.78)) saturate(0.55);
	}
	.wind {
		position: absolute;
		left: -28%;
		width: 156%;
		opacity: 0.45;
		background: repeating-linear-gradient(
			173deg,
			transparent 0 28px,
			#e2f2f6aa 29px 30px,
			transparent 31px 45px
		);
		mask-image: linear-gradient(90deg, transparent, black 40%, transparent);
		animation: wind-drift 1.2s linear infinite;
	}
	@keyframes wind-drift {
		to {
			background-position: -80px 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.wind {
			animation: none;
		}
	}
</style>
