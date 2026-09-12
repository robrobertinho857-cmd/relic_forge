<script lang="ts">
	type Props = {
		text: string;
		tone?: 'danger' | 'current' | 'reward';
	};

	let { text, tone = 'danger' }: Props = $props();
</script>

<div class={`event-warning ${tone}`} role="status" aria-live="assertive">
	<span>{tone === 'danger' ? 'DANGER AHEAD' : 'CURRENT AHEAD'}</span>
	<strong>{text}</strong>
</div>

<style>
	.event-warning {
		position: absolute;
		z-index: 18;
		top: 23%;
		left: 50%;
		display: grid;
		gap: 6px;
		width: min(500px, 82%);
		padding: 12px 18px;
		border-block: 1px solid #e06d3e;
		background: linear-gradient(90deg, transparent, rgba(46, 10, 5, 0.94) 18% 82%, transparent);
		color: #ffb278;
		text-align: center;
		text-shadow: 0 2px 12px #000;
		transform: translateX(-50%);
		pointer-events: none;
		animation: warning-in 0.42s ease-out both;
	}
	.event-warning span {
		font:
			900 0.56rem/1 system-ui,
			sans-serif;
		letter-spacing: 0.24em;
	}
	.event-warning strong {
		font:
			700 clamp(0.95rem, 2.4vw, 1.45rem) / 1 system-ui,
			sans-serif;
		letter-spacing: 0.13em;
	}
	.event-warning.current {
		border-color: #95b9c8;
		background: linear-gradient(90deg, transparent, rgba(24, 47, 60, 0.94) 18% 82%, transparent);
		color: #d0e5ee;
	}
	.event-warning.reward {
		border-color: #d8a645;
		background: linear-gradient(90deg, transparent, rgba(47, 33, 7, 0.94) 18% 82%, transparent);
		color: #ffe099;
	}
	@keyframes warning-in {
		from {
			opacity: 0;
			transform: translate(-50%, -10px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translate(-50%, 0) scale(1);
		}
	}
	@media (max-width: 620px) {
		.event-warning {
			top: 25%;
			width: 88%;
			padding: 9px 12px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.event-warning {
			animation: none;
		}
	}
</style>
