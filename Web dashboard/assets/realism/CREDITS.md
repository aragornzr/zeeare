# Surface and scene assets

Photographic rock, bark and woodland-ground maps: Poly Haven contributors, CC0-1.0, https://polyhaven.com/license. Exact download URLs and local filenames are recorded in `sources.json`. Existing castle masonry, slate and grass maps remain under `assets/materials` with their original credits. These are bundled assets; no live Poly Haven API is used at runtime.

Cloud sky: https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky, CC0. Downloaded as the tonemapped equirectangular JPG from https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/kloofendal_48d_partly_cloudy_puresky.jpg and resized to 4096 pixels for local use.

Water normal: https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/textures/waternormals.jpg. Three.js example asset; MIT project license at `assets/vendor/THREE-LICENSE.txt`. Sky.js and Water.js are from Three.js r170 examples, with their imports changed to the bundled Three.js module. Water.js adds a reflection-target disposal hook for scene cleanup.

Generated foliage and flame alpha textures: `canopy.png` and `flame.png`, made with the built-in image_gen tool. Full final prompts: `prompts.md`. The Moria character alpha assets are `assets/moria/balrog-character.png` and `assets/moria/gandalf-character.png`, with their prompts in the same document. The characters are camera-facing image-based surfaces in a true 3D environment; underlying procedural anatomy supplies shadows. They are not fully sculpted or rigged film character models.

Photographed roughness maps added for stone, slate, grass, cliff rock, bark and woodland soil: Poly Haven contributors, CC0-1.0. Exact 1024-pixel sources, filenames and sizes are recorded in `pbr/sources.json`. These maps control surface reflections independently of the color and normal textures.
