<script lang="ts">
	import { onMount } from 'svelte';
	// Standalone local Dragon Flight prototype.
	import { clamp, steerPlayer } from './physics';
	import { generateMockRound } from './mockRound';
	import { CREATURES, getCreature } from './creatures';
	import { getFlightStage, stageForEventIndex } from './stages';
	import { BOSS_LABELS, getWinTier, PORTAL_LABELS, RELIC_LABELS } from './presentation';
	import { getWeather, WEATHER_OPTIONS } from './weather';
	import { getTimeOfDay, TIME_OF_DAY_OPTIONS } from './timeOfDay';
	import BossEncounter from './components/BossEncounter.svelte';
	import EndingEffect from './components/EndingEffect.svelte';
	import EventWarning from './components/EventWarning.svelte';
	import HelpDialog from './components/HelpDialog.svelte';
	import PortalEffect from './components/PortalEffect.svelte';
	import RelicPickup from './components/RelicPickup.svelte';
	import WinCelebration from './components/WinCelebration.svelte';
	import WeatherEffect from './components/WeatherEffect.svelte';
	import TimeOfDayEffect from './components/TimeOfDayEffect.svelte';
	import type {
		BossType,
		CreatureId,
		EmberParticle,
		FlightEnding,
		FlightEvent,
		FlightRisk,
		FlightRound,
		FlightStageId,
		LaunchStyle,
		PlayerBody,
		PortalType,
		PrototypeStatus,
		RelicEventType,
		RelicType,
		WorldBounds,
		WeatherCondition,
		TimeOfDay,
	} from './types';
	import type { DevScenarioId } from './devScenarios';

	type DevScenarioModule = typeof import('./devScenarios');
	type ControlTab = 'play' | 'style';

	type StageAnnouncement = {
		id: number;
		name: string;
		order: number;
	};

	type ActiveRelicPresentation = {
		relicType: RelicEventType;
		fromMultiplier: number;
		toMultiplier: number;
		protected: boolean;
	};

	type ActivePortalPresentation = {
		portalType: PortalType;
		phase: 'approach' | 'enter' | 'release';
		multiplier: number;
	};

	type ActiveBossPresentation = {
		bossType: BossType;
		result: 'pass' | 'crash';
		phase: 'enter' | 'engage' | 'resolve';
	};

	type WarningPresentation = {
		id: number;
		text: string;
		tone: 'danger' | 'portal' | 'vault';
	};

	type ComboPresentation = {
		id: number;
		count: number;
	};

	type ActiveGate = Extract<FlightEvent, { type: 'gate' }> & {
		x: number;
		width: number;
		gapCenterY: number;
		gapHeight: number;
	};

	const MIN_PROTOTYPE_BET = 0.1;
	const MAX_PROTOTYPE_BET = 100;
	const PROTOTYPE_BET_STEP = 0.1;
	const INITIAL_BOUNDS: WorldBounds = { width: 900, height: 520, floorY: 478 };
	const WORLD_SPEED = 285;
	const PATHS: Array<{ risk: FlightRisk; arrow: string; note: string }> = [
		{ risk: 'safe', arrow: '\u2196', note: 'More stable / smaller potential' },
		{ risk: 'balanced', arrow: '\u2191', note: 'Balanced risk and reward' },
		{ risk: 'danger', arrow: '\u2197', note: 'More crashes / larger potential' },
	];
	const RELICS: Array<{ type: RelicType; name: string; note: string; className: string }> = [
		{ type: 'guardian', name: 'GUARDIAN RELIC', note: 'Defensive / gold shield theme', className: 'guardian' },
		{ type: 'fortune', name: 'FORTUNE RELIC', note: 'Balanced / emerald treasure theme', className: 'fortune' },
		{ type: 'chaos', name: 'CHAOS RELIC', note: 'Aggressive / fire purple theme', className: 'chaos' },
	];
	const LAUNCH_STYLES: Array<{ style: LaunchStyle; name: string; note: string }> = [
		{ style: 'glide', name: 'GLIDE', note: 'Smoother horizontal launch' },
		{ style: 'boost', name: 'BOOST', note: 'Dramatic upward launch' },
		{ style: 'dive', name: 'DIVE', note: 'Starts high and dives into route' },
	];

	let worldElement = $state<HTMLDivElement>();
	let bounds = $state<WorldBounds>(INITIAL_BOUNDS);
	let player = $state<PlayerBody>(createPlayer(INITIAL_BOUNDS));
	let selectedBet = $state(1);
	let betInput = $state('1.00');
	let selectedRisk = $state<FlightRisk>('balanced');
	let selectedCreatureId = $state<CreatureId>('dragon');
	let selectedRelic = $state<RelicType>('fortune');
	let selectedLaunchStyle = $state<LaunchStyle>('glide');
	let selectedWeather = $state<WeatherCondition>('clear');
	let selectedTimeOfDay = $state<TimeOfDay>('day');
	let selectedDevScenario = $state<DevScenarioId>('random');
	let devScenarioModule = $state<DevScenarioModule>();
	let activeControlTab = $state<ControlTab>('play');
	let devToolsOpen = $state(false);
	let helpOpen = $state(false);
	let currentStageId = $state<FlightStageId>('FORGE_OUTSKIRTS');
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
	let activeRelic = $state<ActiveRelicPresentation>();
	let activePortal = $state<ActivePortalPresentation>();
	let activeBoss = $state<ActiveBossPresentation>();
	let activeEnding = $state<Exclude<FlightEnding, 'crash'>>();
	let eventWarning = $state<WarningPresentation>();
	let comboFeedback = $state<ComboPresentation>();
	let comboCount = $state(0);
	let multiplierPulse = $state(false);
	let creatureFrameNumber = $state(1);
	let impactActive = $state(false);
	let flapActive = $state(false);
	let eventLabel = $state('READY');
	let eventProgress = $state(0);
	let eventCallout = $state('');
	let flightTargetY = $state(INITIAL_BOUNDS.floorY * 0.5);
	let particles = $state<EmberParticle[]>([]);
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
	const betInputIsValid = $derived(isBetInputValid(betInput));
	const activeCreature = $derived(getCreature(roundCreatureId ?? selectedCreatureId));
	const selectedCreature = $derived(getCreature(selectedCreatureId));
	const selectedPathNote = $derived(PATHS.find((path) => path.risk === selectedRisk)?.note ?? '');
	const selectedRelicNote = $derived(RELICS.find((relic) => relic.type === selectedRelic)?.note ?? '');
	const selectedLaunchNote = $derived(LAUNCH_STYLES.find((launch) => launch.style === selectedLaunchStyle)?.note ?? '');
	const selectedWeatherConfig = $derived(getWeather(selectedWeather));
	const selectedTimeConfig = $derived(getTimeOfDay(selectedTimeOfDay));
	const currentStage = $derived(getFlightStage(currentStageId));
	const resultWinTier = $derived(getWinTier(currentRound?.finalMultiplier ?? 0));
	const activeWeather = $derived(currentRound?.weather ?? selectedWeather);
	const activeWeatherConfig = $derived(getWeather(activeWeather));
	const activeTimeOfDay = $derived(currentRound?.timeOfDay ?? selectedTimeOfDay);
	const activeTimeConfig = $derived(getTimeOfDay(activeTimeOfDay));
	const activeCreatureFrame = $derived(
		activeCreature.flightAnimation?.frames[creatureFrameNumber - 1],
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
		if (!animation) return;

		for (const source of animation.frames) {
			const image = new Image();
			image.src = source;
		}

		let frameCursor = 0;
		const frameTimer = setInterval(() => {
			frameCursor = (frameCursor + 1) % animation.frameOrder.length;
			creatureFrameNumber = animation.frameOrder[frameCursor] ?? 1;
		}, 1000 / animation.fps);

		return () => clearInterval(frameTimer);
	});

	function createPlayer(worldBounds: WorldBounds): PlayerBody {
		return {
			position: { x: worldBounds.width * 0.25, y: worldBounds.floorY * 0.5 },
			velocity: { x: 0, y: 0 },
			radius: clamp(worldBounds.width * 0.026, 17, 25),
		};
	}

	function formatLocalAmount(value: number) {
		return `$${value.toFixed(2)}`;
	}

	function formatEventName(value: string) {
		return value.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
	}

	function roundBet(value: number) {
		return Math.round(value * 100) / 100;
	}

	function clampBet(value: number) {
		return roundBet(clamp(value, MIN_PROTOTYPE_BET, MAX_PROTOTYPE_BET));
	}

	function isBetInputValid(value: string) {
		if (!/^\d+(?:\.\d{0,2})?$/.test(value)) return false;
		const numericValue = Number(value);
		return Number.isFinite(numericValue) && numericValue >= MIN_PROTOTYPE_BET && numericValue <= MAX_PROTOTYPE_BET;
	}

	function sanitizeBetInput(value: string) {
		const normalized = value.trim().replace(',', '.');
		return /^\d*(?:\.\d{0,2})?$/.test(normalized) ? normalized : betInput;
	}

	function updateBetInput(input: HTMLInputElement) {
		const sanitized = sanitizeBetInput(input.value);
		input.value = sanitized;
		betInput = sanitized;

		const numericValue = Number(sanitized);
		if (Number.isFinite(numericValue) && numericValue >= MIN_PROTOTYPE_BET && numericValue <= MAX_PROTOTYPE_BET) {
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
			timer = setTimeout(finish, milliseconds);
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
				const linearProgress = Math.min(1, (now - startedAt) / duration);
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
		}, 720);
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
		activeRelic = undefined;
		activePortal = undefined;
		activeBoss = undefined;
		activeEnding = undefined;
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
		}, 1050);
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
		const additions = Array.from({ length: count }, (): EmberParticle => ({
			id: particleSequence++,
			x: player.position.x + (impact ? player.radius : -player.radius),
			y: player.position.y + (Math.random() - 0.5) * player.radius * 1.5,
			velocityX: impact ? (Math.random() - 0.5) * 220 : -60 - Math.random() * 100,
			velocityY: (Math.random() - 0.5) * (impact ? 230 : 95),
			life: 0.35 + Math.random() * 0.45,
			size: 2 + Math.random() * (impact ? 6 : 4),
		}));
		particles = [...particles, ...additions].slice(-70);
	}

	function resetPresentation() {
		cancelPresentation();
		player = createPlayer(bounds);
		status = 'ready';
		currentRound = undefined;
		roundCreatureId = undefined;
		currentStageId = 'FORGE_OUTSKIRTS';
		flightProgress = 0;
		currentMultiplier = 1;
		finalMultiplier = 0;
		finalWin = 0;
		gatesPassed = 0;
		distanceTravelled = 0;
		activeGate = undefined;
		activeRelic = undefined;
		activePortal = undefined;
		activeBoss = undefined;
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
			width: clamp(bounds.width * 0.068, 44, 70),
			gapCenterY,
			gapHeight,
		};
	}

	function presentGate(event: Extract<FlightEvent, { type: 'gate' }>) {
		activeGate = createPresentedGate(event);
		eventLabel = formatEventName(event.hazard);
		eventCallout = `${formatEventName(event.hazard)} · GATE ${event.gate}`;
		status = 'flying';
		triggerFlap();

		if (event.result === 'pass') {
			flightTargetY = activeGate.gapCenterY;
		} else {
			const gapTop = activeGate.gapCenterY - activeGate.gapHeight / 2;
			const gapBottom = activeGate.gapCenterY + activeGate.gapHeight / 2;
			flightTargetY = event.crashSide === 'upper'
				? Math.max(player.radius, gapTop - player.radius * 0.7)
				: Math.min(bounds.floorY - player.radius, gapBottom + player.radius * 0.7);
		}

		return new Promise<void>((resolve) => {
			gateResolver = resolve;
		});
	}

	async function presentRelic(event: Extract<FlightEvent, { type: 'relic' }>, token: number) {
		const fromMultiplier = currentMultiplier;
		activeRelic = {
			relicType: event.relicType,
			fromMultiplier,
			toMultiplier: event.multiplier,
			protected: event.protected ?? false,
		};
		eventLabel = RELIC_LABELS[event.relicType];
		eventCallout = event.protected ? `${RELIC_LABELS[event.relicType]} · SHIELD` : RELIC_LABELS[event.relicType];
		flightTargetY = bounds.floorY * 0.43;
		triggerFlap();
		await delay(300);
		if (token !== presentationToken) return;
		await animateCurrentMultiplier(event.multiplier, 340, token);
		if (token !== presentationToken) return;
		emitParticles(event.relicType === 'mythicRelic' ? 28 : 18);
		activeRelic = undefined;
		await delay(150);
	}

	async function presentPortal(event: Extract<FlightEvent, { type: 'portal' }>, token: number) {
		const portalLabel = PORTAL_LABELS[event.portalType];
		if (event.portalType === 'chaosPortal' || event.portalType === 'vaultPortal') {
			const warningShown = await showWarning(
				portalLabel,
				event.portalType === 'vaultPortal' ? 'vault' : 'portal',
				token,
				360,
			);
			if (!warningShown) return;
		}
		eventLabel = portalLabel;
		eventCallout = portalLabel;
		activePortal = { portalType: event.portalType, phase: 'approach', multiplier: event.multiplier };
		flightTargetY = bounds.floorY * 0.46;
		triggerFlap();
		await delay(300);
		if (token !== presentationToken) return;
		activePortal = { portalType: event.portalType, phase: 'enter', multiplier: event.multiplier };
		impactActive = event.portalType === 'chaosPortal';
		await animateCurrentMultiplier(event.multiplier, 360, token);
		if (token !== presentationToken) return;
		emitParticles(event.portalType === 'chaosPortal' ? 30 : 20);
		activePortal = { portalType: event.portalType, phase: 'release', multiplier: event.multiplier };
		await delay(220);
		if (token !== presentationToken) return;
		activePortal = undefined;
		impactActive = false;
	}

	async function presentBoss(event: Extract<FlightEvent, { type: 'boss' }>, token: number) {
		const bossLabel = BOSS_LABELS[event.bossType];
		const warningShown = await showWarning(bossLabel, 'danger', token, 430);
		if (!warningShown) return;
		eventLabel = bossLabel;
		eventCallout = 'DANGER AHEAD';
		activeBoss = { bossType: event.bossType, result: event.result, phase: 'enter' };
		flightTargetY = bounds.floorY * 0.38;
		triggerFlap();
		await delay(330);
		if (token !== presentationToken) return;
		activeBoss = { bossType: event.bossType, result: event.result, phase: 'engage' };
		impactActive = true;
		await delay(380);
		if (token !== presentationToken) return;
		activeBoss = { bossType: event.bossType, result: event.result, phase: 'resolve' };
		await animateCurrentMultiplier(event.multiplier, 300, token);
		if (token !== presentationToken) return;
		if (event.result === 'pass') {
			eventCallout = 'BOSS PASSED · BREAKTHROUGH';
			emitParticles(30, true);
		} else {
			eventCallout = 'BOSS ATTACK · CRASH';
			status = 'collided';
			player = { ...player, velocity: { x: 0, y: 0 } };
			emitParticles(38, true);
		}
		await delay(event.result === 'crash' ? 420 : 300);
		if (token !== presentationToken) return;
		activeBoss = undefined;
		impactActive = event.result === 'crash';
	}

	async function presentEnding(event: Extract<FlightEvent, { type: 'ending' }>, token: number) {
		activeEnding = event.ending;
		status = 'ending';
		flightTargetY = bounds.floorY * 0.48;
		triggerFlap();
		await animateCurrentMultiplier(event.multiplier, 320, token);
		if (token !== presentationToken) return;
		const endingIntensity = {
			safeLanding: 12,
			forgeVault: 20,
			dragonVault: 28,
			ancientVault: 34,
			mythicRealm: 42,
		}[event.ending];
		emitParticles(endingIntensity);
		await delay(300 + endingIntensity * 10);
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
					eventCallout = `${formatEventName(round.launchStyle)} LAUNCH`;
					status = 'flying';
					flightTargetY = event.path === 'safe'
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
					await delay(event.result === 'crash' ? 420 : 140);
					break;
				case 'relic':
					await presentRelic(event, token);
					break;
				case 'portal':
					await presentPortal(event, token);
					break;
				case 'boss':
					await presentBoss(event, token);
					break;
				case 'ending':
					eventLabel = formatEventName(event.ending);
					eventCallout = formatEventName(event.ending);
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
		let generatedRound: FlightRound;
		if (import.meta.env.DEV && selectedDevScenario !== 'random' && devScenarioModule) {
			generatedRound = devScenarioModule.createDevFlightRound(selectedDevScenario, {
				bet: selectedBet,
				risk: selectedRisk,
				roundId: roundSequence,
				creature: selectedCreatureId,
				relic: selectedRelic,
				launchStyle: selectedLaunchStyle,
			});
		} else {
			generatedRound = generateMockRound(selectedBet, selectedRisk, roundSequence, {
				creature: selectedCreatureId,
				relic: selectedRelic,
				launchStyle: selectedLaunchStyle,
			});
		}
		// Presentation metadata is attached only after the authoritative local outcome is complete.
		const roundWithWeather: FlightRound = { ...generatedRound, weather: selectedWeather };
		const round: FlightRound = { ...roundWithWeather, timeOfDay: selectedTimeOfDay };
		const token = ++presentationToken;
		player = createPlayer(bounds);
		currentRound = round;
		roundCreatureId = round.creature;
		currentStageId = round.stagePlan[0]?.stage ?? 'FORGE_OUTSKIRTS';
		flightProgress = 0;
		stageAnnouncement = undefined;
		currentMultiplier = 1;
		finalMultiplier = 0;
		finalWin = 0;
		gatesPassed = 0;
		distanceTravelled = 0;
		activeGate = undefined;
		activeRelic = undefined;
		activePortal = undefined;
		activeBoss = undefined;
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
			activeGate.x <= player.position.x + player.radius
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
		const width = Math.max(300, worldElement.clientWidth);
		const height = Math.max(260, worldElement.clientHeight);
		bounds = { width, height, floorY: height - clamp(height * 0.085, 34, 48) };
		const widthRatio = width / previous.width;
		const heightRatio = height / previous.height;
		player = status === 'ready'
			? createPlayer(bounds)
			: {
				...player,
				position: { x: player.position.x * widthRatio, y: player.position.y * heightRatio },
				radius: clamp(width * 0.026, 17, 25),
			};
		flightTargetY *= heightRatio;
		if (activeGate) {
			activeGate = {
				...activeGate,
				x: activeGate.x * widthRatio,
				width: clamp(width * 0.068, 44, 70),
				gapCenterY: activeGate.gapCenterY * heightRatio,
				gapHeight: clamp(height * 0.35, 145, 215),
			};
		}
	}

	onMount(() => {
		let disposed = false;
		if (import.meta.env.DEV) {
			void import('./devScenarios').then((module) => {
				if (!disposed) devScenarioModule = module;
			});
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
			const environmentSpeed = WORLD_SPEED * currentStage.parallaxSpeed;
			const presentationSpeed = status === 'collided' ? environmentSpeed * 0.22 : environmentSpeed;
			parallaxOffset = (parallaxOffset + deltaSeconds * (moving ? presentationSpeed : 30)) % 1800;
			updateParticles(deltaSeconds);

			if (status === 'flying' || status === 'ending') {
				player = steerPlayer(player, flightTargetY, deltaSeconds, bounds, {
					agility: activeCreature.agility,
					damping: activeCreature.damping,
					maxVerticalSpeed: activeCreature.maxVerticalSpeed,
				});
				distanceTravelled += WORLD_SPEED * deltaSeconds;
			}
			updateActiveGate(deltaSeconds);
			animationFrame = requestAnimationFrame(update);
		};

		animationFrame = requestAnimationFrame(update);
		return () => {
			disposed = true;
			cancelPresentation();
			observer.disconnect();
			cancelAnimationFrame(animationFrame);
		};
	});
