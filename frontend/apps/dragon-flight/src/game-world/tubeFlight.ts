import type { FlightRound } from './types';
import { generateLegacyMockRound } from './mockRound';

export function tubeFlightOffer(
	round: FlightRound,
	minimum: number,
	maximum: number,
	live: boolean,
	replay: boolean,
) {
	const profit = round.finalWin - (round.entryCost ?? round.bet);
	if (!round.flock || profit <= 0 || replay) return undefined;
	const amount = Math.floor((profit + 1e-9) * 50) / 100;
	const reason = live
		? 'Fluppy Flight needs a separate server mode for connected play.'
		: amount < minimum
			? 'Half the profit is below the minimum bet.'
			: amount > maximum
				? 'Half the profit exceeds the maximum bet.'
				: '';
	return { amount, reason };
}

export function createTubeFlight(
	previous: Pick<FlightRound, 'risk' | 'launchStyle' | 'weather' | 'timeOfDay'>,
	amount: number,
	id: number,
): FlightRound {
	return {
		...generateLegacyMockRound(amount, previous.risk, id, {
			creature: 'archaeopteryx',
			launchStyle: previous.launchStyle,
		}),
		route: 'tube-flight',
		weather: previous.weather,
		timeOfDay: previous.timeOfDay,
	};
}
