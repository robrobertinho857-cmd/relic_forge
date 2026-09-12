<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		open,
		title,
		onClose,
		children,
	}: { open: boolean; title: string; onClose: () => void; children: Snippet } = $props();
	let dialog = $state<HTMLDialogElement>();
	const id = $props.id();
	$effect(() => {
		if (open && dialog && !dialog.open) dialog.showModal();
		if (!open && dialog?.open) dialog.close();
	});
</script>

<dialog bind:this={dialog} aria-labelledby={id} onclose={onClose}>
	<header>
		<h2 {id}>{title}</h2>
		<button type="button" aria-label={`Close ${title}`} onclick={() => dialog?.close()}>×</button>
	</header>
	<div class="content">{@render children()}</div>
</dialog>

<style>
	dialog {
		width: min(780px, calc(100vw - 24px));
		max-height: 90dvh;
		padding: 0;
		border: 1px solid #698985;
		border-radius: 18px;
		color: #e1eeea;
		background: #12272c;
		box-shadow: 0 24px 90px #0009;
	}
	dialog::backdrop {
		background: #061219b8;
		backdrop-filter: blur(5px);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		position: sticky;
		top: 0;
		z-index: 2;
		background: #12272c;
		padding: 16px 20px;
		border-bottom: 1px solid #536c6b;
	}
	h2 {
		margin: 0;
		font:
			750 1.3rem/1.2 system-ui,
			sans-serif;
	}
	button {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border: 1px solid #698985;
		border-radius: 50%;
		background: #092023;
		color: #e1eeea;
		font-size: 24px;
		cursor: pointer;
	}
	button:focus-visible {
		outline: 2px solid #71eac1;
		outline-offset: 3px;
	}
	.content {
		padding: 18px 20px 20px;
	}
	@media (max-width: 480px) {
		header {
			padding: 12px;
		}
		.content {
			padding: 12px;
		}
	}
</style>
