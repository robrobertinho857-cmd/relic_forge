import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test, mock } from 'node:test';
import { loadTypescript } from './typescript.mjs';
const { FlightAudio, SOUND_NAMES, resultSound, weatherSound, soundUrl } = await loadTypescript(
	new URL('../src/game-world/audio.ts', import.meta.url),
	{ base: '/dragon-flight' },
);
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('mode music switches without overlap, resumes after mute/hide, and stops when disabled', async () => {
	const fake = fakeAudio();
	const audio = new FlightAudio();
	try {
		assert.equal(soundUrl('danger-music'), '/dragon-flight/audio/danger-music.mp3');
		assert(fs.statSync(new URL('../static/audio/danger-music.mp3', import.meta.url)).size > 0);
		audio.setModeMusic('danger');
		audio.unlock();
		await flush();
		assert.equal(fake.sources.filter((s) => !s.stopped).length, 1);
		assert.equal(fake.sources[0].loop, true);
		audio.setModeMusic('danger');
		await flush();
		assert.equal(fake.sources.length, 1);
		audio.stopEffects();
		assert.equal(fake.sources[0].stopped, false);
		audio.setMuted(true);
		assert(fake.sources.every((s) => s.stopped));
		audio.setMuted(false);
		await flush();
		assert.equal(fake.sources.filter((s) => !s.stopped).length, 1);
		audio.setHidden(true);
		assert(fake.sources.every((s) => s.stopped));
		audio.setHidden(false);
		await flush();
		assert.equal(fake.sources.filter((s) => !s.stopped).length, 1);
		audio.setModeMusic('balanced');
		await flush();
		assert.equal(fake.sources.filter((s) => !s.stopped).length, 1);
		assert.equal(soundUrl('balanced-music'), '/dragon-flight/audio/balanced-music.mp3');
		audio.setModeMusic('safe');
		await flush();
		assert.equal(fake.sources.filter((s) => !s.stopped).length, 1);
		assert.equal(soundUrl('safe-music'), '/dragon-flight/audio/safe-music.mp3');
		assert(fs.statSync(new URL('../static/audio/safe-music.mp3', import.meta.url)).size > 0);
		audio.setModeMusic();
		assert(fake.sources.every((s) => s.stopped));
	} finally {
		audio.dispose();
		fake.restore();
	}
});

test('all 31 original sounds have their own runtime files and deployment-safe URLs', () => {
	const manifest = JSON.parse(
		fs.readFileSync(new URL('../art/audio/manifest.json', import.meta.url)),
	);
	assert.equal(SOUND_NAMES.length, 31);
	assert.deepEqual([...SOUND_NAMES].sort(), manifest.map((item) => item.name).sort());
	assert.equal(fs.readdirSync(new URL('../static/audio/', import.meta.url)).length, 35);
	for (const sound of manifest) {
		assert.equal(soundUrl(sound.name), '/dragon-flight/audio/' + sound.name + '.mp3');
		const bytes = fs.readFileSync(
			new URL('../static/audio/' + sound.name + '.mp3', import.meta.url),
		);
		assert.equal(bytes.length, sound.runtimeBytes);
		if (sound.name !== 'button-click')
			assert.deepEqual(
				bytes,
				fs.readFileSync(new URL('../art/audio/originals/' + sound.name + '.mp3', import.meta.url)),
			);
	}
});
test('result cues use full entry cost and never celebrate a net loss', () => {
	assert.equal(resultSound(0, 50), 'result-loss');
	assert.equal(resultSound(20, 50), 'result-return');
	assert.equal(resultSound(50, 50), 'result-return');
	assert.equal(resultSound(80, 50), 'result-win');
	assert.equal(resultSound(600, 50), 'result-big-win');
	assert.equal(resultSound(3600, 50), 'result-outstanding');
	assert.deepEqual(['clear', 'fog', 'rain', 'storm', 'snow'].map(weatherSound), [
		'wind',
		'wind',
		'rain-loop',
		'storm-loop',
		'snow-loop',
	]);
});

