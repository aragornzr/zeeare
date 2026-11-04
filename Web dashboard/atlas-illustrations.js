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
export const illustratedPlaces = {
  'Rivendell': {levels:[{title:'Rivendell · valley and halls',src:'assets/illustrations/rivendell-valley.jpg',alt:'Supplied illustrated map of Rivendell with Elven halls, bridges, gardens, waterfalls and the Bruinen',points:[{title:'The Great Hall',x:61,y:41,description:'The large Elven hall labelled in the supplied artwork. Its scale and architectural details are artistic interpretations.'},{title:'The Last Homely House',x:47,y:48,description:'Elrond’s refuge in Rivendell, represented here by the interconnected buildings and gardens.'},{title:'The Library',x:78,y:45,description:'The library pavilion labelled by this illustration; this particular building plan is imagined.'},{title:'The Council Ring',x:69,y:64,description:'The council setting shown in this artwork, interpreted as an open circular terrace.'},{title:'Bruinen River',x:44,y:77,description:'The river winding beneath bridges and waterfalls in this illustrated valley.'}]}]},
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
