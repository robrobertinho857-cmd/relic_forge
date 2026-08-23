/**
 * Vite-managed game artwork. `new URL(..., import.meta.url)` is resolved at
 * build time and emits each file into the immutable client asset bundle.
 */
export const GAME_ASSETS = {
	backgrounds: {
		forge: new URL('../assets/backgrounds/forge-background.png', import.meta.url).href,
	},
	controls: {
		spin: new URL('../assets/controls/spin-button.png', import.meta.url).href,
		turbo: new URL('../assets/controls/turbo.png', import.meta.url).href,
		sound: new URL('../assets/controls/sound.png', import.meta.url).href,
		paytable: new URL('../assets/controls/paytable.png', import.meta.url).href,
	},
	modes: {
		normal: new URL('../assets/modes/normal.png', import.meta.url).href,
		forgeBoost: new URL('../assets/modes/forge-boost.png', import.meta.url).href,
		dragonBoost: new URL('../assets/modes/dragon-boost.png', import.meta.url).href,
		bonusStandard: new URL('../assets/modes/bonus-standard.png', import.meta.url).href,
		bonusSuper: new URL('../assets/modes/bonus-super.png', import.meta.url).href,
		bonusMythic: new URL('../assets/modes/bonus-mythic.png', import.meta.url).href,
	},
	panels: {
		activeMode: new URL('../assets/panels/active-mode-panel.png', import.meta.url).href,
		bonusBuyButton: new URL('../assets/panels/bonus-buy-button-v4.png', import.meta.url).href,
		bonusBuy: new URL('../assets/panels/bonus-buy-panel.png', import.meta.url).href,
		currentWin: new URL('../assets/panels/current-win-panel-v3.png', import.meta.url).href,
		balance: new URL('../assets/panels/vault-balance.png', import.meta.url).href,
		stake: new URL('../assets/panels/vault-stake.png', import.meta.url).href,
	},
	sounds: {
		spinBase: new URL('../assets/sounds/spin-base.wav', import.meta.url).href,
	},
	symbols: {
		dragon: new URL('../assets/symbols/dragon.png', import.meta.url).href,
		crown: new URL('../assets/symbols/crown.png', import.meta.url).href,
		sword: new URL('../assets/symbols/sword.png', import.meta.url).href,
		shield: new URL('../assets/symbols/shield.png', import.meta.url).href,
		ruby: new URL('../assets/symbols/ruby.png', import.meta.url).href,
		emerald: new URL('../assets/symbols/emerald.png', import.meta.url).href,
		sapphire: new URL('../assets/symbols/sapphire.png', import.meta.url).href,
		amber: new URL('../assets/symbols/amber.png', import.meta.url).href,
		wild: new URL('../assets/symbols/wild.png', import.meta.url).href,
		scatter: new URL('../assets/symbols/scatter.png', import.meta.url).href,
	},
} as const;
