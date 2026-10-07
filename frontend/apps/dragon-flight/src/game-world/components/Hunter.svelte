<script lang="ts">
	import type { WorldBounds } from '../types';
	import { hunterTrajectory, type HunterShot } from '../flock/hunter';
	let { bounds, shot }: { bounds: WorldBounds; shot?: HunterShot } = $props();
	const trajectory = $derived(
		hunterTrajectory(
			bounds,
			shot ?? {
				target: { x: bounds.width * 0.25, y: bounds.height * 0.5 },
				progress: 0,
				hit: false,
			},
		),
	);
</script>

<div
	class="hunter"
	aria-hidden="true"
	style={`left:${trajectory.origin.x - 100 * trajectory.scale}px;top:${trajectory.origin.y - 73 * trajectory.scale}px;width:${160 * trajectory.scale}px;`}
>
	<svg viewBox="0 0 160 250">
		<defs
			><linearGradient id="hunter-coat" x2="1" y2="1"
				><stop stop-color="#56604a" /><stop offset="1" stop-color="#1b2b28" /></linearGradient
			></defs
		>
		<g class="truck">
			<ellipse cx="45" cy="238" rx="143" ry="9" fill="#0a151a" opacity=".35" />
			<path
				d="m-90 208 8-38 49-5 16-37h66l20 39h73v42z"
				fill="#415d61"
				stroke="#a8b2a0"
				stroke-width="2"
			/>
			<path d="m-22 166 13-30h47l17 30z" fill="#142b36" stroke="#d0b67d" stroke-width="2" />
			<path
				d="M12 138v28M-76 173h53v31m78-32h75v23H57"
				fill="none"
				stroke="#799593"
				stroke-width="2"
			/>
			<circle cx="20" cy="148" r="8" fill="#c39b75" /><path
				d="m9 166 3-11 11-1 11 12"
				fill="#6e6850"
			/><path d="m25 159 15 6" stroke="#c39b75" stroke-width="4" />
			<circle cx="43" cy="164" r="7" fill="none" stroke="#b6b8a2" stroke-width="2" />
			<path d="M65 167h80M-90 207h241" stroke="#cfb77e" stroke-width="4" />
			<rect x="-91" y="181" width="12" height="8" fill="#ffdf94" /><rect
				x="137"
				y="183"
				width="8"
				height="10"
				fill="#bd684c"
			/>
			{#each [-49, 110] as wheel (wheel)}<g class="wheel"
					><circle
						cx={wheel}
						cy="218"
						r="21"
						fill="#14212a"
						stroke="#78908d"
						stroke-width="3"
					/><circle cx={wheel} cy="218" r="10" fill="#87938a" /><path
						d={`M${wheel - 6} 218h12m-6-6v12`}
						stroke="#283b40"
						stroke-width="2"
					/></g
				>{/each}
		</g>
		<g transform="translate(0 25)">
			<path
				d="m94 104-12 54-9 11h31l6-57 10 47-1 10h30l-14-18-9-53"
				fill="#17232a"
				stroke="#83908a"
				stroke-width="1.5"
			/>
			<path
				d="m95 36-18 35 5 43 49 1-5-55-11-21"
				fill="url(#hunter-coat)"
				stroke="#b09b6e"
				stroke-width="1.5"
			/>
			<path d="m88 83 43 7-2 12-45-7" fill="#8a6540" />
			<rect x="104" y="89" width="11" height="10" rx="2" fill="#c7a45d" />
			<path d="m98 21-6 11 9 9 12-3 3-18" fill="#c39b75" />
			<path
				d="m83 19 41 4-9-9-5-10-18 2-4 10-17 3"
				fill="#273733"
				stroke="#b9a273"
				stroke-width="1.5"
			/>
			<path d="m102 26 8 2-7 2" fill="#1b2426" />
			<g transform={`rotate(${trajectory.angle} 100 48)`}>
				<path
					d="m120 57-26-10-8 7-16-4"
					fill="none"
					stroke="#455445"
					stroke-width="14"
					stroke-linecap="round"
				/>
				<path
					d="M29 46h65l8-4 28 7v13l-27-10H80l-10-3H29z"
					fill="#543c2d"
					stroke="#b59b63"
					stroke-width="1.5"
				/>
				<path d="M26 45h71" stroke="#b3bcc0" stroke-width="4" />
				<path d="M86 52q-8 12 5 10l6-8" fill="none" stroke="#ccb576" stroke-width="2" />
				<path d="m91 48 7 4m-29-4 7 3" stroke="#cba37a" stroke-width="7" stroke-linecap="round" />
				{#if shot && shot.progress >= 0 && shot.progress < 0.23}<path
						d="m28 46-13-9 3 8-15 2 15 3-2 8z"
						fill="#ffda7e"
						class="flash"
					/>{/if}
			</g>
		</g>
		<path d="M69 177h75v26H69z" fill="#415d61" stroke="#799593" stroke-width="2" />
	</svg>
</div>
{#if shot && shot.progress >= 0 && shot.progress < 1}
	<div
		class="bullet"
		aria-hidden="true"
		style={`transform:translate3d(${trajectory.bullet.x}px,${trajectory.bullet.y}px,0) rotate(${trajectory.angle + 180}deg);`}
	></div>
{/if}

<style>
	.hunter {
		position: absolute;
		z-index: 18;
		pointer-events: none;
		filter: drop-shadow(0 3px 4px #08151c88);
	}
	svg {
		width: 100%;
		display: block;
		overflow: visible;
	}
	.bullet {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 24;
		width: 14px;
		height: 3px;
		border-radius: 50%;
		background: #fff3c0;
		box-shadow:
			-8px 0 8px #edb24a,
			0 0 5px #ffd36a;
		pointer-events: none;
	}
	.flash {
		filter: drop-shadow(0 0 5px #ffc75a);
	}
	.wheel {
		transform-box: fill-box;
		transform-origin: center;
		animation: wheel-roll 0.6s linear infinite;
	}
	@keyframes wheel-roll {
		to {
			transform: rotate(-360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.wheel {
			animation: none;
		}
	}
</style>
