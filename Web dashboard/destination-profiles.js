import { places } from './middle-earth-places.js';
import { routes } from './atlas-routes.js';

// Named visual briefs drive both cinematic and interactive cameras. Local layouts,
// architectural embellishments and vegetation are artistic interpretations, not surveys.
// Earlier-age and unlocated destinations retain their source null map positions.
export const allDestinations = [...new Map([...places, ...routes].map(place => [place.name, { ...place, ...(place.nodes ? { nodes:[...place.nodes] } : {}) }])).values()];
const slug = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const seedOf = text => [...text].reduce((s, char) => (Math.imul(s, 31) + char.charCodeAt(0)) >>> 0, 17);
const palettes = {
 temperate: { ground:0x697449, rock:0x807b68, water:0x48777b, foliage:0x45603a, sky:0xa2bdc8 },
 alpine: { ground:0x69705b, rock:0x7a8285, water:0x43818f, foliage:0x3d5945, sky:0x9eb9cd },
 snow: { ground:0xc6d4d7, rock:0x78878f, water:0x416c85, foliage:0x566e69, sky:0xadbecb },
 arid: { ground:0xb59b6d, rock:0x9e825d, water:0x417b85, foliage:0x758151, sky:0xc1b7a1 },
 ash: { ground:0x383633, rock:0x484748, water:0x3b4e4c, foliage:0x494d3b, sky:0x665f5a },
 wetland: { ground:0x4b5745, rock:0x677066, water:0x506d69, foliage:0x4d6041, sky:0x9caca9 },
 woodland: { ground:0x52613e, rock:0x7a7e66, water:0x477e78, foliage:0x3a5c34, sky:0xa5bec0 },
 coastal: { ground:0x8e9676, rock:0x88908a, water:0x3e8192, foliage:0x55734b, sky:0x9fc2d1 }
};
const terrainByKind = {
 village:[14,8,3,0],city:[14,16,3,0],fortress:[26,34,4,0],ruins:[20,22,4,0],
 forest:[18,12,6,0],mountain:[88,110,45,0],valley:[34,62,35,0],river:[20,25,14,1],
 lake:[24,38,15,1],coast:[24,28,8,1],desert:[20,18,4,0],marsh:[4,3,1,.8],
 volcano:[95,120,16,0],cave:[42,55,12,0],road:[24,30,12,0]
};
// name | kind | biome | architecture | landmark | three distinctive visible scene details
const briefs = [
 ['The Shire','village','temperate','hobbit','hobbit-hill','Rounded turf-roofed smials between cultivated hills|Low hedged lanes linking the fields|Green countryside framed by distant downs'],
 ['Hobbiton','village','temperate','hobbit','mill-village','Bag End and three Bagshot Row smials beneath the Hill|The Water, its bridge and the north-bank old mill|Barefoot hobbit neighbours, kitchen gardens and hedged pastures'],
 ['Bag End','village','temperate','hobbit','bag-end','Bilbo’s prominent green-door home beneath a wooded Hill|Bilbo lights a cigar as Gandalf arrives at the garden gate|Frodo runs down a curved lane between flowering borders'],
 ['Buckland','village','temperate','hobbit','brandywine-bank','Hobbit dwellings above the Brandywine bank|River meadows and clipped hedgerows|A dark woodland fringe beyond the settled land'],
 ['Old Forest','forest','woodland','none','ancient-wood','Massive closely spaced ancient trunks|Gnarled roots lifting a narrow woodland trail|A low canopy filtering muted green light'],
 ['Bree','village','temperate','vernacular','crossroads','Timber-and-stone buildings around a road junction|Mixed low hobbit doors and taller human houses|Weathered lane paving beneath a wooded hill'],
 ['Barrow-downs','ruins','temperate','none','barrows','Grass-covered burial mounds on rolling downs|Half-buried standing stones and dark entrances|Ground-hugging mist between deserted ridges'],
 ['Weathertop','ruins','alpine','gondorian','watchtower','A broken circular watchtower crown on a bare summit|Scattered worn masonry around the exposed crest|Long views over a wind-scoured upland approach'],
 ['Rivendell','valley','woodland','elven','elven-waterfall','Graceful Elven halls set within a steep hidden valley|Slender bridges above the Bruinen ravine|Cascades and woodland terraces beneath mountain walls'],
 ['Grey Havens','coast','coastal','elven','elven-harbour','Pale Elven quays opening toward western water|Slender harbour towers and sheltered boat landings|White-sailed vessels beyond the stone waterfront'],
 ['Lindon','coast','coastal','elven','western-coast','Wooded coastal slopes west of the Blue Mountains|Elven stonework overlooking the western sea|Headlands fading into cool maritime haze'],
 ['Blue Mountains','mountain','alpine','none','blue-ridges','Successive blue-grey mountain ridges|Exposed rock ribs above wooded lower slopes|High saddles opening toward Eriador'],
 ['Eriador','valley','temperate','vernacular','open-country','Broad open countryside between distant ranges|Old road traces crossing low grassy ridges|Small scattered settlements amid river valleys'],
 ['Arnor','ruins','temperate','gondorian','northern-ruins','Weathered northern stone remains above open country|Broken enclosure walls overlooking old routeways|Long grassy vistas recalling a divided kingdom'],
 ['Annúminas','ruins','coastal','gondorian','lakeside-ruins','Ruined pale masonry on the shore of Lake Evendim|Broken colonnades descending toward still water|Terraced foundations partly reclaimed by grass'],
 ['Lake Evendim','lake','coastal','none','evendim-lake','Broad blue-grey lake water under northern light|Rocky shoreline coves and grass-covered banks|Distant ruined stone silhouettes beside the water'],
 ['Fornost','ruins','temperate','gondorian','ruined-citadel','A ruined northern citadel above desolate approaches|Broken curtain walls and fallen tower drums|Grass and low scrub overtaking old stone courts'],
 ['Arthedain','valley','temperate','gondorian','northern-uplands','Northern Eriador uplands beneath a broad sky|Scattered old stone enclosures along quiet roads|Wind-shaped grass on gently rising terrain'],
 ['Cardolan','ruins','temperate','gondorian','southern-downs','Open southern Eriador downs with ancient earthworks|Low burial mounds beyond abandoned walls|Weathered road traces across grassy ridgelines'],
 ['Rhudaur','valley','alpine','vernacular','eastern-hill-country','Rugged eastern hill country approaching the mountains|Rocky stream gullies beneath scattered woodland|Small weathered stone remains on exposed ridges'],
 ['Angmar','fortress','snow','dark','witch-realm','Bleak northern ridges beneath a heavy cold sky|Dark fortifications set against snow-dusted rock|Ash-grey approaches with sparse struggling scrub'],
 ['Carn Dûm','fortress','snow','dark','northern-citadel','A dark stone stronghold anchored to a northern crag|Steep defensible walls and narrow gate approaches|Ice and snow gathered in sheltered rock clefts'],
 ['Forodwaith','mountain','snow','none','frozen-north','Immense treeless snowfields and frozen ridges|Blue shadowed ice beside exposed dark rock|Blowing ground snow across uninhabited northern terrain'],
 ['Forochel','coast','snow','vernacular','ice-bay','A cold northern bay edged with broken sea ice|Snow-covered shore and pale distant headlands|Small interpreted shore shelters set above the frozen water'],
 ['Mount Gundabad','mountain','alpine','dark','gundabad-gate','An immense isolated northern mountain mass|A dark fortified opening beneath rock buttresses|Harsh scree slopes rising above a barren approach'],
 ['Misty Mountains','mountain','snow','none','snow-chain','A continuous wall of jagged snow-capped peaks|Deep glacial valleys separating steep rock spurs|Cloud bands threading through high mountain saddles'],
 ['High Pass','mountain','alpine','none','high-pass','A narrow traversable saddle between rocky peaks|Switchback trail ledges above deep mountain gullies|Patchy snow in shaded hollows along the crossing'],
 ['Goblin-town','cave','alpine','dark','goblin-cavern','A cavernous mountain interior with irregular stone roofs|Rough timber walkways connecting uneven ledges|Scattered torchlight illuminating dark tunnel mouths'],
 ['Caradhras','mountain','snow','none','redhorn','A red-toned mountain summit above hard snowfields|Steep wind-scoured rock gullies below the peak|An exposed high crossing dwarfed by the mountain face'],
 ['Moria','cave','alpine','dwarven','moria','Western ithildin doors beside a dark mountain pool|Monumental eastern gates facing Dimrill Dale|Deep columned halls and the narrow bridge over the abyss'],
 ['Eregion','valley','temperate','elven','hollin','Open Hollin countryside beneath the western mountains|Holly trees punctuating weathered Elven remains|Low stone foundations fading into long meadow grass'],
 ['Enedwaith','valley','temperate','vernacular','southern-wilds','Broad unsettled countryside between major riverlands|Heath and grassland interrupted by low wooded ridges|Worn paths crossing a wide transitional landscape'],
 ['Dunland','village','temperate','vernacular','dunland-hills','Small rough-stone settlements beneath western mountain slopes|Steep grassy grazing land divided by low enclosures|Dark timber roofs gathered around hillside paths'],
 ['Lothlórien','forest','woodland','elven','golden-wood','Tall golden-leaved woodland beside the Celebrant|Elevated Elven platforms glimpsed within the canopy|Filtered warm light above shaded riverbanks'],
 ['Caras Galadhon','forest','woodland','elven','tree-city','Layered Elven platforms among immense golden trees|Slender elevated bridges between living trunks|Warm lamps tracing a luminous canopy settlement'],
 ['Rhovanion','valley','temperate','vernacular','wilderland','Wide eastern plains beneath distant mountain silhouettes|A patchwork of woodland edges and open river country|Sparse settlements beside long overland tracks'],
 ['Mirkwood','forest','woodland','none','dark-forest','Dense dark trunks closing around a narrow woodland way|Tangled roots and fallen timber beneath a heavy canopy|Isolated shafts of cold light in deep green shadow'],
 ['Woodland Realm','forest','woodland','elven','woodland-gate','An Elven stone entrance set into a wooded hillside|Mature northern Mirkwood trees above a forest river|Carved thresholds and bridges partly concealed by foliage'],
 ['Dol Guldur','fortress','woodland','dark','forest-fortress','A dark fortress rising from southern forested heights|Broken angular stone walls above blackened tree cover|Low drifting haze isolating the stronghold from the woodland'],
 ['Beorn’s Hall','village','woodland','vernacular','beorns-hall','A substantial timber hall near the western forest edge|Enclosed pasture and a homestead clearing|Garden plots backed by distant Mirkwood trees'],
 ['Rhosgobel','village','woodland','vernacular','woodland-cottage','A small rustic dwelling beside the forest eaves|Mossy timber and untended garden growth|Bird-filled woodland and a winding root-bordered path'],
 ['Gladden Fields','marsh','wetland','none','gladden-marsh','Shallow water channels threading reed-covered flats|Silted islands and bright patches of marsh vegetation|Low mist softening the broad river floodplain'],
 ['Erebor','mountain','alpine','dwarven','erebor-gate','A solitary immense mountain above the surrounding plain|A monumental Dwarven gate cut into its southern face|A stony river approach descending toward Dale'],
 ['Dale','city','alpine','vernacular','dale-city','Stone trading houses below the Lonely Mountain|Stepped streets following the sheltered mountain-foot terrain|A riverfront approach connecting town and Dwarven gate'],
 ['Lake-town','city','coastal','vernacular','lake-town','Timber buildings raised above the Long Lake on piles|Narrow wooden bridges and waterfront trading landings|Rows of steep roofs reflected in cold open water'],
 ['Long Lake','lake','coastal','none','long-lake','A long cold lake fed by northern river channels|Wooded shorelines opening toward the distant Lonely Mountain|A timber settlement silhouette above the surface'],
 ['Iron Hills','mountain','alpine','dwarven','iron-hills','Low rugged iron-grey hills with exposed stone seams|Dwarven stone entrances embedded in sturdy hill faces|Broad stony tracks crossing sparse upland grass'],
 ['Withered Heath','valley','alpine','none','withered-heath','A desolate upland basin beneath bare mountain ridges|Dry grey heath and scattered blackened rock|Open wind-scoured terrain with little living canopy'],
 ['Anduin','river','temperate','none','great-river','A wide winding river crossing layered eastern landscapes|Rocky banks alternating with wooded floodplain reaches|Long water reflections leading toward distant southern hills'],
 ['Fangorn','forest','woodland','none','ent-forest','Towering ancient trees with exceptionally broad root bases|Deep moss and leaf litter across a shadowed forest floor|Knotted trunks suggesting watchful living woodland'],
 ['Isengard','fortress','temperate','dark','orthanc','A black four-spired tower within a circular stone enclosure|Radial approaches converging on the central fortress|A ringed valley framed by the southern mountain slopes'],
 ['Rohan','valley','temperate','rohan','horse-plains','Sweeping grasslands below a distant white mountain wall|Timber halls and fenced paddocks on low rises|Open riding tracks crossing the broad horse-country plain'],
 ['Edoras','city','temperate','rohan','meduseld','A golden-roofed timber hall crowning a steep settlement hill|Close-set wooden houses along a climbing central way|Mountain-backed plains beyond the outer enclosure'],
 ['Helm’s Deep','fortress','alpine','rohan','hornburg','A curved defensive wall spanning a steep-sided gorge|The Hornburg integrated with a rocky mountain shoulder|A narrow approach below towering stone cliffs'],
 ['Dunharrow','mountain','alpine','rohan','mountain-refuge','A high mountain refuge above the Harrowdale valley|A steep winding ascent bordered by old standing stones|Open ledges beneath the entrance to a dark mountain passage'],
 ['Westfold','valley','temperate','rohan','westfold-farms','Western Rohan grassland between wooded foothills|Scattered timber farmsteads beside enclosed grazing fields|Broad tracks leading toward the distant mountain gorges'],
 ['The Wold','valley','temperate','rohan','rolling-wold','Long treeless upland swells in northern Rohan|Pale wind-combed grass over gently folded ground|Wide open views toward distant riverland horizons'],
 ['Emyn Muil','mountain','alpine','none','broken-hills','A maze of broken grey ridges and sharp gullies|Bare stone shelves interrupted by sparse dry scrub|Abrupt terrain drops above the Rauros basin'],
 ['Argonath','river','alpine','gondorian','argonath','Two immense stone guardian figures flanking a river gorge|Upright raised hands above the narrow water passage|Sheer cliff walls confining the deep green Anduin'],
 ['Amon Hen','ruins','woodland','gondorian','hill-of-seeing','A weathered stone seat on a wooded summit|Old stair fragments climbing through tree roots|Views over the river and broken hills below'],
 ['Rauros','river','alpine','none','waterfall','A broad powerful waterfall dropping from the upper river basin|White spray rising against dark wet cliff faces|Fast river water breaking into a lower gorge'],
 ['White Mountains','mountain','snow','none','white-range','Bright snow-capped ridges forming a southern mountain barrier|Steep limestone faces and deep shadowed passes|Green lower valleys beneath the continuous pale crest'],
 ['Gondor','valley','temperate','gondorian','gondor-realm','Stone settlements scattered below the White Mountains|Cultivated river valleys linked by pale winding roads|A distant fortified white city beyond the agricultural plain'],
 ['Minas Tirith','city','alpine','gondorian','seven-walls','Seven ascending fortified terraces beneath a mountain shoulder|Dense pale stone houses and a projecting central rock spur|A high citadel court with a white tree and fountain'],
 ['Osgiliath','ruins','temperate','gondorian','river-ruins','Broken domes and ruined stone quarters beside the Anduin|Damaged bridge spans reaching across the broad river|Flooded foundations and abandoned waterfront streets'],
 ['Pelennor Fields','valley','temperate','gondorian','pelennor-farms','Cultivated field parcels outside the White City|Low farmsteads and rural tracks across the river plain|The mountain-backed city rising beyond open agricultural land'],
 ['Ithilien','forest','woodland','gondorian','ithilien-gardens','Lush woodland and bright flowering scrub|Clear stream cuts through limestone and shaded greenery|Quiet paths along the western side of the shadowed mountains'],
 ['Henneth Annûn','cave','woodland','gondorian','hidden-waterfall','A concealed stone refuge behind falling water|A translucent cascade screening a shadowed cave mouth|Wet rock ledges and dense Ithilien foliage outside'],
 ['Cair Andros','fortress','wetland','gondorian','river-island','A fortified elongated island dividing the Anduin|Stone embankments rising above fast river channels|Wooded central ground enclosed by defensive masonry'],
 ['Pelargir','city','coastal','gondorian','river-harbour','Stone quays along a broad navigable river reach|Tall ship masts gathered near warehouses and waterfront streets|Pale harbour buildings above reflective southern water'],
 ['Dol Amroth','city','coastal','gondorian','coastal-citadel','A pale princely citadel above the Bay of Belfalas|Stepped coastal streets descending toward a sheltered harbour|Rocky sea cliffs beneath bright southern maritime light'],
 ['Belfalas','coast','coastal','gondorian','belfalas-coast','Rolling coastal hills beside a wide southern bay|Rocky points separating sheltered beaches|Scattered pale settlements overlooking blue-green water'],
 ['Lebennin','valley','temperate','gondorian','five-rivers','A fertile southern plain divided by several river channels|Cultivated fields and orchards between wooded banks|Low stone bridges linking settled agricultural ground'],
 ['Lamedon','valley','alpine','gondorian','mountain-valley','An inland cultivated valley below the White Mountains|Steep green foothills above small stone settlements|A winding stream following the sheltered valley floor'],
 ['Anfalas','coast','coastal','gondorian','long-coast','A long open western Gondor shoreline|Coastal grassland behind low rocky headlands|Sparse fishing settlements and weathered shore paths'],
 ['Morthond','valley','alpine','gondorian','blackroot-vale','A narrow green vale below the White Mountains|A dark mountain cleft above the upper valley|The Blackroot watercourse threading meadow and stone'],
 ['Mordor','valley','ash','dark','enclosed-dark-land','Mountain walls, the Morannon, Udun and the Iron Jaws|Broken Gorgoroth, solitary Orodruin and the Barad-dur fortress|The steep western pass and cultivated southern Nurn'],
 ['Black Gate','fortress','ash','dark','black-gate','An immense barred gateway sealing a mountain gap|Two dark flanking watchtowers over a barren approach|Heavy angular fortifications joining the surrounding ridges'],
 ['Udûn','valley','ash','dark','enclosed-basin','An enclosed blackened valley behind the Morannon|Roads converging through an ash-covered basin|Steep enclosing ridges with narrow controlled exits'],
 ['Mount Doom','volcano','ash','dark','volcano','A steep active volcanic cone above a barren plain|Glowing fissures and lava staining the upper slopes|An ash plume softening the red-lit summit crater'],
 ['Barad-dûr','fortress','ash','dark','dark-tower','An exceptionally tall tiered black fortress tower|Massive buttressed foundations rising from volcanic rock|Distant red volcanic light behind the dark battlements'],
 ['Gorgoroth','valley','ash','none','ash-plateau','A wide barren plateau of fractured volcanic rock|Ash drifts and dark fissures beneath an oppressive sky|A distant smoking cone beyond the broken plain'],
 ['Minas Morgul','fortress','ash','dark','morgul-city','A pale corrupted fortress at a shadowed valley mouth|Cold green light around angular towers and gate masonry|A narrow road climbing toward the eastern mountain passes'],
 ['Cirith Ungol','fortress','alpine','dark','spider-pass','A severe mountain pass above a defended Orc tower|Sheer rock stairways and narrow exposed ledges|A dark cleft suggesting the approach to Shelob’s tunnels'],
 ['Dead Marshes','marsh','wetland','none','dead-marshes','Dark shallow pools divided by unstable peat islands|Sparse dead reeds under low grey marsh mist|Unnatural small lights above the stagnant water'],
 ['Nurn','valley','ash','vernacular','nurn-fields','Cultivated southern Mordor land near an inland sea|Dry field parcels contrasting with the darker surrounding ridges|Irrigation-like channels in an interpreted agricultural basin'],
 ['Sea of Núrnen','lake','ash','none','nurnen-sea','A broad inland sea enclosed by dry dark shores|Low salt-stained banks and distant barren ridges|Muted water reflections beside cultivated southern lowlands'],
 ['Rhûn','valley','arid','vernacular','eastern-expanse','A broad interpreted eastern grassland and dry steppe|Distant inland water and low hazy ridges|Sparse travel tracks without invented precise borders'],
 ['Sea of Rhûn','lake','arid','none','rhun-sea','A vast inland lake east of Wilderland|Dry rocky shorelines with sheltered blue-water bays|Low distant hills beneath a broad continental sky'],
 ['Dorwinion','valley','temperate','vernacular','vineyard','Interpreted vineyard rows near inland water|Low wine-country farm buildings among cultivated slopes|A hazy lakeside horizon without asserted exact borders'],
 ['Khand','desert','arid','harad','southeastern-steppe','An interpreted dry southeastern steppe landscape|Rocky uplands above dusty overland tracks|Sparse low settlements without invented canonical street plans'],
 ['Near Harad','desert','arid','harad','southern-road','Dry southern hills and sun-warmed stony plains|An interpreted settlement beside a sheltered watercourse|Long travel routes leading farther into the Southlands'],
 ['Umbar','city','arid','harad','corsair-harbour','A large sheltered southern harbour with tall-masted ships|Dense stone waterfront buildings around curving quays|Warm dry hills framing an open sea entrance'],
 ['Far Harad','valley','arid','harad','far-south','An interpreted remote southern landscape|Warm open country and scattered seasonal greenery|Distant horizons deliberately avoiding precise invented geography'],
 ['Haradwaith','desert','arid','harad','southlands','A broad interpreted mosaic of dry southern terrain|Rocky ridges giving way to open sunlit plains|Scattered vegetation representing a region rather than one city'],
 ['Bay of Belfalas','coast','coastal','none','southern-bay','A broad blue southern bay between distant coasts|White-edged waves against exposed rocky points|Layered headlands dissolving into sea haze'],
 ['Belegaer','coast','coastal','none','great-sea','An immense western sea extending to the horizon|Deep blue swells and scattered white wave crests|A distant coastline at the edge of open water'],
 ['Beleriand','valley','temperate','elven','first-age-land','An imagined First Age landscape of river valleys and wooded hills|Distant mountain barriers beneath clear western light|Separate scene presentation rather than a Third Age map position'],
 ['Doriath','forest','woodland','elven','hidden-woodland','Dense ancient woodland around a secluded river reach|An interpreted carved stone threshold beneath forest roots|Soft filtered light suggesting a sheltered First Age realm'],
 ['Gondolin','city','alpine','elven','hidden-city','A pale Elven city enclosed by a ring of high mountains|Slender towers and planted stone courtyards|A concealed valley approached through steep mountain walls'],
 ['Nargothrond','cave','woodland','elven','narog-caverns','A concealed riverside entrance beneath a steep stone bank|Interpreted Elven cavern halls behind the threshold|The Narog watercourse reflecting shaded cliff faces'],
 ['Angband','fortress','ash','dark','northern-underworld','A dark northern fortress integrated with forbidding mountains|A deep black gateway beneath immense rock masses|Smoke and ember haze around an interpreted underground approach'],
 ['Thangorodrim','volcano','ash','dark','three-peaks','Three massive volcanic mountain peaks above a dark fortress region|Ash-dark slopes separated by deep broken gullies|Smoke-heavy light outlining the three distinct summits'],
 ['Hithlum','valley','alpine','elven','northern-basin','A broad First Age northern basin enclosed by mountains|Cool open grassland beneath clouded ridgelines|Woodland fringes bordering an interpreted settled valley'],
 ['Dor-lómin','valley','alpine','vernacular','first-age-valley','A sheltered southern district of an imagined Hithlum basin|Scattered timber-and-stone homesteads on grassy slopes|Mountain-backed farmland under cool northern light'],
 ['Ossiriand','river','woodland','elven','seven-rivers','Several clear river channels dividing wooded eastern country|Tree-covered islands and stony green banks|A broad riverland scene evoking the Land of Seven Rivers'],
 ['Tol Sirion','fortress','wetland','elven','sirion-island','A stone tower on an island within a strong river channel|Wooded banks framing the isolated island stronghold|Mist over the First Age Sirion watercourse'],
 ['Havens of Sirion','coast','coastal','elven','river-mouth-haven','A refuge settlement at broad river mouths|Small quays and timber vessels on sheltered estuary water|Coastal reeds and distant open western sea'],
 ['Cuiviénen','lake','woodland','none','awakening-water','An imagined quiet eastern lakeshore under starlike light|Dense ancient trees reflected in still dark water|An unlocated mythic scene without a claimed map position'],
 ['Hildórien','valley','temperate','none','awakening-land','An imagined remote eastern dawn landscape|Open green ground beside sheltered woodland edges|A deliberately unlocated scene for the awakening of Men'],
 ['Great East Road','road','temperate','vernacular','east-road','An old east–west roadway through Eriador countryside|Village approaches alternating with exposed grassy ridges|Distant mountain foothills marking the eastern journey'],
 ['Greenway','road','temperate','vernacular','greenway','A worn north–south road through open western lands|Grass reclaiming the edges of an older paved route|Weathered roadside stonework between low wooded rises'],
 ['Old Forest Road','road','woodland','none','forest-road','A narrow road tunnelling through dense Mirkwood trees|Root-lifted paving and fallen timber beside the way|Occasional canopy openings revealing the woodland crossing'],
 ['High Pass crossing','road','alpine','none','mountain-crossing','A switchback mountain trail between steep rocky slopes|Patchy high snow and exposed saddle approaches|A descent toward distant eastern river country'],
 ['Redhorn Pass crossing','road','snow','none','redhorn-crossing','A high snow-dusted crossing beneath the Redhorn|Red-grey rock walls confining an exposed winding track|Steep western and eastern mountain approaches'],
 ['Great West Road','road','temperate','gondorian','west-road','A broad interpreted road beneath the White Mountains|Timber settlements giving way to pale stone farm country|Long grassy plains linking Rohan with Gondor'],
 ['Morgul approach','road','ash','dark','morgul-road','A narrowing valley road between wooded country and dark mountains|Cold green fortress light at the far end of the approach|A steep pass trail beyond the corrupted city'],
 ['Paths of the Dead','road','alpine','none','dead-path','An interpreted dark passage through the White Mountains|Rock-hewn thresholds and enclosed stony trail sections|A southern emergence toward the green Blackroot Vale']
];

