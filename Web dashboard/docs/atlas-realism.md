# Cinematic and 3D atlas · 118 destinations

Current graphics and native UHD behavior are documented in [the 31 October update](graphics-cinematic-20261031.md). The checks below describe the earlier implementation.

Open http://localhost:8080/explore.html. Every indexed entry opens a destination journey, including the 110 named places and eight routes. Standalone example: http://localhost:8080/destination.html?place=Rivendell. Moria retains the gates/interior/battle journey at http://localhost:8080/moria.html.

`destination-profiles.js` contains 118 explicit scene briefs, each with a stable seed, visual landmarks, biome, architecture, terrain, colors, sunlight, camera and uncertainty statement. All 13 earlier-age or unlocated destinations retain null world-map coordinates. They have standalone scenes without invented map pins. Route scenes remain schematic interpretations.

Cinematic mode runs a 40-second camera tour in the same live world as Explore 3D. Both use photographed rock/bark/ground/masonry/slate maps and normal maps, a photographed cloud sky, environment lighting, soft shadows, reflective animated water, detailed botanical alpha geometry, depth-aware contact shading and photographic finishing. Camera orbit, pan, wheel/pinch zoom, keyboard navigation, landmark focusing, camera reset and quality selection are available. Hidden scenes stop rendering; returning to the atlas preserves the world camera.

Specialized geometry includes Minas Tirith's seven descending fortifications and White Tower, Orthanc and its ring, the Hornburg, paired Argonath kings, Meduseld, hobbit smials and gardens, Elven halls and canopy platforms, quays and vessels, Lake-town's raised timber streets, dwarf gateways, burial mounds, ruined towers, waterfalls and the hidden refuge, passes and volcanic terrain. These are detailed procedural fan interpretations, not hand-modelled canonical plans or photogrammetric reconstructions. Geographic briefs are distinct for all entries, while related structures share geometry builders and materials.

The supplied Rivendell, Lothlórien and city artwork remains accessible through Illustrated view in the atlas. Cinematic mode is live rendered scenery, not 118 separately generated movie clips or photo backgrounds. 3D environments are substantially more detailed than the previous renderer, but do not reproduce the full visual complexity of an offline film render. WebGL 2 is required. High and Balanced settings share scene features with different terrain/shadow/pixel resolutions; physical-device performance and Safari were not verified.

## Moria update

Moria now has photographed cliff and bark surfaces, high-resolution irregular cliff meshes, reflective water, finer gate stonework and foliage, environment lighting and photographic finishing. Its 3D characters use detailed generated alpha cutouts rather than the old visibly simple mesh surfaces. Procedural anatomy still supplies shadows, and the flaming whip remains animated 3D geometry. Camera-facing image characters are not fully sculpted or rigged characters and remain an artistic compromise for matching the cinematic appearance.

The revised bridge video and live sequence include “Go back to the shadow!” and “You shall not pass!” in a generic recorded synthetic voice, original layered roars, sword clashes, whip sweeps/cracks, staff impacts, cavern reverb and an original low atmospheric sound bed. No actor voice clone, extracted film sound or sampled movie music is used. Audio and visual weapon beats share timing, and pause/seek/mute stop active dialogue and effects. English captions are bundled. The saved WebM was re-rendered with the complete mix; the player and download use that local file.

Assets/provenance: `assets/realism/CREDITS.md`, `assets/realism/prompts.md`, `assets/moria/audio/README.md`.

## Checks

- `node --test tests/*.test.cjs`: 64 tests, including all 118 briefs, terrain determinism, foundation/camera clearance, lake elevations, synchronized fight beats and real non-silent speech WAVs.
- Automated Chromium coverage loaded all 118 destinations in both modes, checked finite cameras/landmarks, GPU resource cleanup, tour playback/seek and phone-width overflow.
- Additional browser checks cover final landmark builders, selection synchronization between iframe and atlas, hidden-tour stop, earlier-age entries, Moria gates/interior/playback/sound/recording, the detailed characters and native video playback/seeking.
- Browser checks use temporary Playwright/Chromium under `/private/tmp/moria-browser`; screenshots are under `/private/tmp/atlas-*.png` and `/private/tmp/moria-*.png`.

No Firebase provisioning, app feature data or stored local tourism records were changed. The local Python preview server now accepts a larger queue of simultaneous connections for scene textures.
