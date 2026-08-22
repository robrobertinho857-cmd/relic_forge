<script lang="ts">
	import { onMount } from 'svelte';
	import { SYMBOLS } from '../game/config';
	import { SYMBOL_IDS, type SymbolId } from '../game/types';
	import type { SpinTimingProfile } from '../game/spinConfig';

	type ReelAnimationState =
		| 'idle'
		| 'accelerating'
		| 'spinning'
		| 'anticipating'
		| 'decelerating'
		| 'settling'
		| 'stopped';

	type Props = { reelIndex: number; initialSymbols: SymbolId[] };
	const { reelIndex, initialSymbols }: Props = $props();

	let viewport: HTMLDivElement;
	let strip: HTMLDivElement;
	let reelState = $state<ReelAnimationState>('idle');
	let cellHeight = 1;
	let offset = 0;
	let velocity = 0;
	let animationFrame = 0;
	let lastFrameTime = 0;
	let spinStartedAt = 0;
	let fillerIndex = reelIndex * 3;
	let activeProfile: SpinTimingProfile | undefined;
	let resizeObserver: ResizeObserver | undefined;

	const initialStrip = (): SymbolId[] => [
		SYMBOL_IDS[(reelIndex + 2) % SYMBOL_IDS.length],
		SYMBOL_IDS[(reelIndex + 4) % SYMBOL_IDS.length],
		SYMBOL_IDS[(reelIndex + 6) % SYMBOL_IDS.length],
		SYMBOL_IDS[(reelIndex + 8) % SYMBOL_IDS.length],
		...initialSymbols,
		SYMBOL_IDS[(reelIndex + 1) % SYMBOL_IDS.length],
		SYMBOL_IDS[(reelIndex + 5) % SYMBOL_IDS.length],
	];
	const initialCells = initialStrip();

	const nextFiller = (): SymbolId => {
		fillerIndex = (fillerIndex + reelIndex + 3) % SYMBOL_IDS.length;
		return SYMBOL_IDS[fillerIndex];
	};

	const updateCell = (cell: Element, symbol: SymbolId, row?: number) => {
		const definition = SYMBOLS[symbol];
		cell.className = `symbol-cell symbol-${definition.type}`;
		cell.setAttribute('data-symbol', symbol);
		(cell as HTMLElement).style.setProperty('--accent', definition.accent);
		const glyph = cell.querySelector<HTMLElement>('.symbol-glyph');
		const name = cell.querySelector<HTMLElement>('.symbol-name');
		const index = cell.querySelector<HTMLElement>('.cell-index');
		if (glyph) glyph.textContent = definition.glyph;
		if (name) name.textContent = definition.shortLabel;
		if (index)
			index.textContent =
				row === undefined ? '' : `${String(reelIndex + 1).padStart(2, '0')} · ${row + 1}`;
	};

	const stripCells = () => Array.from(strip.children);

	const setStripSymbols = (symbols: SymbolId[], visibleRows = false) => {
		stripCells().forEach((cell, index) => {
			const row = visibleRows && index >= 4 && index <= 6 ? index - 4 : undefined;
			updateCell(cell, symbols[index], row);
		});
	};

	const symbolAt = (index: number): SymbolId =>
		(strip.children[index]?.getAttribute('data-symbol') as SymbolId | null) ?? nextFiller();

	const measure = () => {
		cellHeight = Math.max(1, viewport.clientHeight / 3);
		strip.style.setProperty('--reel-cell-height', `${cellHeight}px`);
		render();
	};

	const render = () => {
		strip.style.transform = `translate3d(0, ${-4 * cellHeight + offset}px, 0)`;
		const speedRatio = activeProfile
			? Math.min(1, velocity / (activeProfile.maximumVelocityCellsPerSecond * cellHeight * 0.001))
			: 0;
		strip.style.filter = speedRatio > 0.25 ? `blur(${(speedRatio * 1.15).toFixed(2)}px)` : '';
	};

	const recycle = () => {
		while (offset >= cellHeight) {
			offset -= cellHeight;
			const recycled = strip.lastElementChild;
			if (!recycled) return;
			updateCell(recycled, nextFiller());
			strip.prepend(recycled);
		}
	};

	const advance = (elapsed: number) => {
		offset += velocity * elapsed;
		recycle();
		render();
	};

	const spinFrame = (now: number) => {
		if (!activeProfile) return;
		const elapsed = Math.min(40, now - lastFrameTime || 16.67);
		lastFrameTime = now;
		const accelerationProgress = Math.min(
			1,
			(now - spinStartedAt) / activeProfile.accelerationDuration,
		);
		const easedAcceleration = 1 - Math.pow(1 - accelerationProgress, 3);
		velocity = activeProfile.maximumVelocityCellsPerSecond * cellHeight * 0.001 * easedAcceleration;
		if (accelerationProgress >= 1) reelState = 'spinning';
		advance(elapsed);
		animationFrame = requestAnimationFrame(spinFrame);
	};

	const animation = (duration: number, update: (progress: number, elapsed: number) => void) =>
		new Promise<void>((resolve) => {
			const startedAt = performance.now();
			let previous = startedAt;
			const frame = (now: number) => {
				const progress = Math.min(1, (now - startedAt) / Math.max(1, duration));
				update(progress, Math.max(0, now - previous));
				previous = now;
				if (progress < 1) animationFrame = requestAnimationFrame(frame);
				else resolve();
			};
			animationFrame = requestAnimationFrame(frame);
		});

	const waitUntil = (targetTime: number) =>
		new Promise<void>((resolve) => {
			const frame = (now: number) => {
				if (now >= targetTime) resolve();
				else animationFrame = requestAnimationFrame(frame);
			};
			animationFrame = requestAnimationFrame(frame);
		});

	const stageLanding = (result: SymbolId[]) => {
		stripCells()
			.slice(1, 4)
			.forEach((cell, index) => updateCell(cell, result[index]));
		render();
	};

	const normalizeResult = (result: SymbolId[]) => {
		setStripSymbols(
			[
				nextFiller(),
				nextFiller(),
				nextFiller(),
				nextFiller(),
				...result,
				nextFiller(),
				nextFiller(),
			],
			true,
		);
		offset = 0;
		render();
		stripCells()
			.slice(4, 7)
			.forEach((cell) => {
				const symbol = cell.getAttribute('data-symbol');
				if (symbol === 'wild' || symbol === 'scatter') cell.classList.add('special-landed');
			});
	};

	export const start = (profile: SpinTimingProfile) => {
		cancelAnimationFrame(animationFrame);
		measure();
		activeProfile = profile;
		reelState = 'accelerating';
		spinStartedAt = performance.now();
		lastFrameTime = spinStartedAt;
		velocity = 0;
		stripCells().forEach((cell) => cell.classList.remove('special-landed'));
		animationFrame = requestAnimationFrame(spinFrame);
	};

	export const stopAt = async (
		result: SymbolId[],
		profile: SpinTimingProfile,
		stopDelay: number,
		anticipating: boolean,
	) => {
		const anticipationDelay = anticipating ? profile.anticipationExtraDuration : 0;
		if (anticipating) reelState = 'anticipating';
		await waitUntil(spinStartedAt + profile.minimumSpinDuration + stopDelay + anticipationDelay);
		cancelAnimationFrame(animationFrame);
		reelState = 'decelerating';
		const startingVelocity = velocity;
		const landingDistance = cellHeight * 3;
		const landingVelocity = (1.5 * landingDistance) / profile.landingDuration;
		await animation(profile.decelerationDuration, (progress, elapsed) => {
			const eased = 1 - Math.pow(1 - progress, 3);
			velocity = startingVelocity + (landingVelocity - startingVelocity) * eased;
			advance(elapsed);
		});

		const startingOffset = offset;
		const alignmentDistance = cellHeight - startingOffset;
		const alignmentDuration = alignmentDistance / Math.max(0.001, landingVelocity);
		await animation(alignmentDuration, (progress) => {
			offset = startingOffset + alignmentDistance * progress;
			velocity = landingVelocity;
			render();
		});
		offset = cellHeight;
		recycle();
		stageLanding(result);
		reelState = 'settling';
		let travelled = 0;
		await animation(profile.landingDuration, (progress) => {
			const eased = 1.5 * progress - 0.5 * progress ** 3;
			const nextDistance = landingDistance * eased;
			offset += nextDistance - travelled;
			travelled = nextDistance;
			velocity = landingVelocity * (1 - progress ** 2);
			recycle();
			render();
		});

		normalizeResult(result);
		activeProfile = undefined;
		velocity = 0;
		reelState = 'stopped';
	};

	export const reset = (result: SymbolId[]) => {
		cancelAnimationFrame(animationFrame);
		activeProfile = undefined;
		velocity = 0;
		reelState = 'idle';
		normalizeResult(result);
	};

	onMount(() => {
		resizeObserver = new ResizeObserver(measure);
		resizeObserver.observe(viewport);
		measure();
		return () => {
			cancelAnimationFrame(animationFrame);
			resizeObserver?.disconnect();
		};
	});
</script>

<div class="reel reel-viewport" bind:this={viewport} data-state={reelState}>
	<div class="reel-strip" bind:this={strip}>
		{#each initialCells as symbol}
			<div
				class="symbol-cell symbol-{SYMBOLS[symbol].type}"
				data-symbol={symbol}
				style={`--accent: ${SYMBOLS[symbol].accent}`}
			>
				<span class="symbol-glyph">{SYMBOLS[symbol].glyph}</span>
				<span class="symbol-name">{SYMBOLS[symbol].shortLabel}</span>
				<span class="cell-index"></span>
			</div>
		{/each}
	</div>
</div>