const overrides = {
 'Hobbiton': {palette:{ground:0x73a34c},camera:{distance:140,pitch:.24,yaw:.38,target:[0,10,-23]},terrain:{amplitude:22,ridge:8,valley:3,waterLevel:.65}},
 'The Shire': {terrain:{amplitude:10,ridge:12,valley:3,waterLevel:0}},
 'Bag End': {palette:{ground:0x779754},sun:{elevation:.46,azimuth:-.8,warmth:.8},camera:{distance:42,pitch:.15,yaw:.4,target:[0,16,-10]}},
 'Rivendell': {camera:{distance:133,pitch:.37,yaw:.38,target:[0,13,-15]},terrain:{amplitude:47,ridge:72,valley:44,waterLevel:1}},
 'Lothlórien': {palette:{foliage:0xb0a64d},sun:{elevation:.52,azimuth:-.7,warmth:.88}},
 'Caras Galadhon': {palette:{foliage:0xb3a450},camera:{distance:112,pitch:.32,yaw:.42,target:[0,18,-5]}},
 'Moria': {camera:{distance:62,pitch:.19,yaw:.12,target:[0,10,-12]},terrain:{amplitude:73,ridge:100,valley:25,waterLevel:1}},
 'Minas Tirith': {camera:{distance:184,pitch:.43,yaw:.4,target:[0,22,-20]},terrain:{amplitude:28,ridge:76,valley:16,waterLevel:0}},
 'Isengard': {camera:{distance:155,pitch:.36,yaw:.32,target:[0,18,0]}},
 'Argonath': {camera:{distance:138,pitch:.2,yaw:.16,target:[0,26,-10]},terrain:{amplitude:62,ridge:84,valley:48,waterLevel:1}},
 'Helm’s Deep': {camera:{distance:118,pitch:.23,yaw:.28,target:[0,14,-15]},terrain:{amplitude:64,ridge:95,valley:36,waterLevel:0}},
 'Edoras': {camera:{distance:120,pitch:.32,yaw:.38,target:[0,16,0]}},
 'Mount Doom': {sun:{elevation:.15,azimuth:-.8,warmth:1},camera:{distance:202,pitch:.35,yaw:.26,target:[0,34,0]}},
 'Minas Morgul': {palette:{water:0x456d60,sky:0x697f73},sun:{elevation:.18,azimuth:-.4,warmth:.12}},
 'Caradhras': {palette:{rock:0x90776d}},
 'Cuiviénen': {sun:{elevation:.07,azimuth:.8,warmth:.18},palette:{sky:0x344e65}},
 'Hildórien': {sun:{elevation:.12,azimuth:-1.1,warmth:.92}},
 'Thangorodrim': {terrain:{amplitude:104,ridge:128,valley:35,waterLevel:0}}
};
const makeProfile = (brief,index) => {
 const [name,kind,biome,architecture,landmark,featureText]=brief;
 const source=allDestinations.find(place=>place.name===name);
 if(!source)throw Error(`Scene brief has no source destination: ${name}`);
 const seed=seedOf(name),variation=(seed%997)/997;
 const [amplitude,ridge,valley,waterLevel]=terrainByKind[kind];
 const ancient=source.x===null,uncertain=ancient||['Rhûn','Dorwinion','Khand','Near Harad','Far Harad','Haradwaith'].includes(name);
 const override=overrides[name]||{};
 const features=featureText.split('|');
 const atmosphere=biome==='ash'?'smoke and ember haze':biome==='snow'?'cold clear air and wind-blown snow':biome==='woodland'?'layered canopy light and woodland mist':biome==='coastal'?'sea haze and soft reflected light':biome==='wetland'?'low ground mist and water reflections':biome==='arid'?'warm dust haze and long open views':'soft daylight and layered distance haze';
 return Object.freeze({
  id:slug(name),seed,name,kind,biome,architecture,landmark,features:Object.freeze(features),
  palette:Object.freeze({...palettes[biome],...override.palette}),
  sun:Object.freeze({elevation:biome==='ash'?.24:biome==='snow'?.35:.45+variation*.18,azimuth:-.8+variation*.6,warmth:biome==='snow'?.3:biome==='ash'?.82:.62,...override.sun}),
  terrain:Object.freeze({amplitude:amplitude*(.94+variation*.12),ridge:ridge*(.95+variation*.1),valley,waterLevel,...override.terrain}),
  camera:Object.freeze({distance:(kind==='mountain'||kind==='volcano'?180:kind==='city'?145:kind==='cave'?82:kind==='forest'?104:126)+variation*14,pitch:kind==='cave'?.2:.28+variation*.13,yaw:.24+variation*.26,target:[0,kind==='mountain'||kind==='volcano'?22:kind==='city'?14:8,-8],...override.camera}),
  mood:`${name}: ${atmosphere}.`,
  detail:`${source.description} Visual brief: ${features.join('; ')}. Local building plans, planting and erosion patterns are artistic interpretations.`,
  uncertainty:source.path?'Schematic route interpretation; neither the plotted line nor the 3D trail is a surveyed route.':ancient?'Earlier-age or unlocated destination: this standalone scene is an artistic interpretation and has no invented Third Age map coordinates.':uncertain?'Broad or uncertain geography: local scenery is an artistic interpretation, not a claimed canonical site plan.':'Named landscape and landmark interpretation; local dimensions, paths and buildings are not surveyed or canonical plans.',
  mapPosition:Object.freeze({x:source.x,y:source.y}),region:source.region,index
 });
};
export const destinationProfiles = Object.freeze(Object.fromEntries(briefs.map((brief,index)=>[brief[0],makeProfile(brief,index)])));
if(Object.keys(destinationProfiles).length!==allDestinations.length)throw Error('Every atlas destination must have one authored scene brief.');
export function getDestinationProfile(place){const name=typeof place==='string'?place:place?.name;return destinationProfiles[name]||null;}
