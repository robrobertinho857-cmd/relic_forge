<script lang="ts">
	import type { ResolvedMode } from '../game/modes';
	import ModeCard from './ModeCard.svelte';

	type Props = {
		playModes: ResolvedMode[];
		bonusModes: ResolvedMode[];
		selectedPlayModeId: string;
		bet: number;
		currency: string;
		mock: boolean;
		onselectplay: (mode: ResolvedMode) => void;
		onselectbonus: (mode: ResolvedMode) => void;
		onstart: () => void;
		onclose: () => void;
	};

	const {
		playModes,
		bonusModes,
		selectedPlayModeId,
		bet,
		currency,
		mock,
		onselectplay,
		onselectbonus,
		onstart,
		onclose,
	}: Props = $props();
	const selectedMode = $derived(playModes.find((mode) => mode.id === selectedPlayModeId));
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onclose()} />

<div class="mode-selection-backdrop" role="presentation">
	<section
		class="mode-selection-screen"
		role="dialog"
		aria-modal="true"
		aria-label="Choose play mode"
	>
		<header class="mode-selection-header">
			<span class="mode-kicker">THE ANCIENT VAULT</span>
			<h2>RELIC F<span>O</span>RGE</h2>
			<p>SELECT THE FORGE THAT WILL CARRY YOUR WAGER</p>
		</header>

		<div class="mode-section">
			<div class="mode-section-title">
				<span></span>
				<h3>CHOOSE YOUR PLAY MODE</h3>
				<span></span>
			</div>
			<div class="mode-grid play-mode-grid">
				{#each playModes as mode (mode.id)}
					<ModeCard
						{mode}
						{bet}
						{currency}
						selected={selectedPlayModeId === mode.id}
						onselect={onselectplay}
					/>
				{/each}
			</div>
			<p class="mode-note">
				All production odds and outcomes remain authoritative in Stake Engine.
			</p>
		</div>

		<div class="mode-section bonus-section">
			<div class="mode-section-title">
				<span></span>
				<h3>BUY BONUS</h3>
				<span></span>
			</div>
			<div class="mode-grid bonus-mode-grid">
				{#each bonusModes as mode (mode.id)}
					<ModeCard {mode} {bet} {currency} selected={false} onselect={onselectbonus} />
				{/each}
			</div>
		</div>

		<footer class="mode-selection-footer">
			<button type="button" class="mode-back" onclick={onclose}>‹ BACK</button>
			<div class="selected-summary">
				<small>ACTIVE WAGER MODE</small>
				<strong>{selectedMode?.title ?? 'NORMAL'}</strong>
			</div>
			<button type="button" class="mode-start" disabled={!selectedMode?.available} onclick={onstart}
				>START GAME</button
			>
			<span class="mode-contract"
				>{mock ? 'DETERMINISTIC MOCK MODES' : 'AUTHENTICATED RGS MODES'}</span
			>
		</footer>
	</section>
</div>

<style>
	.mode-selection-backdrop {
		position: fixed;
		inset: 0;
		z-index: 30;
		overflow: auto;
		background:
			radial-gradient(circle at 12% 18%, rgba(158, 67, 14, 0.18), transparent 28%),
			radial-gradient(circle at 88% 15%, rgba(0, 116, 94, 0.2), transparent 28%),
			rgba(1, 5, 6, 0.97);
		backdrop-filter: blur(12px);
	}
	.mode-selection-screen {
		width: min(1360px, calc(100% - 30px));
		min-height: 100%;
		margin: 0 auto;
		padding: 12px 0 18px;
		color: #f4e8c7;
	}
	.mode-selection-header {
		position: relative;
		padding: 0 20px 12px;
		text-align: center;
	}
	.mode-selection-header::after {
		display: block;
		width: min(620px, 78vw);
		height: 1px;
		margin: 11px auto 0;
		background: linear-gradient(90deg, transparent, #a78035, transparent);
		content: '';
	}
	.mode-kicker {
		color: #9e9170;
		font-size: 8px;
		letter-spacing: 0.32em;
	}
	h2 {
		margin: 2px 0 0;
		color: #f4c95d;
		font-family: var(--display-font, Georgia, serif);
		font-size: clamp(34px, 5vw, 62px);
		line-height: 0.95;
		letter-spacing: 0.05em;
		text-shadow:
			0 3px 0 #6a3500,
			0 0 20px rgba(255, 190, 54, 0.24);
	}
	h2 span {
		color: #62e98e;
	}
	.mode-selection-header p {
		margin: 9px 0 0;
		color: #c9b982;
		font-family: var(--display-font, Georgia, serif);
		font-size: clamp(9px, 1.1vw, 15px);
		letter-spacing: 0.1em;
	}
	.mode-section {
		margin-top: 6px;
	}
	.mode-section-title {
		display: grid;
		grid-template-columns: minmax(24px, 1fr) auto minmax(24px, 1fr);
		align-items: center;
		gap: 14px;
		margin-bottom: 7px;
		padding: 0 8px;
	}
	.mode-section-title span {
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(194, 146, 51, 0.8));
	}
	.mode-section-title span:last-child {
		background: linear-gradient(90deg, rgba(194, 146, 51, 0.8), transparent);
	}
	h3 {
		margin: 0;
		color: #e4c782;
		font-family: var(--display-font, Georgia, serif);
		font-size: clamp(14px, 1.7vw, 24px);
		letter-spacing: 0.09em;
		text-align: center;
	}
	.mode-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
	}
	.mode-note {
		margin: 7px 0 0;
		color: #a99a75;
		font-size: 9px;
		letter-spacing: 0.08em;
		text-align: center;
	}
	.bonus-section {
		margin-top: 8px;
	}
	.mode-selection-footer {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 18px;
		margin-top: 10px;
		padding: 10px 8px 0;
		border-top: 1px solid rgba(178, 132, 43, 0.35);
	}
	.mode-selection-footer button {
		min-height: 48px;
		border: 1px solid #826525;
		background: linear-gradient(180deg, rgba(21, 47, 30, 0.98), rgba(5, 17, 12, 0.98));
		color: #f3d98f;
		font-family: var(--display-font, Georgia, serif);
		font-size: 17px;
		font-weight: 800;
		letter-spacing: 0.06em;
		cursor: pointer;
	}
	.mode-selection-footer button:hover:not(:disabled) {
		border-color: #e0b653;
		filter: brightness(1.13);
	}
	.mode-selection-footer button:disabled {
		opacity: 0.42;
		cursor: not-allowed;
	}
	.mode-back {
		justify-self: start;
		width: min(180px, 100%);
		background: rgba(7, 12, 12, 0.94) !important;
	}
	.mode-start {
		justify-self: end;
		width: min(240px, 100%);
		box-shadow: inset 0 0 18px rgba(34, 222, 106, 0.12);
	}
	.selected-summary {
		display: grid;
		gap: 3px;
		text-align: center;
	}
	.selected-summary small,
	.mode-contract {
		color: #8f8a77;
		font-size: 7px;
		letter-spacing: 0.16em;
	}
	.selected-summary strong {
		color: #f2d68d;
		font-family: var(--display-font, Georgia, serif);
		font-size: 16px;
		letter-spacing: 0.06em;
	}
	.mode-contract {
		position: absolute;
		right: 18px;
		margin-top: 69px;
	}

	@media (max-width: 1050px) {
		.mode-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.mode-grid :global(.mode-card:last-child) {
			grid-column: 1 / -1;
			width: calc(50% - 6px);
			justify-self: center;
		}
	}

	@media (max-width: 640px) {
		.mode-selection-screen {
			width: min(100% - 16px, 520px);
			padding-top: 12px;
		}
		.mode-grid {
			grid-template-columns: 1fr;
			gap: 9px;
		}
		.mode-grid :global(.mode-card:last-child) {
			grid-column: auto;
			width: 100%;
		}
		.mode-selection-footer {
			grid-template-columns: 1fr 1fr;
			gap: 8px;
		}
		.selected-summary {
			grid-column: 1 / -1;
			grid-row: 1;
		}
		.mode-back,
		.mode-start {
			width: 100%;
			font-size: 14px !important;
		}
		.mode-contract {
			display: none;
		}
	}
</style>
