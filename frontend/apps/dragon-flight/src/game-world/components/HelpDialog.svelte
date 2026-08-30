<script lang="ts">
	type Props = {
		open: boolean;
		onClose: () => void;
	};

	type GuideItem = {
		name: string;
		description: string;
	};

	let { open, onClose }: Props = $props();
	let dialogElement = $state<HTMLDialogElement>();

	const creatures: GuideItem[] = [
		{ name: 'Tiny Bat', description: 'Light, agile and quick to respond.' },
		{ name: 'Firebird', description: 'A lively flier with a bright, energetic feel.' },
		{ name: 'Wyvern', description: 'A balanced, responsive sky guardian.' },
		{ name: 'Dragon', description: 'The classic Relic Forge flight profile.' },
		{ name: 'Ancient Dragon', description: 'Large, weighty and dramatic in motion.' },
	];

	const hazards = ['Fire Gate', 'Forge Hammer', 'Chain Tunnel', 'Lava Column', 'Spike Gate', 'Wind Tunnel'];
	const relicEvents = ['Common Relic', 'Fire Relic', 'Emerald Relic', 'Ancient Relic', 'Mythic Relic'];
	const portals = ['Multiplier Portal', 'Relic Portal', 'Vault Portal', 'Chaos Portal'];
	const bosses = ['Ancient Wyrm', 'Forge Guardian'];

	$effect(() => {
		if (!dialogElement) return;

		if (open && !dialogElement.open) {
			dialogElement.showModal();
		} else if (!open && dialogElement.open) {
			dialogElement.close();
		}
	});

	function requestClose() {
		if (dialogElement?.open) {
			dialogElement.close();
		} else {
			onClose();
		}
	}

	function handleCancel(event: Event) {
		event.preventDefault();
		requestClose();
	}

	function handleWindowClick(event: MouseEvent) {
		if (open && event.target === dialogElement) requestClose();
	}
</script>

<svelte:window onclick={handleWindowClick} />

<dialog
		bind:this={dialogElement}
		class="help-dialog"
		aria-labelledby="dragon-flight-help-title"
		aria-describedby="dragon-flight-help-summary"
		oncancel={handleCancel}
		onclose={onClose}
