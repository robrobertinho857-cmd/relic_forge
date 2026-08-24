<script lang="ts">
	import type { ResolvedMode } from '../game/modes';
	import { formatCurrency } from '../game/currency';

	type Props = {
		mode: ResolvedMode;
		bet: number;
		betLevels: number[];
		balance: number;
		currency: string;
		canBuy: boolean;
		canChangeBet: boolean;
		oncancel: () => void;
		onconfirm: () => void;
		onchangebet: (direction: -1 | 1) => void;
	};

	const {
		mode,
		bet,
		betLevels,
		balance,
		currency,
		canBuy,
		canChangeBet,
		oncancel,
		onconfirm,
		onchangebet,
	}: Props = $props();
	const formatMoney = (amount: number) => formatCurrency(amount, currency);
	const totalCost = $derived(bet * mode.costMultiplier);
	const betIndex = $derived(betLevels.findIndex((level) => level === bet));
	const canDecreaseBet = $derived(canChangeBet && betIndex > 0);
	const canIncreaseBet = $derived(
		canChangeBet && betIndex >= 0 && betIndex < betLevels.length - 1,
	);
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && oncancel()} />

<div
	class="bonus-confirm-backdrop"
	role="presentation"
	onclick={(event) => event.target === event.currentTarget && oncancel()}
