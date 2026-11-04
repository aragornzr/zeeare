// Schematic connections between atlas markers; these are not surveyed route geometries.
export const routes = [
 {name:'Great East Road',nodes:['Grey Havens','The Shire','Bree','Weathertop','Rivendell'],description:'A schematic east–west connection across Eriador, linking the western lands with the approaches to Rivendell.'},
 {name:'Greenway',nodes:['Fornost','Bree','Cardolan','Enedwaith'],description:'An interpreted north–south route through Eriador. Its plotted line is schematic and does not claim exact historical road geometry.'},
 {name:'Old Forest Road',nodes:['Beorn’s Hall','Mirkwood','Lake-town'],description:'A schematic crossing of Mirkwood, showing the broad west-to-east connection rather than an exact trail survey.'},
 {name:'High Pass crossing',nodes:['Rivendell','High Pass','Beorn’s Hall'],description:'An illustrated mountain crossing from Rivendell over the Misty Mountains into the Anduin valley.'},
 {name:'Redhorn Pass crossing',nodes:['Eregion','Caradhras','Lothlórien'],description:'A schematic route over the Redhorn Pass. The 3D scene interprets a mountain trail; it is not a documented engineering plan.'},
 {name:'Great West Road',nodes:['Edoras','Rohan','Minas Tirith'],description:'An interpreted road connection between the lands of Rohan and Minas Tirith. The route line is schematic.'},
 {name:'Morgul approach',nodes:['Osgiliath','Ithilien','Minas Morgul','Cirith Ungol'],description:'An illustrated approach through Ithilien toward the Morgul valley and the mountain passes. Route geometry is schematic.'},
 {name:'Paths of the Dead',nodes:['Dunharrow','White Mountains','Morthond'],description:'A schematic connection beneath the White Mountains from Dunharrow toward the Blackroot Vale. The procedural trail scene is an artistic interpretation.'}
].map(route=>({...route,region:'Paths & roads',path:true,x:600,y:500}));
