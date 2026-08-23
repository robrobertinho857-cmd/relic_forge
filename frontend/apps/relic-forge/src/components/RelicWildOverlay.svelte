<script lang="ts">
	import type { RelicWildState, RelicWildVariant } from '../game/types';

	type Props = {
		wilds: RelicWildState[];
		variant: RelicWildVariant;
		activatingKeys: string[];
		spinning: boolean;
	};

	const { wilds, variant, activatingKeys, spinning }: Props = $props();
	const keyFor = (wild: RelicWildState) => `${wild.reel}:${wild.row}`;
</script>

<div class="relic-wild-overlay variant-{variant}" class:spinning aria-label="Locked Relic Wilds">
	{#each wilds as wild (keyFor(wild))}
		<div
			class="relic-wild-cell"
			class:activating={activatingKeys.includes(keyFor(wild))}
			data-relic-wild={keyFor(wild)}
			data-multiplier={wild.multiplier}
			style={`grid-column: ${wild.reel + 1}; grid-row: ${wild.row + 1}`}
		>
			<span class="relic-energy"></span>
			<strong>×{wild.multiplier}</strong>
			<small>RELIC WILD</small>
			<span class="relic-lock">◆</span>
		</div>
	{/each}
</div>

<style>
	.relic-wild-overlay {
		--relic-accent: #64dca1;
		--relic-hot: #bafbe0;
		position: absolute;
		inset: 5px;
		z-index: 8;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		grid-template-rows: repeat(3, minmax(0, 1fr));
		column-gap: 6px;
		pointer-events: none;
	}
	.variant-super {
		--relic-accent: #b569ef;
		--relic-hot: #ebc9ff;
	}
	.variant-mythic {
		--relic-accent: #ff762f;
		--relic-hot: #ffd176;
	}
	.relic-wild-cell {
		position: relative;
		display: grid;
		min-width: 0;
		place-items: center;
		align-content: center;
		overflow: hidden;
		border: 2px solid color-mix(in srgb, var(--relic-accent) 72%, #d7a841);
		clip-path: polygon(9% 0, 91% 0, 100% 9%, 100% 91%, 91% 100%, 9% 100%, 0 91%, 0 9%);
		background:
			linear-gradient(rgba(1, 15, 10, 0.42), rgba(1, 8, 7, 0.88)),
			url('../assets/symbols/wild.png') center / 88% auto no-repeat,
			#04100c;
		box-shadow:
			inset 0 0 0 3px rgba(7, 10, 8, 0.82),
			inset 0 0 24px color-mix(in srgb, var(--relic-accent) 28%, transparent),
			0 0 10px color-mix(in srgb, var(--relic-accent) 36%, transparent);
		isolation: isolate;
	}
	.relic-wild-cell::before,
	.relic-wild-cell::after {
		position: absolute;
		inset: 7px;
		z-index: -1;
		border: 1px solid color-mix(in srgb, var(--relic-hot) 72%, transparent);
		clip-path: polygon(12% 0, 88% 0, 100% 12%, 100% 88%, 88% 100%, 12% 100%, 0 88%, 0 12%);
		content: '';
	}
	.relic-wild-cell::after {
		inset: 2px;
		border-style: dashed;
		opacity: 0.46;
	}
	.relic-energy {
		position: absolute;
		inset: 16%;
		z-index: -1;
		border-radius: 50%;
		background: radial-gradient(circle, var(--relic-hot), var(--relic-accent) 22%, transparent 68%);
		filter: blur(7px);
		opacity: 0.48;
		animation: relic-breathe 1.8s ease-in-out infinite alternate;
	}
	strong {
		color: #fff2c0;
		font-family: var(--display-font, Georgia, serif);
		font-size: clamp(22px, 3.4vw, 48px);
		line-height: 0.9;
		text-shadow:
			0 3px 1px #301700,
			0 0 14px var(--relic-accent);
	}
	small {
		margin-top: 5px;
		color: var(--relic-hot);
		font-size: clamp(5px, 0.62vw, 9px);
		font-weight: 900;
		letter-spacing: 0.13em;
		text-shadow: 0 1px 2px #000;
	}
	.relic-lock {
		position: absolute;
		right: 5px;
		bottom: 3px;
		color: var(--relic-hot);
		font-size: 8px;
		text-shadow: 0 0 7px var(--relic-accent);
	}
	.activating {
		animation: relic-forge-in 720ms cubic-bezier(0.16, 0.84, 0.25, 1);
	}
	.spinning .relic-wild-cell {
		filter: brightness(1.08);
	}

	@keyframes relic-forge-in {
		0% {
			opacity: 0;
			filter: brightness(3.2);
			transform: scale(0.72);
		}
		28% {
			opacity: 1;
			transform: scale(1.08);
		}
		58% {
			filter: brightness(1.75);
			transform: scale(0.97);
		}
		100% {
			filter: brightness(1);
			transform: scale(1);
		}
	}
	@keyframes relic-breathe {
		to {
			opacity: 0.75;
			transform: scale(1.12);
		}
	}

	@media (max-width: 640px) {
		.relic-wild-overlay {
			inset: 3px;
			column-gap: 3px;
		}
		strong {
			font-size: clamp(16px, 7vw, 30px);
		}
		small {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.relic-wild-cell,
		.relic-energy {
			animation: none;
		}
	}
</style>
