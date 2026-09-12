<script lang="ts">
	import type { PickupType } from '../types';
	import { PICKUP_LABELS } from '../presentation';

	type Props = {
		pickupType: PickupType;
		fromMultiplier: number;
		toMultiplier: number;
	};

	let { pickupType, fromMultiplier, toMultiplier }: Props = $props();
</script>

<div class={`collectible-event ${pickupType}`}>
	<div class="pickup-object"><i></i></div>
	<div class="pickup-copy">
		<strong>{PICKUP_LABELS[pickupType]}</strong>
		<span>x{fromMultiplier.toFixed(2)} → x{toMultiplier.toFixed(2)}</span>
	</div>
</div>

<style>
	.collectible-event {
		position: absolute;
		z-index: 11;
		top: 43%;
		left: 68%;
		display: grid;
		place-items: center;
		color: #c6d6cb;
		text-align: center;
		pointer-events: none;
		animation: pickup-approach calc(0.62s / var(--playback-speed, 1)) ease-in forwards;
	}
	.pickup-object {
		position: relative;
		width: clamp(42px, 6vw, 68px);
		aspect-ratio: 0.8;
		background: linear-gradient(125deg, #f4ede0, currentColor 42%, #687e7a);
		clip-path: polygon(50% 0, 94% 30%, 80% 78%, 42% 100%, 4% 68%, 12% 24%);
		filter: drop-shadow(0 4px 5px #15262966);
	}
	.pickup-object i {
		position: absolute;
		inset: 0 35% 0 25%;
		background: #f8f5e344;
		clip-path: polygon(60% 0, 100% 35%, 45% 100%, 0 30%);
	}
	.feather .pickup-object,
	.goldenFeather .pickup-object {
		aspect-ratio: 0.55;
		border-radius: 85% 15% 65% 35%;
		clip-path: polygon(
			55% 0,
			85% 8%,
			100% 32%,
			82% 52%,
			92% 50%,
			70% 72%,
			74% 80%,
			30% 96%,
			18% 100%,
			28% 80%,
			0 54%,
			12% 55%,
			0 30%,
			20% 10%
		);
		transform: rotate(25deg);
	}
	.feather .pickup-object i,
	.goldenFeather .pickup-object i {
		inset: 5% 47% 0;
		clip-path: none;
		background: #f7f4deaa;
	}
	.pickup-copy {
		position: absolute;
		top: calc(100% + 12px);
		left: 50%;
		width: max-content;
		max-width: 230px;
		padding: 7px 11px;
		border: 1px solid #abc2be66;
		border-radius: 6px;
		background: #122a2de8;
		transform: translateX(-50%);
	}
	.pickup-copy strong,
	.pickup-copy span {
		display: block;
	}
	.pickup-copy strong {
		color: #e9efea;
		font:
			700 0.66rem/1.1 system-ui,
			sans-serif;
		letter-spacing: 0.08em;
	}
	.pickup-copy span {
		margin-top: 5px;
		font:
			700 0.75rem/1 system-ui,
			sans-serif;
	}
	.amberCrystal {
		color: #d7a366;
	}
	.greenCrystal {
		color: #87b59c;
	}
	.goldenFeather {
		color: #d7c285;
	}
	.skyCrystal {
		color: #9fc4d5;
	}
	@keyframes pickup-approach {
		0% {
			opacity: 0;
			transform: translate(30px, -12px) scale(0.45);
		}
		42% {
			opacity: 1;
			transform: translate(0, 0) scale(1);
		}
		100% {
			opacity: 0.25;
			transform: translate(-43vw, 2vh) scale(0.3);
		}
	}
	@media (max-width: 620px) {
		.collectible-event {
			left: 72%;
		}
		.pickup-copy {
			max-width: 180px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.collectible-event {
			animation: none;
		}
	}
</style>
