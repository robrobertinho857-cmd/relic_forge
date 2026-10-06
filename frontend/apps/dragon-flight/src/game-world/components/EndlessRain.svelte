<script lang="ts">
	import { base } from '$app/paths';
	let { storm = false }: { storm?: boolean } = $props();
</script>

<div class="endless-rain" class:storm aria-hidden="true">
	{#each ['far', 'mid', 'near'] as depth (depth)}
		<div
			class={`rain ${depth}`}
			style:background-image={`url('${base || '.'}/weather/rain-${depth}.svg')`}
		></div>
	{/each}
</div>

<style>
	.endless-rain,
	.rain {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.endless-rain {
		overflow: hidden;
	}
	.rain {
		background-repeat: repeat;
		background-size: 384px 384px;
		animation: rainfall var(--rain-duration) linear infinite;
	}
	.far {
		--rain-duration: 4s;
		opacity: 0.16;
	}
	.mid {
		--rain-duration: 2s;
		opacity: 0.23;
		animation-delay: -0.73s;
	}
	.near {
		--rain-duration: 1s;
		opacity: 0.29;
		animation-delay: -0.37s;
	}
	.storm .rain {
		animation-duration: calc(var(--rain-duration) * 0.75);
	}
	.storm .mid,
	.storm .near {
		opacity: 0.4;
	}
	@keyframes rainfall {
		from {
			background-position: 0 0;
		}
		/* Both offsets are whole tile periods, making the wrap visually identical. */
		to {
			background-position: -384px 768px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.endless-rain {
			display: none;
		}
	}
</style>