</script>

<svelte:head><title>Dragon Flight - Local Round Prototype</title></svelte:head>

<main class="prototype-shell">
	<header class="prototype-header">
		<div><p class="eyebrow">LOCAL CASINO-STYLE SIMULATION</p><h1>Relic Forge: Dragon Flight</h1></div>
		<div class="header-actions">
			<div class:danger={status === 'collided' || currentRound?.ending === 'crash'} class="status-chip" aria-live="polite">
				{status === 'ready' ? 'SELECT A PATH' : status === 'complete' && currentRound ? formatEventName(currentRound.ending) : 'ROUND IN FLIGHT'}
			</div>
			<button class="help-button" type="button" aria-label="Open Dragon Flight game guide" onclick={() => (helpOpen = true)}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.7 9.2a2.45 2.45 0 1 1 3.7 2.1c-.9.5-1.4 1-1.4 2" /><path d="M12 16.8h.01" /></svg>
			</button>
		</div>
	</header>

	<section class="game-layout">
		<div bind:this={worldElement} class:has-impact={impactActive} class={`world ${currentStage.className} ${activeTimeConfig.overlayClass}`} style={`--far-scroll:${-parallaxOffset * 0.16}px;--wall-scroll:${-parallaxOffset * 0.34}px;--ember-scroll:${-parallaxOffset * 0.55}px;--floor-scroll:${-parallaxOffset}px;--stage-intensity:${currentStage.intensity};--time-ambient:${activeTimeConfig.ambientBrightness};--time-warmth:${activeTimeConfig.warmth};--time-contrast:${activeTimeConfig.contrast};--time-haze:${activeTimeConfig.haze};--time-glow:${activeTimeConfig.glowStrength};`}>
			<div class="far-forge"></div><div class="near-forge"></div><div class="ember-field"></div>
			<TimeOfDayEffect timeOfDay={activeTimeOfDay} weather={activeWeather} stageIntensity={currentStage.intensity} parallaxOffset={parallaxOffset} />
			<WeatherEffect
				weather={activeWeather}
				stageIntensity={currentStage.intensity}
				parallaxOffset={parallaxOffset}
				launchStyle={currentRound?.launchStyle ?? selectedLaunchStyle}
				active={status !== 'ready' && status !== 'complete'}
			/>
			<div class="flight-hud">
				<div class="hud-selection">
					<span>BET <strong>{formatLocalAmount(currentRound?.bet ?? selectedBet)}</strong></span>
					<span>PATH <strong>{(currentRound?.risk ?? selectedRisk).toUpperCase()}</strong></span>
					<span>CREATURE <strong>{activeCreature.name}</strong></span>
					<span>RELIC <strong>{(currentRound?.relic ?? selectedRelic).toUpperCase()}</strong></span>
				</div>
				<span class="stage-readout">STAGE {currentStage.order}<strong>{currentStage.name}</strong></span>
				<span class:pulse={multiplierPulse} class="multiplier-readout">CURRENT<strong>x{currentMultiplier.toFixed(2)}</strong></span>
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

			{#if eventCallout && !eventWarning}<div class="event-callout" role="status" aria-live="polite">{eventCallout}</div>{/if}

			{#if currentRound && status !== 'ready' && status !== 'complete'}
				<div class="flight-meter" role="progressbar" aria-label="Flight progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(flightProgress)}>
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
				<div class={`gate hazard-${activeGate.hazard} ${activeGate.result}`} style={`left:${activeGate.x}px;width:${activeGate.width}px;`}>
					<div class="gate-part upper" style={`height:${activeGate.gapCenterY - activeGate.gapHeight / 2}px;`}><span></span></div>
					<div class="gate-part lower" style={`top:${activeGate.gapCenterY + activeGate.gapHeight / 2}px;bottom:${bounds.height - bounds.floorY}px;`}><span></span></div>
					<div class="hazard-decoration" aria-hidden="true"><i></i><b></b><span></span></div>
					<b class="gate-number">GATE {activeGate.gate} · {formatEventName(activeGate.hazard)}</b>
				</div>
			{/if}

			{#if activeRelic}
				<RelicPickup
					relicType={activeRelic.relicType}
					fromMultiplier={activeRelic.fromMultiplier}
					toMultiplier={activeRelic.toMultiplier}
					protected={activeRelic.protected}
				/>
			{/if}

			{#if activePortal}
				<PortalEffect portalType={activePortal.portalType} phase={activePortal.phase} multiplier={activePortal.multiplier} />
			{/if}

			{#if activeBoss}
				<BossEncounter bossType={activeBoss.bossType} result={activeBoss.result} phase={activeBoss.phase} />
			{/if}

			{#if activeEnding}<EndingEffect ending={activeEnding} />{/if}

			{#if comboFeedback}
				{#key comboFeedback.id}
					<div class="combo-feedback" role="status" aria-live="polite">
						<strong>PERFECT PASS</strong>
						{#if comboFeedback.count > 1}<span>x{comboFeedback.count} COMBO</span>{/if}
					</div>
				{/key}
			{/if}

			{#each particles as particle (particle.id)}
				<span class="jump-ember" style={`left:${particle.x}px;top:${particle.y}px;width:${particle.size}px;height:${particle.size}px;opacity:${Math.min(1, particle.life * 2.4)};`}></span>
			{/each}

			<div
				class:is-flapping={flapActive}
				class:is-hit={status === 'collided'}
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
						<img class="creature-frame" src={activeCreatureFrame} alt="" draggable="false" />
					{:else}
						<span class="wing wing-top"></span><span class="dragon-body"></span><span class="dragon-head"><i></i></span><span class="wing wing-bottom"></span><span class="tail"></span><span class="creature-detail"></span>
					{/if}
					<span class={`weather-trail ${activeWeather}`}></span>
				</div>
			</div>
			<div class="floor" style={`height:${bounds.height - bounds.floorY}px;`}></div>

			{#if status === 'ready'}<div class="start-hint">CHOOSE LOCAL BET + RISK PATH, THEN FLY</div>{/if}
			{#if status === 'complete' && currentRound}
				<div class:success={currentRound.ending !== 'crash'} class="result-panel" aria-labelledby="flight-result-title">
					<strong id="flight-result-title">{formatEventName(currentRound.ending)}</strong>
					{#if currentRound.ending !== 'crash'}
						<WinCelebration tier={resultWinTier} multiplier={`x${finalMultiplier.toFixed(2)}`} win={formatLocalAmount(finalWin)} />
					{/if}
					<div><span>BET</span><b>{formatLocalAmount(currentRound.bet)}</b></div>
					<div><span>MULTIPLIER</span><b>x{finalMultiplier.toFixed(2)}</b></div>
					<div><span>WIN</span><b>{formatLocalAmount(finalWin)}</b></div>
					<div class="result-creature"><span>CREATURE</span><b>{activeCreature.name}</b></div>
					<div><span>RELIC</span><b>{currentRound.relic.toUpperCase()}</b></div>
					<div><span>LAUNCH</span><b>{currentRound.launchStyle.toUpperCase()}</b></div>
					<div><span>WEATHER</span><b>{activeWeatherConfig.name}</b></div>
					<div><span>TIME</span><b>{activeTimeConfig.name}</b></div>
					<small>LOCAL PROTOTYPE SIMULATION - NOT REAL MONEY</small>
					<button onclick={resetPresentation}>TRY AGAIN</button>
				</div>
			{/if}
		</div>

		<aside class="control-panel">
			<div class="control-tabs" role="tablist" aria-label="Flight setup sections">
				<button role="tab" aria-selected={activeControlTab === 'play'} class:active={activeControlTab === 'play'} onclick={() => (activeControlTab = 'play')}>PLAY</button>
				<button role="tab" aria-selected={activeControlTab === 'style'} class:active={activeControlTab === 'style'} onclick={() => (activeControlTab = 'style')}>STYLE</button>
			</div>

			{#if import.meta.env.DEV && devScenarioModule}
				<section class:open={devToolsOpen} class="dev-scenario-panel">
					<button class="dev-tools-toggle" type="button" aria-expanded={devToolsOpen} onclick={() => (devToolsOpen = !devToolsOpen)}>
						<span><strong>DEV ONLY</strong><small>SCENARIO PREVIEW</small></span><b>{devToolsOpen ? '−' : '+'}</b>
					</button>
					{#if devToolsOpen}
						<div class="dev-tools-body">
							<label for="dev-scenario-select">DEV SCENARIO</label>
							<select id="dev-scenario-select" bind:value={selectedDevScenario} disabled={controlsLocked}>
								{#each devScenarioModule.DEV_SCENARIOS as scenario (scenario.id)}
									<option value={scenario.id}>{scenario.name}</option>
								{/each}
							</select>
						</div>
					{/if}
				</section>
			{/if}

			<div class="control-tab-body" role="tabpanel">
				{#if activeControlTab === 'play'}
					<section class="control-section bet-section">
						<div class="section-heading"><div><p>BET</p><span>Local prototype amount</span></div></div>
						<div class="bet-stepper">
							<button aria-label="Decrease bet" disabled={controlsLocked || selectedBet <= MIN_PROTOTYPE_BET} onclick={() => moveBet(-1)}>−</button>
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
							<button aria-label="Increase bet" disabled={controlsLocked || selectedBet >= MAX_PROTOTYPE_BET} onclick={() => moveBet(1)}>+</button>
						</div>
					</section>

					<section class="control-section">
						<div class="section-heading"><div><p>PATH / RISK</p><span>Local mock-round profile</span></div></div>
						<div class="segmented-options path-options">
							{#each PATHS as path (path.risk)}
								<button disabled={controlsLocked} aria-pressed={selectedRisk === path.risk} class:active={selectedRisk === path.risk} onclick={() => (selectedRisk = path.risk)}><span>{path.arrow}</span><b>{path.risk}</b></button>
							{/each}
						</div>
						<p class="selected-description">{selectedPathNote}</p>
					</section>

					<section class="control-section">
						<div class="section-heading"><div><p>RELIC</p><span>Selection only</span></div></div>
						<div class="segmented-options relic-options">
							{#each RELICS as relic (relic.type)}
								<button disabled={controlsLocked} aria-pressed={selectedRelic === relic.type} class:active={selectedRelic === relic.type} onclick={() => (selectedRelic = relic.type)}><b>{relic.name.replace(' RELIC', '')}</b></button>
							{/each}
						</div>
						<p class="selected-description">{selectedRelicNote}</p>
					</section>
				{:else}
					<section class="control-section creature-section">
						<div class="section-heading"><div><p>CREATURE</p><span>Movement feel only</span></div></div>
						<div class="creature-options">
							{#each CREATURES as creature (creature.id)}
								<button title={creature.name} disabled={controlsLocked} aria-pressed={selectedCreatureId === creature.id} class:active={selectedCreatureId === creature.id} onclick={() => (selectedCreatureId = creature.id)}>
									{#if creature.assets?.portrait}
										<span class="creature-preview with-image"><img class="creature-preview-image" src={creature.assets.portrait} alt="" /></span>
									{:else}
										<span class={`creature-preview ${creature.className}`}><i></i></span>
									{/if}
									<span class="creature-copy"><b>{creature.name}</b></span>
								</button>
							{/each}
						</div>
						<p class="selected-description"><strong>{selectedCreature.name}</strong> — {selectedCreature.description}</p>
					</section>

					<section class="control-section">
						<div class="section-heading"><div><p>LAUNCH</p><span>Presentation only</span></div></div>
						<div class="segmented-options launch-options">
							{#each LAUNCH_STYLES as launch (launch.style)}
								<button disabled={controlsLocked} aria-pressed={selectedLaunchStyle === launch.style} class:active={selectedLaunchStyle === launch.style} onclick={() => (selectedLaunchStyle = launch.style)}><b>{launch.name}</b></button>
							{/each}
						</div>
						<p class="selected-description">{selectedLaunchNote}</p>
					</section>

					<section class="control-section weather-section">
						<div class="section-heading"><div><p>WEATHER</p><span>Atmosphere only</span></div></div>
						<div class="weather-options">
							{#each WEATHER_OPTIONS as weather (weather.id)}
								<button disabled={controlsLocked} aria-pressed={selectedWeather === weather.id} class:active={selectedWeather === weather.id} onclick={() => (selectedWeather = weather.id)}>
									<i class={`weather-indicator ${weather.className}`} aria-hidden="true"></i><b>{weather.name}</b>
								</button>
							{/each}
						</div>
						<p class="selected-description">{selectedWeatherConfig.description}</p>
					</section>

					<section class="control-section time-section">
						<div class="section-heading"><div><p>TIME</p><span>Lighting only</span></div></div>
						<div class="time-options">
							{#each TIME_OF_DAY_OPTIONS as time (time.id)}
								<button disabled={controlsLocked} aria-pressed={selectedTimeOfDay === time.id} class:active={selectedTimeOfDay === time.id} onclick={() => (selectedTimeOfDay = time.id)}>
									<i class={`time-indicator ${time.overlayClass}`} aria-hidden="true"></i><b>{time.name}</b>
								</button>
							{/each}
						</div>
						<p class="selected-description">{selectedTimeConfig.description}</p>
					</section>
				{/if}
			</div>

			<div class="control-footer">
				<div class="control-summary">
					<div><span>BET</span><strong>{formatLocalAmount(selectedBet)}</strong></div>
					<p>{selectedRisk} · {selectedRelic}</p>
					<small>{gatesPassed} gates · {distanceMetres}m</small>
				</div>
				<button class="fly-button" disabled={controlsLocked || !betInputIsValid} onclick={startFlight}>{controlsLocked ? 'FLIGHT ACTIVE' : `FLY ${formatLocalAmount(selectedBet)}`}</button>
			</div>
		</aside>
	</section>
	<footer><span>Prototype outcome is generated locally before animation.</span><span>No RGS, wallet, authentication, or real wagering.</span></footer>
</main>

<HelpDialog open={helpOpen} onClose={() => (helpOpen = false)} />

<style>
	.prototype-shell,.prototype-shell *{box-sizing:border-box}.prototype-shell{position:fixed;inset:0;z-index:1000;overflow:auto;padding:clamp(16px,2.5vw,34px);color:#f7e8bd;font-family:Georgia,'Times New Roman',serif;background:radial-gradient(circle at 16% 22%,rgba(255,104,20,.12),transparent 27%),radial-gradient(circle at 82% 25%,rgba(16,202,124,.1),transparent 30%),linear-gradient(145deg,#090b09,#06110d 48%,#060706)}
	.prototype-header,.game-layout,footer{width:min(1440px,100%);margin-inline:auto}.prototype-header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:clamp(14px,2vh,24px)}.eyebrow,.control-section p{margin:0;color:#45e7a0;font:700 .7rem/1.2 system-ui,sans-serif;letter-spacing:.2em}h1{margin:4px 0 0;color:#f4c665;font-size:clamp(1.7rem,3.4vw,3.4rem);letter-spacing:.04em;text-shadow:0 2px 18px rgba(246,157,42,.26)}.status-chip{min-width:150px;padding:10px 16px;border:1px solid #21885d;background:rgba(4,32,23,.84);color:#5ff0ac;font:800 .72rem/1 system-ui,sans-serif;letter-spacing:.14em;text-align:center}.status-chip.danger{border-color:#da6436;background:rgba(51,17,7,.9);color:#ffac72}
	.game-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(290px,360px);gap:clamp(14px,2vw,26px)}.world{position:relative;min-width:0;min-height:clamp(420px,68dvh,730px);overflow:hidden;border:2px solid #a87820;box-shadow:inset 0 0 0 5px #071811,inset 0 0 45px #000,0 18px 50px rgba(0,0,0,.45);background:linear-gradient(#07100f,#0d1913 64%,#17100a)}.world.has-impact{animation:impact-shake .4s ease-out}.far-forge,.near-forge,.ember-field{position:absolute;inset:0;pointer-events:none}.far-forge{background:repeating-linear-gradient(90deg,transparent 0 170px,rgba(72,116,89,.11) 171px 174px),repeating-linear-gradient(0deg,transparent 0 84px,rgba(194,141,57,.06) 85px 88px),radial-gradient(circle at 20% 80%,rgba(255,91,12,.25),transparent 20%);background-position:var(--far-scroll) 0,var(--far-scroll) 0,0 0}.near-forge{background:repeating-linear-gradient(90deg,transparent 0 245px,rgba(0,0,0,.42) 246px 274px),linear-gradient(rgba(0,0,0,.12),transparent 55%,rgba(8,4,2,.5));background-position:var(--wall-scroll) 0,0 0}.ember-field{opacity:.55;background-image:radial-gradient(circle,#ff8d28 0 1px,transparent 2px),radial-gradient(circle,#4bf2a8 0 1px,transparent 2px);background-size:95px 115px,145px 170px;background-position:var(--ember-scroll) 28%,var(--wall-scroll) 62%}
	.flight-hud{position:absolute;z-index:8;top:14px;left:50%;display:flex;gap:18px;padding:8px 13px;border:1px solid rgba(189,139,46,.65);background:rgba(3,17,12,.82);transform:translateX(-50%);font:700 .66rem/1 system-ui,sans-serif;letter-spacing:.1em;white-space:nowrap}.flight-hud strong{margin-left:4px;color:#58eda8}.gate{position:absolute;z-index:3;inset-block:0}.gate-part{position:absolute;left:0;width:100%;border-inline:3px solid #bc8429;background:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 2px,transparent 2px 38px),linear-gradient(90deg,#111814,#253228 42%,#0b100e);box-shadow:inset 7px 0 12px rgba(233,161,47,.13),inset -7px 0 14px #000,0 0 18px rgba(0,0,0,.7)}.gate-part.upper{top:0}.gate-part:after{content:'';position:absolute;left:-9px;right:-9px;bottom:-13px;height:18px;border:2px solid #d39b35;background:linear-gradient(#5c4522,#15120c);clip-path:polygon(0 0,100% 0,91% 100%,9% 100%)}.gate-part.lower:after{top:-13px;bottom:auto;transform:rotate(180deg)}.gate-part span{position:absolute;inset:12px 25%;border-inline:1px solid rgba(61,232,144,.35)}.gate-number{position:absolute;z-index:2;top:50%;left:50%;padding:5px 7px;background:rgba(4,20,14,.8);color:#dfbd6c;font:700 .55rem/1 system-ui,sans-serif;white-space:nowrap;transform:translate(-50%,-50%)}
	.relic-pickup{position:absolute;z-index:6;left:64%;top:43%;display:grid;place-items:center;width:88px;height:88px;border:3px solid #d7a53e;border-radius:50%;background:radial-gradient(circle,#4cf2a3 0 8%,#127c50 9% 38%,#061c14 68%);box-shadow:0 0 35px #23d987;animation:relic-flight .65s ease-in forwards}.relic-pickup i{position:absolute;inset:-8px;border:1px solid #44e6a0;border-radius:50%;animation:relic-spin 1s linear infinite}.relic-pickup strong{font-size:1.4rem}.relic-pickup span{font:700 .55rem/1 system-ui,sans-serif;letter-spacing:.12em}.vault{position:absolute;z-index:3;right:-30px;bottom:8%;width:38%;height:62%;border:4px solid #bb812a;border-radius:50% 0 0 0;background:radial-gradient(circle at 52% 54%,#ffe374 0 4%,#7c4c18 5% 14%,#16231a 35%,#080b09 70%);box-shadow:0 0 45px rgba(255,170,45,.35);animation:vault-arrive 1.2s ease-out forwards}.vault i{position:absolute;inset:12%;border:2px solid #d4a94b;border-radius:50%;box-shadow:inset 0 0 30px #000}.vault strong{position:absolute;left:50%;top:50%;color:#f6d788;font-size:clamp(1rem,2vw,1.7rem);letter-spacing:.15em;transform:translate(-50%,-50%)}
	.jump-ember{position:absolute;z-index:7;border-radius:50%;background:#ffad35;box-shadow:0 0 8px #ff641c;pointer-events:none}.creature-flight{position:absolute;z-index:7;width:clamp(58px,7vw,86px);height:clamp(38px,4.6vw,58px);filter:drop-shadow(0 7px 8px rgba(0,0,0,.55));transition:filter .12s}.creature-sprite{position:absolute;inset:0;animation:creature-hover var(--hover-duration) ease-in-out infinite alternate}.dragon-body{position:absolute;inset:24% 19% 17% 20%;border:2px solid #f4b847;border-radius:58% 43% 49% 55%;background:radial-gradient(circle at 65% 28%,#78f4a4,#158c54 38%,#063323 72%);box-shadow:inset -8px -7px 12px rgba(0,0,0,.42),0 0 13px rgba(32,232,132,.38)}.dragon-head{position:absolute;right:4%;top:20%;width:30%;height:36%;border:2px solid #e9ad42;border-radius:65% 70% 60% 45%;background:#167b49;transform:rotate(-7deg)}.dragon-head:after{content:'';position:absolute;right:17%;top:26%;width:4px;height:4px;border-radius:50%;background:#ffe46e;box-shadow:0 0 7px #fff083}.dragon-head i{position:absolute;left:16%;top:-42%;border-right:7px solid transparent;border-bottom:14px solid #d49a32;transform:rotate(-28deg)}.wing{position:absolute;left:25%;width:42%;height:44%;border:2px solid #d79c35;background:linear-gradient(145deg,#104e38,#1fb86d 52%,#073021);transform-origin:20% 50%}.wing-top{top:-8%;clip-path:polygon(0 100%,22% 0,100% 35%,58% 100%);animation:wing-top .42s ease-in-out infinite alternate}.wing-bottom{bottom:-8%;clip-path:polygon(0 0,58% 0,100% 65%,22% 100%);animation:wing-bottom .42s ease-in-out infinite alternate}.is-flapping .wing-top{animation:flap-top var(--flap-burst) ease-out}.is-flapping .wing-bottom{animation:flap-bottom var(--flap-burst) ease-out}.tail{position:absolute;left:0;top:45%;width:30%;height:20%;border-top:4px solid #c99131;border-radius:70% 0 0;transform:rotate(-9deg)}.creature-detail{position:absolute;pointer-events:none}.has-impact .creature-flight{filter:grayscale(.5) drop-shadow(0 0 12px #e85b2c)}.floor{position:absolute;z-index:5;left:0;right:0;bottom:0;border-top:2px solid #ca8530;background:repeating-linear-gradient(135deg,#16130e 0 22px,#211910 23px 43px),#14110d;background-position-x:var(--floor-scroll)}
	.tiny-bat .dragon-body{inset:30% 31% 18%;border-color:#b89adf;background:radial-gradient(circle,#765a91,#241c32 72%)}.tiny-bat .dragon-head{right:20%;top:26%;width:23%;height:26%;border-color:#a782c8;background:#33243f}.tiny-bat .wing{left:4%;width:58%;height:52%;border-color:#8d6aaa;background:linear-gradient(145deg,#191222,#6a4b7b 55%,#130f19)}.tiny-bat .creature-detail{left:48%;top:11%;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:14px solid #8d6aaa}.firebird .dragon-body{border-color:#ffd167;background:radial-gradient(circle at 65% 28%,#fff09a,#f47e23 40%,#7a160d 76%);box-shadow:0 0 19px #ff6d24}.firebird .dragon-head{border-color:#ffe078;background:#e65d20}.firebird .wing{border-color:#ffc34f;background:linear-gradient(145deg,#7e190c,#ffad2e 50%,#e93018)}.firebird .tail{width:39%;border-top:6px double #ff8d24;box-shadow:-4px 0 8px #ff5f1c}.firebird .creature-detail{right:8%;top:4%;border-left:6px solid transparent;border-right:2px solid transparent;border-bottom:18px solid #ffd660;transform:rotate(24deg)}.wyvern .dragon-body{border-color:#a7d7d2;background:radial-gradient(circle,#74e0c4,#2b766e 44%,#15343b 76%)}.wyvern .dragon-head{border-color:#a8d8cf;background:#397d75}.wyvern .wing{left:16%;width:49%;border-color:#76bdb1;background:linear-gradient(145deg,#17343a,#5aa99b 52%,#12262d)}.wyvern .tail{width:38%;border-color:#7abcb2}.ancient-dragon .dragon-body{border-width:3px;border-color:#f1bd55;background:radial-gradient(circle,#5aab69,#183d29 42%,#080f0b 76%);box-shadow:inset -9px -8px 12px #000,0 0 22px rgba(197,151,53,.5)}.ancient-dragon .dragon-head{border-width:3px;border-color:#e0a941;background:#244d30}.ancient-dragon .wing{border-width:3px;border-color:#b6812f;background:linear-gradient(145deg,#101b13,#385c3d 52%,#090d0a)}.ancient-dragon .creature-detail{right:14%;top:-12%;width:20%;height:25%;border-top:4px double #e1a83e;border-right:4px solid #b57d2e;transform:skewX(-20deg)}
	.start-hint{position:absolute;z-index:9;left:50%;bottom:12%;padding:8px 12px;border:1px solid rgba(68,229,154,.5);background:rgba(3,20,14,.8);color:#72f0b6;font:700 .62rem/1 system-ui,sans-serif;letter-spacing:.12em;transform:translateX(-50%);white-space:nowrap}.result-panel{position:absolute;z-index:12;left:50%;top:50%;display:grid;grid-template-columns:repeat(3,1fr);gap:9px;min-width:min(470px,88%);padding:22px;border:1px solid #e16b39;background:rgba(31,9,4,.96);color:#ffc38c;text-align:center;transform:translate(-50%,-50%);box-shadow:0 0 45px rgba(234,82,30,.28)}.result-panel.success{border-color:#43d994;background:rgba(3,31,21,.96);box-shadow:0 0 45px rgba(35,218,134,.25)}.result-panel>strong,.result-panel>small,.result-panel>button,.result-panel .result-creature{grid-column:1/-1}.result-panel>strong{font-size:1.35rem;letter-spacing:.13em}.result-panel div{padding:10px 6px;border:1px solid rgba(221,174,82,.3);background:rgba(0,0,0,.2)}.result-panel span{display:block;margin-bottom:6px;font:700 .56rem/1 system-ui,sans-serif;letter-spacing:.12em}.result-panel b{color:#ffe0a0;font-size:1rem}.result-panel small{color:#8fa394;font:600 .55rem/1.2 system-ui,sans-serif;letter-spacing:.08em}.result-panel button{border-color:#d2923a;color:#ffe09f}
	.control-panel{display:flex;flex-direction:column;gap:14px;padding:clamp(16px,2vw,24px);border:1px solid #8e6827;background:linear-gradient(160deg,rgba(8,28,20,.96),rgba(7,11,9,.98));box-shadow:inset 0 0 32px rgba(9,104,64,.12),0 18px 50px rgba(0,0,0,.35)}.control-section{padding-bottom:14px;border-bottom:1px solid rgba(199,153,63,.28)}.section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.section-heading span,.round-readout span{display:block;margin-top:4px;color:#9b9d8e;font: .66rem/1.3 system-ui,sans-serif}.section-heading strong{color:#e4bd6e;font:700 .72rem/1 system-ui,sans-serif;white-space:nowrap}.creature-options{display:grid;grid-template-columns:1fr 1fr;gap:6px}.creature-options button{display:grid;grid-template-columns:42px 1fr;align-items:center;min-height:54px;padding:5px 7px;text-align:left}.creature-options button:last-child{grid-column:1/-1}.creature-copy b,.creature-copy small{display:block}.creature-copy b{font-size:.68rem}.creature-copy small{margin-top:3px;color:#89958a;font: .55rem/1.15 system-ui,sans-serif}.creature-preview{position:relative;display:block;width:34px;height:25px;filter:drop-shadow(0 2px 3px #000)}.creature-preview i{position:absolute;left:11px;top:8px;width:15px;height:10px;border-radius:60% 45%;background:#2a8b58}.creature-preview:before,.creature-preview:after{content:'';position:absolute;top:3px;width:17px;height:18px;background:#286e50}.creature-preview:before{left:0;clip-path:polygon(100% 50%,0 0,16% 100%)}.creature-preview:after{right:0;clip-path:polygon(0 50%,100% 0,84% 100%)}.creature-preview.tiny-bat i,.creature-preview.tiny-bat:before,.creature-preview.tiny-bat:after{background:#6f5183}.creature-preview.firebird i,.creature-preview.firebird:before,.creature-preview.firebird:after{background:#ef7a25;box-shadow:0 0 5px #ff9b2f}.creature-preview.wyvern i,.creature-preview.wyvern:before,.creature-preview.wyvern:after{background:#4d9c91}.creature-preview.ancient-dragon{transform:scale(1.18)}.creature-preview.ancient-dragon i,.creature-preview.ancient-dragon:before,.creature-preview.ancient-dragon:after{background:#315c39;border:1px solid #b98632}button{min-height:42px;border:1px solid #795d28;background:linear-gradient(#10231a,#09130f);color:#ddc488;font:700 .8rem/1 system-ui,sans-serif;cursor:pointer;transition:.13s}button:hover:not(:disabled),button:focus-visible,button.active{border-color:#49e59c;color:#75f5b8;box-shadow:inset 0 0 13px rgba(26,221,133,.16),0 0 12px rgba(26,221,133,.12);outline:none}button:disabled{cursor:not-allowed;opacity:.42}.path-options{display:grid;gap:7px}.path-options button{display:grid;grid-template-columns:82px 1fr;align-items:center;padding:8px 10px;text-align:left}.path-options button b{font-size:.78rem}.path-options button span{color:#929b8e;font: .62rem/1.25 system-ui,sans-serif}.round-readout{display:grid;grid-template-columns:1fr 1fr;gap:8px}.round-readout div{padding:10px;border:1px solid rgba(154,115,44,.45);background:rgba(0,0,0,.22)}.round-readout span{margin:0 0 4px;letter-spacing:.12em}.round-readout strong{color:#e5ca91;font:700 .9rem/1.2 system-ui,sans-serif}.fly-button{min-height:70px;margin-top:auto;border-color:#2cce86;background:linear-gradient(#188457,#0b4b33);color:#f6d98b;font-family:Georgia,'Times New Roman',serif;font-size:1.3rem;letter-spacing:.14em;box-shadow:inset 0 0 20px rgba(68,255,165,.16),0 0 18px rgba(20,197,117,.16)}footer{display:flex;justify-content:space-between;gap:16px;padding-top:13px;color:#7f867a;font:.65rem/1.4 system-ui,sans-serif;letter-spacing:.07em}
	@keyframes creature-hover{from{transform:translateY(0)}to{transform:translateY(var(--hover-lift))}}@keyframes wing-top{from{transform:rotate(-12deg) scaleY(.78)}to{transform:rotate(8deg)}}@keyframes wing-bottom{from{transform:rotate(12deg) scaleY(.78)}to{transform:rotate(-8deg)}}@keyframes flap-top{50%{transform:rotate(-30deg) scaleY(.5)}}@keyframes flap-bottom{50%{transform:rotate(30deg) scaleY(.5)}}@keyframes impact-shake{20%{transform:translate(-8px,3px)}40%{transform:translate(7px,-3px)}60%{transform:translate(-5px,2px)}80%{transform:translate(3px,-1px)}}@keyframes relic-flight{to{left:25%;top:45%;transform:scale(.35);opacity:.25}}@keyframes relic-spin{to{transform:rotate(360deg)}}@keyframes vault-arrive{from{transform:translateX(110%)}to{transform:translateX(0)}}
	@media(max-width:900px){.game-layout{grid-template-columns:1fr}.world{min-height:clamp(350px,56dvh,520px)}.control-panel{display:grid;grid-template-columns:1fr 1fr}.creature-section,.round-readout,.fly-button{grid-column:1/-1}.fly-button{margin-top:0}}@media(max-width:620px){.prototype-shell{padding:12px}.prototype-header{align-items:flex-start;flex-wrap:wrap}.prototype-header h1{font-size:clamp(1.45rem,8vw,2.2rem)}.header-actions{margin-left:auto}.status-chip{min-width:110px;padding-inline:8px}.world{min-height:360px}.control-panel{grid-template-columns:1fr;gap:10px;padding:14px}.flight-hud{top:8px;right:8px;left:8px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 10px;padding:7px 9px;font-size:.52rem;line-height:1.2;white-space:normal;transform:none}.flight-hud span{min-width:0}.event-callout{top:27%;width:max-content}.result-panel{grid-template-columns:1fr;max-height:88%;overflow:auto;padding:16px}.result-panel>strong,.result-panel>small,.result-panel>button{grid-column:auto}.start-hint{max-width:calc(100% - 24px);font-size:.52rem;text-align:center;white-space:normal}footer{flex-direction:column;gap:2px}}@media(prefers-reduced-motion:reduce){.wing,.world.has-impact,.relic-pickup,.vault{animation:none}}
	.bet-stepper { display: grid; grid-template-columns: 54px 1fr 54px; align-items: center; gap: 10px; }
	.bet-stepper button { height: 48px; border-radius: 50%; font-size: 1.35rem; }
	.bet-input { min-width: 0; width: 100%; padding: 12px 8px; border: 1px solid rgba(199, 153, 63, 0.45); background: rgba(0, 0, 0, 0.22); color: #f2d594; font: 700 1rem/1 Georgia, 'Times New Roman', serif; text-align: center; }
	.bet-input:focus { border-color: #49e59c; outline: 2px solid rgba(73, 229, 156, 0.25); outline-offset: 1px; }
	.bet-input[aria-invalid='true'] { border-color: #c65c3a; box-shadow: inset 0 0 12px rgba(198, 92, 58, 0.16); }
	.bet-input:disabled { cursor: not-allowed; opacity: 0.48; }
	.bet-input::-webkit-inner-spin-button, .bet-input::-webkit-outer-spin-button { margin: 0; }
	.bet-input[type='number'] { appearance: textfield; }
	.relic-pickup.guardian { border-color: #e1bd63; }
	.relic-pickup.chaos { border-color: #c671e7; background: radial-gradient(circle, #f29b5d 0 8%, #7c2b55 9% 38%, #17091e 68%); box-shadow: 0 0 35px #b145d8; }
	.relic-pickup.fortune { border-color: #5ce7a1; }
	.event-callout { position: absolute; z-index: 10; left: 50%; top: 19%; max-width: 82%; padding: 8px 14px; border: 1px solid rgba(224, 169, 70, 0.72); background: rgba(8, 21, 14, 0.82); color: #f2c86d; font: 800 0.68rem/1.2 system-ui, sans-serif; letter-spacing: 0.14em; text-align: center; text-shadow: 0 1px 8px #000; transform: translateX(-50%); pointer-events: none; }
	.world:has(.event-callout) .event-callout { animation: event-callout-in 0.24s ease-out; }
	@keyframes event-callout-in { from { opacity: 0; transform: translate(-50%, -8px) scale(0.94); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
	.world::before { content: ''; position: absolute; z-index: 2; inset: 0; pointer-events: none; opacity: calc(0.28 + var(--stage-intensity) * 0.42); transition: background 0.65s ease, opacity 0.65s ease; }
	.world, .far-forge, .near-forge, .ember-field { transition: filter 0.65s ease, box-shadow 0.65s ease, opacity 0.65s ease; }
	.ember-field { opacity: calc(0.38 + var(--stage-intensity) * 0.46); filter: saturate(calc(0.9 + var(--stage-intensity) * 0.8)); }
	.stage-forge-outskirts::before { background: radial-gradient(circle at 18% 82%, rgba(196, 79, 15, 0.2), transparent 32%), linear-gradient(rgba(0, 0, 0, 0.24), transparent 58%); }
	.stage-forge-outskirts .far-forge { filter: brightness(0.78) saturate(0.75); }
	.stage-lava-chamber::before { background: radial-gradient(ellipse at 50% 104%, rgba(255, 78, 5, 0.55), transparent 48%), linear-gradient(rgba(92, 16, 3, 0.2), rgba(52, 8, 1, 0.28)); }
	.stage-lava-chamber { box-shadow: inset 0 0 0 5px #1d0d07, inset 0 -80px 90px rgba(176, 36, 5, 0.22), 0 18px 50px rgba(0, 0, 0, 0.45); }
	.stage-lava-chamber .ember-field { filter: saturate(1.7) hue-rotate(-12deg); }
	.stage-ancient-tunnels::before { background: repeating-linear-gradient(103deg, transparent 0 15%, rgba(111, 91, 58, 0.11) 15.4% 15.8%, transparent 16.2% 31%), linear-gradient(90deg, rgba(0, 0, 0, 0.42), transparent 25% 72%, rgba(0, 0, 0, 0.46)); }
	.stage-ancient-tunnels .near-forge { filter: brightness(0.68) sepia(0.18); }
	.stage-dragon-territory::before { background: radial-gradient(circle at 78% 38%, rgba(192, 30, 13, 0.32), transparent 31%), repeating-linear-gradient(118deg, transparent 0 22%, rgba(255, 83, 26, 0.09) 22.4% 22.7%, transparent 23.1% 45%); }
	.stage-dragon-territory { box-shadow: inset 0 0 0 5px #1a100c, inset 0 0 72px rgba(153, 35, 16, 0.2), 0 18px 50px rgba(0, 0, 0, 0.45); }
	.stage-dragon-territory .near-forge, .stage-vault-approach .near-forge { animation: environment-sway 2.8s ease-in-out infinite alternate; }
	.stage-vault-approach::before { background: radial-gradient(circle at 78% 45%, rgba(69, 244, 157, 0.3), transparent 25%), radial-gradient(circle at 72% 53%, rgba(255, 192, 60, 0.28), transparent 42%), linear-gradient(90deg, transparent 45%, rgba(41, 129, 82, 0.16)); }
	.stage-vault-approach { box-shadow: inset 0 0 0 5px #071811, inset -80px 0 110px rgba(37, 184, 111, 0.16), 0 18px 50px rgba(0, 0, 0, 0.45); }
	.stage-readout strong { display: block; margin: 3px 0 0; color: #f0ca74; }
	.multiplier-readout strong { color: #7dffc2; font-size: 0.78rem; }
	.stage-transition { position: absolute; z-index: 12; top: 31%; left: 50%; display: grid; gap: 6px; width: min(430px, 78%); padding: 14px 18px; border-block: 1px solid rgba(226, 176, 75, 0.68); background: linear-gradient(90deg, transparent, rgba(4, 24, 17, 0.92) 18% 82%, transparent); text-align: center; pointer-events: none; transform: translateX(-50%); animation: stage-transition-in 1.05s ease both; }
	.stage-transition span { color: #67e8ac; font: 800 0.58rem/1 system-ui, sans-serif; letter-spacing: 0.2em; }
	.stage-transition strong { color: #f4cd78; font-size: clamp(1rem, 2.5vw, 1.55rem); letter-spacing: 0.12em; text-transform: uppercase; text-shadow: 0 2px 15px #000; }
	.flight-meter { position: absolute; z-index: 9; right: clamp(12px, 2vw, 22px); bottom: clamp(48px, 10%, 68px); left: clamp(12px, 2vw, 22px); display: grid; grid-template-columns: auto minmax(80px, 1fr) auto; align-items: center; gap: 9px; padding: 7px 10px 18px; border: 1px solid rgba(192, 143, 50, 0.52); background: rgba(3, 18, 13, 0.82); color: #b8b69e; font: 800 0.5rem/1 system-ui, sans-serif; letter-spacing: 0.12em; pointer-events: none; }
	.flight-meter-track { position: relative; height: 4px; border-radius: 999px; background: rgba(101, 111, 95, 0.45); box-shadow: inset 0 0 5px #000; }
	.flight-meter-track i { position: absolute; inset-block: 0; left: 0; border-radius: inherit; background: linear-gradient(90deg, #1cae70, #75f6b8, #e9bd58); box-shadow: 0 0 8px rgba(70, 232, 155, 0.5); transition: width 0.32s ease; }
	.flight-meter-track b { position: absolute; top: 50%; width: 11px; height: 11px; border: 2px solid #f0c460; border-radius: 50%; background: #1b8a5a; box-shadow: 0 0 10px #46df9a; transform: translate(-50%, -50%); transition: left 0.32s ease; }
	.flight-meter small { position: absolute; bottom: 4px; left: 50%; color: #79d9a8; font: 700 0.48rem/1 system-ui, sans-serif; letter-spacing: 0.1em; transform: translateX(-50%); white-space: nowrap; }
	@keyframes stage-transition-in { 0% { opacity: 0; transform: translate(-50%, 10px) scale(0.96); } 18%, 72% { opacity: 1; transform: translate(-50%, 0) scale(1); } 100% { opacity: 0; transform: translate(-50%, -7px) scale(1.02); } }
	@keyframes environment-sway { from { transform: translate3d(-3px, 0, 0) scale(1.015); } to { transform: translate3d(4px, -2px, 0) scale(1.025); } }
	.header-actions { display: flex; align-items: center; gap: 10px; }
	.help-button { display: grid; place-items: center; width: 44px; min-height: 44px; padding: 9px; border: 1px solid #b57e2c; border-radius: 50%; background: rgba(3, 19, 13, 0.86); color: #f3c96e; }
	.help-button svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
	@media (max-width: 620px) { .header-actions { gap: 7px; } .help-button { width: 40px; min-height: 40px; padding: 8px; } .stage-transition { top: 32%; padding: 10px 12px; } .flight-meter { right: 8px; bottom: 42px; left: 8px; gap: 6px; padding-inline: 7px; font-size: 0.44rem; } .flight-meter small { max-width: 72%; overflow: hidden; text-overflow: ellipsis; } }
	@media (prefers-reduced-motion: reduce) { .stage-dragon-territory .near-forge, .stage-vault-approach .near-forge, .stage-transition { animation: none; } .flight-meter-track i, .flight-meter-track b { transition: none; } }
	.multiplier-readout.pulse { animation: multiplier-hud-pulse 0.46s ease-out; }
	.multiplier-readout.pulse strong { text-shadow: 0 0 14px #70ffba; }
	.combo-feedback { position: absolute; z-index: 14; top: 34%; left: 27%; display: grid; gap: 4px; min-width: 128px; padding: 8px 12px; border-left: 2px solid #5bf1aa; background: linear-gradient(90deg, rgba(4, 34, 23, 0.92), transparent); color: #7af2b5; text-shadow: 0 2px 9px #000; pointer-events: none; animation: combo-pop 0.68s ease-out both; }
	.combo-feedback strong { color: #f3d17f; font: 900 0.65rem/1 system-ui, sans-serif; letter-spacing: 0.12em; }
	.combo-feedback span { font: 900 0.58rem/1 system-ui, sans-serif; letter-spacing: 0.16em; }
	.hazard-decoration { position: absolute; z-index: 1; inset: 0; overflow: visible; color: #d29c3e; pointer-events: none; }
	.hazard-decoration i, .hazard-decoration b, .hazard-decoration span { position: absolute; display: block; }
	.hazard-fireGate .gate-part { border-color: #e16a2c; box-shadow: inset 7px 0 15px rgba(255, 76, 13, 0.28), inset -7px 0 14px #000, 0 0 20px rgba(231, 71, 12, 0.4); }
	.hazard-fireGate .hazard-decoration i, .hazard-fireGate .hazard-decoration b { left: -13px; width: calc(100% + 26px); height: 35px; background: radial-gradient(ellipse at 50% 100%, #ffd364 0 9%, #ed5a1e 30%, transparent 68%); filter: drop-shadow(0 0 7px #e54c14); animation: fire-flicker 0.32s ease-in-out infinite alternate; }
	.hazard-fireGate .hazard-decoration i { top: 4%; }
	.hazard-fireGate .hazard-decoration b { bottom: 10%; transform: rotate(180deg); animation-delay: -0.17s; }
	.hazard-forgeHammer .gate-part { border-color: #d4ad60; background: repeating-linear-gradient(0deg, rgba(255,255,255,.08) 0 3px, transparent 3px 34px), linear-gradient(90deg, #181816, #524733 50%, #111); }
	.hazard-forgeHammer .hazard-decoration i { top: 29%; left: 42%; width: 10px; height: 43%; background: #a77831; transform-origin: 50% 0; animation: hammer-swing 0.72s ease-in-out infinite alternate; }
	.hazard-forgeHammer .hazard-decoration i::after { content: ''; position: absolute; left: 50%; bottom: -8px; width: 45px; height: 24px; border: 2px solid #d4a856; background: linear-gradient(#4b4437, #171716); transform: translateX(-50%); box-shadow: 0 0 9px rgba(238, 165, 63, 0.35); }
	.hazard-chainTunnel .gate-part { border-color: #8b8e7e; background: repeating-linear-gradient(135deg, #202722 0 9px, #0e1210 10px 20px); }
	.hazard-chainTunnel .hazard-decoration { background: repeating-linear-gradient(112deg, transparent 0 16px, rgba(185, 166, 112, 0.38) 17px 20px, transparent 21px 37px); opacity: 0.72; animation: chain-drift 0.8s linear infinite; }
	.hazard-lavaColumn .gate-part { border-color: #ff7a22; background: linear-gradient(90deg, #2d0c03, #ee4b0b 35%, #ffae31 52%, #b52d06 70%, #220703); box-shadow: 0 0 24px rgba(255, 74, 10, 0.68); }
	.hazard-lavaColumn .hazard-decoration span { inset: 0 -18px; background: radial-gradient(ellipse at 50% 30%, rgba(255, 192, 48, 0.45), transparent 48%); animation: lava-breathe 0.55s ease-in-out infinite alternate; }
	.hazard-spikeGate .gate-part::before { content: ''; position: absolute; left: -16px; width: calc(100% + 32px); height: 31px; background: linear-gradient(135deg, #d5a348, #26231d 62%); clip-path: polygon(0 0, 17% 100%, 32% 0, 49% 100%, 66% 0, 83% 100%, 100% 0); }
	.hazard-spikeGate .gate-part.upper::before { bottom: -29px; }
	.hazard-spikeGate .gate-part.lower::before { top: -29px; transform: rotate(180deg); }
	.hazard-windTunnel .gate-part { border-color: #5ec8c0; box-shadow: inset 0 0 16px rgba(74, 213, 202, 0.24), 0 0 18px rgba(62, 194, 185, 0.28); }
	.hazard-windTunnel .hazard-decoration { inset: 13% -115px; background: repeating-linear-gradient(170deg, transparent 0 25px, rgba(125, 240, 223, 0.48) 26px 28px, transparent 29px 48px); mask-image: linear-gradient(90deg, transparent, #000 25% 75%, transparent); animation: wind-stream 0.42s linear infinite; }
	.creature-flight.is-hit { animation: creature-hit 0.52s ease-out both; filter: sepia(0.8) saturate(2) drop-shadow(0 0 17px #ff6533); }
	@keyframes multiplier-hud-pulse { 35% { transform: scale(1.16); color: #baffd7; } }
	@keyframes combo-pop { 0% { opacity: 0; transform: translate(-12px, 8px) scale(0.88); } 24%, 72% { opacity: 1; transform: translate(0, 0) scale(1); } 100% { opacity: 0; transform: translate(12px, -8px) scale(1.03); } }
	@keyframes fire-flicker { to { transform: scale(1.12, 0.76) translateY(-3px); filter: brightness(1.35) drop-shadow(0 0 10px #ff6a17); } }
	@keyframes hammer-swing { from { transform: rotate(-14deg); } to { transform: rotate(16deg); } }
	@keyframes chain-drift { to { background-position: 38px 0; } }
	@keyframes lava-breathe { to { opacity: 0.48; filter: brightness(1.5); } }
	@keyframes wind-stream { to { background-position: -48px 0; } }
	@keyframes creature-hit { 20% { transform: translate(-50%, -50%) rotate(-18deg) scale(1.12); } 55% { opacity: 0.82; transform: translate(-50%, -50%) rotate(24deg) scale(0.9); } 100% { opacity: 0.5; } }
	@media (max-width: 620px) { .combo-feedback { top: 37%; left: 18%; min-width: 110px; padding: 6px 9px; } }
	@media (prefers-reduced-motion: reduce) { .multiplier-readout.pulse, .combo-feedback, .hazard-decoration, .hazard-decoration i, .hazard-decoration b, .creature-flight.is-hit { animation: none; } }
	.weather-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
	.weather-options button { display: grid; grid-template-columns: 22px minmax(0, 1fr); align-items: center; gap: 7px; min-height: 54px; padding: 7px; text-align: left; }
	.weather-options b { display: block; min-width: 0; }
	.weather-options b { font-size: 0.62rem; letter-spacing: 0.05em; }
	.weather-indicator { position: relative; display: block; width: 20px; height: 20px; overflow: hidden; border: 1px solid #a47930; border-radius: 50%; background: #17251e; box-shadow: inset 0 0 8px #000; }
	.weather-indicator::before, .weather-indicator::after { content: ''; position: absolute; }
	.weather-indicator.weather-clear::before { inset: 5px; border-radius: 50%; background: #f0ca63; box-shadow: 0 0 7px #f0b847; }
	.weather-indicator.weather-rain, .weather-indicator.weather-storm { background: linear-gradient(#273b48, #101c22); }
	.weather-indicator.weather-rain::before, .weather-indicator.weather-storm::before { inset: 2px; background: repeating-linear-gradient(110deg, transparent 0 4px, #80bec8 5px 6px); }
	.weather-indicator.weather-storm::after { top: 3px; left: 8px; width: 5px; height: 13px; background: #f4dc7b; clip-path: polygon(55% 0, 100% 0, 65% 43%, 100% 43%, 18% 100%, 42% 55%, 0 55%); }
	.weather-indicator.weather-fog::before { inset: 4px 1px; background: repeating-linear-gradient(0deg, rgba(211, 221, 211, 0.75) 0 2px, transparent 3px 5px); filter: blur(0.5px); }
	.weather-indicator.weather-snow::before { inset: 2px; background: radial-gradient(circle at 25% 35%, #e4f5ef 0 1px, transparent 2px), radial-gradient(circle at 70% 28%, #e4f5ef 0 1.5px, transparent 2.5px), radial-gradient(circle at 48% 75%, #e4f5ef 0 1px, transparent 2px); }
	.weather-indicator.weather-inferno { background: radial-gradient(circle at 50% 80%, #ffba37, #bc3b0a 35%, #25110a 68%); box-shadow: inset 0 0 7px #2a0903, 0 0 6px rgba(255, 87, 18, 0.45); }
	.weather-trail { position: absolute; z-index: -1; top: 42%; right: 72%; display: block; width: 48%; height: 26%; pointer-events: none; opacity: 0.8; }
	.weather-trail.clear { display: none; }
	.weather-trail.rain { border-top: 2px solid rgba(139, 220, 224, 0.6); border-radius: 50%; filter: drop-shadow(0 0 3px #5ab5bb); }
	.weather-trail.storm { width: 72%; border-block: 2px solid rgba(135, 224, 216, 0.55); transform: skewX(-25deg); filter: drop-shadow(0 0 5px #7acbd4); }
	.weather-trail.fog { width: 85%; height: 55%; border-radius: 50%; background: rgba(205, 217, 205, 0.23); filter: blur(7px); }
	.weather-trail.snow { height: 42%; background: radial-gradient(circle at 20% 30%, #e7f8f1 0 1px, transparent 2px), radial-gradient(circle at 58% 78%, #e7f8f1 0 1.5px, transparent 2.5px), radial-gradient(circle at 88% 18%, #e7f8f1 0 1px, transparent 2px); }
	.weather-trail.inferno { width: 70%; height: 54%; background: radial-gradient(circle at 20% 50%, #ffc54b 0 2px, transparent 3px), radial-gradient(circle at 55% 24%, #f26a1c 0 2px, transparent 3px), radial-gradient(circle at 82% 74%, #d54b19 0 1px, transparent 2px); filter: drop-shadow(0 0 5px #ff5c18); animation: creature-ember-trail 0.42s ease-in-out infinite alternate; }
	.time-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
	.time-options button { display: grid; grid-template-columns: 22px minmax(0, 1fr); align-items: center; gap: 7px; min-height: 54px; padding: 7px; text-align: left; }
	.time-options b { display: block; min-width: 0; }
	.time-options b { font-size: 0.62rem; letter-spacing: 0.05em; }
	.time-indicator { position: relative; display: block; width: 20px; height: 20px; overflow: hidden; border: 1px solid #a47930; border-radius: 50%; background: #17251e; box-shadow: inset 0 0 8px #000; }
	.time-indicator::before, .time-indicator::after { content: ''; position: absolute; }
	.time-indicator.time-dawn { background: linear-gradient(#697f95 0 45%, #e79b68 72%, #433027); }
	.time-indicator.time-dawn::before { right: 3px; bottom: 3px; width: 7px; height: 7px; border-radius: 50%; background: #ffd181; box-shadow: 0 0 5px #f3a85d; }
	.time-indicator.time-day { background: linear-gradient(#6eabb4, #b8d5bc); }
	.time-indicator.time-day::before { inset: 5px; border-radius: 50%; background: #ffe28d; box-shadow: 0 0 7px #f6bf54; }
	.time-indicator.time-sunset { background: linear-gradient(#64243a, #d85b30 58%, #f0a044); }
	.time-indicator.time-sunset::before { right: 3px; bottom: 1px; width: 9px; height: 9px; border-radius: 50%; background: #ffc15d; box-shadow: 0 0 6px #ff6c25; }
	.time-indicator.time-night { background: radial-gradient(circle at 65% 30%, #d5ded5 0 2px, transparent 3px), linear-gradient(#071126, #152d3b); }
	.time-indicator.time-eclipse { background: radial-gradient(circle, #050505 0 28%, #cf5931 32% 39%, #1e060a 48%); box-shadow: inset 0 0 7px #000, 0 0 6px rgba(198, 59, 28, 0.45); }
	.time-night .gate-part, .time-eclipse .gate-part { filter: brightness(calc(0.92 + var(--time-glow) * 0.13)) contrast(1.08); }
	.time-night .jump-ember, .time-eclipse .jump-ember { filter: brightness(var(--time-glow)); }
	.time-night .creature-flight, .time-eclipse .creature-flight { filter: drop-shadow(0 0 10px rgba(89, 232, 171, 0.3)) drop-shadow(0 7px 8px rgba(0, 0, 0, 0.65)); }
	.creature-frame { position: absolute; top: 50%; left: 50%; display: block; width: 300%; height: 300%; max-width: none; object-fit: contain; object-position: center; transform: translate(-50%, -50%); user-select: none; pointer-events: none; }
	.creature-preview.with-image { overflow: hidden; }
	.creature-preview.with-image::before, .creature-preview.with-image::after { display: none; }
	.creature-preview-image { position: absolute; top: 50%; left: 50%; display: block; width: 280%; height: 280%; max-width: none; object-fit: contain; transform: translate(-50%, -50%); }
	.dev-scenario-panel { display: grid; grid-template-columns: auto minmax(120px, 1fr); align-items: center; gap: 7px 10px; padding: 10px; border: 1px dashed #c35b75; background: linear-gradient(135deg, rgba(48, 8, 24, 0.76), rgba(16, 7, 18, 0.8)); font-family: system-ui, sans-serif; }
	.dev-scenario-panel > div { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.dev-scenario-panel strong { color: #ff8ca7; font-size: 0.62rem; letter-spacing: 0.15em; }
	.dev-scenario-panel span { color: #9e7e8b; font-size: 0.46rem; letter-spacing: 0.08em; }
	.dev-scenario-panel label { color: #d4a7b1; font: 800 0.56rem/1 system-ui, sans-serif; letter-spacing: 0.1em; }
	.dev-scenario-panel select { min-width: 0; width: 100%; min-height: 36px; padding: 6px 28px 6px 9px; border: 1px solid #93475d; background: #170b11; color: #f2c3ce; font: 700 0.66rem/1 system-ui, sans-serif; }
	.dev-scenario-panel select:focus-visible { border-color: #ff8ca7; outline: 2px solid rgba(255, 112, 147, 0.22); outline-offset: 1px; }
	.dev-scenario-panel select:disabled { cursor: not-allowed; opacity: 0.5; }
	@keyframes creature-ember-trail { to { opacity: 0.35; transform: translateX(-9px) scale(1.08); } }
	@media (max-width: 900px) { .weather-section, .time-section { grid-column: 1 / -1; } }
	@media (max-width: 620px) { .weather-options, .time-options { grid-template-columns: repeat(2, minmax(0, 1fr)); } .weather-options button, .time-options button { min-height: 50px; } .dev-scenario-panel { grid-template-columns: 1fr; } .dev-scenario-panel > div { display: grid; } }
	@media (prefers-reduced-motion: reduce) { .weather-trail.inferno { animation: none; } }

	/* Compact setup deck: the flight scene remains primary while setup stays viewport-bound. */
	.prototype-shell { padding: clamp(10px, 1.5vw, 22px); }
	.prototype-header { align-items: center; margin-bottom: clamp(8px, 1.2vh, 14px); }
	.prototype-header .eyebrow { font-size: 0.58rem; }
	.prototype-header h1 { margin-top: 2px; font-size: clamp(1.45rem, 2.45vw, 2.45rem); }
	.status-chip { min-width: 132px; padding: 8px 12px; font-size: 0.62rem; }
	.help-button { width: 38px; min-height: 38px; padding: 8px; }
	.help-button svg { width: 19px; height: 19px; }

	.game-layout {
		--game-panel-height: clamp(430px, calc(100dvh - 112px), 760px);
		grid-template-columns: minmax(0, 4fr) minmax(270px, 1fr);
		gap: clamp(10px, 1.35vw, 20px);
		align-items: stretch;
	}
	.world, .control-panel { height: var(--game-panel-height); min-height: 0; }

	.flight-hud {
		top: 10px;
		right: 10px;
		left: 10px;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 0;
		padding: 6px 9px;
		border-color: rgba(189, 139, 46, 0.48);
		background: linear-gradient(90deg, rgba(3, 17, 12, 0.88), rgba(5, 28, 19, 0.78));
		font-size: 0.56rem;
		line-height: 1.15;
		transform: none;
	}
	.hud-selection { display: flex; min-width: 0; gap: clamp(8px, 1.25vw, 18px); overflow: hidden; }
	.hud-selection span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
	.flight-hud .stage-readout, .flight-hud .multiplier-readout { display: grid; gap: 2px; min-width: 104px; padding-left: 10px; margin-left: 10px; border-left: 1px solid rgba(199, 153, 63, 0.3); }
	.flight-hud .stage-readout strong, .flight-hud .multiplier-readout strong { display: block; margin: 0; }
	.flight-hud .multiplier-readout { min-width: 72px; }

	.control-panel {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
		overflow: hidden;
		padding: clamp(10px, 1.2vw, 15px);
		background:
			linear-gradient(145deg, rgba(13, 42, 30, 0.97), rgba(5, 13, 10, 0.99)),
			radial-gradient(circle at 50% 0, rgba(48, 218, 140, 0.12), transparent 42%);
	}
	.control-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); flex: 0 0 auto; padding: 3px; border: 1px solid rgba(163, 119, 41, 0.48); background: rgba(0, 0, 0, 0.28); }
	.control-tabs button { min-height: 36px; border: 0; background: transparent; color: #8e9587; font-size: 0.68rem; letter-spacing: 0.18em; box-shadow: none; }
	.control-tabs button.active { background: linear-gradient(180deg, rgba(32, 132, 88, 0.42), rgba(10, 55, 37, 0.5)); color: #84f3bd; box-shadow: inset 0 -2px #4fe3a1; }

	.control-tab-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 2px 4px 2px 1px; scrollbar-width: thin; scrollbar-color: #836326 rgba(0, 0, 0, 0.18); }
	.control-tab-body::-webkit-scrollbar { width: 5px; }
	.control-tab-body::-webkit-scrollbar-thumb { background: #836326; }
	.control-section { padding: 10px 0 12px; border-bottom-color: rgba(199, 153, 63, 0.2); }
	.control-section:first-child { padding-top: 5px; }
	.control-section:last-child { border-bottom: 0; }
	.section-heading { align-items: end; margin-bottom: 7px; }
	.section-heading span { margin-top: 3px; font-size: 0.56rem; }
	.control-section p { font-size: 0.61rem; }

	.bet-stepper { grid-template-columns: 42px minmax(0, 1fr) 42px; gap: 7px; }
	.bet-stepper button { width: 42px; height: 42px; min-height: 42px; font-size: 1.1rem; }
	.bet-input { padding: 10px 6px; font-size: 0.93rem; }

	.segmented-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
	.segmented-options button, .path-options button {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		min-height: 45px;
		padding: 6px 4px;
		text-align: center;
		text-transform: uppercase;
	}
	.segmented-options button b, .path-options button b { font-size: 0.58rem; letter-spacing: 0.06em; }
	.path-options button span { color: #d8ac57; font: 700 0.8rem/1 system-ui, sans-serif; }
	.selected-description { min-height: 1.2em; margin: 6px 2px 0 !important; color: #919c91 !important; font: 0.56rem/1.35 system-ui, sans-serif !important; letter-spacing: 0.02em !important; text-transform: none; }
	.selected-description strong { color: #d7ba79; font-size: inherit; }

	.creature-options { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
	.creature-options button, .creature-options button:last-child {
		display: grid;
		grid-column: auto;
		grid-template-columns: 1fr;
		grid-template-rows: 31px auto;
		justify-items: center;
		gap: 4px;
		min-width: 0;
		min-height: 58px;
		padding: 5px 3px;
		text-align: center;
	}
	.creature-preview { width: 40px; height: 29px; }
	.creature-copy { min-width: 0; width: 100%; }
	.creature-copy b { display: block; overflow: hidden; font-size: 0.54rem; line-height: 1.1; text-overflow: ellipsis; white-space: nowrap; }

	.weather-options { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
	.weather-options button, .time-options button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		min-width: 0;
		min-height: 39px;
		padding: 5px 4px;
		text-align: center;
	}
	.weather-options b, .time-options b { min-width: 0; overflow: hidden; font-size: 0.53rem; line-height: 1.05; text-overflow: ellipsis; white-space: nowrap; }
	.weather-indicator, .time-indicator { flex: 0 0 auto; width: 17px; height: 17px; }
	.time-options { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }

	.dev-scenario-panel { display: block; flex: 0 0 auto; padding: 0; border-style: solid; }
	.dev-tools-toggle { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 30px; padding: 5px 8px; border: 0; background: rgba(39, 8, 20, 0.64); box-shadow: none; text-align: left; }
	.dev-tools-toggle span { display: flex; align-items: center; gap: 8px; }
	.dev-tools-toggle small { color: #8f7480; font: 0.45rem/1 system-ui, sans-serif; letter-spacing: 0.08em; }
	.dev-tools-toggle > b { color: #d4778f; font: 700 1rem/1 system-ui, sans-serif; }
	.dev-tools-body { display: grid !important; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 7px; padding: 7px; border-top: 1px solid rgba(195, 91, 117, 0.38); }

	.control-footer { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(128px, 1.15fr); align-items: stretch; gap: 8px; flex: 0 0 auto; padding-top: 9px; border-top: 1px solid rgba(206, 157, 60, 0.42); background: linear-gradient(180deg, rgba(5, 16, 11, 0.12), rgba(5, 16, 11, 0.96) 25%); }
	.control-summary { display: grid; align-content: center; gap: 3px; min-width: 0; padding: 3px 0 3px 3px; font-family: system-ui, sans-serif; text-transform: uppercase; }
	.control-summary div { display: flex; align-items: baseline; gap: 6px; }
	.control-summary span, .control-summary small { color: #838d83; font-size: 0.48rem; letter-spacing: 0.1em; }
	.control-summary strong { color: #f1cf82; font-size: 0.75rem; }
	.control-summary p { margin: 0; overflow: hidden; color: #5ee9a8; font-size: 0.56rem; letter-spacing: 0.07em; text-overflow: ellipsis; white-space: nowrap; }
	.control-summary small { display: block; }
	.fly-button { min-height: 56px; margin: 0; padding: 8px; font-size: clamp(0.88rem, 1.3vw, 1.08rem); letter-spacing: 0.11em; }

	@media (max-width: 900px) {
		.game-layout { --game-panel-height: clamp(390px, 58dvh, 560px); grid-template-columns: 1fr; }
		.control-panel { display: flex; height: clamp(440px, 70dvh, 580px); }
		.world { height: var(--game-panel-height); min-height: 0; }
		.control-tab-body { overflow: auto; }
		.weather-section, .time-section { grid-column: auto; }
	}

	@media (max-width: 620px) {
		.prototype-shell { padding: 9px; }
		.prototype-header { flex-wrap: nowrap; gap: 8px; }
		.prototype-header .eyebrow { display: none; }
		.prototype-header h1 { margin: 0; font-size: clamp(1.15rem, 5.8vw, 1.65rem); }
		.header-actions { flex: 0 0 auto; }
		.status-chip { min-width: 98px; padding: 7px 8px; font-size: 0.5rem; }
		.help-button { width: 34px; min-height: 34px; padding: 7px; }
		.game-layout { --game-panel-height: clamp(340px, 55dvh, 470px); gap: 10px; }
		.control-panel { height: min(540px, calc(100dvh - 18px)); min-height: 430px; padding: 10px; }
		.flight-hud { top: 6px; right: 6px; left: 6px; grid-template-columns: minmax(0, 1fr) auto auto; gap: 0; padding: 5px 6px; font-size: 0.45rem; }
		.hud-selection { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 7px; }
		.flight-hud .stage-readout, .flight-hud .multiplier-readout { min-width: 68px; padding-left: 6px; margin-left: 6px; }
		.flight-hud .stage-readout { max-width: 84px; }
		.flight-hud .stage-readout strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.flight-hud .multiplier-readout { min-width: 54px; }
		.control-tabs button { min-height: 34px; }
		.control-footer { grid-template-columns: minmax(0, 1fr) minmax(132px, 1.25fr); }
		.creature-options { grid-template-columns: repeat(3, minmax(0, 1fr)); }
		.weather-options, .time-options { grid-template-columns: repeat(3, minmax(0, 1fr)); }
		.weather-options button, .time-options button { min-height: 39px; }
		footer { display: none; }
	}

	@media (max-width: 390px) {
		.control-panel { min-height: 420px; }
		.creature-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.control-footer { grid-template-columns: 1fr; gap: 5px; }
		.control-summary { display: flex; align-items: center; justify-content: space-between; gap: 7px; padding-inline: 2px; }
		.control-summary small { display: none; }
		.fly-button { min-height: 50px; }
	}
</style>
