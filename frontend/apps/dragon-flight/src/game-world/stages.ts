import type {
	FlightEnding,
	FlightEvent,
	FlightStageId,
	FlightStageMilestone,
} from './types';

export type FlightStageDefinition = {
	id: FlightStageId;
	name: string;
	className: string;
	order: number;
	intensity: number;
	parallaxSpeed: number;
};

export const FLIGHT_STAGES: readonly FlightStageDefinition[] = [
	{
		id: 'FORGE_OUTSKIRTS',
		name: 'Forge Outskirts',
		className: 'stage-forge-outskirts',
		order: 1,
		intensity: 0.12,
		parallaxSpeed: 1,
	},
	{
		id: 'LAVA_CHAMBER',
		name: 'Lava Chamber',
		className: 'stage-lava-chamber',
		order: 2,
		intensity: 0.34,
		parallaxSpeed: 1.08,
	},
	{
		id: 'ANCIENT_TUNNELS',
		name: 'Ancient Tunnels',
		className: 'stage-ancient-tunnels',
		order: 3,
		intensity: 0.52,
		parallaxSpeed: 1.14,
	},
	{
		id: 'DRAGON_TERRITORY',
		name: 'Dragon Territory',
		className: 'stage-dragon-territory',
		order: 4,
		intensity: 0.76,
		parallaxSpeed: 1.22,
	},
	{
		id: 'VAULT_APPROACH',
		name: 'Vault Approach',
		className: 'stage-vault-approach',
		order: 5,
		intensity: 1,
		parallaxSpeed: 1.3,
	},
];

const stageById = Object.fromEntries(
	FLIGHT_STAGES.map((stage) => [stage.id, stage]),
) as Record<FlightStageId, FlightStageDefinition>;

export const getFlightStage = (stage: FlightStageId) => stageById[stage];

const targetStageCount = (
	ending: FlightEnding,
	passedGates: number,
): number => {
	switch (ending) {
		case 'crash':
			return Math.min(3, 1 + Math.floor(passedGates / 2));
		case 'safeLanding':
			return Math.min(3, 2 + Math.floor(passedGates / 3));
		case 'forgeVault':
			return passedGates >= 4 ? 4 : 3;
		case 'dragonVault':
		case 'ancientVault':
		case 'mythicRealm':
			return 5;
	}
};

const findLastStageEventIndex = (
	events: readonly FlightEvent[],
	ending: FlightEnding,
): number => {
	const terminalIndex = events.findIndex(
		(event) => event.type === 'ending' || (event.type === 'gate' && event.result === 'crash'),
	);

	if (terminalIndex < 0) return Math.max(0, events.length - 2);
	if (ending === 'crash') return terminalIndex;
	if (ending === 'dragonVault' || ending === 'ancientVault' || ending === 'mythicRealm') {
		return terminalIndex;
	}
	return Math.max(0, terminalIndex - 1);
};

export const createFlightStagePlan = (
	events: readonly FlightEvent[],
	ending: FlightEnding,
): FlightStageMilestone[] => {
	const passedGates = events.filter(
		(event) => event.type === 'gate' && event.result === 'pass',
	).length;
	const lastStageEventIndex = findLastStageEventIndex(events, ending);
	const stageCount = Math.min(
		targetStageCount(ending, passedGates),
		lastStageEventIndex + 1,
	);

	if (stageCount <= 1) {
		return [{ stage: 'FORGE_OUTSKIRTS', eventIndex: 0 }];
	}

	return FLIGHT_STAGES.slice(0, stageCount).map((stage, index) => ({
		stage: stage.id,
		eventIndex: Math.round((index * lastStageEventIndex) / (stageCount - 1)),
	}));
};

export const stageForEventIndex = (
	stagePlan: readonly FlightStageMilestone[],
	eventIndex: number,
): FlightStageId => {
	let activeStage: FlightStageId = 'FORGE_OUTSKIRTS';

	for (const milestone of stagePlan) {
		if (milestone.eventIndex > eventIndex) break;
		activeStage = milestone.stage;
	}

	return activeStage;
};
