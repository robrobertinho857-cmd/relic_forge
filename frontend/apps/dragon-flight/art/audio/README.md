# Current sound profile

Updated 2026-09-23: all 31 original recordings are restored, including weather ambience, wingbeats, creature calls, takeoffs, pickups, crashes, landings, UI and result effects. Every event plays its own recording at its original configured volume. Click substitutions and the shared click debounce have been removed. Mute, hidden-tab silence, channel replacement and ambience seam smoothing remain enabled.

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

## Danger music

Added 2026-09-27: `static/audio/danger-music.mp3`, copied unchanged from the supplied clip-trimmed.mp3. Duration 30 seconds, 48 kHz stereo. Loops quietly during normal Danger flights and their replays; stops at collision/results or reset. Respects mute and hidden tabs. Bonus routes retain their own existing sounds.

## Balanced music

Added 2026-09-27: balanced-music.mp3, copied unchanged from clip2.mp3. 19.9935 seconds, 48 kHz stereo. Loops during normal Balanced flights/replays with the same volume and mute behavior as Danger music. A single music channel prevents overlap when modes change.

## Selection playback update

Balanced and Danger music now follows the selected risk mode immediately after audio is unlocked by interaction. It continues through flights and results without restarting. Switching to Safe stops music; mute and hidden-tab controls still apply. This supersedes the flight-only timing above.

## Safe music

Added 2026-09-27: safe-music.mp3 copied unchanged from clip3.mp3 (11.9935 seconds, 48 kHz stereo). Safe selection now plays this track rather than stopping music. All three modes loop their selected music through flights/results, respect mute and hidden tabs, and use one music channel.

## Menu-only playback
All three mode tracks now play only while status is ready (menu/setup). Starting any flight or replay stops music. Results remain without music; Change Settings returns to the menu and resumes the selected track. Flight sound effects remain enabled. This supersedes the playback timing above.

Safe music replaced on 2026-09-27 with the user-provided clip5.mp3, copied unchanged to static/audio/safe-music.mp3. Menu-only playback is unchanged.

## Wingbeat loop
A 600 ms segment of eagle-flight.mp3 (0.6-1.2 s) is saved as wing-loop.mp3 with 12 ms edge fades. During flight, its repetition rate follows the active bird frame sequence length divided by its animation FPS, one sound per wingbeat cycle. It stops on landing/crash/menu and respects mute/hidden tabs. The original recording is preserved.
