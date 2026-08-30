<script lang="ts">
	import type { FlightEnding } from '../types';

	type SuccessfulEnding = Exclude<FlightEnding, 'crash'>;
	type Props = { ending: SuccessfulEnding };

	let { ending }: Props = $props();
</script>

<div class={`ending-effect ${ending}`}>
	<div class="ending-structure"><i></i><b></b></div>
	<strong>{ending.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase()}</strong>
</div>

<style>
	.ending-effect { position: absolute; z-index: 4; right: -3%; bottom: 8%; display: grid; width: 38%; height: 62%; place-items: center; color: #d3a148; pointer-events: none; animation: ending-arrive 0.75s ease-out forwards; }
	.ending-structure { position: absolute; inset: 0; border: 4px solid currentColor; border-radius: 50% 0 0 0; background: radial-gradient(circle at 52% 54%, #ffe374 0 4%, #7c4c18 5% 14%, #16231a 35%, #080b09 70%); box-shadow: 0 0 45px color-mix(in srgb, currentColor 45%, transparent); }
	.ending-structure i { position: absolute; inset: 12%; border: 2px solid currentColor; border-radius: 50%; box-shadow: inset 0 0 30px #000; }
	.ending-structure b { position: absolute; inset: 28%; border: 1px dashed currentColor; border-radius: 50%; }
	.ending-effect > strong { z-index: 1; color: #f8dc91; font-size: clamp(0.72rem, 1.8vw, 1.3rem); letter-spacing: 0.12em; text-align: center; text-shadow: 0 2px 12px #000; }
	.safeLanding { right: 8%; width: 44%; height: 35%; color: #5ddb9f; }
	.safeLanding .ending-structure { top: auto; height: 42%; border-radius: 50% 50% 0 0; background: linear-gradient(transparent, rgba(49, 194, 126, 0.22)), repeating-linear-gradient(90deg, #1a281f 0 20px, #0c1510 21px 40px); }
	.dragonVault { width: 44%; color: #df813d; }
	.ancientVault { width: 46%; color: #e4c15b; filter: drop-shadow(0 0 18px #4adf9c); }
	.mythicRealm { width: 50%; color: #cf76ef; filter: drop-shadow(0 0 24px #58e8bb); }
	.mythicRealm .ending-structure { border-radius: 50%; background: repeating-radial-gradient(circle, rgba(88, 232, 187, 0.5) 0 6%, rgba(80, 22, 105, 0.9) 7% 15%); animation: mythic-pulse 0.7s ease-in-out infinite alternate; }
	@keyframes ending-arrive { from { opacity: 0; transform: translateX(110%) scale(0.8); } to { opacity: 1; transform: translateX(0) scale(1); } }
	@keyframes mythic-pulse { to { filter: brightness(1.45); transform: scale(1.035); } }
	@media (max-width: 620px) { .ending-effect { width: 48%; } }
	@media (prefers-reduced-motion: reduce) { .ending-effect, .mythicRealm .ending-structure { animation: none; } }
</style>
