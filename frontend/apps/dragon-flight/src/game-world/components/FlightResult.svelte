<script lang="ts">
	import type { CreatureProfile, FlightRound } from '../types';
	let {
		round,
		creature,
		title,
		entryCost,
		multiplier,
		payout,
		netResult,
		weatherName,
		timeName,
		live,
		replay,
		disabled,
		settingsDisabled,
		onSettings,
		tubeAmount,
		tubeReason = '',
		onTubeFlight,
	}: {
		round: FlightRound;
		creature: CreatureProfile;
		title: string;
		entryCost: string;
		multiplier: number;
		payout: string;
		netResult: string;
		weatherName: string;
		timeName: string;
		live: boolean;
		replay: boolean;
		disabled: boolean;
		settingsDisabled: boolean;
		onSettings: () => void;
		tubeAmount?: string;
		tubeReason?: string;
		onTubeFlight: () => void;
	} = $props();
	const netLoss = $derived(round.finalWin < (round.entryCost ?? round.bet));
</script>

<section class="flight-result" aria-label="Flight result" aria-live="polite">
	<header>
		<h2>{title}</h2>
		<span>{round.flock ? `${round.flock.survivors}/4 SURVIVED` : creature.name}</span>
	</header>
	<div class="result-stats">
		<div><span>ENTRY COST</span><strong>{entryCost}</strong></div>
		<div><span>MULTIPLIER</span><strong>×{multiplier.toFixed(2)}</strong></div>
		<div><span>PAYOUT</span><strong>{payout}</strong></div>
		<div><span>NET RESULT</span><strong class:negative={netLoss}>{netResult}</strong></div>
	</div>
	{#if round.flock?.bonusTriggered}<p class="details">
			BASE ×{round.flock.baseMultiplier.toFixed(2)} · BONUS +×{round.flock.bonus!.multiplier.toFixed(
				2,
			)}
		</p>{/if}
	<p class="details">
		{round.route === 'tube-flight' ? 'FLUPPY FLIGHT · ' : ''}{weatherName} · {timeName}<span
			>{replay ? 'REPLAY — NO BET PLACED' : live ? 'SERVER RESULT' : 'DEMO — NO REAL MONEY'}</span
		>
	</p>
	<div class="result-actions">
		{#if tubeAmount}<button
				class="fluppy-button"
				disabled={disabled || Boolean(tubeReason)}
				onclick={onTubeFlight}>PLAY FLUPPY FLIGHT · {tubeAmount}</button
			>{/if}
		<button class="settings-button" disabled={settingsDisabled} onclick={onSettings}
			>{round.route === 'tube-flight' ? 'RETURN TO HUNTER GAME' : 'CHANGE SETTINGS'}</button
		>
	</div>
	{#if tubeAmount}<p class="offer-note">
			{tubeReason || 'One attempt · half your net profit'}
		</p>{/if}
</section>

<style>
	.flight-result {
		position: absolute;
		z-index: 100;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -40%);
		width: min(620px, calc(100% - 28px));
		max-height: calc(100% - 100px);
		overflow: auto;
		padding: 18px;
		border: 1px solid #d0aa6099;
		border-radius: 18px;
		background: #09151eef;
		color: #f1f0e9;
		box-shadow: 0 12px 35px #0007;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
	}
	h2 {
		margin: 0;
		color: #f4cd78;
		font:
			700 clamp(1rem, 2.4vw, 1.6rem) Georgia,
			serif;
	}
	header span {
		color: #f4cd78;
		font-size: 0.8rem;
		font-weight: 700;
		white-space: nowrap;
	}
	.result-stats {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
	}
	.result-stats div {
		display: grid;
		gap: 6px;
		justify-items: center;
		padding: 10px 4px;
		background: #080f1699;
		border: 1px solid #a68e6244;
		border-radius: 10px;
	}
	.result-stats span {
		font-size: 0.55rem;
		color: #d0ad73;
		font-weight: 700;
	}
	strong {
		font-size: 1.2rem;
		overflow-wrap: anywhere;
	}
	.negative {
		color: #f44b47;
	}
	.details {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		color: #b5bcc2;
		font-size: 0.65rem;
		margin: 10px 0;
	}
	.details span {
		font-size: 0.55rem;
		color: #819096;
	}
	.result-actions {
		display: flex;
		gap: 10px;
	}
	button {
		flex: 1;
		min-height: 42px;
		padding: 8px;
		border: 1px solid #d0aa60;
		border-radius: 10px;
		background: #0e1a22;
		color: #d0ad73;
		cursor: pointer;
		font-weight: 700;
		font-size: 0.75rem;
	}
	.fluppy-button {
		color: #332008;
		background: linear-gradient(145deg, #ffdc7c, #e9a832 65%, #ba741a);
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.offer-note {
		margin: 7px 0 0;
		text-align: center;
		font-size: 0.6rem;
		color: #a9b3b8;
	}
	@media (max-width: 600px) {
		.flight-result {
			padding: 10px;
			max-height: calc(100% - 86px);
			border-radius: 12px;
		}
		header {
			margin-bottom: 7px;
			gap: 5px;
		}
		header span {
			font-size: 0.65rem;
		}
		.result-stats {
			gap: 4px;
		}
		.result-stats div {
			padding: 7px 2px;
			gap: 3px;
		}
		.result-stats span {
			font-size: 0.43rem;
		}
		strong {
			font-size: 0.9rem;
		}
		.details {
			margin: 7px 0;
			font-size: 0.55rem;
		}
		.details span {
			font-size: 0.45rem;
		}
		button {
			min-height: 36px;
			font-size: 0.6rem;
		}
		.result-actions {
			gap: 6px;
		}
	}
</style>
