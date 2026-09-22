import fs from 'node:fs';
import { loadTypescript } from '../tests/typescript.mjs';
const { BONUS_FLIGHTS, createBonusRound } = await loadTypescript(
	new URL('../src/game-world/bonusFlights.ts', import.meta.url),
);
const result = [];
for (const mode of BONUS_FLIGHTS) {
	const books = [];
	let ticket = 0;
	for (const outcome of mode.outcomes) {
		// Two equal variants retain both crash orientations without altering probabilities.
		for (let variant = 0; variant < 2; variant++) {
			const round = createBonusRound(mode.id, 1, books.length + 1, ticket + variant, {
				creature: 'archaeopteryx',
				launchStyle: 'glide',
			});
			const events = round.events.map((event, index) => {
				const { win, ...fields } = event;
				const stage = [...round.stagePlan].reverse().find((item) => item.eventIndex <= index).stage;
				return {
					...fields,
					index,
					stage,
					...('multiplier' in event ? { multiplierUnits: Math.round(event.multiplier * 100) } : {}),
					...(event.type === 'finalWin' ? { payoutMultiplier: outcome.multiplier * 100 } : {}),
				};
			});
			books.push({
				id: books.length + 1,
				payoutMultiplier: outcome.multiplier * 100,
				events,
				weight: outcome.tickets,
			});
		}
		ticket += outcome.tickets;
	}
	result.push({ name: mode.id, cost: mode.costMultiplier, books });
}
fs.mkdirSync('art/submission', { recursive: true });
fs.writeFileSync('art/submission/bonus-books.json', JSON.stringify(result));
