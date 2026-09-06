<script lang="ts">
	import { WEATHER_OPTIONS } from '../weather';
	import { TIME_OF_DAY_OPTIONS } from '../timeOfDay';
	import type { LaunchStyle, TimeOfDay, WeatherCondition } from '../types';

	type Props = {
		open: boolean;
		disabled?: boolean;
		weather: WeatherCondition;
		timeOfDay: TimeOfDay;
		launchStyle: LaunchStyle;
		onWeatherSelect: (weather: WeatherCondition) => void;
		onTimeSelect: (time: TimeOfDay) => void;
		onLaunchSelect: (launch: LaunchStyle) => void;
		onClose: () => void;
	};

	const LAUNCH_OPTIONS: readonly { id: LaunchStyle; name: string; note: string }[] = [
		{ id: 'glide', name: 'GLIDE', note: 'Smooth horizontal launch' },
		{ id: 'boost', name: 'BOOST', note: 'Dramatic upward launch' },
		{ id: 'dive', name: 'DIVE', note: 'High start with a diving entry' },
	];

	let {
		open,
		disabled = false,
		weather,
		timeOfDay,
		launchStyle,
		onWeatherSelect,
		onTimeSelect,
		onLaunchSelect,
		onClose,
	}: Props = $props();
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

</script>

<dialog
	bind:this={dialogElement}
	class="customize-dialog"
	aria-labelledby="customize-title"
	oncancel={(event) => { event.preventDefault(); close(); }}
	onclose={onClose}
