import { base } from '$app/paths';
import type { WeatherCondition } from './types';

export const SOUND_NAMES = [
	'air-current',
	'bonus-start',
	'button-click',
	'crash',
	'crystal-pickup',
	'eagle-flight',
	'encounter-warning',
	'feather-pickup',
	'gate-pass',
	'golden-feather-pickup',
	'landing',
	'option-select',
	'panel-open-close',
	'perfect-pass',
	'predator-pass',
	'rain-loop',
	'raptor-call',
	'result-big-win',
	'result-loss',
	'result-outstanding',
	'result-return',
	'result-win',
	'ridge-dragon-call',
	'snow-loop',
	'storm-loop',
	'takeoff-boost',
	'takeoff-dive',
	'takeoff-glide',
	'thunder',
	'unavailable',
	'wind',
] as const;
export type SoundName = (typeof SOUND_NAMES)[number];
// Keep semantic event names, but use the user's preferred click for all feedback.
// Ambient/animal recordings are silent in this sound profile.
const SILENT_SOUNDS: readonly SoundName[] = [
	'air-current',
	'encounter-warning',
	'landing',
	'predator-pass',
	'takeoff-boost',
	'takeoff-dive',
	'takeoff-glide',
	'eagle-flight',
	'raptor-call',
	'ridge-dragon-call',
	'wind',
	'rain-loop',
	'snow-loop',
	'storm-loop',
	'thunder',
];
export const soundUrl = (name: SoundName) =>
	SILENT_SOUNDS.includes(name)
		? undefined
		: `${base || '.'}/audio/${name === 'crash' ? 'crash' : 'button-click'}.mp3`;
export const weatherSound = (weather: WeatherCondition): SoundName =>
	weather === 'rain'
		? 'rain-loop'
		: weather === 'storm'
			? 'storm-loop'
			: weather === 'snow'
				? 'snow-loop'
				: 'wind';
export function resultSound(payout: number, cost: number): SoundName {
	const ratio = payout / cost;
	return payout === 0
		? 'result-loss'
		: ratio <= 1
			? 'result-return'
			: ratio >= 50
				? 'result-outstanding'
				: ratio >= 10
					? 'result-big-win'
					: 'result-win';
}

// Audio only follows presentation. It never selects or modifies a round outcome.
export class FlightAudio {
	private context?: AudioContext;
	private buffers = new Map<SoundName, Promise<AudioBuffer>>();
	private voices = new Map<string, { source: AudioBufferSourceNode; gain: GainNode }>();
	private requests = new Map<string, number>();
	private sequence = 0;
	private muted = false;
	private hidden = false;
	private disposed = false;
	private ambience?: SoundName;
	private ambiencePlaying?: SoundName;
	private lastClickAt = -Infinity;

