<script lang="ts">
	import type { RelicEventType } from '../types';
	import { RELIC_LABELS } from '../presentation';

	type Props = {
		relicType: RelicEventType;
		fromMultiplier: number;
		toMultiplier: number;
		protected?: boolean;
	};

	let { relicType, fromMultiplier, toMultiplier, protected: isProtected = false }: Props = $props();
</script>

<div class={`relic-pickup-event ${relicType}`}>
	<div class="relic-object"><i></i><b></b></div>
	<div class="relic-copy">
		<strong>{RELIC_LABELS[relicType]}</strong>
		<span>x{fromMultiplier.toFixed(2)} → x{toMultiplier.toFixed(2)}</span>
		{#if isProtected}<small>GUARDIAN SHIELD</small>{/if}
	</div>
</div>

<style>
	.relic-pickup-event { position: absolute; z-index: 11; top: 43%; left: 68%; display: grid; place-items: center; color: #8ff7be; text-align: center; pointer-events: none; animation: relic-approach 0.62s ease-in forwards; }
	.relic-object { position: relative; width: clamp(56px, 8vw, 88px); aspect-ratio: 1; border: 2px solid currentColor; transform: rotate(45deg); background: radial-gradient(circle, #caffdf 0 7%, #1a9b62 8% 35%, #05291b 68%); box-shadow: 0 0 32px currentColor; }
	.relic-object::before, .relic-object::after { content: ''; position: absolute; inset: 11%; border: 1px solid currentColor; animation: relic-orbit 1.1s linear infinite; }
	.relic-object::after { inset: -10%; opacity: 0.5; animation-direction: reverse; }
	.relic-object i { position: absolute; inset: 31%; background: currentColor; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); box-shadow: 0 0 13px currentColor; }
	.relic-copy { position: absolute; top: calc(100% + 18px); left: 50%; width: max-content; max-width: 230px; padding: 7px 11px; border: 1px solid color-mix(in srgb, currentColor 55%, transparent); background: rgba(3, 18, 12, 0.9); transform: translateX(-50%) rotate(-45deg); text-shadow: 0 1px 8px #000; }
	.relic-copy strong, .relic-copy span, .relic-copy small { display: block; }
	.relic-copy strong { color: #f4d17e; font: 800 0.66rem/1.1 system-ui, sans-serif; letter-spacing: 0.12em; }
	.relic-copy span { margin-top: 5px; font: 800 0.75rem/1 system-ui, sans-serif; }
	.relic-copy small { margin-top: 4px; color: #f6dc8c; font: 700 0.48rem/1 system-ui, sans-serif; letter-spacing: 0.1em; }
	.fireRelic { color: #ff6a38; }
	.emeraldRelic { color: #4ff0a4; }
	.ancientRelic { color: #e4b755; }
	.mythicRelic { color: #c77cff; }
	@keyframes relic-approach { 0% { opacity: 0; transform: translate(30px, -12px) scale(0.45) rotate(-45deg); } 42% { opacity: 1; transform: translate(0, 0) scale(1) rotate(-45deg); } 100% { opacity: 0.25; transform: translate(-43vw, 2vh) scale(0.3) rotate(-45deg); } }
	@keyframes relic-orbit { to { transform: rotate(360deg); } }
	@media (max-width: 620px) { .relic-pickup-event { left: 72%; } .relic-copy { max-width: 180px; } }
	@media (prefers-reduced-motion: reduce) { .relic-pickup-event, .relic-object::before, .relic-object::after { animation: none; } }
</style>