function fakeAudio() {
	const sources = [];
	let contexts = 0,
		closed = false;
	const buffer = () => ({
		sampleRate: 100,
		length: 100,
		numberOfChannels: 1,
		getChannelData: () => new Float32Array(100),
	});
	const previous = globalThis.AudioContext;
	globalThis.AudioContext = class {
		state = 'running';
		currentTime = 0;
		destination = {};
		constructor() {
			contexts++;
		}
		resume() {
			return Promise.resolve();
		}
		close() {
			closed = true;
			return Promise.resolve();
		}
		decodeAudioData() {
			return Promise.resolve(buffer());
		}
		createBuffer() {
			return buffer();
		}
		createGain() {
			return {
				gain: {
					setValueAtTime() {},
					linearRampToValueAtTime() {},
					cancelScheduledValues() {},
					setTargetAtTime() {},
				},
				connect() {
					return this;
				},
				disconnect() {},
			};
		}
		createBufferSource() {
			const source = {
				playbackRate: { value: 1 },
				started: false,
				stopped: false,
				loop: false,
				connect() {
					return this;
				},
				disconnect() {},
				start() {
					this.started = true;
				},
				stop() {
					this.stopped = true;
				},
			};
			sources.push(source);
			return source;
		}
	};
	const fetch = mock.method(globalThis, 'fetch', async () => ({
		ok: true,
		arrayBuffer: async () => new ArrayBuffer(4),
	}));
	return {
		sources,
		get contexts() {
			return contexts;
		},
		get closed() {
			return closed;
		},
		restore() {
			fetch.mock.restore();
			if (previous) globalThis.AudioContext = previous;
			else delete globalThis.AudioContext;
		},
	};
}
test('gesture unlock, single ambience, mute and disposal control playback', async () => {
	const fake = fakeAudio();
	const audio = new FlightAudio();
	try {
		audio.setWeather('clear');
		audio.setMuted(false);
		await audio.play('button-click');
		assert.equal(fake.contexts, 0);
		audio.unlock();
		await flush();
		assert.equal(fake.sources.filter((s) => s.loop && !s.stopped).length, 1);
		audio.setWeather('rain');
		await flush();
		assert.equal(fake.sources.filter((s) => s.loop && !s.stopped).length, 1);
		await audio.play('button-click', 0.2, 'ui');
		await audio.play('option-select', 0.2, 'ui');
		assert.equal(fake.sources.filter((s) => !s.loop && !s.stopped).length, 1);
		audio.setMuted(true);
		assert(fake.sources.every((s) => s.stopped));
		const count = fake.sources.length;
		await audio.play('crash');
		assert.equal(fake.sources.length, count);
		audio.setMuted(false);
		await flush();
		audio.setHidden(true);
		assert(fake.sources.every((s) => s.stopped));
		audio.setHidden(false);
		await flush();
		assert.equal(fake.sources.filter((s) => s.loop && !s.stopped).length, 1);
		audio.dispose();
		assert(fake.closed);
		assert(fake.sources.every((s) => s.stopped));
		audio.unlock();
		assert.equal(fake.contexts, 1);
	} finally {
		audio.dispose();
		fake.restore();
	}
});
test('cancelled pending effects never start after decoding', async () => {
	const fake = fakeAudio();
	const audio = new FlightAudio();
	try {
		audio.unlock();
		const pending = audio.play('crystal-pickup');
		audio.stopEffects();
		await pending;
		await flush();
		assert.equal(fake.sources.length, 0);
	} finally {
		audio.dispose();
		fake.restore();
	}
});

test('wing loop matches the bird cycle and stops after flight', async () => {
	const fake = fakeAudio();
	const audio = new FlightAudio();
	try {
		audio.setWingLoop(true, 0.8);
		audio.unlock();
		await flush();
		assert.equal(fake.sources.filter((s) => !s.stopped).length, 1);
		assert.equal(fake.sources.at(-1).playbackRate.value, 1 / 0.8);
		audio.setWingLoop(true, 1);
		await flush();
		assert.equal(fake.sources.filter((s) => !s.stopped).length, 1);
		assert.equal(fake.sources.at(-1).playbackRate.value, 1);
		audio.setHidden(true);
		assert(fake.sources.every((s) => s.stopped));
		audio.setHidden(false);
		await flush();
		assert.equal(fake.sources.filter((s) => !s.stopped).length, 1);
		audio.setWingLoop(false);
		assert(fake.sources.every((s) => s.stopped));
	} finally {
		audio.dispose();
		fake.restore();
	}
});
