<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	let {
		phase,
		winner = 'dragon',
		bird = 'eagle',
		onstart,
		onfinish,
	}: {
		phase: 'playing' | 'outcome' | 'result';
		winner?: 'dragon' | 'eagle' | 'archaeopteryx' | 'azure-swift' | 'woodpecker';
		bird?: 'eagle' | 'archaeopteryx' | 'azure-swift' | 'woodpecker';
		onstart: () => void;
		onfinish: (played: boolean) => void;
	} = $props();
	const assets = $derived(
		`${base || '.'}/encounters/${winner === 'dragon' && bird !== 'eagle' ? `dragon-${bird}` : winner}-victory`,
	);
	const birdNames = {
		eagle: 'Eagle',
		archaeopteryx: 'Archaeopteryx',
		'azure-swift': 'Azure Swift',
		woodpecker: 'Woodpecker',
	};
	let video: HTMLVideoElement;
	let started = $state(false);
	let reduced = $state(false);
	let finish = (_played: boolean) => {};
	onMount(() => {
		let done = false;
		let disposed = false;
		let timer: ReturnType<typeof setTimeout>;
		finish = (played) => {
			if (done || disposed) return;
			done = true;
			clearTimeout(timer);
			video.pause();
			onfinish(played);
		};
		reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const start = () => {
			if (done || disposed || started) return;
			started = true;
			clearTimeout(timer);
			if (reduced) timer = setTimeout(() => finish(true), 1200);
			else {
				timer = setTimeout(() => finish(false), 7000);
				void video
					.play()
					.then(() => {
						if (!done && !disposed) onstart();
					})
					.catch(() => finish(false));
			}
		};
		const failed = () => finish(false);
		video.addEventListener('loadeddata', start);
		video.addEventListener('error', failed);
		timer = setTimeout(failed, 3000);
		if (video.readyState >= 2) start();
		else video.load();
		return () => {
			disposed = true;
			clearTimeout(timer);
			video.pause();
			video.removeEventListener('loadeddata', start);
			video.removeEventListener('error', failed);
		};
	});
</script>

<div class="dragon-victory" class:result={phase === 'result'}>
	<video
		bind:this={video}
		src={`${assets}/fight.webm`}
		muted
		playsinline
		preload="auto"
		class:hidden={!started || reduced || phase !== 'playing'}
		onended={() => finish(true)}
		aria-label={winner === 'dragon'
			? `Mountain dragon defeats the ${birdNames[bird]}`
			: `${birdNames[winner]} defeats the mountain dragon`}
	></video>
	{#if phase !== 'playing' || reduced}
		<img
			src={`${assets}/result.png`}
			alt={winner === 'dragon'
				? `Flying mountain dragon carrying the defeated ${birdNames[bird]} over its neck`
				: `Flying ${birdNames[winner]} carrying the defeated mountain dragon in its claws`}
		/>
	{/if}
	{#if phase === 'outcome'}
		<div class="fight-outcome" class:lost={winner === 'dragon'} role="status">
			<strong>{winner === 'dragon' ? 'LOSE' : 'WIN'}</strong>
		</div>
	{/if}
</div>

<style>
	.dragon-victory {
		position: absolute;
		inset: 0;
		z-index: 30;
		overflow: hidden;
		pointer-events: none;
	}
	.dragon-victory.result {
		z-index: 10;
	}
	video,
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.fight-outcome {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: grid;
		place-items: center;
		background: #07141099;
		color: #ffe39b;
	}
	.fight-outcome.lost {
		color: #ffaaa0;
	}
	.fight-outcome strong {
		font-family: 'Google Sans', sans-serif;
		font-size: clamp(5rem, 18vw, 15rem);
		font-weight: 700;
		line-height: 1;
		animation: outcome-reveal 1.4s ease-out both;
	}
	@keyframes outcome-reveal {
		0% {
			opacity: 0;
			transform: scale(0.82);
		}
		15%,
		80% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.fight-outcome strong {
			animation: none;
		}
	}
	.hidden {
		visibility: hidden;
	}
</style>
