<script lang="ts">
	import type { EncounterType } from '../types';
	import { ENCOUNTER_LABELS } from '../presentation';

	type Props = {
		encounterType: EncounterType;
		result: 'pass' | 'crash';
		phase: 'enter' | 'engage' | 'resolve';
	};

	let { encounterType, result, phase }: Props = $props();
</script>

<div class={`encounter-event ${encounterType} ${phase} ${result}`}>
	<svg class="encounter-silhouette" viewBox="0 0 400 260" aria-hidden="true">
		<path
			class="wings"
			d="m185 130-44-54L0 20l58 105 91 31 37 17 22-8 42-3 70 32 80-50-132-29-56 15Z"
		/>
		<path class="body" d="m90 151 89-26 54 8 21-28 35-9 28 18-39 6-23 32-45 17-84-8-62 16Z" />
		<path class="tail" d="m173 143-47 22-57 28 27-32-43 9 42-27Z" />
		<circle cx="281" cy="106" r="3" fill="#e0d5a4" />
	</svg>
	<div class="encounter-label">
		<strong>{ENCOUNTER_LABELS[encounterType]}</strong><span
			>{phase === 'resolve' ? result.toUpperCase() : 'ENCOUNTER'}</span
		>
	</div>
</div>

<style>
	.encounter-event {
		position: absolute;
		z-index: 10;
		inset: 0;
		overflow: hidden;
		color: #aaae9a;
		pointer-events: none;
	}
	.encounter-silhouette {
		position: absolute;
		right: -2%;
		top: 18%;
		width: clamp(190px, 38%, 410px);
		height: 55%;
		opacity: 0.96;
		filter: drop-shadow(0 8px 8px #16242a55);
		transform: translateX(115%);
		animation: encounter-enter calc(0.38s / var(--playback-speed, 1)) ease-out forwards;
	}
	.wings {
		fill: #405652;
	}
	.body {
		fill: #718276;
	}
	.tail {
		fill: #52675c;
	}
	.mountainRaptor .wings {
		fill: #665d4d;
	}
	.mountainRaptor .body {
		fill: #9b8c70;
	}
	.mountainRaptor .tail {
		fill: #7b715c;
	}
	.encounter-label {
		position: absolute;
		top: 38%;
		left: 49%;
		display: grid;
		gap: 5px;
		padding: 9px 13px;
		border-left: 2px solid #d6b37b;
		border-radius: 4px;
		background: #1a2a30e8;
	}
	.encounter-label strong {
		color: #f1e4c8;
		font:
			800 0.72rem/1 system-ui,
			sans-serif;
		letter-spacing: 0.08em;
	}
	.encounter-label span {
		font:
			700 0.56rem/1 system-ui,
			sans-serif;
		letter-spacing: 0.12em;
	}
	.engage .encounter-silhouette {
		transform: translateX(0);
		animation: encounter-swoop calc(0.32s / var(--playback-speed, 1)) ease-in-out infinite alternate;
	}
	.resolve.pass .encounter-silhouette {
		animation: encounter-pass calc(0.48s / var(--playback-speed, 1)) ease-in forwards;
	}
	.resolve.crash .encounter-silhouette {
		animation: encounter-crash calc(0.42s / var(--playback-speed, 1)) ease-in forwards;
	}
	.resolve.pass .encounter-label {
		color: #b3d7b5;
	}
	@keyframes encounter-enter {
		to {
			transform: translateX(0);
		}
	}
	@keyframes encounter-swoop {
		to {
			transform: translate(-2.5%, 1%) rotate(-6deg);
		}
	}
	@keyframes encounter-pass {
		to {
			opacity: 0;
			transform: translate(28%, -20%) scale(0.8);
		}
	}
	@keyframes encounter-crash {
		to {
			transform: translateX(-8%) scale(1.12);
		}
	}
	@media (max-width: 620px) {
		.encounter-label {
			top: 42%;
			left: 32%;
		}
		.encounter-silhouette {
			width: 58%;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.encounter-silhouette,
		.engage .encounter-silhouette,
		.resolve.pass .encounter-silhouette,
		.resolve.crash .encounter-silhouette {
			animation: none;
			transform: none;
		}
	}
</style>
