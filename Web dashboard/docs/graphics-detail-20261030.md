# Location graphics — 30 October 2026

The live cinematic and Explore 3D views share these changes across the atlas:

- Existing local 4096-pixel grass, masonry and slate color/normal sources, with up to 16× anisotropic filtering.
- World-scale triplanar architecture materials: consistent brick, stone, timber and roof texture sizes across differently sized meshes.
- Terrain color layers at multiple rotated scales, irregular soil/meadow patches, slope-aware rock normal mapping, height-based snow and varied roughness.
- Dense terrain around landmarks with a lower-density horizon. Boundary vertices interpolate the distant grid to avoid cracks between resolutions.
- Curved tapered tree trunks/branches, rooted wood and fuller textured canopies; instanced nearby and distant variants preserve scene-specific tree placement.
- Depth-aware contact shading, conservative edge sharpening, exposure-aware finishing and multisampled rendering.

Hobbiton additionally has dense short geometric grass with world-seeded wind, restrained wildflowers, a closer Bag End opening shot, turf roof edging, worn stone steps and terrain-following paths. Grass avoids recorded paths and home entrances. The existing 12 animated neighbours, gardens, mill, bridge, orchard and landmark controls remain.

These remain procedural, interactive WebGL scenes. The Moria characters use detailed generated camera-facing image surfaces; their photographic appearance does not imply fully rigged film character assets. The previously exported Hobbiton/Mordor WebM files and village portrait are unchanged. New frame captures and live tour recordings use the updated renderer.

Validation: 77 Node tests, including terrain seam continuity and distant-grid cutouts. Chromium rendered all 118 locations in cinematic/explore modes with finite cameras and no WebGL or JavaScript errors. Final Chromium checks passed for High/Balanced switching in Hobbiton, Rivendell and Mordor, and a 390-pixel phone viewport without horizontal overflow or console errors. All 118 scenes were rendered again successfully after the final material and terrain refinements. Physical-device GPU performance has not been measured.

No Firebase configuration, deployments, account data, or stored mobile records changed. Assets retain their existing source credits. Preview remains local at http://localhost:8080/explore.html.
