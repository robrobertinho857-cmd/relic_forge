<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	import { requestAuthenticate, requestReplay } from 'rgs-requests';
	import {
		stateUrlDerived,
		stateBet,
		stateConfig,
		stateModal,
		stateUi,
		type AuthenticatedBetMode,
		type BetToResume,
	} from 'state-shared';
	import { API_AMOUNT_MULTIPLIER, MOST_USED_BET_INDEXES } from 'constants-shared/bet';

	type Props = { children: Snippet };

	const props: Props = $props();

	let authenticated = $state(false);
	let authenticationError = $state('');

	const isRecord = (value: unknown): value is Record<string, unknown> =>
		typeof value === 'object' && value !== null && !Array.isArray(value);

	const toBetToResume = (value: unknown): BetToResume | null => {
		if (!isRecord(value) || !Array.isArray(value.state) || !value.state.every(isRecord)) return null;

		const round: BetToResume = { state: value.state };
		if (typeof value.roundID === 'number') round.roundID = value.roundID;
		if (typeof value.amount === 'number') round.amount = value.amount;
		if (typeof value.payout === 'number') round.payout = value.payout;
		if (typeof value.payoutMultiplier === 'number') round.payoutMultiplier = value.payoutMultiplier;
		if (typeof value.active === 'boolean') round.active = value.active;
		if (typeof value.mode === 'string') round.mode = value.mode;
		if (typeof value.event === 'string' || typeof value.event === 'number') {
			round.event = String(value.event);
		}
		return round;
	};

	const authenticate = async () => {
		try {
			const authenticateData = await requestAuthenticate({
				rgsUrl: stateUrlDerived.rgsUrl(),
				sessionID: stateUrlDerived.sessionID(),
				language: stateUrlDerived.lang(),
			});

			// error
			if (authenticateData?.error) throw authenticateData;

			// balance
			if (authenticateData?.balance) {
				// Example of authenticateData.balance
				// {
				// 		"amount": 10000000000000000,
				// 		"currency": "USD"
				// },
				stateBet.currency = authenticateData.balance.currency;
				stateBet.balanceAmount = authenticateData.balance.amount / API_AMOUNT_MULTIPLIER;
			}

			// config
			if (authenticateData?.config) {
				// Example of authenticateData.config
				// {
				// 	"gameID": "37_test-lines",
				// 	"minBet": 100000,
				// 	"maxBet": 1000000000,
				// 	"stepBet": 10000,
				// 	"defaultBetLevel": 1000000,
				// 	"betLevels": [100000, 200000, ..., 1000000000],
				// 	"betModes": {},
				// 	"jurisdiction": {
				// 			"socialCasino": false,
				// 			"disabledFullscreen": false,
				// 			"disabledTurbo": false,
				// 			"disabledSuperTurbo": false,
				// 			"disabledAutoplay": false,
				// 			"disabledSlamstop": false,
				// 			"disabledSpacebar": false,
				// 			"disabledBuyFeature": false,
				// 			"displayNetPosition": false,
				// 			"displayRTP": false,
				// 			"displaySessionTimer": false,
				// 			"minimumRoundDuration": 0
				// 	}
				// }
				stateConfig.jurisdiction = authenticateData?.config?.jurisdiction;
				stateConfig.betModes = (authenticateData.config.betModes ?? {}) as Record<
					string,
					AuthenticatedBetMode
				>;
				stateConfig.betAmountOptions = (authenticateData.config?.betLevels || []).map(
					(level) => level / API_AMOUNT_MULTIPLIER,
				);
				stateConfig.betMenuOptions = stateConfig.betAmountOptions.filter((_, index) =>
					MOST_USED_BET_INDEXES.includes(index),
				);
			}

			// round
			if (authenticateData?.round) {
				// Example of authenticateData.round
				// {
				// 	"betID": 62277967,
				// 	"amount": 1000000,
				// 	"payout": 33400000,
				// 	"payoutMultiplier": 33.4,
				// 	"active": true,
				// 	"state": [...],
				// 	"mode": "BONUS",
				// 	"event": null
				// }

				if (authenticateData.round?.state) {
					const resumableRound = toBetToResume(authenticateData.round);
					if (!resumableRound) throw new Error('The authenticated round state is invalid.');
					stateBet.betToResume = resumableRound;
				}

				if (authenticateData.round?.amount) {
					const betAmountValue =
						authenticateData.round.amount > 0
							? authenticateData.round.amount / API_AMOUNT_MULTIPLIER
							: 0;
					stateBet.betAmount = betAmountValue;
					stateBet.wageredBetAmount = betAmountValue;
				}

				if (authenticateData.round?.mode) {
					stateBet.activeBetModeKey = authenticateData.round.mode;
				}
			}
		} catch (error) {
			console.error(error);
			authenticationError = 'The Stake session could not be authenticated.';
			stateModal.modal = { name: 'error', error };
		}
	};

	const handleReplay = async () => {
		stateBet.betAmount = stateUrlDerived.amount() / API_AMOUNT_MULTIPLIER || 0;
		stateBet.wageredBetAmount = stateUrlDerived.amount() / API_AMOUNT_MULTIPLIER || 0;
		stateBet.activeBetModeKey = stateUrlDerived.mode();

		const data = await requestReplay({
			rgsUrl: stateUrlDerived.rgsUrl(),
			game: stateUrlDerived.game(),
			mode: stateUrlDerived.mode(),
			version: stateUrlDerived.version(),
			event: stateUrlDerived.event(),
		});

		if (data && typeof data === 'object') {
			const replayData = data as Record<string, unknown>;
			if (replayData.error) throw replayData.error;
			const resumableRound = toBetToResume({ ...replayData, mode: stateUrlDerived.mode() });
			if (!resumableRound) throw new Error('The replay response contained invalid round state.');
			stateBet.betToResume = resumableRound;
		}
	};

	onMount(async () => {
		if (stateUrlDerived.replay()) {
			stateUi.config.mode = 'replay';
			try {
				await handleReplay();
			} catch (error) {
				console.error(error);
				authenticationError = 'The replay could not be loaded.';
			}
		} else {
			stateUi.config.mode = 'default';
			await authenticate();
		}

		 authenticated = !authenticationError;
	});
</script>


{#if authenticationError}
	<main class="session-error" role="alert"><h1>Relic Forge</h1><p>{authenticationError}</p></main>
{:else if authenticated}
	{@render props.children()}
{/if}
