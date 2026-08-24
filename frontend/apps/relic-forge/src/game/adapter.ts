import { API_AMOUNT_MULTIPLIER, BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { requestBet, requestEndEvent, requestEndRound } from 'rgs-requests';
import { stateBet, stateUrlDerived } from 'state-shared';
import type {
	RelicWildState,
	RelicWildVariant,
	Position,
	ReelMatrix,
	RoundEvent,
	RoundState,
	SpinResult,
} from './types';
import { ROUND_EVENT_TYPES } from './types';
import { INITIAL_MATRIX } from './config';
import { isMockBonusMode } from './modes';

export const isReplayMode = () => stateUrlDerived.replay();
const isRgsSession = () => Boolean(stateUrlDerived.sessionID() && stateUrlDerived.rgsUrl());

const WILD_WIN_MATRIX: ReelMatrix = [
	['crown', 'ruby', 'sapphire'],
	['crown', 'emerald', 'amber'],
	['wild', 'ruby', 'shield'],
	['crown', 'dragon', 'sword'],
	['crown', 'amber', 'shield'],
];

const SCATTER_MATRICES: ReelMatrix[] = [
	[
		['dragon', 'scatter', 'sapphire'],
		['crown', 'emerald', 'amber'],
		['scatter', 'sword', 'shield'],
		['ruby', 'dragon', 'crown'],
		['sapphire', 'amber', 'scatter'],
	],
	[
		['dragon', 'ruby', 'sapphire'],
		['crown', 'emerald', 'scatter'],
		['sword', 'ruby', 'shield'],
		['scatter', 'dragon', 'crown'],
		['sapphire', 'scatter', 'amber'],
	],
	[
		['dragon', 'ruby', 'scatter'],
		['crown', 'scatter', 'amber'],
		['sword', 'ruby', 'shield'],
		['emerald', 'dragon', 'crown'],
		['scatter', 'amber', 'amber'],
	],
];

type FeatureSpin = {
	wilds: RelicWildState[];
	newWilds?: RelicWildState[];
	totalWin?: number;
	wins?: Array<{
		lineIndex: number;
		baseWin: number;
		multiplier: number;
		win: number;
		positions: Position[];
		participants: RelicWildState[];
	}>;
};

const featureBoard = (wilds: RelicWildState[], wins: FeatureSpin['wins'] = []): unknown[][] => {
	const board: unknown[][] = INITIAL_MATRIX.map((reel) => [...reel]);
	for (const win of wins) {
		for (const position of win.positions) board[position.reel][position.row] = 'amber';
	}
	for (const wild of wilds) {
		board[wild.reel][wild.row] = {
			name: 'wild',
			wild: true,
			multiplier: wild.multiplier,
		};
	}
	return board;
};

const FEATURE_SCENARIOS: Record<RelicWildVariant, FeatureSpin[]> = {
	standard: [
		{ wilds: [] },
		{
			wilds: [{ reel: 1, row: 1, multiplier: 2 }],
			newWilds: [{ reel: 1, row: 1, multiplier: 2 }],
		},
		{
			wilds: [{ reel: 1, row: 1, multiplier: 2 }],
			totalWin: 300,
			wins: [
				{
					lineIndex: 2,
					baseWin: 75,
					multiplier: 2,
					win: 150,
					positions: [0, 1, 2, 3, 4].map((reel) => ({ reel, row: 1 })),
					participants: [{ reel: 1, row: 1, multiplier: 2 }],
				},
				{
					lineIndex: 10,
					baseWin: 75,
					multiplier: 2,
					win: 150,
					positions: [0, 1, 2, 3, 4].map((reel, index) => ({
						reel,
						row: [0, 1, 1, 1, 2][index],
					})),
					participants: [{ reel: 1, row: 1, multiplier: 2 }],
				},
			],
		},
		{
			wilds: [
				{ reel: 1, row: 1, multiplier: 2 },
				{ reel: 3, row: 1, multiplier: 3 },
			],
			newWilds: [{ reel: 3, row: 1, multiplier: 3 }],
		},
		{
			wilds: [
				{ reel: 1, row: 1, multiplier: 2 },
				{ reel: 3, row: 1, multiplier: 3 },
			],
			totalWin: 3000,
			wins: [
				{
					lineIndex: 2,
					baseWin: 600,
					multiplier: 5,
					win: 3000,
					positions: [0, 1, 2, 3, 4].map((reel) => ({ reel, row: 1 })),
					participants: [
						{ reel: 1, row: 1, multiplier: 2 },
						{ reel: 3, row: 1, multiplier: 3 },
					],
				},
			],
		},
		...Array.from({ length: 3 }, () => ({
			wilds: [
				{ reel: 1, row: 1, multiplier: 2 },
				{ reel: 3, row: 1, multiplier: 3 },
			],
		})),
	],
	super: [
		{
			wilds: [{ reel: 2, row: 1, multiplier: 3 }],
			newWilds: [{ reel: 2, row: 1, multiplier: 3 }],
		},
		...Array.from({ length: 2 }, () => ({
			wilds: [{ reel: 2, row: 1, multiplier: 3 }],
		})),
		{
			wilds: [
				{ reel: 2, row: 1, multiplier: 3 },
				{ reel: 4, row: 1, multiplier: 5 },
			],
			newWilds: [{ reel: 4, row: 1, multiplier: 5 }],
		},
		{
			wilds: [
				{ reel: 2, row: 1, multiplier: 3 },
				{ reel: 4, row: 1, multiplier: 5 },
			],
			totalWin: 4800,
			wins: [
				{
					lineIndex: 2,
					baseWin: 600,
					multiplier: 8,
					win: 4800,
					positions: [0, 1, 2, 3, 4].map((reel) => ({ reel, row: 1 })),
					participants: [
						{ reel: 2, row: 1, multiplier: 3 },
						{ reel: 4, row: 1, multiplier: 5 },
					],
				},
			],
		},
		...Array.from({ length: 3 }, () => ({
			wilds: [
				{ reel: 2, row: 1, multiplier: 3 },
				{ reel: 4, row: 1, multiplier: 5 },
			],
		})),
	],
	mythic: [
		{
			wilds: [{ reel: 1, row: 1, multiplier: 10 }],
			newWilds: [{ reel: 1, row: 1, multiplier: 10 }],
		},
		{
			wilds: [
				{ reel: 1, row: 1, multiplier: 10 },
				{ reel: 3, row: 1, multiplier: 20 },
			],
			newWilds: [{ reel: 3, row: 1, multiplier: 20 }],
		},
		{
			wilds: [
				{ reel: 1, row: 1, multiplier: 10 },
				{ reel: 3, row: 1, multiplier: 20 },
				{ reel: 4, row: 1, multiplier: 5 },
			],
			newWilds: [{ reel: 4, row: 1, multiplier: 5 }],
		},
		{
			wilds: [
				{ reel: 1, row: 1, multiplier: 10 },
				{ reel: 3, row: 1, multiplier: 20 },
				{ reel: 4, row: 1, multiplier: 5 },
			],
			totalWin: 21_000,
			wins: [
				{
					lineIndex: 2,
					baseWin: 600,
					multiplier: 35,
					win: 21_000,
					positions: [0, 1, 2, 3, 4].map((reel) => ({ reel, row: 1 })),
					participants: [
						{ reel: 1, row: 1, multiplier: 10 },
						{ reel: 3, row: 1, multiplier: 20 },
						{ reel: 4, row: 1, multiplier: 5 },
					],
				},
			],
		},
		...Array.from({ length: 4 }, () => ({
			wilds: [
				{ reel: 1, row: 1, multiplier: 10 },
				{ reel: 3, row: 1, multiplier: 20 },
				{ reel: 4, row: 1, multiplier: 5 },
			],
		})),
	],
};

const FEATURE_POSITION_POOL = Array.from({ length: 15 }, (_, index) => ({
	reel: Math.floor(index / 3),
	row: index % 3,
}));
const FEATURE_VARIANT_SEEDS: Record<RelicWildVariant, number> = {
	standard: 0x13579bdf,
	super: 0x2468ace0,
	mythic: 0x7f4a7c15,
};
const FEATURE_MULTIPLIERS: Record<RelicWildVariant, number[]> = {
	standard: [2, 3],
	super: [3, 5],
	mythic: [10, 20, 5],
};

const featurePositionsFor = (variant: RelicWildVariant, roundSeed: number) => {
	const positions = FEATURE_POSITION_POOL.map((position) => ({ ...position }));
	let state =
		(FEATURE_VARIANT_SEEDS[variant] ^ Math.imul(Math.trunc(roundSeed) + 1, 0x45d9f3b)) >>> 0;
	for (let index = positions.length - 1; index > 0; index -= 1) {
		state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
		const swapIndex = state % (index + 1);
		[positions[index], positions[swapIndex]] = [positions[swapIndex], positions[index]];
	}
	return new Map(
		FEATURE_MULTIPLIERS[variant].map((multiplier, index) => [multiplier, positions[index]]),
	);
};

const remapFeatureSpin = (
	spin: FeatureSpin,
	positions: Map<number, { reel: number; row: number }>,
): FeatureSpin => {
	const remapWild = (wild: RelicWildState): RelicWildState => {
		const position = positions.get(wild.multiplier);
		return position ? { ...wild, ...position } : wild;
	};
	return {
		...spin,
		wilds: spin.wilds.map(remapWild),
		newWilds: spin.newWilds?.map(remapWild),
		wins: spin.wins?.map((win) => ({
			...win,
			participants: win.participants.map(remapWild),
		})),
	};
};

const createFeatureEvents = (
	scatterMatrix: ReelMatrix,
	variant: RelicWildVariant,
	roundSeed = 0,
): { events: RoundEvent[]; totalWin: number } => {
	const events: RoundEvent[] = [
		{ index: 0, type: 'reveal', board: scatterMatrix, anticipation: [4] },
		{ index: 1, type: 'setTotalWin', amount: 0 },
		{ index: 2, type: 'freeSpinTrigger', totalFs: 8 },
	];
	let featureWin = 0;

	const positions = featurePositionsFor(variant, roundSeed);
	FEATURE_SCENARIOS[variant]
		.map((spin) => remapFeatureSpin(spin, positions))
		.forEach((spin, spinIndex) => {
			events.push({ type: 'updateFreeSpin', amount: spinIndex, total: 8 });
			events.push({ type: 'reveal', board: featureBoard(spin.wilds, spin.wins) });
			if (spin.newWilds?.length) {
				events.push({ type: 'newRelicWilds', variant, wilds: spin.newWilds });
			}
			events.push({
				type: 'relicWildState',
				variant,
				remainingFreeSpins: 7 - spinIndex,
				featureWin,
				stickyRelicWilds: spin.wilds,
				cleared: false,
			});
			if (spin.totalWin && spin.wins?.length) {
				events.push({
					type: 'winInfo',
					totalWin: spin.totalWin,
					wins: spin.wins.map((win) => ({
						symbol: 'amber',
						kind: win.positions.length,
						win: win.win,
						positions: win.positions,
						meta: {
							lineIndex: win.lineIndex,
							multiplier: win.multiplier,
							winWithoutMult: win.baseWin,
							globalMult: 1,
							lineMultiplier: win.multiplier,
						},
					})),
				});
				events.push({
					type: 'relicWildWin',
					totalWin: spin.totalWin,
					wins: spin.wins.map((win) => ({
						lineIndex: win.lineIndex,
						baseWin: win.baseWin,
						multiplier: win.multiplier,
						win: win.win,
						relicWilds: win.participants,
					})),
				});
				events.push({ type: 'setWin', amount: spin.totalWin });
				featureWin += spin.totalWin;
			}
			events.push({ type: 'setTotalWin', amount: featureWin });
		});

	events.push({
		type: 'relicWildState',
		variant,
		remainingFreeSpins: 0,
		featureWin,
		stickyRelicWilds: [],
		cleared: true,
	});
	events.push({ type: 'freeSpinEnd', amount: featureWin });
	events.push({ type: 'finalWin', amount: featureWin });
	return {
		events: events.map((event, index) => ({ ...event, index })),
		totalWin: featureWin,
	};
};

const STANDARD_FEATURE = createFeatureEvents(SCATTER_MATRICES[0], 'standard', 0);

type MockRoundFixture = {
	roundID: number;
	payoutMultiplier: number;
	state: RoundEvent[];
};

const mockLossRound = (roundID: number): MockRoundFixture => ({
	roundID,
	payoutMultiplier: 0,
	state: [
		{ index: 0, type: 'reveal', board: INITIAL_MATRIX },
		{ index: 1, type: 'winInfo', totalWin: 0 },
		{ index: 2, type: 'finalWin', amount: 0 },
	],
});

const mockPaylineWinEvent = (totalWin: number): RoundEvent => ({
	type: 'winInfo',
	totalWin,
	wins: [
		{
			symbol: 'crown',
			kind: 5,
			win: totalWin,
			positions: [0, 1, 2, 3, 4].map((reel) => ({ reel, row: 0 })),
			meta: {
				lineIndex: 1,
				multiplier: 1,
				winWithoutMult: totalWin,
				globalMult: 1,
				lineMultiplier: 1,
			},
		},
	],
});

const MOCK_ROUNDS: MockRoundFixture[] = [
	mockLossRound(1),
	{
		roundID: 2,
		payoutMultiplier: 8,
		state: [
			{ index: 0, type: 'reveal', board: WILD_WIN_MATRIX },
			{ ...mockPaylineWinEvent(800), index: 1 },
			{ index: 2, type: 'finalWin', amount: 800 },
		],
	},
	mockLossRound(3),
	{
		roundID: 4,
		payoutMultiplier: STANDARD_FEATURE.totalWin / BOOK_AMOUNT_MULTIPLIER,
		state: STANDARD_FEATURE.events,
	},
	mockLossRound(5),
	{
		roundID: 6,
		payoutMultiplier: 30,
		state: [
			{ index: 0, type: 'reveal', board: WILD_WIN_MATRIX },
			{ ...mockPaylineWinEvent(3000), index: 1 },
			{ index: 2, type: 'finalWin', amount: 3000 },
		],
	},
	mockLossRound(7),
	{
		roundID: 8,
		payoutMultiplier: 80,
		state: [
			{ index: 0, type: 'reveal', board: WILD_WIN_MATRIX },
			{ ...mockPaylineWinEvent(8000), index: 1 },
			{ index: 2, type: 'finalWin', amount: 8000 },
		],
	},
	mockLossRound(9),
];

const bonusVariantFor = (mode: string): RelicWildVariant =>
	mode.toUpperCase() === 'SUPER_BONUS'
		? 'super'
		: mode.toUpperCase() === 'MYTHIC_BONUS'
			? 'mythic'
			: 'standard';

const mockRound = (spin: number, mode: string, bet: number): SpinResult => {
	const fixtureIndex = Math.max(0, spin - 1);
	const scatterMatrix = SCATTER_MATRICES[fixtureIndex % SCATTER_MATRICES.length];
	if (isMockBonusMode(mode)) {
		const feature = createFeatureEvents(scatterMatrix, bonusVariantFor(mode), spin);
		const payoutMultiplier = feature.totalWin / BOOK_AMOUNT_MULTIPLIER;
		return {
			round: {
				roundID: 10_000 + spin,
				amount: bet * API_AMOUNT_MULTIPLIER,
				payout: bet * payoutMultiplier * API_AMOUNT_MULTIPLIER,
				payoutMultiplier,
				mode,
				state: feature.events,
			},
		};
	}
	const index = fixtureIndex % MOCK_ROUNDS.length;
	const fixture = MOCK_ROUNDS[index];
	const state =
		fixture.state === STANDARD_FEATURE.events
			? createFeatureEvents(
					SCATTER_MATRICES[Math.floor(fixtureIndex / MOCK_ROUNDS.length) % SCATTER_MATRICES.length],
					'standard',
					Math.floor(fixtureIndex / MOCK_ROUNDS.length),
				).events
			: fixture.state;
	return {
		round: {
			...fixture,
			amount: bet * API_AMOUNT_MULTIPLIER,
			payout: bet * fixture.payoutMultiplier * API_AMOUNT_MULTIPLIER,
			mode,
			state,
		},
	};
};

const monetaryAmountEvents = new Set(['setWin', 'setTotalWin', 'freeSpinEnd', 'finalWin']);
const bookAmountToDisplay = (value: unknown, bet: number) =>
	typeof value === 'number' ? (value / BOOK_AMOUNT_MULTIPLIER) * bet : value;

const normalizeBookEvent = (event: RoundEvent, bet: number): RoundEvent => {
	const normalized = { ...event };
	if (monetaryAmountEvents.has(event.type ?? '')) {
		normalized.amount = bookAmountToDisplay(event.amount, bet) as number | undefined;
	}
	if (event.type === 'winInfo' || event.type === 'relicWildWin') {
		normalized.totalWin = bookAmountToDisplay(event.totalWin, bet) as number | undefined;
	}
	if (event.type === 'relicWildState') {
		normalized.featureWin = bookAmountToDisplay(event.featureWin, bet) as number | undefined;
	}
	if ((event.type === 'winInfo' || event.type === 'relicWildWin') && Array.isArray(event.wins)) {
		normalized.wins = event.wins.map((entry) => {
			if (typeof entry !== 'object' || entry === null) return entry;
			const win = entry as Record<string, unknown>;
			const meta =
				typeof win.meta === 'object' && win.meta !== null
					? (win.meta as Record<string, unknown>)
					: undefined;
			return {
				...win,
				baseWin: bookAmountToDisplay(win.baseWin, bet),
				win: bookAmountToDisplay(win.win, bet),
				...(meta
					? {
							meta: {
								...meta,
								winWithoutMult: bookAmountToDisplay(meta.winWithoutMult, bet),
							},
						}
					: {}),
			};
		});
	}
	return normalized;
};

export const normalizeRoundForPresentation = (round: RoundState, bet: number): RoundState => {
	if (!round || !Array.isArray(round.state))
		throw new Error('The server returned an invalid round state.');
	if (round.presentationNormalized) {
		asEvents(round.state);
		return round;
	}
	return {
		...round,
		amount: typeof round.amount === 'number' ? round.amount / API_AMOUNT_MULTIPLIER : round.amount,
		payout: typeof round.payout === 'number' ? round.payout / API_AMOUNT_MULTIPLIER : round.payout,
		state: asEvents(round.state).map((event) => normalizeBookEvent(event, bet)),
		presentationNormalized: true,
	};
};

export const playAuthoritativeRound = async (
	bet: number,
	spin: number,
	mode = 'BASE',
): Promise<SpinResult> => {
	if (stateUrlDerived.demo() && import.meta.env.DEV) return mockRound(spin, mode, bet);
	if (!isRgsSession() || isReplayMode())
		throw new Error('A live Stake session is required to wager.');

	const response = await requestBet({
		rgsUrl: stateUrlDerived.rgsUrl(),
		sessionID: stateUrlDerived.sessionID(),
		currency: stateBet.currency || 'USD',
		amount: bet,
		mode,
	});

	if (response?.error) throw new Error('The forge could not accept this wager.');
	if (!response?.round?.state) throw new Error('The forge returned an invalid round.');
	const balance = response.balance
		? {
				amount: response.balance.amount / API_AMOUNT_MULTIPLIER,
				currency: response.balance.currency,
			}
		: undefined;
	return { round: response.round as RoundState, balance };
};

const completedRoundKeys = new Set<string>();

const recordedEventKeys = new Set<string>();
const recordingEventPromises = new Map<string, Promise<void>>();

export const recordAuthoritativeEvent = async (roundKey: string | number, eventIndex: number) => {
	if (!isRgsSession() || isReplayMode()) return;
	// The browser verifier uses a local RGS fixture endpoint. It intentionally
	// does not emulate /bet/event; production sessions always use the helper below.
	if (import.meta.env.DEV && stateUrlDerived.rgsUrl() === 'mock.local') return;
	if (!Number.isInteger(eventIndex) || eventIndex < 0)
		throw new Error('The round contained an invalid event index.');
	const key = `${stateUrlDerived.sessionID()}:${roundKey}:${eventIndex}`;
	if (recordedEventKeys.has(key)) return;
	const existing = recordingEventPromises.get(key);
	if (existing) return existing;
	const request = (async () => {
		const response = await requestEndEvent({
			eventIndex,
			rgsUrl: stateUrlDerived.rgsUrl(),
			sessionID: stateUrlDerived.sessionID(),
		});
		if (response?.error) throw new Error('The authoritative event could not be recorded.');
		recordedEventKeys.add(key);
	})();
	recordingEventPromises.set(key, request);
	try {
		await request;
	} finally {
		recordingEventPromises.delete(key);
	}
};

export const completeAuthoritativeRound = async (
	roundKey: string | number,
): Promise<number | undefined> => {
	if (!isRgsSession() || isReplayMode()) return undefined;
	const completionKey = `${stateUrlDerived.sessionID()}:${roundKey}`;
	if (completedRoundKeys.has(completionKey)) return undefined;

	// Claim before the request. An uncertain financial response must be recovered
	// from authenticate/round state, not retried as a second end-round call.
	completedRoundKeys.add(completionKey);
	const response = await requestEndRound({
		rgsUrl: stateUrlDerived.rgsUrl(),
		sessionID: stateUrlDerived.sessionID(),
	});
	if (response?.error) throw new Error('The forge could not complete this round.');
	return response?.balance ? response.balance.amount / API_AMOUNT_MULTIPLIER : undefined;
};

export const asEvents = (state: unknown): RoundEvent[] => {
	if (!Array.isArray(state) || state.length === 0)
		throw new Error('The round did not contain an event book.');
	const events = state.map((event, position) => {
		if (
			typeof event !== 'object' ||
			event === null ||
			typeof (event as RoundEvent).type !== 'string'
		)
			throw new Error(`The round contained an invalid event at position ${position}.`);
		const typed = event as RoundEvent;
		if (!ROUND_EVENT_TYPES.has(typed.type!))
			throw new Error(`Unsupported authoritative event: ${typed.type}.`);
		if (typed.index !== undefined && typed.index !== position)
			throw new Error(`The round event index ${typed.index} does not match position ${position}.`);
		return { ...typed, index: typed.index ?? position };
	});
	if (events[0]?.type !== 'reveal')
		throw new Error('The round must begin with an authoritative reveal event.');
	if (!events.some((event) => event.type === 'finalWin'))
		throw new Error('The round did not contain an authoritative final result.');
	return events;
};
