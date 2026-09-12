<script lang="ts">
	import { LANDING_ANCHOR } from '../backgrounds';
	let { progress }: { progress: number } = $props();
</script>

<div
	class="landing-shadow"
	style={`left:${LANDING_ANCHOR.x * 100}%;top:${LANDING_ANCHOR.y * 100}%;opacity:${Math.max(0, progress - 0.55) * 1.2};transform:translate(-50%,-50%) scale(${0.6 + progress * 0.4});`}
	aria-hidden="true"
></div>

<style>
	.landing-shadow {
		position: absolute;
		z-index: 4;
		width: clamp(36px, 6vw, 70px);
		height: 12px;
		border-radius: 50%;
		background: radial-gradient(ellipse, #17282188, transparent 70%);
		pointer-events: none;
	}
</style>
