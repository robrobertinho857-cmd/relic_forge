export const SYMBOL_IDS = [
	'dragon',
	'crown',
	'sword',
	'shield',
	'ruby',
	'emerald',
	'sapphire',
	'amber',
	'wild',
	'scatter',
] as const;

export type SymbolId = (typeof SYMBOL_IDS)[number];
export type ReelMatrix = SymbolId[][];
export type GamePhase =
	| 'boot'
	| 'ready'
	| 'spinning'
	| 'revealing'
	| 'presentingWin'
	| 'featureTrigger'
	| 'freeSpins'
	| 'error';

export type Position = { reel: number; row: number };
export type RelicWildVariant = 'standard' | 'super' | 'mythic';
export type RelicWildState = Position & { multiplier: number };
export type RelicWildWinLine = {
	lineIndex: number;
	baseWin: number;
	multiplier: number;
	win: number;
	relicWilds: RelicWildState[];
};
export type RoundEvent = {
	index?: number;
	type?: string;
	board?: unknown;
	amount?: number;
	totalWin?: number;
	totalFs?: number;
	total?: number;
	multiplier?: number;
	anticipation?: number[];
	wins?: unknown[];
	variant?: RelicWildVariant;
	wilds?: unknown[];
	stickyRelicWilds?: unknown[];
	remainingFreeSpins?: number;
	featureWin?: number;
	cleared?: boolean;
};

export type RoundState = {
	roundID?: number;
	amount?: number;
	payout?: number;
	payoutMultiplier?: number;
	active?: boolean;
	event?: string | number | null;
	mode?: string;
	state?: unknown[];
	presentationNormalized?: boolean;
};

export const ROUND_EVENT_TYPES = new Set([
	'reveal',
	'winInfo',
	'setWin',
	'setTotalWin',
	'freeSpinTrigger',
	'updateFreeSpin',
	'freeSpinEnd',
	'finalWin',
	'newRelicWilds',
	'relicWildState',
	'relicWildWin',
	'updateGlobalMult',
	'multiplier',
	'wincap',
]);

export type Balance = { amount: number; currency: string };
export type SpinResult = { round: RoundState; balance?: Balance };
