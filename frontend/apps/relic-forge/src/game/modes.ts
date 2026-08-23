export type ModeKind = 'play' | 'bonus';
export type ModeTheme = 'blue' | 'forge' | 'green' | 'purple' | 'mythic';
export type ModeId = 'normal' | 'forgeBoost' | 'dragonBoost' | 'standard' | 'super' | 'mythic';

export type ModeDefinition = {
	id: ModeId;
	kind: ModeKind;
	title: string;
	theme: ModeTheme;
	image: string;
	mockMode: string;
	aliases: string[];
	defaultCostMultiplier: number;
	descriptions: string[];
	freeSpins?: number;
};

export type AuthenticatedMode = {
	mode?: string;
	costMultiplier?: number;
	feature?: boolean;
	buyBonus?: boolean;
};

export type ResolvedMode = ModeDefinition & {
	mode: string;
	costMultiplier: number;
	available: boolean;
	source: 'mock' | 'rgs' | 'unavailable';
};

export const PLAY_MODE_DEFINITIONS: ModeDefinition[] = [
	{
		id: 'normal',
		kind: 'play',
		title: 'NORMAL',
		theme: 'blue',
		image: './assets/modes/normal.png',
		mockMode: 'BASE',
		aliases: ['BASE', 'NORMAL'],
		defaultCostMultiplier: 1,
		descriptions: ['Standard odds', 'Standard bonus chance', 'Standard multiplier chance'],
	},
	{
		id: 'forgeBoost',
		kind: 'play',
		title: 'FORGE BOOST',
		theme: 'forge',
		image: './assets/modes/forge-boost.png',
		mockMode: 'FORGE_BOOST',
		aliases: ['FORGE_BOOST', 'FORGEBOOST', 'ANTE'],
		defaultCostMultiplier: 2,
		descriptions: ['Higher bonus chance', 'Same core game'],
	},
	{
		id: 'dragonBoost',
		kind: 'play',
		title: 'DRAGON BOOST',
		theme: 'green',
		image: './assets/modes/dragon-boost.png',
		mockMode: 'DRAGON_BOOST',
		aliases: ['DRAGON_BOOST', 'DRAGONBOOST', 'SUPERANTE'],
		defaultCostMultiplier: 5,
		descriptions: [
			'Higher bonus chance',
			'Higher multiplier chance',
			'More volatile',
			'Bigger potential wins',
		],
	},
];

export const BONUS_MODE_DEFINITIONS: ModeDefinition[] = [
	{
		id: 'standard',
		kind: 'bonus',
		title: 'STANDARD',
		theme: 'blue',
		image: './assets/modes/bonus-standard.png',
		mockMode: 'STANDARD_BONUS',
		aliases: ['STANDARD_BONUS', 'STANDARD', 'BONUS'],
		defaultCostMultiplier: 80,
		freeSpins: 8,
		descriptions: ['Normal multiplier distribution', 'Random features'],
	},
	{
		id: 'super',
		kind: 'bonus',
		title: 'SUPER',
		theme: 'purple',
		image: './assets/modes/bonus-super.png',
		mockMode: 'SUPER_BONUS',
		aliases: ['SUPER_BONUS', 'SUPER'],
		defaultCostMultiplier: 250,
		freeSpins: 8,
		descriptions: ['Guaranteed Multiplier Wild on 1st spin', 'Higher multiplier distribution'],
	},
	{
		id: 'mythic',
		kind: 'bonus',
		title: 'MYTHIC',
		theme: 'mythic',
		image: './assets/modes/bonus-mythic.png',
		mockMode: 'MYTHIC_BONUS',
		aliases: ['MYTHIC_BONUS', 'MYTHIC'],
		defaultCostMultiplier: 500,
		freeSpins: 8,
		descriptions: [
			'Guaranteed Multiplier Wild on 1st spin',
			'Minimum stronger multiplier',
			'Highest potential wins',
		],
	},
];

const normalized = (value: string | undefined) => value?.trim().toUpperCase() ?? '';

const findAuthenticatedMode = (
	definition: ModeDefinition,
	authenticatedModes: Record<string, AuthenticatedMode>,
) => {
	const aliases = new Set(definition.aliases.map(normalized));
	return Object.entries(authenticatedModes).find(
		([key, config]) => aliases.has(normalized(key)) || aliases.has(normalized(config.mode)),
	);
};

export const resolveModes = (
	definitions: ModeDefinition[],
	options: {
		mock: boolean;
		authenticatedModes: Record<string, AuthenticatedMode>;
		buyFeatureDisabled?: boolean;
	},
): ResolvedMode[] =>
	definitions.map((definition) => {
		if (options.mock) {
			return {
				...definition,
				mode: definition.mockMode,
				costMultiplier: definition.defaultCostMultiplier,
				available: true,
				source: 'mock' as const,
			};
		}

		const authenticated = findAuthenticatedMode(definition, options.authenticatedModes);
		const [key, config] = authenticated ?? ['', {}];
		const configuredCost = Number(config.costMultiplier);
		const validCost = Number.isFinite(configuredCost) && configuredCost > 0;
		const featureAllowed =
			definition.kind !== 'bonus' || config.feature === true || config.buyBonus === true;
		const available = Boolean(
			authenticated &&
				validCost &&
				featureAllowed &&
				!(definition.kind === 'bonus' && options.buyFeatureDisabled),
		);

		return {
			...definition,
			mode: config.mode || key || definition.mockMode,
			costMultiplier: validCost ? configuredCost : definition.defaultCostMultiplier,
			available,
			source: available ? ('rgs' as const) : ('unavailable' as const),
		};
	});

const MOCK_BONUS_MODE_IDS = new Set(BONUS_MODE_DEFINITIONS.map((mode) => mode.mockMode));

export const isMockBonusMode = (mode: string) => MOCK_BONUS_MODE_IDS.has(mode.toUpperCase());
