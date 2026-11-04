// Supplied artwork is displayed unchanged. Each view is a labelled illustration, not a 3D mesh.
const carasGaladhonGaladrielPoints=[
 {title:'Lady Galadriel & Lord Celeborn',x:72,y:49,description:'Lady Galadriel in radiant white and silver-gold robes stands beside Lord Celeborn on the high royal talan, overlooking the entire tree-city of Caras Galadhon.'},
 {title:'Galadhrim Elves on the Upper Flets',x:91,y:28,description:'Attending Elves of Lothlórien gathered upon the upper woven wooden platforms (telain) among the boughs of the great Mallorn trees.'},
 {title:'Spiral Mallorn Stairways & Lanterns',x:41,y:44,description:'Carved wooden stairways and rope-rail bridges winding around the silver-grey trunks of giant Mallorn trees, lit by warm Elven lanterns.'},
 {title:'Golden Mallorn Canopy of Caras Galadhon',x:48,y:14,description:'The vast golden-leaved canopy of the royal city of the Galadhrim, crowning the green hill in the Naith of Lórien.'},
 {title:'Encircling White Wall & Silver Fosse',x:23,y:74,description:'The deep moat and white rampart encircling the base of the hill of Caras Galadhon, with the Silverlode and Misty Mountains beyond.'}
];
const cerinAmrothPoints=[
 {title:'High Flet of Cerin Amroth',x:50,y:28,description:'The high wooden viewing platform built high in the giant Mallorn tree crowning the summit of the green mound of Cerin Amroth.'},
 {title:'Elves & She-Elves Among Elanor & Niphredil',x:46,y:80,description:'Elven lords and maidens gathered in small groups here and there across the grass carpeted with golden star-shaped elanor and pale white niphredil.'},
 {title:'Double Ring of White & Golden Mallorn Trees',x:28,y:24,description:'The inner circle of white-barked trees and outer circle of golden-leaved Mallorns that ring the timeless heart of Lothlórien.'},
 {title:'Sunlit Paths & Gatherings on the Mound',x:78,y:74,description:'Elves and She-Elves conversing quietly along the gentle flower-strewn slopes and carved stone benches of Cerin Amroth.'}
];
const naithEgladilPoints=[
 {title:'The Naith (The Gore of Lórien)',x:45,y:44,description:'The great wedge of golden Mallorn forest between the converging Silverlode (Celebrant) and the Great River Anduin.'},
 {title:'Egladil (The Angle) & Swan-Boat Hythe',x:79,y:68,description:'The green lawn and silver landing at the pointed confluence of Celebrant and Anduin, where silver swan-boats of the Galadhrim are moored.'},
 {title:'East Lórien & the Great River Anduin',x:84,y:46,description:'The eastern woods of Lothlórien bordering the broad, sunlit bends of the Great River Anduin.'},
 {title:'Caras Galadhon in the Deep Naith',x:39,y:33,description:'The walled city of the Galadhrim rising upon its hill of giant golden Mallorn trees inside the Naith.'},
 {title:'Cerin Amroth & the Silverlode (Celebrant)',x:54,y:53,description:'The flower-crowned mound of Cerin Amroth north of the shimmering course of the Silverlode flowing down from the Misty Mountains.'}
];
const lorienRegionPoints=[
 {title:'Caras Galadhon',x:56,y:30,description:'The tree-city of Lothlórien, shown here as an illuminated canopy settlement. Its architecture and placement within this artwork are artistic interpretations.'},
 {title:'Silverlode · Celebrant',x:48,y:58,description:'The river shown flowing from the western mountains toward the Anduin. Follow its course through this illustrated landscape.'},
 {title:'Anduin',x:86,y:67,description:'The Great River forms the eastern waterway in this illustrated regional view.'},
 {title:'Misty Mountains',x:19,y:35,description:'The snow-covered mountain wall west of Lothlórien, shown with exaggerated relief in this artwork.'},
 {title:'The Naith',x:72,y:62,description:'The wedge of land between the Silverlode and the Anduin, interpreted here within the illustrated forest.'}
];
const lorienCanopyPoints=[
 {...lorienRegionPoints[0],x:51,y:37},
 {...lorienRegionPoints[1],x:35,y:63},
 {...lorienRegionPoints[2],x:85,y:60},
 {...lorienRegionPoints[3],x:20,y:26}
];
const cityPoints=[
 {title:'The Citadel',x:53,y:10,description:'The highest city level and tower, interpreted in this aerial artwork.'},
 {title:'Court of the Fountain',x:52,y:23,description:'The illustrated court beside the citadel, with the White Tree and fountain.'},
 {title:'Middle streets',x:45,y:57,description:'Inspect the houses, stairways and narrow streets between the illustrated fortified terraces.'},
 {title:'The Great Gate',x:52,y:88,description:'The illustrated entrance and approach to the White City.'}
];
const lorien = {
  levels: [
    {title:'Caras Galadhon · Lady Galadriel & Lord Celeborn Overlooking the Tree-City',src:'assets/illustrations/lothlorien-caras-galadhon-galadriel.jpg?v=20261104-v2',alt:'4K epic illustration of Lady Galadriel and Lord Celeborn with Galadhrim Elves on a high talan overlooking the entire tree-city of Caras Galadhon',points:carasGaladhonGaladrielPoints},
    {title:'Cerin Amroth · Elves & She-Elves Gathered on the Flower-Crowned Mound',src:'assets/illustrations/lothlorien-cerin-amroth.jpg?v=20261104-v2',alt:'4K epic illustration of Cerin Amroth with Elves and She-Elves gathered in small groups among golden elanor and white niphredil flowers beneath Mallorn trees',points:cerinAmrothPoints},
    {title:'East Lórien, Egladil & The Naith · Epic Terrain Confluence',src:'assets/illustrations/lothlorien-naith-egladil.jpg?v=20261104-v2',alt:'4K epic panoramic terrain vista of Lothlórien showing The Naith, Egladil at the confluence of the Silverlode and Anduin, East Lórien, Cerin Amroth, Caras Galadhon and the Misty Mountains',points:naithEgladilPoints}
  ]
};
const gondor = {
  levels: [
    {title:'Minas Tirith · city terraces',src:'assets/minas-tirith-city.png',alt:'Illustrated aerial view of Minas Tirith with seven fortified terraces, houses and streets',points:cityPoints},
    {title:'Minas Tirith · street quarter',src:'assets/minas-tirith-streets.png',alt:'Detailed illustrated neighborhood with stone houses, tiled roofs, a market square and courtyards',points:[{title:'Market square',x:44,y:58,description:'An imagined neighborhood market, with stalls, a fountain and cobbled paving.'},{title:'Courtyard garden',x:28,y:26,description:'A planted courtyard within this illustrated neighborhood; the individual street plan is an artistic interpretation.'},{title:'Stone archway',x:86,y:20,description:'A vaulted passage, illustrated among houses, stairs and stone walls.'}]}
  ]
};
const rivendellHallOfFirePoints=[
 {title:'The Massive Hearth Fire',x:61,y:58,description:'A massive hearth fire burns all year round inside the large, windowless room of the square tower, warming the hall through every season.'},
 {title:'Lord Elrond in the Hall of Fire',x:16,y:63,description:'Lord Elrond seated in noble contemplation beside the pillared arches as poetry, singing, and ancient lays of Middle-earth fill the hall.'},
 {title:'Bilbo & Frodo Baggins',x:37,y:73,description:'Bilbo Baggins and Frodo Baggins seated together on embroidered cushions near the warm hearth, listening to the songs and tales of the Eldar.'},
 {title:'Elven Minstrels, Harps & Lutes',x:45,y:60,description:'Elven minstrels and harpers playing music and chanting ancient lore during feast days in the primary room for singing, poetry, and storytelling.'},
 {title:'Flute Players & Choir of Imladris',x:75,y:65,description:'Graceful Elves of Rivendell gathered around the hearth fire in radiant silver and silk robes, joining in song beneath the carved stone vaults.'}
];
const rivendellEastPorchPoints=[
 {title:'Lord Elrond Presiding',x:57,y:56,description:'Lord Elrond presides over the fateful Council of Elrond on the high eastern terrace porch of the Last Homely House.'},
 {title:'Frodo Baggins & Samwise Gamgee',x:73,y:75,description:'Frodo Baggins, newly awakened and recovered from his Morgul-blade wound, reunited with Bilbo and Sam as the Ring is brought before the Council.'},
 {title:'Gandalf the Grey & Aragorn',x:36,y:58,description:'Gandalf the Grey leaning upon his staff beside Aragorn (Strider) as the history and peril of the One Ring are recounted.'},
 {title:'Legolas, Gimli & Boromir',x:74,y:56,description:'Representatives of the Free Peoples—Legolas of the Woodland Realm, Gimli son of Glóin, and Boromir of Gondor—seated beneath the eastern colonnade.'},
 {title:'Valley of the Bruinen & Alpine Gardens',x:49,y:34,description:'The East Porch overlooks the rushing River Bruinen, cascading waterfalls, and high alpine gardens framed by the sunlit peaks of the Misty Mountains.'}
];
const rivendellLibraryPoints=[
 {title:'Lord Elrond & Bilbo Baggins',x:36,y:72,description:'Lord Elrond and Bilbo Baggins studying illuminated manuscripts, ancient maps of Wilderland, and historical annals of the Elder Days.'},
 {title:'Elven Loremasters & Translators',x:68,y:72,description:'Elven scholars translating old texts, runes, and scrolls at carved wooden lecterns to preserve the memory and history of Middle-earth.'},
 {title:'Multi-Tiered Scroll Galleries',x:52,y:34,description:'Vast arched galleries and silver-inlaid shelves housing thousands of ancient scrolls, lays, and chronicles of Eriador, Beleriand, and Númenor.'},
 {title:'Sunlit Arches Overlooking Imladris',x:19,y:45,description:'Tall Elven colonnades opening toward the waterfalls and pine-clad cliffs of the hidden valley, filling the repository of lore with clear mountain light.'}
];
const rivendellBilbosRoomPoints=[
 {title:'Bilbo Writing "There and Back Again"',x:37,y:62,description:'Bilbo Baggins in his retirement sitting at his carved wooden desk, dipping his quill to write his memoirs ("There and Back Again") in the Red Book.'},
 {title:'Corner Balcony Next to the East Porch',x:77,y:48,description:'The open arched terrace doorway of Bilbo’s cozy corner room, situated right next to the East Porch and overlooking the gardens and waterfalls of the Bruinen.'},
 {title:'Warm Hearth & Maps of the Lonely Mountain',x:8,y:54,description:'A cheerful crackling hearth fire and framed maps of Wilderland and Erebor recalling Bilbo’s earlier journey with Thorin and Company.'}
];
const rivendellRiverBruinenPoints=[
 {title:'The River Bruinen (Loudwater)',x:58,y:78,description:'The rushing crystal-emerald waters of the Bruinen snaking through the deep rocky gorge of the valley, filling the entire refuge with the soothing sound of moving water.'},
 {title:'Slender Elven Stone Bridges',x:60,y:46,description:'Graceful carved stone bridges arching high above the foaming cascades and chasm of the Loudwater.'},
 {title:'The Last Homely House Above the Gorge',x:45,y:25,description:'The pillared halls, towers, and warm lanterns of Elrond’s house rising among fragrant pine, oak, and golden beech trees above the river.'},
 {title:'Elves on the Riverside Terraces',x:22,y:68,description:'Elven inhabitants of Imladris pausing on the carved stone steps and balustrades to listen to the waterfalls and rushing river.'}
];
const rivendellFordOfBruinenPoints=[
 {title:'The White Horses of the Flood',x:46,y:28,description:'Unleashed by Elrond’s power over the river and kindled with cresting foam by Gandalf, the rushing flood roars down the Ford shaped like great white horses with flowing manes.'},
 {title:'The Nazgûl Swept Away in the Shallows',x:32,y:63,description:'The black-cloaked Ringwraiths and their dark steeds caught in the defensive boundary crossing of Rivendell as the roaring torrent crashes over them.'},
 {title:'Frodo Baggins Upon Asfaloth',x:88,y:44,description:'Glorfindel’s swift white elf-horse Asfaloth bearing the wounded Frodo Baggins safely across the Ford of Bruinen onto the Rivendell bank.'},
 {title:'Aragorn & the Hobbits with Flaming Torches',x:82,y:72,description:'Aragorn and Frodo’s companions brandishing blazing torches on the eastern bank to drive the panicked mounts of the Nine into the rising floodwaters.'}
];
const rivendellZigZagPathPoints=[
 {title:'The Steep Zig-Zag Path & White Stones',x:28,y:52,description:'The narrow, steep switchback trail marked by white stones descending from the barren heather moors above down into the warm, fragrant pine and beech trees of the valley floor.'},
 {title:'Gandalf, Bilbo & Companions Descending',x:34,y:76,description:'Gandalf the Grey leading Bilbo Baggins and the company with their pack ponies carefully down the white-stone-bordered cliff path.'},
 {title:'First Vista of the Hidden Valley of Rivendell',x:68,y:48,description:'As travelers descend below the barren moors, the hidden roofs, pillared halls, bridges, and waterfalls of the Last Homely House open up gloriously in the deep valley.'}
];
const rivendellHighGardensPoints=[
 {title:'The High Gardens & Cliff Terraces',x:28,y:40,description:'Steep alpine gardens planted with fragrant herbs, silver birch trees, and flowering borders built into stone and river-sand terraces along the cliffs.'},
 {title:'Elves & Hobbits on the Terrace Walkways',x:26,y:72,description:'Graceful Elves and Hobbit guests conversing along the high terraced stone balustrades that open up breathtaking views of the valley.'},
 {title:'Panoramic View of the Last Homely House & Falls',x:76,y:54,description:'From the high cliff terraces, inhabitants look out across the sunlit roofs of the Last Homely House, the slender bridges, and the foaming cascades of the Bruinen.'}
];
const rivendellValleyMapPoints=[
 {title:'The Great Hall',x:61,y:41,description:'The large Elven hall labelled in the supplied artwork. Its scale and architectural details are artistic interpretations.'},
 {title:'The Last Homely House',x:47,y:48,description:'Elrond’s refuge in Rivendell, represented here by the interconnected buildings and gardens.'},
 {title:'The Library',x:78,y:45,description:'The library pavilion labelled by this illustration; this particular building plan is imagined.'},
 {title:'The Council Ring',x:69,y:64,description:'The council setting shown in this artwork, interpreted as an open circular terrace.'},
 {title:'Bruinen River',x:44,y:77,description:'The river winding beneath bridges and waterfalls in this illustrated valley.'}
];
const rivendell = {
  levels: [
    {title:'1 · The Hall of Fire — Year-Round Hearth, Singing, Poetry & Storytelling',src:'assets/illustrations/rivendell-hall-of-fire.jpg?v=20261104-rivendell',alt:'4K epic illustration of the Hall of Fire in Rivendell with a massive hearth fire, Lord Elrond, Bilbo and Frodo Baggins, and Elven minstrels playing harps and singing',points:rivendellHallOfFirePoints},
    {title:'2 · The East Porch — Reunion of Friends & The Council of Elrond',src:'assets/illustrations/rivendell-east-porch.jpg?v=20261104-rivendell',alt:'4K epic illustration of the East Porch of Rivendell overlooking the Bruinen and alpine gardens during the Council of Elrond with Frodo, Bilbo, Gandalf, Aragorn, Legolas, Gimli and Boromir',points:rivendellEastPorchPoints},
    {title:'3 · Elrond’s Library — Vast Repository of Lore & Ancient Scrolls',src:'assets/illustrations/rivendell-elronds-library.jpg?v=20261104-rivendell',alt:'4K epic illustration of Elrond’s Library in Rivendell where Lord Elrond, Bilbo Baggins, and Elven scholars study ancient scrolls and maps of Middle-earth',points:rivendellLibraryPoints},
    {title:'4 · Bilbo’s Room — Writing "There and Back Again" Next to the East Porch',src:'assets/illustrations/rivendell-bilbos-room.jpg?v=20261104-rivendell',alt:'4K epic illustration of Bilbo’s cozy corner room next to the East Porch in Rivendell where retired Bilbo Baggins writes his memoirs There and Back Again',points:rivendellBilbosRoomPoints},
    {title:'5 · The River Bruinen (Loudwater) — Rushing Gorge & Elven Bridges',src:'assets/illustrations/rivendell-river-bruinen.jpg?v=20261104-rivendell',alt:'4K epic illustration of the River Bruinen (Loudwater) rushing through the deep gorge of Rivendell beneath slender Elven bridges and waterfalls',points:rivendellRiverBruinenPoints},
    {title:'6 · The Ford of Bruinen — White Horses of the Flood & The Nazgûl',src:'assets/illustrations/rivendell-ford-of-bruinen.jpg?v=20261104-rivendell',alt:'4K epic illustration of the Ford of Bruinen where the rushing flood shaped like foaming white horses washes away the invading Nazgûl as Frodo reaches safety',points:rivendellFordOfBruinenPoints},
    {title:'7 · The Steep Zig-Zag Path — White Stones Descending into the Valley',src:'assets/illustrations/rivendell-zig-zag-path.jpg?v=20261104-rivendell',alt:'4K epic illustration of the Steep Zig-Zag Path marked by white stones descending from the barren moors into the warm pine and beech valley of Rivendell',points:rivendellZigZagPathPoints},
    {title:'8 · The High Gardens and Terraces — Alpine Herbs, Birch Trees & Cliff Views',src:'assets/illustrations/rivendell-high-gardens.jpg?v=20261104-rivendell',alt:'4K epic illustration of the High Gardens and Terraces of Rivendell built into river-sand cliff terraces with alpine herbs, birch trees and panoramic valley views',points:rivendellHighGardensPoints},
    {title:'9 · Rivendell Overview Map — Valley, Halls & Waterfalls',src:'assets/illustrations/rivendell-valley.jpg',alt:'Supplied illustrated map of Rivendell with Elven halls, bridges, gardens, waterfalls and the Bruinen',points:rivendellValleyMapPoints}
  ]
};
const hobbitonOverviewPoints=[
 {title:'Bag End on The Hill',x:56,y:18,description:'The premier, luxurious smial dug deep into The Hill on the north side of the village—ancestral home of Bilbo Baggins, Frodo Baggins, and later Samwise Gamgee.'},
 {title:'Bagshot Row Below Bag End',x:54,y:33,description:'The lane of humble Hobbit-holes situated directly below Bag End, famously home to Samwise Gamgee and his father, "The Gaffer" (Hamfast Gamgee).'},
 {title:'The Old Mill (Sandyman’s Mill)',x:20,y:44,description:'A prominent timber-and-stone mill building situated on the north bank of The Water, close to the stone bridge, owned by Ted Sandyman and his father.'},
 {title:'The Water & Stone Bridge',x:53,y:54,description:'The small river flowing directly through Hobbiton, dividing it from neighboring Bywater, spanned by the village stone bridge.'},
 {title:'Underhill & Kitchen Gardens',x:80,y:74,description:'The residential neighborhood at the southern base of The Hill where barefoot Hobbit neighbours tend vegetable plots and chat along the lanes.'}
];
const hobbitonBagEndPoints=[
 {title:'Bag End — Premier Smial on The Hill',x:74,y:48,description:'The premier, luxurious Hobbit-hole dug deep into The Hill on the north side of Hobbiton, featuring its iconic round green door and brass knob.'},
 {title:'Bilbo Baggins at the Doorstep',x:75,y:50,description:'Bilbo Baggins enjoying his pipe outside the ancestral home of Bilbo, Frodo Baggins, and later Samwise Gamgee.'},
 {title:'Frodo Baggins on the Garden Path',x:43,y:62,description:'Young Frodo Baggins running down the flagstone garden path between blooming borders of hollyhocks and lavender.'},
 {title:'Gandalf the Grey at the Gate',x:19,y:62,description:'Gandalf arriving at the wooden garden gate of Bag End beneath the crowning oak tree on The Hill.'}
];
const hobbitonBagshotRowPoints=[
 {title:'Bagshot Row Smials',x:78,y:58,description:'The lane of humble Hobbit-holes situated directly below Bag End, with round painted doors, brick chimneys, and turf roofs.'},
 {title:'"The Gaffer" (Hamfast Gamgee)',x:21,y:67,description:'Sam’s father Hamfast Gamgee ("The Gaffer") resting on his spade beside his prized patch of potatoes, cabbages, and pumpkins.'},
 {title:'Samwise Gamgee Tending the Garden',x:53,y:70,description:'Young Samwise Gamgee watering the cottage flowers along the cobblestone lane of Bagshot Row.'},
 {title:'Bag End Rising Above on The Hill',x:79,y:22,description:'Directly above Bagshot Row sits the green door of Bag End beneath the great oak crowning The Hill.'}
];
const hobbitonPartyFieldPoints=[
 {title:'The Massive Party Tree',x:45,y:28,description:'Located down the slope from Bag End in the wide-open Party Field, the massive Party Tree is hung with glowing lanterns and festive bunting.'},
 {title:'Bilbo’s 111th Birthday Speech',x:66,y:62,description:'Bilbo Baggins standing on the wooden stage under the Party Tree celebrating his Eleventy-first (111th) birthday party.'},
 {title:'Gandalf’s Dragon Firework',x:80,y:22,description:'Gandalf the Grey launching a magnificent fiery dragon firework across the twilight sky above the Party Field.'},
 {title:'Feast Tables & Dancing Hobbits',x:32,y:72,description:'Hobbits of Hobbiton and Bywater feasting, toasting tankards of ale, and dancing across the open field below Bag End.'}
];
const hobbitonMillAndBridgePoints=[
 {title:'The Double-Arched Bridge',x:42,y:57,description:'The picturesque double-arched stone bridge spanning The Water that leads visitors from the village toward the Green Dragon Inn.'},
 {title:'The Old Mill (Sandyman’s Mill) & The Millhouse',x:78,y:48,description:'Situated on the north bank of The Water right beside the bridge and millpond, highlighting the bucolic pre-industrial lifestyle of the Shire.'},
 {title:'The Water Dividing Hobbiton & Bywater',x:55,y:82,description:'The small, clear river flowing directly through Hobbiton, dividing it from the neighboring village of Bywater.'},
 {title:'Bag End & The Hill in the Distance',x:61,y:21,description:'Looking north across The Water and the Double-Arched Bridge toward Bagshot Row and Bag End dug into The Hill.'}
];
const hobbitonGrangePostOfficePoints=[
 {title:'The Old Grange',x:31,y:42,description:'A notable thatched stone-and-timber agricultural storage building used by the Hobbiton community for storing crops, hay, and grain.'},
 {title:'The Post Office (Onder-Hill Mail)',x:60,y:62,description:'The local red-doored postal building where the village’s Onder-Hill mail, parcels, and official notices are processed.'},
 {title:'Shire Post Cart & Messengers',x:76,y:73,description:'Hobbit postmen sorting letters and packages beside the Shire Post pony cart on the cobbled lane.'},
 {title:'Underhill Neighborhood',x:90,y:51,description:'The residential neighborhood of Hobbit-holes nestled at the southern base of The Hill.'}
];
const hobbitonGreenDragonPoints=[
 {title:'The Green Dragon Inn',x:32,y:45,description:'A fully functioning pub and restaurant replicating the cozy, thatched-roof tavern where Hobbits gather for drinks, hearty fare, and songs.'},
 {title:'Green Dragon Sign & Warm Hearth',x:39,y:31,description:'The carved Green Dragon tavern sign hanging above the round front door, with a glowing hearth fire welcoming travellers inside.'},
 {title:'Hobbits Singing & Toasting Ale',x:33,y:73,description:'Merry Hobbits gathered at outdoor oak tables with foaming tankards of Shire ale while a fiddler plays a lively tune.'},
 {title:'Waterside Landing Across from the Village',x:82,y:68,description:'Rowboats moored along the tranquil bank of The Water leading back toward the Double-Arched Bridge and Millhouse.'}
];
const hobbitonFurnishedHolesPoints=[
 {title:'Furnished Hobbit Parlor & Hearth',x:67,y:58,description:'Inside Bagshot Row, fully realized movie-authentic indoor environments let visitors walk inside a traditional Hobbit parlor, kitchen, and bedroom.'},
 {title:'Stocked Round Larder & Pantry',x:24,y:50,description:'A circular timber-framed doorway opening into a bountiful Hobbit pantry filled with wheels of cheese, cured hams, jars of pickles, and fresh produce.'},
 {title:'Afternoon Tea & Berry Tarts',x:65,y:68,description:'Two cheerful Hobbits sharing tea, scones, and berry tarts beside a crackling brick fireplace under copper pans and dried herbs.'}
];
const hobbitonSackvilleBagginsPoints=[
 {title:'Sackville-Baggins Residence',x:27,y:45,description:'Located visually lower on the hillside than Bag End, this residence features clipped boxwood hedges and a polished round timber door.'},
 {title:'Bee Boxes & Apiary Skeps',x:63,y:56,description:'Colorful painted wooden bee boxes and woven straw skeps tended by beekeepers in the flowering clover meadow beside the smial.'},
 {title:'Honey Jars on Display',x:55,y:82,description:'Practical touches including jars of golden Shire wildflower honey, honeycomb frames, and beeswax candles displayed on tables.'},
 {title:'Lobelia & Otho Sackville-Baggins',x:58,y:66,description:'Lobelia and Otho Sackville-Baggins inspecting their prized honey harvest outside their hillside home.'}
];
const hobbitonStoneTrollsPoints=[
 {title:'The Three Petrified Stone Trolls (William, Tom & Bert)',x:45,y:44,description:'On the outskirts of the main village walk, three life-sized Stone Trolls—William, Tom, and Bert—are sculpted to look just like the petrified trolls from The Hobbit.'},
 {title:'Mossy Cauldron & Woodland Glade',x:34,y:72,description:'Curious young Hobbits examining the moss-covered stone cooking pot along the shaded Nature Walk.'},
 {title:'Sun-Dappled Nature Walk Outskirts',x:74,y:48,description:'Ferns, foxgloves, and ancient oak trees framing the woodland trail on the outskirts of Hobbiton.'}
];
const hobbitonShiresRestPoints=[
 {title:'The Shire’s Rest Overlook & Café',x:81,y:65,description:'Located outside the movie village at the main entrance, The Shire’s Rest complex welcomes visitors with ticketing, a gift shop, and an outdoor café view.'},
 {title:'Rolling Pastures of the Shire',x:32,y:66,description:'Grazing sheep, stone walls, and lush green hills stretching toward the village of Hobbiton below.'},
 {title:'View Toward The Hill, Party Tree & Old Mill',x:58,y:46,description:'A sweeping vista across The Water, the Old Mill, the Party Tree, Bagshot Row, and Bag End from the entrance hills.'}
];
const hobbiton = {
  levels: [
    {title:'1 · Hobbiton Across The Water — Bag End, Bagshot Row, The Water & Sandyman’s Mill',src:'assets/hobbiton/hobbiton-portrait.jpg?v=20261104-hobbiton',alt:'Photorealistic 4K portrait of Hobbiton across The Water showing Bag End on The Hill, Bagshot Row, the stone bridge, and Sandyman’s Old Mill',points:hobbitonOverviewPoints},
    {title:'2 · Bag End — Premier Luxurious Smial Dug Deep into The Hill',src:'assets/bag-end/bag-end-portrait.png?v=20261104-hobbiton',alt:'Bag End on the north side of Hobbiton with Bilbo at the round green door, Frodo on the garden path, and Gandalf at the gate',points:hobbitonBagEndPoints},
    {title:'3 · Bagshot Row — Humble Hobbit-Holes of Samwise Gamgee & "The Gaffer"',src:'assets/illustrations/hobbiton-bagshot-row.jpg?v=20261104-hobbiton',alt:'Bagshot Row directly below Bag End with Samwise Gamgee and Hamfast The Gaffer Gamgee tending their vegetable gardens',points:hobbitonBagshotRowPoints},
    {title:'4 · The Party Field & The Party Tree — Bilbo’s 111th Birthday Party',src:'assets/illustrations/hobbiton-party-field.jpg?v=20261104-hobbiton',alt:'The Party Field and massive Party Tree down the slope from Bag End during Bilbo’s 111th birthday party with Gandalf’s dragon firework',points:hobbitonPartyFieldPoints},
    {title:'5 · The Water, The Double-Arched Bridge, The Old Mill (Sandyman’s Mill) & The Millhouse',src:'assets/illustrations/hobbiton-mill-and-bridge.jpg?v=20261104-hobbiton',alt:'The Double-Arched Bridge spanning The Water beside Ted Sandyman’s Old Mill and the lakeside Millhouse in Hobbiton',points:hobbitonMillAndBridgePoints},
    {title:'6 · The Old Grange, The Post Office & Underhill',src:'assets/illustrations/hobbiton-old-grange-post-office.jpg?v=20261104-hobbiton',alt:'The Old Grange crop storage barn, the red-doored Onder-Hill Post Office, and the Underhill neighborhood at the southern base of The Hill',points:hobbitonGrangePostOfficePoints},
    {title:'7 · The Green Dragon Inn — Cozy Thatched-Roof Tavern & Restaurant',src:'assets/illustrations/hobbiton-green-dragon-inn.jpg?v=20261104-hobbiton',alt:'The Green Dragon Inn thatched-roof pub and restaurant by the water where Hobbits gather for drinks, food, and songs',points:hobbitonGreenDragonPoints},
    {title:'8 · The Furnished Hobbit Holes — Authentic Indoor Kitchen, Parlor & Larder in Bagshot Row',src:'assets/illustrations/hobbiton-furnished-hobbit-holes.jpg?v=20261104-hobbiton',alt:'Inside a furnished Hobbit-hole in Bagshot Row showing a cozy fireplace parlor, tea table, and stocked circular pantry and kitchen',points:hobbitonFurnishedHolesPoints},
    {title:'9 · Sackville-Baggins Residence — Lower Hillside Facade with Bee Boxes & Honey Jars',src:'assets/illustrations/hobbiton-sackville-baggins.jpg?v=20261104-hobbiton',alt:'The Sackville-Baggins Residence lower on the hillside than Bag End, featuring bee boxes, straw skeps, and honey jars on display',points:hobbitonSackvilleBagginsPoints},
    {title:'10 · The Nature Walk (Stone Trolls) — Petrified Trolls William, Tom & Bert',src:'assets/illustrations/hobbiton-stone-trolls.jpg?v=20261104-hobbiton',alt:'Three life-sized petrified Stone Trolls William, Tom, and Bert on the Nature Walk outskirts of Hobbiton',points:hobbitonStoneTrollsPoints},
    {title:'11 · The Shire’s Rest — Entrance Complex, Café Overlook & Rolling Pastures',src:'assets/illustrations/hobbiton-shires-rest.jpg?v=20261104-hobbiton',alt:'The Shire’s Rest overlook outside the main village entrance looking out over Hobbiton, The Water, and The Hill',points:hobbitonShiresRestPoints}
  ]
};
export const illustratedPlaces = {
  'Hobbiton':hobbiton,
  'Bag End':hobbiton,
  'The Shire':hobbiton,
  'Rivendell':rivendell,
  'Lothlórien':lorien,
  'Caras Galadhon':lorien,
  'Gondor':gondor,
  'Minas Tirith':gondor
};
export class IllustratedAtlas {
  constructor(viewport,canvas,image,{onChange,onExit,onError,onPoint=()=>{}}) {
    Object.assign(this,{viewport,canvas,image,onChange,onExit,onError,onPoint});
    this.hotspotLayer=document.createElement('div');this.hotspotLayer.className='illustration-hotspots';canvas.append(this.hotspotLayer);
    this.zoom=1;this.level=0;this.ready=false;this.active=false;this.serial=0;this.pointers=new Map();
    this.resizeObserver=new ResizeObserver(()=>{if(this.active&&this.ready)this.layout(true);});
    this.resizeObserver.observe(viewport);
    viewport.addEventListener('wheel',event=>{
      event.preventDefault();event.stopPropagation();if(!this.ready)return;
      const rect=viewport.getBoundingClientRect();
      const amount=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1);
      this.setZoom(this.zoom*Math.exp(Math.max(-.25,Math.min(.25,-amount*.002))),{px:event.clientX-rect.left,py:event.clientY-rect.top});
    },{passive:false});
    viewport.addEventListener('keydown',event=>{
      if(['+','=','-'].includes(event.key)){event.preventDefault();this.zoomBy(event.key==='-'?1/1.25:1.25);}
      if(event.key==='0'){event.preventDefault();this.reset();}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();viewport.scrollBy({left:event.key==='ArrowLeft'?-60:event.key==='ArrowRight'?60:0,top:event.key==='ArrowUp'?-60:event.key==='ArrowDown'?60:0});}
    });
    viewport.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('.illustration-hotspot'))return;
      viewport.setPointerCapture(event.pointerId);this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      this.drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false};
      if(this.pointers.size===2){const[a,b]=[...this.pointers.values()];this.pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:this.zoom};this.drag=null;}
      viewport.classList.add('dragging');event.preventDefault();
    });
    viewport.addEventListener('pointermove',event=>{
      if(!this.pointers.has(event.pointerId))return;
      this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(this.pointers.size===2&&this.pinch){const[a,b]=[...this.pointers.values()],rect=viewport.getBoundingClientRect();this.setZoom(this.pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,this.pinch.distance),{px:(a.x+b.x)/2-rect.left,py:(a.y+b.y)/2-rect.top},false);}
      else if(this.drag){if(Math.hypot(event.clientX-this.drag.x,event.clientY-this.drag.y)>12)this.drag.moved=true;viewport.scrollLeft=this.drag.left-(event.clientX-this.drag.x);viewport.scrollTop=this.drag.top-(event.clientY-this.drag.y);}
    });
    const end=event=>{
      const shouldCycle=type=>type==='pointerup'&&this.drag&&!this.drag.moved&&this.pointers.size===1&&(this.profile?.levels?.length||0)>1;
      const cycleNow=shouldCycle(event.type);
      this.pointers.delete(event.pointerId);this.pinch=null;this.drag=null;
      if(this.pointers.size===1){const point=[...this.pointers.values()][0];this.drag={...point,left:viewport.scrollLeft,top:viewport.scrollTop,moved:true};}
      if(!this.pointers.size)viewport.classList.remove('dragging');
      if(cycleNow)this.cycle();
    };
    for(const type of['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(type,end);
  }
  cycle(){
    if(!this.profile?.levels?.length)return;
    this.history[this.level]={zoom:this.zoom,left:this.viewport.scrollLeft,top:this.viewport.scrollTop};
    const nextIndex=(this.level+1)%this.profile.levels.length;
    this.openLevel(nextIndex);
  }
  load(profile){this.profile=profile;this.active=true;this.history=[];this.openLevel(0);}
  openLevel(index,restore=null){
    if(!this.profile?.levels[index])return;
    const token=++this.serial,level=this.profile.levels[index];this.ready=false;
    this.onChange({loading:true,title:level.title,level:index,zoom:1,hasNext:index<this.profile.levels.length-1,hasPrevious:index>0});
    this.image.classList.add('image-loading');
    const source=new Image();
    source.onload=()=>{
      if(token!==this.serial||!this.active)return;
      this.level=index;this.renderHotspots(level.points||[]);this.sourceWidth=source.naturalWidth;this.sourceHeight=source.naturalHeight;
      this.image.src=level.src;this.image.alt=level.alt;this.zoom=restore?.zoom||1;this.ready=true;
      this.layout(false);this.viewport.scrollLeft=restore?.left||0;this.viewport.scrollTop=restore?.top||0;
      this.image.classList.remove('image-loading');this.viewport.dataset.level=String(index);this.viewport.dataset.loaded='true';
      this.notify();
    };
    source.onerror=()=>{if(token===this.serial&&this.active)this.onError(level);};
    source.src=level.src;
  }
  layout(preserve=true){
    if(!this.ready)return;
    const previousWidth=this.imageWidth||1;
    const cx=(this.viewport.scrollLeft+this.viewport.clientWidth/2-(this.offsetX||0))/previousWidth;
    const cy=(this.viewport.scrollTop+this.viewport.clientHeight/2-(this.offsetY||0))/previousWidth;
    this.baseWidth=Math.min(this.sourceWidth,this.viewport.clientWidth,this.viewport.clientHeight*this.sourceWidth/this.sourceHeight);
    // Stop at source-pixel scale instead of endlessly enlarging a finite raster.
    this.maxZoom=Math.max(1,Math.min(8,this.sourceWidth/Math.max(1,this.baseWidth)));
    this.zoom=Math.max(1,Math.min(this.maxZoom,this.zoom));
    this.imageWidth=this.baseWidth*this.zoom;this.imageHeight=this.imageWidth*this.sourceHeight/this.sourceWidth;
    const width=Math.max(this.viewport.clientWidth,this.imageWidth),height=Math.max(this.viewport.clientHeight,this.imageHeight);
    this.offsetX=(width-this.imageWidth)/2;this.offsetY=(height-this.imageHeight)/2;
    Object.assign(this.canvas.style,{width:`${width}px`,height:`${height}px`});
    Object.assign(this.hotspotLayer.style,{width:`${this.imageWidth}px`,height:`${this.imageHeight}px`,left:`${this.offsetX}px`,top:`${this.offsetY}px`});
    Object.assign(this.image.style,{width:`${this.imageWidth}px`,height:`${this.imageHeight}px`,left:`${this.offsetX}px`,top:`${this.offsetY}px`});
    if(preserve){this.viewport.scrollLeft=cx*this.imageWidth+this.offsetX-this.viewport.clientWidth/2;this.viewport.scrollTop=cy*this.imageWidth+this.offsetY-this.viewport.clientHeight/2;}
    this.notify();
  }
  renderHotspots(points){
    this.hotspotLayer.replaceChildren();
    points.forEach((point,index)=>{
      const button=document.createElement('button');button.type='button';button.className='illustration-hotspot';button.style.left=`${point.x}%`;button.style.top=`${point.y}%`;button.setAttribute('aria-label',`${point.title}: ${point.description}`);button.textContent=String(index+1);
      const tip=document.createElement('span');tip.className='illustration-hotspot-tip';if(point.x>72)tip.classList.add('align-right');if(point.y<25)tip.classList.add('below');
      const title=document.createElement('strong');title.textContent=point.title;const description=document.createElement('span');description.textContent=point.description;tip.append(title,description);button.append(tip);button.addEventListener('click',event=>{event.stopPropagation();this.onPoint(point);});this.hotspotLayer.append(button);
    });
  }
  notify(){if(this.ready)this.onChange({loading:false,title:this.profile.levels[this.level].title,zoom:this.zoom,maxZoom:this.maxZoom,level:this.level,hasNext:this.level<this.profile.levels.length-1,hasPrevious:this.level>0});}
  setZoom(next,anchor=null,allowLevel=true){
    if(!this.ready)return;
    if(next<.98){if(this.level>0)this.previous();else this.onExit();return;}
    if(allowLevel&&next>this.zoom&&next>=Math.min(1.9,this.maxZoom)&&this.level<this.profile.levels.length-1){this.next();return;}
    const px=anchor?.px??this.viewport.clientWidth/2,py=anchor?.py??this.viewport.clientHeight/2;
    const x=(this.viewport.scrollLeft+px-this.offsetX)/this.imageWidth,y=(this.viewport.scrollTop+py-this.offsetY)/this.imageWidth;
    this.zoom=Math.max(1,Math.min(this.maxZoom,next));this.layout(false);
    this.viewport.scrollLeft=x*this.imageWidth+this.offsetX-px;this.viewport.scrollTop=y*this.imageWidth+this.offsetY-py;this.notify();
  }
  zoomBy(factor){this.setZoom(this.zoom*factor);}
  next(){if(this.level>=this.profile.levels.length-1)return;this.history[this.level]={zoom:this.zoom,left:this.viewport.scrollLeft,top:this.viewport.scrollTop};this.openLevel(this.level+1);}
  previous(){if(this.level>0)this.openLevel(this.level-1,this.history[this.level-1]||null);}
  reset(){if(this.active)this.openLevel(0);}
  deactivate(){this.active=false;this.ready=false;this.serial++;this.pointers.clear();this.drag=null;this.pinch=null;}
}
