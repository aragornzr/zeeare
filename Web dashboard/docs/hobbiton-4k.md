# Hobbiton: 4K cinematic and living 3D village

Open http://localhost:8080/destination.html?place=Hobbiton or choose Hobbiton in Explore. Desktop opens 4K UHD mode, which renders the canvas at a real 3840 x 2160 pixels. High and Balanced modes reduce the live resolution for less powerful devices. Save 4K frame renders and exports a native 3840 x 2160 PNG, independent of screen size. Watch 4K cinematic plays the bundled VP9 WebM; Download 4K tour saves it. Record 4K tour captures a fresh forty-second village tour. Hidden pages stop recording and save a partial clip.

The bundled movie is a native 3840 × 2160, forty-second, 24-fps offline render: 960 individually rendered frames encoded as VP9. It includes an original pastoral score (flute, plucked strings and soft bowed bass), encoded as stereo 48-kHz Opus. The live Music control and volume slider also provide this score during exploration; music starts on user interaction. Live recordings include the score when enabled, with frame rate dependent on device performance. The separately generated village portrait is 1672 × 941 and is labelled at that resolution. Full provenance is in `assets/hobbiton/manifest.json`.

The scenery upgrade adds layered woods, branched trees with photographed leaf surfaces, grass blades, detailed joinery and plaster, ivy, pots and window boxes. Kitchen gardens use curved cabbage and lettuce leaves, carrot fronds, bean vines, tomatoes and ribbed pumpkins. Hobbit heads have sculpted cheeks, noses, lips and ears, skin microdetail, separate eyes and irregular hair strands. These remain authored procedural characters rather than scanned people.

## Scene

The dedicated Hobbiton terrain has the Hill north of the Water, a recessed stream bed and eroded banks, near-field terrain at 177,241 vertices in 4K mode, separate distant countryside, 4096-pixel grass/normal maps, soft shadows and animated reflective water. Bag End has a round green door with a central brass knob, radial stonework, windows, turf roof, chimney, mailbox, flower beds and a front path. Three lower smials form Bagshot Row. Other dwellings occupy both sides of the stream; a grange, old mill and rotating waterwheel, stone bridge, party tree/field, fences, herbs, vegetables, laundry and a wheelbarrow complete the village.

Twelve actual articulated mesh hobbits inhabit both cinematic and interactive modes. They have short stocky proportions, curly hair, bare feet and toes, shirts, waistcoats and cropped trousers or skirts/aprons. Walking, gardening, chatting and produce-carrying animations follow terrain or bridge height. These are procedural geometric figures suitable for village-scale viewing, not scanned actors or image sprites. Focus the gardens/neighbours landmark for a closer look.

The cinematic camera visits the village across the Water, bridge/mill, Bagshot Row, Bag End, kitchen gardens and party tree. Both modes use the same world and inhabitants. Eight landmark controls provide close views.

## Accuracy and interpretation

The main relationships follow the [Hobbiton reference](https://tolkiengateway.net/wiki/Hobbiton): the village straddles the Water, the old mill is on its north bank near the bridge, the Hill contains Bag End, and Bagshot Row lies on the Hill's southern side. The green door and central brass knob follow the [Bag End reference](https://tolkiengateway.net/wiki/Bag_End). The [Tolkien Estate's gallery](https://www.tolkienestate.com/painting/the-hobbit/) documents Tolkien's own *The Hill: Hobbiton-across-the Water* as an original visual reference. Those relationships inform the scene; its metric distances, building plans, gardens, paths and terrain are authored fan interpretations. It is not a surveyed copy of Tolkien's drawing, an exact movie-set replica, or an officially licensed reconstruction. The Green Dragon in neighbouring Bywater is not silently relabelled as a Hobbiton landmark.

## Files and checks

- `hobbiton-layout.js`: semantic positions, terrain and camera chapters.
- `hobbiton-world.js`: dedicated detailed scene.
- `hobbit-characters.js`: real mesh inhabitants and animation.
- `assets/hobbiton`: source portrait, native 4K frame, native 4K video, manifest and exact image-generation prompt.
- Unit tests cover geographic relationships, water/banks, animation activities, real meshes/bare feet, deterministic paths, grounding and resource disposal.
- Chromium checks confirm 3840 x 2160 canvas and exported PNG, 12 inhabitants, tour/mode controls, landmark focus, portrait modal, other destinations after leaving Hobbiton, phone-width overflow, and native 4K video playback/seeking/close.

Physical phone performance and Safari were not tested. No Firebase data, provisioning, or stored local tourism records were changed.
