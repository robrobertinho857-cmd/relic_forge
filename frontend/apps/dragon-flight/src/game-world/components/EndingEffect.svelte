<script lang="ts">
	import type { FlightEnding } from '../types';
	import { VFX_ASSETS } from '../vfx';

	type SuccessfulEnding = Exclude<FlightEnding, 'crash'>;
	type Props = { ending: SuccessfulEnding };

	let { ending }: Props = $props();
	const particleIntensity = $derived(
		(
			{
				safeLanding: '',
				forgeVault: 'soft',
				dragonVault: 'medium',
				ancientVault: 'strong',
				mythicRealm: 'mythic',
			} satisfies Record<SuccessfulEnding, string>
		)[ending],
	);
</script>

<div class={`ending-effect ${ending}`}>
	<div class="ending-structure"><i></i><b></b></div>
	{#if particleIntensity}
		<img
			class={`vault-particles ${particleIntensity}`}
			src={VFX_ASSETS.vault.particles}
			alt=""
			draggable="false"
			aria-hidden="true"
		/>
	{/if}
	<strong>{ending.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase()}</strong>
</div>

<style>
	.ending-effect {
		position: absolute;
		z-index: 4;
		right: -3%;
		bottom: 8%;
		display: grid;
		width: 38%;
		height: 62%;
		place-items: center;
		color: #d3a148;
		pointer-events: none;
		animation: ending-arrive 0.75s ease-out forwards;
	}
	.ending-structure {
		position: absolute;
		inset: 0;
		border: 4px solid currentColor;
		border-radius: 50% 0 0 0;
		background: radial-gradient(
			circle at 52% 54%,
			#ffe374 0 4%,
			#7c4c18 5% 14%,
			#16231a 35%,
			#080b09 70%
		);
		box-shadow: 0 0 45px color-mix(in srgb, currentColor 45%, transparent);
	}
	.ending-structure i {
		position: absolute;
		inset: 12%;
		border: 2px solid currentColor;
		border-radius: 50%;
		box-shadow: inset 0 0 30px #000;
	}
	.ending-structure b {
		position: absolute;
		inset: 28%;
		border: 1px dashed currentColor;
		border-radius: 50%;
	}
	.vault-particles {
		position: absolute;
		z-index: 1;
		bottom: -20%;
		left: 50%;
		display: block;
		width: 148%;
		height: auto;
		max-width: none;
		opacity: 0;
		user-select: none;
		pointer-events: none;
		transform: translate(-50%, 14%);
		animation: vault-particles-rise 2.6s ease-out both;
		will-change: transform, opacity;
	}
	.vault-particles.soft {
		--vault-particle-opacity: 0.42;
	}
	.vault-particles.medium {
		--vault-particle-opacity: 0.56;
		width: 160%;
	}
	.vault-particles.strong {
		--vault-particle-opacity: 0.68;
		width: 170%;
	}
	.vault-particles.mythic {
		--vault-particle-opacity: 0.82;
		width: 182%;
	}
	.ending-effect > strong {
		z-index: 1;
		color: #f8dc91;
		font-size: clamp(0.72rem, 1.8vw, 1.3rem);
		letter-spacing: 0.12em;
		text-align: center;
		text-shadow: 0 2px 12px #000;
	}
	.safeLanding {
		right: 8%;
		width: 44%;
		height: 35%;
		color: #5ddb9f;
	}
	.safeLanding .ending-structure {
		top: auto;
		height: 42%;
		border-radius: 50% 50% 0 0;
		background:
			linear-gradient(transparent, rgba(49, 194, 126, 0.22)),
			repeating-linear-gradient(90deg, #1a281f 0 20px, #0c1510 21px 40px);
	}
	.dragonVault {
		width: 44%;
		color: #df813d;
	}
	.ancientVault {
		width: 46%;
		color: #e4c15b;
		filter: drop-shadow(0 0 18px #4adf9c);
	}
	.mythicRealm {
		width: 50%;
		color: #cf76ef;
		filter: drop-shadow(0 0 24px #58e8bb);
	}
	.mythicRealm .ending-structure {
		border-radius: 50%;
		background: repeating-radial-gradient(
			circle,
			rgba(88, 232, 187, 0.5) 0 6%,
			rgba(80, 22, 105, 0.9) 7% 15%
		);
		animation: mythic-pulse 0.7s ease-in-out infinite alternate;
	}
	@keyframes ending-arrive {
		from {
			opacity: 0;
			transform: translateX(110%) scale(0.8);
		}
		to {
			opacity: 1;
			transform: translateX(0) scale(1);
		}
	}
	@keyframes mythic-pulse {
		to {
			filter: brightness(1.45);
			transform: scale(1.035);
		}
	}
	@keyframes vault-particles-rise {
		0% {
			opacity: 0;
			transform: translate(-50%, 17%) scale(0.92);
		}
		22%,
		72% {
			opacity: var(--vault-particle-opacity);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -8%) scale(1.06);
		}
	}
	@media (max-width: 620px) {
		.ending-effect {
			width: 48%;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ending-effect,
		.mythicRealm .ending-structure,
		.vault-particles {
			animation: none;
		}
	}
</style>
