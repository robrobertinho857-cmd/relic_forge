<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		LANGUAGE_NAMES,
		SUPPORTED_LANGUAGES,
		changeLanguage,
		getRiskNote,
		language,
		readyPrompt,
		stageWord,
		t,
		textDirection,
	} from './i18n';
	import {
		StakeSession,
		initialWallet,
		decodeStakeRound,
		loadStakeReplay,
		isValidStakeBet,
		stakeBetUnits,
	} from './stake';
	let wallet = $state(initialWallet());
	let sessionSeconds = $state(0);
	let sessionNet = $state(0);
	const settledRounds = new SvelteSet<number>();
	let stakeSession: StakeSession;
	let replayMode = $state(false);
	let sharedReplay = $state<FlightRound>();
	function formatLocalAmount(value: number) {
		return formatAmount(value, wallet.live ? wallet.currency : 'USD');
	}
	function formatBetInput(value: number) {
		const step = wallet.live ? wallet.stepBet / 1e6 : PROTOTYPE_BET_STEP;
		const stepDecimals = (step.toFixed(6).match(/\.(\d*?[1-9])0*$/)?.[1] ?? '').length;
		return value.toFixed(Math.max(2, stepDecimals));
	}
	function getCurrencySymbol(currency: string) {
		return (
			new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency,
				currencyDisplay: 'narrowSymbol',
			})
				.formatToParts(0)
				.find((part) => part.type === 'currency')?.value ?? currency
		);
	}
	async function connectStake() {
		flightError = '';
		if (new URLSearchParams(window.location.search).get('replay') === 'true') {
			replayMode = true;
			wallet = { ...wallet, busy: true };
			try {
				const loaded = await loadStakeReplay(window.location.search);
				sharedReplay = loaded.round;
				wallet = { ...wallet, live: true, ready: true, currency: loaded.currency, error: '' };
			} catch (error) {
				wallet = {
					...wallet,
					ready: false,
					error: error instanceof Error ? error.message : 'Replay failed',
				};
			}
			wallet = { ...wallet, busy: false };
			return;
		}
		const recovered = await stakeSession.connect(window.location.search, import.meta.env.DEV);
		if (!wallet.ready) return;
		if (wallet.live) {
			selectedBet = wallet.defaultBet / 1e6;
			betInput = formatBetInput(selectedBet);
			if (wallet.turboDisabled) playbackSpeed = 1;
		}
		if (recovered) {
			try {
				const round = decodeStakeRound(recovered, {
					creature: selectedCreatureId,
					launchStyle: selectedLaunchStyle,
				});
				resetPresentation();
				beginFlight(round);
			} catch (error) {
				stakeSession.block(error);
			}
		} else if (currentRound && !isReplay && status !== 'ready' && status !== 'complete') {
			await presentFinalResult(currentRound, presentationToken);
		}
	}
	async function startStakeFlight(bonusId?: BonusFlightId) {
		try {
			const response = await stakeSession.play(bonusId ?? selectedRisk, stakeAmount);
			let round: FlightRound;
			try {
				round = decodeStakeRound(response, {
					creature: selectedCreatureId,
					launchStyle: selectedLaunchStyle,
				});
			} catch (error) {
				stakeSession.block(error);
				return;
			}
			if (!bonusId) {
				round.weather = selectedWeather;
				round.timeOfDay = selectedTimeOfDay;
			}
			bonusOpen = false;
			beginFlight(round);
		} catch (error) {
			flightError = error instanceof Error ? error.message : 'Could not start flight';
		}
	}
	import { FlightAudio, resultSound } from './audio';
	const flightAudio = new FlightAudio();
	let soundMuted = $state(false);
	let previousPanels = '';

	function toggleSound() {
		soundMuted = !soundMuted;
		flightAudio.setMuted(soundMuted);
		if (!soundMuted) flightAudio.unlock();
		try {
			localStorage.setItem('dragon-flight-muted', String(soundMuted));
		} catch {
			/* Optional preference. */
		}
	}
	$effect(() => {
		flightAudio.setWeather(activeWeather);
	});
	$effect(() => {
		const animation = activeCreature.flightAnimation;
		flightAudio.setWingLoop(
			status === 'flying' || (status === 'ending' && !landed),
			animation ? animation.frameOrder.length / animation.fps : 0.8,
		);
	});
	$effect(() => {
		const panels = [customizeOpen, helpOpen, bonusOpen, historyOpen, creaturePickerOpen].join(',');
		if (previousPanels && panels !== previousPanels)
			void flightAudio.play('option-select', 0.22, 'ui');
		previousPanels = panels;
	});
	import { ENCOUNTER_ARTWORK } from './encounterArtwork';
	import { PICKUP_ARTWORK } from './pickupArtwork';
	// Standalone local Lucky Flight prototype.
	import {
		INITIAL_BOUNDS,
		MAX_PROTOTYPE_BET,
		MIN_PROTOTYPE_BET,
		PATHS,
		PROTOTYPE_BET_STEP,
		WORLD_SPEED,
		GATE_APPROACH_RATE,
	} from './config';
	import { clamp, createPlayer, steerPlayer } from './physics';
	import { generateMockRound } from './mockRound';
	import { createBonusRound, drawBonusTicket, getBonusFlight } from './bonusFlights';
	import BonusFlightsDialog from './components/BonusFlightsDialog.svelte';
	import FlightHistory from './components/FlightHistory.svelte';
	import { CREATURES, getCreature, loadDecodedFlightFrames } from './creatures';
	import { getFlightStage, stageForEventIndex } from './stages';
	import {
		ENCOUNTER_LABELS,
		getWinTier,
		CURRENT_LABELS,
		PICKUP_LABELS,
		ENDING_LABELS,
		HAZARD_LABELS,
	} from './presentation';
	import { getWeather } from './weather';
	import { getTimeOfDay } from './timeOfDay';
	import { getFinishBackground, LANDING_ANCHOR } from './backgrounds';
	import { clampBet, isBetInputValid, roundBet, sanitizeBetInput } from './utils/bet';
	import { formatLocalAmount as formatAmount } from './utils/format';
	import Atmosphere from './components/Atmosphere.svelte';
	import Landscape from './components/Landscape.svelte';
	import DangerEncounter from './components/DangerEncounter.svelte';
	import DragonVictory from './components/DragonVictory.svelte';
	import BirdBurst from './components/BirdBurst.svelte';
	import CreaturePicker from './components/CreaturePicker.svelte';
	import CustomizeDrawer from './components/CustomizeDrawer.svelte';
	import EndingEffect from './components/EndingEffect.svelte';
	import TerrainObstacle from './components/TerrainObstacle.svelte';
	import { getTerrainVisualWidth } from './terrainArtwork';
	import ResultScenery from './components/ResultScenery.svelte';
	import EventWarning from './components/EventWarning.svelte';
	import HelpDialog from './components/HelpDialog.svelte';
	import AirCurrentEffect from './components/AirCurrentEffect.svelte';
	import CollectiblePickup from './components/CollectiblePickup.svelte';
	import WinCelebration from './components/WinCelebration.svelte';
	import type {
		BonusFlightId,
		ActiveEncounterPresentation,
		ActiveGate,
		ActiveCurrentPresentation,
		ActivePickupPresentation,
		CreatureId,
		ComboPresentation,
		FlightParticle,
		FlightEnding,
		FlightEvent,
		FlightRisk,
		FlightRound,
		FlightStageId,
		LaunchStyle,
		PlayerBody,
		PrototypeStatus,
		StageAnnouncement,
		WarningPresentation,
		WorldBounds,
		WeatherCondition,
		TimeOfDay,
	} from './types';

	let worldElement = $state<HTMLDivElement>();
	let bounds = $state<WorldBounds>(INITIAL_BOUNDS);
	let player = $state<PlayerBody>(createPlayer(INITIAL_BOUNDS));
	let selectedBet = $state(1);
	let betInput = $state('1.00');
	const betCurrencySymbol = $derived(getCurrencySymbol(wallet.live ? wallet.currency : 'USD'));
	let selectedRisk = $state<FlightRisk>('balanced');
	let selectedCreatureId = $state<CreatureId>('archaeopteryx');
	let selectedLaunchStyle = $state<LaunchStyle>('glide');
	let selectedWeather = $state<WeatherCondition>('clear');
	let selectedTimeOfDay = $state<TimeOfDay>('day');
	let playbackSpeed = $state(1.5);
	let creaturePickerOpen = $state(false);
	let customizeOpen = $state(false);
	let helpOpen = $state(false);
	let bonusOpen = $state(false);
	let historyOpen = $state(false);
	let flightHistory = $state<FlightRound[]>([]);
	let isReplay = $state(false);
	let flightError = $state('');
	let currentStageId = $state<FlightStageId>('MOUNTAIN_VALLEY');
	let flightProgress = $state(0);
	let stageAnnouncement = $state<StageAnnouncement>();
	let roundCreatureId = $state<CreatureId>();
	let status = $state<PrototypeStatus>('ready');
	let currentRound = $state<FlightRound>();
	let currentMultiplier = $state(1);
	let finalMultiplier = $state(0);
	let finalWin = $state(0);
	let winCelebrationOpen = $state(false);
	let gatesPassed = $state(0);
	let distanceTravelled = $state(0);
	let activeGate = $state<ActiveGate>();
	let activePickup = $state<ActivePickupPresentation>();
	let activeCurrent = $state<ActiveCurrentPresentation>();
	let activeEncounter = $state<ActiveEncounterPresentation>();
	let dragonVictory = $state<'playing' | 'outcome' | 'result'>();
	let encounterWinner = $state<'dragon' | 'eagle' | 'archaeopteryx' | 'azure-swift' | 'woodpecker'>(
		'dragon',
	);
	let birdBurst = $state<'playing' | 'finished'>();
	let birdBurstResolver: (() => void) | undefined;
	let dragonVictoryResolver: ((played: boolean) => void) | undefined;
	let activeEnding = $state<Exclude<FlightEnding, 'crash'>>();
	let landingProgress = $state(0);
	let eventWarning = $state<WarningPresentation>();
	let comboFeedback = $state<ComboPresentation>();
	let comboCount = $state(0);
	let multiplierPulse = $state(false);
	let creatureFrameNumber = $state(1);
	let creatureFrameCanvas = $state<HTMLCanvasElement>();
	let loadedCreatureFrames = $state<Partial<Record<CreatureId, readonly ImageBitmap[]>>>({});
	let impactActive = $state(false);
	let flapActive = $state(false);
	let eventLabel = $state('READY');
	let eventProgress = $state(0);
	let eventCallout = $state('');
	let flightTargetY = $state(INITIAL_BOUNDS.floorY * 0.5);
	let particles = $state<FlightParticle[]>([]);
	let parallaxOffset = $state(0);
	let roundSequence = 0;
	let presentationToken = 0;
	let particleSequence = 0;
	let stageAnnouncementSequence = 0;
	let warningSequence = 0;
	let comboSequence = 0;
	let gateResolver: (() => void) | undefined;
	let flapTimer: ReturnType<typeof setTimeout> | undefined;
	let stageAnnouncementTimer: ReturnType<typeof setTimeout> | undefined;
	let comboTimer: ReturnType<typeof setTimeout> | undefined;
	let flapFrame = 0;
	let valueAnimationFrame = 0;
	let cancelValueAnimation: (() => void) | undefined;
	let pendingDelays: Array<() => void> = [];

	// Balanced flights reveal 25% faster; server timing restrictions still take priority.
	const flightPlaybackSpeed = $derived(
		wallet.turboDisabled
			? 1
			: playbackSpeed *
					((currentRound?.risk ?? selectedRisk) === 'balanced' && !currentRound?.bonusFlight
						? 1.25
						: 1),
	);
	const controlsLocked = $derived(
		replayMode || status !== 'ready' || wallet.busy || !wallet.ready || wallet.active,
	);
	const landed = $derived(Boolean(activeEnding) && landingProgress === 1);
	const stakeAmount = $derived(stakeBetUnits(betInput));
	const betInputIsValid = $derived(
		wallet.live ? isValidStakeBet(stakeAmount, wallet) : isBetInputValid(betInput),
	);
	const activeCreature = $derived(getCreature(roundCreatureId ?? selectedCreatureId));
	const selectedCreature = $derived(getCreature(selectedCreatureId));
	const selectedPathNote = $derived(getRiskNote(selectedRisk));
	const currentStage = $derived(getFlightStage(currentStageId));
	const resultWinTier = $derived(
		getWinTier(
			currentRound ? currentRound.finalWin / (currentRound.entryCost ?? currentRound.bet) : 0,
		),
	);
	const activeWeather = $derived(currentRound?.weather ?? selectedWeather);
	const activeWeatherConfig = $derived(getWeather(activeWeather));
	const activeTimeOfDay = $derived(currentRound?.timeOfDay ?? selectedTimeOfDay);
	const activeTimeConfig = $derived(getTimeOfDay(activeTimeOfDay));
	const activeCreatureFrame = $derived(
		loadedCreatureFrames[activeCreature.id]?.[creatureFrameNumber - 1],
	);
	const rotation = $derived(
		clamp(
			player.velocity.y / activeCreature.rotationDivisor,
			-activeCreature.rotationLimit,
			activeCreature.rotationLimit,
		),
	);
	const distanceMetres = $derived(Math.floor(distanceTravelled / 12));

	$effect(() => {
		const animation = activeCreature.flightAnimation;
		creatureFrameNumber = animation?.frameOrder[0] ?? 1;
		if (landed) return;
		if (!animation || loadedCreatureFrames[activeCreature.id]?.length !== animation.frames.length)
			return;

		let frameCursor = 0;
		const frameTimer = setInterval(() => {
			frameCursor = (frameCursor + 1) % animation.frameOrder.length;
			creatureFrameNumber = animation.frameOrder[frameCursor] ?? 1;
		}, 1000 / animation.fps);

		return () => clearInterval(frameTimer);
	});

	$effect(() => {
		const canvas = creatureFrameCanvas;
		const frame = activeCreatureFrame;
		if (!canvas || !frame) return;

		const context = canvas.getContext('2d');
		if (!context) return;

		const scale = Math.min(canvas.width / frame.width, canvas.height / frame.height);
		const width = frame.width * scale;
		const height = frame.height * scale;
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(
			frame,
			(canvas.width - width) / 2,
			(canvas.height - height) / 2,
			width,
			height,
		);
	});

	function updateBetInput(input: HTMLInputElement) {
		if (wallet.live) {
			betInput = input.value;
			const units = stakeBetUnits(betInput);
			if (isValidStakeBet(units, wallet)) selectedBet = units / 1e6;
			return;
		}
		const sanitized = sanitizeBetInput(input.value, betInput);
		input.value = sanitized;
		betInput = sanitized;

		const numericValue = Number(sanitized);
		if (
			Number.isFinite(numericValue) &&
			numericValue >= MIN_PROTOTYPE_BET &&
			numericValue <= MAX_PROTOTYPE_BET
		) {
			selectedBet = roundBet(numericValue);
		}
	}

	function normalizeBetInput() {
		if (wallet.live) {
			betInput = formatBetInput(selectedBet);
			return;
		}
		if (!betInputIsValid) void flightAudio.play('unavailable', 0.3, 'ui');
		const numericValue = Number(betInput);
		selectedBet = Number.isFinite(numericValue) ? clampBet(numericValue) : selectedBet;
		betInput = selectedBet.toFixed(2);
	}

	const minimumBet = $derived(
		wallet.live
			? (wallet.levels[0] ?? Math.ceil(wallet.minBet / wallet.stepBet) * wallet.stepBet) / 1e6
			: MIN_PROTOTYPE_BET,
	);
	const maximumBet = $derived(
		wallet.live
			? (wallet.levels.at(-1) ?? Math.floor(wallet.maxBet / wallet.stepBet) * wallet.stepBet) / 1e6
			: MAX_PROTOTYPE_BET,
	);
	function moveBet(direction: -1 | 1) {
		if (controlsLocked) return;
		if (wallet.live) {
			const current = Math.round(selectedBet * 1e6);
			const next = wallet.levels.length
				? wallet.levels[wallet.levels.indexOf(current) + direction]
				: current + direction * wallet.stepBet;
			if (isValidStakeBet(next, wallet)) {
				selectedBet = next / 1e6;
				betInput = formatBetInput(selectedBet);
			}
			return;
		}
		selectedBet = clampBet(selectedBet + direction * PROTOTYPE_BET_STEP);
		betInput = formatBetInput(selectedBet);
	}

	function delay(milliseconds: number, followFlightSpeed = true) {
		return new Promise<void>((resolve) => {
			let settled = false;
			let timer: ReturnType<typeof setTimeout>;
			const finish = () => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				pendingDelays = pendingDelays.filter((cancelDelay) => cancelDelay !== finish);
				resolve();
			};
			timer = setTimeout(finish, milliseconds / (followFlightSpeed ? flightPlaybackSpeed : 1));
			pendingDelays = [...pendingDelays, finish];
		});
	}

	function clearPresentationDelays() {
		const cancelDelays = pendingDelays;
		pendingDelays = [];
		for (const cancelDelay of cancelDelays) cancelDelay();
	}

	function animatePresentationValues(
		duration: number,
		update: (progress: number) => void,
		token: number,
		followFlightSpeed = true,
	) {
		cancelValueAnimation?.();

		return new Promise<void>((resolve) => {
			let settled = false;
			const startedAt = performance.now();
			const finish = () => {
				if (settled) return;
				settled = true;
				if (valueAnimationFrame) cancelAnimationFrame(valueAnimationFrame);
				valueAnimationFrame = 0;
				if (cancelValueAnimation === finish) cancelValueAnimation = undefined;
				resolve();
			};
			const tick = (now: number) => {
				if (token !== presentationToken) {
					finish();
					return;
				}
				const speed = followFlightSpeed ? flightPlaybackSpeed : 1;
				const linearProgress = Math.min(1, ((now - startedAt) * speed) / duration);
				const easedProgress = 1 - Math.pow(1 - linearProgress, 3);
				update(easedProgress);
				if (linearProgress >= 1) finish();
				else valueAnimationFrame = requestAnimationFrame(tick);
			};

			cancelValueAnimation = finish;
			update(0);
			valueAnimationFrame = requestAnimationFrame(tick);
		});
	}

	async function animateCurrentMultiplier(target: number, duration: number, token: number) {
		const startingMultiplier = currentMultiplier;
		multiplierPulse = true;
		await animatePresentationValues(
			duration,
			(progress) => {
				currentMultiplier = startingMultiplier + (target - startingMultiplier) * progress;
			},
			token,
		);
		if (token !== presentationToken) return;
		currentMultiplier = target;
		multiplierPulse = false;
	}

	async function showWarning(
		text: string,
		tone: WarningPresentation['tone'],
		token: number,
		duration = 420,
	) {
		eventWarning = { id: ++warningSequence, text, tone };
		await delay(duration);
		if (token !== presentationToken) return false;
		eventWarning = undefined;
		return true;
	}

	function showCombo(count: number) {
		comboFeedback = { id: ++comboSequence, count };
		if (comboTimer) clearTimeout(comboTimer);
		comboTimer = setTimeout(() => {
			comboFeedback = undefined;
			comboTimer = undefined;
		}, 720 / flightPlaybackSpeed);
		emitParticles(Math.min(24, 7 + count * 3));
	}

	function cancelPresentation() {
		flightAudio.stopEffects();
		presentationToken += 1;
		birdBurstResolver?.();
		birdBurstResolver = undefined;
		birdBurst = undefined;
		dragonVictoryResolver?.(false);
		dragonVictoryResolver = undefined;
		dragonVictory = undefined;
		const resolveGate = gateResolver;
		gateResolver = undefined;
		resolveGate?.();
		clearPresentationDelays();
		if (flapFrame) cancelAnimationFrame(flapFrame);
		flapFrame = 0;
		if (flapTimer) clearTimeout(flapTimer);
		flapTimer = undefined;
		if (stageAnnouncementTimer) clearTimeout(stageAnnouncementTimer);
		stageAnnouncementTimer = undefined;
		if (comboTimer) clearTimeout(comboTimer);
		comboTimer = undefined;
		cancelValueAnimation?.();
		cancelValueAnimation = undefined;
		valueAnimationFrame = 0;
		stageAnnouncement = undefined;
		eventWarning = undefined;
		comboFeedback = undefined;
		activePickup = undefined;
		activeCurrent = undefined;
		activeEncounter = undefined;
		activeEnding = undefined;
		landingProgress = 0;
		multiplierPulse = false;
		flapActive = false;
	}

	function enterStage(stageId: FlightStageId, forceAnnouncement = false) {
		const changed = stageId !== currentStageId;
		currentStageId = stageId;
		if (!changed && !forceAnnouncement) return;

		const stage = getFlightStage(stageId);
		stageAnnouncement = {
			id: ++stageAnnouncementSequence,
			name: stage.name,
			order: stage.order,
		};
		if (stageAnnouncementTimer) clearTimeout(stageAnnouncementTimer);
		stageAnnouncementTimer = setTimeout(() => {
			stageAnnouncement = undefined;
			stageAnnouncementTimer = undefined;
		}, 1050 / flightPlaybackSpeed);
		if (changed) emitParticles(6 + Math.round(stage.intensity * 12));
	}

	function updateFlightProgress(round: FlightRound, eventIndex: number) {
		const nextStage = stageForEventIndex(round.stagePlan, eventIndex);
		enterStage(nextStage, eventIndex === 0);
		flightProgress = Math.min(100, ((eventIndex + 1) / round.events.length) * 100);
	}

	function triggerFlap() {
		flapActive = false;
		if (flapFrame) cancelAnimationFrame(flapFrame);
		flapFrame = requestAnimationFrame(() => {
			flapActive = true;
			flapFrame = 0;
		});
		if (flapTimer) clearTimeout(flapTimer);
		flapTimer = setTimeout(() => {
			flapActive = false;
			flapTimer = undefined;
		}, activeCreature.flapDuration);
	}

	function emitParticles(count: number, impact = false) {
		const additions = Array.from(
			{ length: count },
			(): FlightParticle => ({
				id: particleSequence++,
				x: player.position.x + (impact ? player.radius : -player.radius),
				y: player.position.y + (Math.random() - 0.5) * player.radius * 1.5,
				velocityX: impact ? (Math.random() - 0.5) * 220 : -60 - Math.random() * 100,
				velocityY: (Math.random() - 0.5) * (impact ? 230 : 95),
				life: 0.35 + Math.random() * 0.45,
				size: 2 + Math.random() * (impact ? 6 : 4),
			}),
		);
		particles = [...particles, ...additions].slice(-70);
	}

	function resetPresentation() {
		winCelebrationOpen = false;
		cancelPresentation();
		player = createPlayer(bounds);
		status = 'ready';
		currentRound = undefined;
		roundCreatureId = undefined;
		currentStageId = 'MOUNTAIN_VALLEY';
		flightProgress = 0;
		currentMultiplier = 1;
		finalMultiplier = 0;
		finalWin = 0;
		gatesPassed = 0;
		distanceTravelled = 0;
		activeGate = undefined;
		activePickup = undefined;
		activeCurrent = undefined;
		activeEncounter = undefined;
		activeEnding = undefined;
		comboCount = 0;
		impactActive = false;
		flapActive = false;
		eventLabel = 'READY';
		eventProgress = 0;
		eventCallout = '';
		particles = [];
		parallaxOffset = 0;
		flightTargetY = bounds.floorY * 0.5;
	}

	function createPresentedGate(event: Extract<FlightEvent, { type: 'gate' }>): ActiveGate {
		const gapHeight = clamp(bounds.height * 0.35, 145, 215);
		const margin = gapHeight / 2 + 36;
		const gapCenterY = clamp(event.gapRatio * bounds.floorY, margin, bounds.floorY - margin);
		const width = clamp(bounds.width * 0.19, 95, 210);
		const visualWidth = getTerrainVisualWidth(
			event.hazard === 'forestPass' ? 'tree' : 'rock',
			gapCenterY - gapHeight / 2,
			bounds.height - gapCenterY - gapHeight / 2,
		);
		return {
			...event,
			// Keep the entire wider silhouette offscreen until it scrolls into view.
			x: bounds.width + 45 + Math.max(0, visualWidth - width) / 2,
			width,
			gapCenterY,
			gapHeight,
		};
	}

	function presentGate(event: Extract<FlightEvent, { type: 'gate' }>) {
		activeGate = createPresentedGate(event);
		eventLabel = HAZARD_LABELS[event.hazard];
		eventCallout = `${HAZARD_LABELS[event.hazard]} · GATE ${event.gate}`;
		status = 'flying';
		triggerFlap();

		if (event.result === 'pass') {
			flightTargetY = activeGate.gapCenterY;
		} else {
			const gapTop = activeGate.gapCenterY - activeGate.gapHeight / 2;
			const gapBottom = activeGate.gapCenterY + activeGate.gapHeight / 2;
			flightTargetY =
				event.crashSide === 'upper'
					? Math.max(player.radius, gapTop - player.radius * 1.6)
					: Math.min(bounds.floorY - player.radius, gapBottom + player.radius * 1.6);
		}

		return new Promise<void>((resolve) => {
			gateResolver = resolve;
		});
	}

	async function presentPickup(event: Extract<FlightEvent, { type: 'pickup' }>, token: number) {
		const fromMultiplier = currentMultiplier;
		activePickup = {
			pickupType: event.pickupType,
			fromMultiplier,
			toMultiplier: event.multiplier,
		};
		eventLabel = PICKUP_LABELS[event.pickupType];
		eventCallout = PICKUP_LABELS[event.pickupType];
		flightTargetY = bounds.floorY * 0.43;
		triggerFlap();
		await delay(300);
		if (token !== presentationToken) return;
		void flightAudio.play(
			event.pickupType === 'feather'
				? 'feather-pickup'
				: event.pickupType === 'goldenFeather'
					? 'golden-feather-pickup'
					: 'crystal-pickup',
			0.4,
			'pickup',
		);
		await animateCurrentMultiplier(event.multiplier, 340, token);
		if (token !== presentationToken) return;
		emitParticles(event.pickupType === 'skyCrystal' ? 28 : 18);
		activePickup = undefined;
		await delay(150);
	}

	async function presentCurrent(event: Extract<FlightEvent, { type: 'current' }>, token: number) {
		void flightAudio.play('air-current', 0.3);
		const currentLabel = CURRENT_LABELS[event.currentType];
		if (event.currentType === 'crosswind' || event.currentType === 'valleyCurrent') {
			const warningShown = await showWarning(
				currentLabel,
				event.currentType === 'valleyCurrent' ? 'reward' : 'current',
				token,
				360,
			);
			if (!warningShown) return;
		}
		eventLabel = currentLabel;
		eventCallout = currentLabel;
		activeCurrent = {
			currentType: event.currentType,
			phase: 'approach',
			multiplier: event.multiplier,
		};
		flightTargetY = bounds.floorY * 0.46;
		triggerFlap();
		await delay(300);
		if (token !== presentationToken) return;
		activeCurrent = {
			currentType: event.currentType,
			phase: 'enter',
			multiplier: event.multiplier,
		};
		impactActive = event.currentType === 'crosswind';
		await animateCurrentMultiplier(event.multiplier, 360, token);
		if (token !== presentationToken) return;
		emitParticles(event.currentType === 'crosswind' ? 30 : 20);
		activeCurrent = {
			currentType: event.currentType,
			phase: 'release',
			multiplier: event.multiplier,
		};
		await delay(220);
		if (token !== presentationToken) return;
		activeCurrent = undefined;
		impactActive = false;
	}

	async function presentEncounter(
		event: Extract<FlightEvent, { type: 'encounter' }>,
		token: number,
	) {
		if (event.encounterType === 'ridgeDragon') {
			eventWarning = undefined;
			eventCallout = '';
			comboFeedback = undefined;
			stageAnnouncement = undefined;
			flightAudio.stopEffects();
			status = 'collided';
			player = { ...player, velocity: { x: 0, y: 0 } };
			encounterWinner = event.result === 'pass' ? activeCreature.id : 'dragon';
			dragonVictory = 'playing';
			const completed = new Promise<boolean>((resolve) => (dragonVictoryResolver = resolve));
			let guard: ReturnType<typeof setTimeout>;
			const fallback = new Promise<boolean>((resolve) => {
				guard = setTimeout(() => resolve(false), 10500);
			});
			const played = await Promise.race([completed, fallback]);
			clearTimeout(guard!);
			if (token !== presentationToken) return;
			dragonVictoryResolver = undefined;
			if (played) {
				dragonVictory = 'outcome';
				currentMultiplier = event.multiplier;
				await delay(1400, false);
				if (token !== presentationToken) return;
				dragonVictory = 'result';
				if (event.result === 'pass') {
					void flightAudio.play('predator-pass', 0.3, 'predator');
					dragonVictory = undefined;
					status = 'flying';
				}
				return;
			}
			dragonVictory = undefined;
		}
		const encounterLabel = ENCOUNTER_LABELS[event.encounterType];
		void flightAudio.play('encounter-warning', 0.3);
		const warningShown = await showWarning(encounterLabel, 'danger', token, 430);
		if (!warningShown) return;
		eventLabel = encounterLabel;
		void flightAudio.play('ridge-dragon-call', 0.3, 'predator');
		eventCallout = 'DANGER AHEAD';
		activeEncounter = { encounterType: event.encounterType, result: event.result, phase: 'enter' };
		flightTargetY = bounds.floorY * 0.38;
		triggerFlap();
		await delay(330);
		if (token !== presentationToken) return;
		activeEncounter = { encounterType: event.encounterType, result: event.result, phase: 'engage' };
		impactActive = true;
		await delay(380);
		if (token !== presentationToken) return;
		activeEncounter = {
			encounterType: event.encounterType,
			result: event.result,
			phase: 'resolve',
		};
		await animateCurrentMultiplier(event.multiplier, 300, token);
		if (token !== presentationToken) return;
		if (event.result === 'pass') {
			eventCallout = 'PREDATOR AVOIDED';
			void flightAudio.play('predator-pass', 0.3, 'predator');
			emitParticles(30, true);
		} else {
			eventCallout = 'PREDATOR STRIKE';
			void flightAudio.play('crash', 0.4);
			status = 'collided';
			player = { ...player, velocity: { x: 0, y: 0 } };
			emitParticles(38, true);
		}
		await delay(event.result === 'crash' ? 420 : 300);
		if (token !== presentationToken) return;
		activeEncounter = undefined;
		impactActive = event.result === 'crash';
	}

	async function presentEnding(event: Extract<FlightEvent, { type: 'ending' }>, token: number) {
		activeEnding = event.ending;
		status = 'ending';
		landingProgress = 0;
		eventCallout = ENDING_LABELS[event.ending];
		player = { ...player, velocity: { x: 0, y: 0 } };
		triggerFlap();
		await animateCurrentMultiplier(event.multiplier, 320, token);
		if (token !== presentationToken) return;
		const start = { x: player.position.x / bounds.width, y: player.position.y / bounds.height };
		await animatePresentationValues(
			window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 1500,
			(progress) => {
				landingProgress = progress;
				const eased = progress;
				const target = landingPosition();
				player = {
					...player,
					position: {
						x: start.x * bounds.width + (target.x - start.x * bounds.width) * eased,
						y:
							start.y * bounds.height +
							(target.y - start.y * bounds.height) * eased -
							Math.sin(progress * Math.PI) * bounds.height * 0.09,
					},
					velocity: { x: 0, y: 0 },
				};
			},
			token,
		);
		if (token !== presentationToken) return;
		const endingIntensity = {
			safeLanding: 12,
			meadowLanding: 20,
			ridgeLanding: 28,
			hiddenValley: 34,
			summitLanding: 42,
		}[event.ending];
		flightAudio.stop('wings');
		void flightAudio.play('landing', 0.4);
		emitParticles(endingIntensity);
		await delay(300 + endingIntensity * 10);
	}

	function landingPosition() {
		// Same normalized anchor as the image's object-position, including narrow cover crops.
		const footOffset = clamp(window.innerWidth * 0.046, 38, 58) * activeCreature.sizeScale * 0.32;
		return { x: bounds.width * LANDING_ANCHOR.x, y: bounds.height * LANDING_ANCHOR.y - footOffset };
	}

	async function presentFinalResult(round: FlightRound, token: number) {
		if (wallet.live && !isReplay) {
			try {
				await stakeSession.settle();
			} catch {
				return;
			}
			if (token !== presentationToken) return;
			if (!settledRounds.has(round.id)) {
				settledRounds.add(round.id);
				sessionNet += round.finalWin - (round.entryCost ?? round.bet);
			}
		}
		flightAudio.stop('wings');
		flightAudio.stop('result');
		if (!isReplay && !flightHistory.some((item) => item.id === round.id)) {
			flightHistory = [round, ...flightHistory].slice(0, 20);
		}
		const tier = getWinTier(round.finalWin / (round.entryCost ?? round.bet));
		eventLabel = tier.label;
		eventCallout = round.ending === 'crash' ? 'CRASH' : tier.label;

		if (round.finalWin <= 0) {
			void flightAudio.play(
				resultSound(round.finalWin, round.entryCost ?? round.bet),
				0.35,
				'result',
			);
			status = 'complete';
			finalMultiplier = round.finalMultiplier;
			finalWin = round.finalWin;
			currentMultiplier = round.finalMultiplier;
			return;
		}

		finalMultiplier = 0;
		finalWin = 0;
		winCelebrationOpen = round.finalWin > 0;
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const amountDecimals = Math.max(
			2,
			(round.finalWin.toFixed(6).match(/\.(\d*?[1-9])0*$/)?.[1] ?? '').length,
		);
		if (!reducedMotion) void flightAudio.play('win-count-loop', 0.35, 'win-counter', true);
		await animatePresentationValues(
			reducedMotion ? 1 : Math.max(1800, tier.duration * 3),
			(progress) => {
				finalMultiplier = round.finalMultiplier * progress;
				finalWin = Number((round.finalWin * progress).toFixed(amountDecimals));
			},
			token,
			false,
		);
		if (token !== presentationToken) return;
		flightAudio.stop('win-counter');
		void flightAudio.play('win-count-finish', 0.35, 'result');
		finalMultiplier = round.finalMultiplier;
		finalWin = round.finalWin;
		currentMultiplier = round.finalMultiplier;
		if (winCelebrationOpen) await delay(reducedMotion ? 1000 : 1400, false);
		if (token !== presentationToken) return;
		winCelebrationOpen = false;
		status = 'complete';
	}

	async function presentRound(round: FlightRound, token: number) {
		for (const [index, event] of round.events.entries()) {
			if (token !== presentationToken) return;
			eventProgress = index + 1;
			updateFlightProgress(round, index);

			switch (event.type) {
				case 'launch':
					eventLabel = 'LAUNCH';
					eventCallout = `${round.launchStyle.toUpperCase()} LAUNCH`;
					status = 'flying';
					flightTargetY =
						event.path === 'safe'
							? bounds.floorY * 0.42
							: event.path === 'danger'
								? bounds.floorY * 0.34
								: bounds.floorY * 0.5;
					player = {
						...player,
						velocity: {
							x: round.launchStyle === 'glide' ? 0 : round.launchStyle === 'boost' ? 20 : -10,
							y: round.launchStyle === 'boost' ? -155 : round.launchStyle === 'dive' ? 120 : -85,
						},
					};
					triggerFlap();
					emitParticles(12);
					await delay(350);
					break;
				case 'gate':
					await presentGate(event);
					if (token !== presentationToken) return;
					if (event.result === 'pass') {
						void flightAudio.play('result-win', 0.2, 'gate-pass');
						comboCount += 1;
						showCombo(comboCount);
					} else {
						comboCount = 0;
						eventCallout = 'CRASH';
						flightAudio.stop('wings');
						if (
							activeCreature.id === 'woodpecker' ||
							activeCreature.id === 'eagle' ||
							activeCreature.id === 'azure-swift' ||
							activeCreature.id === 'archaeopteryx'
						) {
							const completed = new Promise<void>((resolve) => (birdBurstResolver = resolve));
							birdBurst = 'playing';
							await completed;
							if (token !== presentationToken) return;
							birdBurstResolver = undefined;
							birdBurst = 'finished';
						} else void flightAudio.play('crash', 0.4);
					}
					if (event.result === 'crash') await delay(420);
					break;
				case 'pickup':
					await presentPickup(event, token);
					break;
				case 'current':
					await presentCurrent(event, token);
					break;
				case 'encounter':
					await presentEncounter(event, token);
					break;
				case 'ending':
					eventLabel = ENDING_LABELS[event.ending];
					eventCallout = ENDING_LABELS[event.ending];
					await presentEnding(event, token);
					break;
				case 'finalWin':
					await presentFinalResult(round, token);
					break;
			}
		}
	}

	function startFlight(bonusId?: BonusFlightId) {
		if (controlsLocked || !betInputIsValid) {
			void flightAudio.play('unavailable', 0.25, 'ui');
			return;
		}
		flightError = '';
		if (wallet.live) {
			void startStakeFlight(bonusId);
			return;
		}
		roundSequence += 1;
		const options = {
			creature: selectedCreatureId,
			launchStyle: selectedLaunchStyle,
		};
		try {
			const round: FlightRound = bonusId
				? createBonusRound(bonusId, selectedBet, roundSequence, drawBonusTicket(), options)
				: {
						...generateMockRound(selectedBet, selectedRisk, roundSequence, options),
						weather: selectedWeather,
						timeOfDay: selectedTimeOfDay,
					};
			bonusOpen = false;
			beginFlight(round);
		} catch {
			bonusOpen = false;
			flightError = 'Could not start this demo flight. Please try again.';
			void flightAudio.play('unavailable', 0.3, 'ui');
		}
	}

	function beginFlight(round: FlightRound, replay = false) {
		if (status !== 'ready') return;
		flightAudio.stopEffects();
		birdBurst = undefined;
		dragonVictory = undefined;
		if (round.bonusFlight) void flightAudio.play('bonus-start', 0.3);
		isReplay = replay;
		if (round.ending !== 'crash') {
			const finishImage = new Image();
			finishImage.src = getFinishBackground(
				round.ending,
				round.weather ?? selectedWeather,
				round.timeOfDay ?? selectedTimeOfDay,
			);
			void finishImage.decode().catch(() => undefined);
		}
		const token = ++presentationToken;
		player = createPlayer(bounds);
		currentRound = round;
		roundCreatureId = round.creature;
		currentStageId = round.stagePlan[0]?.stage ?? 'MOUNTAIN_VALLEY';
		flightProgress = 0;
		stageAnnouncement = undefined;
		currentMultiplier = 1;
		finalMultiplier = 0;
		finalWin = 0;
		gatesPassed = 0;
		distanceTravelled = 0;
		activeGate = undefined;
		activePickup = undefined;
		activeCurrent = undefined;
		activeEncounter = undefined;
		activeEnding = undefined;
		eventWarning = undefined;
		comboFeedback = undefined;
		comboCount = 0;
		multiplierPulse = false;
		impactActive = false;
		eventLabel = 'LAUNCHING';
		eventProgress = 0;
		eventCallout = '';
		particles = [];
		status = 'flying';
		// Short windows may have scrolled down to the controls.
		worldElement?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		void presentRound(round, token);
	}

	function flyAgain() {
		if (replayMode) {
			if (sharedReplay && status === 'complete') replayFlight(sharedReplay);
			return;
		}
		if (status !== 'complete' || !currentRound || wallet.busy || !wallet.ready || wallet.active)
			return;
		const previous = currentRound;
		resetPresentation();
		selectedBet = previous.bet;
		betInput = formatBetInput(previous.bet);
		selectedCreatureId = previous.creature;
		selectedLaunchStyle = previous.launchStyle;
		if (!previous.bonusFlight) {
			selectedRisk = previous.risk;
			selectedWeather = previous.weather ?? selectedWeather;
			selectedTimeOfDay = previous.timeOfDay ?? selectedTimeOfDay;
		}
		startFlight(previous.bonusFlight);
	}

	function replayFlight(round: FlightRound) {
		if (
			(status !== 'ready' && status !== 'complete') ||
			wallet.busy ||
			!wallet.ready ||
			wallet.active
		)
			return;
		historyOpen = false;
		resetPresentation();
		beginFlight(round, true);
	}

	function updateParticles(deltaSeconds: number) {
		particles = particles
			.map((particle) => ({
				...particle,
				x: particle.x + particle.velocityX * deltaSeconds,
				y: particle.y + particle.velocityY * deltaSeconds,
				velocityY: particle.velocityY + 100 * deltaSeconds,
				life: particle.life - deltaSeconds,
			}))
			.filter((particle) => particle.life > 0);
	}

	function finishActiveGate() {
		activeGate = undefined;
		const resolve = gateResolver;
		gateResolver = undefined;
		resolve?.();
	}

	function updateActiveGate(deltaSeconds: number) {
		if (!activeGate || status !== 'flying') return;
		activeGate = { ...activeGate, x: activeGate.x - WORLD_SPEED * deltaSeconds };

		if (activeGate.result === 'pass' && activeGate.x + activeGate.width < player.position.x) {
			gatesPassed += 1;
			finishActiveGate();
		} else if (
			activeGate.result === 'crash' &&
			activeGate.x + activeGate.width * 0.48 <= player.position.x + player.radius
		) {
			status = 'collided';
			impactActive = true;
			player = { ...player, velocity: { x: 0, y: 0 } };
			emitParticles(28, true);
			finishActiveGate();
		}
	}

	function resizeWorld() {
		if (!worldElement) return;
		const previous = bounds;
		const width = worldElement.clientWidth;
		const height = worldElement.clientHeight;
		if (!width || !height) return;
		bounds = { width, height, floorY: height - clamp(height * 0.085, 34, 48) };
		const widthRatio = width / previous.width;
		const heightRatio = height / previous.height;
		player =
			status === 'ready'
				? createPlayer(bounds)
				: {
						...player,
						position: { x: player.position.x * widthRatio, y: player.position.y * heightRatio },
						radius: clamp(width * 0.026, 17, 25),
					};
		flightTargetY *= heightRatio;
		if (activeEnding && landingProgress === 1) player = { ...player, position: landingPosition() };
		if (activeGate) {
			activeGate = {
				...activeGate,
				x: activeGate.x * widthRatio,
				width: clamp(width * 0.19, 95, 210),
				gapCenterY: activeGate.gapCenterY * heightRatio,
				gapHeight: clamp(height * 0.35, 145, 215),
			};
		}
	}

	onMount(() => {
		document.documentElement.lang = language;
		document.documentElement.dir = textDirection;
		stakeSession = new StakeSession((state) => {
			wallet = state;
		});
		void connectStake();
		try {
			soundMuted = localStorage.getItem('dragon-flight-muted') === 'true';
		} catch {
			/* Optional preference. */
		}
		flightAudio.setMuted(soundMuted);
		flightAudio.setHidden(document.hidden);
		const visibility = () => flightAudio.setHidden(document.hidden);
		const unlock = () => flightAudio.unlock();
		const flyWithSpace = (event: KeyboardEvent) => {
			if (
				event.code !== 'Space' ||
				event.repeat ||
				event.defaultPrevented ||
				event.isComposing ||
				event.ctrlKey ||
				event.altKey ||
				event.metaKey ||
				event.shiftKey ||
				controlsLocked ||
				!betInputIsValid ||
				wallet.spacebarDisabled ||
				customizeOpen ||
				helpOpen ||
				bonusOpen ||
				historyOpen ||
				creaturePickerOpen
			)
				return;
			const focused = document.activeElement;
			const interactive = (target: EventTarget | null) =>
				target instanceof Element &&
				(Boolean(
					target.closest(
						'input, textarea, select, button, [contenteditable]:not([contenteditable="false"])',
					),
				) ||
					(target instanceof HTMLElement && target.isContentEditable));
			if (interactive(focused) || event.composedPath().some(interactive)) return;
			event.preventDefault();
			startFlight();
		};
		const click = (event: MouseEvent) => {
			const target = event.target instanceof Element ? event.target : undefined;
			const button = target?.closest('button');
			if (
				!button ||
				button.disabled ||
				button.hasAttribute('data-audio-toggle') ||
				button.hasAttribute('data-audio-panel')
			)
				return;
			if (!button.closest('.prototype-shell, dialog')) return;
			void flightAudio.play(
				button.hasAttribute('aria-pressed') || button.hasAttribute('data-audio-select')
					? 'option-select'
					: 'button-click',
				0.18,
				'ui',
			);
		};
		const change = (event: Event) => {
			if (
				event.target instanceof HTMLSelectElement ||
				(event.target instanceof HTMLInputElement && event.target.type === 'radio')
			)
				void flightAudio.play('option-select', 0.22, 'ui');
		};
		document.addEventListener('pointerdown', unlock, true);
		document.addEventListener('keydown', unlock, true);
		document.addEventListener('keydown', flyWithSpace);
		document.addEventListener('click', click, true);
		document.addEventListener('change', change);
		document.addEventListener('visibilitychange', visibility);
		let disposed = false;
		for (const creature of CREATURES) {
			if (!creature.flightAnimation) continue;
			void loadDecodedFlightFrames(creature.flightAnimation.frames)
				.then((frames) => {
					if (disposed) return;
					loadedCreatureFrames = { ...loadedCreatureFrames, [creature.id]: frames };
				})
				.catch(() => undefined);
		}
		const observer = new ResizeObserver(resizeWorld);
		if (worldElement) observer.observe(worldElement);
		resizeWorld();
		let animationFrame = 0;
		let lastTime = performance.now();
		const sessionStart = Date.now();

		const update = (now: number) => {
			sessionSeconds = Math.floor((Date.now() - sessionStart) / 1000);
			const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
			lastTime = now;
			const moving = status === 'flying' || status === 'ending' || status === 'collided';
			const flightDelta =
				deltaSeconds * flightPlaybackSpeed * (activeGate ? GATE_APPROACH_RATE : 1);
			const environmentSpeed = WORLD_SPEED * currentStage.parallaxSpeed;
			const presentationSpeed = status === 'collided' ? environmentSpeed * 0.22 : environmentSpeed;
			parallaxOffset =
				(parallaxOffset +
					(dragonVictory ? 0 : moving ? flightDelta * presentationSpeed : deltaSeconds * 30)) %
				1800;
			updateParticles(moving ? flightDelta : deltaSeconds);

			if (status === 'flying') {
				// Small simulation steps keep steering coordinated with faster gate travel,
				// including at lower frame rates. Do not exceed steerPlayer's delta cap.
				const steps = Math.ceil(flightDelta / (1 / 60));
				for (let step = 0; step < steps; step += 1) {
					player = steerPlayer(player, flightTargetY, flightDelta / steps, bounds, {
						agility: activeCreature.agility,
						damping: activeCreature.damping,
						maxVerticalSpeed: activeCreature.maxVerticalSpeed,
					});
					updateActiveGate(flightDelta / steps);
					if (status !== 'flying') break;
				}
				distanceTravelled += WORLD_SPEED * flightDelta;
			}
			animationFrame = requestAnimationFrame(update);
		};

		animationFrame = requestAnimationFrame(update);
		return () => {
			document.removeEventListener('pointerdown', unlock, true);
			document.removeEventListener('keydown', unlock, true);
			document.removeEventListener('keydown', flyWithSpace);
			document.removeEventListener('click', click, true);
			document.removeEventListener('change', change);
			document.removeEventListener('visibilitychange', visibility);
			flightAudio.dispose();
			disposed = true;
			loadedCreatureFrames = {};
			cancelPresentation();
			observer.disconnect();
			cancelAnimationFrame(animationFrame);
		};
	});
