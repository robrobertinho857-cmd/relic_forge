<script lang="ts">
	import { onMount } from 'svelte';
	// Standalone local Dragon Flight prototype.
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
	import { formatLocalAmount } from './utils/format';
	import Atmosphere from './components/Atmosphere.svelte';
	import Landscape from './components/Landscape.svelte';
	import DangerEncounter from './components/DangerEncounter.svelte';
	import CreaturePicker from './components/CreaturePicker.svelte';
	import CustomizeDrawer from './components/CustomizeDrawer.svelte';
	import EndingEffect from './components/EndingEffect.svelte';
	import TerrainObstacle from './components/TerrainObstacle.svelte';
	import ResultScenery from './components/ResultScenery.svelte';
	import EventWarning from './components/EventWarning.svelte';
	import HelpDialog from './components/HelpDialog.svelte';
	import AirCurrentEffect from './components/AirCurrentEffect.svelte';
	import CollectiblePickup from './components/CollectiblePickup.svelte';
	import WinCelebration from './components/WinCelebration.svelte';
	import type {
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
	let selectedRisk = $state<FlightRisk>('balanced');
	let selectedCreatureId = $state<CreatureId>('dragon');
	let selectedLaunchStyle = $state<LaunchStyle>('glide');
	let selectedWeather = $state<WeatherCondition>('clear');
	let selectedTimeOfDay = $state<TimeOfDay>('day');
	let playbackSpeed = $state(1.5);
	let creaturePickerOpen = $state(false);
	let customizeOpen = $state(false);
	let helpOpen = $state(false);
	let currentStageId = $state<FlightStageId>('MOUNTAIN_VALLEY');
	let flightProgress = $state(0);
	let stageAnnouncement = $state<StageAnnouncement>();
	let roundCreatureId = $state<CreatureId>();
	let status = $state<PrototypeStatus>('ready');
	let currentRound = $state<FlightRound>();
	let currentMultiplier = $state(1);
	let finalMultiplier = $state(0);
	let finalWin = $state(0);
	let gatesPassed = $state(0);
	let distanceTravelled = $state(0);
	let activeGate = $state<ActiveGate>();
	let activePickup = $state<ActivePickupPresentation>();
	let activeCurrent = $state<ActiveCurrentPresentation>();
	let activeEncounter = $state<ActiveEncounterPresentation>();
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

	const controlsLocked = $derived(status !== 'ready');
	const landed = $derived(Boolean(activeEnding) && landingProgress === 1);
	const betInputIsValid = $derived(isBetInputValid(betInput));
	const activeCreature = $derived(getCreature(roundCreatureId ?? selectedCreatureId));
	const selectedCreature = $derived(getCreature(selectedCreatureId));
	const selectedPathNote = $derived(PATHS.find((path) => path.risk === selectedRisk)?.note ?? '');
	const currentStage = $derived(getFlightStage(currentStageId));
	const resultWinTier = $derived(getWinTier(currentRound?.finalMultiplier ?? 0));
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
		const numericValue = Number(betInput);
		selectedBet = Number.isFinite(numericValue) ? clampBet(numericValue) : selectedBet;
		betInput = selectedBet.toFixed(2);
	}

	function moveBet(direction: -1 | 1) {
		selectedBet = clampBet(selectedBet + direction * PROTOTYPE_BET_STEP);
		betInput = selectedBet.toFixed(2);
	}

	function delay(milliseconds: number) {
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
			timer = setTimeout(finish, milliseconds / playbackSpeed);
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
				const linearProgress = Math.min(1, ((now - startedAt) * playbackSpeed) / duration);
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
		}, 720 / playbackSpeed);
		emitParticles(Math.min(24, 7 + count * 3));
	}

	function cancelPresentation() {
		presentationToken += 1;
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
		}, 1050 / playbackSpeed);
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
		return {
			...event,
			x: bounds.width + 45,
			width: clamp(bounds.width * 0.19, 95, 210),
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
		await animateCurrentMultiplier(event.multiplier, 340, token);
		if (token !== presentationToken) return;
		emitParticles(event.pickupType === 'skyCrystal' ? 28 : 18);
		activePickup = undefined;
		await delay(150);
	}

	async function presentCurrent(event: Extract<FlightEvent, { type: 'current' }>, token: number) {
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
		const encounterLabel = ENCOUNTER_LABELS[event.encounterType];
		const warningShown = await showWarning(encounterLabel, 'danger', token, 430);
		if (!warningShown) return;
		eventLabel = encounterLabel;
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
			emitParticles(30, true);
		} else {
			eventCallout = 'PREDATOR STRIKE';
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
		emitParticles(endingIntensity);
		await delay(300 + endingIntensity * 10);
	}

	function landingPosition() {
		// Same normalized anchor as the image's object-position, including narrow cover crops.
		const footOffset = clamp(window.innerWidth * 0.046, 38, 58) * activeCreature.sizeScale * 0.32;
		return { x: bounds.width * LANDING_ANCHOR.x, y: bounds.height * LANDING_ANCHOR.y - footOffset };
	}

	async function presentFinalResult(round: FlightRound, token: number) {
		status = 'complete';
		const tier = getWinTier(round.finalMultiplier);
		eventLabel = tier.label;
		eventCallout = round.ending === 'crash' ? 'CRASH' : tier.label;

		if (round.ending === 'crash') {
			finalMultiplier = round.finalMultiplier;
			finalWin = round.finalWin;
			currentMultiplier = round.finalMultiplier;
			return;
		}

		finalMultiplier = 0;
		finalWin = 0;
		await animatePresentationValues(
			tier.duration,
			(progress) => {
				finalMultiplier = round.finalMultiplier * progress;
				finalWin = round.finalWin * progress;
			},
			token,
		);
		if (token !== presentationToken) return;
		finalMultiplier = round.finalMultiplier;
		finalWin = round.finalWin;
		currentMultiplier = round.finalMultiplier;
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
						comboCount += 1;
						showCombo(comboCount);
					} else {
						comboCount = 0;
						eventCallout = 'CRASH';
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

	function startFlight() {
		if (controlsLocked || !betInputIsValid) return;
		roundSequence += 1;
		const generatedRound = generateMockRound(selectedBet, selectedRisk, roundSequence, {
			creature: selectedCreatureId,
			launchStyle: selectedLaunchStyle,
		});
		// Presentation metadata is attached only after the authoritative local outcome is complete.
		const roundWithWeather: FlightRound = { ...generatedRound, weather: selectedWeather };
		const round: FlightRound = { ...roundWithWeather, timeOfDay: selectedTimeOfDay };
		if (round.ending !== 'crash') {
			const finishImage = new Image();
			finishImage.src = getFinishBackground(round.ending, selectedWeather, selectedTimeOfDay);
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

		const update = (now: number) => {
			const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
			lastTime = now;
			const moving = status === 'flying' || status === 'ending' || status === 'collided';
			const flightDelta = deltaSeconds * playbackSpeed * (activeGate ? GATE_APPROACH_RATE : 1);
			const environmentSpeed = WORLD_SPEED * currentStage.parallaxSpeed;
			const presentationSpeed = status === 'collided' ? environmentSpeed * 0.22 : environmentSpeed;
			parallaxOffset =
				(parallaxOffset + (moving ? flightDelta * presentationSpeed : deltaSeconds * 30)) % 1800;
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
			disposed = true;
			loadedCreatureFrames = {};
			cancelPresentation();
			observer.disconnect();
			cancelAnimationFrame(animationFrame);
		};
	});
</script>

<svelte:head><title>Dragon Flight - Local Round Prototype</title></svelte:head>

<main class="prototype-shell" style={`--playback-speed:${playbackSpeed};`}>
	<header class="prototype-header">
		<h1>Dragon Flight</h1>
		<div class="header-actions">
			<label class="playback-control" title="Animation speed only. Odds and payouts stay the same.">
				<span>Speed</span>
				<select
					aria-label="Flight playback speed"
					bind:value={playbackSpeed}
					disabled={controlsLocked}
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
				aria-expanded={customizeOpen}
				disabled={controlsLocked}
				onclick={() => (customizeOpen = true)}>CUSTOMIZE</button
			>
			<button
				class="help-button"
				type="button"
				aria-label="Open Dragon Flight game guide"
				onclick={() => (helpOpen = true)}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true"
					><circle cx="12" cy="12" r="9" /><path
						d="M9.7 9.2a2.45 2.45 0 1 1 3.7 2.1c-.9.5-1.4 1-1.4 2"
					/><path d="M12 16.8h.01" /></svg
				>
			</button>
		</div>
	</header>

	<section class="game-layout">
		<div
			bind:this={worldElement}
			class:has-impact={impactActive}
			class:has-ending={Boolean(activeEnding)}
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
						class:danger={status === 'collided' || currentRound?.ending === 'crash'}
						class="round-status"
						>{status === 'ready'
							? 'READY'
							: status === 'complete' && currentRound
								? ENDING_LABELS[currentRound.ending]
								: 'IN FLIGHT'}</span
					>
					<span>BET <strong>{formatLocalAmount(currentRound?.bet ?? selectedBet)}</strong></span>
					<span>RISK <strong>{(currentRound?.risk ?? selectedRisk).toUpperCase()}</strong></span>
					<span>CREATURE <strong>{activeCreature.name}</strong></span>
					<span>RUN <strong>{gatesPassed} · {distanceMetres}m</strong></span>
				</div>
				<span class="stage-readout"
					>STAGE {currentStage.order}<strong>{currentStage.name}</strong></span
				>
				<span class:pulse={multiplierPulse} class="multiplier-readout"
					>CURRENT<strong>x{currentMultiplier.toFixed(2)}</strong></span
				>
			</div>

			{#if stageAnnouncement}
				{#key stageAnnouncement.id}
					<div class="stage-transition" role="status" aria-live="polite">
						<span>STAGE {stageAnnouncement.order}</span>
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
					<span>START</span>
					<div class="flight-meter-track">
						<i style={`width:${flightProgress}%;`}></i>
						<b style={`left:${flightProgress}%;`}></b>
					</div>
					<span>DESTINATION</span>
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
					<b class="gate-number">GATE {activeGate.gate} · {HAZARD_LABELS[activeGate.hazard]}</b>
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
					CHOOSE YOUR CREATURE, BET AND RISK. THEN FLY.
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
					{#if currentRound.ending !== 'crash'}
						<WinCelebration
							tier={resultWinTier}
							multiplier={`x${finalMultiplier.toFixed(2)}`}
							win={formatLocalAmount(finalWin)}
						/>
					{/if}
					<div><span>BET</span><b>{formatLocalAmount(currentRound.bet)}</b></div>
					<div><span>MULTIPLIER</span><b>x{finalMultiplier.toFixed(2)}</b></div>
					<div><span>WIN</span><b>{formatLocalAmount(finalWin)}</b></div>
					<div class="result-creature"><span>CREATURE</span><b>{activeCreature.name}</b></div>
					<div><span>LAUNCH</span><b>{currentRound.launchStyle.toUpperCase()}</b></div>
					<div><span>WEATHER</span><b>{activeWeatherConfig.name}</b></div>
					<div><span>TIME</span><b>{activeTimeConfig.name}</b></div>
					<small>DEMO RESULT · NO REAL MONEY</small>
					<button onclick={resetPresentation}>TRY AGAIN</button>
				</div>
			{/if}
		</div>

		<section class="control-dock" aria-label="Flight controls">
			<div class="creature-control">
				<span class="dock-label">CREATURE</span>
				<button
					class="creature-button"
					type="button"
					disabled={controlsLocked}
					onclick={() => (creaturePickerOpen = true)}
				>
					<span>{selectedCreature.name}</span><b>▾</b>
				</button>
			</div>

			<div class="bet-control">
				<span class="dock-label">BET</span>
				<div class="bet-stepper">
					<button
						aria-label="Decrease bet"
						disabled={controlsLocked || selectedBet <= MIN_PROTOTYPE_BET}
						onclick={() => moveBet(-1)}>−</button
					>
					<input
						aria-label="Prototype bet amount"
						aria-invalid={!betInputIsValid}
						class="bet-input"
						disabled={controlsLocked}
						inputmode="decimal"
						min={MIN_PROTOTYPE_BET}
						max={MAX_PROTOTYPE_BET}
						step="0.01"
						type="number"
						value={betInput}
						oninput={(event) => updateBetInput(event.currentTarget as HTMLInputElement)}
						onblur={normalizeBetInput}
					/>
					<button
						aria-label="Increase bet"
						disabled={controlsLocked || selectedBet >= MAX_PROTOTYPE_BET}
						onclick={() => moveBet(1)}>+</button
					>
				</div>
			</div>

			<div class="risk-control">
				<span class="dock-label">RISK</span>
				<div class="risk-selector">
					{#each PATHS as path (path.risk)}
						<button
							type="button"
							disabled={controlsLocked}
							aria-pressed={selectedRisk === path.risk}
							class:active={selectedRisk === path.risk}
							onclick={() => (selectedRisk = path.risk)}>{path.risk}</button
						>
					{/each}
				</div>
				<p><strong>{selectedRisk}</strong> · {selectedPathNote}</p>
			</div>

			<button class="fly-button" disabled={controlsLocked || !betInputIsValid} onclick={startFlight}
				>{controlsLocked ? 'FLIGHT ACTIVE' : `FLY ${formatLocalAmount(selectedBet)}`}</button
			>
		</section>
	</section>
	<footer>
		<span>Explore the peaks. Find your next landing.</span><span
			>Local demo · No real-money bets.</span
		>
	</footer>
</main>

<HelpDialog open={helpOpen} onClose={() => (helpOpen = false)} />
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
	.gate-number {
		position: absolute;
		z-index: 2;
		top: 50%;
		left: 50%;
		padding: 5px 7px;
		background: rgba(4, 20, 14, 0.8);
		color: #dfbd6c;
		font:
			700 0.55rem/1 system-ui,
			sans-serif;
		white-space: nowrap;
		transform: translate(-50%, -50%);
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
		filter: drop-shadow(0 7px 8px rgba(0, 0, 0, 0.55));
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
		filter: grayscale(0.5) drop-shadow(0 0 12px #e85b2c);
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
	.firebird .dragon-body {
		border-color: #ffd167;
		background: radial-gradient(circle at 65% 28%, #fff09a, #f47e23 40%, #7a160d 76%);
		box-shadow: 0 4px 10px #28373155;
	}
	.firebird .dragon-head {
		border-color: #ffe078;
		background: #e65d20;
	}
	.firebird .wing {
		border-color: #ffc34f;
		background: linear-gradient(145deg, #7e190c, #ffad2e 50%, #e93018);
	}
	.firebird .tail {
		width: 39%;
		border-top: 6px double #ff8d24;
		box-shadow: none;
	}
	.firebird .creature-detail {
		right: 8%;
		top: 4%;
		border-left: 6px solid transparent;
		border-right: 2px solid transparent;
		border-bottom: 18px solid #ffd660;
		transform: rotate(24deg);
	}
	.wyvern .dragon-body {
		border-color: #a7d7d2;
		background: radial-gradient(circle, #74e0c4, #2b766e 44%, #15343b 76%);
	}
	.wyvern .dragon-head {
		border-color: #a8d8cf;
		background: #397d75;
	}
	.wyvern .wing {
		left: 16%;
		width: 49%;
		border-color: #76bdb1;
		background: linear-gradient(145deg, #17343a, #5aa99b 52%, #12262d);
	}
	.wyvern .tail {
		width: 38%;
		border-color: #7abcb2;
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
	.bet-input {
		min-width: 0;
		width: 100%;
		padding: 12px 8px;
		border: 1px solid rgba(199, 153, 63, 0.45);
		background: rgba(0, 0, 0, 0.22);
		color: #f2d594;
		font:
			700 1rem/1 system-ui,
			sans-serif;
		text-align: center;
	}
	.bet-input:focus {
		border-color: #9dc5ad;
		outline: 2px solid rgba(73, 229, 156, 0.25);
		outline-offset: 1px;
	}
	.bet-input[aria-invalid='true'] {
		border-color: #c65c3a;
		box-shadow: inset 0 0 12px rgba(198, 92, 58, 0.16);
	}
	.bet-input:disabled {
		cursor: not-allowed;
		opacity: 0.48;
	}
	.bet-input::-webkit-inner-spin-button,
	.bet-input::-webkit-outer-spin-button {
		margin: 0;
	}
	.bet-input[type='number'] {
		appearance: textfield;
	}
	.event-callout {
		position: absolute;
		z-index: 10;
		left: 50%;
		top: 19%;
		max-width: 82%;
		padding: 8px 14px;
		border: 1px solid rgba(224, 169, 70, 0.72);
		background: rgba(8, 21, 14, 0.82);
		color: #f2c86d;
		font:
			800 0.68rem/1.2 system-ui,
			sans-serif;
		letter-spacing: 0.14em;
		text-align: center;
		text-shadow: 0 1px 8px #000;
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
		filter: sepia(0.8) saturate(2) drop-shadow(0 0 17px #ff6533);
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
		grid-template-columns: minmax(150px, 0.8fr) minmax(220px, 1fr) minmax(330px, 1.55fr) minmax(
				170px,
				0.8fr
			);
		align-items: center;
		gap: clamp(8px, 1.2vw, 16px);
		flex: 0 0 auto;
		padding: 10px clamp(10px, 1.5vw, 18px);
		border: 1px solid #526e73;
		border-radius: 10px;
		background: linear-gradient(145deg, rgba(25, 46, 51, 0.98), rgba(15, 31, 36, 0.99));
		box-shadow:
			inset 0 0 28px rgba(26, 177, 108, 0.08),
			0 12px 28px rgba(0, 0, 0, 0.32);
	}
	.dock-label {
		display: block;
		margin-bottom: 6px;
		color: #809085;
		font:
			800 0.5rem/1 system-ui,
			sans-serif;
		letter-spacing: 0.16em;
	}
	.creature-button {
		display: flex;
		width: 100%;
		min-height: 44px;
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
	.creature-button b {
		color: #55e5a5;
	}
	.risk-selector {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 4px;
	}
	.risk-selector button {
		min-height: 38px;
		padding: 6px 4px;
		font-size: 0.59rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.risk-selector button.active {
		border-color: #9dc5ad;
		background: linear-gradient(#456857, #304d40);
		color: #d0e5d7;
		box-shadow:
			inset 0 0 13px rgba(45, 232, 151, 0.16),
			0 0 10px rgba(35, 207, 132, 0.12);
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
		gap: 6px;
	}
	.bet-control .bet-stepper button {
		width: 42px;
		height: 42px;
		min-height: 42px;
	}
	.bet-control .bet-input {
		height: 42px;
		padding: 7px;
		font-size: 1.05rem;
	}
	.control-dock .fly-button {
		width: 100%;
		min-height: 58px;
		margin: 0;
		border-color: #9dc5ad;
		background: linear-gradient(#537c69, #365948);
		font-size: clamp(0.95rem, 1.5vw, 1.2rem);
		box-shadow:
			inset 0 0 22px rgba(92, 255, 177, 0.18),
			0 0 20px rgba(31, 216, 137, 0.18);
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
			grid-template-columns: 38px minmax(74px, 1fr) 38px;
			gap: 4px;
		}
		.bet-control .bet-stepper button {
			width: 38px;
			height: 40px;
			min-height: 40px;
		}
		.bet-control .bet-input {
			height: 40px;
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
	.playback-control {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.65rem;
		color: #d8e5e0;
	}
	.playback-control select {
		min-height: 36px;
		padding: 4px 6px;
		border: 1px solid #627e81;
		border-radius: 6px;
		background: #102725;
		color: #d8e5e0;
		font: inherit;
	}
	.playback-control select:focus-visible {
		outline: 2px solid #64efbd;
		outline-offset: 2px;
	}
	.playback-control select:disabled {
		opacity: 0.55;
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
</style>