>
	<section class="customize-drawer">
		<header><div><span>COSMETIC OPTIONS</span><h2 id="customize-title">Customize Flight</h2></div><button type="button" aria-label="Close customization" onclick={close}>×</button></header>

		<div class="option-section">
			<div class="heading"><strong>WEATHER</strong><small>Atmosphere only</small></div>
			<div class="option-grid weather-grid">
				{#each WEATHER_OPTIONS as option (option.id)}
					<button type="button" disabled={disabled} class:selected={weather === option.id} aria-pressed={weather === option.id} onclick={() => onWeatherSelect(option.id)}><i class={option.className}></i><span>{option.name}</span></button>
				{/each}
			</div>
		</div>

		<div class="option-section">
			<div class="heading"><strong>TIME</strong><small>Lighting only</small></div>
			<div class="option-grid time-grid">
				{#each TIME_OF_DAY_OPTIONS as option (option.id)}
					<button type="button" disabled={disabled} class:selected={timeOfDay === option.id} aria-pressed={timeOfDay === option.id} onclick={() => onTimeSelect(option.id)}><i class={option.overlayClass}></i><span>{option.name}</span></button>
				{/each}
			</div>
		</div>

		<div class="option-section">
			<div class="heading"><strong>LAUNCH</strong><small>Presentation only</small></div>
			<div class="launch-grid">
				{#each LAUNCH_OPTIONS as option (option.id)}
					<button type="button" disabled={disabled} class:selected={launchStyle === option.id} aria-pressed={launchStyle === option.id} onclick={() => onLaunchSelect(option.id)}><strong>{option.name}</strong><small>{option.note}</small></button>
				{/each}
			</div>
		</div>

		<button class="done-button" type="button" onclick={close}>DONE</button>
	</section>
</dialog>

<style>
	.customize-dialog { width: min(420px, calc(100vw - 18px)); height: 100dvh; max-height: none; margin: 0 0 0 auto; padding: 0; border: 0; background: transparent; color: #f3dfad; }
	.customize-dialog::backdrop { background: rgba(1, 7, 4, 0.72); backdrop-filter: blur(3px); }
	.customize-drawer { display: flex; height: 100%; flex-direction: column; gap: 4px; overflow: auto; padding: clamp(16px, 3vw, 24px); border-left: 1px solid #b27e2e; background: linear-gradient(155deg, rgba(9, 35, 25, 0.99), rgba(4, 11, 8, 0.995)); box-shadow: -22px 0 70px rgba(0, 0, 0, 0.58); }
	header { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding-bottom: 14px; border-bottom: 1px solid rgba(181, 133, 47, 0.42); }
	header span { color: #5de6a7; font: 800 0.55rem/1 system-ui, sans-serif; letter-spacing: 0.18em; }
	h2 { margin: 5px 0 0; color: #f2c86f; font: 700 1.35rem/1.1 Georgia, 'Times New Roman', serif; }
	header button { width: 38px; min-height: 38px; border: 1px solid #8c6628; border-radius: 50%; background: #07160f; color: #efcb77; font-size: 1.35rem; cursor: pointer; }
	.option-section { padding: 16px 0; border-bottom: 1px solid rgba(181, 133, 47, 0.23); }
	.heading { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 9px; }
	.heading strong { color: #e8c26d; font: 800 0.65rem/1 system-ui, sans-serif; letter-spacing: 0.16em; }
	.heading small { color: #778a7e; font: 0.54rem/1 system-ui, sans-serif; }
	.option-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
	.option-grid button, .launch-grid button { min-width: 0; min-height: 46px; border: 1px solid rgba(142, 103, 36, 0.58); background: rgba(2, 15, 10, 0.72); color: #a9aa91; cursor: pointer; }
	.option-grid button { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 4px; font: 800 0.57rem/1 system-ui, sans-serif; }
	.option-grid button:hover, .option-grid button:focus-visible, .option-grid button.selected, .launch-grid button:hover, .launch-grid button:focus-visible, .launch-grid button.selected { border-color: #4ce0a0; color: #74edb4; outline: none; box-shadow: inset 0 0 13px rgba(35, 211, 133, 0.15); }
	.option-grid i { position: relative; width: 17px; height: 17px; flex: 0 0 auto; overflow: hidden; border: 1px solid #98702c; border-radius: 50%; background: #18261f; }
	.option-grid i::before { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: #e7c164; }
	.option-grid i.weather-rain, .option-grid i.weather-storm { background: repeating-linear-gradient(110deg, #263c49 0 4px, #75bac4 5px 6px); }
	.option-grid i.weather-fog { background: repeating-linear-gradient(0deg, #c2ccc4 0 2px, #56655d 3px 5px); }
	.option-grid i.weather-snow { background: radial-gradient(circle at 30% 30%, #fff 0 1px, transparent 2px), radial-gradient(circle at 68% 70%, #fff 0 1px, #39515a 2px); }
	.option-grid i.weather-inferno { background: radial-gradient(circle at 50% 75%, #ffc84f, #d5430e 45%, #220904 72%); }
	.option-grid i.time-dawn { background: linear-gradient(#73869b, #e59a66); }
	.option-grid i.time-day { background: linear-gradient(#76b1ba, #c9dcbd); }
	.option-grid i.time-sunset { background: linear-gradient(#68253e, #e76431 60%, #efa249); }
	.option-grid i.time-night { background: radial-gradient(circle at 66% 30%, #e7eadf 0 2px, transparent 3px), #0b1831; }
	.option-grid i.time-eclipse { background: radial-gradient(circle, #060606 0 28%, #d15d35 32% 40%, #21070b 48%); }
	.launch-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
	.launch-grid button { display: grid; gap: 4px; padding: 8px 5px; text-align: center; }
	.launch-grid strong { font: 800 0.61rem/1 system-ui, sans-serif; }
	.launch-grid small { color: #7f8b82; font: 0.49rem/1.2 system-ui, sans-serif; }
	.done-button { min-height: 50px; margin-top: auto; border: 1px solid #36cf8b; background: linear-gradient(#15794f, #0a442e); color: #f4d17e; font: 800 0.72rem/1 system-ui, sans-serif; letter-spacing: 0.16em; cursor: pointer; }
	@media (max-width: 620px) { .customize-dialog { width: 100vw; height: min(82dvh, 650px); margin: auto 0 0; } .customize-drawer { border-top: 1px solid #b27e2e; border-left: 0; } }
</style>
