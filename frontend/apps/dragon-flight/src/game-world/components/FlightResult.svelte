<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { t } from '../i18n';
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
		onAgain,
		onSettings,
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
		onAgain: () => void;
		onSettings: () => void;
	} = $props();
	let dialog: HTMLDialogElement;
	const crashed = $derived(round.ending === 'crash');
	const netLoss = $derived(round.finalWin - (round.entryCost ?? round.bet) < 0);
	const portraitOffsets: Record<string, number> = {
		eagle: 66,
		woodpecker: 190,
		'azure-swift': 302,
		archaeopteryx: 414,
	};
	onMount(() => {
		dialog.showModal();
		return () => dialog.close();
	});
</script>

{#snippet symbol(kind: string)}
	<svg viewBox="0 0 24 24" aria-hidden="true">
		{#if kind === 'settings'}<path
				d="m9 3-1 3-3-1-2 4 2 2v2l-2 2 2 4 3-1 1 3h6l1-3 3 1 2-4-2-2v-2l2-2-2-4-3 1-1-3z"
			/><circle cx="12" cy="12" r="3" />
		{:else if kind === 'again'}<path d="M20 8a9 9 0 1 0 0 8M20 3v6h-6" />
		{:else if kind === 'launch'}<path
				d="M11 13C8 12 4 9 2 5c0 7 4 11 9 11M13 13c3-1 7-4 9-8 0 7-4 11-9 11M5 16l5 4m9-4-5 4"
			/>
		{:else if kind === 'moon'}<path d="M18 17A9 9 0 0 1 8 3a9 9 0 1 0 10 14Z" />
		{:else if kind === 'cloud'}<path
				d="M5 17a4 4 0 0 1-1-8 6 6 0 0 1 12-1 4.5 4.5 0 0 1 3 9ZM7 20l-1 2m6-2-1 2m6-2-1 2"
			/>
		{:else}<circle cx="12" cy="12" r="4" /><path
				d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"
			/>{/if}
	</svg>
{/snippet}

<dialog
	bind:this={dialog}
	class="flight-result"
	class:crashed
	aria-labelledby="flight-result-title"
	oncancel={(event) => {
		event.preventDefault();
		if (!settingsDisabled) onSettings();
	}}
>
	<header
		class="result-heading"
		class:crash-art={crashed}
		style={crashed ? `background-image:url('${base || '.'}/ui/crash-heading-transparent.png');` : ''}
	>
		<h2 id="flight-result-title" class:visually-hidden={crashed}>{title}</h2>
	</header>
	<div class="result-stats">
		<div class="stat"><span>{t('entryCost')}</span><strong>{entryCost}</strong></div>
		<div class="stat">
			<span>{t('multiplier')}</span><strong class:negative={crashed}
				>×{multiplier.toFixed(2)}</strong
			>
		</div>
		<div class="stat"><span>{t('payout')}</span><strong>{payout}</strong></div>
		<div class="stat">
			<span>{t('netResult')}</span><strong class:negative={netLoss}>{netResult}</strong>
		</div>
	</div>
	<div class="gold-divider" aria-hidden="true"><i></i>{@render symbol('launch')}<i></i></div>
	<div class="result-bird">
		<span class="portrait"
			><img
				src={`${base || '.'}/ui/bet-panel-reference.png`}
				style={`left:${-portraitOffsets[creature.id]}%;`}
				alt=""
			/></span
		>
		<div><span>{t('creature')}</span><strong>{creature.name}</strong></div>
	</div>
	<div class="result-details">
		<div>
			{@render symbol('launch')}
			<div><span>{t('launch')}</span><strong>{round.launchStyle}</strong></div>
		</div>
		<div>
			{@render symbol(weatherName.toLowerCase() === 'clear' ? 'sun' : 'cloud')}
			<div><span>{t('weather')}</span><strong>{weatherName}</strong></div>
		</div>
		<div>
			{@render symbol(timeName.toLowerCase() === 'night' ? 'moon' : 'sun')}
			<div><span>{t('time')}</span><strong>{timeName}</strong></div>
		</div>
	</div>
	<p class="result-mode">
		{replay ? 'REPLAY — NO BET PLACED' : live ? 'SERVER RESULT' : 'DEMO RESULT — NO REAL MONEY'}
	</p>
	<button class="again-button" {disabled} onclick={onAgain}
		>{@render symbol('again')}<span
			>{replay ? t('playAgain') : round.bonusFlight ? t('buyAgain') : t('flyAgain')}
			{entryCost}</span
		></button
	>
	<button class="settings-button" disabled={settingsDisabled} onclick={onSettings}
		>{@render symbol('settings')}<span>{t('changeSettings')}</span></button
	>
</dialog>

<style>
	.flight-result {
		box-sizing: border-box;
		width: min(660px, calc(100vw - 28px));
		max-height: calc(100dvh - 28px);
		padding: 18px 22px 22px;
		overflow-y: auto;
		border: 1px solid #d0aa60;
		border-radius: 20px;
		color: #f1f0e9;
		background: linear-gradient(135deg, #101e28f7, #070f16fa);
		box-shadow:
			inset 0 0 0 4px #c9963520,
			0 20px 80px #0009;
	}
	.flight-result::backdrop {
		background: #06101970;
		backdrop-filter: blur(4px);
	}
	.result-heading {
		display: grid;
		place-items: center;
		height: 122px;
		margin: -18px -22px 8px;
		padding: 0 20px;
		color: #eed2a0;
		background: radial-gradient(ellipse at center, #a7853e44, transparent 70%);
	}
	.result-heading.crash-art {
		height: clamp(82px, 18vw, 140px);
		background-size: contain;
		background-position: center;
		background-repeat: no-repeat;
		background-origin: content-box;
	}
	h2 {
		margin: 0;
		font-family: Georgia, serif !important;
		font-size: clamp(2rem, 5vw, 3.5rem);
		text-transform: uppercase;
		text-align: center;
		text-shadow: 0 2px 12px #b1792d66;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.result-stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}
	.stat {
		display: grid;
		justify-items: center;
		align-content: center;
		gap: 7px;
		min-height: 70px;
		padding: 10px 6px;
		border: 1px solid #a68e6266;
		border-radius: 10px;
		background: #080f1699;
		text-align: center;
	}
	span {
		color: #d0ad73;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.045em;
		text-transform: uppercase;
	}
	strong {
		font-size: 1.55rem;
		line-height: 1.15;
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
	}
	strong.negative {
		color: #f44b47;
	}
	.gold-divider {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 14px 0;
		color: #dfbc85;
	}
	.gold-divider i {
		height: 1px;
		flex: 1;
		background: linear-gradient(90deg, transparent, #d9b277);
	}
	.gold-divider i:last-child {
		transform: scaleX(-1);
	}
	svg {
		width: 28px;
		height: 28px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linejoin: round;
		stroke-linecap: round;
		flex: 0 0 auto;
	}
	.result-bird {
		display: flex;
		align-items: center;
		gap: 18px;
		padding: 8px 14px;
		border: 1px solid #a68e6266;
		border-radius: 12px;
		background: #080f1699;
	}
	.result-bird > div {
		display: grid;
		gap: 7px;
	}
	.result-bird strong {
		font-size: 1.4rem;
	}
	.portrait {
		position: relative;
		width: 78px;
		height: 78px;
		flex: 0 0 auto;
		border: 1px solid #99733b;
		border-radius: 12px;
		overflow: hidden;
		background: #09141b;
	}
	.portrait img {
		position: absolute;
		top: -140%;
		width: 1553%;
		height: auto;
		max-width: none;
	}
	.result-details {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		margin-top: 12px;
	}
	.result-details > div {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		min-height: 62px;
		padding: 8px 6px;
		border: 1px solid #a68e6266;
		border-radius: 10px;
		background: #080f1699;
	}
	.result-details svg {
		color: #d6ac60;
	}
	.result-details > div > div {
		display: grid;
		gap: 6px;
	}
	.result-details strong {
		font-size: 0.95rem;
		text-transform: uppercase;
	}
	.result-mode {
		color: #819096;
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-align: center;
		margin: 14px 0;
	}
	button {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: center;
		gap: 12px;
		min-height: 50px;
		padding: 10px 14px;
		border: 1px solid #d0aa60;
		border-radius: 12px;
		background: #0e1a22;
		cursor: pointer;
	}
	button span {
		font-size: 1rem;
	}
	.again-button {
		color: #332008;
		background: linear-gradient(145deg, #ffdc7c, #e9a832 65%, #ba741a);
		box-shadow:
			inset 0 0 0 2px #ffe4a055,
			0 0 18px #e8a32644;
	}
	.again-button span {
		color: inherit;
	}
	.again-button:hover:not(:disabled) {
		background: linear-gradient(145deg, #ffe59a, #ffc147 55%, #dd931f);
	}
	.settings-button {
		margin-top: 10px;
		color: #d0ad73;
	}
	.settings-button:hover:not(:disabled) {
		background: #1b2932;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	@media (max-width: 600px) {
		.flight-result {
			padding: 14px;
			border-radius: 16px;
		}
		.result-heading {
			margin: -14px -14px 6px;
			height: 85px;
		}
		.result-stats {
			gap: 7px;
		}
		.stat {
			min-height: 58px;
			padding: 7px 4px;
			gap: 6px;
		}
		span {
			font-size: 0.5rem;
		}
		strong {
			font-size: 1.15rem;
		}
		.gold-divider {
			margin: 10px 0;
		}
		.result-bird {
			padding: 7px 10px;
			gap: 12px;
		}
		.portrait {
			width: 60px;
			height: 60px;
			border-radius: 9px;
		}
		.result-bird strong {
			font-size: 1.1rem;
		}
		.result-details {
			gap: 7px;
			margin-top: 9px;
		}
		.result-details > div {
			gap: 5px;
			min-height: 50px;
			padding: 7px 4px;
		}
		.result-details svg {
			width: 20px;
			height: 20px;
		}
		.result-details strong {
			font-size: 0.7rem;
		}
		button {
			min-height: 44px;
			gap: 8px;
		}
		button span {
			font-size: 0.8rem;
		}
	}
</style>