</script>

<svelte:head>
	<title>Lucky Flight</title>
	{#each [...Object.values(PICKUP_ARTWORK), ...Object.values(ENCOUNTER_ARTWORK)] as src (src)}
		<link rel="preload" as="image" href={src} type="image/webp" />
	{/each}
</svelte:head>

<main class="prototype-shell" style={`--playback-speed:${flightPlaybackSpeed};`}>
	<header class="prototype-header">
		<h1>Lucky Flight</h1>
		<div
			class="control-tools header-actions flight-extras"
			role="group"
			aria-label="Flight options"
		>
			<button
				type="button"
				class="header-button"
				data-audio-toggle
				aria-label={soundMuted ? 'Unmute sound' : 'Mute sound'}
				aria-pressed={!soundMuted}
				onclick={toggleSound}>{soundMuted ? t('soundOff') : t('soundOn')}</button
			>
			<label class="playback-control" title="Animation speed only. Odds and payouts stay the same.">
				<span>{t('speed')}</span>
				<select
					aria-label="Flight playback speed"
					bind:value={playbackSpeed}
					disabled={controlsLocked || wallet.turboDisabled}
				>
					<option value={1}>1×</option>
					<option value={1.5}>1.5×</option>
					<option value={2}>2×</option>
				</select>
			</label>
			<button
				class="header-button"
				type="button"
				aria-haspopup="dialog"
				aria-controls="customize-flight"
				data-audio-panel
				aria-expanded={customizeOpen}
				disabled={controlsLocked}
				onclick={() => (customizeOpen = true)}>{t('customize')}</button
			>
			<button
				class="help-button"
				type="button"
				aria-label={t('guide')}
				data-audio-panel
				onclick={() => (helpOpen = true)}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true"
					><circle cx="12" cy="12" r="9" /><path
						d="M9.7 9.2a2.45 2.45 0 1 1 3.7 2.1c-.9.5-1.4 1-1.4 2"
					/><path d="M12 16.8h.01" /></svg
				>
			</button>
			<button
				class="bonus-button"
				disabled={controlsLocked || !betInputIsValid || wallet.buyDisabled}
				data-audio-panel
				onclick={() => (bonusOpen = true)}>{t('bonusFlights')} <span>2 {t('routes')}</span></button
			>
			<button
				disabled={wallet.busy ||
					!wallet.ready ||
					wallet.active ||
					(status !== 'ready' && status !== 'complete')}
				data-audio-panel
				onclick={() => (historyOpen = true)}
				>{t('history')} <span>{flightHistory.length}</span></button
			>
			<label class="language-control">
				<span>{t('language')}</span>
				<select
					aria-label={t('language')}
					value={language}
					onchange={(event) =>
						changeLanguage(event.currentTarget.value as (typeof SUPPORTED_LANGUAGES)[number])}
				>
					{#each SUPPORTED_LANGUAGES as code (code)}<option value={code}
							>{LANGUAGE_NAMES[code]}</option
						>{/each}
				</select>
			</label>
		</div>
	</header>

	<section class="game-layout">
		<div
			bind:this={worldElement}
			class:has-impact={impactActive}
			class:has-ending={Boolean(activeEnding)}
			class:dragon-defeat={Boolean(dragonVictory)}
			class:bird-burst={Boolean(birdBurst)}
			class={`world ${currentStage.className} weather-${activeWeather}`}
			style={`--floor-scroll:${-parallaxOffset}px;`}
		>
			<Landscape
				ending={activeEnding}
				stage={currentStageId}
				weather={activeWeather}
				timeOfDay={activeTimeOfDay}
				{parallaxOffset}
			/>
			<Atmosphere
				onThunder={() => {
					void flightAudio.play('thunder', 0.18, 'thunder');
				}}
				finishScene={Boolean(activeEnding)}
				weather={activeWeather}
				timeOfDay={activeTimeOfDay}
				stageIntensity={currentStage.intensity}
				{parallaxOffset}
				launchStyle={currentRound?.launchStyle ?? selectedLaunchStyle}
				active={status !== 'ready' && status !== 'complete'}
			/>
			<div class="flight-hud">
				<div class="hud-selection">
					<span
						class:danger={status === 'collided' ||
							(status === 'complete' && currentRound?.ending === 'crash')}
						class="round-status"
						>{wallet.busy
							? t('pleaseWait')
							: !wallet.ready
								? t('disconnected')
								: status === 'ready'
									? t('ready')
									: status === 'complete' && currentRound
										? ENDING_LABELS[currentRound.ending]
										: t('flightActive')}</span
					>
					<span
						>{currentRound?.bonusFlight ? t('entryCost') : t('bet')}
						<strong
							>{formatLocalAmount(
								currentRound?.entryCost ?? currentRound?.bet ?? selectedBet,
							)}</strong
						></span
					>
					<span
						>{currentRound?.bonusFlight ? t('routes').toUpperCase() : t('risk')}
						<strong
							>{currentRound?.bonusFlight
								? getBonusFlight(currentRound.bonusFlight).name
								: t(currentRound?.risk ?? selectedRisk)}</strong
						></span
					>
					<span>{t('creature')} <strong>{activeCreature.name}</strong></span>
					<span>{t('run')} <strong>{gatesPassed} · {distanceMetres}m</strong></span>
				</div>
				<span class="stage-readout"
					>{stageWord} {currentStage.order}<strong>{currentStage.name}</strong></span
				>
				<span class:pulse={multiplierPulse} class="multiplier-readout"
					>{t('current')}<strong>x{currentMultiplier.toFixed(2)}</strong></span
				>
			</div>
			{#if isReplay && status !== 'ready'}<div class="replay-label">{t('replayNoCost')}</div>{/if}

			{#if stageAnnouncement}
				{#key stageAnnouncement.id}
					<div class="stage-transition" role="status" aria-live="polite">
						<span>{stageWord} {stageAnnouncement.order}</span>
						<strong>{stageAnnouncement.name}</strong>
					</div>
				{/key}
			{/if}

			{#if eventWarning}
				{#key eventWarning.id}
					<EventWarning text={eventWarning.text} tone={eventWarning.tone} />
				{/key}
			{/if}

			{#if eventCallout && !eventWarning}<div
					class="event-callout"
					role="status"
					aria-live="polite"
				>
					{eventCallout}
				</div>{/if}

			{#if currentRound && status !== 'ready' && status !== 'complete'}
				<div
					class="flight-meter"
					role="progressbar"
					aria-label="Flight progress"
					aria-valuemin="0"
					aria-valuemax="100"
					aria-valuenow={Math.round(flightProgress)}
				>
					<span>{t('start')}</span>
					<div class="flight-meter-track">
						<i style={`width:${flightProgress}%;`}></i>
						<b style={`left:${flightProgress}%;`}></b>
					</div>
					<span>{t('destination')}</span>
					<small>{eventProgress}/{currentRound.events.length} · {eventLabel}</small>
				</div>
			{/if}

			{#if activeGate}
				<div
					class={`gate hazard-${activeGate.hazard} ${activeGate.result}`}
					style={`left:${activeGate.x}px;width:${activeGate.width}px;`}
				>
					<TerrainObstacle
						hazard={activeGate.hazard}
						stage={currentStageId}
						weather={activeWeather}
						timeOfDay={activeTimeOfDay}
						gapTop={activeGate.gapCenterY - activeGate.gapHeight / 2}
						gapBottom={activeGate.gapCenterY + activeGate.gapHeight / 2}
					/>
				</div>
			{/if}

			{#if activePickup}
				<CollectiblePickup
					pickupType={activePickup.pickupType}
					fromMultiplier={activePickup.fromMultiplier}
					toMultiplier={activePickup.toMultiplier}
				/>
			{/if}

			{#if activeCurrent}
				<AirCurrentEffect
					currentType={activeCurrent.currentType}
					phase={activeCurrent.phase}
					multiplier={activeCurrent.multiplier}
				/>
			{/if}

			{#if activeEncounter}
				<DangerEncounter
					encounterType={activeEncounter.encounterType}
					result={activeEncounter.result}
					phase={activeEncounter.phase}
				/>
			{/if}
			{#if birdBurst === 'playing'}
				<BirdBurst
					bird={activeCreature.id === 'archaeopteryx'
						? 'archaeopteryx'
						: activeCreature.id === 'azure-swift'
							? 'azure-swift'
							: activeCreature.id === 'eagle'
								? 'eagle'
								: 'woodpecker'}
					x={player.position.x}
					y={player.position.y}
					muted={soundMuted}
					onfallback={() => {
						void flightAudio.play(
							activeCreature.id === 'azure-swift'
								? 'azure-swift-burst'
								: activeCreature.id === 'eagle' || activeCreature.id === 'archaeopteryx'
									? 'eagle-burst'
									: 'woodpecker-burst',
							0.8,
							'bird-burst',
						);
					}}
					onfinish={() => {
						flightAudio.stop('bird-burst');
						birdBurstResolver?.();
					}}
				/>
			{/if}
			{#if dragonVictory}
				<DragonVictory
					phase={dragonVictory}
					winner={encounterWinner}
					bird={activeCreature.id}
					onstart={() => {
						const sound =
							encounterWinner === 'dragon' && activeCreature.id !== 'eagle'
								? (`dragon-${activeCreature.id}-fight` as const)
								: (`${encounterWinner}-fight` as const);
						void flightAudio.play(sound, 0.55, 'fight-video');
					}}
					onfinish={(played) => {
						flightAudio.stop('fight-video');
						dragonVictoryResolver?.(played);
					}}
				/>
			{/if}

			{#if activeEnding}<EndingEffect progress={landingProgress} />{/if}

			{#if comboFeedback}
				{#key comboFeedback.id}
					<div class="combo-feedback" role="status" aria-live="polite">
						<strong>PERFECT PASS</strong>
						{#if comboFeedback.count > 1}<span>x{comboFeedback.count} COMBO</span>{/if}
					</div>
				{/key}
			{/if}

			{#each particles as particle (particle.id)}
				<span
					class="flight-particle"
					style={`left:${particle.x}px;top:${particle.y}px;width:${particle.size}px;height:${particle.size}px;opacity:${Math.min(1, particle.life * 2.4)};`}
				></span>
			{/each}

			<div
				class:is-flapping={flapActive}
				class:is-hit={status === 'collided'}
				class:landed
				class="creature-flight"
				style={`left:${player.position.x}px;top:${player.position.y}px;transform:translate(-50%,-50%) rotate(${rotation}deg) scale(${activeCreature.sizeScale});`}
				aria-label={activeCreature.name}
			>
				<div
					class:uses-frame-animation={Boolean(activeCreatureFrame)}
					class={`creature-sprite ${activeCreature.className}`}
					style={`--hover-duration:${activeCreature.hoverDuration}ms;--hover-lift:${-activeCreature.hoverLift}px;--flap-burst:${activeCreature.flapDuration}ms;`}
				>
					{#if activeCreatureFrame}
						<canvas
							bind:this={creatureFrameCanvas}
							class="creature-frame"
							width="900"
							height="600"
							aria-hidden="true"
						></canvas>
					{:else if activeCreature.assets?.flight}
						<img
							class="creature-frame"
							src={activeCreature.assets.flight}
							alt=""
							draggable="false"
						/>
					{:else}
						<span class="wing wing-top"></span><span class="dragon-body"></span><span
							class="dragon-head"><i></i></span
						><span class="wing wing-bottom"></span><span class="tail"></span><span
							class="creature-detail"
						></span>
					{/if}
				</div>
			</div>
			<div class="floor" style={`height:${bounds.height - bounds.floorY}px;`}></div>

			{#if status === 'ready'}<div class="start-hint">
					{readyPrompt.toUpperCase()}
				</div>{/if}
			{#if status === 'complete' && currentRound}
				<div
					class:success={currentRound.ending !== 'crash'}
					class="result-panel"
					aria-labelledby="flight-result-title"
				>
					{#if currentRound.ending !== 'crash'}
						<ResultScenery
							ending={currentRound.ending}
							weather={activeWeather}
							timeOfDay={activeTimeOfDay}
						/>
					{/if}
					<strong id="flight-result-title">{ENDING_LABELS[currentRound.ending]}</strong>
					<div>
						<span>{t('entryCost')}</span><b
							>{formatLocalAmount(currentRound.entryCost ?? currentRound.bet)}</b
						>
					</div>
					<div><span>{t('multiplier')}</span><b>x{finalMultiplier.toFixed(2)}</b></div>
					<div><span>{t('payout')}</span><b>{formatLocalAmount(finalWin)}</b></div>
					<div>
						<span>{t('netResult')}</span><b
							>{formatLocalAmount(
								currentRound.finalWin - (currentRound.entryCost ?? currentRound.bet),
							)}</b
						>
					</div>
					<div class="result-creature">
						<span>{t('creature')}</span><b>{activeCreature.name}</b>
					</div>
					<div><span>{t('launch')}</span><b>{currentRound.launchStyle.toUpperCase()}</b></div>
					<div><span>{t('weather')}</span><b>{activeWeatherConfig.name}</b></div>
					<div><span>{t('time')}</span><b>{activeTimeConfig.name}</b></div>
					<small>{wallet.live ? 'SERVER RESULT' : 'DEMO RESULT - NO REAL MONEY'}</small>
					<button onclick={flyAgain}
						>{replayMode
							? t('playAgain')
							: currentRound.bonusFlight
								? t('buyAgain')
								: t('flyAgain')} · {formatLocalAmount(
							currentRound.entryCost ?? currentRound.bet,
						)}</button
					>
					<button
						disabled={replayMode || wallet.busy || !wallet.ready || wallet.active}
						onclick={resetPresentation}>{t('changeSettings')}</button
					>
				</div>
			{/if}
		</div>

		<section class="control-dock" aria-label="Flight controls">
			<div class="creature-control">
				<span class="dock-label">{t('creature')}</span>
				<button
					class="creature-button"
					type="button"
					disabled={controlsLocked}
					data-audio-panel
					onclick={() => (creaturePickerOpen = true)}
				>
					<span>{selectedCreature.name}</span><svg
						class="creature-chevron"
						viewBox="0 0 16 16"
						aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg
					>
				</button>
			</div>

			<div class="bet-control">
				<span class="dock-label">{t('bet')}</span>
				<div class="bet-stepper">
					<button
						aria-label="Decrease bet"
						disabled={controlsLocked || selectedBet <= minimumBet}
						onclick={() => moveBet(-1)}
						><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10" /></svg></button
					>
					<div
						class="bet-input-shell"
						class:invalid={!betInputIsValid}
						class:disabled={controlsLocked}
					>
						<span aria-hidden="true">{betCurrencySymbol}</span>
						<input
							aria-label="Bet amount"
							aria-invalid={!betInputIsValid}
							class="bet-input"
							disabled={controlsLocked}
							inputmode="decimal"
							type="text"
							value={betInput}
							oninput={(event) => updateBetInput(event.currentTarget as HTMLInputElement)}
							onblur={normalizeBetInput}
						/>
					</div>
					<button
						aria-label="Increase bet"
						disabled={controlsLocked || selectedBet >= maximumBet}
						onclick={() => moveBet(1)}
						><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M10 5v10" /></svg></button
					>
				</div>
			</div>

			<div class="risk-control">
				<span class="dock-label">{t('risk')}</span>
				<div class="risk-selector">
					{#each PATHS as path (path.risk)}
						<button
							type="button"
							disabled={controlsLocked}
							aria-pressed={selectedRisk === path.risk}
							class:active={selectedRisk === path.risk}
							onclick={() => (selectedRisk = path.risk)}>{t(path.risk)}</button
						>
					{/each}
				</div>
				<p><strong>{t(selectedRisk)}</strong> · {selectedPathNote}</p>
			</div>

			{#if replayMode}
				<button
					class="fly-button"
					disabled={wallet.busy ||
						!wallet.ready ||
						!sharedReplay ||
						(status !== 'ready' && status !== 'complete')}
					onclick={() => sharedReplay && replayFlight(sharedReplay)}
					>{status === 'complete' ? t('playAgain') : t('playReplay')}</button
				>
			{:else}
				<button
					class="fly-button"
					aria-live="polite"
					disabled={controlsLocked || !betInputIsValid}
					onclick={() => startFlight()}
					>{wallet.busy
						? `${t('pleaseWait')}…`
						: !wallet.ready
							? t('reconnect').toUpperCase()
							: controlsLocked
								? t('flightActive')
								: `${t('fly')} ${formatLocalAmount(selectedBet)}`}</button
				>
			{/if}
		</section>
	</section>

	{#if wallet.error}<p role="alert">{wallet.error}</p>
		<button disabled={wallet.busy} onclick={connectStake}>{t('reconnect')}</button>{/if}
	{#if flightError}<p role="alert">{flightError}</p>{/if}
	<footer>
		<span>{t('explore')}</span><span
			>{replayMode
				? 'Replay - no bet is placed'
				: wallet.live
					? `${t('balance')} ${formatLocalAmount(wallet.amount / 1e6)} | ${t('netResult')} ${formatLocalAmount(sessionNet)} | ${t('session')} ${Math.floor(sessionSeconds / 60)}m ${sessionSeconds % 60}s`
					: 'Local demo - No real-money bets.'}</span
		>
	</footer>
</main>

{#if winCelebrationOpen && currentRound}
	<WinCelebration
		tier={resultWinTier}
		multiplier={`x${finalMultiplier.toFixed(2)}`}
		win={formatLocalAmount(finalWin)}
	/>
{/if}

<HelpDialog live={wallet.live} open={helpOpen} onClose={() => (helpOpen = false)} />
<BonusFlightsDialog
	live={wallet.live}
	currency={wallet.currency}
	open={bonusOpen}
	bet={selectedBet}
	disabled={controlsLocked || !betInputIsValid || wallet.buyDisabled}
	onClose={() => (bonusOpen = false)}
	onBuy={startFlight}
/>
<FlightHistory
	currency={wallet.currency}
	open={historyOpen}
	rounds={flightHistory}
	disabled={wallet.busy ||
		!wallet.ready ||
		wallet.active ||
		(status !== 'ready' && status !== 'complete')}
	onClose={() => (historyOpen = false)}
	onReplay={replayFlight}
/>
<CreaturePicker
	open={creaturePickerOpen}
	selected={selectedCreatureId}
	disabled={controlsLocked}
	onSelect={(creature) => (selectedCreatureId = creature)}
	onClose={() => (creaturePickerOpen = false)}
/>
<CustomizeDrawer
	open={customizeOpen}
	disabled={controlsLocked}
	weather={selectedWeather}
	timeOfDay={selectedTimeOfDay}
	launchStyle={selectedLaunchStyle}
	onWeatherSelect={(weather) => {
		selectedWeather = weather;
	}}
	onTimeSelect={(time) => {
		selectedTimeOfDay = time;
	}}
	onLaunchSelect={(launch) => (selectedLaunchStyle = launch)}
	onClose={() => (customizeOpen = false)}
/>

<style>
	.bird-burst .creature-flight,
	.dragon-defeat .creature-flight,
	.dragon-defeat .floor,
	.dragon-defeat .flight-particle {
		visibility: hidden;
	}
	.prototype-shell,
	.prototype-shell * {
		box-sizing: border-box;
	}
	.prototype-shell {
		position: fixed;
		inset: 0;
		z-index: 1000;
		overflow: auto;
		padding: clamp(16px, 2.5vw, 34px);
		color: #dce6e3;
		font-family: system-ui, sans-serif;
		background:
			radial-gradient(ellipse at 50% 0, #29414b, transparent 70%),
			linear-gradient(145deg, #111f27, #0b171d);
	}
	.prototype-header,
	.game-layout,
	.control-dock,
	footer {
		width: min(1440px, 100%);
		margin-inline: auto;
	}
	.prototype-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: clamp(8px, 1vh, 14px);
	}
	h1 {
		margin: 0;
		color: #e6eee9;
		font-size: clamp(1.3rem, 2.4vw, 2.2rem);
		letter-spacing: 0.04em;
		text-shadow: 0 2px 18px rgba(246, 157, 42, 0.26);
	}
	.game-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(290px, 360px);
		gap: clamp(14px, 2vw, 26px);
	}
	.world {
		position: relative;
		min-width: 0;
		min-height: clamp(420px, 68dvh, 730px);
		overflow: hidden;
		border: 1px solid #718b91;
		border-radius: 12px;
		box-shadow:
			inset 0 0 0 5px #071811,
			inset 0 0 45px #000,
			0 18px 50px rgba(0, 0, 0, 0.45);
		background: linear-gradient(#07100f, #0d1913 64%, #17100a);
	}
	.world.has-impact {
		animation: impact-shake calc(0.4s / var(--playback-speed, 1)) ease-out;
	}

	.flight-hud {
		position: absolute;
		z-index: 12;
		top: 14px;
		left: 50%;
		display: flex;
		gap: 18px;
		padding: 8px 13px;
		border: 1px solid rgba(189, 139, 46, 0.65);
		background: rgba(3, 17, 12, 0.82);
		transform: translateX(-50%);
		font:
			700 0.66rem/1 system-ui,
			sans-serif;
		letter-spacing: 0.1em;
		white-space: nowrap;
	}
	.flight-hud strong {
		margin-left: 4px;
		color: #58eda8;
	}
	.gate {
		position: absolute;
		z-index: 3;
		inset-block: 0;
	}
	.flight-particle {
		position: absolute;
		z-index: 7;
		border-radius: 50%;
		background: #d3e5db;
		box-shadow: 0 0 5px #c7dfd366;
		pointer-events: none;
	}
	.creature-flight {
		position: absolute;
		z-index: 7;
		width: clamp(58px, 7vw, 86px);
		height: clamp(38px, 4.6vw, 58px);
		filter: none;
		transition: filter 0.12s;
	}
	.creature-sprite {
		position: absolute;
		inset: 0;
		animation: creature-hover var(--hover-duration) ease-in-out infinite alternate;
	}
	.dragon-body {
		position: absolute;
		inset: 24% 19% 17% 20%;
		border: 2px solid #f4b847;
		border-radius: 58% 43% 49% 55%;
		background: radial-gradient(circle at 65% 28%, #78f4a4, #158c54 38%, #063323 72%);
		box-shadow:
			inset -8px -7px 12px rgba(0, 0, 0, 0.42),
			0 0 13px rgba(32, 232, 132, 0.38);
	}
	.dragon-head {
		position: absolute;
		right: 4%;
		top: 20%;
		width: 30%;
		height: 36%;
		border: 2px solid #e9ad42;
		border-radius: 65% 70% 60% 45%;
		background: #167b49;
		transform: rotate(-7deg);
	}
	.dragon-head:after {
		content: '';
		position: absolute;
		right: 17%;
		top: 26%;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #ffe46e;
		box-shadow: 0 0 7px #fff083;
	}
	.dragon-head i {
		position: absolute;
		left: 16%;
		top: -42%;
		border-right: 7px solid transparent;
		border-bottom: 14px solid #d49a32;
		transform: rotate(-28deg);
	}
	.wing {
		position: absolute;
		left: 25%;
		width: 42%;
		height: 44%;
		border: 2px solid #d79c35;
		background: linear-gradient(145deg, #104e38, #1fb86d 52%, #073021);
		transform-origin: 20% 50%;
	}
	.wing-top {
		top: -8%;
		clip-path: polygon(0 100%, 22% 0, 100% 35%, 58% 100%);
		animation: wing-top 0.42s ease-in-out infinite alternate;
	}
	.wing-bottom {
		bottom: -8%;
		clip-path: polygon(0 0, 58% 0, 100% 65%, 22% 100%);
		animation: wing-bottom 0.42s ease-in-out infinite alternate;
	}
	.is-flapping .wing-top {
		animation: flap-top var(--flap-burst) ease-out;
	}
	.is-flapping .wing-bottom {
		animation: flap-bottom var(--flap-burst) ease-out;
	}
	.tail {
		position: absolute;
		left: 0;
		top: 45%;
		width: 30%;
		height: 20%;
		border-top: 4px solid #c99131;
		border-radius: 70% 0 0;
		transform: rotate(-9deg);
	}
	.creature-detail {
		position: absolute;
		pointer-events: none;
	}
	.has-impact .creature-flight {
		filter: grayscale(0.5);
	}
	.floor {
		position: absolute;
		z-index: 5;
		left: 0;
		right: 0;
		bottom: 0;
		border-top: 2px solid #7a927b;
		background: repeating-linear-gradient(165deg, #293e36 0 22px, #31473e 23px 43px);
		background-position-x: var(--floor-scroll);
	}
	.start-hint {
		position: absolute;
		z-index: 9;
		left: 50%;
		bottom: 12%;
		padding: 8px 12px;
		border: 1px solid rgba(68, 229, 154, 0.5);
		background: rgba(3, 20, 14, 0.8);
		color: #72f0b6;
		font:
			700 0.62rem/1 system-ui,
			sans-serif;
		letter-spacing: 0.12em;
		transform: translateX(-50%);
		white-space: nowrap;
	}
	.result-panel {
		position: absolute;
		z-index: 12;
		left: 50%;
		top: 50%;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 9px;
		width: min(470px, calc(100% - 24px));
		min-width: 0;
		max-height: calc(100% - 24px);
		overflow: auto;
		overflow-wrap: anywhere;
		padding: 22px;
		border: 1px solid #e16b39;
		background: rgba(31, 9, 4, 0.96);
		color: #ffc38c;
		text-align: center;
		transform: translate(-50%, -50%);
		box-shadow: 0 0 45px rgba(234, 82, 30, 0.28);
	}
	.result-panel.success {
		border-color: #43d994;
		background: #071c20;
		isolation: isolate;
		box-shadow: 0 0 45px rgba(35, 218, 134, 0.25);
	}
	.has-ending .floor {
		opacity: 0;
	}
	.landed .creature-sprite,
	.landed .wing {
		animation: none;
	}
	.result-panel > strong,
	.result-panel > small,
	.result-panel > button,
	.result-panel .result-creature {
		grid-column: 1/-1;
	}
	.result-panel > strong {
		font-size: 1.35rem;
		letter-spacing: 0.13em;
	}
	.result-panel div {
		padding: 10px 6px;
		border: 1px solid rgba(221, 174, 82, 0.3);
		background: rgba(0, 0, 0, 0.2);
	}
	.result-panel span {
		display: block;
		margin-bottom: 6px;
		font:
			700 0.56rem/1 system-ui,
			sans-serif;
		letter-spacing: 0.12em;
	}
	.result-panel b {
		color: #ffe0a0;
		font-size: 1rem;
	}
	.result-panel small {
		color: #8fa394;
		font:
			600 0.55rem/1.2 system-ui,
			sans-serif;
		letter-spacing: 0.08em;
	}
	.result-panel button {
		border-color: #d2923a;
		color: #ffe09f;
	}
	button {
		min-height: 42px;
		border-radius: 6px;
		border: 1px solid #536d70;
		background: linear-gradient(#10231a, #09130f);
		color: #ceded9;
		font:
			700 0.8rem/1 system-ui,
			sans-serif;
		cursor: pointer;
		transition: 0.13s;
	}
	button:hover:not(:disabled),
	button:focus-visible,
	button.active {
		border-color: #9dc5ad;
		color: #c3deca;
		box-shadow:
			inset 0 0 13px rgba(26, 221, 133, 0.16),
			0 0 12px rgba(26, 221, 133, 0.12);
		outline: none;
	}
	button:disabled {
		cursor: not-allowed;
		opacity: 0.42;
	}
	.fly-button {
		border-color: #2cce86;
		background: linear-gradient(#188457, #0b4b33);
		color: #f2f4e7;
		font-family: system-ui, sans-serif;
		letter-spacing: 0.14em;
		box-shadow:
			inset 0 0 20px rgba(68, 255, 165, 0.16),
			0 0 18px rgba(20, 197, 117, 0.16);
	}
	footer {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding-top: 8px;
		color: #7f867a;
		font:
			0.65rem/1.4 system-ui,
			sans-serif;
		letter-spacing: 0.07em;
	}
	@keyframes creature-hover {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(var(--hover-lift));
		}
	}
	@keyframes wing-top {
		from {
			transform: rotate(-12deg) scaleY(0.78);
		}
		to {
			transform: rotate(8deg);
		}
	}
	@keyframes wing-bottom {
		from {
			transform: rotate(12deg) scaleY(0.78);
		}
		to {
			transform: rotate(-8deg);
		}
	}
	@keyframes flap-top {
		50% {
			transform: rotate(-30deg) scaleY(0.5);
		}
	}
	@keyframes flap-bottom {
		50% {
			transform: rotate(30deg) scaleY(0.5);
		}
	}
	@keyframes impact-shake {
		20% {
			transform: translate(-8px, 3px);
		}
		40% {
			transform: translate(7px, -3px);
		}
		60% {
			transform: translate(-5px, 2px);
		}
		80% {
			transform: translate(3px, -1px);
		}
	}
	@media (max-width: 620px) {
		.flight-hud {
			top: 8px;
			right: 8px;
			left: 8px;
			font-size: 0.52rem;
			line-height: 1.2;
			white-space: normal;
			transform: none;
		}
		.flight-hud span {
			min-width: 0;
		}
		.event-callout {
			top: 27%;
			width: max-content;
		}
		.result-panel {
			grid-template-columns: 1fr;
			max-height: 88%;
			overflow: auto;
			padding: 16px;
		}
		.result-panel > strong,
		.result-panel > small,
		.result-panel > button {
			grid-column: auto;
		}
		.start-hint {
			max-width: calc(100% - 24px);
			font-size: 0.52rem;
			text-align: center;
			white-space: normal;
		}
		footer {
			flex-direction: column;
			gap: 2px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.wing,
		.world.has-impact {
			animation: none;
		}
	}
	.bet-stepper {
		display: grid;
		grid-template-columns: 54px 1fr 54px;
		align-items: center;
		gap: 10px;
	}
	.bet-stepper button {
		height: 48px;
		border-radius: 50%;
		font-size: 1.35rem;
	}
	.bet-input-shell {
		display: flex;
		min-width: 0;
		width: 100%;
		align-items: center;
		justify-content: center;
		gap: 3px;
		padding: 0 12px;
		border: 1px solid rgba(199, 153, 63, 0.45);
		background: rgba(0, 0, 0, 0.22);
		color: #f2d594;
	}
	.bet-input-shell > span {
		font:
			700 1rem/1 system-ui,
			sans-serif;
	}
	.bet-input {
		min-width: 0;
		width: 7ch;
		padding: 12px 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: #f2d594;
		font:
			700 1rem/1 system-ui,
			sans-serif;
		text-align: left;
	}
	.bet-input-shell:focus-within {
		border-color: #9dc5ad;
		outline: 2px solid rgba(73, 229, 156, 0.25);
		outline-offset: 1px;
	}
	.bet-input-shell.invalid {
		border-color: #c65c3a;
		box-shadow: inset 0 0 12px rgba(198, 92, 58, 0.16);
	}
	.bet-input-shell.disabled {
		cursor: not-allowed;
		opacity: 0.48;
	}
	.event-callout {
		position: absolute;
		z-index: 10;
		left: 50%;
		top: 19%;
		max-width: 82%;
		padding: 8px 14px;
		border: 0;
		border-radius: 0;
		background: rgba(8, 21, 14, 0.82);
		color: #f2c86d;
		font:
			800 0.68rem/1.2 'Google Sans',
			sans-serif;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-align: center;
		text-shadow: none;
		transform: translateX(-50%);
		pointer-events: none;
	}
	.world:has(.event-callout) .event-callout {
		animation: event-callout-in calc(0.24s / var(--playback-speed, 1)) ease-out;
	}
	@keyframes event-callout-in {
		from {
			opacity: 0;
			transform: translate(-50%, -8px) scale(0.94);
		}
		to {
			opacity: 1;
			transform: translate(-50%, 0) scale(1);
		}
	}

	.stage-readout strong {
		display: block;
		margin: 3px 0 0;
		color: #e2e9df;
	}
	.multiplier-readout strong {
		color: #7dffc2;
		font-size: 0.78rem;
	}
	.stage-transition {
		position: absolute;
		z-index: 12;
		top: 31%;
		left: 50%;
		display: grid;
		gap: 6px;
		width: min(430px, 78%);
		padding: 14px 18px;
		border-block: 1px solid rgba(226, 176, 75, 0.68);
		background: linear-gradient(90deg, transparent, rgba(4, 24, 17, 0.92) 18% 82%, transparent);
		text-align: center;
		pointer-events: none;
		transform: translateX(-50%);
		animation: stage-transition-in calc(1.05s / var(--playback-speed, 1)) ease both;
	}
	.stage-transition span {
		color: #67e8ac;
		font:
			800 0.58rem/1 system-ui,
			sans-serif;
		letter-spacing: 0.2em;
	}
	.stage-transition strong {
		color: #f4cd78;
		font-size: clamp(1rem, 2.5vw, 1.55rem);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		text-shadow: 0 2px 15px #000;
	}
	.flight-meter {
		position: absolute;
		z-index: 9;
		right: clamp(12px, 2vw, 22px);
		bottom: clamp(48px, 10%, 68px);
		left: clamp(12px, 2vw, 22px);
		display: grid;
		grid-template-columns: auto minmax(80px, 1fr) auto;
		align-items: center;
		gap: 9px;
		padding: 7px 10px 18px;
		border: 1px solid rgba(192, 143, 50, 0.52);
		background: rgba(3, 18, 13, 0.82);
		color: #b8b69e;
		font:
			800 0.5rem/1 system-ui,
			sans-serif;
		letter-spacing: 0.12em;
		pointer-events: none;
	}
	.flight-meter-track {
		position: relative;
		height: 4px;
		border-radius: 999px;
		background: rgba(101, 111, 95, 0.45);
		box-shadow: inset 0 0 5px #000;
	}
	.flight-meter-track i {
		position: absolute;
		inset-block: 0;
		left: 0;
		border-radius: inherit;
		background: linear-gradient(90deg, #1cae70, #75f6b8, #e9bd58);
		box-shadow: 0 0 8px rgba(70, 232, 155, 0.5);
		transition: width 0.32s ease;
	}
	.flight-meter-track b {
		position: absolute;
		top: 50%;
		width: 11px;
		height: 11px;
		border: 2px solid #f0c460;
		border-radius: 50%;
		background: #1b8a5a;
		box-shadow: 0 0 10px #46df9a;
		transform: translate(-50%, -50%);
		transition: left 0.32s ease;
	}
	.flight-meter small {
		position: absolute;
		bottom: 4px;
		left: 50%;
		color: #79d9a8;
		font:
			700 0.48rem/1 system-ui,
			sans-serif;
		letter-spacing: 0.1em;
		transform: translateX(-50%);
		white-space: nowrap;
	}
	@keyframes stage-transition-in {
		0% {
			opacity: 0;
			transform: translate(-50%, 10px) scale(0.96);
		}
		18%,
		72% {
			opacity: 1;
			transform: translate(-50%, 0) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -7px) scale(1.02);
		}
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.help-button {
		display: grid;
		place-items: center;
		width: 44px;
		min-height: 44px;
		padding: 9px;
		border: 1px solid #b57e2c;
		border-radius: 50%;
		background: rgba(3, 19, 13, 0.86);
		color: #f3c96e;
	}
	.help-button svg {
		width: 22px;
		height: 22px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.8;
	}
	@media (max-width: 620px) {
		.header-actions {
			gap: 7px;
		}
		.help-button {
			width: 40px;
			min-height: 40px;
			padding: 8px;
		}
		.stage-transition {
			top: 32%;
			padding: 10px 12px;
		}
		.flight-meter {
			right: 8px;
			bottom: 42px;
			left: 8px;
			gap: 6px;
			padding-inline: 7px;
			font-size: 0.44rem;
		}
		.flight-meter small {
			max-width: 72%;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.stage-transition {
			animation: none;
		}
		.flight-meter-track i,
		.flight-meter-track b {
			transition: none;
		}
	}
	.multiplier-readout.pulse {
		animation: multiplier-hud-pulse calc(0.46s / var(--playback-speed, 1)) ease-out;
	}
	.multiplier-readout.pulse strong {
		text-shadow: 0 0 14px #70ffba;
	}
	.combo-feedback {
		position: absolute;
		z-index: 14;
		top: 34%;
		left: 27%;
		display: grid;
		gap: 4px;
		min-width: 128px;
		padding: 8px 12px;
		border-left: 2px solid #5bf1aa;
		background: linear-gradient(90deg, rgba(4, 34, 23, 0.92), transparent);
		color: #7af2b5;
		text-shadow: 0 2px 9px #000;
		pointer-events: none;
		animation: combo-pop calc(0.68s / var(--playback-speed, 1)) ease-out both;
	}
	.combo-feedback strong {
		color: #e2e9df;
		font:
			900 0.65rem/1 system-ui,
			sans-serif;
		letter-spacing: 0.12em;
	}
	.combo-feedback span {
		font:
			900 0.58rem/1 system-ui,
			sans-serif;
		letter-spacing: 0.16em;
	}
	.creature-flight.is-hit {
		animation: creature-hit calc(0.52s / var(--playback-speed, 1)) ease-out both;
		filter: sepia(0.8) saturate(2);
	}
	@keyframes multiplier-hud-pulse {
		35% {
			transform: scale(1.16);
			color: #baffd7;
		}
	}
	@keyframes combo-pop {
		0% {
			opacity: 0;
			transform: translate(-12px, 8px) scale(0.88);
		}
		24%,
		72% {
			opacity: 1;
			transform: translate(0, 0) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(12px, -8px) scale(1.03);
		}
	}
	@keyframes creature-hit {
		20% {
			transform: translate(-50%, -50%) rotate(-18deg) scale(1.12);
		}
		55% {
			opacity: 0.82;
			transform: translate(-50%, -50%) rotate(24deg) scale(0.9);
		}
		100% {
			opacity: 0.5;
		}
	}
	@media (max-width: 620px) {
		.combo-feedback {
			top: 37%;
			left: 18%;
			min-width: 110px;
			padding: 6px 9px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.multiplier-readout.pulse,
		.combo-feedback,
		.creature-flight.is-hit {
			animation: none;
		}
	}

	.creature-frame {
		position: absolute;
		top: 50%;
		left: 50%;
		display: block;
		width: 300%;
		height: 300%;
		max-width: none;
		object-fit: contain;
		object-position: center;
		transform: translate(-50%, -50%);
		user-select: none;
		pointer-events: none;
	}

	/* Compact setup deck: the flight scene remains primary while setup stays viewport-bound. */
	.prototype-shell {
		padding: clamp(10px, 1.5vw, 22px);
	}
	.prototype-header {
		align-items: center;
		margin-bottom: clamp(8px, 1.2vh, 14px);
	}

	.prototype-header h1 {
		margin-top: 2px;
		font-size: clamp(1.45rem, 2.45vw, 2.45rem);
	}

	.help-button {
		width: 38px;
		min-height: 38px;
		padding: 8px;
	}
	.help-button svg {
		width: 19px;
		height: 19px;
	}

	.game-layout {
		--game-panel-height: clamp(430px, calc(100dvh - 112px), 760px);
		grid-template-columns: minmax(0, 4fr) minmax(270px, 1fr);
		gap: clamp(10px, 1.35vw, 20px);
		align-items: stretch;
	}
	.world {
		height: var(--game-panel-height);
		min-height: 0;
	}

	.flight-hud {
		top: 10px;
		right: 10px;
		left: 10px;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 0;
		padding: 6px 9px;
		border-color: rgba(149, 179, 180, 0.48);
		background: linear-gradient(90deg, rgba(3, 17, 12, 0.88), rgba(5, 28, 19, 0.78));
		font-size: 0.56rem;
		line-height: 1.15;
		transform: none;
	}
	.hud-selection {
		display: flex;
		min-width: 0;
		gap: clamp(8px, 1.25vw, 18px);
		overflow: hidden;
	}
	.hud-selection span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.flight-hud .stage-readout,
	.flight-hud .multiplier-readout {
		display: grid;
		gap: 2px;
		min-width: 104px;
		padding-left: 10px;
		margin-left: 10px;
		border-left: 1px solid rgba(149, 179, 180, 0.3);
	}
	.flight-hud .stage-readout strong,
	.flight-hud .multiplier-readout strong {
		display: block;
		margin: 0;
	}
	.flight-hud .multiplier-readout {
		min-width: 72px;
	}

	.bet-stepper {
		grid-template-columns: 42px minmax(0, 1fr) 42px;
		gap: 7px;
	}
	.bet-stepper button {
		width: 42px;
		height: 42px;
		min-height: 42px;
		font-size: 1.1rem;
	}
	.bet-input {
		padding: 10px 6px;
		font-size: 0.93rem;
	}

	.fly-button {
		min-height: 56px;
		margin: 0;
		padding: 8px;
		font-size: clamp(0.88rem, 1.3vw, 1.08rem);
		letter-spacing: 0.11em;
	}

	@media (max-width: 900px) {
		.game-layout {
			--game-panel-height: clamp(390px, 58dvh, 560px);
			grid-template-columns: 1fr;
		}

		.world {
			height: var(--game-panel-height);
			min-height: 0;
		}
	}

	@media (max-width: 620px) {
		.prototype-shell {
			padding: 9px;
		}
		.prototype-header {
			flex-wrap: nowrap;
			gap: 8px;
		}

		.prototype-header h1 {
			margin: 0;
			font-size: clamp(1.15rem, 5.8vw, 1.65rem);
		}
		.header-actions {
			flex: 0 0 auto;
		}

		.help-button {
			width: 34px;
			min-height: 34px;
			padding: 7px;
		}
		.game-layout {
			--game-panel-height: clamp(340px, 55dvh, 470px);
			gap: 10px;
		}

		.flight-hud {
			top: 6px;
			right: 6px;
			left: 6px;
			grid-template-columns: minmax(0, 1fr) auto auto;
			gap: 0;
			padding: 5px 6px;
			font-size: 0.45rem;
		}
		.hud-selection {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 3px 7px;
		}
		.flight-hud .stage-readout,
		.flight-hud .multiplier-readout {
			min-width: 68px;
			padding-left: 6px;
			margin-left: 6px;
		}
		.flight-hud .stage-readout {
			max-width: 84px;
		}
		.flight-hud .stage-readout strong {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.flight-hud .multiplier-readout {
			min-width: 54px;
		}

		footer {
			display: none;
		}
	}

	@media (max-width: 390px) {
		.fly-button {
			min-height: 50px;
		}
	}

	/* Main game layout and compact flight dock. */
	.prototype-shell {
		display: flex;
		height: 100dvh;
		min-height: 0;
		flex-direction: column;
		overflow-x: hidden;
		overflow-y: auto;
		padding: clamp(8px, 1.2vw, 18px);
	}
	.prototype-header {
		align-items: center;
		flex: 0 0 auto;
		margin-bottom: 8px;
	}
	.prototype-header h1 {
		margin: 0;
		font-size: clamp(1.25rem, 2.25vw, 2rem);
	}
	.header-actions {
		margin-left: auto;
	}
	.header-button {
		min-height: 36px;
		padding: 7px 13px;
		border-color: #627e81;
		background: rgba(4, 20, 14, 0.82);
		color: #d8e5e0;
		font-size: 0.58rem;
		letter-spacing: 0.13em;
	}
	.help-button {
		width: 36px;
		min-height: 36px;
		padding: 7px;
	}

	.game-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: minmax(280px, 1fr) auto;
		/* Preserve the playable world height; short windows scroll the shell. */
		flex: 1 0 auto;
		min-width: 0;
		min-height: 0;
		gap: 9px;
	}
	.world {
		width: 100%;
		height: auto;
		min-height: 0;
	}

	.flight-hud {
		grid-template-columns: minmax(0, 1fr) auto auto;
	}
	.hud-selection {
		align-items: center;
	}
	.round-status {
		flex: 0 0 auto;
		padding: 4px 6px;
		border: 1px solid rgba(73, 225, 157, 0.42);
		color: #70edb2;
	}
	.round-status.danger {
		border-color: rgba(230, 96, 50, 0.56);
		color: #ff9a6a;
	}

	.control-dock {
		position: relative;
		display: grid;
		grid-template-columns: minmax(120px, 200px) minmax(140px, 220px) minmax(250px, 1fr) minmax(
				170px,
				240px
			);
		align-items: start;
		gap: clamp(8px, 1.2vw, 16px);
		flex: 0 0 auto;
		padding: 10px clamp(10px, 1.5vw, 18px);
		border-radius: 3px;
		background: #141b21;
	}
	.dock-label {
		display: block;
		margin-bottom: 6px;
		color: #7b8592;
		font:
			800 0.5rem/1 system-ui,
			sans-serif;
		letter-spacing: 0.16em;
	}
	.creature-button {
		display: flex;
		width: 100%;
		min-height: 48px;
		border-radius: 3px;
		background: #0b1015;
		color: #d1d5db;
		align-items: center;
		justify-content: space-between;
		gap: 9px;
		padding: 8px 11px;
		text-align: left;
	}
	.creature-button span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.creature-chevron {
		width: 12px;
		height: 12px;
		flex-shrink: 0;
		fill: none;
		stroke: #94a6b1;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.risk-selector {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 4px;
		box-sizing: border-box;
		height: 48px;
		padding: 4px;
		border-radius: 3px;
		background: #0b1015;
	}
	.risk-selector button {
		min-height: 40px;
		border-radius: 3px;
		background: transparent;
		color: #89929e;
		padding: 6px 4px;
		font-size: 0.59rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.risk-selector button.active {
		background: #557762;
		color: #fff;
	}
	.risk-control p {
		margin: 6px 1px 0;
		overflow: hidden;
		color: #849087;
		font:
			0.54rem/1.2 system-ui,
			sans-serif;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.risk-control p strong {
		color: #d9bd7b;
		text-transform: uppercase;
	}
	.bet-control .bet-stepper {
		grid-template-columns: 42px minmax(90px, 1fr) 42px;
		gap: 0;
		height: 48px;
		overflow: hidden;
		border-radius: 3px;
		background: #0b1015;
	}
	.bet-control .bet-stepper button {
		display: grid;
		place-items: center;
		padding: 0;
		line-height: 1;
		letter-spacing: 0;
		width: 42px;
		height: 48px;
		min-height: 48px;
		border-radius: 0;
		background: transparent;
		color: #9ca3af;
	}
	.bet-control .bet-stepper button:hover:not(:disabled) {
		background: #16212b;
	}
	.bet-stepper button svg {
		width: 20px;
		height: 20px;
		display: block;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
	}
	.bet-control .bet-input-shell {
		height: 48px;
		box-sizing: border-box;
		padding: 0 3px;
		background: transparent;
		color: #e5e7eb;
	}
	.bet-control .bet-input {
		padding: 7px 0;
		font-size: 1.05rem;
		width: 5ch;
		max-width: 100%;
		color: #e5e7eb;
	}
	.control-dock .fly-button {
		width: 100%;
		min-height: 48px;
		margin: 14px 0 0;
		border-radius: 3px;
		background: linear-gradient(#6b9a7a, #4e795c);
		color: #fff;
		font-size: 1rem;
	}

	@media (max-height: 720px) and (min-width: 701px) {
		.prototype-shell {
			padding-block: 7px;
		}
		.prototype-header {
			margin-bottom: 6px;
		}
		.prototype-header h1 {
			font-size: 1.2rem;
		}
		.control-dock {
			padding-block: 7px;
		}
		footer {
			display: none;
		}
	}

	@media (max-width: 1000px) {
		.control-dock {
			grid-template-columns: minmax(140px, 0.8fr) minmax(205px, 1fr) minmax(270px, 1.45fr);
		}
		.control-dock .fly-button {
			grid-column: 1 / -1;
			min-height: 50px;
			margin-top: 0;
		}
	}

	@media (max-width: 700px) {
		.prototype-shell {
			padding: 7px;
		}
		.prototype-header {
			margin-bottom: 6px;
		}
		.prototype-header h1 {
			font-size: 1.15rem;
		}
		.header-button {
			min-height: 32px;
			padding: 6px 9px;
			font-size: 0.5rem;
		}
		.help-button {
			width: 32px;
			min-height: 32px;
			padding: 6px;
		}
		.game-layout {
			grid-template-rows: minmax(262px, 1fr) auto;
			gap: 7px;
		}
		.control-dock {
			grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
			gap: 7px;
			padding: 8px;
		}
		.creature-control {
			grid-column: 1;
		}
		.bet-control {
			grid-column: 2;
		}
		.risk-control {
			grid-column: 1 / -1;
			grid-row: 2;
		}
		.control-dock .fly-button {
			grid-column: 1 / -1;
			grid-row: 3;
			min-height: 48px;
		}
		.risk-control p {
			white-space: normal;
		}
		.flight-hud {
			top: 5px;
			right: 5px;
			left: 5px;
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.hud-selection {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 3px 6px;
		}
		.flight-hud .stage-readout {
			display: none;
		}
		.flight-hud .multiplier-readout {
			min-width: 58px;
		}
		footer {
			display: none;
		}
	}

	@media (max-width: 390px) {
		.dock-label {
			margin-bottom: 4px;
		}
		.creature-button {
			min-height: 40px;
			padding-inline: 8px;
			font-size: 0.68rem;
		}
		.bet-control .bet-stepper {
			grid-template-columns: 36px minmax(0, 1fr) 36px;
			gap: 0;
			height: 40px;
		}
		.bet-control .bet-stepper button {
			width: 36px;
			height: 40px;
			min-height: 40px;
		}
		.bet-control .bet-input-shell {
			height: 40px;
		}
		.bet-control .bet-input {
			font-size: 0.9rem;
		}
		.risk-selector button {
			min-height: 35px;
			font-size: 0.53rem;
		}
		.control-dock .fly-button {
			min-height: 44px;
		}
	}
	.playback-control,
	.language-control {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.65rem;
		color: #d8e5e0;
	}
	.playback-control select,
	.language-control select {
		min-height: 36px;
		padding: 4px 6px;
		border: 1px solid #627e81;
		border-radius: 6px;
		background: #102725;
		color: #d8e5e0;
		font: inherit;
	}
	.playback-control select:focus-visible,
	.language-control select:focus-visible {
		outline: 2px solid #64efbd;
		outline-offset: 2px;
	}
	.playback-control select:disabled {
		opacity: 0.55;
	}
	.language-control select {
		max-width: 112px;
	}
	@media (max-width: 480px) {
		.prototype-header {
			flex-wrap: wrap;
			gap: 6px;
		}
		.prototype-header h1 {
			flex-basis: 100%;
		}
		.header-actions {
			width: 100%;
		}
		.playback-control {
			margin-right: auto;
		}
	}
	.flight-extras {
		display: flex;
		flex: 0 0 auto;
		gap: 8px;
		padding-top: 8px;
	}
	.flight-extras button {
		padding: 10px 16px;
		font-size: 0.65rem;
		letter-spacing: 0.07em;
	}
	.flight-extras span {
		margin-left: 8px;
		font-size: 0.65rem;
		color: #afc9c3;
	}
	.flight-extras .bonus-button {
		border-color: #d8ba75;
		color: #ffe2a2;
		background: #2b342b;
	}
	.replay-label {
		position: absolute;
		top: 84px;
		left: 12px;
		z-index: 20;
		padding: 7px 10px;
		border-radius: 6px;
		background: #0d292deb;
		color: #b9eadb;
		font-size: 0.65rem;
	}
	@media (max-width: 480px) {
		.flight-extras button {
			flex: 1;
			padding-inline: 8px;
		}
	}
	.prototype-header {
		flex-wrap: wrap;
		gap: 12px 20px;
	}
	.prototype-header .control-tools {
		flex: 1 1 550px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		width: auto;
		margin: 0 0 0 auto;
		padding: 0;
	}
	.control-tools button {
		min-height: 40px;
		flex: 0 0 auto;
	}
	.control-tools .playback-control {
		order: 1;
		margin: 0;
	}
	.control-tools .help-button {
		order: 2;
		padding: 8px;
		width: 40px;
	}
	.prototype-header h1 {
		letter-spacing: 0.01em;
		text-shadow: none;
	}
	.prototype-header .control-tools button,
	.prototype-header .control-tools select {
		border: 0;
		border-radius: 3px;
		background: #0b1015;
		box-shadow: none;
		text-shadow: none;
		color: #e6eee9;
	}
	.prototype-header .control-tools button {
		padding: 10px 14px;
		font-size: 0.65rem;
		letter-spacing: 0.06em;
	}
	.prototype-header .control-tools button:hover:not(:disabled),
	.prototype-header .control-tools select:hover:not(:disabled) {
		background-color: #1c2b31;
	}
	.prototype-header .control-tools button[aria-expanded='true'] {
		background: #557e69;
	}
	.prototype-header .control-tools .bonus-button {
		color: #f3cc7d;
	}
	.prototype-header .control-tools .help-button {
		padding: 10px;
		color: #f3cc7d;
	}
	.prototype-header .control-tools select {
		min-height: 40px;
		padding: 8px 30px 8px 12px;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='m4 6 4 4 4-4' stroke='%2394a6b1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 11px center;
		background-size: 12px 12px;
	}
	.prototype-header .control-tools label {
		gap: 7px;
		color: #94a6b1;
	}
	.prototype-header .control-tools label span {
		margin-left: 0;
		color: inherit;
	}
	.prototype-header .control-tools button:focus-visible {
		outline: 2px solid #8cbca1;
		outline-offset: 2px;
	}
	@media (max-width: 480px) {
		.prototype-header .control-tools {
			gap: 8px;
			justify-content: flex-start;
		}
		.control-tools .header-button,
		.control-tools .bonus-button {
			flex: 1 1 auto;
		}
	}
</style>
