<script lang="ts">
	import { getTimeOfDay } from '../timeOfDay';
	import type { TimeOfDay } from '../types';

	type Props = {
		timeOfDay: TimeOfDay;
	};

	let { timeOfDay }: Props = $props();
	const presentation = $derived(getTimeOfDay(timeOfDay));
</script>

<div class={`time-lighting ${presentation.overlayClass}`} aria-hidden="true"></div>

<style>
	.time-lighting {
		position: absolute;
		z-index: 1;
		inset: 0;
		pointer-events: none;
		transition:
			background 0.55s ease,
			opacity 0.55s ease;
	}

	.time-day {
		opacity: 0.05;
		background: rgba(214, 233, 219, 0.16);
	}

	.time-dawn {
		opacity: 0.65;
		background: linear-gradient(
			180deg,
			rgba(93, 112, 160, 0.28),
			rgba(250, 178, 143, 0.4) 46%,
			rgba(31, 53, 82, 0.32)
		);
	}

	.time-sunset {
		opacity: 0.7;
		background: linear-gradient(
			180deg,
			rgba(55, 32, 70, 0.18),
			rgba(236, 135, 70, 0.48) 46%,
			rgba(25, 23, 42, 0.52)
		);
	}

	.time-night {
		opacity: 0.82;
		background: linear-gradient(
			rgba(3, 17, 45, 0.86),
			rgba(8, 23, 48, 0.76) 62%,
			rgba(4, 13, 28, 0.8)
		);
	}

	.time-eclipse {
		opacity: 0.68;
		background:
			radial-gradient(circle at 70% 24%, rgba(220, 143, 62, 0.18), transparent 22%),
			linear-gradient(rgba(9, 8, 13, 0.76), rgba(28, 21, 20, 0.45) 60%, rgba(8, 7, 10, 0.58));
	}

	@media (prefers-reduced-motion: reduce) {
		.time-lighting {
			transition: none;
		}
	}
</style>
