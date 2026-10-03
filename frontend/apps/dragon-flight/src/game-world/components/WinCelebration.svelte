<script lang="ts">
	import type { WinTier } from '../types';
	import { t } from '../i18n';

	type Props = {
		tier: WinTier;
		multiplier: string;
		win: string;
	};

	let { tier, multiplier, win }: Props = $props();
</script>

<div class={`win-celebration ${tier.id}`} aria-live="polite">
	<div class="rays" aria-hidden="true"></div>
	<div class="sparkles" aria-hidden="true">
		{#each Array(30) as _, index (index)}
			<i style={`--i:${index};--x:${(index * 37) % 100}%;--delay:${-(index % 9) * 0.3}s`}></i>
		{/each}
	</div>
	<div class="win-content">
		<small>Lucky Flight</small>
		<strong>{t('payout')}</strong>
		<b dir="ltr">{win}</b>
		<span dir="ltr">{multiplier}</span>
	</div>
</div>

<style>
	.win-celebration {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: grid;
		place-items: center;
		overflow: hidden;
		background: radial-gradient(ellipse at center, #245e4bcc, #06191cec 65%, #02090bf5);
		backdrop-filter: blur(8px);
		animation: reveal 350ms ease-out both;
	}
	.win-content {
		position: relative;
		display: grid;
		place-items: center;
		width: 100%;
		box-sizing: border-box;
		padding: 24px;
		text-align: center;
		font-family: system-ui, sans-serif;
	}
	.win-celebration strong {
		color: #e2e9df;
		margin-block: 18px 22px;
		font-size: clamp(1.3rem, 4vw, 3rem);
		letter-spacing: 0.16em;
		text-shadow: 0 0 18px rgba(255, 188, 68, 0.45);
	}
	.win-celebration span {
		margin-top: 28px;
		padding: 9px 24px;
		border: 1px solid #93d0ab70;
		border-radius: 999px;
		background: #13352c99;
		color: #72efb2;
		font:
			800 clamp(1rem, 3vw, 1.8rem) / 1 system-ui,
			sans-serif;
	}
	.win-celebration b {
		margin-top: 5px;
		color: #ffe3a0;
		font-size: clamp(2.2rem, 10vw, 8rem);
		font-weight: 900;
		line-height: 1.15;
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
		max-width: 100%;
		text-shadow:
			0 3px 0 #785b28,
			0 0 40px #e5b45160,
			0 8px 35px #0008;
	}
	.win-celebration small {
		margin-top: 5px;
		color: #a8d8c2;
		font:
			700 clamp(0.75rem, 2vw, 1rem) / 1 system-ui,
			sans-serif;
		letter-spacing: 0.1em;
	}
	.win-celebration i {
		position: absolute;
		left: var(--x);
		top: -20px;
		width: 7px;
		height: 12px;
		border-radius: 2px;
		background: #e8c671;
		box-shadow: 0 0 10px #e8c67460;
		animation: celebration-particle calc(2.5s + var(--i) * 0.04s) linear var(--delay) infinite;
	}
	.win-celebration i:nth-child(3n) {
		background: #8ee8b9;
		width: 5px;
		height: 5px;
	}
	.rays {
		position: absolute;
		width: 150vmax;
		height: 150vmax;
		background: repeating-conic-gradient(from 0deg, #e7c66c0b 0deg 12deg, transparent 12deg 30deg);
		animation: rotate-rays 35s linear infinite;
	}
	.sparkles {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}
	@keyframes reveal {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@keyframes rotate-rays {
		to {
			transform: rotate(360deg);
		}
	}
	.big {
		box-shadow: inset 0 0 28px rgba(255, 167, 52, 0.13);
	}
	.great {
		border-color: rgba(159, 190, 202, 0.65);
	}
	.record {
		border-color: #d6a64d;
		box-shadow:
			inset 0 0 34px rgba(223, 178, 75, 0.16),
			0 0 25px rgba(100, 226, 165, 0.15);
	}
	@keyframes celebration-particle {
		to {
			transform: translate3d(40px, 110vh, 0) rotate(400deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.win-celebration,
		.rays,
		.win-celebration i {
			animation: none;
		}
		.sparkles {
			display: none;
		}
	}
</style>
