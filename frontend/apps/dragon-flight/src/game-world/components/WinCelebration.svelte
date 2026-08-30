<script lang="ts">
	import type { WinTier } from '../presentation';

	type Props = {
		tier: WinTier;
		multiplier: string;
		win: string;
	};

	let { tier, multiplier, win }: Props = $props();
</script>

<div class={`win-celebration ${tier.id}`} aria-live="polite">
	<i></i><i></i><i></i>
	<strong>{tier.label}</strong>
	<span>{multiplier}</span>
	<b>{win}</b>
	<small>LOCAL PROTOTYPE PRESENTATION</small>
</div>

<style>
	.win-celebration { position: relative; grid-column: 1 / -1; display: grid; place-items: center; min-height: 84px; overflow: hidden; padding: 12px; border-block: 1px solid rgba(88, 225, 159, 0.45); background: radial-gradient(circle, rgba(35, 157, 101, 0.2), transparent 67%); }
	.win-celebration strong { color: #f1cc79; font-size: clamp(1rem, 2.5vw, 1.5rem); letter-spacing: 0.16em; text-shadow: 0 0 18px rgba(255, 188, 68, 0.45); }
	.win-celebration span { margin-top: 4px; color: #72efb2; font: 800 0.72rem/1 system-ui, sans-serif; }
	.win-celebration b { margin-top: 5px; color: #ffe3a0; font-size: 1.1rem; }
	.win-celebration small { margin-top: 5px; color: #799486; font: 700 0.45rem/1 system-ui, sans-serif; letter-spacing: 0.1em; }
	.win-celebration i { position: absolute; width: 5px; height: 5px; border: 1px solid #f4cb67; transform: rotate(45deg); animation: celebration-particle 0.8s ease-out infinite; }
	.win-celebration i:nth-child(1) { left: 18%; animation-delay: -0.2s; }
	.win-celebration i:nth-child(2) { right: 22%; animation-delay: -0.5s; }
	.win-celebration i:nth-child(3) { left: 58%; animation-delay: -0.7s; }
	.big { box-shadow: inset 0 0 28px rgba(255, 167, 52, 0.13); }
	.epic { border-color: rgba(197, 99, 236, 0.65); background: radial-gradient(circle, rgba(129, 38, 162, 0.28), transparent 67%); }
	.mythic { border-color: #d6a64d; background: radial-gradient(circle, rgba(75, 229, 163, 0.27), rgba(111, 38, 141, 0.18), transparent 72%); box-shadow: inset 0 0 34px rgba(223, 178, 75, 0.16), 0 0 25px rgba(100, 226, 165, 0.15); }
	@keyframes celebration-particle { from { opacity: 0; top: 86%; } 35% { opacity: 1; } to { opacity: 0; top: 8%; transform: rotate(225deg) scale(1.7); } }
	@media (prefers-reduced-motion: reduce) { .win-celebration i { animation: none; } }
</style>
