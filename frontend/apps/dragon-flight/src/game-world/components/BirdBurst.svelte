<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	let {
		bird,
		x,
		y,
		muted,
		onfallback,
		onfinish,
	}: {
		bird: 'eagle' | 'woodpecker' | 'azure-swift' | 'archaeopteryx';
		x: number;
		y: number;
		muted: boolean;
		onfallback: () => void;
		onfinish: () => void;
	} = $props();
	let video: HTMLVideoElement;
	let hidden = $state(false);
	onMount(() => {
		let done = false;
		const visibility = () => (hidden = document.hidden);
		visibility();
		document.addEventListener('visibilitychange', visibility);
		const finish = () => {
			if (done) return;
			done = true;
			clearTimeout(timer);
			video.pause();
			onfinish();
		};
		const timer = setTimeout(finish, 5000);
		const start = () => {
			void video.play().catch(() => {
				if (done) return;
				video.muted = true;
				void video
					.play()
					.then(() => {
						if (!done) onfallback();
					})
					.catch(finish);
			});
		};
		video.addEventListener('loadeddata', start, { once: true });
		video.addEventListener('ended', finish);
		video.addEventListener('error', finish);
		if (video.readyState >= 2) start();
		else video.load();
		return () => {
			done = true;
			document.removeEventListener('visibilitychange', visibility);
			clearTimeout(timer);
			video.pause();
			video.removeEventListener('loadeddata', start);
			video.removeEventListener('ended', finish);
			video.removeEventListener('error', finish);
		};
	});
</script>

<video
	bind:this={video}
	src={`${base || '.'}/bursts/${bird}.webm`}
	muted={muted || hidden}
	playsinline
	preload="auto"
	style:left={`${x}px`}
	style:top={`${y}px`}
	aria-label={`${bird} disappearing in a burst of feathers`}
></video>

<style>
	video {
		position: absolute;
		width: clamp(250px, 38vw, 460px);
		height: auto;
		transform: translate(-50%, -42%);
		z-index: 30;
		pointer-events: none;
	}
</style>
