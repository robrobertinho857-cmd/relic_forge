<script lang="ts">
	import type { PortalType } from '../types';
	import { PORTAL_LABELS } from '../presentation';

	type Props = {
		portalType: PortalType;
		phase: 'approach' | 'enter' | 'release';
		multiplier: number;
	};

	let { portalType, phase, multiplier }: Props = $props();
</script>

<div class={`portal-event ${portalType} ${phase}`}>
	<div class="portal-ring"><i></i><b></b><span>x{multiplier.toFixed(2)}</span></div>
	<strong>{PORTAL_LABELS[portalType]}</strong>
</div>

<style>
	.portal-event { position: absolute; z-index: 10; top: 50%; left: 70%; display: grid; place-items: center; color: #7ccfff; transform: translate(-50%, -50%); pointer-events: none; animation: portal-approach 0.34s ease-out both; }
	.portal-ring { position: relative; display: grid; width: clamp(100px, 18vw, 190px); aspect-ratio: 0.72; place-items: center; border: clamp(5px, 0.8vw, 10px) solid currentColor; border-radius: 50%; background: radial-gradient(ellipse, rgba(5, 20, 30, 0.12) 23%, rgba(40, 129, 190, 0.42) 46%, rgba(3, 9, 13, 0.96) 68%); box-shadow: 0 0 35px currentColor, inset 0 0 28px currentColor; }
	.portal-ring::before, .portal-ring::after, .portal-ring i, .portal-ring b { content: ''; position: absolute; border: 2px solid currentColor; border-radius: 50%; }
	.portal-ring::before { inset: -12%; opacity: 0.45; animation: portal-spin 1.2s linear infinite; clip-path: polygon(0 0, 100% 0, 65% 100%, 35% 100%); }
	.portal-ring::after { inset: 13%; opacity: 0.65; animation: portal-spin 0.8s linear infinite reverse; }
	.portal-ring i { inset: 25%; border-style: dashed; }
	.portal-ring b { inset: 37%; background: currentColor; opacity: 0.2; filter: blur(5px); }
	.portal-ring span { color: #f8e1a5; font: 800 clamp(0.72rem, 1.5vw, 1rem)/1 system-ui, sans-serif; text-shadow: 0 2px 12px #000; }
	.portal-event > strong { margin-top: 10px; padding: 5px 9px; background: rgba(3, 13, 10, 0.84); color: #f1cf7c; font: 800 0.61rem/1 system-ui, sans-serif; letter-spacing: 0.12em; }
	.portal-event.enter { animation: portal-enter 0.38s ease-in both; }
	.portal-event.release { animation: portal-release 0.3s ease-out both; }
	.relicPortal { color: #52eca2; }
	.vaultPortal { color: #e9b953; }
	.chaosPortal { color: #cf52e8; filter: hue-rotate(-12deg); }
	.chaosPortal .portal-ring { background: repeating-radial-gradient(ellipse, rgba(202, 50, 70, 0.45) 0 8%, rgba(47, 5, 62, 0.9) 9% 17%); }
	@keyframes portal-approach { from { opacity: 0; transform: translate(25%, -50%) scale(0.55); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
	@keyframes portal-enter { to { opacity: 0.2; transform: translate(-155%, -50%) scale(1.8); filter: brightness(2.2); } }
	@keyframes portal-release { from { opacity: 0.2; transform: translate(-100%, -50%) scale(1.5); } to { opacity: 0; transform: translate(-130%, -50%) scale(2); } }
	@keyframes portal-spin { to { transform: rotate(360deg); } }
	@media (prefers-reduced-motion: reduce) { .portal-event, .portal-ring::before, .portal-ring::after { animation: none; } }
</style>
