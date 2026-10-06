import { base } from '$app/paths';
import type { EncounterType } from './types';

export const ENCOUNTER_ARTWORK: Record<EncounterType, string> = {
	ridgeDragon: `${base || '.'}/encounters/ridge-dragon.webp`,
};
