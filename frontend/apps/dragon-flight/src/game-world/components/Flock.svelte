<script lang="ts">
	import type { CreatureId } from '../types';
	import type { ActiveBird } from '../flock/types';
	import { getCreature } from '../creatures';
	import FlyingBird from './FlyingBird.svelte';
	import BirdBurst from './BirdBurst.svelte';
	let {
		birds,
		frames,
		hidden = false,
	}: {
		birds: ActiveBird[];
		frames: Partial<Record<CreatureId, readonly ImageBitmap[]>>;
		hidden?: boolean;
	} = $props();
</script>

{#if !hidden}
	{#each birds as bird (bird.id)}
		{#if bird.visible}
			{#if bird.elimination?.reason === 'terrain' || bird.elimination?.reason === 'hunter'}
				<BirdBurst
					compact
					bird={bird.id}
					x={bird.body.position.x}
					y={bird.body.position.y}
					muted={true}
					onfallback={() => {}}
					onfinish={() => {}}
				/>
			{:else}<FlyingBird {bird} profile={getCreature(bird.id)} frames={frames[bird.id]} />{/if}
		{/if}
	{/each}
{/if}
