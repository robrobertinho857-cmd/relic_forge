import type { CreatureId } from './types';

// Presentational creature profiles for the local prototype.

export type CreatureProfile = {
	id: CreatureId;
	name: string;
	className: string;
	assets?: {
		portrait?: string;
		flight?: string;
		result?: string;
	};
	sizeScale: number;
	agility: number;
	damping: number;
	maxVerticalSpeed: number;
	rotationDivisor: number;
	rotationLimit: number;
	flapDuration: number;
	hoverDuration: number;
	hoverLift: number;
	description: string;
};

export const CREATURES: CreatureProfile[] = [
	{
		id: 'tiny-bat',
		name: 'Tiny Bat',
		className: 'tiny-bat',
		sizeScale: 0.68,
		agility: 1.38,
		damping: 0.9,
		maxVerticalSpeed: 360,
		rotationDivisor: 8,
		rotationLimit: 42,
		flapDuration: 115,
		hoverDuration: 900,
		hoverLift: 5,
		description: 'Light, quick and restless',
	},
	{
		id: 'firebird',
		name: 'Firebird',
		className: 'firebird',
		sizeScale: 0.82,
		agility: 1.2,
		damping: 0.92,
		maxVerticalSpeed: 340,
		rotationDivisor: 9.5,
		rotationLimit: 38,
		flapDuration: 145,
		hoverDuration: 1150,
		hoverLift: 6,
		description: 'Bright, nimble and sweeping',
	},
	{
		id: 'wyvern',
		name: 'Wyvern',
		className: 'wyvern',
		sizeScale: 0.95,
		agility: 1.08,
		damping: 0.935,
		maxVerticalSpeed: 320,
		rotationDivisor: 10.5,
		rotationLimit: 35,
		flapDuration: 165,
		hoverDuration: 1350,
		hoverLift: 5,
		description: 'Lean and responsive',
	},
	{
		id: 'dragon',
		name: 'Dragon',
		className: 'dragon-creature',
		sizeScale: 1,
		agility: 1,
		damping: 0.94,
		maxVerticalSpeed: 310,
		rotationDivisor: 11,
		rotationLimit: 35,
		flapDuration: 180,
		hoverDuration: 1500,
		hoverLift: 4,
		description: 'Balanced and powerful',
	},
	{
		id: 'ancient-dragon',
		name: 'Ancient Dragon',
		className: 'ancient-dragon',
		sizeScale: 1.3,
		agility: 0.72,
		damping: 0.96,
		maxVerticalSpeed: 260,
		rotationDivisor: 15,
		rotationLimit: 27,
		flapDuration: 260,
		hoverDuration: 2100,
		hoverLift: 3,
		description: 'Heavy and dramatic',
	},
];

export const getCreature = (id: CreatureId) =>
	CREATURES.find((creature) => creature.id === id) ?? CREATURES[3];
