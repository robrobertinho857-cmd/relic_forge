<script lang="ts">
	import { CREATURES } from '../creatures';
	import type { CreatureId } from '../types';

	type Props = {
		open: boolean;
		selected: CreatureId;
		disabled?: boolean;
		onSelect: (creature: CreatureId) => void;
		onClose: () => void;
	};

	let { open, selected, disabled = false, onSelect, onClose }: Props = $props();
	let dialogElement = $state<HTMLDialogElement>();

	$effect(() => {
		if (!dialogElement) return;
		if (open && !dialogElement.open) dialogElement.showModal();
		if (!open && dialogElement.open) dialogElement.close();
	});

	function close() {
		if (dialogElement?.open) dialogElement.close();
		else onClose();
	}

	function choose(creature: CreatureId) {
		if (disabled) return;
		onSelect(creature);
		close();
	}

</script>

<dialog
	bind:this={dialogElement}
	class="creature-dialog"
	aria-labelledby="creature-picker-title"
	oncancel={(event) => { event.preventDefault(); close(); }}
	onclose={onClose}
>
	<section class="creature-picker">
		<header>
			<div><span>FLIGHT CREATURE</span><h2 id="creature-picker-title">Choose your flier</h2></div>
			<button type="button" aria-label="Close creature picker" onclick={close}>×</button>
		</header>
		<div class="creature-grid">
			{#each CREATURES as creature (creature.id)}
				<button
				type="button"
				disabled={disabled}
				class:selected={selected === creature.id}
				aria-pressed={selected === creature.id}
				onclick={() => choose(creature.id)}
				>
					<span class="preview">
						{#if creature.assets?.portrait}
							<img src={creature.assets.portrait} alt="" draggable="false" />
						{:else}
							<i class={creature.className}></i>
						{/if}
					</span>
					<span class="copy"><strong>{creature.name}</strong><small>{creature.description}</small></span>
				</button>
			{/each}
		</div>
	</section>
</dialog>

<style>
	.creature-dialog { width: min(590px, calc(100vw - 24px)); max-height: min(82dvh, 650px); padding: 0; border: 1px solid #b17d2d; background: transparent; color: #f4dfad; box-shadow: 0 22px 70px rgba(0, 0, 0, 0.75); }
	.creature-dialog::backdrop { background: rgba(1, 7, 4, 0.72); backdrop-filter: blur(3px); }
	.creature-picker { padding: 17px; border: 4px solid #171109; background: linear-gradient(145deg, rgba(8, 31, 22, 0.99), rgba(5, 12, 9, 0.99)); }
	header { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 13px; }
	header span { color: #5de7a7; font: 800 0.55rem/1 system-ui, sans-serif; letter-spacing: 0.18em; }
	h2 { margin: 4px 0 0; color: #f1c76e; font: 700 1.15rem/1.1 Georgia, 'Times New Roman', serif; }
	header button { width: 36px; min-height: 36px; border: 1px solid #8a6427; border-radius: 50%; background: #07150f; color: #e9c46f; font-size: 1.25rem; cursor: pointer; }
	.creature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
	.creature-grid > button { display: grid; grid-template-columns: 54px minmax(0, 1fr); align-items: center; gap: 8px; min-width: 0; min-height: 64px; padding: 7px; border: 1px solid rgba(151, 111, 42, 0.52); background: rgba(2, 14, 9, 0.75); color: #c9b57d; text-align: left; cursor: pointer; }
	.creature-grid > button:hover, .creature-grid > button:focus-visible, .creature-grid > button.selected { border-color: #52e5a1; color: #78efb6; outline: none; box-shadow: inset 0 0 16px rgba(37, 211, 133, 0.14); }
	.preview { position: relative; display: block; width: 54px; height: 42px; overflow: hidden; }
	.preview img { position: absolute; top: 50%; left: 50%; width: 270%; height: 270%; max-width: none; object-fit: contain; transform: translate(-50%, -50%); }
	.preview i { position: absolute; inset: 10px 8px; border-radius: 55% 42%; background: #29885a; filter: drop-shadow(0 0 5px rgba(70, 231, 163, 0.35)); }
	.preview i::before, .preview i::after { content: ''; position: absolute; top: -8px; width: 25px; height: 30px; background: inherit; }
	.preview i::before { right: 55%; clip-path: polygon(100% 50%, 0 0, 18% 100%); }
	.preview i::after { left: 55%; clip-path: polygon(0 50%, 100% 0, 82% 100%); }
	.preview i.firebird { background: #e77b25; }
	.preview i.wyvern { background: #4c9c8f; }
	.copy { min-width: 0; }
	.copy strong, .copy small { display: block; }
	.copy strong { overflow: hidden; font: 800 0.62rem/1.15 system-ui, sans-serif; text-overflow: ellipsis; white-space: nowrap; }
	.copy small { margin-top: 4px; color: #89988b; font: 0.52rem/1.2 system-ui, sans-serif; }
	@media (max-width: 620px) { .creature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .creature-picker { padding: 13px; } }
	@media (max-width: 380px) { .creature-grid > button { grid-template-columns: 43px minmax(0, 1fr); } .preview { width: 43px; } }
</style>