>
	<div class="help-panel">
		<header class="help-header">
			<div>
				<p class="help-kicker">DRAGON FLIGHT GUIDE</p>
				<h2 id="dragon-flight-help-title">How to Play</h2>
				<p id="dragon-flight-help-summary">A quick guide to this local fantasy flight prototype.</p>
			</div>
			<button class="close-button" type="button" aria-label="Close game guide" onclick={requestClose}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
			</button>
		</header>

		<div class="help-content">
			<section aria-labelledby="help-play">
				<h3 id="help-play">HOW TO PLAY</h3>
				<ol>
					<li>Choose a creature.</li>
					<li>Choose your local prototype bet.</li>
					<li>Choose a flight path.</li>
					<li>Choose a relic.</li>
					<li>Choose a launch style.</li>
					<li>Choose presentation weather.</li>
					<li>Choose a time of day.</li>
					<li>Press <strong>FLY</strong>.</li>
					<li>Watch the complete flight.</li>
					<li>The flight may encounter hazards, relics, portals and bosses.</li>
					<li>The round ends with a crash, landing or vault.</li>
					<li>Final win is based on the final multiplier.</li>
				</ol>
			</section>

			<section aria-labelledby="help-creatures">
				<h3 id="help-creatures">CREATURES</h3>
				<div class="guide-grid creature-grid">
					{#each creatures as creature (creature.name)}
						<article class="guide-card"><strong>{creature.name}</strong><span>{creature.description}</span></article>
					{/each}
				</div>
				<p class="note">Creature selection changes presentation and movement feel only. It does not change win, multiplier, payout or risk behavior.</p>
			</section>

			<section aria-labelledby="help-bet">
				<h3 id="help-bet">BET</h3>
				<p>This is a local prototype amount from <strong>$0.10</strong> to <strong>$100.00</strong>, shown to two decimal places. Use + or − to move by $0.10, or edit the amount directly.</p>
				<div class="formula">Final win = bet × final multiplier</div>
				<p class="note">This formula is for the local prototype display only. It is not a wallet wager or a production payout calculation.</p>
			</section>

			<section aria-labelledby="help-paths">
				<h3 id="help-paths">FLIGHT PATH</h3>
				<div class="guide-grid three-grid">
					<article class="guide-card"><strong>SAFE</strong><span>More stable flights, smaller multiplier potential and a lower-volatility style.</span></article>
					<article class="guide-card"><strong>BALANCED</strong><span>Balanced risk and reward.</span></article>
					<article class="guide-card"><strong>DANGER</strong><span>More crashes, higher volatility and rare larger multiplier outcomes.</span></article>
				</div>
				<p class="note">Path choice currently affects local mock presentation only. It is not final RTP, casino math or a certified risk profile.</p>
			</section>

			<section aria-labelledby="help-relics">
				<h3 id="help-relics">RELICS</h3>
				<div class="guide-grid three-grid">
					<article class="guide-card"><strong>GUARDIAN RELIC</strong><span>Stable and defensive flight profile.</span></article>
					<article class="guide-card"><strong>FORTUNE RELIC</strong><span>More treasure and relic-focused events.</span></article>
					<article class="guide-card"><strong>CHAOS RELIC</strong><span>More volatile flights, portals, bosses and high-intensity events.</span></article>
				</div>
				<p class="note">These profiles describe current local prototype behavior. They are not final Stake math or production payout rules.</p>
			</section>

			<section aria-labelledby="help-launch">
				<h3 id="help-launch">LAUNCH STYLE</h3>
				<div class="guide-grid three-grid">
					<article class="guide-card"><strong>GLIDE</strong><span>Smooth horizontal launch.</span></article>
					<article class="guide-card"><strong>BOOST</strong><span>Strong upward launch.</span></article>
					<article class="guide-card"><strong>DIVE</strong><span>High start with downward entry.</span></article>
				</div>
				<p class="note">Launch style is presentation only. It does not change winning chance, multiplier, payout or risk.</p>
			</section>

			<section aria-labelledby="help-weather">
				<h3 id="help-weather">WEATHER</h3>
				<div class="guide-grid three-grid">
					<article class="guide-card"><strong>CLEAR</strong><span>Normal atmosphere with clean visibility and subtle haze.</span></article>
					<article class="guide-card"><strong>RAIN</strong><span>Rain streaks, cooler lighting and a wet atmospheric glow.</span></article>
					<article class="guide-card"><strong>STORM</strong><span>Heavy rain, wind movement and intermittent lightning.</span></article>
					<article class="guide-card"><strong>FOG</strong><span>Layered moving fog with soft atmospheric depth.</span></article>
					<article class="guide-card"><strong>SNOW</strong><span>Drifting snowfall and a colder visual atmosphere.</span></article>
					<article class="guide-card"><strong>INFERNO</strong><span>Ash, embers and intense forge heat effects.</span></article>
				</div>
				<p class="note">Weather is cosmetic and presentation only. It does not affect winning chances, crashes, multipliers or payouts.</p>
			</section>

			<section aria-labelledby="help-time">
				<h3 id="help-time">TIME OF DAY</h3>
				<div class="guide-grid three-grid">
					<article class="guide-card"><strong>DAWN</strong><span>Soft early-morning light, a pale warm horizon and gentle mist.</span></article>
					<article class="guide-card"><strong>DAY</strong><span>Bright neutral lighting with the clearest environment visibility.</span></article>
					<article class="guide-card"><strong>SUNSET</strong><span>Warm orange and red lighting with dramatic silhouettes.</span></article>
					<article class="guide-card"><strong>NIGHT</strong><span>Dark moonlit atmosphere with stronger environmental contrast.</span></article>
					<article class="guide-card"><strong>ECLIPSE</strong><span>A very dark, dramatic atmosphere with an eerie red halo.</span></article>
				</div>
				<p class="note">Time of day is cosmetic and presentation only. It does not affect winning chances, crashes, multipliers or payouts.</p>
			</section>

			<section aria-labelledby="help-events">
				<h3 id="help-events">FLIGHT EVENTS</h3>
				<div class="event-groups">
					<div><strong>HAZARDS</strong><span>{hazards.join(' · ')}</span></div>
					<div><strong>RELIC EVENTS</strong><span>{relicEvents.join(' · ')}</span></div>
					<div><strong>PORTALS</strong><span>{portals.join(' · ')}</span></div>
					<div><strong>BOSSES</strong><span>{bosses.join(' · ')}</span></div>
				</div>
			</section>

			<section aria-labelledby="help-multipliers">
				<h3 id="help-multipliers">MULTIPLIERS</h3>
				<p>During the flight, the current multiplier may increase through generated round events. For example: <strong>x1 → x1.5 → x3 → x6</strong>.</p>
				<p>The final round result determines the final multiplier. The displayed win is <strong>bet × final multiplier</strong>.</p>
				<p class="note">Browser collision and player timing do not calculate payout. This prototype only presents locally generated mock-round values.</p>
			</section>

			<section aria-labelledby="help-endings">
				<h3 id="help-endings">ENDINGS</h3>
				<div class="ending-list">
					<div><strong>CRASH</strong><span>The flight ends before reaching a vault.</span></div>
					<div><strong>SAFE LANDING</strong><span>The creature safely completes a smaller flight.</span></div>
					<div><strong>FORGE VAULT</strong><span>The flight reaches the first major reward chamber.</span></div>
					<div><strong>DRAGON VAULT</strong><span>A deeper high-value flight ending.</span></div>
					<div><strong>ANCIENT VAULT</strong><span>A rare deeper vault ending.</span></div>
					<div><strong>MYTHIC REALM</strong><span>A rare maximum-intensity prototype ending.</span></div>
				</div>
			</section>

			<section aria-labelledby="help-info">
				<h3 id="help-info">GAME INFORMATION</h3>
				<p><strong>DRAGON FLIGHT — Local Prototype</strong></p>
				<p>The current version uses local mock rounds, has no real-money wallet connection and does not yet use final Stake math.</p>
				<p class="disclaimer">There is no production RTP, maximum win, house edge or certified probability claim in this prototype. Final Stake math and any production rules will be defined separately.</p>
			</section>
		</div>
	</div>
</dialog>

<style>
	.help-dialog { width: min(780px, calc(100vw - 28px)); max-height: min(88dvh, 920px); padding: 0; border: 1px solid #d59b3a; background: transparent; color: #f4e2b2; box-shadow: 0 24px 80px rgba(0, 0, 0, 0.72), 0 0 34px rgba(210, 148, 49, 0.18); }
	.help-dialog::backdrop { background: rgba(1, 6, 4, 0.78); backdrop-filter: blur(3px); }
	.help-panel { display: flex; max-height: min(88dvh, 920px); flex-direction: column; overflow: hidden; border: 4px solid #24170c; outline: 1px solid rgba(255, 203, 100, 0.4); background: linear-gradient(145deg, rgba(9, 35, 24, 0.99), rgba(7, 14, 10, 0.99) 65%, rgba(27, 12, 5, 0.99)); }
	.help-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 22px 24px 18px; border-bottom: 1px solid rgba(204, 151, 59, 0.55); background: linear-gradient(90deg, rgba(4, 20, 14, 0.92), rgba(37, 20, 7, 0.5)); }
	.help-kicker { margin: 0 0 5px; color: #62e7a9; font: 800 0.62rem/1.2 system-ui, sans-serif; letter-spacing: 0.2em; }
	.help-header h2 { margin: 0; color: #f5c96d; font: 700 clamp(1.35rem, 3vw, 2rem)/1.05 Georgia, 'Times New Roman', serif; letter-spacing: 0.07em; text-transform: uppercase; }
	.help-header p:last-child { margin: 8px 0 0; color: #aeb7a6; font: 0.72rem/1.35 system-ui, sans-serif; }
	.close-button { display: grid; width: 42px; min-height: 42px; flex: 0 0 auto; place-items: center; padding: 9px; border: 1px solid #b6812f; border-radius: 50%; background: rgba(4, 19, 13, 0.85); color: #f4ca70; }
	.close-button svg { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 2; }
	.help-content { min-height: 0; overflow: auto; padding: 20px 24px 26px; scrollbar-color: #9d6c25 #08120d; }
	.help-content section { padding: 0 0 20px; }
	.help-content section + section { padding-top: 20px; border-top: 1px solid rgba(201, 152, 63, 0.2); }
	.help-content h3 { margin: 0 0 10px; color: #f0c466; font: 800 0.75rem/1.2 system-ui, sans-serif; letter-spacing: 0.18em; }
	.help-content p, .help-content li { color: #d3d7c8; font: 0.8rem/1.55 system-ui, sans-serif; }
	.help-content p { margin: 0 0 9px; }
	.help-content ol { margin: 0; padding-left: 23px; columns: 2; column-gap: 34px; }
	.help-content li { break-inside: avoid; margin-bottom: 5px; }
	.help-content strong { color: #f8d684; }
	.guide-grid { display: grid; gap: 8px; }
	.creature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.three-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.guide-card { min-height: 58px; padding: 10px 11px; border: 1px solid rgba(181, 130, 44, 0.4); background: rgba(3, 16, 11, 0.62); }
	.guide-card strong, .guide-card span { display: block; }
	.guide-card strong { font: 800 0.67rem/1.2 system-ui, sans-serif; letter-spacing: 0.08em; }
	.guide-card span { margin-top: 5px; color: #abb9a9; font: 0.68rem/1.35 system-ui, sans-serif; }
	.note { color: #93aa9a !important; font-size: 0.68rem !important; }
	.formula { display: inline-block; margin: 2px 0 8px; padding: 9px 12px; border: 1px solid rgba(63, 216, 143, 0.5); background: rgba(8, 64, 40, 0.48); color: #70efb0; font: 700 0.76rem/1.2 system-ui, sans-serif; }
	.event-groups { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
	.event-groups > div, .ending-list > div { padding: 10px 11px; border-left: 2px solid #a66f24; background: rgba(3, 16, 11, 0.6); }
	.event-groups strong, .event-groups span, .ending-list strong, .ending-list span { display: block; }
	.event-groups strong { color: #f4ce79; font: 800 0.62rem/1.2 system-ui, sans-serif; letter-spacing: 0.1em; }
	.event-groups span { margin-top: 5px; color: #b4c0ad; font: 0.68rem/1.4 system-ui, sans-serif; }
	.ending-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
	.ending-list strong { color: #f0ca72; font: 800 0.68rem/1.2 system-ui, sans-serif; }
	.ending-list span { margin-top: 4px; color: #aeb9aa; font: 0.68rem/1.35 system-ui, sans-serif; }
	.disclaimer { padding: 10px 12px; border: 1px solid rgba(224, 148, 68, 0.42); background: rgba(53, 24, 8, 0.38); color: #e4b77b !important; font-size: 0.72rem !important; }
	@media (max-width: 620px) { .help-dialog { width: calc(100vw - 16px); max-height: calc(100dvh - 16px); } .help-panel { max-height: calc(100dvh - 16px); } .help-header { padding: 16px 15px 14px; } .help-content { padding: 16px 15px 22px; } .help-content ol { columns: 1; } .creature-grid, .three-grid, .event-groups, .ending-list { grid-template-columns: 1fr; } }
	@media (prefers-reduced-motion: reduce) { .help-dialog::backdrop { backdrop-filter: none; } }
</style>
