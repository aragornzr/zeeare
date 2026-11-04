import { places, reliefPositions } from './middle-earth-places.js?v=hobbiton-rivendell-4k-20261104';
import { routes } from './atlas-routes.js?v=reference-atlas-20261027';
import { Atlas3D } from './atlas-3d.js?v=reference-atlas-20261027';
import { illustratedPlaces, IllustratedAtlas } from './atlas-illustrations.js?v=hobbiton-rivendell-4k-20261104';
places.push(...routes);
const $ = selector => document.querySelector(selector);
const svgNS = 'http://www.w3.org/2000/svg';
const search = $('#place-search'), filter = $('#region-filter'), list = $('#place-list');
const viewport = $('#map-viewport'), canvas = $('#map-canvas'), tooltip = $('#map-tooltip');
const mapSection = $('.map-section'), frame = $('.map-frame');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motion = () => reduceMotion.matches ? 'instant' : 'smooth';
let selected = null, zoom = 1, scene = 'world', worldCamera = null;
let renderer = null, illustratedAtlas = null;
function svgElement(tag, attributes) {
  const element = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}
const ranges = [Array.from({length:22},(_,i)=>[540-i*2.3,160+i*17]),Array.from({length:14},(_,i)=>[180-i*.5,150+i*16]),Array.from({length:18},(_,i)=>[440+i*14,624+Math.sin(i*.45)*13]),Array.from({length:12},(_,i)=>[780+i*2,555+i*15]),Array.from({length:13},(_,i)=>[795+i*15,540])];
for (const range of ranges) for (const [x,y] of range) $('#mountains').append(svgElement('use',{href:'#peak',transform:`translate(${x} ${y})`}));
for (const region of [...new Set(places.map(p=>p.region))]) {
  const option = document.createElement('option'); option.value = region; option.textContent = region; filter.append(option);
}
const markers = new Map();
function hideTooltip(){tooltip.hidden = true;}
function showTooltip(place) {
  if (scene !== 'world') return;
  tooltip.replaceChildren();
  const title = document.createElement('strong'); title.textContent = place.name;
  const text = document.createElement('span'); text.textContent = place.description;
  tooltip.append(title,text); tooltip.hidden = false;
  const scale = canvas.clientWidth / 1200;
  tooltip.style.left = `${Math.max(8,Math.min(place.x*scale+16,canvas.clientWidth-251))}px`;
  tooltip.style.top = `${Math.max(8,place.y*scale-100)}px`;
}
// Discovery cards stay legible before slowly fading. Hover/focus pauses dismissal.
const reveal = $('#place-reveal');
let revealDelay, revealFinish, revealVersion = 0;
function cancelRevealTimers() { clearTimeout(revealDelay); clearTimeout(revealFinish); }
function hideReveal() {
  cancelRevealTimers(); revealVersion++; reveal.hidden = true; reveal.classList.remove('is-visible','is-fading');
}
function scheduleRevealFade() {
  cancelRevealTimers();
  reveal.classList.remove('is-fading');
  revealDelay = setTimeout(() => {
    reveal.classList.add('is-fading');
    const version = revealVersion;
    revealFinish = setTimeout(() => { if (version === revealVersion) hideReveal(); }, reduceMotion.matches ? 0 : 2200);
  }, 7500);
}
function positionReveal() {
  if (reveal.hidden) return;
  reveal.style.top='';
}
window.addEventListener('scroll',positionReveal,{passive:true});
window.addEventListener('resize',positionReveal);
function announcePlace(place) {
  cancelRevealTimers(); revealVersion++;
  $('#reveal-region').textContent = place.region || 'MINAS TIRITH · CITY DETAIL';
  $('#reveal-title').textContent = place.name;
  $('#reveal-description').textContent = place.description;
  $('#reveal-city').hidden = scene !== 'world';
  $('#reveal-city').textContent = 'Open cinematic & 3D journey ↗';
  $('#reveal-streets').hidden = true;
  reveal.hidden = false; reveal.classList.remove('is-visible','is-fading');
  // Restart the entrance animation even when the same location is selected twice.
  void reveal.offsetWidth;
  reveal.classList.add('is-visible'); positionReveal(); scheduleRevealFade();
}
reveal.addEventListener('pointerenter', () => { cancelRevealTimers(); reveal.classList.remove('is-fading'); });
reveal.addEventListener('pointerleave', () => { if (!reveal.contains(document.activeElement)) scheduleRevealFade(); });
reveal.addEventListener('focusin', () => { cancelRevealTimers(); reveal.classList.remove('is-fading'); });
reveal.addEventListener('focusout', event => { if (!reveal.contains(event.relatedTarget)) scheduleRevealFade(); });
$('#reveal-close').addEventListener('click', hideReveal);
function renderDetails(place) {
  const region = document.createElement('p'); region.className='eyebrow'; region.textContent=(place.region || 'MINAS TIRITH · CITY DETAIL').toUpperCase();
  const title=document.createElement('h2'); title.textContent=place.name;
  const description=document.createElement('p'); description.textContent=place.description;
  $('#place-details').replaceChildren(region,title,description);
  if (places.includes(place) && !place.path) {
    const link=document.createElement('a'); link.textContent='Read more in Tolkien Gateway ↗'; link.href=`https://tolkiengateway.net/wiki/${encodeURIComponent(place.name.replaceAll(' ','_'))}`; link.target='_blank'; link.rel='noopener'; $('#place-details').append(link);
  }
  if (place.x===null) {const note=document.createElement('p'); note.textContent='Earlier-age or uncertain location: included in the index, without an invented position on the Third Age map.'; $('#place-details').append(note);}
  if (scene === 'world') {
    const button=document.createElement('button');button.className='primary-button city-entry';button.textContent=`Explore ${place.name} · Cinematic & 3D ↗`;button.addEventListener('click',()=>enter3D(place));$('#place-details').append(button);
    if (illustratedPlaces[place.name]) {
      const artButton=document.createElement('button');artButton.className='primary-button city-entry';artButton.style.marginLeft='10px';artButton.textContent=`View ${place.name} 4K Pictures ↗`;artButton.addEventListener('click',()=>enterIllustration(place));$('#place-details').append(artButton);
    }
  }
}
function centerOn(x, y, behavior = motion()) {
  const scale=canvas.clientWidth/1200;
  viewport.scrollTo({left:x*scale-viewport.clientWidth/2,top:y*scale-viewport.clientHeight/2,behavior});
}
function choose(place, revealMap = false) {
  if (scene !== 'world') leave3D();
  selected = place; hideTooltip();
  for (const [p,marker] of markers) {marker.classList.toggle('selected',p===place);marker.setAttribute('aria-pressed',String(p===place));}
  renderDetails(place); announcePlace(place);
  if(place.x!==null) centerOn(place.x,place.y);
  if(revealMap) frame.scrollIntoView({block:'nearest',behavior:motion()});
  for (const button of list.children) button.setAttribute('aria-pressed',String(button.dataset.name===place.name));
  if(['Hobbiton','Bag End','The Shire','Rivendell','Lothlórien','Caras Galadhon'].includes(place?.name)) enterIllustration(place);
}
for (const place of places.filter(p=>p.x!==null)) {
  const marker=svgElement('g',{class:'map-pin',transform:`translate(${place.x} ${place.y})`,tabindex:'0',role:'button','aria-label':`${place.name}: ${place.description}`,'aria-pressed':'false'});
  marker.append(svgElement('circle',{r:13,class:'halo'}),svgElement('circle',{r:4,class:'dot'}));
  if(['The Shire','Rivendell','Lothlórien','Gondor','Rhûn','Near Harad','Far Harad','Erebor','Minas Tirith','Mount Doom','Grey Havens','Isengard','Edoras','Umbar','Angmar','Moria'].includes(place.name)) marker.classList.add('major-place');
  const label=svgElement('text',{x:10,y:-9});label.textContent=place.name;marker.append(label);
  marker.addEventListener('pointerenter',()=>showTooltip(place));marker.addEventListener('pointerleave',hideTooltip);
  marker.addEventListener('focus',()=>showTooltip(place));marker.addEventListener('blur',hideTooltip);
  marker.addEventListener('click',()=>choose(place));marker.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(place);}if(e.key==='Escape')hideTooltip();});
  markers.set(place,marker);$('#map-markers').append(marker);
}
function renderIndex(){
  const query=search.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace('rivendale','rivendell');
  const results=places.filter(p=>(!filter.value||p.region===filter.value)&&`${p.name} ${p.region}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query)).sort((a,b)=>a.name.localeCompare(b.name));
  list.replaceChildren();
  for (const place of results){const button=document.createElement('button');button.type='button';button.dataset.name=place.name;button.setAttribute('aria-pressed',String(selected===place));button.textContent=place.name;const region=document.createElement('small');region.textContent=place.region+(place.x===null?' · index only':'');button.append(region);button.addEventListener('click',()=>choose(place,true));list.append(button);}
  $('#result-count').textContent=`${results.length} of ${places.length} places · ${places.filter(p=>p.x!==null).length} on the map`;
  if(!results.length){const message=document.createElement('p');message.textContent='No places found. Try another name or region.';message.style.fontSize='12px';list.append(message);}
  for(const [place,marker] of markers)marker.classList.toggle('dim',!results.includes(place));
}
function updateCamera() {
  canvas.style.width=`${zoom*100}%`;canvas.classList.toggle('show-minor-labels',zoom>=2);
  $('#zoom-value').textContent=`${Math.round(zoom*100)}%`;
  $('#zoom-out').disabled=zoom===1 && scene==='world';$('#zoom-in').disabled=zoom===5;
  hideTooltip();
}
function setZoom(next, anchor = null, allowDetail = true) {
  hideReveal();
  if(scene==='destination'){destinationControl(next>zoom?'zoom-in':'zoom-out');return;}
  if(scene==='moria'){moriaControl(next>zoom?'zoom-in':'zoom-out');return;}
  if(scene==='art'){illustratedAtlas.zoomBy(next>zoom?1.25:1/1.25);return;}
  if(scene==='3d'){renderer?.zoom(next>zoom?1.2:1/1.2);return;}
  if(allowDetail && next>=2 && next>zoom){const target=selected || nearestPlace(anchor);if(target){enter3D(target);return;}}
  const previous=canvas.clientWidth;
  const cx=anchor?.x ?? (viewport.scrollLeft+viewport.clientWidth/2)/previous;
  const cy=anchor?.y ?? (viewport.scrollTop+viewport.clientHeight/2)/previous;
  const px=anchor?.px ?? viewport.clientWidth/2, py=anchor?.py ?? viewport.clientHeight/2;
  zoom=Math.max(1,Math.min(5,next));updateCamera();
  viewport.scrollLeft=cx*canvas.clientWidth-px;viewport.scrollTop=cy*canvas.clientWidth-py;
}
function nearestPlace(anchor) {
 const x=(anchor?.x ?? (viewport.scrollLeft+viewport.clientWidth/2)/canvas.clientWidth)*1200;
 const y=(anchor?.y ?? (viewport.scrollTop+viewport.clientHeight/2)/canvas.clientWidth)*1200;
 return places.filter(p=>p.x!==null).reduce((best,p)=>Math.hypot(p.x-x,p.y-y)<Math.hypot(best.x-x,best.y-y)?p:best);
}
function enter3D(place = selected || nearestPlace()) {
 if(place?.name==='Moria')return enterMoria(place);
 if(['Hobbiton','Bag End','The Shire','Rivendell','Lothlórien','Caras Galadhon'].includes(place?.name))return enterIllustration(place);
 return enterDestination(place);
}
function enterIllustration(place){
 hideReveal();hideTooltip();
 destinationControl('active',false);$('#destination-view').hidden=true;
 moriaControl('active',false);$('#moria-view').hidden=true;
 if(scene==='world')worldCamera={zoom,left:viewport.scrollLeft,top:viewport.scrollTop};
 if(renderer)renderer.active=false;
 selected=place;scene='art';$('#scene-3d').hidden=true;viewport.hidden=true;$('#illustrated-view').hidden=false;
 $('#world-map').hidden=false;$('#tilt-3d').hidden=true;$('#toggle-labels').hidden=true;$('#enter-city').hidden=true;$('#model-mode').hidden=false;$('#illustrated-mode').hidden=true;
 $('.relief-badge').textContent='◈ 4K ILLUSTRATED ATLAS';
 if(!illustratedAtlas)illustratedAtlas=new IllustratedAtlas($('#illustrated-viewport'),$('#illustrated-canvas'),$('#illustrated-image'),{
  onChange:state=>{
   if(scene!=='art')return;
   const total=illustratedPlaces[selected?.name]?.levels?.length||1;
   $('#scene-caption').textContent=state.title.toUpperCase();$('#zoom-value').textContent=`${Math.round(state.zoom*100)}%`;
   $('#art-next').hidden=total<=1;$('#art-previous').hidden=!state.hasPrevious;
   $('#zoom-in').disabled=state.loading||(!state.hasNext&&state.zoom>=state.maxZoom);$('#zoom-out').disabled=state.loading;
   $('#illustration-status').textContent=state.loading?'Loading 4K illustrated view…':`${state.level+1} / ${total} · ${state.title} · Click picture or "Next picture ↻" to cycle`;
  },onPoint:point=>renderDetails({name:point.title,region:selected.region,description:point.description}),onExit:leave3D,onError:()=>{leave3D();renderDetails({name:selected.name,region:selected.region,description:'The illustrated view could not load. The world map and 3D landscape remain available.'});}
 });
 illustratedAtlas.load(illustratedPlaces[place.name]);renderDetails(place);$('#illustrated-viewport').focus({preventScroll:true});
}
function enterModel3D(place = selected || nearestPlace()) {
 if(place?.name==='Moria')return enterMoria(place);
 return enterDestination(place);
}
function destinationControl(action,value){
 $('#destination-frame')?.contentWindow?.postMessage({type:'destination-control',action,value},window.location.origin);
}
function enterDestination(place){
 if(!place)return;
 hideReveal();hideTooltip();
 if(scene==='world')worldCamera={zoom,left:viewport.scrollLeft,top:viewport.scrollTop};
 moriaControl('active',false);$('#moria-view').hidden=true;
 if(renderer)renderer.active=false;
 illustratedAtlas?.deactivate();selected=place;scene='destination';
 $('#scene-3d').hidden=true;$('#illustrated-view').hidden=true;viewport.hidden=true;$('#destination-view').hidden=false;
 for(const id of ['tilt-3d','toggle-labels','enter-city','art-next','art-previous','model-mode','illustrated-mode'])$('#'+id).hidden=true;
 $('#world-map').hidden=false;$('#zoom-in').disabled=false;$('#zoom-out').disabled=false;
 $('#illustrated-mode').hidden=!illustratedPlaces[place.name];
 $('.relief-badge').textContent='◈ CINEMATIC & 3D';$('#scene-caption').textContent=`${place.region.toUpperCase()} → ${place.name.toUpperCase()}`;$('#zoom-value').textContent='3D';
 const embedded=$('#destination-frame');
 if(!embedded.getAttribute('src'))embedded.src=`destination.html?place=${encodeURIComponent(place.name)}`;
 else{destinationControl('load',place.name);destinationControl('active',true);}
 renderDetails(place);
}
$('#destination-frame').addEventListener('load',()=>{if(scene==='destination')destinationControl('load',selected?.name);destinationControl('active',scene==='destination');});
window.addEventListener('message',event=>{if(event.origin!==window.location.origin||event.source!==$('#destination-frame').contentWindow||event.data?.type!=='destination-selection'||scene!=='destination')return;const place=places.find(p=>p.name===event.data.name);if(!place)return;selected=place;$('#scene-caption').textContent=`${place.region.toUpperCase()} → ${place.name.toUpperCase()}`;$('#illustrated-mode').hidden=!illustratedPlaces[place.name];renderDetails(place);for(const[p,marker]of markers){marker.classList.toggle('selected',p===place);marker.setAttribute('aria-pressed',String(p===place));}});
function moriaControl(action,value){
 const frame=$('#moria-frame');
 frame?.contentWindow?.postMessage({type:'moria-control',action,value},window.location.origin);
}
function enterMoria(place){
 hideReveal();hideTooltip();destinationControl('active',false);$('#destination-view').hidden=true;
 if(scene==='world')worldCamera={zoom,left:viewport.scrollLeft,top:viewport.scrollTop};
 if(renderer)renderer.active=false;
 illustratedAtlas?.deactivate();selected=place;scene='moria';
 $('#scene-3d').hidden=true;$('#illustrated-view').hidden=true;viewport.hidden=true;$('#moria-view').hidden=false;
 for(const id of ['tilt-3d','toggle-labels','enter-city','art-next','art-previous','model-mode','illustrated-mode'])$('#'+id).hidden=true;
 $('#world-map').hidden=false;$('#zoom-in').disabled=false;$('#zoom-out').disabled=false;
 $('.relief-badge').textContent='◈ MORIA · BRIDGE OF KHAZAD-DÛM & HALL OF DURIN';$('#scene-caption').textContent='KHAZAD-DÛM · THE BRIDGE (GANDALF & BALROG) & HALL OF DURIN';$('#zoom-value').textContent='Moria';
 if(!$('#moria-frame').getAttribute('src'))$('#moria-frame').src='moria.html?v=20261103-bridge-and-hall';
 else moriaControl('active',true);
 renderDetails(place);
}
$('#moria-frame').addEventListener('load',()=>moriaControl('active',scene==='moria'));
$('#moria-frame').addEventListener('focus',hideReveal);
for(const button of document.querySelectorAll('[data-moria]'))button.addEventListener('click',()=>{const place=places.find(p=>p.name==='Moria');choose(place,true);enterMoria(place);});
function leave3D(){
 hideReveal();hideTooltip();if(scene==='world')return;
 moriaControl('active',false);$('#moria-view').hidden=true;destinationControl('active',false);$('#destination-view').hidden=true;
 scene='world';illustratedAtlas?.deactivate();$('#illustrated-view').hidden=true;$('#art-next').hidden=true;$('#art-previous').hidden=true;$('#model-mode').hidden=true;$('#illustrated-mode').hidden=true;if(renderer)renderer.active=false;$('#scene-3d').hidden=true;viewport.hidden=false;$('#world-map').hidden=true;$('#tilt-3d').hidden=true;$('#toggle-labels').hidden=false;$('.relief-badge').textContent='◈ RELIEF TERRAIN';$('#enter-city').hidden=false;
 $('#scene-caption').textContent='MIDDLE-EARTH · WORLD RELIEF';zoom=worldCamera?.zoom ?? 1;updateCamera();viewport.scrollLeft=worldCamera?.left ?? 0;viewport.scrollTop=worldCamera?.top ?? 0;if(selected)renderDetails(selected);
}
$('#zoom-in').addEventListener('click',()=>{hideReveal();if(scene==='destination')destinationControl('zoom-in');else if(scene==='moria')moriaControl('zoom-in');else if(scene==='art')illustratedAtlas.zoomBy(1.25);else if(scene==='3d')renderer.zoom(1.2);else setZoom(zoom+.5);});
$('#zoom-out').addEventListener('click',()=>{hideReveal();if(scene==='destination')destinationControl('zoom-out');else if(scene==='moria')moriaControl('zoom-out');else if(scene==='art')illustratedAtlas.zoomBy(1/1.25);else if(scene==='3d'){if(renderer.distance>=400)leave3D();else renderer.zoom(1/1.2);}else setZoom(zoom-.5);});
$('#reset-map').addEventListener('click',()=>{hideReveal();if(scene==='destination'){destinationControl('reset');return;}if(scene==='moria'){moriaControl('reset');return;}if(scene==='art'){illustratedAtlas.reset();return;}if(scene==='3d'){renderer.reset();return;}setZoom(1,null,false);viewport.scrollTo(0,0);});
$('#world-map').addEventListener('click',leave3D);$('#enter-city').addEventListener('click',()=>enter3D());$('#reveal-city').addEventListener('click',()=>enter3D());$('#tilt-3d').addEventListener('click',()=>{hideReveal();renderer?.tilt();});
$('#terrain-3d').addEventListener('wheel',hideReveal,{passive:true});$('#terrain-3d').addEventListener('pointerdown',hideReveal);
// Wheel zoom is anchored under the pointer, preserving both relief and orientation.
viewport.addEventListener('wheel',event=>{
  event.preventDefault();
  const rect=viewport.getBoundingClientRect(),px=event.clientX-rect.left,py=event.clientY-rect.top;
  const normalized=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1);
  const step=Math.max(-.3,Math.min(.3,-normalized*.002));
  if(step===0)return;
  setZoom(zoom*Math.exp(step),{x:(viewport.scrollLeft+px)/canvas.clientWidth,y:(viewport.scrollTop+py)/canvas.clientWidth,px,py});
},{passive:false});
viewport.addEventListener('dblclick',event=>{if(event.target.closest('.map-pin,.city-pin'))return;const rect=viewport.getBoundingClientRect(),px=event.clientX-rect.left,py=event.clientY-rect.top;setZoom(zoom+.5,{x:(viewport.scrollLeft+px)/canvas.clientWidth,y:(viewport.scrollTop+py)/canvas.clientWidth,px,py});});
viewport.addEventListener('keydown',event=>{
  if(event.target!==viewport)return;
  if(['+','=','-'].includes(event.key)){event.preventDefault();setZoom(zoom+(event.key==='-'?-.5:.5));}
});
search.addEventListener('input',renderIndex);filter.addEventListener('change',renderIndex);
document.addEventListener('keydown',event=>{if(event.key==='Escape'){hideTooltip();hideReveal();}});
window.addEventListener('resize',hideTooltip);renderIndex();updateCamera();
const terrainImage = new Image();
terrainImage.onload = () => {
  $('#relief-terrain').style.display='';$('#schematic-landscape').style.display='none';
  for(const place of places){const position=reliefPositions[place.name];if(!position)continue;[place.x,place.y]=position;markers.get(place)?.setAttribute('transform',`translate(${place.x} ${place.y})`);}
  const captions={'ERIADOR':[320,235],'MIRKWOOD':[755,290],'ROHAN':[655,525],'GONDOR':[610,670],'MORDOR':[1020,620],'RHÛN':[1120,425],'HARADWAITH':[985,895],'BAY OF BELFALAS':[390,790]};
  for(const label of document.querySelectorAll('.terrain-label text')){const position=captions[label.textContent];if(!position)continue;label.setAttribute('x',position[0]);label.setAttribute('y',position[1]);if(label.textContent==='MIRKWOOD')label.setAttribute('transform',`rotate(90 ${position[0]} ${position[1]})`);}
  updateRoutes();canvas.classList.add('relief-ready');
};
terrainImage.src='assets/middle-earth-relief.png';

$('#toggle-labels').addEventListener('click',()=>{const visible=$('#toggle-labels').getAttribute('aria-pressed')!=='true';$('#toggle-labels').setAttribute('aria-pressed',String(visible));canvas.classList.toggle('labels-hidden',!visible);});
const fullscreenButton=$('#fullscreen-map');if(!document.fullscreenEnabled)fullscreenButton.hidden=true;
fullscreenButton.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await mapSection.requestFullscreen();}catch{fullscreenButton.hidden=true;}});
document.addEventListener('fullscreenchange',()=>{fullscreenButton.setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Expand map to fullscreen');hideTooltip();});
// Pointer gestures: drag with a mouse or finger, pinch with two fingers to zoom.
const pointers=new Map();let drag=null,pinch=null,suppressClick=false;
viewport.addEventListener('pointerdown',event=>{
  if(event.button!==0 || event.target.closest('.map-pin,.city-pin'))return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});viewport.setPointerCapture(event.pointerId);
  if(pointers.size===1){drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};suppressClick=false;}
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};drag=null;}
  viewport.classList.add('dragging');hideTooltip();event.preventDefault();
});
viewport.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId))return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size===2 && pinch){const [a,b]=[...pointers.values()],rect=viewport.getBoundingClientRect(),px=(a.x+b.x)/2-rect.left,py=(a.y+b.y)/2-rect.top;setZoom(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance),{x:(viewport.scrollLeft+px)/canvas.clientWidth,y:(viewport.scrollTop+py)/canvas.clientWidth,px,py},false);suppressClick=true;}
  else if(drag){viewport.scrollLeft=drag.left-(event.clientX-drag.x);viewport.scrollTop=drag.top-(event.clientY-drag.y);if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>5)suppressClick=true;}
});
function endPointer(event){const wasPinching=Boolean(pinch);pointers.delete(event.pointerId);pinch=null;drag=null;if(pointers.size===1){const point=[...pointers.values()][0];drag={x:point.x,y:point.y,left:viewport.scrollLeft,top:viewport.scrollTop};}if(!pointers.size)viewport.classList.remove('dragging');if(wasPinching && scene==='world' && zoom>=2)enter3D(selected||nearestPlace());}
viewport.addEventListener('pointerup',endPointer);viewport.addEventListener('pointercancel',endPointer);viewport.addEventListener('lostpointercapture',endPointer);
viewport.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}},true);

function updateRoutes(){
 const group=$('#route-lines');group.replaceChildren();
 for(const route of routes){
  const nodes=route.nodes.map(name=>places.find(p=>p.name===name)).filter(Boolean);
  route.x=nodes.reduce((sum,p)=>sum+p.x,0)/nodes.length;route.y=nodes.reduce((sum,p)=>sum+p.y,0)/nodes.length;
  markers.get(route)?.setAttribute('transform',`translate(${route.x} ${route.y})`);
  const path=svgElement('path',{d:nodes.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' '),class:'atlas-route',tabindex:'0',role:'button','aria-label':`${route.name}: schematic route`});
  const title=svgElement('title',{});title.textContent=route.name;path.append(title);
  path.addEventListener('click',()=>choose(route));path.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(route);}});group.append(path);
 }
}
updateRoutes();


$('#model-mode').addEventListener('click',()=>enterModel3D(selected));
$('#illustrated-mode').addEventListener('click',()=>enterIllustration(selected));
$('#art-next').addEventListener('click',()=>illustratedAtlas?.cycle());
$('#art-previous').addEventListener('click',()=>illustratedAtlas?.previous());
for(const button of document.querySelectorAll('[data-illustration]'))button.addEventListener('click',()=>{
 const place=places.find(place=>place.name===button.dataset.illustration);
 if(!place)return;choose(place,true);
 if(['Rivendell','Lothlórien'].includes(place.name))enterIllustration(place);
 else enter3D(place);
});

$('#hobbiton-featured').addEventListener('click',()=>{const place=places.find(p=>p.name==='Hobbiton');choose(place,true);enterIllustration(place);});

$('#bag-end-featured').addEventListener('click',()=>{const place=places.find(p=>p.name==='Bag End');choose(place,true);enterIllustration(place);});
