<script lang="ts">
	import { onMount } from 'svelte';
	import { stateBet, stateConfig, stateUrlDerived } from 'state-shared';
	import { BET_LEVELS, INITIAL_MATRIX, REEL_COUNT, ROW_COUNT, SYMBOLS } from '../game/config';
	import {
		asEvents,
		completeAuthoritativeRound,
		normalizeRoundForPresentation,
		playAuthoritativeRound,
	} from '../game/adapter';
	import {
		BONUS_MODE_DEFINITIONS,
		PLAY_MODE_DEFINITIONS,
		resolveModes,
		type ResolvedMode,
	} from '../game/modes';
	import { getSpinTiming, RELIC_WILD_PRESENTATION } from '../game/spinConfig';
	import type {
		GamePhase,
		RelicWildState,
		RelicWildVariant,
		RelicWildWinLine,
		ReelMatrix,
		RoundEvent,
		RoundState,
		SymbolId,
	} from '../game/types';
	import BonusConfirmModal from './BonusConfirmModal.svelte';
	import ModeSelection from './ModeSelection.svelte';
	import MultiplierCombine from './MultiplierCombine.svelte';
	import RelicWildOverlay from './RelicWildOverlay.svelte';
	import ReelGrid from './ReelGrid.svelte';

	type ReelGridController = {
		startSpin: (turbo: boolean) => void;
		stopAt: (
			result: ReelMatrix,
			options: { turbo: boolean; anticipationReels?: number[] },
		) => Promise<void>;
		reset: (result: ReelMatrix) => void;
	};

	let phase = $state<GamePhase>('boot');
	let matrix = $state<ReelMatrix>(INITIAL_MATRIX);
	let spinCount = $state(0);
	let lastWin = $state(0);
	let displayedWin = $state(0);
	let multiplier = $state(1);
	let freeSpins = $state(0);
	let totalFreeSpins = $state(0);
	let freeSpinWin = $state(0);
	let stickyRelicWilds = $state<RelicWildState[]>([]);
	let activatingRelicWildKeys = $state<string[]>([]);
	let relicWildVariant = $state<RelicWildVariant>('standard');
	let relicWildWinLine = $state<RelicWildWinLine | null>(null);
	let winTier = $state<'normal' | 'big' | 'mega'>('normal');
	let errorMessage = $state('');
	let showPaytable = $state(false);
	let showSettings = $state(false);
	let showModeSelection = $state(false);
	let activePlayModeId = $state('normal');
	let draftPlayModeId = $state('normal');
	let pendingBonusModeId = $state<string | null>(null);
	let soundEnabled = $state(true);
	let turbo = $state(false);
	let reelGrid = $state<ReelGridController>();
	let baseSpinAudio: HTMLAudioElement | undefined;
	let roundInFlight = false;
	let modalTitle = $derived(freeSpins > 0 ? 'FORGE OF FATE' : 'RELIC FORGE');
	let isBusy = $derived(
		phase === 'spinning' ||
			phase === 'revealing' ||
			phase === 'presentingWin' ||
			phase === 'featureTrigger' ||
			phase === 'freeSpins',
	);
	let currency = $derived(stateBet.currency || 'USD');
	let bet = $derived(stateBet.betAmount || 1);
	let balance = $derived(stateBet.balanceAmount);
	let isMockMode = $derived(!stateUrlDerived.sessionID());
	let playModes = $derived(
		resolveModes(PLAY_MODE_DEFINITIONS, {
			mock: isMockMode,
			authenticatedModes: stateConfig.betModes,
		}),
	);
	let bonusModes = $derived(
		resolveModes(BONUS_MODE_DEFINITIONS, {
			mock: isMockMode,
			authenticatedModes: stateConfig.betModes,
			buyFeatureDisabled: stateConfig.jurisdiction?.disabledBuyFeature,
		}),
	);
	let activePlayMode = $derived(
		playModes.find((mode) => mode.id === activePlayModeId && mode.available) ?? playModes[0],
	);
	let visibleModeTitle = $derived(
		freeSpins > 0
			? `${relicWildVariant.toUpperCase()} FREE SPINS`
			: (activePlayMode?.title ?? 'NORMAL'),
	);
	let visibleModeDetail = $derived(
		freeSpins > 0
			? `${freeSpins} OF ${totalFreeSpins} REMAINING`
			: `${activePlayMode?.costMultiplier ?? 1}x BET · CHANGE MODE`,
	);
	let visibleModeTheme = $derived(
		freeSpins > 0
			? relicWildVariant === 'super'
				? 'purple'
				: relicWildVariant === 'mythic'
					? 'mythic'
					: 'blue'
			: (activePlayMode?.theme ?? 'blue'),
	);
	let pendingBonusMode = $derived(
		pendingBonusModeId ? bonusModes.find((mode) => mode.id === pendingBonusModeId) : undefined,
	);
	let firstAvailableBonusMode = $derived(bonusModes.find((mode) => mode.available));
	let canOpenModeSelection = $derived(
		Boolean(
			!isBusy &&
				phase !== 'error' &&
				freeSpins <= 0 &&
				(playModes.some((mode) => mode.available) || bonusModes.some((mode) => mode.available)),
		),
	);
	let canBuyPendingBonus = $derived(
		Boolean(
			pendingBonusMode?.available &&
				canOpenModeSelection &&
				bet * pendingBonusMode.costMultiplier > 0 &&
				bet * pendingBonusMode.costMultiplier <= balance,
		),
	);

	const wait = (ms: number) =>
		new Promise<void>((resolve) => setTimeout(resolve, turbo ? Math.max(80, ms * 0.35) : ms));
	const formatMoney = (amount: number) =>
		new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency,
			minimumFractionDigits: 2,
		}).format(amount);
	const symbolFor = (value: unknown): SymbolId =>
		typeof value === 'string' && value in SYMBOLS
			? (value as SymbolId)
			: typeof value === 'object' &&
				  value !== null &&
				  typeof (value as { name?: unknown }).name === 'string' &&
				  (value as { name: string }).name in SYMBOLS
				? ((value as { name: string }).name as SymbolId)
				: 'amber';
	const relicWildFrom = (value: unknown): RelicWildState | null => {
		if (typeof value !== 'object' || value === null) return null;
		const candidate = value as Partial<RelicWildState>;
		const reel = Number(candidate.reel);
		const row = Number(candidate.row);
		const wildMultiplier = Number(candidate.multiplier);
		if (
			!Number.isInteger(reel) ||
			!Number.isInteger(row) ||
			reel < 0 ||
			reel >= REEL_COUNT ||
			row < 0 ||
			row >= ROW_COUNT ||
			!Number.isFinite(wildMultiplier) ||
			wildMultiplier < 2
		)
			return null;
		return { reel, row, multiplier: wildMultiplier };
	};
	const relicWildsFrom = (value: unknown) =>
		Array.isArray(value)
			? value.map(relicWildFrom).filter((wild): wild is RelicWildState => wild !== null)
			: [];
	const relicWinLinesFrom = (value: unknown): RelicWildWinLine[] =>
		Array.isArray(value)
			? value.flatMap((entry) => {
					if (typeof entry !== 'object' || entry === null) return [];
					const line = entry as Partial<RelicWildWinLine>;
					const relicWilds = relicWildsFrom(line.relicWilds);
					if (!relicWilds.length) return [];
					return [
						{
							lineIndex: Number(line.lineIndex) || 0,
							baseWin: Number(line.baseWin) || 0,
							multiplier: Number(line.multiplier) || 1,
							win: Number(line.win) || 0,
							relicWilds,
						},
					];
				})
			: [];
	const relicKey = (wild: RelicWildState) => `${wild.reel}:${wild.row}`;
	const mergeRelicWilds = (current: RelicWildState[], incoming: RelicWildState[]) => {
		const merged = new Map(current.map((wild) => [relicKey(wild), wild]));
		for (const wild of incoming) merged.set(relicKey(wild), wild);
		return [...merged.values()].sort(
			(left, right) => left.reel - right.reel || left.row - right.row,
		);
	};
	const emitRelicAudioHook = (name: string) => {
		if (!soundEnabled) return;
		window.dispatchEvent(new CustomEvent('relic-forge:audio', { detail: { name } }));
	};
	const matrixFrom = (board: unknown): ReelMatrix | null => {
		if (!Array.isArray(board)) return null;
		const next = board
			.slice(0, REEL_COUNT)
			.map((reel) =>
				Array.isArray(reel) ? reel.slice(0, ROW_COUNT).map(symbolFor) : ['amber', 'amber', 'amber'],
			);
		while (next.length < REEL_COUNT) next.push(['amber', 'amber', 'amber']);
		return next;
	};

	const applyEvent = (event: RoundEvent) => {
		if (event.type === 'freeSpinTrigger') {
			stickyRelicWilds = [];
			activatingRelicWildKeys = [];
			totalFreeSpins = Number(event.totalFs) || 8;
			freeSpins = totalFreeSpins;
			phase = 'featureTrigger';
		}
		if (event.type === 'updateFreeSpin') {
			if (typeof event.total === 'number' && typeof event.amount === 'number')
				freeSpins = Math.max(0, event.total - event.amount);
		}
		if (event.type === 'freeSpinEnd') {
			freeSpins = 0;
			stickyRelicWilds = [];
			activatingRelicWildKeys = [];
			if (typeof event.amount === 'number') freeSpinWin = event.amount;
		}
		if (event.type === 'newRelicWilds') {
			const newWilds = relicWildsFrom(event.wilds);
			stickyRelicWilds = mergeRelicWilds(stickyRelicWilds, newWilds);
			activatingRelicWildKeys = newWilds.map(relicKey);
			if (event.variant) relicWildVariant = event.variant;
		}
		if (event.type === 'relicWildState') {
			stickyRelicWilds = relicWildsFrom(event.stickyRelicWilds);
			if (event.variant) relicWildVariant = event.variant;
			if (typeof event.remainingFreeSpins === 'number')
				freeSpins = Math.max(0, event.remainingFreeSpins);
			if (typeof event.featureWin === 'number') freeSpinWin = event.featureWin;
			if (event.cleared) {
				stickyRelicWilds = [];
				activatingRelicWildKeys = [];
			}
		}
		if (event.type === 'relicWildWin') {
			const [line] = relicWinLinesFrom(event.wins);
			relicWildWinLine = line ?? null;
			if (line) multiplier = Math.max(1, line.multiplier);
		}
		if (event.type === 'updateGlobalMult' || event.type === 'multiplier')
			multiplier = Math.max(1, Number(event.multiplier) || 1);
		if (event.type === 'winInfo' || event.type === 'setWin' || event.type === 'setTotalWin')
			lastWin = Number(event.totalWin ?? event.amount) || 0;
		if (event.type === 'finalWin') lastWin = Number(event.amount) || lastWin;
	};

	const countUpWin = async (target: number) => {
		const steps = turbo ? 6 : 18;
		for (let index = 1; index <= steps; index += 1) {
			displayedWin = target * (index / steps);
			await wait(35);
		}
		displayedWin = target;
	};
	const stopSpinAudio = () => {
		for (const audio of [baseSpinAudio]) {
			audio?.pause();
			if (audio) audio.currentTime = 0;
		}
	};
	const toggleSound = () => {
		soundEnabled = !soundEnabled;
		if (!soundEnabled) stopSpinAudio();
	};
	const playSpinSound = () => {
		if (!soundEnabled) return;
		stopSpinAudio();
		void baseSpinAudio?.play().catch(() => undefined);
	};

	const processRound = async (round: RoundState, spinAlreadyStarted = false) => {
		const events = asEvents(round.state);
		let revealCount = 0;
		let activeReelTurbo = turbo;
		if (!spinAlreadyStarted) {
			phase = 'spinning';
			activeReelTurbo = turbo;
			reelGrid?.startSpin(activeReelTurbo);
			playSpinSound();
		}
		for (const event of events) {
			if (event.type === 'reveal') {
				const authoritativeMatrix = matrixFrom(event.board);
				if (!authoritativeMatrix) throw new Error('The round did not contain a valid reel matrix.');
				if (revealCount > 0) {
					if (freeSpins > 0)
						await new Promise<void>((resolve) =>
							setTimeout(resolve, getSpinTiming(turbo).freeSpinCadenceDelay),
						);
					phase = freeSpins > 0 ? 'freeSpins' : 'spinning';
					activeReelTurbo = turbo;
					reelGrid?.startSpin(activeReelTurbo);
					playSpinSound();
				}
				phase = 'revealing';
				await reelGrid?.stopAt(authoritativeMatrix, {
					turbo: activeReelTurbo,
					anticipationReels: event.anticipation,
				});
				stopSpinAudio();
				matrix = authoritativeMatrix;
				revealCount += 1;
				continue;
			}
			applyEvent(event);
			if (event.type === 'freeSpinTrigger') await wait(700);
			if (event.type === 'newRelicWilds') {
				emitRelicAudioHook('relicWildLand');
				emitRelicAudioHook('relicMultiplierReveal');
				await wait(RELIC_WILD_PRESENTATION.activationDuration);
				emitRelicAudioHook('relicWildLock');
				activatingRelicWildKeys = [];
			}
			if (event.type === 'relicWildWin' && relicWildWinLine) {
				for (const line of relicWinLinesFrom(event.wins)) {
					relicWildWinLine = line;
					multiplier = Math.max(1, line.multiplier);
					emitRelicAudioHook('relicMultiplierCombine');
					await wait(RELIC_WILD_PRESENTATION.combineDuration);
				}
				relicWildWinLine = null;
			}
			if (event.type === 'winInfo' || event.type === 'setWin' || event.type === 'setTotalWin')
				await wait(200);
		}
		if (revealCount === 0) throw new Error('The round did not contain a reveal event.');
		const payout = Number(round.payout ?? lastWin) || lastWin;
		lastWin = payout;
		const nextWinTier = payout >= bet * 75 ? 'mega' : payout >= bet * 25 ? 'big' : 'normal';
		winTier = nextWinTier;
		phase = payout > 0 ? 'presentingWin' : 'revealing';
		await countUpWin(payout);
		if (payout > 0 && freeSpins > 0) freeSpinWin += payout;
		if (freeSpins > 0 && payout > 0) phase = 'freeSpins';
		await wait(payout > bet * 25 ? 1200 : 500);
		const authoritativeBalance = await completeAuthoritativeRound(
			round.roundID ?? `local-${spinCount}`,
		);
		if (authoritativeBalance !== undefined) stateBet.balanceAmount = authoritativeBalance;
		if (freeSpins <= 0) phase = 'ready';
	};

	const playRound = async (mode: string, costMultiplier: number) => {
		const wagerCost = bet * costMultiplier;
		if (
			roundInFlight ||
			isBusy ||
			phase === 'error' ||
			bet <= 0 ||
			wagerCost <= 0 ||
			(balance > 0 && wagerCost > balance)
		)
			return;
		roundInFlight = true;
		phase = 'spinning';
		errorMessage = '';
		displayedWin = 0;
		lastWin = 0;
		winTier = 'normal';
		multiplier = 1;
		spinCount += 1;
		freeSpinWin = 0;
		stickyRelicWilds = [];
		activatingRelicWildKeys = [];
		relicWildWinLine = null;
		reelGrid?.startSpin(turbo);
		playSpinSound();
		try {
			const result = await playAuthoritativeRound(bet, spinCount, mode);
			const round = normalizeRoundForPresentation(result.round, bet);
			if (result.balance) {
				stateBet.currency = result.balance.currency;
				stateBet.balanceAmount = result.balance.amount;
			} else if (!stateUrlDerived.sessionID()) {
				stateBet.balanceAmount = Math.max(0, balance - wagerCost + Number(round.payout ?? 0));
			}
			await processRound(round, true);
		} catch (error) {
			stopSpinAudio();
			reelGrid?.reset(matrix);
			console.error('[RGS]', error);
			phase = 'error';
			errorMessage =
				error instanceof Error ? error.message : 'The forge is temporarily unavailable.';
		} finally {
			roundInFlight = false;
		}
	};
	const spin = () => {
		if (!activePlayMode?.available) return;
		void playRound(activePlayMode.mode, activePlayMode.costMultiplier);
	};
	const openModeSelection = () => {
		if (!canOpenModeSelection) return;
		draftPlayModeId = activePlayModeId;
		showModeSelection = true;
	};
	const closeModeSelection = () => {
		draftPlayModeId = activePlayModeId;
		pendingBonusModeId = null;
		showModeSelection = false;
	};
	const selectPlayMode = (mode: ResolvedMode) => {
		if (mode.kind === 'play' && mode.available) draftPlayModeId = mode.id;
	};
	const startSelectedMode = () => {
		const selectedMode = playModes.find((mode) => mode.id === draftPlayModeId && mode.available);
		if (!selectedMode) return;
		activePlayModeId = selectedMode.id;
		stateBet.activeBetModeKey = selectedMode.mode;
		showModeSelection = false;
	};
	const openBonusConfirmation = (mode: ResolvedMode) => {
		if (mode.kind === 'bonus' && mode.available) pendingBonusModeId = mode.id;
	};
	const closeBonusConfirmation = () => {
		pendingBonusModeId = null;
	};
	const buyBonus = () => {
		const selectedMode = pendingBonusMode;
		if (!selectedMode || !canBuyPendingBonus) return;
		pendingBonusModeId = null;
		showModeSelection = false;
		void playRound(selectedMode.mode, selectedMode.costMultiplier);
	};

	const changeBet = (direction: number) => {
		if (isBusy || freeSpins > 0) return;
		const current = BET_LEVELS.findIndex((level) => level >= bet);
		const next = Math.max(
			0,
			Math.min(BET_LEVELS.length - 1, (current < 0 ? BET_LEVELS.length - 1 : current) + direction),
		);
		stateBet.betAmount = BET_LEVELS[next];
	};

	onMount(() => {
		baseSpinAudio = new Audio('/sounds/spin-base.wav');
		baseSpinAudio.preload = 'auto';
		baseSpinAudio.loop = true;
		baseSpinAudio.volume = 0.62;
		const storedTurbo = localStorage.getItem('relic-forge-turbo');
		turbo = storedTurbo === 'true';
		if (!stateUrlDerived.sessionID() && stateBet.balanceAmount === 0)
			stateBet.balanceAmount = 845.22;
		if (!stateBet.betAmount) stateBet.betAmount = 1;
		const resumedMode = playModes.find(
			(mode) =>
				mode.available && mode.mode.toUpperCase() === stateBet.activeBetModeKey.toUpperCase(),
		);
		if (resumedMode) {
			activePlayModeId = resumedMode.id;
			draftPlayModeId = resumedMode.id;
		}
		phase = 'ready';
		const resume = stateBet.betToResume;
		if (resume?.state) {
			queueMicrotask(async () => {
				try {
					await processRound(
						normalizeRoundForPresentation({ ...resume, state: resume.state } as RoundState, bet),
					);
					stateBet.betToResume = null;
				} catch (error) {
					phase = 'error';
					errorMessage = 'This round could not be restored safely.';
					console.error('[ROUND]', error);
				}
			});
		}
		return stopSpinAudio;
	});
