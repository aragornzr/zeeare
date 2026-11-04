# Original Moria audio

Created locally on 28 October 2026.

- `gandalf-pass.wav`: “You shall not pass!”
- `gandalf-shadow.wav`: “Go back to the shadow!”

Both files were recorded with macOS `say`, using the generic Daniel English voice at 122/128 words per minute, then converted with `afconvert` to mono PCM WAV at 44.1 kHz. These are new synthetic readings of brief lines, not Ian McKellen recordings or a cloned actor voice. No film soundtrack or film audio was downloaded or extracted.

`moria-audio.js` loads and decodes these WAVs into Web Audio. The spoken lines, original layered creature roars, whip sweep/crack, metallic sword clashes, staff impacts, rumble, cavern wind, and low atmospheric musical tones all pass through the same master limiter into the browser output and `MediaStreamDestination`. Consequently the downloadable recording includes the dialogue and the complete original mix. The ambient musical notes are original synthesized open fifths and low dissonant overtones; no copyrighted score is sampled.

The main battle timeline uses voice at 9.7 seconds (shadow) and 22.3 seconds (pass), roars at 4, 12, and 25 seconds, whip/clash exchanges at 6.4/7, 13.4/14, 19.1/19.7, and 26.2/26.8 seconds, and staff impacts at 17 and 28 seconds. Background audio remains quiet when paused; active dialogue and transient effects stop on pause, seek, location change, mute, or suspension. Replay resets cues. The generic synthetic voice does not reproduce the film performance.
