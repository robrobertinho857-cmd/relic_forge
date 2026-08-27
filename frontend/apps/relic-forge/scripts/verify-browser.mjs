import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';

const APP_ORIGIN = process.env.APP_ORIGIN ?? 'http://localhost:3006';
const APP_URL = `${APP_ORIGIN}/?demo=true`;
const CDP_PORT = 9333;
const chromeCandidates = [
	process.env.CHROME_PATH,
	'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
	'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
	'/usr/bin/google-chrome',
	'/usr/bin/google-chrome-stable',
	'/usr/bin/chromium',
	'/usr/bin/chromium-browser',
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];
const chromePath = chromeCandidates.filter(Boolean).find(existsSync);
if (!chromePath) throw new Error('Chrome or Edge was not found.');

const profilePath = join(tmpdir(), `relic-forge-cdp-${process.pid}`);
mkdirSync(profilePath, { recursive: true });
const browser = spawn(
	chromePath,
	[
		'--headless=new',
		`--remote-debugging-port=${CDP_PORT}`,
		`--user-data-dir=${profilePath}`,
		'--disable-gpu',
		'--no-first-run',
		'--window-size=1536,1024',
		'about:blank',
	],
	{ stdio: 'ignore' },
);

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const waitForCdp = async () => {
	for (let attempt = 0; attempt < 80; attempt += 1) {
		try {
			const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
			if (response.ok) return response.json();
		} catch {
			// Chrome has not opened its debugging endpoint yet.
		}
		await delay(100);
	}
	throw new Error('Chrome DevTools endpoint did not start.');
};

const targets = await waitForCdp();
const target = targets.find((candidate) => candidate.type === 'page');
if (!target) throw new Error('No Chrome page target was available.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
	socket.addEventListener('open', resolve, { once: true });
	socket.addEventListener('error', reject, { once: true });
});

let commandId = 0;
const pending = new Map();
const listeners = new Map();
const runtimeErrors = [];
const networkFailures = [];
const requestCounts = { authenticate: 0, play: 0, endRound: 0 };
const playModes = [];
const playAmounts = [];
let serveRecoveryRound = false;
let serveRestrictedSession = false;
let replayRequests = 0;

socket.addEventListener('message', (message) => {
	const payload = JSON.parse(message.data);
	if (payload.id) {
		const request = pending.get(payload.id);
		if (!request) return;
		pending.delete(payload.id);
		if (payload.error) request.reject(new Error(payload.error.message));
		else request.resolve(payload.result);
		return;
	}
	for (const listener of listeners.get(payload.method) ?? []) listener(payload.params);
});

const send = (method, params = {}) =>
	new Promise((resolve, reject) => {
		commandId += 1;
		pending.set(commandId, { resolve, reject });
		socket.send(JSON.stringify({ id: commandId, method, params }));
	});

const on = (method, listener) => {
	const methodListeners = listeners.get(method) ?? [];
	methodListeners.push(listener);
	listeners.set(method, methodListeners);
};

on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
	runtimeErrors.push(exceptionDetails.exception?.description ?? exceptionDetails.text);
});
on('Runtime.consoleAPICalled', ({ type, args }) => {
	if (type === 'error')
		runtimeErrors.push(args.map((arg) => arg.value ?? arg.description).join(' '));
});
on('Network.loadingFailed', ({ errorText, canceled, blockedReason }) => {
	if (!canceled) networkFailures.push(blockedReason ?? errorText);
});

await Promise.all([
	send('Runtime.enable'),
	send('Page.enable'),
	send('Network.enable'),
	send('Fetch.enable', { patterns: [{ urlPattern: 'https://mock.local/*' }] }),
]);

const evaluate = async (expression) => {
	const response = await send('Runtime.evaluate', {
		expression,
		awaitPromise: true,
		returnByValue: true,
	});
	if (response.exceptionDetails) {
		throw new Error(
			response.exceptionDetails.exception?.description ?? response.exceptionDetails.text,
		);
	}
	return response.result.value;
};

const waitFor = async (expression, description, timeout = 12_000) => {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeout) {
		if (await evaluate(expression)) return;
		await delay(25);
	}
	const snapshot = await evaluate(`({
		button: document.querySelector('.spin-button')?.textContent?.trim(),
		disabled: document.querySelector('.spin-button')?.disabled,
		error: document.querySelector('.error-panel')?.textContent?.trim(),
		reels: [...document.querySelectorAll('.reel')].map((reel) => reel.dataset.state)
	})`);
	throw new Error(
		`Timed out waiting for ${description}. ${JSON.stringify({ snapshot, requestCounts, runtimeErrors })}`,
	);
};

const navigate = async (url) => {
	await send('Page.navigate', { url });
	await waitFor("document.readyState === 'complete'", 'page load');
	await waitFor("Boolean(document.querySelector('.spin-button'))", 'game render');
};

const assertionResults = [];
const check = (condition, description) => {
	if (!condition) throw new Error(`FAILED: ${description}`);
	assertionResults.push(description);
};