</script>

<main class:feature-mode={freeSpins > 0} class="forge-shell">
	<div class="ambient ambient-one"></div>
	<div class="ambient ambient-two"></div>
	<header class="topbar">
		<div class="brand-mark" aria-label="Relic Forge home">
			<span>✦</span>
			<div><strong>RELIC</strong><small>FORGE</small></div>
		</div>
		<div class="header-center">
			<span class="eyebrow">THE ANCIENT VAULT</span>
			<h1>{modalTitle}</h1>
			<button
				type="button"
				class="active-mode-indicator theme-{visibleModeTheme}"
				data-active-mode={freeSpins > 0 ? relicWildVariant : activePlayMode?.id}
				disabled={!canOpenModeSelection}
				aria-label={`Active mode: ${visibleModeTitle}${canOpenModeSelection ? '. Change mode' : ''}`}
				onclick={openModeSelection}
			>
				<span>ACTIVE MODE</span>
				<strong>{visibleModeTitle}</strong>
				<small>{visibleModeDetail}</small>
			</button>
		</div>
		<div class="header-actions">
			<button class="icon-button" aria-label="Open paytable" onclick={() => (showPaytable = true)}
				>?</button
			><button class="icon-button" aria-label="Open settings" onclick={() => (showSettings = true)}
				>⚙</button
			>
		</div>
	</header>

	<div class="playfield">
		<aside class="side-action-rail" aria-label="Game options">
			<button
				class="bonus-buy-control"
				disabled={!canOpenModeSelection}
				aria-label="Choose play mode or buy Free Spins"
				onclick={openModeSelection}
			></button>
			<div class="quick-controls">
				<button
					class="turbo-control"
					aria-label="Toggle turbo"
					class:active={turbo}
					onclick={() => {
						turbo = !turbo;
						localStorage.setItem('relic-forge-turbo', String(turbo));
					}}><span>ϟ</span><small>TURBO</small></button
				><button
					class="sound-control"
					aria-label="Toggle sound"
					class:active={!soundEnabled}
					onclick={toggleSound}><span>{soundEnabled ? '◖' : '◌'}</span><small>SOUND</small></button
				><button
					class="paytable-control"
					aria-label="Open paytable from controls"
					onclick={() => (showPaytable = true)}><span>♧</span><small>PAYTABLE</small></button
				>
			</div>
		</aside>
		<section class="game-stage" aria-label="Relic Forge slot game">
			<div class="stage-heading">
				<span class="rule"></span><span>TWENTY WAYS TO UNEARTH A RELIC</span><span class="rule"
				></span>
			</div>
			<div class="reel-frame" class:spinning={phase === 'spinning' || phase === 'revealing'}>
				<div class="frame-corner corner-tl">⌜</div>
				<div class="frame-corner corner-tr">⌝</div>
				<div class="frame-corner corner-bl">⌞</div>
				<div class="frame-corner corner-br">⌟</div>
				<div class="reels" aria-live="polite">
					<ReelGrid bind:this={reelGrid} {matrix} />
					<RelicWildOverlay
						wilds={stickyRelicWilds}
						variant={relicWildVariant}
						activatingKeys={activatingRelicWildKeys}
						spinning={phase === 'spinning' || phase === 'freeSpins'}
					/>
				</div>
			</div>
		</section>
	</div>

	{#if freeSpins > 0}
		<section class="feature-banner" aria-live="polite">
			<span class="feature-orb">✦</span>
			<div class="feature-copy">
				<span class="eyebrow">FREE SPINS ACTIVE</span>
				<strong>RELICS REMAINING</strong>
				<small>TOTAL WIN · {formatMoney(freeSpinWin)}</small>
			</div>
			<strong class="feature-count">{freeSpins}</strong>
		</section>
	{/if}

	<section class="control-deck">
		<div class="control-left">
			<div class="stat-block">
				<span class="eyebrow">BALANCE</span><strong>{formatMoney(balance)}</strong><small
					>{currency}</small
				>
			</div>
			<div class="bet-control">
				<div class="bet-row">
					<button
						aria-label="Decrease bet"
						disabled={isBusy || freeSpins > 0}
						onclick={() => changeBet(-1)}>−</button
					><strong>{formatMoney(bet)}</strong><button
						aria-label="Increase bet"
						disabled={isBusy || freeSpins > 0}
						onclick={() => changeBet(1)}>+</button
					>
				</div>
			</div>
		</div>
		<button
			class="spin-button"
			class:pressed={isBusy}
			disabled={isBusy || phase === 'error' || !activePlayMode?.available}
			onclick={spin}
			><span class="spin-ring"></span><strong>{isBusy ? 'FORGING' : 'SPIN'}</strong><small
				>{isBusy
					? 'OUTCOME SEALED'
					: `${activePlayMode?.title ?? 'NORMAL'} · ${activePlayMode?.costMultiplier ?? 1}×`}</small
			></button
		>
		<div class="control-right">
			<div class="win-readout" class:active={displayedWin > 0}>
				<span class="eyebrow">CURRENT WIN</span><strong>{formatMoney(displayedWin)}</strong
				>{#if multiplier > 1}<em>×{multiplier} FORGE MULTIPLIER</em>{/if}
			</div>
		</div>
	</section>
	<footer class="footer-note">
		<span>5 REELS · 3 ROWS · 20 PAYLINES</span><span class="status-dot"></span><span
			>{stateUrlDerived.sessionID() ? 'STAKE ENGINE SESSION' : 'DEVELOPMENT MOCK MODE'}</span
		>
	</footer>
</main>

{#if relicWildWinLine}
	<MultiplierCombine line={relicWildWinLine} {currency} />
{/if}

{#if showModeSelection}
	<ModeSelection
		{playModes}
		{bonusModes}
		selectedPlayModeId={draftPlayModeId}
		{bet}
		{currency}
		mock={isMockMode}
		onselectplay={selectPlayMode}
		onselectbonus={openBonusConfirmation}
		onstart={startSelectedMode}
		onclose={closeModeSelection}
	/>
{/if}

{#if pendingBonusMode}
	<BonusConfirmModal
		mode={pendingBonusMode}
		{bet}
		{balance}
		{currency}
		canBuy={canBuyPendingBonus}
		oncancel={closeBonusConfirmation}
		onconfirm={buyBonus}
	/>
{/if}

{#if winTier !== 'normal' && phase === 'presentingWin'}
	<div class="big-win-overlay" aria-live="assertive">
		<span class="eyebrow">THE VAULT ANSWERS</span>
		<strong>{winTier === 'mega' ? 'MEGA WIN' : 'BIG WIN'}</strong>
		<b>{formatMoney(displayedWin)}</b>
		<span>THE RELICS HAVE BEEN FORGED</span>
	</div>
{/if}

{#if phase === 'error'}
	<div class="toast error-toast" role="alert">
		<strong>THE FORGE IS COLD</strong><span>{errorMessage}</span><button
			onclick={() => (phase = 'ready')}>DISMISS</button
		>
	</div>
{/if}

{#if showPaytable || showSettings}
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) {
				showPaytable = false;
				showSettings = false;
			}
		}}
	>
		<section
			class="modal-panel"
			role="dialog"
			aria-modal="true"
			aria-label={showPaytable ? 'Paytable' : 'Settings'}
		>
			<button
				class="modal-close"
				aria-label="Close"
				onclick={() => {
					showPaytable = false;
					showSettings = false;
				}}>×</button
			>
			{#if showPaytable}
				<span class="eyebrow">RELIC FORGE · PAYTABLE</span>
				<h2>Know the relics.</h2>
				<p class="modal-intro">
					Wins are awarded from left to right across one of 20 fixed paylines. The Arcane Forge
					substitutes for paying symbols; three Portals awaken the free-spin vault.
				</p>
				<div class="paytable-grid">
					{#each Object.values(SYMBOLS) as symbol}{#if symbol.payouts}<div class="pay-row">
								<span
									class="pay-symbol"
									data-symbol={symbol.id}
									style={`--accent: ${symbol.accent}`}
								></span><span><b>{symbol.label}</b><small>{symbol.shortLabel}</small></span><span
									class="pays"
									>{symbol.payouts[3]}× <small>/</small>
									{symbol.payouts[4]}× <small>/</small>
									{symbol.payouts[5]}×</span
								>
							</div>{/if}{/each}
				</div>
				<div class="specials">
					<span><b>✦ WILD</b> substitutes for regular relics.</span><span
						><b>◎ SCATTER</b> 3+ triggers 8 free spins.</span
					>
				</div>
			{:else}
				<span class="eyebrow">RELIC FORGE · SETTINGS</span>
				<h2>Forge your atmosphere.</h2>
				<div class="setting-row">
					<span
						><b>Turbo presentation</b><small
							>Shortens visual sequences only. It never changes the outcome.</small
						></span
					><button
						class:active={turbo}
						onclick={() => {
							turbo = !turbo;
							localStorage.setItem('relic-forge-turbo', String(turbo));
						}}>{turbo ? 'ON' : 'OFF'}</button
					>
				</div>
				<div class="setting-row">
					<span><b>Reel sound</b><small>The selected track runs only while reels move.</small></span
					><button class:active={soundEnabled} onclick={toggleSound}
						>{soundEnabled ? 'ON' : 'OFF'}</button
					>
				</div>
				<p class="dev-note">
					Development build · initial math values are placeholders pending simulation and Stake
					approval.
				</p>
			{/if}
		</section>
	</div>
{/if}
