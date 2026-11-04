# Portrait-inspired live rendering — 3 November 2026

The generated Bag End portrait is the lighting, material and composition reference for the live Cinematic and Explore 3D renderer. Exactly 117 named destinations/routes opt into the treatment. Moria is excluded by name; its dedicated renderer continues to construct the default assets and default finishing configuration. No Moria source, film, imagery, battle, audio or route files were edited.

The treatment uses narrower photographic fields of view, warmer grazing sunlight, a procedural sky and reflection environment with matching solar direction, reduced ambient fill, shadow-aware foliage backlighting, localized foreground grass, tree color variation and height-layered aerial perspective. Cold, arid, woodland and volcanic destinations keep distinct lighting and atmospheric values. Tree placement in generic scenes rejects steep slopes and alpine ground above the snow line.

Architecture now distinguishes photographed sawn timber from living tree bark, and plaster from stone foundations in vernacular houses. World-space surface staining breaks uniform material repetition. Existing local CC0 material provenance remains under assets/materials and assets/realism; timber/plaster reuse existing Hobbiton source assets. No new external services or paid resources are required.

Destinations without an authored tour get six landmark-centered cinematic studies. Hobbiton, Mordor and Bag End retain their authored tours. Bag End's opening cameras now use local ground height; all opt-in cinematic cameras also receive terrain sightline clearance. Shadow bounds follow actual camera distance and snap to shadow texels. Both viewing modes use the same real scene geometry and materials. Portrait reflection targets are disposed when switching destinations to avoid accumulating one GPU environment per place.

This improves the existing procedural 3D worlds. It does not reconstruct the generated portrait's anatomy, fabric, botanical detail or unseen architecture, and it does not promise photographic parity with that image. No photographic portrait is substituted for freely rotatable geometry. Existing bundled videos must be rendered again to include the new treatment; their files remain unchanged.

## Verification

- 86 Node tests pass, including coverage of exactly 117 enabled profiles, Moria opt-out, finite camera positions and terrain clearance across the atlas.
- Firefox WebGL checks render Bag End, Minas Tirith, Rivendell, Caradhras, Grey Havens, Mirkwood and Mordor at High detail, in cinematic and Explore modes, with no captured shader errors. Results: [render checks](verification/portrait-look-20261103.json).
- Bag End additionally renders in native 3840 × 2160 mode in Firefox. [Actual local page screenshot](verification/portrait-look-bag-end-20261103.png).
- A narrow 500-pixel Firefox viewport loads the scene, switches to Explore 3D, and has no horizontal document overflow (Firefox’s test window minimum was 500 pixels).
- Other 110 eligible scenes share this tested renderer and receive automated profile/camera coverage; they have not each received manual visual review. Device performance, Safari and updated video encoding are not measured in this pass.

Preview: http://localhost:8080/destination.html?place=Bag%20End or use the Explore atlas. Restart the local server if necessary using python3 serve-dashboard.py. Reload any already-open atlas page to use the revised modules.
