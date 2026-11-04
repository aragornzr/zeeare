import {battlePose,hallChasePose,FELLOWSHIP_NAMES} from './moria-battle.js';
import { MoriaAudio } from './moria-audio.js?v=20261028';
const $=s=>document.querySelector(s),canvas=$('#cinema'),ctx=canvas.getContext('2d',{alpha:false});
const embedded=window.parent!==window;document.body.classList.toggle('embedded',embedded);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const PICTURE_CYCLE=['bridge','hall','chase','west','east'];
const PORTRAIT_CYCLE=['bridge','hall','chase'];
const descriptions={
 bridge:{
  title:'Flame & shadow',
  kicker:'01 / THE BRIDGE OF KHAZAD-DÛM · GANDALF & THE BALROG',
  description:'One narrow crossing. A wizard. A terror from the deep. Gandalf confronts the towering, upright Balrog of Morgoth on the Bridge of Khazad-dûm.',
  image:'bridge-battle.jpg',
  lore:'Deep within Khazad-dûm, Gandalf confronts Durin’s Bane standing tall upon the narrow, unrailed bridge above the abyss. Click or tap the picture at any time to cycle to the next picture.'
 },
 hall:{
  title:'The Hall of Durin',
  kicker:'02 / DWARROWDELF · ALERT WATCH IN THE DEEP',
  description:'Gandalf holds his blazing staff aloft as the alert Fellowship peers beyond the light into the vast pillared darkness, watching for enemies and searching for a passage.',
  image:'hall-of-durin.jpg',
  lore:'In the colossal colonnaded Hall of Durin (Dwarrowdelf), rays of light radiate from Gandalf’s raised staff onto Aragorn, Boromir, Legolas, Gimli, Frodo, Sam, Merry and Pippin as they stand alert, peering beyond the light for enemies and a way through the deep.'
 },
 chase:{
  title:'Flight from Durin’s Bane',
  kicker:'03 / HALL OF DURIN CHASE · SPRINT ESCAPE FROM THE BALROG',
  description:'Gandalf and his eight companions break into a full, desperate sprint down the colossal pillared hall to escape the fiery Balrog of Morgoth and swarming Goblins of Moria.',
  image:'hall-goblin-chase.jpg',
  lore:'Drums boom in the deep as Gandalf, Aragorn, Boromir, Legolas, Gimli, Frodo, Sam, Merry and Pippin sprint at full speed down the ancient stone causeway, escaping the pursuing Goblins of Moria and the blazing Balrog of Morgoth rising between the colossal columns afar.'
 },
 west:{
  title:'Doors of Durin',
  kicker:'04 / THE WESTERN APPROACH',
  description:'Moonlit stone. Still water. A secret beneath the mountain.',
  image:'west-gate.jpg',
  lore:'The Fellowship entered Moria through these western doors in Hollin. Silver ithildin markings reveal the hidden entrance beside the Watcher’s pool.'
 },
 east:{
  title:'The Great Gates',
  kicker:'05 / THE EASTERN APPROACH',
  description:'A kingdom carved into stone, opening onto Dimrill Dale.',
  image:'east-gate.jpg',
  lore:'The eastern Great Gates were Moria’s monumental main entrance, overlooking Dimrill Dale. These are distinct from the hidden western Doors of Durin.'
 }
};
const images=new Map(),audio=new MoriaAudio();let location='bridge',mode='cinema',active=true,playing=false,time=0,lastTime=0,raf=0,geometry=null,geometryPromise=null,loadVersion=0;
let view={zoom:1,x:0,y:0},recorder=null,chunks=[],recordURL=null,recording=false;
const hover3D={x:0,y:0,tx:0,ty:0};
const sparks=Array.from({length:140},(_,i)=>({x:(Math.sin(i*341.3)*43758.5)%1,y:i/140,speed:.045+(i%7)*.009,size:.65+i%3}));
const HOVER_STONES=Array.from({length:22},(_,i)=>({
 x:.28+((i*37)%100)/100*.38,
 y:.38+((i*53)%100)/100*.37,
 z:.48+(i%6)*.16,
 rx:.0045+(i%5)*.0022,
 ry:.0035+(i%4)*.0018,
 speed:1.35+(i%7)*.24,
 phase:i*1.17,
 rot:(i*47)%360*Math.PI/180,
 rotSpeed:(i%2===0?1:-1)*(.18+(i%5)*.06),
 magma:i%3===0
}));
function isInterior(loc=location){return loc==='hall'||loc==='chase'||loc==='bridge';}
function isHall(loc=location){return loc==='hall'||loc==='chase';}
function loadImage(key){
 if(images.has(key))return images.get(key);
 const promise=new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Could not load the Moria scenery.'));img.src=`assets/moria/${descriptions[key].image}?v=20261104-3dhover`;});images.set(key,promise);return promise;
}
let image=null,chaseImage=null,bridgeImage=null,hallImage=null;
export const battleChapter=t=>t<8?'GANDALF LIGHTS THE HALL OF DURIN':t<16?'SURROUNDED BY THE GOBLINS OF MORIA':t<24?'THE BALROG OF MORGOTH SEEN AFAR':'THE STAND AT KHAZAD-DÛM';
const clock=t=>`00:${String(Math.floor(t)).padStart(2,'0')}`;
function syncPlayback(){
 audio.setPlaying(playing);
 $('#play').textContent=playing?'Ⅱ Pause':time>=32?'↺ Play again':'▶ Play 3D video';
 $('#chapter').textContent=battleChapter(time);$('#time').textContent=`${clock(time)} / 00:32`;$('#timeline').value=time;
}
function fit(){const r=canvas.getBoundingClientRect(),dpr=Math.min(Math.max(devicePixelRatio||1,2),3);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';geometry?.resize();draw(performance.now()/1000);}
new ResizeObserver(fit).observe(canvas.parentElement);
function imageRect(img,w,h,zoom,dx,dy){const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight)*zoom;const iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;return{x:iw<=w?(w-iw)/2:Math.min(0,Math.max(w-iw,(w-iw)/2+dx*w)),y:ih<=h?(h-ih)/2:Math.min(0,Math.max(h-ih,(h-ih)/2+dy*h)),w:iw,h:ih};}
function glow(x,y,r,color,alpha=1){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.globalAlpha=1;}
function drawSwordGlow(ctx2d,x1,y1,x2,y2,w,alpha=1){
 ctx2d.save();
 ctx2d.globalCompositeOperation='screen';
 ctx2d.globalAlpha=alpha;
 ctx2d.lineCap='round';
 ctx2d.strokeStyle='rgba(205,232,255,0.55)';
 ctx2d.shadowColor='#d8eeff';
 ctx2d.shadowBlur=Math.max(10,w*.012);
 ctx2d.lineWidth=Math.max(3,w*.0042);
 ctx2d.beginPath();ctx2d.moveTo(x1,y1);ctx2d.lineTo(x2,y2);ctx2d.stroke();
 ctx2d.strokeStyle='#ffffff';
 ctx2d.shadowColor='#ffffff';
 ctx2d.shadowBlur=Math.max(6,w*.006);
 ctx2d.lineWidth=Math.max(1.5,w*.0018);
 ctx2d.beginPath();ctx2d.moveTo(x1,y1);ctx2d.lineTo(x2,y2);ctx2d.stroke();
 ctx2d.restore();
}
function drawStaffRayOnCompany(ctx2d,sx,sy,px,py,w,h,intensity=1){
 ctx2d.save();
 ctx2d.globalCompositeOperation='screen';
 const dx=px-sx,dy=py-sy,len=Math.hypot(dx,dy)||1;
 const nx=-dy/len,ny=dx/len;
 const spread=w*.24;
 const beamGrad=ctx2d.createLinearGradient(sx,sy,px+dx*.25,py+dy*.25);
 beamGrad.addColorStop(0,`rgba(240,248,255,${.34*intensity})`);
 beamGrad.addColorStop(.38,`rgba(195,228,255,${.18*intensity})`);
 beamGrad.addColorStop(.75,`rgba(145,205,255,${.09*intensity})`);
 beamGrad.addColorStop(1,'rgba(120,185,255,0)');
 ctx2d.fillStyle=beamGrad;
 ctx2d.beginPath();
 ctx2d.moveTo(sx-nx*w*.008,sy-ny*w*.008);
 ctx2d.lineTo(sx+nx*w*.008,sy+ny*w*.008);
 ctx2d.lineTo(px+dx*.22+nx*spread,py+dy*.22+ny*spread);
 ctx2d.lineTo(px+dx*.22-nx*spread,py+dy*.22-ny*spread);
 ctx2d.closePath();
 ctx2d.fill();
 ctx2d.restore();
}
function draw3DHoverReliefPatch(ctx2d,img,rect,cxNorm,cyNorm,rxNorm,ryNorm,dx,dy,scaleBoost,rimColor){
 const cx=rect.x+rect.w*cxNorm,cy=rect.y+rect.h*cyNorm;
 const rx=rect.w*rxNorm,ry=rect.h*ryNorm;
 ctx2d.save();
 ctx2d.translate(cx+dx,cy+dy);
 ctx2d.scale(scaleBoost,scaleBoost);
 ctx2d.translate(-cx,-cy);
 ctx2d.shadowColor='rgba(0,0,0,0.78)';
 ctx2d.shadowBlur=Math.max(18,rect.w*.018);
 ctx2d.shadowOffsetX=-dx*1.35;
 ctx2d.shadowOffsetY=Math.max(8,rect.h*.012)-dy*1.15;
 ctx2d.beginPath();
 ctx2d.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
 ctx2d.clip();
 ctx2d.drawImage(img,rect.x,rect.y,rect.w,rect.h);
 ctx2d.restore();
 ctx2d.save();
 ctx2d.globalCompositeOperation='screen';
 const rim=ctx2d.createRadialGradient(cx+dx,cy+dy,Math.min(rx,ry)*.55,cx+dx,cy+dy,Math.max(rx,ry)*1.04);
 rim.addColorStop(0,'transparent');
 rim.addColorStop(.82,rimColor);
 rim.addColorStop(1,'transparent');
 ctx2d.fillStyle=rim;
 ctx2d.beginPath();
 ctx2d.ellipse(cx+dx,cy+dy,rx*1.04,ry*1.04,0,0,Math.PI*2);
 ctx2d.fill();
 ctx2d.restore();
}
function draw3DBridgeHoverScene(ctx2d,activeImg,rect,w,h,t,now,animate,pose){
 hover3D.x+=(hover3D.tx-hover3D.x)*.12;
 hover3D.y+=(hover3D.ty-hover3D.y)*.12;
 const orbX=hover3D.x+(animate?Math.sin(now*1.05)*.32:0);
 const orbY=hover3D.y+(animate?Math.cos(now*1.35)*.24:0);
 const point=(x,y)=>[rect.x+rect.w*x,rect.y+rect.h*y];

 // 1. 3D Hovering Pop-Out Layer: Standing Balrog (both feet on bridge floor) & overhead fiery whip
 const balrogBob=animate?Math.sin(t*2.1)*h*.0055:0;
 const balrogDx=orbX*w*.014,balrogDy=orbY*h*.010+balrogBob;
 draw3DHoverReliefPatch(ctx2d,activeImg,rect,.735,.365,.235,.335,balrogDx,balrogDy,1.022,'rgba(255,98,18,0.16)');

 // 3D floor-contact shadow & molten reflection directly under BOTH Balrog feet on the stone bridge floor
 const [lfX,lfY]=point(.665,.680),[rfX,rfY]=point(.800,.675);
 ctx2d.save();
 ctx2d.fillStyle='rgba(3,5,8,0.68)';
 ctx2d.beginPath();ctx2d.ellipse(lfX+balrogDx*.4,lfY+h*.008,w*.038,h*.013,0,0,Math.PI*2);ctx2d.fill();
 ctx2d.beginPath();ctx2d.ellipse(rfX+balrogDx*.4,rfY+h*.008,w*.038,h*.013,0,0,Math.PI*2);ctx2d.fill();
 ctx2d.globalCompositeOperation='screen';
 glow(lfX+balrogDx*.5,lfY,h*.048,'#ff5a0c',.22+Math.sin(t*3.4)*.05);
 glow(rfX+balrogDx*.5,rfY,h*.048,'#ff5a0c',.22+Math.cos(t*3.4)*.05);
 ctx2d.restore();

 // 2. 3D Hovering Pop-Out Layer: Gandalf the Grey with blazing staff & white-glowing Glamdring
 const gandalfBob=animate?Math.cos(t*2.35)*h*.005:0;
 const gandalfDx=orbX*w*.019,gandalfDy=orbY*h*.014+gandalfBob;
 draw3DHoverReliefPatch(ctx2d,activeImg,rect,.248,.560,.115,.245,gandalfDx,gandalfDy,1.026,'rgba(205,235,255,0.18)');

 const [bx,by]=[point(.735,.360)[0]+balrogDx,point(.735,.360)[1]+balrogDy];
 const [sx,sy]=[point(.295,.335)[0]+gandalfDx,point(.295,.335)[1]+gandalfDy];
 const [swordHiltX,swordHiltY]=[point(.235,.595)[0]+gandalfDx,point(.235,.595)[1]+gandalfDy];
 const [swordTipX,swordTipY]=[point(.335,.535)[0]+gandalfDx,point(.335,.535)[1]+gandalfDy];
 const [gFootX,gFootY]=[point(.225,.785)[0]+gandalfDx*.6,point(.225,.785)[1]+gandalfDy*.4];

 // 3. 3D Perspective-Tilted Hovering Magical Shockwave Rings (around staff crystal & bridge floor)
 ctx2d.save();
 ctx2d.globalCompositeOperation='screen';
 for(let ring=0;ring<2;ring++){
  const pulse=((t*.65+ring*.5)%1);
  const radX=w*(.045+pulse*.095),radY=radX*.32;
  ctx2d.strokeStyle=`rgba(210,238,255,${(1-pulse)*.42})`;
  ctx2d.lineWidth=Math.max(1.5,w*.0018*(1-pulse*.5));
  ctx2d.beginPath();
  ctx2d.ellipse(sx,sy,radX,radY,-.18+orbX*.08,0,Math.PI*2);
  ctx2d.stroke();
 }
 // Hovering 3D rune-light ellipse on the stone bridge floor around Gandalf
 ctx2d.strokeStyle=`rgba(195,230,255,${.28+Math.sin(t*2.6)*.08})`;
 ctx2d.lineWidth=Math.max(2,w*.002);
 ctx2d.beginPath();
 ctx2d.ellipse(gFootX,gFootY,w*.072,h*.019,-.11,0,Math.PI*2);
 ctx2d.stroke();

 glow(bx,by,h*.34,'#ed590a',.17+Math.sin(t*3)*.035);
 glow(sx,sy,h*.18,'#d8eeff',.22+(playing?Math.pow(Math.max(0,Math.sin(t*.7)),8)*.18:0));
 drawSwordGlow(ctx2d,swordHiltX,swordHiltY,swordTipX,swordTipY,w,.68+Math.sin(t*3.6)*.09+(playing?pose.clash*.35:0));
 ctx2d.restore();

 // 4. 3D Hovering Levitating Bridge Stones & Magma Shards (multi-plane 3D parallax)
 for(const st of HOVER_STONES){
  const bob=animate?Math.sin(t*st.speed+st.phase)*h*.014*st.z:0;
  const driftX=animate?Math.cos(t*(st.speed*.7)+st.phase)*w*.004*st.z:0;
  const px=rect.x+rect.w*st.x+orbX*w*.034*st.z+driftX;
  const py=rect.y+rect.h*st.y+orbY*h*.025*st.z+bob;
  const rw=w*st.rx*st.z,rh=h*st.ry*st.z;
  const ang=st.rot+(animate?t*st.rotSpeed:0);
  ctx2d.save();
  ctx2d.translate(px,py);
  ctx2d.rotate(ang);
  // 3D depth drop shadow beneath each hovering stone
  ctx2d.fillStyle='rgba(0,0,0,0.58)';
  ctx2d.beginPath();
  ctx2d.ellipse(-orbX*6,rh*1.35,rw*.95,rh*.55,0,0,Math.PI*2);
  ctx2d.fill();
  // 3D faceted rock polygon
  ctx2d.beginPath();
  ctx2d.moveTo(-rw,-.35*rh);
  ctx2d.lineTo(-.25*rw,-rh);
  ctx2d.lineTo(.85*rw,-.55*rh);
  ctx2d.lineTo(rw,.3*rh);
  ctx2d.lineTo(.2*rw,rh);
  ctx2d.lineTo(-.75*rw,.65*rh);
  ctx2d.closePath();
  const rockGrad=ctx2d.createLinearGradient(-rw,-rh,rw,rh);
  rockGrad.addColorStop(0,'#b8d8f8'); // Gandalf staff white-blue rim light on left facet
  rockGrad.addColorStop(.45,'#2a3038'); // Dark Moria stone core
  rockGrad.addColorStop(1,st.magma?'#ff6a14':'#8c431e'); // Balrog fiery rim light on right facet
  ctx2d.fillStyle=rockGrad;
  ctx2d.fill();
  ctx2d.lineWidth=Math.max(1,w*.0008*st.z);
  ctx2d.strokeStyle=st.magma?'rgba(255,165,70,0.75)':'rgba(210,235,255,0.65)';
  ctx2d.stroke();
  ctx2d.restore();
 }

 if(animate){
  ctx2d.save();
  ctx2d.globalCompositeOperation='screen';
  for(const s of sparks){
   const progress=(s.y+t*s.speed)%1;
   const depth=.5+(s.size/3.6)*.85;
   const [baseX,baseY]=point(.22+Math.abs(s.x)*.68+Math.sin(t+s.y*12)*.018,.93-progress*.78);
   const x=baseX+orbX*w*.028*depth,y=baseY+orbY*h*.020*depth;
   ctx2d.globalAlpha=Math.sin(progress*Math.PI)*.85;
   ctx2d.fillStyle=s.size>2?'#ffde92':'#e27322';
   ctx2d.beginPath();ctx2d.ellipse(x,y,s.size*depth*w/1350,s.size*depth*h/680,0,0,Math.PI*2);ctx2d.fill();
  }
  for(let i=0;i<8;i++){const [x,y]=point(.64+i*.018,.44-Math.sin(t*1.3+i)*.015);glow(x+balrogDx,y+balrogDy,h*(.07+Math.sin(t*2+i)*.012),'#ff6609',.035);}
  ctx2d.restore();
 }

 // 5. 3D Volumetric Fiery Whip Lash (hovering forward in 3D space)
 const whipPulse=playing?Math.max(.35,pose.attack):.36+Math.sin(t*2.8)*.09;
 if(whipPulse>.02){
  const wx=orbX*w*.022,wy=orbY*h*.016+balrogBob*.8;
  const [w0x,w0y]=[point(.615,.425)[0]+wx,point(.615,.425)[1]+wy];
  const [w1x,w1y]=[point(.445,.505)[0]+wx*1.15,point(.445,.505)[1]+wy*1.15];
  const [w2x,w2y]=[point(.380,.250)[0]+wx*1.25,point(.380,.250)[1]+wy*1.25];
  const [w3x,w3y]=[point(.490,.045)[0]+wx*1.3,point(.490,.045)[1]+wy*1.3];
  const [w4x,w4y]=[point(.730,.060)[0]+wx*1.2,point(.730,.060)[1]+wy*1.2];
  ctx2d.save();ctx2d.globalCompositeOperation='screen';ctx2d.lineCap='round';
  ctx2d.strokeStyle=`rgba(255,155,45,${.42*whipPulse})`;ctx2d.shadowColor='#ff5500';ctx2d.shadowBlur=22;ctx2d.lineWidth=w*.0036;
  ctx2d.beginPath();ctx2d.moveTo(w0x,w0y);ctx2d.bezierCurveTo(w1x,w1y,w2x,w2y,w3x,w3y);ctx2d.quadraticCurveTo(w3x+w*.12,w3y-h*.01,w4x,w4y);ctx2d.stroke();
  ctx2d.strokeStyle=`rgba(255,242,185,${.58*whipPulse})`;ctx2d.lineWidth=w*.0015;ctx2d.stroke();
  ctx2d.restore();
 }
 if(playing){
  ctx2d.save();ctx2d.globalCompositeOperation='screen';
  glow(sx,sy,h*.26,'#dceaff',pose.staff*.5+pose.clash*.35);
  ctx2d.restore();
 }
 if(pose.caption){ctx2d.save();ctx2d.font=`${Math.max(15,Math.round(w*.018))}px Georgia`;ctx2d.textAlign='center';ctx2d.fillStyle='#fff5df';ctx2d.shadowColor='#000';ctx2d.shadowBlur=8;ctx2d.fillText(pose.caption,w/2,h*.76);ctx2d.restore();}
}
function draw(now){
 const w=canvas.width,h=canvas.height;if(!w||!h)return;
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.fillStyle='#070c12';ctx.fillRect(0,0,w,h);if(!image)return;
 const interior=isInterior(),animate=!reduced.matches||playing;
 // When playing the 3D video on hall/chase, show the Goblin encirclement & distant Balrog chase; on bridge when paused, show Gandalf & Balrog on the bridge!
 const showChase=(isHall()&&(playing||time>0.2))||location==='chase';
 const activeImg=(showChase&&chaseImage)?chaseImage:image;
 const isBridge3D=location==='bridge'&&!showChase;
 const cinematic=interior?1+(playing?Math.sin(time/32*Math.PI)*.14:Math.sin(now*.25)*.015)+(isBridge3D?.025:0):1;
 const panX=view.x+(playing?Math.sin(time*.28)*.016:interior?Math.sin(now*.18)*.004:0)-(isBridge3D?hover3D.x*.008:0);
 const panY=view.y+(playing?Math.cos(time*.55)*.006:0)-(isBridge3D?hover3D.y*.006:0);
 const rect=imageRect(activeImg,w,h,view.zoom*cinematic,panX,panY);
 if(interior&&w/h<1.1){const scale=Math.max(w/activeImg.naturalWidth,h/activeImg.naturalHeight);ctx.filter='blur(20px)';ctx.drawImage(activeImg,(w-activeImg.naturalWidth*scale)/2,(h-activeImg.naturalHeight*scale)/2,activeImg.naturalWidth*scale,activeImg.naturalHeight*scale);ctx.filter='none';ctx.fillStyle='#07101bbf';ctx.fillRect(0,0,w,h);}
 ctx.drawImage(activeImg,rect.x,rect.y,rect.w,rect.h);
 if(location==='hall'&&playing&&time<4.2&&chaseImage&&image){
  const fade=Math.max(0,1-time/4.2);
  ctx.save();ctx.globalAlpha=fade;
  const r0=imageRect(image,w,h,view.zoom*cinematic,panX,panY);
  ctx.drawImage(image,r0.x,r0.y,r0.w,r0.h);
  ctx.restore();
 }
 const point=(x,y)=>[rect.x+rect.w*x,rect.y+rect.h*y];
 if(isBridge3D){
  const pose=battlePose(time),t=playing?time:now;
  draw3DBridgeHoverScene(ctx,activeImg,rect,w,h,t,now,animate,pose);
 }else if(interior){
  // Hall of Durin alert watch (.755, .228) & Sprint escape from Balrog (.602, .225), casting rays onto the Company
  const pose=hallChasePose(showChase?time:0),t=playing?time:now;
  const [sx,sy]=point(showChase?.602:.755,showChase?.225:.228);
  const [px,py]=point(showChase?.48:.44,showChase?.65:.63);
  const [bx,by]=point(.500,.315);
  ctx.globalCompositeOperation='screen';
  glow(sx,sy,h*.24,'#e2f3ff',(.26+Math.sin(t*3.2)*.03)*pose.staffLight);
  glow(px,py,w*.26,'#9ed0ff',.13*pose.staffLight);
  drawStaffRayOnCompany(ctx,sx,sy,px,py,w,h,pose.staffLight);
  if(showChase){
   const [shx,shy]=point(.470,.615),[stx,sty]=point(.538,.495);
   drawSwordGlow(ctx,shx,shy,stx,sty,w,.52+Math.sin(t*3.8)*.08);
   glow(bx,by,h*.28,'#ff560a',(.18+Math.sin(t*4.5)*.04)*pose.balrogGlow);
   glow(bx,by-h*.04,h*.14,'#ffbe55',.14*pose.balrogGlow);
   for(let i=0;i<14;i++){
    const side=i%2===0?1:-1,row=Math.floor(i/2)/6;
    const gx=.5+side*(.22+row*.21)+Math.sin(t*2.4+i)*.008;
    const gy=.46+row*.32+Math.cos(t*3.1+i)*.006;
    const [ex,ey]=point(gx,gy);
    glow(ex,ey,h*.035,'#ff7b1c',.09*pose.goblinSurge);
   }
  }
  if(animate){
   for(const s of sparks){
    const progress=(s.y+t*s.speed)%1;
    const [x,y]=point(.12+Math.abs(s.x)*.76+Math.sin(t+s.y*12)*.018,.94-progress*.78);
    ctx.globalAlpha=Math.sin(progress*Math.PI)*(showChase?.82:.45);
    ctx.fillStyle=showChase?(s.size>2?'#ffdf96':'#ea6c1e'):'#cfe6ff';
    ctx.beginPath();ctx.ellipse(x,y,s.size*w/1400,s.size*h/700,0,0,Math.PI*2);ctx.fill();
   }
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  if(playing||showChase){
   const text=pose.caption||pose.phaseCaption;
   if(text){
    ctx.save();ctx.font=`${Math.max(14,Math.round(w*.0165))}px Georgia`;ctx.textAlign='center';ctx.fillStyle='#fff5df';ctx.shadowColor='#000';ctx.shadowBlur=10;ctx.fillText(text,w/2,h*.77);ctx.restore();
   }
  }
 }else if(animate){
  ctx.globalCompositeOperation='screen';for(let i=0;i<5;i++){const drift=Math.sin(now*.08+i)*.07;const [x,y]=point(.15+i*.19+drift,.73+i*.028);glow(x,y,w*.21,location==='west'?'#5a7c98':'#a5b7b6',.025);}ctx.globalCompositeOperation='source-over';
 }
 if(recording){
  const gradient=ctx.createLinearGradient(0,h*.72,0,h);gradient.addColorStop(0,'transparent');gradient.addColorStop(1,'#040a12ed');ctx.fillStyle=gradient;ctx.fillRect(0,h*.72,w,h*.28);
  ctx.textAlign='center';ctx.fillStyle='#e3c79e';ctx.font=`${Math.round(w*.012)}px sans-serif`;ctx.fillText('K H A Z A D - D Û M · H A L L  O F  D U R I N',w/2,h*.86);ctx.fillStyle='#eef0ea';ctx.font=`${Math.round(w*.022)}px Georgia`;ctx.fillText(battleChapter(time),w/2,h*.91);
 }
 if(!interior){const [x,y]=point(location==='west'?.45:.54,location==='west'?.47:.46);$('#gate-hotspot').style.left=`${x/w*100}%`;$('#gate-hotspot').style.top=`${y/h*100}%`;}
}
function loop(ms){raf=0;if(!active)return;const dt=Math.max(0,(ms-lastTime)/1000);lastTime=ms;
 if(playing){time=Math.min(32,time+dt);audio.tick(time,true);syncPlayback();if(time>=32){playing=false;syncPlayback();if(recording)stopRecording();}}
 if(mode==='cinema')draw(ms/1000);else geometry?.render(ms/1000,playing?time:null);
 if(!$('#film-overlay').hidden)drawFilmOverlay(film.currentTime||0);
 raf=requestAnimationFrame(loop);
}
function drawFilmOverlay(t){
 const fc=$('#film-canvas');if(!fc||!chaseImage)return;
 const r=fc.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
 if(fc.width!==w||fc.height!==h){fc.width=w;fc.height=h;}
 const fctx=fc.getContext('2d');
 fctx.fillStyle='#060a10';fctx.fillRect(0,0,w,h);
 const pose=hallChasePose(t);
 const zoom=1.02+Math.sin(t/32*Math.PI)*.14;
 const dx=Math.sin(t*.28)*.016,dy=Math.cos(t*.55)*.006;
 // Show Hall of Durin Goblin encirclement & distant Balrog for 0-21s, and the Bridge of Khazad-dûm standoff for 21-32s!
 const useBridge=t>=21.5&&bridgeImage;
 const baseImg=useBridge?bridgeImage:chaseImage;
 const rect=imageRect(baseImg,w,h,zoom,dx,dy);
 fctx.drawImage(baseImg,rect.x,rect.y,rect.w,rect.h);
 if(t<3.2&&hallImage){
  fctx.save();fctx.globalAlpha=Math.max(0,1-t/3.2);
  const r0=imageRect(hallImage,w,h,zoom,dx,dy);
  fctx.drawImage(hallImage,r0.x,r0.y,r0.w,r0.h);
  fctx.restore();
 }else if(t>=20.5&&t<22.5&&bridgeImage){
  fctx.save();fctx.globalAlpha=Math.min(1,(t-20.5)/2);
  const rb=imageRect(bridgeImage,w,h,zoom,dx,dy);
  fctx.drawImage(bridgeImage,rb.x,rb.y,rb.w,rb.h);
  fctx.restore();
 }
 const pt=(x,y)=>[rect.x+rect.w*x,rect.y+rect.h*y];
 const inHallIntro=t<3.2&&hallImage;
 const [sx,sy]=pt(useBridge?.295:inHallIntro?.755:.602,useBridge?.335:inHallIntro?.228:.225);
 const [bx,by]=pt(useBridge?.735:.500,useBridge?.360:.315);
 const [px,py]=pt(inHallIntro?.44:.48,inHallIntro?.63:.65);
 fctx.save();fctx.globalCompositeOperation='screen';
 const sg=fctx.createRadialGradient(sx,sy,0,sx,sy,h*.24);
 sg.addColorStop(0,`rgba(218,240,255,${.28*pose.staffLight})`);sg.addColorStop(1,'transparent');
 fctx.fillStyle=sg;fctx.fillRect(sx-h*.24,sy-h*.24,h*.48,h*.48);
 if(!useBridge){
  drawStaffRayOnCompany(fctx,sx,sy,px,py,w,h,pose.staffLight);
 }else{
  const [shx,shy]=pt(.235,.595),[stx,sty]=pt(.335,.535);
  drawSwordGlow(fctx,shx,shy,stx,sty,w,.62);
 }
 const bg=fctx.createRadialGradient(bx,by,0,bx,by,h*.32);
 bg.addColorStop(0,`rgba(255,86,10,${.24*pose.balrogGlow})`);bg.addColorStop(1,'transparent');
 fctx.fillStyle=bg;fctx.fillRect(bx-h*.32,by-h*.32,h*.64,h*.64);
 fctx.restore();
 const caption=pose.caption||pose.phaseCaption;
 if(caption){
  fctx.save();fctx.font=`${Math.max(14,Math.round(w*.018))}px Georgia`;fctx.textAlign='center';
  fctx.fillStyle='#fff5df';fctx.shadowColor='#000';fctx.shadowBlur=10;
  fctx.fillText(caption,w/2,h*.88);fctx.restore();
 }
}
function startLoop(){if(active&&!raf){lastTime=performance.now();raf=requestAnimationFrame(loop);}}
function syncPortraitHighlight(activePic=location){
 for(const fig of document.querySelectorAll('.portrait-gallery figure')){
  fig.classList.toggle('active-pic',fig.dataset.pic===activePic);
 }
}
async function setLocation(next,opts={}){
 if(!descriptions[next]||recording)return;
 const player=$('#battle-film');player.pause();$('#film-overlay').hidden=true;
 if(!opts.keepPortraitOpen)$('#portrait-overlay').hidden=true;
 const version=++loadVersion;location=next;document.body.dataset.location=next;playing=false;time=0;view={zoom:1,x:0,y:0};audio.setLocation(isInterior(next)?'bridge':next);syncPlayback();syncPortraitHighlight(next);
 const d=descriptions[next];$('#location-title').textContent=d.title;$('#location-kicker').textContent=d.kicker;$('#location-description').textContent=d.description;$('#lore').textContent=d.lore;
 const interior=isInterior(next);
 $('#battle-controls').hidden=!interior;$('#gate-hotspot').hidden=interior||mode==='geometry';$('#gate-hotspot strong').textContent=d.title;
 for(const button of document.querySelectorAll('[data-location]'))button.setAttribute('aria-pressed',String(button.dataset.location===next));
 $('#loading').hidden=false;$('#loading').textContent='Entering Khazad-dûm…';
 try{
  const [loaded,loadedChase,loadedBridge,loadedHall]=await Promise.all([
   loadImage(next),
   interior?loadImage('chase'):Promise.resolve(null),
   interior?loadImage('bridge'):Promise.resolve(null),
   interior?loadImage('hall'):Promise.resolve(null)
  ]);
  if(version!==loadVersion)return;
  image=loaded;if(loadedChase)chaseImage=loadedChase;if(loadedBridge)bridgeImage=loadedBridge;if(loadedHall)hallImage=loadedHall;
  if(mode==='geometry')await geometry?.load(next);
  $('#loading').hidden=true;draw(performance.now()/1000);
 }
 catch(error){if(version!==loadVersion)return;$('#loading').textContent=`${error.message} Select another location to retry.`;images.delete(next);}
}
function cyclePicture(step=1){
 if(recording)return;
 const current=(location==='hall'&&(playing||time>0.2))?'chase':location;
 const idx=PICTURE_CYCLE.indexOf(current);
 const next=PICTURE_CYCLE[(idx+step+PICTURE_CYCLE.length)%PICTURE_CYCLE.length];
 setLocation(next);
}
async function setMode(next){
 if(recording)return;
 if(next==='geometry'){
  $('#loading').hidden=false;$('#loading').textContent='Building the stone halls of Moria…';
  try{if(!geometryPromise)geometryPromise=import('./moria-3d.js?v=20261103-bridge-and-hall').then(({MoriaLandscape})=>new MoriaLandscape($('#landscape'),()=>setLocation('bridge')));
   geometry=await geometryPromise;await geometry.load(location);
  }catch(error){console.error(error);geometryPromise=null;$('#record-status').textContent='3D is unavailable on this device. The cinematic journey remains available.';$('#loading').hidden=true;return;}
 }
 mode=next;$('#landscape').hidden=mode!=='geometry';canvas.hidden=mode!=='cinema';$('#loading').hidden=true;
 $('#cinematic-mode').setAttribute('aria-pressed',String(mode==='cinema'));$('#geometry-mode').setAttribute('aria-pressed',String(mode==='geometry'));$('#gate-hotspot').hidden=isInterior()||mode==='geometry';
 $('#gesture-hint').textContent=mode==='geometry'?'DRAG TO ORBIT · SCROLL / PINCH TO ZOOM · BRIDGE OF KHAZAD-DÛM & HALL OF DURIN':'CLICK / TAP PICTURE FOR NEXT IN CYCLE · DRAG TO LOOK · SCROLL / PINCH TO ZOOM';
 geometry?.resize();fit();
}
function zoomBy(factor){if(mode==='geometry'){geometry?.zoom(factor);return;}view.zoom=Math.max(1,Math.min(6,view.zoom*factor));}
function reset(){view={zoom:1,x:0,y:0};geometry?.reset();}
for(const button of document.querySelectorAll('[data-location]'))button.addEventListener('click',()=>setLocation(button.dataset.location));
$('#gate-hotspot').addEventListener('click',()=>setLocation('bridge'));
$('#view-bridge-pic')?.addEventListener('click',()=>{setMode('cinema');setLocation('bridge');});
$('#view-hall-pic')?.addEventListener('click',()=>{setMode('cinema');setLocation('hall');});
$('#view-chase-pic')?.addEventListener('click',()=>{setMode('cinema');setLocation('chase');});
$('#next-pic')?.addEventListener('click',()=>{setMode('cinema');cyclePicture(1);});
$('#cinematic-mode').addEventListener('click',()=>setMode('cinema'));$('#geometry-mode').addEventListener('click',()=>setMode('geometry'));
$('#zoom-in').addEventListener('click',()=>zoomBy(1.2));$('#zoom-out').addEventListener('click',()=>zoomBy(1/1.2));$('#reset').addEventListener('click',reset);
$('#play').addEventListener('click',()=>{if(time>=32){time=0;audio.seek(0);}playing=!playing;if(playing)lastTime=performance.now();syncPlayback();});
$('#replay').addEventListener('click',()=>{if(recording)return;time=0;audio.seek(0);lastTime=performance.now();playing=true;syncPlayback();});
$('#timeline').addEventListener('input',event=>{if(recording)return;time=Number(event.target.value);audio.seek(time);syncPlayback();});
async function enableSound(enabled){$('#sound').disabled=true;if(enabled)$('#sound').textContent='Loading sound…';try{await audio.setEnabled(enabled);audio.setLocation(isInterior()?'bridge':location);$('#sound').textContent=enabled?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',String(enabled));}catch(error){$('#record-status').textContent=error.message;}finally{$('#sound').disabled=false;}}
$('#sound').addEventListener('click',()=>enableSound(!audio.enabled));$('#volume').addEventListener('input',event=>audio.setVolume(Number(event.target.value)));
const pointers=new Map();let drag=null,pinch=0;
function update3DTilt(e){
 if(mode!=='cinema'||reduced.matches)return;
 const r=canvas.getBoundingClientRect();
 if(!r.width||!r.height)return;
 const nx=((e.clientX-r.left)/r.width-.5)*2;
 const ny=((e.clientY-r.top)/r.height-.5)*2;
 hover3D.tx=Math.max(-1,Math.min(1,nx));
 hover3D.ty=Math.max(-1,Math.min(1,ny));
 if(location==='bridge'){
  canvas.style.transform=`perspective(1400px) rotateX(${(-hover3D.ty*3.2).toFixed(2)}deg) rotateY(${(hover3D.tx*4.2).toFixed(2)}deg) scale3d(1.016,1.016,1.016)`;
 }else{
  canvas.style.transform='';
 }
}
canvas.addEventListener('pointerleave',()=>{hover3D.tx=0;hover3D.ty=0;canvas.style.transform='';});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y,moved:false,multi:pointers.size>1};if(pointers.size===2){const [a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);if(drag)drag.multi=true;}});
canvas.addEventListener('pointermove',e=>{update3DTilt(e);if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)zoomBy(distance/pinch);pinch=distance;if(drag)drag.multi=true;}else if(drag){const dist=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);if(dist>7)drag.moved=true;if(drag.moved){const rect=canvas.getBoundingClientRect();view.x=drag.vx+(e.clientX-drag.x)/rect.width;view.y=drag.vy+(e.clientY-drag.y)/rect.height;}}});
canvas.addEventListener('pointerup',e=>{const wasClick=drag&&!drag.moved&&!drag.multi&&pointers.size===1;pointers.delete(e.pointerId);drag=null;pinch=0;if(wasClick)cyclePicture(1);});
for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{pointers.delete(e.pointerId);drag=null;pinch=0;});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoomBy(Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*.002));},{passive:false});
canvas.addEventListener('keydown',e=>{if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='-'||e.key==='+'||e.key==='=')zoomBy(e.key==='-'?1/1.2:1.2);else{view.zoom=Math.max(1.15,view.zoom);view[e.key==='ArrowLeft'||e.key==='ArrowRight'?'x':'y']+=(e.key==='ArrowLeft'||e.key==='ArrowUp'?1:-1)*.04;}}});
$('#expand').hidden=!document.fullscreenEnabled;$('#expand').addEventListener('click',()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen());
function stopRecording(){if(recorder?.state==='recording')recorder.stop();}
async function recordBattle(){
 if(recording){stopRecording();return;}
 const targetCanvas=mode==='geometry'?$('#landscape'):canvas;
 if(!targetCanvas.captureStream||!window.MediaRecorder){$('#record-status').textContent='Video saving is unavailable in this browser. Play the scene here with sound.';return;}
 await enableSound(true);
 if(!audio.capture){$('#record-status').textContent='Audio recording could not start. Try a browser with Web Audio support.';return;}
 time=0;audio.seek(0);const stream=targetCanvas.captureStream(30);for(const track of audio.capture.stream.getAudioTracks())stream.addTrack(track);
 const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
 try{recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:12000000}:{});}catch{stream.getVideoTracks().forEach(track=>track.stop());$('#record-status').textContent='This browser could not start video recording.';return;}
 chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 recorder.onstop=()=>{const blob=new Blob(chunks,{type:recorder.mimeType});if(recordURL)URL.revokeObjectURL(recordURL);recordURL=URL.createObjectURL(blob);const a=document.createElement('a');a.href=recordURL;a.download=`moria-khazad-dum.${recorder.mimeType.includes('mp4')?'mp4':'webm'}`;a.click();recording=false;$('#record').textContent='Record view';$('#record-status').textContent='Your animated Moria video with sound has been saved.';stream.getVideoTracks().forEach(track=>track.stop());setRecordingUI(false);};
 recorder.onerror=()=>{$('#record-status').textContent='Recording failed. Please try again.';stopRecording();};
 recording=true;playing=true;lastTime=performance.now();recorder.start(1000);$('#record').textContent='■ Finish & save';$('#record-status').textContent='Recording 32 seconds with sound. Keep this tab visible; the video downloads when finished.';setRecordingUI(true);syncPlayback();
}
function setRecordingUI(value){for(const el of document.querySelectorAll('[data-location],#cinematic-mode,#geometry-mode,#timeline,#replay,#play,#watch-film,#view-portrait,#view-bridge-pic,#view-hall-pic,#view-chase-pic,#next-pic'))el.disabled=value;}
$('#record').addEventListener('click',recordBattle);
const film=$('#battle-film');
function closeFilm(){film.pause();$('#film-overlay').hidden=true;$('#watch-film').focus();}
$('#watch-film').addEventListener('click',async()=>{playing=false;syncPlayback();await audio.setEnabled(false);$('#sound').textContent='Sound off';$('#sound').setAttribute('aria-pressed','false');$('#film-overlay').hidden=false;film.volume=Number($('#volume').value);try{await film.play();}catch{$('#record-status').textContent='Press Play in the video player to start the clip.';}$('#close-film').focus();});
$('#close-film').addEventListener('click',closeFilm);
function closePortrait(){$('#portrait-overlay').hidden=true;$('#view-portrait')?.focus();}
$('#view-portrait')?.addEventListener('click',()=>{
 playing=false;syncPlayback();syncPortraitHighlight(location);
 $('#portrait-overlay').hidden=false;$('#close-portrait').focus();
});
for(const fig of document.querySelectorAll('.portrait-gallery figure')){
 fig.addEventListener('click',()=>{
  const currentPic=PORTRAIT_CYCLE.includes(location)?location:(fig.dataset.pic||'bridge');
  const nextPic=PORTRAIT_CYCLE[(PORTRAIT_CYCLE.indexOf(currentPic)+1)%PORTRAIT_CYCLE.length];
  setMode('cinema');
  setLocation(nextPic,{keepPortraitOpen:false});
 });
}
$('#close-portrait')?.addEventListener('click',closePortrait);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#film-overlay').hidden)closeFilm();if(!$('#portrait-overlay').hidden)closePortrait();}});
film.addEventListener('error',()=>{$('#record-status').textContent='The saved clip could not play here. Use Play 3D video or download the video.';closeFilm();});
function setActive(next){active=next;if(!active){film.pause();if(raf)cancelAnimationFrame(raf);raf=0;playing=false;syncPlayback();if(recording)stopRecording();audio.suspend();}else{if(audio.enabled)audio.initialize().catch(()=>{});startLoop();}}
document.addEventListener('visibilitychange',()=>setActive(!document.hidden));
window.addEventListener('message',event=>{if(event.origin!==window.location.origin||event.source!==window.parent||event.data?.type!=='moria-control')return;const {action}=event.data;if(action==='active')setActive(Boolean(event.data.value)&&!document.hidden);if(action==='zoom-in')zoomBy(1.2);if(action==='zoom-out')zoomBy(1/1.2);if(action==='reset')reset();});
window.addEventListener('pagehide',()=>{setActive(false);if(recordURL)URL.revokeObjectURL(recordURL);geometry?.dispose();});
window.moriaDiagnostics=()=>({
 location,
 mode,
 playing,
 time,
 fellowshipNames:FELLOWSHIP_NAMES,
 fellowshipCount:geometry?.hallScene?.metadata.fellowshipCount||FELLOWSHIP_NAMES.length,
 goblinCount:geometry?.hallScene?.metadata.goblinCount||40,
 balrogDistance:geometry?.hallScene?.metadata.balrogDistance||64
});
const initial=new URLSearchParams(window.location.search).get('location');setLocation(descriptions[initial]?initial:'bridge');startLoop();
