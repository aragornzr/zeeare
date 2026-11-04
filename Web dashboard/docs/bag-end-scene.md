# Bag End — Bilbo, Gandalf and Frodo

Open [Bag End](http://localhost:8080/destination.html?place=Bag%20End), or choose **An afternoon at Bag End** in the Explore atlas. The existing local server serves the rebuilt scene. To restart it, run `python3 serve-dashboard.py` from the web dashboard directory.

Bilbo’s home is the principal building in its own authored garden scene. A round green door with a central brass knob opens toward a warm hallway. Deep round windows, flower boxes, lime-plaster walls, irregular stone foundations, exposed timber eaves, climbing ivy and a planted turf roof sit beneath a broad old oak. Five smaller smials occupy the neighbouring slopes; layered woodland and distant wooded downs replace the previous generic settlement backdrop.

Bilbo stands outside his home lighting a cigar, with a match flame, glowing ember and drifting smoke. Gandalf approaches and settles beside the open picket gate in grey robes, a long folded cloak and pointed hat, carrying a crooked wooden staff. Frodo runs out along the curved lane with articulated arms/legs, terrain-following bare feet and a moving satchel. His departure repeats as a short scene cycle; he leaves the visible lane before returning to the start of the cycle. Chimney smoke and wind in the meadow and roof grass add ambient movement.

**Play cinematic tour** moves through six house/gate/garden/character views. **Explore 3D** supports orbit, pan and zoom, and six landmark buttons focus the house, each named character, the oak and the neighbouring homes. Respecting reduced-motion preferences and hiding the page pauses ambient rendering as in the rest of the atlas.

Desktop UHD renders the real scene at 3840 × 2160. **Save 4K frame** exports the current camera at that resolution; **Record 4K tour** records a fresh tour. High and Balanced provide smaller live buffers and lower geometry/vegetation budgets. Live recording cadence depends on the device.

## Scene assets

- [Generated scene portrait](../assets/bag-end/bag-end-portrait.png): made using the built-in `image_gen` tool. Returned resolution is **1672 × 941**; it has not been upscaled or presented as a native 4K source. Open it with **Scene portrait** below the live view.
- [Exact image-generation prompt](../assets/bag-end/prompt.txt) and [provenance](../assets/bag-end/provenance.json).
- [Native 3840 × 2160 frame](../assets/bag-end/bag-end-4k-frame.png): independently rendered from the actual animated 3D world.

The generated portrait and live 3D view are separate interpretations. The live characters are articulated procedural geometry; the portrait uses generated photographic detail. Existing photographic surface maps retain their Poly Haven CC0 credits in `assets/hobbiton/materials` and `assets/realism`.

## Verification

`node --test tests/*.test.cjs` passes **83 tests**. New checks cover deterministic Bag End terrain, house/gate/elevation relationships, each named character and action, running/arrival movement, ground contact, full-world construction, upward turf-roof normals, camera terrain clearance and idempotent resource cleanup.

Chromium checks cover all six tour views, three character focus controls, native 4K PNG output, the portrait dialog, High/Balanced/UHD switching, a 390-pixel layout, returning to Hobbiton/Rivendell/Mordor, and the featured atlas entry. The session report is [bag-end-20261031.json](verification/bag-end-20261031.json). Physical-device frame rates and Safari have not been measured.
