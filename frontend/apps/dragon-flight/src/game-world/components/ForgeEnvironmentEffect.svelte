<script lang="ts">
	import { VFX_ASSETS } from '../vfx';

	type Props = {
		stageIntensity: number;
	};

	let { stageIntensity }: Props = $props();
</script>

<div class="forge-environment" style={`--forge-intensity:${stageIntensity};`} aria-hidden="true">
	<img class="forge-embers" src={VFX_ASSETS.forge.embers} alt="" draggable="false" />
</div>

<style>
	.forge-environment {
		position: absolute;
		z-index: 2;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.forge-environment img {
		position: absolute;
		display: block;
		max-width: none;
		user-select: none;
		pointer-events: none;
		will-change: transform, opacity;
	}

	.forge-embers {
		bottom: -50%;
		left: 4%;
		width: min(86%, 980px);
		height: auto;
		opacity: calc(0.045 + var(--forge-intensity) * 0.055);
		animation: forge-embers-rise 12s linear infinite;
	}

	@keyframes forge-embers-rise {
		from {
			transform: translate3d(-2%, 9%, 0) scale(1.03);
		}
		to {
			transform: translate3d(2%, -12%, 0) scale(1.07);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.forge-embers {
			animation: none;
		}
	}
</style>
