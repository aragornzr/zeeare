# Moria immersive journey

Open http://localhost:8080/moria.html or select Moria in the Explore atlas. The western Doors of Durin and eastern Great Gates remain distinct, clickable entrances to the bridge scene. The existing local Python dashboard server serves the full experience.

The latest implementation and verification notes are in [the 118-destination realism update](atlas-realism.md). Cinematic view uses generated artwork plus animated camera, fire, embers, whip strokes and synchronized lighting. Explore 3D uses textured geometric halls, gates, bridge and landscape, photographic surface materials, reflective water, fine foliage and detailed camera-facing image characters. These characters have underlying shadow geometry and a real animated 3D whip; they are not fully rigged film character models.

Play battle runs 32 seconds with pause/replay/seek/volume controls. Sound is user-activated and includes brief Gandalf lines in a generic synthetic voice, original Balrog roars, whip cracks, metallic clashes, staff impacts, cavern reverb and atmospheric tones. No actor voice or film soundtrack was extracted. The revised bundled WebM has the complete mix and English captions. Watch video uses the native player, Download video saves the clip immediately, and Record view records a fresh cinematic copy when MediaRecorder is supported.

Hiding/leaving stops playback and active sounds. Recording ends and saves a partial clip if the page is hidden. Desktop Chromium and phone-width layouts were checked; physical phones and Safari were not tested. WebGL 2 is required for 3D, while cinematic artwork works without it.

Original scenery prompts: `assets/moria/prompts.md`. Updated foliage, flame and character prompts: `assets/realism/prompts.md`. Audio provenance: `assets/moria/audio/README.md`. No Firebase provisioning, locally saved tourism records or app feature data changed.
