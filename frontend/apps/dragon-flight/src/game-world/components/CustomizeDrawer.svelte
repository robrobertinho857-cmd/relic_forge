<script lang="ts">
	import { base } from '$app/paths';
	import { getWeather, WEATHER_OPTIONS } from '../weather';
	import { getTimeOfDay, TIME_OF_DAY_OPTIONS } from '../timeOfDay';
	import { LAUNCH_OPTIONS } from '../config';
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
	const defaultSettingsSelected = $derived(
		timeOfDay === 'day' && weather === 'clear' && launchStyle === 'glide',
	);
	const launchCaptions: Record<LaunchStyle, string> = {
		glide: 'Level flight',
		boost: 'Quick climb',
		dive: 'Downward entry',
	};

	$effect(() => {
		if (!dialogElement) return;
		if (open && !dialogElement.open) dialogElement.showModal();
		if (!open && dialogElement.open) dialogElement.close();
	});

	function close() {
		if (dialogElement?.open) dialogElement.close();
		else onClose();
	}

	function resetDefaults() {
		if (disabled) return;
		onTimeSelect('day');
		onWeatherSelect('clear');
		onLaunchSelect('glide');
	}
</script>

{#snippet selectionMark()}
	<span class="selection-mark" aria-hidden="true"
		><svg viewBox="0 0 16 16"><path d="m4 8 3 3 5-6" /></svg></span
	>
{/snippet}
<dialog
	bind:this={dialogElement}
	id="customize-flight"
	class="customize-dialog"
	aria-labelledby="customize-title"
	aria-describedby="customize-description"
	oncancel={(event) => {
		event.preventDefault();
		close();
	}}
	onclose={onClose}
>
	<section class="customize-drawer">
		<header>
			<div>
				<span class="eyebrow">YOUR FLIGHT</span>
				<h2 id="customize-title">Set the scene</h2>
			</div>
			<button class="close-button" type="button" aria-label="Close customization" onclick={close}
				><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button
			>
		</header>
		<div class="customize-content">
			<fieldset class="option-section" {disabled} aria-describedby="customize-time-note">
				<legend>Time of day <span>{getTimeOfDay(timeOfDay).name.toLowerCase()}</span></legend>
				<p id="customize-time-note" class="option-note">{getTimeOfDay(timeOfDay).description}</p>
				<div class="option-grid time-grid">
					{#each TIME_OF_DAY_OPTIONS as option (option.id)}
						<label
							><input
								type="radio"
								name="flight-time"
								value={option.id}
								checked={timeOfDay === option.id}
								onchange={() => onTimeSelect(option.id)}
							/>
							<span class="option-content"
								><span class="preview"
									><img
										src={`${base}/customize/generated/${option.id}.png`}
										alt=""
										loading="lazy"
										decoding="async"
									/>{@render selectionMark()}</span
								><span class="option-name">{option.name.toLowerCase()}</span></span
							></label
						>
					{/each}
				</div>
			</fieldset>
			<fieldset class="option-section" {disabled} aria-describedby="customize-weather-note">
				<legend>Weather <span>{getWeather(weather).name.toLowerCase()}</span></legend>
				<p id="customize-weather-note" class="option-note">
					Mix any weather with your chosen time.
				</p>
				<div class="option-grid weather-grid">
					{#each WEATHER_OPTIONS as option (option.id)}
						<label
							><input
								type="radio"
								name="flight-weather"
								value={option.id}
								checked={weather === option.id}
								onchange={() => onWeatherSelect(option.id)}
							/>
							<span class="option-content"
								><span class="preview"
									><img
										src={`${base}/customize/generated/${option.id === 'clear' ? 'day' : option.id}.png`}
										alt=""
										loading="lazy"
										decoding="async"
									/>{@render selectionMark()}</span
								><span class="option-name">{option.name.toLowerCase()}</span></span
							></label
						>
					{/each}
				</div>
			</fieldset>
			<fieldset
				class="option-section launch-section"
				{disabled}
				aria-describedby="customize-launch-note"
			>
				<legend>Takeoff</legend>
				<p id="customize-launch-note" class="option-note">Choose your entrance.</p>
				<div class="launch-grid">
					{#each LAUNCH_OPTIONS as option (option.id)}
						<label
							><input
								type="radio"
								name="flight-launch"
								value={option.id}
								checked={launchStyle === option.id}
								onchange={() => onLaunchSelect(option.id)}
							/>
							<span class="option-content"
								><span class="preview"
									><img
										src={`${base}/customize/generated/${option.id}.png`}
										alt=""
										loading="lazy"
										decoding="async"
									/>{@render selectionMark()}</span
								><span class="launch-caption"
									><strong>{option.name.toLowerCase()}</strong><small
										>{launchCaptions[option.id]}</small
									></span
								></span
							></label
						>
					{/each}
				</div>
			</fieldset>
		</div>
		<footer>
			<p id="customize-description">Applies instantly · Visuals only, same odds</p>
			<div class="footer-actions">
				<button
					class="reset-button"
					type="button"
					disabled={disabled || defaultSettingsSelected}
					onclick={resetDefaults}>Reset defaults</button
				>
				<button class="done-button" type="button" onclick={close}
					>Done <span aria-hidden="true">✓</span></button
				>
			</div>
		</footer>
	</section>
</dialog>

<style>
	.customize-dialog {
		width: min(460px, 100vw);
		max-width: 100vw;
		height: 100dvh;
		max-height: none;
		margin: 0 0 0 auto;
		padding: 0;
		border: 0;
		background: transparent;
		color: #edf3ef;
		font-family: system-ui, sans-serif;
	}
	.customize-dialog::backdrop {
		background: #061119ab;
		backdrop-filter: blur(5px);
	}
	.customize-drawer {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
		padding: 24px;
		border-left: 1px solid #718b8a40;
		background: radial-gradient(ellipse at 95% 0%, #2d53534d, transparent 50%), #14262d;
		box-shadow: -24px 0 80px #0005;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
		gap: 16px;
		padding-bottom: 16px;
	}
	.eyebrow {
		color: #8db6ad;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.18em;
	}
	h2 {
		margin: 7px 0 0;
		color: #f6f2df;
		font-size: 26px;
		font-weight: 650;
		line-height: 1.15;
		letter-spacing: -0.03em;
	}
	.close-button {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		padding: 11px;
		border: 1px solid #a0bcba30;
		border-radius: 50%;
		color: #c5d8d5;
		background: #ffffff05;
		cursor: pointer;
	}
	.close-button svg {
		width: 20px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
	}
	.close-button:hover {
		background: #ffffff10;
	}
	.customize-content {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: #55736f transparent;
		padding: 2px 3px 14px;
		margin: 0 -3px;
	}
	.option-section {
		min-width: 0;
		margin: 0 0 20px;
		padding: 0;
		border: 0;
	}
	legend {
		box-sizing: border-box;
		float: left;
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0;
		margin: 0 0 7px;
		color: #e7efea;
		font-size: 14px;
		font-weight: 650;
		letter-spacing: -0.01em;
	}
	legend + * {
		clear: both;
	}
	legend span {
		color: #a4cfb9;
		background: #7fbea711;
		border-radius: 20px;
		padding: 3px 9px;
		font-size: 10px;
		font-weight: 500;
		text-transform: capitalize;
	}
	.option-note {
		margin: 0 0 12px;
		color: #9db2b2;
		font-size: 11px;
		line-height: 1.5;
	}
	.option-grid {
		clear: both;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 8px;
	}
	.launch-grid {
		clear: both;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}
	label {
		position: relative;
		display: block;
		min-width: 0;
	}
	input[type='radio'] {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}
	.option-content {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		height: 100%;
		min-width: 0;
		overflow: hidden;
		border: 1px solid #aac5c324;
		border-radius: 10px;
		background: #0c1c24;
		color: #c2d1d0;
		cursor: pointer;
		transition:
			border-color 0.16s,
			background 0.16s,
			box-shadow 0.16s;
	}
	.preview {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 1;
		max-height: 70px;
		overflow: hidden;
		background: linear-gradient(140deg, #47646b, #1b303f);
	}
	.preview::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(transparent 60%, #0c1c2433);
		pointer-events: none;
	}
	.preview img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		opacity: 0.86;
		transition: opacity 0.16s;
	}
	.option-name {
		display: block;
		padding: 10px 2px;
		text-align: center;
		font-size: 11px;
		line-height: 1;
		font-weight: 600;
		text-transform: capitalize;
	}
	.selection-mark {
		position: absolute;
		z-index: 1;
		top: 5px;
		right: 5px;
		display: grid;
		place-items: center;
		width: 19px;
		height: 19px;
		border-radius: 50%;
		background: #bae7c7;
		color: #153d32;
		box-shadow: 0 1px 5px #0005;
		opacity: 0;
	}
	.selection-mark svg {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	input:checked + .option-content {
		border-color: #a4ddbc;
		background: #2a4d43;
		color: #edfff2;
		box-shadow: 0 0 0 1px #a4ddbc;
	}
	input:checked + .option-content .selection-mark {
		opacity: 1;
	}
	input:checked + .option-content img,
	input:not(:disabled) + .option-content:hover img {
		opacity: 1;
	}
	input:not(:disabled) + .option-content:hover {
		border-color: #a9d5c3;
	}
	input:focus-visible + .option-content {
		outline: 2px solid #f0d58c;
		outline-offset: 3px;
	}
	input:disabled + .option-content {
		opacity: 0.5;
		cursor: default;
	}
	.launch-section {
		margin-bottom: 0;
	}
	.launch-grid .option-content {
		position: relative;
		min-height: 132px;
	}
	.launch-grid .preview {
		position: absolute;
		inset: 0;
		height: 100%;
		max-height: none;
		aspect-ratio: auto;
	}
	.launch-grid .preview img {
		object-position: 50% 45%;
	}
	.launch-caption {
		position: absolute;
		z-index: 2;
		inset: auto 0 0;
		display: flex;
		flex-direction: column;
		gap: 5px;
		padding: 10px 4px 12px;
		text-align: center;
		border-radius: 9px;
		background: rgba(24, 44, 50, 0.48);
		color: #f4f8f5;
		backdrop-filter: blur(3px);
	}
	.launch-caption strong {
		font-size: 13px;
		font-weight: 600;
		text-transform: capitalize;
	}
	.launch-caption small {
		color: #d0dedb;
		font-size: 10px;
		line-height: 1.3;
	}
	footer {
		flex-shrink: 0;
		padding-top: 13px;
		border-top: 1px solid #abc6bd20;
		background: transparent;
	}
	footer p {
		margin: 0 0 12px;
		color: #a1b6b4;
		font-size: 10px;
		text-align: center;
		line-height: 1.5;
	}
	.footer-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.footer-actions button {
		min-height: 46px;
		padding: 10px;
		border: 1px solid #a9c4ba35;
		border-radius: 9px;
		font:
			600 12px/1.2 system-ui,
			sans-serif;
		cursor: pointer;
	}
	.reset-button {
		background: transparent;
		color: #c1d3ce;
	}
	.reset-button:hover:not(:disabled) {
		background: #ffffff08;
	}
	.reset-button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.footer-actions .done-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 28px;
		background: #bbdcc0;
		border-color: #bbdcc0;
		color: #17372d;
	}
	.done-button:hover {
		filter: brightness(1.06);
	}
	button:focus-visible {
		outline: 2px solid #f0d58c;
		outline-offset: 2px;
	}
	@media (max-width: 620px) {
		.customize-dialog {
			width: 100vw;
			height: min(94dvh, 740px);
			margin: auto 0 0;
		}
		.customize-drawer {
			border-top: 1px solid #718b8a60;
			border-left: 0;
			border-radius: 18px 18px 0 0;
			padding: 20px 18px 16px;
		}
	}
	@media (max-width: 360px) {
		.customize-drawer {
			padding-inline: 14px;
		}
		.option-grid {
			gap: 5px;
		}
		.option-name {
			font-size: 10px;
		}
		.launch-grid {
			gap: 7px;
		}
	}
	@media (max-height: 450px) {
		.customize-dialog {
			height: 100dvh;
		}
		.customize-drawer {
			padding-block: 12px;
		}
		header {
			padding-bottom: 10px;
		}
		h2 {
			font-size: 21px;
		}
		footer {
			padding-top: 8px;
		}
		footer p {
			margin-bottom: 6px;
		}
	}
	@media (max-height: 700px) {
		.launch-grid .option-content {
			min-height: 116px;
		}
		.customize-content {
			padding-bottom: 4px;
		}
		.option-note {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
			margin: 0;
		}
		.option-section {
			margin-bottom: 14px;
		}
		.launch-section {
			margin-bottom: 0;
		}
		.preview {
			max-height: 56px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.option-content,
		.preview img {
			transition: none;
		}
	}
</style>
