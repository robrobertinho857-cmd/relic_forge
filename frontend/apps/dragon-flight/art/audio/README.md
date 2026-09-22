# Current sound profile

Updated 2026-09-22: menu, pickup, gate, bonus-start and result feedback uses the original button-click.mp3 at a restrained volume. Ambience, wingbeats, thunder, takeoff, air currents, landing and creature calls are silent. The original crash recording is restored for gate and predator impacts. A shared voice and 120 ms debounce prevent stacked clicks. Only the click and original crash are shipped and decoded. The other MP3 recordings are retained in art/audio/originals for reference, outside the runtime build.

This is a click-only replacement chosen from the user's preference, not a claim that the original recordings were auditioned here.

## Historical import measurements

# Audio duration and integration report

All 31 supplied WAV files were measured with ffprobe before import. Each is 48 kHz stereo. Originals remain unchanged at `C:/Users/user/Desktop/fluppy/`. Runtime files are 128 kbps MP3 in `static/audio/`.

| Source | Measured duration | Connected event |
| --- | ---: | --- |
| `air-current.wav` | 1.48 s | Entering an air-current event |
| `bonus-start.wav` | 2.00 s | Starting or replaying a bonus flight |
| `button-click.wav` | 1.00 s | Ordinary enabled buttons |
| `crash.wav` | 1.00 s | Gate impact or predator strike |
| `crystal-pickup.wav` | 2.00 s | Any crystal pickup |
| `eagle-flight.wav` | 3.00 s | Presentation wingbeats (shared by birds) |
| `encounter-warning.wav` | 0.88 s | Predator warning |
| `feather-pickup.wav` | 0.60 s | Ordinary feather pickup |
| `gate-pass.wav` | 0.60 s | Passing a gate |
| `golden-feather-pickup.wav` | 0.60 s | Golden feather pickup |
| `landing.wav` | 1.00 s | Reaching the landing position |
| `option-select.wav` | 0.60 s | Bird/risk selections, radio options and speed changes |
| `panel-open-close.wav` | 0.60 s | Opening or closing a game dialog |
| `perfect-pass.wav` | 0.60 s | Perfect-pass/combo feedback |
| `predator-pass.wav` | 1.00 s | Successful predator avoidance |
| `rain-loop.wav` | 4.80 s | Rain ambience |
| `raptor-call.wav` | 0.88 s | Mountain Raptor entrance |
| `result-big-win.wav` | 2.40 s | Profitable result at 10x to below 50x entry cost |
| `result-loss.wav` | 1.00 s | Zero payout |
| `result-outstanding.wav` | 4.80 s | Result at least 50x entry cost |
| `result-return.wav` | 0.60 s | Nonzero payout at or below entry cost |
| `result-win.wav` | 1.48 s | Profitable result below 10x entry cost |
| `ridge-dragon-call.wav` | 1.00 s | Ridge Dragon entrance |
| `snow-loop.wav` | 4.80 s | Snow ambience |
| `storm-loop.wav` | 4.80 s | Storm ambience |
| `takeoff-boost.wav` | 1.00 s | Boost launch |
| `takeoff-dive.wav` | 1.00 s | Dive launch |
| `takeoff-glide.wav` | 1.00 s | Glide launch |
| `thunder.wav` | 4.80 s | Storm lightning flash |
| `unavailable.wav` | 0.60 s | Invalid bet normalization or unsuccessful flight start |
| `wind.wav` | 0.48 s | Clear/fog ambience |

## Playback behavior

- Source WAVs total 10,063,218 bytes; runtime MP3s total 865,748 bytes. Full clip content is retained; encoder padding may slightly change container durations.
- Sound starts after a pointer or keyboard interaction. The header Sound button mutes all channels and stores the preference locally.
- Only one weather ambience plays at a time. Loop joins use an 80 ms overlap blend (shorter if needed). Wind is only 0.48 seconds, so it may still sound repetitive; a longer recording would provide more variation. Weather files are 4.8 seconds each.
- Repeated UI/pickup/wing/result cues replace the previous voice in their channel. Short fades avoid abrupt stops. Background tabs are silent; returning resumes ambience without replaying missed events.
- Reset, replay and new flights cancel prior foreground sounds and pending loads. Unmount closes the audio context. Loading failures do not block play. Cues delayed by more than 1.2 seconds are discarded.
- Flight speed does not pitch-shift the recordings. Event triggers follow the visual presentation.
- Bonus result sounds compare payout against the full entry cost, not the base bet. A net loss never receives a win cue.
- The shared panel-open-close recording covers both actions. Encounter crashes remain development-scenario behavior, but their crash sound is connected.

## Verification

26 automated tests passed, including sound inventory, result/ambience selection, gesture initialization, mute, visibility, replacement of voices and cancellation during loading. These use a mocked Web Audio context; they do not substitute for listening in a browser. Svelte checks, lint and production build were also run.