>
	<section
		class="bonus-confirm-modal theme-{mode.theme}"
		role="alertdialog"
		aria-modal="true"
		aria-label={`Buy ${mode.title} Free Spins`}
		style={`--bonus-image: url("${mode.image}")`}
	>
		<span class="bonus-confirm-shade"></span>
		<button
			type="button"
			class="bonus-confirm-close"
			aria-label="Cancel Bonus Buy"
			onclick={oncancel}>×</button
		>
		<div class="bonus-confirm-copy">
			<span class="bonus-confirm-kicker">BUY {mode.freeSpins} FREE SPINS?</span>
			<h2>{mode.title}</h2>
			<dl>
				<div>
					<dt>COST</dt>
					<dd>{mode.costMultiplier}× CURRENT BET</dd>
				</div>
				<div class="total">
					<dt>TOTAL COST</dt>
					<dd>{formatMoney(totalCost)}</dd>
				</div>
			</dl>
			<div class="bonus-confirm-bet" aria-label="Bonus Buy bet controls">
				<span>BET</span>
				<div>
					<button
						type="button"
						aria-label="Decrease Bonus Buy bet"
						disabled={!canDecreaseBet}
						onclick={() => onchangebet(-1)}>−</button
					>
					<strong>{formatMoney(bet)}</strong>
					<button
						type="button"
						aria-label="Increase Bonus Buy bet"
						disabled={!canIncreaseBet}
						onclick={() => onchangebet(1)}>+</button
					>
				</div>
			</div>
			{#if totalCost > balance}<p class="insufficient">INSUFFICIENT BALANCE</p>{/if}
			<div class="bonus-confirm-actions">
				<button type="button" class="cancel" onclick={oncancel}>CANCEL</button>
				<button type="button" class="buy" disabled={!canBuy} onclick={onconfirm}>BUY BONUS</button>
			</div>
			<small class="authority-note">
				Stake Engine mode: {mode.mode} · outcomes and payouts are server-authoritative
			</small>
		</div>
	</section>
</div>

<style>
	.bonus-confirm-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: grid;
		place-items: center;
		padding: 18px;
		background: rgba(0, 3, 4, 0.82);
		backdrop-filter: blur(10px);
	}
	.bonus-confirm-modal {
		--bonus-accent: #72bfff;
		position: relative;
		width: min(760px, 96vw);
		aspect-ratio: 3 / 2;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--bonus-accent) 62%, #d0a23f);
		border-radius: 5px;
		background-color: #061015;
		background-image: var(--bonus-image);
		background-position: center;
		background-size: cover;
		box-shadow: 0 22px 60px rgba(0, 0, 0, 0.74);
	}
	.theme-purple {
		--bonus-accent: #c86cff;
	}
	.theme-mythic {
		--bonus-accent: #ff772c;
	}
	.bonus-confirm-shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			rgba(0, 0, 0, 0.05) 25%,
			rgba(1, 5, 7, 0.7) 48%,
			rgba(1, 5, 7, 0.95)
		);
	}
	.bonus-confirm-close {
		position: absolute;
		top: 10px;
		right: 12px;
		z-index: 2;
		width: 34px;
		height: 34px;
		border: 1px solid rgba(224, 185, 95, 0.55);
		background: rgba(2, 8, 10, 0.86);
		color: #e8ca7d;
		font-size: 22px;
		cursor: pointer;
	}
	.bonus-confirm-copy {
		position: absolute;
		top: 9%;
		right: 5%;
		bottom: 7%;
		display: flex;
		width: 53%;
		align-items: center;
		flex-direction: column;
		color: #f6ebcf;
		text-align: center;
		text-shadow: 0 2px 2px #000;
	}
	.bonus-confirm-kicker {
		color: #b7aa87;
		font-size: clamp(8px, 1.1vw, 12px);
		font-weight: 800;
		letter-spacing: 0.14em;
	}
	h2 {
		margin: 2% 0 5%;
		color: color-mix(in srgb, var(--bonus-accent) 65%, #fff0b5);
		font-family: var(--display-font, Georgia, serif);
		font-size: clamp(25px, 4.2vw, 48px);
		line-height: 1;
		letter-spacing: 0.05em;
		text-shadow:
			0 2px 2px #000,
			0 0 14px color-mix(in srgb, var(--bonus-accent) 38%, transparent);
	}
	dl {
		display: grid;
		width: 92%;
		margin: 0;
		border-top: 1px solid rgba(205, 165, 74, 0.35);
	}
	dl div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2.6% 4%;
		border-bottom: 1px solid rgba(205, 165, 74, 0.25);
		background: rgba(1, 8, 10, 0.58);
	}
	dt {
		color: #a99b78;
		font-size: clamp(7px, 0.9vw, 10px);
		font-weight: 800;
		letter-spacing: 0.1em;
	}
	dd {
		margin: 0;
		color: #f5e4b5;
		font-size: clamp(10px, 1.5vw, 17px);
		font-weight: 800;
	}
	.total dd {
		color: color-mix(in srgb, var(--bonus-accent) 55%, #fff1ad);
		font-family: var(--display-font, Georgia, serif);
		font-size: clamp(14px, 2vw, 24px);
	}
	.bonus-confirm-bet {
		display: grid;
		width: 92%;
		gap: 5px;
		margin-top: 2.5%;
		color: #a99b78;
		font-size: clamp(7px, 0.9vw, 10px);
		font-weight: 800;
		letter-spacing: 0.12em;
	}
	.bonus-confirm-bet > div {
		display: grid;
		grid-template-columns: 38px minmax(0, 1fr) 38px;
		align-items: center;
		gap: 8px;
		min-height: 42px;
		padding: 3px 8px;
		border: 1px solid rgba(205, 165, 74, 0.35);
		background: rgba(1, 8, 10, 0.7);
	}
	.bonus-confirm-bet button {
		display: grid;
		width: 34px;
		height: 34px;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--bonus-accent) 45%, #b88932);
		border-radius: 50%;
		background: radial-gradient(circle, rgba(13, 83, 46, 0.96), rgba(2, 20, 11, 0.98));
		color: #ffe28a;
		font-size: 22px;
		font-weight: 900;
		line-height: 1;
		cursor: pointer;
	}
	.bonus-confirm-bet button:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.bonus-confirm-bet strong {
		color: #fff0be;
		font-family: var(--display-font, Georgia, serif);
		font-size: clamp(15px, 2vw, 22px);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.03em;
	}
	.insufficient {
		margin: 2% 0 0;
		color: #ff8e6b;
		font-size: 9px;
		font-weight: 900;
		letter-spacing: 0.12em;
	}
	.bonus-confirm-actions {
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		width: 92%;
		margin-top: auto;
		gap: 8px;
	}
	.bonus-confirm-actions button {
		min-height: 46px;
		border: 1px solid #8e6c29;
		background: rgba(4, 10, 10, 0.94);
		color: #e9d39b;
		font-family: var(--display-font, Georgia, serif);
		font-size: clamp(10px, 1.4vw, 16px);
		font-weight: 800;
		letter-spacing: 0.06em;
		cursor: pointer;
	}
	.bonus-confirm-actions .buy {
		border-color: color-mix(in srgb, var(--bonus-accent) 48%, #d5aa45);
		background: linear-gradient(180deg, rgba(10, 73, 40, 0.95), rgba(3, 30, 18, 0.98));
		color: #ffe7a0;
	}
	.bonus-confirm-actions button:hover:not(:disabled) {
		filter: brightness(1.18);
	}
	.bonus-confirm-actions button:disabled {
		opacity: 0.42;
		cursor: not-allowed;
	}
	.authority-note {
		margin-top: 2.8%;
		color: rgba(211, 219, 207, 0.62);
		font-size: clamp(5px, 0.65vw, 8px);
		letter-spacing: 0.045em;
	}

	@media (max-width: 600px) {
		.bonus-confirm-modal {
			width: min(96vw, 460px);
			aspect-ratio: 4 / 5;
			background-position: 32% center;
		}
		.bonus-confirm-shade {
			background: linear-gradient(180deg, rgba(1, 5, 7, 0.28), rgba(1, 5, 7, 0.93) 45%);
		}
		.bonus-confirm-copy {
			top: 39%;
			right: 7%;
			bottom: 5%;
			left: 7%;
			width: auto;
		}
		h2 {
			margin: 1% 0 2%;
		}
		dl div {
			padding: 1.8% 4%;
		}
		.bonus-confirm-actions button {
			min-height: 42px;
		}
	}
</style>
