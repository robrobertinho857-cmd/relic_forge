export type Vector2 = {
	x: number;
	y: number;
};

// Shared prototype types for Dragon Flight.

export type PlayerBody = {
	position: Vector2;
	velocity: Vector2;
	radius: number;
};

export type WorldBounds = {
	width: number;
	height: number;
	floorY: number;
};

export type EmberParticle = {
	id: number;
	x: number;
	y: number;
	velocityX: number;
	velocityY: number;
	life: number;
	size: number;
};

export type FlightRisk = 'safe' | 'balanced' | 'danger';

export type CreatureId = 'tiny-bat' | 'firebird' | 'wyvern' | 'dragon' | 'ancient-dragon' | 'azure-swift';

export type RelicType = 'guardian' | 'fortune' | 'chaos';

export type LaunchStyle = 'glide' | 'boost' | 'dive';

export type WeatherCondition = 'clear' | 'rain' | 'storm' | 'fog' | 'snow' | 'inferno';

export type TimeOfDay = 'dawn' | 'day' | 'sunset' | 'night' | 'eclipse';

export type HazardType =
	| 'fireGate'
	| 'forgeHammer'
	| 'chainTunnel'
	| 'lavaColumn'
	| 'spikeGate'
	| 'windTunnel';

export type RelicEventType = 'commonRelic' | 'fireRelic' | 'emeraldRelic' | 'ancientRelic' | 'mythicRelic';

export type PortalType = 'multiplierPortal' | 'relicPortal' | 'vaultPortal' | 'chaosPortal';

export type BossType = 'ancientWyrm' | 'forgeGuardian';

export type FlightEnding = 'crash' | 'safeLanding' | 'forgeVault' | 'dragonVault' | 'ancientVault' | 'mythicRealm';

export type FlightStageId =
	| 'FORGE_OUTSKIRTS'
	| 'LAVA_CHAMBER'
	| 'ANCIENT_TUNNELS'
	| 'DRAGON_TERRITORY'
	| 'VAULT_APPROACH';

export type FlightStageMilestone = {
	stage: FlightStageId;
	eventIndex: number;
};

type GateEventBase = {
	type: 'gate';
	gate: number;
	hazard: HazardType;
	gapRatio: number;
};

export type FlightEvent =
	| { type: 'launch'; path: FlightRisk }
	| (GateEventBase & { result: 'pass' })
	| (GateEventBase & { result: 'crash'; crashSide: 'upper' | 'lower' })
	| { type: 'relic'; relicType: RelicEventType; multiplier: number; protected?: boolean }
	| { type: 'portal'; portalType: PortalType; multiplier: number }
	| { type: 'boss'; bossType: BossType; result: 'pass' | 'crash'; multiplier: number }
	| { type: 'ending'; ending: Exclude<FlightEnding, 'crash'>; multiplier: number }
	| { type: 'finalWin'; multiplier: number; win: number };

export type FlightRound = {
	id: number;
	seed: number;
	bet: number;
	risk: FlightRisk;
	creature: CreatureId;
	relic: RelicType;
	launchStyle: LaunchStyle;
	weather?: WeatherCondition;
	timeOfDay?: TimeOfDay;
	events: FlightEvent[];
	stagePlan: FlightStageMilestone[];
	ending: FlightEnding;
	finalMultiplier: number;
	finalWin: number;
};

export type PrototypeStatus = 'ready' | 'flying' | 'collided' | 'ending' | 'complete';
