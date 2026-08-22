<script lang="ts">
	import type { ResolvedMode } from '../game/modes';

	type Props = {
		mode: ResolvedMode;
		selected?: boolean;
		bet: number;
		currency: string;
		onselect: (mode: ResolvedMode) => void;
	};

	const { mode, selected = false, bet, currency, onselect }: Props = $props();
	const formatMoney = (amount: number) =>
		new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency,
			minimumFractionDigits: 2,
		}).format(amount);
</script>

<button
	type="button"
	class="mode-card theme-{mode.theme}"
	class:selected
	class:unavailable={!mode.available}
	data-mode-id={mode.id}
	data-mode-kind={mode.kind}
	data-mode-source={mode.source}
	disabled={!mode.available}
	aria-pressed={mode.kind === 'play' ? selected : undefined}
	style={`--mode-image: url("${mode.image}")`}
	onclick={() => onselect(mode)}
>
	<span class="mode-card-shade"></span>
	<span class="mode-card-content">
		<strong class="mode-title">{mode.title}</strong>
		<span class="mode-badge">
			{#if mode.kind === 'bonus'}{mode.freeSpins} FREE SPINS{:else}{mode.costMultiplier}× BET{/if}
		</span>
		<ul class:boost-list={mode.kind === 'play' && mode.id !== 'normal'}>
			{#each mode.descriptions as description}
				<li>{description}</li>
			{/each}
		</ul>
		<span class="mode-cost">
			{#if mode.kind === 'bonus'}
				<b>{mode.costMultiplier}× BET</b>
				<small>TOTAL {formatMoney(bet * mode.costMultiplier)}</small>
			{:else}
				<b>{formatMoney(bet * mode.costMultiplier)}</b>
				<small>WAGER</small>
			{/if}
		</span>
		{#if !mode.available}<span class="mode-locked">NOT AVAILABLE FROM RGS</span>{/if}
	</span>
	{#if selected}<span class="selected-mark"><b>◆</b> CURRENT MODE</span>{/if}
</button>

<style>
	.mode-card {
		--mode-accent: #6dbbff;
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 3 / 2;
		padding: 0;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--mode-accent) 55%, #6d5529);
		border-radius: 4px;
		background-color: #050b0d;
		background-image: var(--mode-image);
		background-position: center;
		background-size: cover;
		color: #f8edcf;
		font: inherit;
		text-align: left;
		box-shadow: inset 0 0 0 1px rgba(255, 206, 91, 0.08);
		cursor: pointer;
		transition:
			border-color 160ms ease,
			filter 160ms ease,
			transform 160ms ease,
			box-shadow 160ms ease;
	}
	.mode-card:hover:not(:disabled) {
		z-index: 2;
		border-color: color-mix(in srgb, var(--mode-accent) 78%, #ffd66e);
		filter: brightness(1.08) saturate(1.06);
		transform: translateY(-2px) scale(1.006);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--mode-accent) 42%, transparent),
			0 8px 18px rgba(0, 0, 0, 0.34);
	}
	.mode-card.selected {
		border-color: #fff0ac;
		filter: brightness(1.16) saturate(1.14);
		box-shadow:
			inset 0 0 0 4px color-mix(in srgb, var(--mode-accent) 72%, #ffe09a),
			inset 0 0 42px color-mix(in srgb, var(--mode-accent) 28%, transparent),
			0 0 22px color-mix(in srgb, var(--mode-accent) 58%, transparent),
			0 8px 22px rgba(0, 0, 0, 0.52);
		transform: translateY(-2px) scale(1.012);
	}
	.mode-card.selected::after {
		position: absolute;
		inset: 5px;
		z-index: 2;
		border: 1px solid #ffe39a;
		box-shadow: inset 0 0 18px color-mix(in srgb, var(--mode-accent) 42%, transparent);
		content: '';
		pointer-events: none;
	}
	.theme-forge {
		--mode-accent: #ff9f36;
	}
	.theme-green {
		--mode-accent: #58ef65;
	}
	.theme-purple {
		--mode-accent: #cb68ff;
	}
	.theme-mythic {
		--mode-accent: #ff752d;
	}
	.mode-card-shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			rgba(0, 0, 0, 0.02) 0%,
			rgba(0, 0, 0, 0.06) 33%,
			rgba(2, 5, 7, 0.62) 48%,
			rgba(2, 5, 7, 0.88) 100%
		);
		pointer-events: none;
	}
	.mode-card-content {
		position: absolute;
		top: 8%;
		right: 4.5%;
		bottom: 7%;
		display: flex;
		width: 54%;
		align-items: center;
		flex-direction: column;
		color: #f7ecd2;
		text-align: center;
		text-shadow: 0 2px 2px rgba(0, 0, 0, 0.95);
	}
	.mode-title {
		color: color-mix(in srgb, var(--mode-accent) 70%, #fff2ba);
		font-family: var(--display-font, Georgia, serif);
		font-size: clamp(17px, 1.75vw, 30px);
		line-height: 1;
		letter-spacing: 0.045em;
		white-space: nowrap;
		text-shadow:
			0 2px 2px #000,
			0 0 10px color-mix(in srgb, var(--mode-accent) 38%, transparent);
	}
	.mode-badge {
		margin-top: 5%;
		padding: 2.5% 10%;
		border: 1px solid color-mix(in srgb, var(--mode-accent) 68%, #c69741);
		clip-path: polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%);
		background: rgba(2, 9, 12, 0.86);
		color: #fff1c7;
		font-family: var(--display-font, Georgia, serif);
		font-size: clamp(10px, 1.1vw, 17px);
		font-weight: 800;
		letter-spacing: 0.055em;
		white-space: nowrap;
	}
	ul {
		display: grid;
		width: 88%;
		margin: 7% 0 0;
		padding: 0;
		gap: 0.35em;
		font-size: clamp(8px, 0.86vw, 14px);
		line-height: 1.18;
		list-style: none;
		text-align: left;
	}
	li {
		position: relative;
		padding-left: 1.25em;
	}
	li::before {
		position: absolute;
		top: 0;
		left: 0;
		color: var(--mode-accent);
		content: '•';
		font-weight: 900;
		text-shadow: 0 0 7px var(--mode-accent);
	}
	.boost-list li::before {
		content: '↑';
	}
	.mode-cost {
		display: grid;
		width: 88%;
		margin-top: auto;
		padding: 2.5% 4%;
		border: 1px solid color-mix(in srgb, var(--mode-accent) 65%, #d0a04b);
		background: rgba(1, 8, 10, 0.86);
		text-align: center;
	}
	.mode-cost b {
		color: color-mix(in srgb, var(--mode-accent) 62%, #fff0bb);
		font-family: var(--display-font, Georgia, serif);
		font-size: clamp(11px, 1.2vw, 19px);
		line-height: 1;
		letter-spacing: 0.04em;
	}
	.mode-cost small {
		margin-top: 0.3em;
		color: #c9c1aa;
		font-size: clamp(6px, 0.58vw, 9px);
		letter-spacing: 0.1em;
	}
	.selected-mark,
	.mode-locked {
		position: absolute;
		z-index: 3;
		padding: 4px 8px;
		font-size: 8px;
		font-weight: 900;
		letter-spacing: 0.11em;
	}
	.selected-mark {
		top: 10px;
		right: 10px;
		left: auto;
		min-width: 122px;
		padding: 7px 11px;
		border: 2px solid #ffdf80;
		background: linear-gradient(180deg, rgba(20, 105, 52, 0.98), rgba(4, 36, 18, 0.98));
		box-shadow:
			inset 0 0 12px rgba(89, 255, 145, 0.28),
			0 0 16px color-mix(in srgb, var(--mode-accent) 52%, transparent);
		color: #fff4bd;
		font-size: 9px;
		text-align: center;
		text-shadow: 0 1px 2px #000;
	}
	.selected-mark b {
		margin-right: 5px;
		color: #73ff9d;
		text-shadow: 0 0 8px #32ef74;
	}
	.mode-locked {
		right: 5%;
		bottom: 6%;
		left: 43%;
		border: 1px solid rgba(189, 183, 163, 0.5);
		background: rgba(4, 6, 7, 0.94);
		color: #c4bca8;
		text-align: center;
	}
	.mode-card.unavailable {
		filter: grayscale(0.62) brightness(0.55);
		cursor: not-allowed;
	}
	.mode-card.unavailable .mode-cost {
		opacity: 0.35;
	}

	@media (max-width: 720px) {
		.mode-title {
			font-size: clamp(15px, 5vw, 24px);
		}
		.mode-badge {
			font-size: clamp(9px, 3.1vw, 14px);
		}
		ul {
			font-size: clamp(8px, 2.5vw, 12px);
		}
		.mode-cost b {
			font-size: clamp(11px, 3.4vw, 17px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mode-card {
			transition: none;
		}
	}
</style>
