<script lang="ts">
	import { type Snippet } from 'svelte';
	import { Authenticate } from 'components-shared';
	import { stateUrlDerived } from 'state-shared';

	type Props = { children: Snippet };
	const props: Props = $props();
	const requiresRgsSession = $derived(
		Boolean(stateUrlDerived.sessionID() && stateUrlDerived.rgsUrl()) || stateUrlDerived.replay(),
	);
</script>

{#if requiresRgsSession}
	<Authenticate>{@render props.children()}</Authenticate>
{:else}
	{@render props.children()}
{/if}
