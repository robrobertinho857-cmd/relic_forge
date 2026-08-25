/**
 * Vite-managed game artwork. `new URL(..., import.meta.url)` is resolved at
 * build time and emits each file into the immutable client asset bundle.
 */
export const GAME_ASSETS = {
	backgrounds: {
		forge: new URL('../assets/backgrounds/forge-background.webp', import.meta.url).href,
	},
	controls: {
		spin: new URL('../assets/controls/spin-button.webp', import.meta.url).href,
		turbo: new URL('../assets/controls/turbo.webp', import.meta.url).href,
		sound: new URL('../assets/controls/sound.webp', import.meta.url).href,
		paytable: new URL('../assets/controls/paytable.webp', import.meta.url).href,
	},
	modes: {
		normal: new URL('../assets/modes/normal.webp', import.meta.url).href,
		forgeBoost: new URL('../assets/modes/forge-boost.webp', import.meta.url).href,
		dragonBoost: new URL('../assets/modes/dragon-boost.webp', import.meta.url).href,
		bonusStandard: new URL('../assets/modes/bonus-standard.webp', import.meta.url).href,
		bonusSuper: new URL('../assets/modes/bonus-super.webp', import.meta.url).href,
		bonusMythic: new URL('../assets/modes/bonus-mythic.webp', import.meta.url).href,
	},
	panels: {
		activeMode: new URL('../assets/panels/active-mode-panel.webp', import.meta.url).href,
		bonusBuyButton: new URL('../assets/panels/bonus-buy-button-v4.webp', import.meta.url).href,
		bonusBuy: new URL('../assets/panels/bonus-buy-panel.webp', import.meta.url).href,
		currentWin: new URL('../assets/panels/current-win-panel-v3.webp', import.meta.url).href,
		balance: new URL('../assets/panels/vault-balance.webp', import.meta.url).href,
		stake: new URL('../assets/panels/vault-stake.webp', import.meta.url).href,
	},
	sounds: {
		spinBase: new URL('../assets/sounds/spin-base.wav', import.meta.url).href,
	},
	symbols: {
		dragon: new URL('../assets/symbols/dragon.webp', import.meta.url).href,
		crown: new URL('../assets/symbols/crown.webp', import.meta.url).href,
		sword: new URL('../assets/symbols/sword.webp', import.meta.url).href,
		shield: new URL('../assets/symbols/shield.webp', import.meta.url).href,
		ruby: new URL('../assets/symbols/ruby.webp', import.meta.url).href,
		emerald: new URL('../assets/symbols/emerald.webp', import.meta.url).href,
		sapphire: new URL('../assets/symbols/sapphire.webp', import.meta.url).href,
		amber: new URL('../assets/symbols/amber.webp', import.meta.url).href,
		wild: new URL('../assets/symbols/wild.webp', import.meta.url).href,
		scatter: new URL('../assets/symbols/scatter.webp', import.meta.url).href,
	},
} as const;