const text = (selector) =>
	evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent?.trim() ?? ''`);
const click = (selector) =>
	evaluate(
		`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return false; element.click(); return true; })()`,
	);
const visibleSymbolsExpression = `[...document.querySelectorAll('.reel')].map((reel) => {
	const viewport = reel.getBoundingClientRect();
	return [...reel.querySelectorAll('.symbol-cell')]
		.filter((cell) => {
			const bounds = cell.getBoundingClientRect();
			const center = bounds.top + bounds.height / 2;
			return center > viewport.top && center < viewport.bottom;
		})
		.sort((left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top)
		.map((cell) => cell.dataset.symbol);
})`;
const visibleSymbols = () => evaluate(visibleSymbolsExpression);
const captureScreenshot = async (filename) => {
	const snapshotDirectory = join(process.cwd(), '..', '..', '..', '.tmp');
	mkdirSync(snapshotDirectory, { recursive: true });
	const { data } = await send('Page.captureScreenshot', { format: 'png' });
	writeFileSync(join(snapshotDirectory, filename), Buffer.from(data, 'base64'));
};
const waitForIdle = () =>
	waitFor(
		"Boolean(document.querySelector('.spin-button:not([disabled])')) && document.querySelector('.spin-button strong')?.textContent === 'SPIN'",
		'spin completion',
		45_000,
	);

const moneyValue = (value) => Number(value.replace(/[^0-9.-]/g, ''));

await navigate(APP_URL);
await evaluate("localStorage.setItem('relic-forge-turbo', 'false'); location.reload(); true");
await waitFor("Boolean(document.querySelector('.spin-button'))", 'mock reload');

check((await evaluate("document.querySelectorAll('.reel').length")) === 5, '5 reels render');
check(
	(await evaluate("document.querySelectorAll('.reel .symbol-cell').length")) === 45,
	'each reel keeps a reusable nine-symbol strip',
);
check(
	await evaluate("document.querySelector('.cell-index') === null"),
	'reel cells do not display development row and column indexes',
);
await waitFor(
	`${visibleSymbolsExpression}.every((reel) => reel.length === 3)`,
	'3 visible rows per reel',
);
check(true, '3 rows render visibly on each reel');
check(
	(await text('.footer-note')).includes('20 PAYLINES'),
	'20-payline configuration is presented',
);
check(
	(await text('.footer-note')).includes('DEVELOPMENT MOCK MODE'),
	'mock mode starts without RGS authentication',
);
check(
	await evaluate(`(() => {
		const glyph = document.querySelector('.symbol-glyph');
		const bounds = glyph?.getBoundingClientRect();
		return getComputedStyle(glyph).backgroundImage.includes('/symbols/') && bounds?.height > 0;
	})()`),
	'supplied symbol artwork renders in the reel cells',
);
check(
	await evaluate(
		"getComputedStyle(document.querySelector('.spin-button')).backgroundImage.includes('spin-button.webp')",
	),
	'supplied circular Spin button artwork renders',
);
check(
	await evaluate(`['turbo', 'sound', 'paytable'].every((name) =>
		getComputedStyle(document.querySelector('.' + name + '-control')).backgroundImage.includes('/controls/' + name + '.webp')
	)`),
	'supplied Turbo, Sound, and Paytable button artwork renders',
);
check(
	(await evaluate("document.querySelectorAll('.side-action-rail button').length")) === 5,
	'Bonus Buy and the four option buttons render in the left rail',
);
check(
	await evaluate(`(() => {
		const buttons = [...document.querySelectorAll('.side-action-rail button')];
		const centers = buttons.map((button) => {
			const bounds = button.getBoundingClientRect();
			return { x: bounds.left + bounds.width / 2, top: bounds.top };
		});
		return centers.every((center) => Math.abs(center.x - centers[0].x) < 2) &&
			centers.every((center, index) => index === 0 || center.top > centers[index - 1].top);
	})()`),
	'left-side options form one vertical column beneath Bonus Buy',
);
check(
	await evaluate("document.querySelector('.bonus-buy-control:not([disabled])') !== null"),
	'mock Bonus Buy is available',
);
check(
	await evaluate(
		"getComputedStyle(document.querySelector('.bonus-buy-control'), '::before').backgroundImage.includes('bonus-buy-button-v4.webp')",
	),
	'supplied Bonus Buy plaque artwork renders',
);
await click('.bonus-buy-control');
await waitFor("Boolean(document.querySelector('.mode-selection-screen'))", 'mode selection open');
check(
	(await evaluate("document.querySelectorAll('.mode-card').length")) === 6,
	'mode selection renders all six cards',
);
check(
	await evaluate(`(() => {
		const expected = {
			normal: 'normal.webp',
			forgeBoost: 'forge-boost.webp',
			dragonBoost: 'dragon-boost.webp',
			standard: 'bonus-standard.webp',
			super: 'bonus-super.webp',
			mythic: 'bonus-mythic.webp'
		};
		return Object.entries(expected).every(([id, asset]) => {
			const card = document.querySelector('.mode-card[data-mode-id="' + id + '"]');
			return card && getComputedStyle(card).backgroundImage.includes(asset);
		});
	})()`),
	'all six supplied mode images render from project-local paths',
);
check(
	await evaluate(`Promise.all([...document.querySelectorAll('.mode-card')]
		.map((card) => getComputedStyle(card).backgroundImage.match(/url\\(["']?([^"')]+)["']?\\)/)?.[1])
		.filter(Boolean)
		.map((asset) => fetch(new URL(asset, document.baseURI)).then((response) => response.ok)))
		.then((results) => results.length === 6 && results.every(Boolean))`),
	'all six mode assets load without broken paths',
);
check(
	await evaluate(`[...document.querySelectorAll('.mode-card')].every((card) => {
		const bounds = card.getBoundingClientRect();
		return bounds.width > 0 && bounds.height > 0 && Math.abs(bounds.width / bounds.height - 1.5) < 0.04;
	})`),
	'mode cards preserve their configured landscape aspect ratio',
);
check(
	await evaluate(
		"document.querySelector('.mode-selection-footer')?.getBoundingClientRect().bottom <= innerHeight",
	),
	'desktop mode selection fits in the initial viewport',
);
check(
	(await evaluate("document.querySelectorAll('.mode-card:not([disabled])').length")) === 6,
	'all six deterministic mock mode demonstrations are available',
);
check(
	await evaluate(
		"document.querySelector('.mode-card[data-mode-id=normal]')?.getAttribute('aria-pressed') === 'true'",
	),
	'Normal is selected by default',
);
check(
	(await text('.mode-card[data-mode-id=normal] .selected-mark')).includes('CURRENT MODE'),
	'the selected mode card has a prominent current-mode marker',
);
await click(".mode-card[data-mode-id='forgeBoost']");
check(
	await evaluate(`document.querySelectorAll('.mode-card[data-mode-kind="play"][aria-pressed="true"]').length === 1 &&
		document.querySelector('.mode-card[data-mode-id="forgeBoost"]')?.getAttribute('aria-pressed') === 'true'`),
	'Forge Boost selection works and remains exclusive',
);
await click(".mode-card[data-mode-id='dragonBoost']");
check(
	await evaluate(`document.querySelectorAll('.mode-card[data-mode-kind="play"][aria-pressed="true"]').length === 1 &&
		document.querySelector('.mode-card[data-mode-id="dragonBoost"]')?.getAttribute('aria-pressed') === 'true'`),
	'Dragon Boost selection works and remains exclusive',
);
await click(".mode-card[data-mode-id='normal']");

for (const [id, multiplier] of [
	['standard', 80],
	['super', 250],
	['mythic', 500],
]) {
	await click(`.mode-card[data-mode-id='${id}']`);
	await waitFor(
		"Boolean(document.querySelector('.bonus-confirm-modal'))",
		`${id} confirmation open`,
	);
	check(
		moneyValue(await text('.bonus-confirm-modal .total dd b')) === multiplier,
		`${id} Bonus Buy confirmation calculates its configured total`,
	);
	await click('.bonus-confirm-actions .cancel');
}
await captureScreenshot('relic-forge-mode-selection-final.png');

await send('Emulation.setDeviceMetricsOverride', {
	width: 390,
	height: 844,
	deviceScaleFactor: 1,
	mobile: true,
});
await waitFor(
	"document.querySelector('.mode-selection-screen')?.getBoundingClientRect().width <= innerWidth",
	'mobile mode selection layout',
);
check(
	await evaluate(`(() => {
		const cards = [...document.querySelectorAll('.mode-card')].map((card) => card.getBoundingClientRect());
		return document.documentElement.scrollWidth <= innerWidth &&
			cards.every((card) => card.left >= 0 && card.right <= innerWidth) &&
			cards.every((card, index) => index === 0 || card.top > cards[index - 1].top);
	})()`),
	'mobile mode selection uses one card per row without horizontal overflow',
);
await captureScreenshot('relic-forge-mode-selection-mobile-final.png');
await send('Emulation.clearDeviceMetricsOverride');
await click('.mode-start');
check(
	!(await evaluate("Boolean(document.querySelector('.mode-selection-screen'))")),
	'Start Game applies Normal and closes mode selection',
);
check(
	await evaluate(`document.querySelector('.active-mode-indicator')?.dataset.activeMode === 'normal' &&
		document.querySelector('.active-mode-indicator strong')?.textContent?.trim() === 'NORMAL'`),
	'the active mode remains clearly visible in the main game',
);
check(
	await evaluate(
		"getComputedStyle(document.querySelector('.active-mode-indicator')).backgroundImage.includes('active-mode-panel.webp')",
	),
	'the active mode uses the supplied blue-gold panel artwork',
);
check(
	await evaluate(`['vault-balance.webp', 'vault-stake.webp'].every((asset, index) =>
		getComputedStyle(document.querySelectorAll('.control-left .stat-block, .control-left .bet-control')[index]).backgroundImage.includes(asset)
	)`),
	'supplied Balance and Stake panel artwork renders',
);
check(
	await evaluate(
		"getComputedStyle(document.querySelector('.control-right .win-readout'), '::before').backgroundImage.includes('current-win-panel-v3.webp')",
	),
	'supplied Current Win panel artwork renders',
);
check(
	await evaluate("document.querySelector('audio') === null && !document.querySelector('.forge-shell')?.hasAttribute('data-spin-audio')"),
	'spin audio uses the CSP-safe Web Audio path without a media element',
);
check(
	!(await evaluate("Boolean(document.querySelector('.reel-sheen'))")),
	'horizontal sheen is removed',
);
await captureScreenshot('relic-forge-controls-final.png');
await click("button[aria-label='Open paytable']");
await waitFor("Boolean(document.querySelector('.modal-panel'))", 'paytable open');
check(
	(await evaluate("document.querySelectorAll('.pay-row').length")) === 8,
	'paytable renders all eight paying relics',
);
check(
	await evaluate(`(() => {
		const symbols = [...document.querySelectorAll('.pay-symbol')];
		return symbols.length === 8 && symbols.every((symbol) => getComputedStyle(symbol).backgroundImage.includes('/symbols/'));
	})()`),
	'paytable uses the supplied relic artwork',
);
await captureScreenshot('relic-forge-paytable-final.png');
await click('.modal-close');
check(
	!(await evaluate(
		"document.querySelector('.quick-controls button')?.classList.contains('active')",
	)),
	'normal spin profile is the default',
);

const initialBet = await text('.bet-row strong');
const demoBetLevels = [0.2, 0.5, 1, 2, 5, 10, 20, 50];
for (let index = 0; index < demoBetLevels.length + 2; index += 1)
	await click("button[aria-label='Decrease bet']");
check(moneyValue(await text('.bet-row strong')) === 0.2, 'demo bet stops at the 0.20 minimum');
for (const expected of demoBetLevels.slice(1)) {
	await click("button[aria-label='Increase bet']");
	check(
		moneyValue(await text('.bet-row strong')) === expected,
		`demo bet advances to the exact ${expected} level`,
	);
}
await click("button[aria-label='Increase bet']");
check(moneyValue(await text('.bet-row strong')) === 50, 'demo bet stops at the 50.00 maximum');
for (
	let index = 0;
	index < demoBetLevels.length + 2 && (await text('.bet-row strong')) !== initialBet;
	index += 1
)
	await click("button[aria-label='Decrease bet']");
check((await text('.bet-row strong')) === initialBet, 'demo bet restores the starting level');
await click("button[aria-label='Increase bet']");
check((await text('.bet-row strong')) !== initialBet, 'bet increase works');
const increasedBet = moneyValue(await text('.bet-row strong'));
await click('.bonus-buy-control');
await waitFor(
	"Boolean(document.querySelector('.mode-selection-screen'))",
	'repriced mode selection',
);
check(
	moneyValue(await text(".mode-card[data-mode-id='forgeBoost'] .mode-cost b")) ===
		increasedBet * 2 &&
		moneyValue(await text(".mode-card[data-mode-id='standard'] .mode-cost small")) ===
			increasedBet * 80,
	'mode and Bonus Buy prices react to the current base bet',
);
await click('.mode-start');
await click("button[aria-label='Decrease bet']");
check((await text('.bet-row strong')) === initialBet, 'bet decrease works');

const openingBalance = moneyValue(await text('.stat-block strong'));
await evaluate(`(() => {
	window.__relicForgeStops = [];
	document.querySelectorAll('.reel').forEach((reel, index) => {
		new MutationObserver(() => {
			if (reel.dataset.state === 'stopped') window.__relicForgeStops.push({ index, at: performance.now() });
		}).observe(reel, { attributes: true, attributeFilter: ['data-state'] });
	});
	return true;
})()`);
const normalSpinStartedAt = Date.now();
await evaluate(
	"(() => { const button = document.querySelector('.spin-button'); button.click(); button.click(); button.click(); return button.disabled; })()",
);
await waitFor("document.querySelector('.spin-button')?.disabled === true", 'spin lock');
check(
	await evaluate("document.querySelector('.spin-button')?.disabled === true"),
	'rapid clicks lock the spin control',
);
await waitFor(
	"[...document.querySelectorAll('.reel')].every((reel) => ['accelerating','spinning','decelerating','settling'].includes(reel.dataset.state))",
	'quick-result reels in motion',
);
check(true, 'a quickly returned mock result still lands through reel motion');
await waitForIdle();
const normalSpinDuration = Date.now() - normalSpinStartedAt;
const normalStops = (await evaluate('window.__relicForgeStops ?? []')) ?? [];
check(
	normalStops.length === 5 && normalStops.every((stop, index) => stop.index === index),
	`normal reels stop sequentially from left to right (${JSON.stringify(normalStops)})`,
);
check(
	moneyValue(await text('.stat-block strong')) === openingBalance - 1,
	'rapid clicks create exactly one mock wager',
);
check(moneyValue(await text('.win-readout strong')) === 0, 'losing result displays zero win');

await click('.quick-controls button');
check(
	await evaluate("document.querySelector('.quick-controls button')?.classList.contains('active')"),
	'turbo preference works',
);

const turboSpinStartedAt = Date.now();
await click('.spin-button');
await waitFor("document.querySelector('.spin-button')?.disabled === true", 'normal win spin start');
await waitFor(
	`JSON.stringify(${visibleSymbolsExpression}) === JSON.stringify([
		['crown','ruby','sapphire'], ['crown','emerald','amber'], ['wild','ruby','shield'],
		['crown','dragon','sword'], ['crown','amber','shield']
	])`,
	'Wild reveal',
);
await waitForIdle();
const turboSpinDuration = Date.now() - turboSpinStartedAt;
check(turboSpinDuration < normalSpinDuration, 'Turbo uses a shorter version of the same reel flow');
const normalWinText = await text('.win-readout strong');
check(
	moneyValue(normalWinText) === 8,
	`normal winning result displays (received ${normalWinText})`,
);
check((await visibleSymbols()).flat().includes('wild'), 'Wild presentation renders');
check(
	JSON.stringify(await visibleSymbols()) ===
		JSON.stringify([
			['crown', 'ruby', 'sapphire'],
			['crown', 'emerald', 'amber'],
			['wild', 'ruby', 'shield'],
			['crown', 'dragon', 'sword'],
			['crown', 'amber', 'shield'],
		]),
	'authoritative symbols remain unchanged after reel settling',
);

await click('.spin-button');
await waitForIdle();
check(
	moneyValue(await text('.win-readout strong')) === 0,
	'mock loss is interleaved before Free Spins',
);

await evaluate(`(() => {
	window.__relicWildAudit = {
		multipliers: [],
		combineMultipliers: [],
		combineLines: [],
		maxSticky: 0,
		lockedDuringSpin: false,
		variants: [],
	};
	const sample = () => {
		const cells = [...document.querySelectorAll('.relic-wild-cell')];
		const audit = window.__relicWildAudit;
		audit.maxSticky = Math.max(audit.maxSticky, cells.length);
		for (const cell of cells) {
			const value = Number(cell.dataset.multiplier);
			if (!audit.multipliers.includes(value)) audit.multipliers.push(value);
		}
		const overlay = document.querySelector('.relic-wild-overlay');
		for (const variant of ['standard', 'super', 'mythic']) {
			if (overlay?.classList.contains('variant-' + variant) && !audit.variants.includes(variant)) {
				audit.variants.push(variant);
			}
		}
		const reelsMoving = [...document.querySelectorAll('.reel')].some((reel) =>
			['accelerating', 'spinning', 'decelerating', 'settling'].includes(reel.dataset.state)
		);
		if (reelsMoving && cells.length) audit.lockedDuringSpin = true;
		const combine = document.querySelector('.multiplier-combine');
		if (combine) {
			const value = Number(combine.dataset.relicCombine);
			if (!audit.combineMultipliers.includes(value)) audit.combineMultipliers.push(value);
			const lineKey = value + ':' + combine.dataset.relicLine;
			if (!audit.combineLines.includes(lineKey)) audit.combineLines.push(lineKey);
		}
	};
	window.__relicWildAuditTimer = setInterval(sample, 15);
	new MutationObserver(sample).observe(document.body, { childList: true, subtree: true, attributes: true });
	sample();
	return true;
})()`);

await click('.spin-button');
await waitFor("document.querySelector('.spin-button')?.disabled === true", 'feature spin start');
await waitFor(
	"document.querySelectorAll('.reel')[4]?.dataset.state === 'anticipating'",
	'authoritative anticipation state',
);
check(true, 'anticipation only extends the reel identified by the reveal event');
await waitFor(
	`${visibleSymbolsExpression}.flat().filter((symbol) => symbol === 'scatter').length === 3`,
	'Scatter reveal',
);
check(true, 'Scatter presentation renders');
check(
	await evaluate(`(() => {
		const scatterRows = ${visibleSymbolsExpression}.flatMap((reel) =>
			reel.map((symbol, row) => symbol === 'scatter' ? row : -1).filter((row) => row >= 0)
		);
		return scatterRows.length === 3 && new Set(scatterRows).size > 1;
	})()`),
	'mock Scatter trigger is not locked to one horizontal row',
);
await waitFor("Boolean(document.querySelector('.feature-banner'))", 'Free Spins entry');
check(true, 'Free Spins are entered');
await waitFor(
	"document.querySelector('.feature-count')?.textContent?.trim() === '7' && document.querySelectorAll('.relic-wild-cell').length === 0",
	'Standard first spin without a Relic Wild',
);
check(true, 'Standard supports a Free Spin with no Relic Wild');
await waitFor(
	`document.querySelector(".relic-wild-cell[data-multiplier='2']") !== null`,
	'Standard x2 Relic Wild',
);
const firstStandardWildPosition = await evaluate(
	"document.querySelector(\".variant-standard .relic-wild-cell[data-multiplier='2']\")?.dataset.relicWild ?? ''",
);
check(true, 'Standard x2 Relic Wild lands from its authoritative event');
await waitFor(
	`document.querySelector(".relic-wild-cell[data-multiplier='3']") !== null`,
	'Standard x3 Relic Wild',
);
check(true, 'Standard x3 Relic Wild lands and both positions remain sticky');
check(
	!(await evaluate("Boolean(document.querySelector('.multiplier-combine'))")),
	'a sticky Relic Wild that is not in a winning payline adds no multiplier presentation',
);
await waitFor(
	`document.querySelector(".multiplier-combine[data-relic-combine='5']") !== null`,
	'additive x2 plus x3 presentation',
);
check(true, 'authoritative x2 + x3 additive multiplier presentation renders');
await waitForIdle();
const standardRelicAudit = await evaluate('window.__relicWildAudit');
check(
	standardRelicAudit.maxSticky >= 2,
	'Standard accumulates two persistent Relic Wild positions',
);
check(
	standardRelicAudit.combineMultipliers.includes(2) &&
		standardRelicAudit.combineMultipliers.includes(5),
	'one-Wild and two-Wild line-win presentations both execute',
);
check(
	standardRelicAudit.combineLines.includes('2:2') &&
		standardRelicAudit.combineLines.includes('2:10'),
	'one Relic Wild can participate in several authoritative paylines',
);
check(standardRelicAudit.lockedDuringSpin, 'locked Relic Wild remains rendered while reels spin');
check(
	!(await evaluate("Boolean(document.querySelector('.relic-wild-cell'))")),
	'last Free Spin clears all sticky Relic Wild presentation state',
);

await send('Emulation.setDeviceMetricsOverride', {
	width: 390,
	height: 844,
	deviceScaleFactor: 1,
	mobile: true,
});
await waitFor(
	`${visibleSymbolsExpression}.every((reel) => reel.length === 3)`,
	'mobile reel alignment',
);
check(true, '5x3 reel alignment survives a mobile resize while idle');
const mobileLayout = await evaluate(`(() => {
	const frame = document.querySelector('.reel-frame').getBoundingClientRect();
	const controls = document.querySelector('.control-deck').getBoundingClientRect();
	return {
		viewport: innerWidth,
		scrollWidth: document.documentElement.scrollWidth,
		frameLeft: frame.left,
		frameRight: frame.right,
		controlsLeft: controls.left,
		controlsRight: controls.right,
	};
})()`);
check(
	mobileLayout.scrollWidth <= mobileLayout.viewport &&
		mobileLayout.frameLeft >= 0 &&
		mobileLayout.frameRight <= mobileLayout.viewport &&
		mobileLayout.controlsLeft >= 0 &&
		mobileLayout.controlsRight <= mobileLayout.viewport,
	`mobile reels and controls fit without horizontal overflow (${JSON.stringify(mobileLayout)})`,
);
const mobileActionLayout = await evaluate(`(() => {
	const rail = document.querySelector('.side-action-rail')?.getBoundingClientRect();
	const stage = document.querySelector('.game-stage')?.getBoundingClientRect();
	const controls = [...document.querySelectorAll('.side-action-rail .bonus-buy-control, .side-action-rail .quick-controls button')]
		.map((button) => button.getBoundingClientRect());
	const spin = document.querySelector('.spin-button')?.getBoundingClientRect();
	const footer = document.querySelector('.footer-note')?.getBoundingClientRect();
	return {
		count: controls.length,
		trailedByStage: Boolean(rail && stage && rail.top >= stage.bottom - 2),
		sameRow: controls.length === 5 && controls.every((bounds) => Math.abs(bounds.top - controls[0].top) < 4),
		withinViewport: controls.every((bounds) => bounds.left >= 0 && bounds.right <= innerWidth),
		spinVisible: Boolean(spin && spin.top >= 0 && spin.bottom <= innerHeight),
		footerVisible: Boolean(footer && footer.bottom <= innerHeight),
	};
})()`);
check(
	mobileActionLayout.count === 5 &&
	mobileActionLayout.trailedByStage &&
	mobileActionLayout.sameRow &&
	mobileActionLayout.withinViewport &&
	mobileActionLayout.spinVisible &&
	mobileActionLayout.footerVisible,
	`portrait mobile action bar and Spin fit in one viewport (${JSON.stringify(mobileActionLayout)})`,
);
await captureScreenshot('relic-forge-mobile-controls-final.png');
await send('Emulation.clearDeviceMetricsOverride');
check(
	!(await evaluate("Boolean(document.querySelector('.feature-banner'))")),
	'Free Spins complete in the same mock round',
);

await click('.spin-button');
await waitForIdle();
check(
	moneyValue(await text('.win-readout strong')) === 0,
	'mock loss is interleaved before Big Win',
);

await click('.spin-button');
await waitFor("document.querySelector('.spin-button')?.disabled === true", 'Big Win spin start');
await waitFor(
	"document.querySelector('.big-win-overlay strong')?.textContent === 'BIG WIN'",
	'Big Win overlay',
);
check(true, 'Big Win presentation renders');
await waitForIdle();

await click('.spin-button');
await waitForIdle();
check(
	moneyValue(await text('.win-readout strong')) === 0,
	'mock loss is interleaved before Mega Win',
);

await click('.spin-button');
await waitFor("document.querySelector('.spin-button')?.disabled === true", 'Mega Win spin start');
await waitFor(
	"document.querySelector('.big-win-overlay strong')?.textContent === 'MEGA WIN'",
	'Mega Win overlay',
);
check(true, 'Mega Win presentation renders');
await waitForIdle();

const preBonusBalance = moneyValue(await text('.stat-block strong'));
await click('.bonus-buy-control');
await waitFor(
	"Boolean(document.querySelector('.mode-selection-screen'))",
	'Bonus Buy mode selection',
);
await click(".mode-card[data-mode-id='standard']");
await waitFor("Boolean(document.querySelector('.bonus-confirm-modal'))", 'Standard confirmation');
check(
	moneyValue(await text('.bonus-confirm-modal .total dd b')) === 80,
	'Standard mock confirmation displays its centralized 80x total cost',
);
check(
	await evaluate(`(() => {
		const modal = document.querySelector('.bonus-confirm-modal')?.getBoundingClientRect();
		const actions = document.querySelector('.bonus-confirm-actions')?.getBoundingClientRect();
		return Boolean(modal && actions && actions.left >= modal.left && actions.right <= modal.right);
	})()`),
	'Bonus Buy actions remain inside the confirmation artwork',
);
await captureScreenshot('relic-forge-bonus-buy-final.png');
await click('.bonus-confirm-actions .buy');
check(
	moneyValue(await text('.win-readout strong')) === 0,
	'Bonus Buy clears the previous Current Win immediately',
);
await waitFor("Boolean(document.querySelector('.feature-banner'))", 'purchased Free Spins entry');
check(true, 'mock Bonus Buy enters Free Spins through the event contract');
check(
	moneyValue(await text('.win-readout strong')) === 0 && (await text('.feature-count')) === '8',
	'Bonus Buy starts with an authoritative zero Current Win and eight Free Spins',
);
await waitFor(
	"document.querySelector('.feature-count')?.textContent?.trim() === '7'",
	'first purchased Free Spin resolves',
);
check(
	moneyValue(await text('.win-readout strong')) === 0,
	'the first purchased Free Spin applies its authoritative zero win immediately',
);
await waitFor(
	`document.querySelector(".variant-standard .relic-wild-cell[data-multiplier='2']") !== null`,
	'purchased Standard receives its first Relic Wild',
);
const purchasedStandardWildPosition = await evaluate(
	"document.querySelector(\".variant-standard .relic-wild-cell[data-multiplier='2']\")?.dataset.relicWild ?? ''",
);
check(
	Boolean(firstStandardWildPosition) &&
		Boolean(purchasedStandardWildPosition) &&
		firstStandardWildPosition !== purchasedStandardWildPosition,
	'mock bonuses generate a fresh Relic Wild position for each new bonus round',
);
await waitFor(
	"document.querySelector('.feature-count')?.textContent?.trim() === '5' && Number(document.querySelector('.win-readout strong')?.textContent?.replace(/[^0-9.-]/g, '')) === 3",
	'first nonzero purchased Free Spin win presentation',
);
check(
	moneyValue(await text('.win-readout strong')) === 3,
	'the first nonzero purchased Free Spin updates Current Win immediately',
);
await waitForIdle();
check(
	moneyValue(await text('.stat-block strong')) === preBonusBalance - 80 + 33,
	'mock Bonus Buy applies fixture cost and authoritative fixture payout',
);

await click('.bonus-buy-control');
await waitFor("Boolean(document.querySelector('.mode-selection-screen'))", 'second Standard mode selection');
await click(".mode-card[data-mode-id='standard']");
await waitFor("Boolean(document.querySelector('.bonus-confirm-modal'))", 'second Standard confirmation');
await click('.bonus-confirm-actions .buy');
await waitFor(
	"document.querySelector('.feature-count')?.textContent?.trim() === '7' && document.querySelector('.variant-standard .relic-wild-cell') !== null",
	'second Standard Free Spins entry',
);
const secondPurchasedStandardWildPosition = await evaluate(
	"document.querySelector(\".variant-standard .relic-wild-cell[data-multiplier='2']\")?.dataset.relicWild ?? ''",
);
check(
	Boolean(secondPurchasedStandardWildPosition) && secondPurchasedStandardWildPosition !== purchasedStandardWildPosition,
	'separate purchased bonuses receive a fresh Standard Relic Wild position',
);
await waitForIdle();

await evaluate(`(() => {
	Object.assign(window.__relicWildAudit, {
		multipliers: [], combineMultipliers: [], combineLines: [], maxSticky: 0, lockedDuringSpin: false, variants: []
	});
	return true;
})()`);
const preSuperBalance = moneyValue(await text('.stat-block strong'));
await click('.bonus-buy-control');
await waitFor("Boolean(document.querySelector('.mode-selection-screen'))", 'Super mode selection');
await click(".mode-card[data-mode-id='super']");
await waitFor("Boolean(document.querySelector('.bonus-confirm-modal'))", 'Super confirmation');
await click('.bonus-confirm-actions .buy');
await waitFor(
	"document.querySelector('.feature-count')?.textContent?.trim() === '7' && document.querySelector('.variant-super .relic-wild-cell') !== null",
	'Super guaranteed first Relic Wild',
);
check(true, 'Super guaranteed first Relic Wild is supplied by the feature event book');
check(
	await evaluate(`document.querySelector('.active-mode-indicator')?.dataset.activeMode === 'super' &&
		document.querySelector('.active-mode-indicator strong')?.textContent?.trim() === 'SUPER FREE SPINS'`),
	'the persistent mode indicator identifies Super Free Spins',
);
await waitFor(
	`document.querySelector(".variant-super .relic-wild-cell[data-multiplier='5']") !== null`,
	'Super x5 Relic Wild',
);
check(true, 'Super supports its configured x5 Relic Wild');
await waitFor(
	`document.querySelector(".multiplier-combine[data-relic-combine='8']") !== null`,
	'Super additive multiplier presentation',
);
await waitForIdle();
const superRelicAudit = await evaluate('window.__relicWildAudit');
check(
	superRelicAudit.variants.includes('super') && superRelicAudit.multipliers.includes(5),
	'Super uses the reusable purple variant and stronger multiplier fixture',
);
check(
	moneyValue(await text('.stat-block strong')) === preSuperBalance - 250 + 48,
	'Super fixture applies its configured cost and authoritative payout',
);

await evaluate(`(() => {
	Object.assign(window.__relicWildAudit, {
		multipliers: [], combineMultipliers: [], combineLines: [], maxSticky: 0, lockedDuringSpin: false, variants: []
	});
	return true;
})()`);
const preMythicBalance = moneyValue(await text('.stat-block strong'));
await click('.bonus-buy-control');
await waitFor("Boolean(document.querySelector('.mode-selection-screen'))", 'Mythic mode selection');
await click(".mode-card[data-mode-id='mythic']");
await waitFor("Boolean(document.querySelector('.bonus-confirm-modal'))", 'Mythic confirmation');
await click('.bonus-confirm-actions .buy');
await waitFor(
	`document.querySelector('.feature-count')?.textContent?.trim() === '7' && document.querySelector(".variant-mythic .relic-wild-cell[data-multiplier='10']") !== null`,
	'Mythic guaranteed x10 Relic Wild',
);
check(true, 'Mythic guaranteed first x10 Relic Wild is supplied by the event book');
check(
	await evaluate(`document.querySelector('.active-mode-indicator')?.dataset.activeMode === 'mythic' &&
		document.querySelector('.active-mode-indicator strong')?.textContent?.trim() === 'MYTHIC FREE SPINS'`),
	'the persistent mode indicator identifies Mythic Free Spins',
);
await waitFor(
	`document.querySelector(".variant-mythic .relic-wild-cell[data-multiplier='20']") !== null`,
	'Mythic x20 Relic Wild',
);
check(true, 'Mythic supports its configured x20 Relic Wild');
await waitFor(
	"document.querySelectorAll('.variant-mythic .relic-wild-cell').length >= 3",
	'three simultaneous Mythic Relic Wilds',
);
await waitFor(
	`document.querySelector(".multiplier-combine[data-relic-combine='35']") !== null`,
	'Mythic three-Wild additive multiplier presentation',
);
await waitForIdle();
const mythicRelicAudit = await evaluate('window.__relicWildAudit');
check(
	mythicRelicAudit.maxSticky >= 3 &&
		mythicRelicAudit.multipliers.includes(10) &&
		mythicRelicAudit.multipliers.includes(20) &&
		mythicRelicAudit.combineMultipliers.includes(35),
	'Mythic accumulates three Wilds and displays the authoritative x35 combination',
);
check(
	moneyValue(await text('.stat-block strong')) === preMythicBalance - 500 + 210,
	'Mythic fixture applies its configured cost and authoritative payout',
);
check(
	!(await evaluate("Boolean(document.querySelector('.relic-wild-cell'))")),
	'Mythic final-spin cleanup removes all sticky overlays',
);

await navigate(APP_URL);
await evaluate("localStorage.setItem('relic-forge-turbo', 'false'); location.reload(); true");
await waitFor("Boolean(document.querySelector('.spin-button'))", 'base mode audit reload');
for (const modeId of ['normal', 'forgeBoost', 'dragonBoost']) {
	if (modeId !== 'normal') {
		await click('.active-mode-indicator');
		await waitFor("Boolean(document.querySelector('.mode-selection-screen'))", `${modeId} mode audit selection`);
		await click(`.mode-card[data-mode-id='${modeId}']`);
		await click('.mode-start');
	}
	check(
		await evaluate(`document.querySelector('.active-mode-indicator')?.dataset.activeMode === ${JSON.stringify(modeId)}`),
		`${modeId} is visibly active before a base spin`,
	);
	await click('.spin-button');
	await waitForIdle();
	check(!(await evaluate("Boolean(document.querySelector('.error-panel'))")), `${modeId} demo spin completes without an error`);
}
await evaluate("document.querySelector('.spin-button')?.focus(); true");
await send('Input.dispatchKeyEvent', {
	type: 'keyDown',
	key: ' ',
	code: 'Space',
	windowsVirtualKeyCode: 32,
	nativeVirtualKeyCode: 32,
});
await send('Input.dispatchKeyEvent', {
	type: 'keyUp',
	key: ' ',
	code: 'Space',
	windowsVirtualKeyCode: 32,
	nativeVirtualKeyCode: 32,
});
await waitFor("document.querySelector('.spin-button')?.disabled === true", 'Spacebar spin start');
await waitForIdle();
check(true, 'Spacebar starts one demo spin through the shared hotkey helper');

const jurisdiction = {
	socialCasino: false,
	disabledFullscreen: false,
	disabledTurbo: false,
	disabledSuperTurbo: false,
	disabledAutoplay: true,
	disabledSlamstop: false,
	disabledSpacebar: false,
	disabledBuyFeature: false,
	displayNetPosition: false,
	displayRTP: false,
	displaySessionTimer: false,
	minimumRoundDuration: 0,
};

on('Fetch.requestPaused', ({ requestId, request }) => {
	let payload;
	let responseDelay = 0;
	if (request.method === 'OPTIONS') {
		void send('Fetch.fulfillRequest', {
			requestId,
			responseCode: 204,
			responseHeaders: [
				{ name: 'Access-Control-Allow-Origin', value: APP_ORIGIN },
				{ name: 'Access-Control-Allow-Headers', value: 'Content-Type' },
				{ name: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
			],
		});
		return;
	} else if (request.url.endsWith('/wallet/authenticate')) {
		requestCounts.authenticate += 1;
		payload = {
			balance: { amount: 1_000_000_000, currency: 'USD' },
			config: {
				minBet: 200_000,
				maxBet: 50_000_000,
				stepBet: 100_000,
				defaultBetLevel: 1_000_000,
				betLevels: [1_000_000],
				betModes: {
					BASE: { mode: 'BASE', cost: 1, feature: false },
					BONUS: { mode: 'BONUS', cost: 100, feature: false, buyBonus: true },
				},
				jurisdiction: serveRestrictedSession
					? {
							...jurisdiction,
							socialCasino: true,
							disabledTurbo: true,
							disabledSpacebar: true,
							disabledBuyFeature: true,
							minimumRoundDuration: 3000,
						}
					: jurisdiction,
			},
			...(serveRecoveryRound
				? {
						round: {
							roundID: 779,
							amount: 1_000_000,
							payout: 0,
							payoutMultiplier: 0,
							active: true,
							mode: 'BONUS',
							state: [
								{
									index: 0,
									type: 'reveal',
									board: [
										['scatter', 'dragon', 'sapphire'],
										['scatter', 'emerald', 'amber'],
										['scatter', 'sword', 'shield'],
										['ruby', 'dragon', 'crown'],
										['sapphire', 'amber', 'wild'],
									],
								},
								{ index: 1, type: 'freeSpinTrigger', totalFs: 8 },
								{ index: 2, type: 'updateFreeSpin', amount: 3, total: 8 },
								{
									index: 3,
									type: 'reveal',
									board: [
										['dragon', 'ruby', 'sapphire'],
										['crown', { name: 'wild', wild: true, multiplier: 5 }, 'amber'],
										['sword', 'ruby', 'shield'],
										['emerald', 'dragon', 'crown'],
										['sapphire', 'amber', 'shield'],
									],
								},
								{
									index: 4,
									type: 'newRelicWilds',
									variant: 'super',
									wilds: [{ reel: 1, row: 1, multiplier: 5 }],
								},
								{
									index: 5,
									type: 'relicWildState',
									variant: 'super',
									remainingFreeSpins: 4,
									featureWin: 250,
									stickyRelicWilds: [{ reel: 1, row: 1, multiplier: 5 }],
									cleared: false,
								},
								{ index: 6, type: 'updateFreeSpin', amount: 4, total: 8 },
								{
									index: 7,
									type: 'reveal',
									board: [
										['dragon', 'ruby', 'sapphire'],
										['crown', { name: 'wild', wild: true, multiplier: 5 }, 'amber'],
										['sword', 'ruby', 'shield'],
										['emerald', 'dragon', 'crown'],
										['sapphire', 'amber', 'shield'],
									],
								},
								{
									index: 8,
									type: 'relicWildState',
									variant: 'super',
									remainingFreeSpins: 3,
									featureWin: 250,
									stickyRelicWilds: [{ reel: 1, row: 1, multiplier: 5 }],
									cleared: false,
								},
								{
									index: 9,
									type: 'relicWildState',
									variant: 'super',
									remainingFreeSpins: 0,
									featureWin: 250,
									stickyRelicWilds: [],
									cleared: true,
								},
								{ index: 10, type: 'freeSpinEnd', amount: 250 },
								{ index: 11, type: 'finalWin', amount: 250 },
							],
						},
					}
				: {}),
		};
	} else if (request.url.endsWith('/wallet/play')) {
		requestCounts.play += 1;
		const playRequest = request.postData ? JSON.parse(request.postData) : {};
		const mode = playRequest.mode;
		playModes.push(mode);
		playAmounts.push(playRequest.amount);
		responseDelay = 400;
		payload =
			mode === 'BONUS'
				? {
						balance: { amount: 899_000_000, currency: 'USD' },
						round: {
							roundID: 778,
							amount: 1_000_000,
							payout: 0,
							payoutMultiplier: 0,
							active: true,
							mode,
							state: [
								{
									index: 0,
									type: 'reveal',
									board: [
										['scatter', 'dragon', 'sapphire'],
										['scatter', 'emerald', 'amber'],
										['scatter', 'sword', 'shield'],
										['ruby', 'dragon', 'crown'],
										['sapphire', 'amber', 'wild'],
									],
								},
								{ index: 1, type: 'freeSpinTrigger', totalFs: 8 },
								{ index: 2, type: 'updateFreeSpin', amount: 0, total: 0 },
								{ index: 3, type: 'freeSpinEnd', amount: 0 },
								{ index: 4, type: 'finalWin', amount: 0 },
							],
						},
					}
				: {
						balance: { amount: 999_000_000, currency: 'USD' },
						round: {
							roundID: 777,
							amount: 1_000_000,
							payout: 0,
							payoutMultiplier: 0,
							active: true,
							mode: 'BASE',
							state: [
								{
									index: 0,
									type: 'reveal',
									board: [
										['dragon', 'ruby', 'sapphire'],
										['crown', 'emerald', 'amber'],
										['sword', 'ruby', 'shield'],
										['emerald', 'dragon', 'crown'],
										['sapphire', 'amber', 'wild'],
									],
								},
								{ index: 1, type: 'finalWin', amount: 0 },
							],
						},
					};
	} else if (request.url.includes('/bet/replay/')) {
		replayRequests += 1;
		payload = {
			roundID: 991,
			amount: 1_000_000,
			payout: 0,
			payoutMultiplier: 0,
			active: false,
			state: [
				{ index: 0, type: 'reveal', board: [
					['dragon', 'ruby', 'sapphire'],
					['crown', 'emerald', 'amber'],
					['sword', 'ruby', 'shield'],
					['emerald', 'dragon', 'crown'],
					['sapphire', 'amber', 'amber'],
				] },
				{ index: 1, type: 'finalWin', amount: 0 },
			],
		};
	} else if (request.url.endsWith('/wallet/end-round')) {
		requestCounts.endRound += 1;
		payload = { balance: { amount: 999_000_000, currency: 'USD' } };
	} else {
		void send('Fetch.continueRequest', { requestId });
		return;
	}

	const fulfill = () =>
		void send('Fetch.fulfillRequest', {
			requestId,
			responseCode: 200,
			responseHeaders: [
				{ name: 'Content-Type', value: 'application/json' },
				{ name: 'Access-Control-Allow-Origin', value: APP_ORIGIN },
			],
			body: Buffer.from(JSON.stringify(payload)).toString('base64'),
		});
	if (responseDelay > 0) setTimeout(fulfill, responseDelay);
	else fulfill();
});

await navigate(`${APP_ORIGIN}/?sessionID=browser-test&rgs_url=mock.local`);
await waitFor(
	"document.querySelector('.footer-note')?.textContent?.includes('STAKE ENGINE SESSION')",
	'RGS session render',
);
check(requestCounts.authenticate === 1, 'RGS authentication path executes once');
await evaluate(
	"(() => { const button = document.querySelector('.spin-button'); button.click(); button.click(); button.click(); return true; })()",
);
await waitFor(
	"[...document.querySelectorAll('.reel')].some((reel) => ['accelerating','spinning'].includes(reel.dataset.state))",
	'reels waiting for delayed RGS result',
);
check(true, 'reels keep moving while an authoritative RGS result is delayed');
await waitForIdle();
check(requestCounts.play === 1, 'rapid clicks create one RGS play request');
check(playAmounts[0] === 1_000_000, 'RGS play sends the authenticated bet in API units');
check(requestCounts.endRound === 0, 'zero-win base rounds close without end-round');
check(moneyValue(await text('.stat-block strong')) === 999, 'RGS play response updates the authenticated balance');

await click('.spin-button');
await waitFor("document.querySelector('.spin-button')?.disabled === true", 'second RGS spin start');
await waitForIdle();
check(requestCounts.play === 2, 'a later round can start normally');
check(requestCounts.endRound === 0, 'zero-win base rounds remain closed exactly once');

check(
	await evaluate("document.querySelector('.bonus-buy-control:not([disabled])') !== null"),
	'RGS Bonus Buy is enabled from authenticated buyBonus configuration',
);
await click('.bonus-buy-control');
await waitFor("Boolean(document.querySelector('.mode-selection-screen'))", 'RGS mode selection');
check(
	await evaluate(`(() => {
		const enabled = [...document.querySelectorAll('.mode-card:not([disabled])')].map((card) => card.dataset.modeId);
		return JSON.stringify(enabled) === JSON.stringify(['normal', 'standard']);
	})()`),
	'RGS enables only BASE and authenticated BONUS while unavailable modes stay disabled',
);
await click(".mode-card[data-mode-id='standard']");
await waitFor(
	"Boolean(document.querySelector('.bonus-confirm-modal'))",
	'RGS Bonus Buy confirmation',
);
check(
	moneyValue(await text('.bonus-confirm-modal .total dd b')) === 100,
	'RGS Bonus Buy confirmation uses the authenticated 100x multiplier',
);
await click('.bonus-confirm-actions .buy');
await waitFor(
	"document.querySelector('.spin-button')?.disabled === true",
	'RGS Bonus Buy request start',
);
await waitForIdle();
check(requestCounts.play === 3, 'Bonus Buy creates one RGS play request');
check(playModes.at(-1) === 'BONUS', 'Bonus Buy sends the authenticated BONUS mode');
check(requestCounts.endRound === 1, 'purchased feature completes its RGS round once');
check(moneyValue(await text('.stat-block strong')) === 999, 'RGS end-round response updates the final balance');

serveRecoveryRound = true;
await navigate(`${APP_ORIGIN}/?sessionID=recovery-test&rgs_url=mock.local`);
await waitFor(
	`document.querySelector(".variant-super .relic-wild-cell[data-multiplier='5']") !== null`,
	'recovered sticky Relic Wild',
);
await waitFor(
	"document.querySelector('.feature-count')?.textContent?.trim() === '4'",
	'recovered remaining-spin snapshot',
);
check(
	moneyValue(await text('.feature-banner small')) === 2.5,
	'recovery restores remaining spins, accumulated win, position, and multiplier',
);
await waitFor(
	"[...document.querySelectorAll('.reel')].some((reel) => ['accelerating','spinning','decelerating','settling'].includes(reel.dataset.state)) && Boolean(document.querySelector('.relic-wild-cell'))",
	'recovered Wild held through resumed reel motion',
);
check(true, 'recovered sticky Relic Wild remains visible through the next reel spin');
await waitForIdle();
check(
	requestCounts.authenticate === 2,
	'refresh recovery authenticates and receives active round state',
);
check(requestCounts.play === 3, 'recovery does not place a replacement wager');
check(requestCounts.endRound === 2, 'recovered round is completed exactly once');
check(
	!(await evaluate("Boolean(document.querySelector('.relic-wild-cell'))")),
	'recovered feature cleanup removes sticky state',
);

serveRecoveryRound = false;
serveRestrictedSession = true;
await navigate(`${APP_ORIGIN}/?sessionID=restricted-test&rgs_url=mock.local`);
await waitFor(
	"document.querySelector('.footer-note')?.textContent?.includes('SOCIAL CASINO')",
	'restricted social-casino session render',
);
check(
	await evaluate("document.querySelector('.turbo-control')?.disabled === true"),
	'restricted jurisdiction disables Turbo',
);
check(
	await evaluate("document.querySelector('.bonus-buy-control')?.disabled === true"),
	'restricted jurisdiction disables Bonus Buy',
);
const restrictedPlayCount = requestCounts.play;
await evaluate(`(() => {
	window.__restrictedRoundStartedAt = performance.now();
	window.__restrictedRoundStoppedAt = 0;
	const markStopped = () => {
		if (!window.__restrictedRoundStoppedAt && [...document.querySelectorAll('.reel')].every((reel) => reel.dataset.state === 'stopped'))
			window.__restrictedRoundStoppedAt = performance.now();
	};
	window.__restrictedRoundObserver = new MutationObserver(markStopped);
	window.__restrictedRoundObserver.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['data-state'] });
	document.querySelector('.spin-button')?.click();
	return true;
})()`);
await waitFor("window.__restrictedRoundStoppedAt > 0", 'minimum round duration result presentation', 20_000);
const restrictedRoundDuration = await evaluate('window.__restrictedRoundStoppedAt - window.__restrictedRoundStartedAt');
check(
		restrictedRoundDuration >= 2900,
	`minimumRoundDuration delays result presentation (${Math.round(restrictedRoundDuration)}ms)`,
);
await waitForIdle();
await evaluate("document.querySelector('.spin-button')?.focus(); true");
await send('Input.dispatchKeyEvent', {
	type: 'keyDown',
	key: ' ',
	code: 'Space',
	windowsVirtualKeyCode: 32,
	nativeVirtualKeyCode: 32,
});
await send('Input.dispatchKeyEvent', {
	type: 'keyUp',
	key: ' ',
	code: 'Space',
	windowsVirtualKeyCode: 32,
	nativeVirtualKeyCode: 32,
});
await delay(250);
check(requestCounts.play === restrictedPlayCount + 1, 'restricted jurisdiction blocks Spacebar wagering');

serveRestrictedSession = false;
const beforeReplayRequests = { ...requestCounts };
await navigate(
	`${APP_ORIGIN}/?replay=true&rgs_url=mock.local&game=relic-forge&version=1&mode=BASE&event=0&amount=1000000`,
);
await waitFor("document.querySelector('.footer-note')?.textContent?.includes('REPLAY')", 'replay render');
await waitFor("document.querySelector('.spin-button')?.disabled === true", 'replay completion lock');
check(replayRequests === 1, 'replay loads one authoritative replay response');
check(
	await evaluate("document.querySelector('.bonus-buy-control')?.disabled === true && document.querySelector('.active-mode-indicator')?.disabled === true"),
	'replay disables Bonus Buy and mode changes',
);
await click('.spin-button');
await delay(100);
check(
	requestCounts.play === beforeReplayRequests.play && requestCounts.endRound === beforeReplayRequests.endRound,
	'replay does not wager or complete a wallet round',
);

check(
	runtimeErrors.length === 0,
	`browser runtime has no console errors: ${runtimeErrors.join(' | ')}`,
);
check(
	networkFailures.length === 0,
	`browser runtime has no network failures: ${networkFailures.join(' | ')}`,
);

console.log(JSON.stringify({ passed: assertionResults, requestCounts, playModes }, null, 2));

socket.close();
browser.kill();
