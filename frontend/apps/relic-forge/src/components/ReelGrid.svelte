<script lang="ts">
	import Reel from './Reel.svelte';
	import { getSpinTiming } from '../game/spinConfig';
	import type { Position, ReelMatrix } from '../game/types';

	type ReelController = {
		start: (profile: ReturnType<typeof getSpinTiming>) => void;
		stopAt: (
			result: ReelMatrix[number],
			profile: ReturnType<typeof getSpinTiming>,
			stopDelay: number,
			anticipating: boolean,
		) => Promise<void>;
		reset: (result: ReelMatrix[number]) => void;
	};

	type Props = {
		matrix: ReelMatrix;
		highlightedPositions: Position[];
		presentationActive: boolean;
	};
	const { matrix, highlightedPositions, presentationActive }: Props = $props();
	let reels: ReelController[] = [];
	let activeTurbo = false;

	export const startSpin = (turbo: boolean) => {
		activeTurbo = turbo;
		const profile = getSpinTiming(turbo);
		reels.forEach((reel) => reel.start(profile));
	};

	export const stopAt = async (
		result: ReelMatrix,
		options: { turbo: boolean; anticipationReels?: number[] },
	) => {
		const profile = getSpinTiming(options.turbo ?? activeTurbo);
		await Promise.all(
			reels.map((reel, reelIndex) =>
				reel.stopAt(
					result[reelIndex],
					profile,
					reelIndex * profile.reelStopDelay,
					options.anticipationReels?.includes(reelIndex) ?? false,
				),
			),
		);
	};

	export const reset = (result: ReelMatrix) => {
		reels.forEach((reel, reelIndex) => reel.reset(result[reelIndex]));
	};
</script>

{#each matrix as reel, reelIndex (reelIndex)}
	<Reel
		bind:this={reels[reelIndex]}
		{reelIndex}
		initialSymbols={reel}
		highlightedRows={highlightedPositions
			.filter((position) => position.reel === reelIndex)
			.map((position) => position.row)}
		{presentationActive}
	/>
{/each}