	unlock() {
		if (this.disposed || this.muted || this.hidden) return;
		try {
			if (!this.context) {
				this.context = new AudioContext();
				void this.load('button-click').catch(() => {});
				void this.load('crash').catch(() => {});
			}
			void this.context
				.resume()
				.then(() => this.syncAmbience())
				.catch(() => {});
		} catch {
			/* Audio is optional on unsupported browsers. */
		}
	}
	setMuted(muted: boolean) {
		this.muted = muted;
		if (muted) this.stopAll();
		else if (this.context) this.unlock();
	}
	setHidden(hidden: boolean) {
		this.hidden = hidden;
		if (hidden) this.stopAll();
		else this.syncAmbience();
	}
	setWeather(weather: WeatherCondition) {
		if (weather !== 'storm') this.stop('thunder');
		this.ambience = weatherSound(weather);
		this.syncAmbience();
	}
	private syncAmbience() {
		if (
			!this.context ||
			this.context.state !== 'running' ||
			this.muted ||
			this.hidden ||
			this.disposed
		)
			return;
		if (this.ambience === this.ambiencePlaying) return;
		this.stop('ambience');
		this.ambiencePlaying = this.ambience;
		if (this.ambience) void this.play(this.ambience, 0.12, 'ambience', true);
	}
	private load(name: SoundName) {
		let buffer = this.buffers.get(name);
		if (!buffer) {
			const context = this.context!;
			buffer = fetch(soundUrl(name)!)
				.then((response) => {
					if (!response.ok) throw new Error('Audio unavailable');
					return response.arrayBuffer();
				})
				.then((bytes) => context.decodeAudioData(bytes));
			this.buffers.set(name, buffer);
			void buffer.catch(() => this.buffers.delete(name));
		}
		return buffer;
	}
	async play(name: SoundName, volume = 0.4, channel: string = name, loop = false) {
		if (loop || !soundUrl(name)) return;
		const context = this.context;
		if (!context || context.state !== 'running' || this.muted || this.hidden || this.disposed)
			return;
		if (name !== 'crash') {
			const now = Date.now();
			if (now - this.lastClickAt < 120) return;
			this.lastClickAt = now;
			// One shared voice avoids double clicks from button + panel or gate + combo.
			channel = 'feedback';
			volume = Math.min(volume, 0.22);
		}
		this.stop(channel);
		const request = ++this.sequence;
		this.requests.set(channel, request);
		const requestedAt = Date.now();
		try {
			let buffer = await this.load(name === 'crash' ? 'crash' : 'button-click');
			if (this.requests.get(channel) !== request || this.muted || this.hidden || this.disposed)
				return;
			// Do not replay stale event cues after a slow network response.
			if (!loop && Date.now() - requestedAt > 1200) return;
			if (loop) {
				// Overlap the head and tail to soften short ambience loop seams.
				const fade = Math.min(Math.floor(buffer.sampleRate * 0.08), Math.floor(buffer.length / 4));
				const smooth = context.createBuffer(
					buffer.numberOfChannels,
					buffer.length - fade,
					buffer.sampleRate,
				);
				for (let c = 0; c < buffer.numberOfChannels; c++) {
					const input = buffer.getChannelData(c),
						output = smooth.getChannelData(c);
					output.set(input.subarray(fade));
					for (let i = 0; i < fade; i++) {
						const mix = i / fade,
							end = output.length - fade + i;
						output[end] = output[end] * (1 - mix) + input[i] * mix;
					}
				}
				buffer = smooth;
			}
			const source = context.createBufferSource(),
				gain = context.createGain();
			source.buffer = buffer;
			source.loop = loop;
			gain.gain.setValueAtTime(0, context.currentTime);
			gain.gain.linearRampToValueAtTime(volume, context.currentTime + 0.015);
			source.connect(gain).connect(context.destination);
			this.voices.set(channel, { source, gain });
			source.onended = () => {
				source.disconnect();
				gain.disconnect();
				if (this.voices.get(channel)?.source === source) this.voices.delete(channel);
			};
			source.start();
		} catch {
			if (channel === 'ambience' && this.requests.get(channel) === request)
				this.ambiencePlaying = undefined;
		}
	}
	stop(channel: string) {
		this.requests.delete(channel);
		const voice = this.voices.get(channel);
		if (voice && this.context) {
			voice.gain.gain.cancelScheduledValues(this.context.currentTime);
			voice.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.015);
			voice.source.stop(this.context.currentTime + 0.06);
			this.voices.delete(channel);
		}
	}
	stopEffects() {
		for (const channel of new Set([...this.requests.keys(), ...this.voices.keys()]))
			if (channel !== 'ambience') this.stop(channel);
	}
	private stopAll() {
		for (const channel of new Set([...this.requests.keys(), ...this.voices.keys()]))
			this.stop(channel);
		this.ambiencePlaying = undefined;
	}
	dispose() {
		this.disposed = true;
		this.stopAll();
		void this.context?.close().catch(() => {});
		this.buffers.clear();
	}
}
