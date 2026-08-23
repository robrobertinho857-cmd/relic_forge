import type { SymbolId } from './types';

export type SymbolDefinition = {
	id: SymbolId;
	label: string;
	shortLabel: string;
	type: 'high' | 'low' | 'wild' | 'scatter';
	glyph: string;
	accent: string;
	payouts: { 3: number; 4: number; 5: number } | null;
};

export const SYMBOLS: Record<SymbolId, SymbolDefinition> = {
	dragon: {
		id: 'dragon',
		label: 'Dragon Crest',
		shortLabel: 'DRAGON',
		type: 'high',
		glyph: '◈',
		accent: '#d9a441',
		payouts: { 3: 12, 4: 30, 5: 100 },
	},
	crown: {
		id: 'crown',
		label: 'Forged Crown',
		shortLabel: 'CROWN',
		type: 'high',
		glyph: '♛',
		accent: '#f1c96b',
		payouts: { 3: 8, 4: 20, 5: 60 },
	},
	sword: {
		id: 'sword',
		label: 'Ancient Sword',
		shortLabel: 'SWORD',
		type: 'high',
		glyph: '⚔',
		accent: '#c9d1d0',
		payouts: { 3: 5, 4: 12, 5: 35 },
	},
	shield: {
		id: 'shield',
		label: 'Guardian Shield',
		shortLabel: 'SHIELD',
		type: 'high',
		glyph: '⬟',
		accent: '#8ba7a1',
		payouts: { 3: 4, 4: 10, 5: 25 },
	},
	ruby: {
		id: 'ruby',
		label: 'Ruby Rune',
		shortLabel: 'RUBY',
		type: 'low',
		glyph: '◆',
		accent: '#d95d56',
		payouts: { 3: 2, 4: 5, 5: 12 },
	},
	emerald: {
		id: 'emerald',
		label: 'Emerald Rune',
		shortLabel: 'EMERALD',
		type: 'low',
		glyph: '◆',
		accent: '#5fbb8d',
		payouts: { 3: 1.5, 4: 4, 5: 10 },
	},
	sapphire: {
		id: 'sapphire',
		label: 'Sapphire Rune',
		shortLabel: 'SAPPHIRE',
		type: 'low',
		glyph: '◆',
		accent: '#6d9ad3',
		payouts: { 3: 1, 4: 3, 5: 8 },
	},
	amber: {
		id: 'amber',
		label: 'Amber Rune',
		shortLabel: 'AMBER',
		type: 'low',
		glyph: '◆',
		accent: '#e7a34f',
		payouts: { 3: 0.8, 4: 2, 5: 6 },
	},
	wild: {
		id: 'wild',
		label: 'Arcane Forge Wild',
		shortLabel: 'WILD',
		type: 'wild',
		glyph: '✦',
		accent: '#7de0a3',
		payouts: null,
	},
	scatter: {
		id: 'scatter',
		label: 'Ancient Portal Scatter',
		shortLabel: 'SCATTER',
		type: 'scatter',
		glyph: '◎',
		accent: '#be83e7',
		payouts: null,
	},
};

export const PAYLINES: number[][] = [
	[0, 0, 0, 0, 0],
	[1, 1, 1, 1, 1],
	[2, 2, 2, 2, 2],
	[0, 1, 2, 1, 0],
	[2, 1, 0, 1, 2],
	[0, 0, 1, 2, 2],
	[2, 2, 1, 0, 0],
	[1, 0, 1, 2, 1],
	[1, 2, 1, 0, 1],
	[0, 1, 1, 1, 2],
	[2, 1, 1, 1, 0],
	[0, 1, 0, 1, 2],
	[2, 1, 2, 1, 0],
	[1, 1, 0, 1, 1],
	[1, 1, 2, 1, 1],
	[0, 2, 1, 0, 2],
	[2, 0, 1, 2, 0],
	[0, 0, 2, 0, 0],
	[2, 2, 0, 2, 2],
	[1, 0, 0, 0, 1],
];

export const REEL_COUNT = 5;
export const ROW_COUNT = 3;
export const BET_LEVELS = [0.2, 0.5, 1, 2, 5, 10, 20, 50];
export const INITIAL_MATRIX: SymbolId[][] = [
	['dragon', 'ruby', 'sapphire'],
	['crown', 'emerald', 'amber'],
	['sword', 'ruby', 'shield'],
	['emerald', 'dragon', 'crown'],
	['sapphire', 'amber', 'amber'],
];
