<script lang="ts">
	import type { RelicWildWinLine } from '../game/types';

	type Props = {
		line: RelicWildWinLine;
		currency: string;
	};
	const { line, currency }: Props = $props();
	const formatMoney = (amount: number) =>
		new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency,
			minimumFractionDigits: 2,
		}).format(amount);
</script>

<div
	class="multiplier-combine"
	aria-live="assertive"
	data-relic-combine={line.multiplier}
	data-relic-line={line.lineIndex}
>
	<span>BASE WIN · {formatMoney(line.baseWin)}</span>
	<strong>{line.relicWilds.map((wild) => `×${wild.multiplier}`).join(' + ')}</strong>
	<i>↓</i>
	<b>×{line.multiplier}</b>
	<em>{formatMoney(line.win)}</em>
</div>

<style>
	.multiplier-combine {
		position: fixed;
		top: 42%;
		left: 50%;
		z-index: 24;
		display: grid;
		min-width: min(340px, calc(100vw - 32px));
		padding: 18px 28px;
		place-items: center;
		border: 1px solid #d3a444;
		clip-path: polygon(5% 0, 95% 0, 100% 18%, 100% 82%, 95% 100%, 5% 100%, 0 82%, 0 18%);
		background: linear-gradient(140deg, rgba(8, 38, 25, 0.98), rgba(3, 8, 8, 0.98));
		box-shadow: 0 0 35px rgba(42, 245, 126, 0.3);
		color: #f6dea1;
		font-family: var(--display-font, Georgia, serif);
		text-align: center;
		transform: translate(-50%, -50%);
		animation: combine-in 300ms ease-out;
	}
	span {
		font-size: 9px;
		letter-spacing: 0.15em;
	}
	strong {
		margin-top: 7px;
		font-size: 25px;
	}
	i {
		color: #52eb94;
		font-style: normal;
	}
	b {
		color: #7cffad;
		font-size: 38px;
		text-shadow: 0 0 16px rgba(55, 255, 137, 0.64);
	}
	em {
		color: #fff0bb;
		font-size: 18px;
		font-style: normal;
	}
	@keyframes combine-in {
		from {
			opacity: 0;
			filter: brightness(2);
			transform: translate(-50%, -50%) scale(0.85);
		}
	}
</style>
