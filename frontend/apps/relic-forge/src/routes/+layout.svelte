<script lang="ts">
	import { type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import Game from '../components/Game.svelte';
	import SessionGate from '../components/SessionGate.svelte';

	type Props = { children: Snippet };
	const props: Props = $props();
</script>

<GlobalStyle>
	<SessionGate>
		<Game />
	</SessionGate>
</GlobalStyle>

{@render props.children()}
