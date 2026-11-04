# Cinematic graphics across all 118 destinations

The live Cinematic and Explore 3D views now share native 3840 × 2160 rendering at every destination: 110 named places and eight routes. Select **Detail → 4K UHD**. Desktop windows at least 900 pixels wide start in UHD when the GPU supports it; smaller screens start in High or Balanced. An explicitly chosen detail level persists when changing destinations.

Run `python3 serve-dashboard.py` from the web dashboard directory, then open `http://localhost:8080/explore.html`. Hobbiton opens directly at `http://localhost:8080/destination.html?place=Hobbiton`.

## Surfaces, geometry and light

- Six photographed roughness maps independently control reflections on masonry, slate, grass, rock, bark and soil. These CC0 sources are bundled locally, with provenance in `assets/realism/pbr/sources.json`.
- The existing 4096-pixel grass/masonry/slate color and normal maps and 2048-pixel rock/bark/woodland maps remain. Roughness maps are 1024 pixels. Native 4K output does not imply that every source texture is 4K.
- World-space material projection maintains texture scale across structures. Normal projection now accounts for nonuniform instance scales, and Mordor's cloned materials retain their custom surface shaders. Pale Gondorian and Elven masonry receives a lighter, less saturated stone treatment.
- General destinations use 292,681 near-terrain vertices in UHD, 130,321 in High, or 32,761 in Balanced, plus the distant horizon. Hobbiton and Mordor retain their dedicated terrain meshes and authored layouts.
- Close geometry has smoother round silhouettes, subtle beveled box edges, roof ridges/eaves, and additional stone corner courses. Rocks cluster more naturally instead of scattering equally sized pieces across the landscape.
- Biome-aware foreground dressing adds physical fern/scrub/reed leaflets, stems, pebbles and woodland deadwood. Placement is deterministic and excludes submerged ground, steep slopes, paths, settlement cores and Hobbiton entrances.
- UHD increases forest/meadow density, uses 4096-pixel directional shadows and 1024-pixel water reflections. Hobbiton's distant woodland is denser; its twelve articulated inhabitants, gardens, mill and authored camera tour remain.
- Linear scene color passes through view-space contact shading, restrained highlight bloom, edge-aware detail and one filmic tone/color transform. Multisampling follows the chosen detail level and GPU capabilities. Snow, forests, pastoral country and volcanic scenes have separate lighting responses; Mordor retains enough fill light to read its defenses.

The dedicated Moria gate/interior journey also uses the new surface and finishing pipeline. Its desktop Explore 3D canvas renders at 3840 × 2160, with a matching 16:9 stage.

## Captures and tours

**Save 4K frame** and **Record 4K tour** are available at all 118 destinations. Saving a frame temporarily builds UHD geometry when needed, captures the current composition at native resolution, then restores the previous detail level, camera, mode, timeline and playback state. The offline WebCodecs exporter likewise restores the previous scene settings after completion or an error.

Hobbiton and Mordor still offer their earlier bundled movies. Their buttons explicitly identify them as earlier tours; new frame captures and recordings use the current renderer. No new prerecorded movies or generated portraits are claimed by this change.

## Verification and limits

The automated suite passes 80 tests, including UHD dimensions/hardware limits, detail budgets, finite lighting for all profiles, deterministic foreground placement, path/water exclusions and material disposal. Chromium checks cover all 118 scenes, export dimensions, quality persistence, camera restoration and a 390-pixel phone layout. The persistent [verification report](verification/cinematic-graphics-20261031.json) records all 118 native UHD scenes, the actual PNG/VP9/recorded-video dimensions, mode controls, a 390-pixel phone layout with no overflow, and all three Moria locations. Those checks completed without JavaScript or WebGL errors. Representative screenshots are under `/private/tmp/atlas-*` and `/private/tmp/moria-final-4k.png` during this session.

These are enhanced procedural WebGL scenes. Geometry and material reuse remain visible; this revision does not supply 118 individually sculpted film environments or fully rigged cinematic characters. UHD increases GPU/memory use, and live recording cadence depends on the device. Physical phones and Safari have not been performance-tested.
