<script lang="ts">
	import { formatCurrency } from '../game/currency';
	import type { PaylineWin, Position } from '../game/types';

	type Props = {
		line: PaylineWin;
		currency: string;
		relicWildKeys: string[];
	};

	const { line, currency, relicWildKeys }: Props = $props();
	const cells = Array.from({ length: 15 }, (_, index) => ({
		reel: index % 5,
		row: Math.floor(index / 5),
	}));
	const keyFor = (position: Position) => `${position.reel}:${position.row}`;
	const winningKeys = $derived(line.positions.map(keyFor));
	const points = $derived(
		line.positions.map(({ reel, row }) => `${reel + 0.5},${row + 0.5}`).join(' '),
	);
</script>

<div class="payline-presentation" data-payline={line.lineIndex}>
	<div class="payline-dimmer" aria-hidden="true">
		{#each cells as cell (keyFor(cell))}
			{#if !winningKeys.includes(keyFor(cell))}
				<span style={`grid-column:${cell.reel + 1};grid-row:${cell.row + 1}`}></span>
			{/if}
		{/each}
	</div>
	<svg viewBox="0 0 5 3" preserveAspectRatio="none" aria-hidden="true">
		<polyline class="payline-shadow" {points}></polyline>
		<polyline class="payline-path" {points}></polyline>
		{#each line.positions as position (keyFor(position))}
			<rect
				class:relic-position={relicWildKeys.includes(keyFor(position))}
				x={position.reel + 0.08}
				y={position.row + 0.08}
				width="0.84"
				height="0.84"
				rx="0.08"
			></rect>
		{/each}
	</svg>
	<div class="payline-info" aria-live="polite">
		LINE {line.lineIndex} <span>—</span> {formatCurrency(line.win, currency)}
	</div>
</div>

<style>
	.payline-presentation {
		position: absolute;
		inset: 5px;
		z-index: 12;
		pointer-events: none;
	}
	.payline-dimmer {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		grid-template-rows: repeat(3, minmax(0, 1fr));
		column-gap: 6px;
	}
	.payline-dimmer span {
		background: rgba(0, 4, 3, 0.55);
		box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.52);
		animation: payline-dim-in 140ms ease-out both;
	}
	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	polyline {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}
	.payline-shadow {
		stroke: rgba(1, 8, 4, 0.96);
		stroke-width: 9px;
	}
	.payline-path {
		stroke: #ffd35f;
		stroke-width: 4px;
		filter: drop-shadow(0 0 5px #ff9f1f) drop-shadow(0 0 9px rgba(51, 255, 132, 0.75));
		stroke-dasharray: 18 8;
		animation: payline-travel 520ms linear infinite;
	}
	rect {
		fill: rgba(255, 211, 95, 0.06);
		stroke: #ffe28a;
		stroke-width: 2px;
		vector-effect: non-scaling-stroke;
		filter: drop-shadow(0 0 5px rgba(255, 184, 45, 0.9));
		animation: payline-cell-pulse 520ms ease-in-out infinite alternate;
	}
	rect.relic-position {
		fill: rgba(61, 255, 139, 0.16);
		stroke: #65ffad;
		stroke-width: 4px;
		filter: drop-shadow(0 0 7px #3dff8e) drop-shadow(0 0 13px rgba(255, 210, 76, 0.9));
	}
	.payline-info {
		position: absolute;
		left: 50%;
		bottom: 5px;
		padding: 5px 12px;
		border: 1px solid rgba(255, 205, 83, 0.86);
		background: rgba(3, 19, 11, 0.93);
		box-shadow: 0 0 12px rgba(37, 255, 112, 0.35);
		color: #fff0ba;
		font-family: var(--display-font, Georgia, serif);
		font-size: clamp(9px, 1.2vw, 14px);
		font-weight: 900;
		letter-spacing: 0.08em;
		white-space: nowrap;
		transform: translateX(-50%);
	}
	.payline-info span {
		color: #5aff9e;
	}
	@keyframes payline-travel {
		to {
			stroke-dashoffset: -26;
		}
	}
	@keyframes payline-cell-pulse {
		to {
			opacity: 0.68;
		}
	}
	@keyframes payline-dim-in {
		from {
			opacity: 0;
		}
	}
	@media (max-width: 700px) {
		.payline-presentation {
			inset: 3px;
		}
		.payline-dimmer {
			column-gap: 3px;
		}
		.payline-info {
			bottom: 3px;
			padding: 4px 8px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.payline-path,
		rect,
		.payline-dimmer span {
			animation: none;
		}
	}
</style>
