<script lang="ts">
	import type { BossType } from '../types';
	import { BOSS_LABELS } from '../presentation';

	type Props = {
		bossType: BossType;
		result: 'pass' | 'crash';
		phase: 'enter' | 'engage' | 'resolve';
	};

	let { bossType, result, phase }: Props = $props();
</script>

<div class={`boss-event ${bossType} ${phase} ${result}`}>
	<div class="boss-silhouette"><i></i><b></b><span></span></div>
	<div class="boss-label"><strong>{BOSS_LABELS[bossType]}</strong><span>{phase === 'resolve' ? result.toUpperCase() : 'ENCOUNTER'}</span></div>
</div>

<style>
	.boss-event { position: absolute; z-index: 10; inset: 0; overflow: hidden; color: #d16f45; pointer-events: none; }
	.boss-silhouette { position: absolute; right: -2%; bottom: 8%; width: clamp(190px, 38%, 410px); height: 72%; opacity: 0.92; filter: drop-shadow(0 0 22px currentColor); transform: translateX(115%); animation: boss-enter 0.38s ease-out forwards; }
	.boss-silhouette::before { content: ''; position: absolute; right: 8%; bottom: 0; width: 68%; height: 76%; border: 3px solid currentColor; border-radius: 58% 45% 12% 35%; background: linear-gradient(145deg, #111, #25120d 58%, #090909); clip-path: polygon(32% 0, 83% 8%, 100% 30%, 78% 47%, 93% 100%, 16% 100%, 0 43%); }
	.boss-silhouette::after { content: ''; position: absolute; right: 53%; top: 2%; width: 28%; height: 30%; border-top: 8px solid currentColor; border-left: 5px solid currentColor; transform: rotate(-24deg); }
	.boss-silhouette i, .boss-silhouette b { position: absolute; z-index: 1; top: 26%; width: 8px; height: 8px; border-radius: 50%; background: #ffd36a; box-shadow: 0 0 12px #ff6b2c; }
	.boss-silhouette i { right: 38%; }
	.boss-silhouette b { right: 28%; }
	.boss-silhouette span { position: absolute; z-index: 1; right: 21%; top: 38%; width: 34%; height: 4px; background: currentColor; box-shadow: 0 0 10px currentColor; transform: rotate(-8deg); }
	.boss-label { position: absolute; top: 38%; left: 49%; display: grid; gap: 5px; padding: 9px 13px; border-left: 2px solid currentColor; background: rgba(14, 5, 3, 0.82); text-shadow: 0 2px 10px #000; }
	.boss-label strong { color: #f4c974; font: 800 0.72rem/1 system-ui, sans-serif; letter-spacing: 0.12em; }
	.boss-label span { font: 900 0.56rem/1 system-ui, sans-serif; letter-spacing: 0.18em; }
	.forgeGuardian { color: #d9a94b; }
	.forgeGuardian .boss-silhouette::before { border-radius: 8%; clip-path: polygon(22% 0, 78% 0, 100% 23%, 87% 100%, 13% 100%, 0 23%); background: linear-gradient(135deg, #3f3424, #111 62%); }
	.engage .boss-silhouette { transform: translateX(0); animation: boss-attack 0.32s ease-in-out infinite alternate; }
	.resolve.pass .boss-silhouette { animation: boss-pass 0.48s ease-in forwards; }
	.resolve.crash .boss-silhouette { animation: boss-crash 0.42s ease-in forwards; }
	.resolve.pass .boss-label { color: #56e89f; }
	@keyframes boss-enter { to { transform: translateX(0); } }
	@keyframes boss-attack { to { transform: translate(-2.5%, 1%) scale(1.025); filter: brightness(1.25); } }
	@keyframes boss-pass { to { opacity: 0; transform: translateX(28%) scale(1.08); } }
	@keyframes boss-crash { to { transform: translateX(-8%) scale(1.12); filter: brightness(1.8); } }
	@media (max-width: 620px) { .boss-label { top: 42%; left: 32%; } .boss-silhouette { width: 58%; } }
	@media (prefers-reduced-motion: reduce) { .boss-silhouette, .engage .boss-silhouette, .resolve.pass .boss-silhouette, .resolve.crash .boss-silhouette { animation: none; transform: none; } }
</style>
