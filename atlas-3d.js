import { terrainVertexShader, terrainFragmentShader } from './atlas-materials.js?v=reference-atlas-20261027';
// Dependency-free WebGL relief renderer. Every scene is an illustrative interpretation.
const seedOf = text => [...text].reduce((s,c)=>(Math.imul(s,31)+c.charCodeAt(0))>>>0,17);
const randomOf = seed => () => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const colors={grass:[.24,.39,.22],stone:[.73,.72,.61],dark:[.19,.21,.23],roof:[.29,.33,.34],gold:[.7,.51,.26],sand:[.65,.49,.29],snow:[.84,.88,.88],water:[.12,.36,.43],wood:[.31,.23,.14],leaf:[.15,.31,.15]};
export function sceneKind(place){
 const n=place.name.toLowerCase(),r=place.region;
 if(place.path)return 'road';
 if(/fornost|annúminas|osgiliath|barrow|weathertop/i.test(n))return 'ruins';
 if(['Lamedon','Morthond','Lebennin','Belfalas','Anfalas','Ithilien','Henneth Annûn','Pelennor Fields','Eregion','Nurn','Dorwinion','Enedwaith','Dunland'].includes(place.name))return 'valley';
 if(['Eriador','Arnor','Arthedain','Cardolan','Rhudaur','Enedwaith','Dunland','Rhovanion','The Wold','Westfold','Hithlum','Dor-lómin','Haradwaith'].includes(place.name))return 'landscape';
 if(/bag end|hobbiton|shire|buckland/.test(n))return 'hobbit';
 if(/rivendell|lothlórien|caras galadhon|woodland realm|doriath|gondolin|lindon|grey havens/.test(n))return 'elven';
 if(/angband|thangorodrim|mordor|barad|gorgoroth|morgul|dol guldur|udûn|black gate|carn dûm|angmar|cirith ungol/.test(n))return 'dark';
 if(/mount doom/.test(n))return 'volcano';
 if(/moria|erebor|iron hills|gundabad|nargothrond|goblin-town/.test(n))return 'dwarf';
 if(/forest|fangorn|mirkwood|rhosgobel|beorn|ossiriand/.test(n))return 'forest';
 if(/sea|lake|bay|belegaer/.test(n))return 'water';
 if(/anduin|rauros|gladden|marsh|sirion/.test(n))return 'river';
 if(/mountain|caradhras|high pass|emyn|dunharrow|weat[h]?ertop|amon hen|argona/.test(n))return 'mountain';
 if(/forodwaith|forochel|withered/.test(n))return 'snow';
 if(/harad|rhûn|khand|dorwinion|umbar/.test(n))return 'desert';
 if(r==='Rohan')return 'rohan';
 return 'city';
}
const identity4=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
const normalize=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function lookAt(eye,target){const z=normalize(eye.map((v,i)=>v-target[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x),m=identity4();for(let i=0;i<3;i++){m[i*4]=x[i];m[i*4+1]=y[i];m[i*4+2]=z[i];}m[12]=-x.reduce((s,v,i)=>s+v*eye[i],0);m[13]=-y.reduce((s,v,i)=>s+v*eye[i],0);m[14]=-z.reduce((s,v,i)=>s+v*eye[i],0);return m;}
function perspective(aspect){const f=1/Math.tan(Math.PI/7),near=.5,far=1500,m=new Float32Array(16);m[0]=f/aspect;m[5]=f;m[10]=(far+near)/(near-far);m[11]=-1;m[14]=2*far*near/(near-far);return m;}
export function terrainCamera(target,distance,yaw,pitch,heightAt){
 const t=[target[0],Math.max(.2,heightAt(target[0],target[2]))+6,target[2]];
 const eye=[t[0]+Math.sin(yaw)*Math.cos(pitch)*distance,t[1]+Math.sin(pitch)*distance,t[2]+Math.cos(yaw)*Math.cos(pitch)*distance];
 for(let i=1;i<=12;i++){
  const f=i/12,x=t[0]+(eye[0]-t[0])*f,z=t[2]+(eye[2]-t[2])*f;
  const ground=Math.max(.2,heightAt(x,z))+2;
  eye[1]=Math.max(eye[1],(ground-t[1]*(1-f))/f);
 }
 return {target:t,eye};
}
function buildScene(place){
 const kind=sceneKind(place),rand=randomOf(seedOf(place.name)),data=[],roads=[],lots=[];let buildings=0,trees=0,rotation=null;
 const dark=['dark','volcano'].includes(kind),dry=kind==='desert',snow=kind==='snow',whiteCity=kind==='city'&&/gondor|minas tirith/i.test(place.name);
 const base=dark?[.23,.22,.2]:dry?colors.sand:snow?colors.snow:colors.grass;
 const hash=(x,z)=>{const v=Math.sin(x*127.1+z*311.7+seedOf(place.name)*.001)*43758.5453;return v-Math.floor(v);};
 const noise=(x,z)=>{const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v;};
 const fbm=(x,z)=>noise(x,z)*.55+noise(x*2.03,z*2.03)*.27+noise(x*4.11,z*4.11)*.13+noise(x*8.1,z*8.1)*.05;
 const alpine=kind==='valley'||kind==='mountain'||kind==='dwarf'||kind==='snow';
 const hasRiver=['river','elven','valley'].includes(kind);
 const riverX=z=>Math.sin(z*.018)*15+Math.sin(z*.05)*2;
 const height=(x,z)=>{
  const detail=fbm(x*.045,z*.045)*5;
  if(kind==='water')return -6+fbm(x*.02,z*.02)*3;
  if(kind==='volcano')return Math.max(0,65-Math.hypot(x,z)*.8)+detail;
  if(whiteCity)return Math.floor(Math.max(0,42-Math.hypot(x,z+15)*.53)/5)*5+Math.max(0,-z-110)*.3;
  let value=fbm(x*.012,z*.012)*12+detail-6;
  if(alpine){const valley=Math.min(1.8,Math.abs(x-riverX(z))/130);value+=Math.pow(valley,1.7)*42+fbm(x*.026,z*.026)*18*Math.min(1,valley);}
  if(kind==='dark')value+=fbm(x*.04,z*.04)*12;
  if(kind==='desert')value+=Math.sin(x*.025+Math.sin(z*.018))*6+fbm(x*.04,z*.04)*4;
  if(hasRiver){const distance=Math.abs(x-riverX(z));value=value*(Math.min(1,distance/22))-Math.max(0,1-distance/10)*5;}
  return value;
 };
 const materialFor=c=>c===colors.water?5:c===colors.wood?4:c===colors.roof||c===colors.gold?2:c[1]>c[0]*1.08&&c[1]>c[2]*1.1?3:1;
 function tri(a,b,c,color,material=materialFor(color)){if(rotation){const rotate=p=>{const dx=p[0]-rotation.x,dz=p[2]-rotation.z;return[rotation.x+dx*rotation.c-dz*rotation.s,p[1],rotation.z+dx*rotation.s+dz*rotation.c];};a=rotate(a);b=rotate(b);c=rotate(c);}const n=normalize(cross(b.map((v,i)=>v-a[i]),c.map((v,i)=>v-a[i])));for(const v of[a,b,c])data.push(...v,...n,...color,material);}
 function quad(a,b,c,d,color,material=materialFor(color)){tri(a,b,c,color,material);tri(a,c,d,color,material);}
 function box(x,y,z,w,h,d,color){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2];const up=p=>[p[0],p[1]+h,p[2]];const face=(a,b,c,d,color)=>quad(d,c,b,a,color);face(a,e,c,b,color);face(up(a),up(b),up(c),up(e),color);face(a,b,up(b),up(a),color);face(b,c,up(c),up(b),color);face(c,e,up(e),up(c),color);face(e,a,up(a),up(e),color);}
 function cone(x,y,z,r,h,color,segments=9,top=0){const side=(a,b,c,d,color)=>quad(d,c,b,a,color);const cap=(a,b,c,color)=>tri(c,b,a,color);for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;side([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],[x+Math.cos(b)*top,y+h,z+Math.sin(b)*top],[x+Math.cos(a)*top,y+h,z+Math.sin(a)*top],color);cap([x,y+h,z],[x+Math.cos(a)*top,y+h,z+Math.sin(a)*top],[x+Math.cos(b)*top,y+h,z+Math.sin(b)*top],color);}}
 function road(points,width=2,color=[.57,.52,.4]){roads.push(points);for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1,nx=dz/len*width/2,nz=-dx/len*width/2;quad([a[0]-nx,height(...a)+.25,a[1]-nz],[b[0]-nx,height(...b)+.25,b[1]-nz],[b[0]+nx,height(...b)+.25,b[1]+nz],[a[0]+nx,height(...a)+.25,a[1]+nz],color);if(width>=2){const steps=Math.max(1,Math.floor(len/1.1));for(let t=0;t<steps;t++){const f=t/steps,x=a[0]+dx*f,z=a[1]+dz*f;for(let lane=-1;lane<=1;lane++){const sx=x+nx*lane*.5,sz=z+nz*lane*.5;box(sx,height(sx,sz)+.3,sz,.48,.06,.66,[.53+rand()*.08,.51+rand()*.07,.44+rand()*.06]);}}}}}
 function house(x,z,scale=1,palette=colors.stone,angle=0){const w=(4+rand()*3)*scale,d=(5+rand()*4)*scale,h=(3.5+rand()*3.5)*scale;if(lots.some(l=>Math.abs(l.x-x)<(l.w+w)/2+.8&&Math.abs(l.z-z)<(l.d+d)/2+.8))return;const levels=[height(x-w/2,z-d/2),height(x+w/2,z-d/2),height(x+w/2,z+d/2),height(x-w/2,z+d/2)],y=Math.max(...levels),low=Math.min(...levels);if(y-low>3)return;lots.push({x,z,w,d});rotation={x,z,c:Math.cos(angle),s:Math.sin(angle)};box(x,low,z,w+.25,y-low+.25,d+.25,palette);box(x,y,z,w,h,d,palette);const roof=kind==='rohan'?colors.gold:dark?colors.dark:colors.roof;
  const a=[x-w*.6,y+h,z-d*.6],b=[x+w*.6,y+h,z-d*.6],c=[x+w*.6,y+h,z+d*.6],e=[x-w*.6,y+h,z+d*.6],p=[x,y+h+w*.5,z-d*.6],q=[x,y+h+w*.5,z+d*.6];tri(a,p,b,roof);tri(e,c,q,roof);quad(a,e,q,p,roof);quad(p,q,c,b,roof);
  box(x,y,z+d*.501,w*.2,h*.42,.07,colors.wood);for(let j=1;j<4;j++)for(const side of[-1,1])box(x+side*w*.26,y+h*(j/4),z+d*.51,.32,.6,.09,[.77,.61,.31]);
  for(const side of[-1,1]){box(x+side*w*.47,y,z,.13,h,.2,colors.wood);box(x+side*w*.26,y+h*.51,z+d*.53,.55,.12,.18,colors.stone);}box(x,y-.35,z,w+.25,.35,d+.25,palette);box(x,y+h+w*.5,z,.15,.15,d*1.2,roof);if(rand()>.65)box(x+w*.2,y+h,z,.4,2,.5,colors.stone);buildings++;rotation=null;
 }
 function ellipsoid(x,y,z,rx,ry,rz,color){
  const lat=6,lon=10;
  const point=(a,b)=>{const t=a/lat*Math.PI,f=b/lon*Math.PI*2;return[x+Math.sin(t)*Math.cos(f)*rx,y+Math.cos(t)*ry,z+Math.sin(t)*Math.sin(f)*rz];};
  const normal=p=>normalize([(p[0]-x)/(rx*rx),(p[1]-y)/(ry*ry),(p[2]-z)/(rz*rz)]);
  for(let a=0;a<lat;a++)for(let b=0;b<lon;b++){const v=[point(a,b),point(a+1,b),point(a+1,b+1),point(a,b+1)];for(const index of[0,1,2,0,2,3])data.push(...v[index],...normal(v[index]),...color,3);}
 }
 function tree(x,z,scale=1,golden=false){const y=height(x,z);cone(x,y,z,.35*scale,5*scale,colors.wood,7,.13*scale);const c=golden?[.49+rand()*.12,.43,.14]:[.13+rand()*.06,.24+rand()*.08,.11];
  if(alpine&&rand()>.4){for(let j=0;j<4;j++)cone(x,y+(2+j*1.2)*scale,z,(2.4-j*.45)*scale,3.5*scale,c,12);}
  else{ellipsoid(x,y+5.3*scale,z,2.6*scale,3.1*scale,2.4*scale,c);ellipsoid(x+1.2*scale,y+4.5*scale,z+1.1*scale,2*scale,2.2*scale,2*scale,c);}
  trees++;
 }
 const terrainCache=new Map();
 function terrainCell(x,z,step){
  const vertices=[[x,height(x,z),z],[x,height(x,z+step),z+step],[x+step,height(x+step,z+step),z+step],[x+step,height(x+step,z),z]];
  for(const index of[0,1,2,0,2,3]){const p=vertices[index],key=`${p[0]}:${p[2]}`;const cached=terrainCache.get(key);if(cached){data.push(...cached);continue;}const n=normalize([height(p[0]-.25,p[2])-height(p[0]+.25,p[2]),.5,height(p[0],p[2]-.25)-height(p[0],p[2]+.25)]);const rock=Math.min(1,Math.max(0,(p[1]-23)/50));let color=base.map((v,i)=>v*(1-rock)+[.4,.39,.35][i]*rock);if(alpine&&p[1]>60){const snow=Math.min(.85,(p[1]-60)/35);color=color.map((v,i)=>v*(1-snow)+colors.snow[i]*snow);}const paving=whiteCity&&Math.hypot(p[0],p[2]+15)<76;if(paving)color=[.64,.62,.55];const record=[...p,...n,...color,paving?1:0];terrainCache.set(key,record);data.push(...record);}
 }
 for(let x=-112;x<112;x+=2)for(let z=-112;z<112;z+=2)terrainCell(x,z,2);
 for(let x=-480;x<480;x+=8)for(let z=-480;z<480;z+=8){if(x>=-112&&x<112&&z>=-112&&z<112)continue;if(hasRiver&&Math.abs(x+4-riverX(z+4))<24){for(let dx=0;dx<8;dx+=4)for(let dz=0;dz<8;dz+=4)terrainCell(x+dx,z+dz,4);}else terrainCell(x,z,8);}
 if(kind==='water'||hasRiver){
  if(kind==='water')quad([-480,.2,-480],[-480,.2,480],[480,.2,480],[480,.2,-480],colors.water);
  else for(let z=-480;z<480;z+=3){const a=riverX(z),b=riverX(z+3);quad([a-6,.25,z],[b-6,.25,z+3],[b+6,.25,z+3],[a+6,.25,z],colors.water);}
 }
 road(Array.from({length:60},(_,i)=>{const z=-105+i*3.6;return[hasRiver?riverX(z)+20:Math.sin(z*.035)*12,z];}),4);
 if(['city','dark','rohan','desert','hobbit'].includes(kind))for(let j=0;j<7;j++){const z=-70+j*23;road(Array.from({length:35},(_,i)=>[-78+i*4.5,z+Math.sin(i*.35)*3]),1.6);}
 if(kind==='valley'){for(const z of[-40,35]){const x=riverX(z),y=Math.max(2,height(x-12,z),height(x+12,z))+1;box(x,y,z,30,1,5,colors.stone);for(const side of[-1,1])for(let k=-14;k<15;k+=2)box(x+k,y+1,z+side*2.4,.4,1.3,.4,colors.stone);}}
 if(kind==='landscape'||kind==='valley'){for(let i=0;i<(kind==='valley'?75:25);i++){const x=20+rand()*65,z=(rand()-.5)*150;house(x,z,.7+rand()*.4);}for(let i=0;i<220;i++)tree((rand()-.5)*200,(rand()-.5)*200,.6+rand());for(let i=0;i<18;i++){const x=20+i%6*10,z=-60+Math.floor(i/6)*25;for(let r=0;r<6;r++)box(x+r,height(x,z),z,.3,.3,18,[.55,.49,.25]);}}
 if(kind==='ruins'){for(let i=0;i<100;i++){const x=(rand()-.5)*120,z=(rand()-.5)*120;box(x,height(x,z),z,3,1+rand()*7,2,colors.stone);}for(let i=0;i<12;i++){const a=i/12*Math.PI*2,x=Math.cos(a)*38,z=Math.sin(a)*38;cone(x,height(x,z),z,3,5+rand()*14,colors.stone,8,2.5);}for(let i=0;i<70;i++)tree((rand()-.5)*200,(rand()-.5)*200,.6);}
 if(kind==='city'||kind==='dark'||kind==='rohan'||kind==='desert'){
  const ringCity=/gondor|minas tirith/i.test(place.name);const count=ringCity?7:1;
  for(let ring=0;ring<count;ring++){const radius=16+ring*(ringCity?9:16),points=[];
   for(let i=0;i<=100;i++){const a=i/100*Math.PI*2;points.push([Math.cos(a)*radius,Math.sin(a)*radius-15]);}
   road(points,2.5);
   const segment=128,wall=dark?colors.dark:colors.stone;
   const point=(angle,r,y)=>[Math.cos(angle)*r,y,Math.sin(angle)*r-15];
   for(let i=0;i<segment;i++){
    const a=i/segment*Math.PI*2,b=(i+1)/segment*Math.PI*2,mid=(a+b)/2;
    if(Math.abs(Math.cos(mid)*radius)<3.5&&Math.sin(mid)>0)continue;
    const y=height(Math.cos(mid)*radius,Math.sin(mid)*radius-15),h=ringCity?4.7:3;
    const q=[point(a,radius-.8,y),point(b,radius-.8,y),point(b,radius+.8,y),point(a,radius+.8,y)];
    const up=p=>[p[0],p[1]+h,p[2]];
    quad(q[2],q[3],up(q[3]),up(q[2]),wall);quad(q[0],q[1],up(q[1]),up(q[0]),wall);quad(up(q[0]),up(q[1]),up(q[2]),up(q[3]),wall);
    if(i%2===0){const x=Math.cos(mid)*radius,z=Math.sin(mid)*radius-15;box(x,y+h,z,.85,1,.85,wall);}
    if(i%16===0){const x=Math.cos(a)*radius,z=Math.sin(a)*radius-15;cone(x,y,z,2.1,h+3,wall,24,2.1);for(let k=0;k<8;k++){const a=k*Math.PI/4;box(x+Math.cos(a)*1.7,y+h+3,z+Math.sin(a)*1.7,.65,1,.65,wall);}}
   }
   const gateZ=radius-15,gateY=height(0,gateZ);for(const side of[-1,1]){box(side*4.3,gateY,gateZ,2,7,3,wall);cone(side*4.3,gateY+7,gateZ,1.5,3,colors.roof,16);}box(0,gateY+5.5,gateZ,7,1.5,3,wall);

  }
  if(ringCity){
   for(let ring=0;ring<6;ring++){const r=20.5+ring*9,number=Math.floor(Math.PI*2*r/6.2);for(let i=0;i<number;i++){const a=i/number*Math.PI*2;if(Math.abs(Math.cos(a)*r)<5&&Math.sin(a)>0)continue;house(Math.cos(a)*r,Math.sin(a)*r-15,.65+rand()*.12,colors.stone,a-Math.PI/2);}}
   const y=height(0,-15);box(0,y,-15,12,15,10,colors.stone);for(const x of[-6,6])for(const z of[-20,-10])cone(x,y,z,1.4,21,colors.stone,20,1.2);
   cone(10,height(10,-15),-15,4,1.2,colors.stone,36,3.5);cone(10,height(10,-15)+1.25,-15,3.4,.15,colors.water,36,3.4);
   cone(13,height(13,-15),-15,.5,7,colors.wood,12,.2);for(let i=0;i<5;i++){const a=i*Math.PI*.4;ellipsoid(13+Math.cos(a)*1.6,height(13,-15)+6.5,-15+Math.sin(a)*1.6,1.5,1.9,1.5,[.84,.86,.77]);}
  }else for(let i=0;i<420;i++){const x=(rand()-.5)*150,z=(rand()-.5)*150;if(Math.abs(x)<7||Math.abs((z+70)%23)<3||Math.hypot(x,z+15)>83)continue;house(x,z,.65+rand()*.5,dark?[.34,.35,.34]:dry?[.7,.57,.4]:colors.stone,(rand()-.5)*.35);}
  const towerHeight=/barad|angband/i.test(place.name)?58:30;cone(0,height(0,-18),-18,5,towerHeight,dark?colors.dark:colors.stone,32,4);cone(0,height(0,-18)+towerHeight,-18,5,10,dark?colors.dark:colors.roof,32);
  for(let i=0;i<30;i++){const x=(rand()-.5)*120,z=(rand()-.5)*120;if(!dark)tree(x,z,.6);}
 }
 if(kind==='hobbit'){
  const count=/bag end/i.test(place.name)?8:45;
  for(let i=0;i<count;i++){const x=(rand()-.5)*125,z=(rand()-.5)*130,y=height(x,z);cone(x,y,z,7,4,[.28,.43,.19],18,3);for(let j=0;j<24;j++){const a=j/24*Math.PI*2,b=(j+1)/24*Math.PI*2;tri([x,y+1.7,z+6],[x+Math.cos(a)*1.6,y+1.7+Math.sin(a)*1.6,z+6],[x+Math.cos(b)*1.6,y+1.7+Math.sin(b)*1.6,z+6],j%3?[.22,.37,.14]:colors.gold);}box(x,y+2,z+5.4,1,1,.2,[.58,.68,.29]);for(const dx of[-3,3])box(x+dx,y+2,z+4.8,1,1,.2,colors.gold);road([[x,z+5],[x,z+12],[Math.sin((z+15)*.035)*12,z+15]],1.2);buildings++;}
  for(let i=0;i<200;i++)tree((rand()-.5)*200,(rand()-.5)*200,.7);
  for(let i=0;i<16;i++){const x=25+(i%4)*12,z=-40+Math.floor(i/4)*15;for(let row=0;row<7;row++)box(x+row*.9,height(x,z),z,.25,.25,10,[.49,.48,.2]);}
 }
 if(['forest','elven','snow','mountain','dwarf','road'].includes(kind)){
  const count=kind==='forest'?650:kind==='elven'?400:220;
  for(let i=0;i<count;i++){const x=(rand()-.5)*205,z=(rand()-.5)*205;if(Math.abs(x-Math.sin(z*.035)*12)<7||kind==='elven'&&Math.abs(x-Math.sin(z*.025)*15)<12)continue;tree(x,z,kind==='elven'?1.4+rand():.7+rand()*.8,/lórien|galadhon/.test(place.name));}
  if(kind==='elven'){for(let i=0;i<75;i++){const x=(rand()-.5)*125,z=(rand()-.5)*125;if(Math.abs(x)<13)continue;house(x,z,.9,[.72,.76,.67]);cone(x,height(x,z)+9,z,3,9,colors.roof,8);}for(const z of[-40,0,40]){box(Math.sin(z*.025)*15,5,z,24,1.5,4,colors.stone);for(let x=-12;x<=12;x+=4){box(x,6,z-2,.5,2,.5,colors.stone);box(x,6,z+2,.5,2,.5,colors.stone);}}}
  if(kind==='dwarf'){box(-20,height(-20,-25),-25,34,20,15,colors.dark);for(const x of[-35,-5]){cone(x,height(x,-15),-15,5,32,colors.stone,6,5);cone(x,height(x,-15)+32,-15,6,8,colors.roof,6);}for(let i=0;i<50;i++)house((rand()-.5)*110,25+rand()*50,.8);}
 }
 if(/angband|thangorodrim/i.test(place.name)){for(let i=0;i<3;i++)cone(-40+i*40,height(-40+i*40,-75),-75,22,65+i*5,colors.dark,16,2);}
 if(kind==='road'&&/Dead/i.test(place.name)){for(let z=-80;z<90;z+=10){const x=Math.sin(z*.035)*12,y=height(x,z);box(x-6,y,z,2,10,3,colors.dark);box(x+6,y,z,2,10,3,colors.dark);box(x,y+10,z,14,3,3,colors.dark);}}
 if(kind==='volcano'){cone(0,height(0,0)-2,0,11,2,[.94,.21,.035],30,10);for(let i=0;i<12;i++)road([[i*.7,0],[i*1.2,18],[i*1.7,32]],.7,[.94,.25,.035]);}
 if(kind==='water'){for(let i=0;i<10;i++){const x=(rand()-.5)*160,z=(rand()-.5)*160;box(x,.5,z,2,1,8,colors.wood);box(x,1,z,.15,10,.15,colors.wood);quad([x,2,z],[x,10,z],[x+5,3,z],[x,2,z],[.88,.85,.72]);}}
 // Stones, roadside boundaries, and small scene details remain actual geometry at close range.
 if(kind!=='water')for(let i=0;i<450;i++){const x=(rand()-.5)*200,z=(rand()-.5)*200;cone(x,height(x,z),z,.3+rand()*.6,.6+rand(),dark?colors.dark:colors.stone,5);}
 const vertices=new Float32Array(data);data.length=0;terrainCache.clear();return {vertices,heightAt:height,kind,buildings,trees,roads:roads.length};
}
export class Atlas3D {
 constructor(canvas,onStatus){this.canvas=canvas;this.status=onStatus;this.gl=canvas.getContext('webgl',{antialias:true,alpha:false});this.yaw=.65;this.pitch=.85;this.distance=250;this.target=[0,5,0];this.active=false;this.frame=0;if(!this.gl){this.status('3D is unavailable in this browser.');return;}
 const gl=this.gl,compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,terrainVertexShader));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,terrainFragmentShader));gl.bindAttribLocation(p,0,'aPosition');gl.bindAttribLocation(p,1,'aNormal');gl.bindAttribLocation(p,2,'aColor');gl.bindAttribLocation(p,3,'aMaterial');gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));this.program=p;this.buffer=gl.createBuffer();this.eyeLocation=gl.getUniformLocation(p,'uEye');this.matrix=gl.getUniformLocation(p,'uMatrix');this.lightLocation=gl.getUniformLocation(p,'uLightMatrix');this.shadowLocation=gl.getUniformLocation(p,'uShadowMap');this.useShadowLocation=gl.getUniformLocation(p,'uShadows');gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);for(const [i,name]of['aPosition','aNormal','aColor'].entries()){const a=gl.getAttribLocation(p,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,40,i*12);}const material=gl.getAttribLocation(p,'aMaterial');gl.enableVertexAttribArray(material);gl.vertexAttribPointer(material,1,gl.FLOAT,false,40,36);gl.enable(gl.DEPTH_TEST);this.initMaterials();this.resize=new ResizeObserver(()=>this.draw());this.resize.observe(canvas);
 this.pointers=new Map();canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.drag={x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch,target:[...this.target],pan:e.shiftKey||e.button===2};if(this.pointers.size===2){const[a,b]=[...this.pointers.values()];this.pinch={length:Math.hypot(a.x-b.x,a.y-b.y),distance:this.distance};}e.preventDefault();});canvas.addEventListener('pointermove',e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===2&&this.pinch){const[a,b]=[...this.pointers.values()];this.distance=Math.max(12,Math.min(440,this.pinch.distance*this.pinch.length/Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))));}else if(this.drag){const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(this.drag.pan){const f=this.distance/600;this.target[0]=this.drag.target[0]-dx*f*Math.cos(this.yaw)-dy*f*Math.sin(this.yaw);this.target[2]=this.drag.target[2]+dx*f*Math.sin(this.yaw)-dy*f*Math.cos(this.yaw);}else{this.yaw=this.drag.yaw-dx*.006;this.pitch=Math.max(.15,Math.min(1.48,this.drag.pitch+dy*.005));}}this.draw();});const end=e=>{this.pointers.delete(e.pointerId);this.pinch=null;this.drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();this.zoom(Math.exp(-Math.max(-300,Math.min(300,e.deltaY))*.0015));},{passive:false});canvas.addEventListener('keydown',e=>{if(['+','=','-'].includes(e.key)){e.preventDefault();this.zoom(e.key==='-'?1/1.2:1.2);}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();this.yaw+=(e.key==='ArrowLeft'?.1:e.key==='ArrowRight'?-.1:0);this.pitch=Math.max(.15,Math.min(1.48,this.pitch+(e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0)));this.draw();}});
 }
 initMaterials(){
 const gl=this.gl;
 this.anisotropy=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
 const files=['aerial_grass_rock_diff','castle_brick_01_diff','roof_slates_02_diff','aerial_grass_rock_nor_gl','castle_brick_01_nor_gl','roof_slates_02_nor_gl'];
 const uniforms=['uGround','uStone','uRoof','uGroundNormal','uStoneNormal','uRoofNormal'];
 this.materialTextures=files.map((file,i)=>{
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i+1);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(i<3?[128,128,128,255]:[128,128,255,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const entry={texture,file,unit:i+1,location:gl.getUniformLocation(this.program,uniforms[i]),resolution:1,highRequested:false};
  const image=new Image();image.onload=()=>this.uploadMaterial(entry,image,1024);image.src=`assets/materials/${file}.jpg`;return entry;
 });gl.activeTexture(gl.TEXTURE0);
 }
 uploadMaterial(entry,image,limit){
 if(this.destroyed)return;
 const gl=this.gl,size=Math.min(image.width,limit,gl.getParameter(gl.MAX_TEXTURE_SIZE));if(size<=entry.resolution)return;
 let source=image;
 if(image.width!==size){const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const context=canvas.getContext('2d');context.drawImage(image,0,0,size,size);source=canvas;}
 gl.activeTexture(gl.TEXTURE0+entry.unit);gl.bindTexture(gl.TEXTURE_2D,entry.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.generateMipmap(gl.TEXTURE_2D);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
 if(this.anisotropy)gl.texParameterf(gl.TEXTURE_2D,this.anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(16,gl.getParameter(this.anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
 entry.resolution=size;this.canvas.dataset.highResolutionMaps=String(this.materialTextures.filter(item=>item.resolution>1024).length);this.canvas.dataset.textureResolution=String(Math.max(...this.materialTextures.map(item=>item.resolution)));gl.activeTexture(gl.TEXTURE0);this.draw();
 }
 requestHighMaterials(){
 const compact=matchMedia('(max-width: 700px)').matches;
 for(const entry of this.materialTextures){if(entry.highRequested)continue;entry.highRequested=true;
  const limit=compact||entry.unit>3?2048:4096,image=new Image();image.onload=()=>this.uploadMaterial(entry,image,limit);image.onerror=()=>{entry.highRequested=false;};image.src=`assets/materials/${entry.file}_4k.jpg`;
 }
 }
 initShadows(){
 const gl=this.gl;const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
 const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec3 aPosition;uniform mat4 uMatrix;void main(){gl_Position=uMatrix*vec4(aPosition,1.);}'));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,'precision highp float;void main(){vec4 res=fract(gl_FragCoord.z*vec4(1.,256.,65536.,16777216.));res-=res.yzww*vec4(1./256.,1./256.,1./256.,0.);gl_FragColor=res;}'));gl.bindAttribLocation(program,0,'aPosition');gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));this.shadowProgram=program;this.shadowMatrixLocation=gl.getUniformLocation(program,'uMatrix');
 this.shadowTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,2048,2048,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 this.shadowDepth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,this.shadowDepth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,2048,2048);this.shadowFramebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFramebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.shadowTexture,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,this.shadowDepth);this.shadows=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 const ortho=identity4();ortho[0]=1/180;ortho[5]=1/180;ortho[10]=-2/600;ortho[14]=-1;this.lightMatrix=multiply(ortho,lookAt([-160,320,192],[0,0,0]));
 }
 renderShadows(){const gl=this.gl;if(!this.shadowProgram)this.initShadows();if(!this.shadows)return;gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFramebuffer);gl.viewport(0,0,2048,2048);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.shadowProgram);gl.uniformMatrix4fv(this.shadowMatrixLocation,false,this.lightMatrix);gl.drawArrays(gl.TRIANGLES,0,this.count);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.useProgram(this.program);}
 load(place){if(!this.gl)return false;const result=buildScene(place);this.place=place;this.count=result.vertices.length/10;this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.buffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,result.vertices,this.gl.STATIC_DRAW);this.yaw=.65;this.pitch=.85;this.distance=250;this.target=[0,5,/gondor|minas tirith/i.test(place.name)?-15:0];this.active=true;this.info={...result,vertices:undefined};this.heightAt=result.heightAt;this.home=[...this.target];this.renderShadows();this.draw();return true;}
 zoom(factor){this.distance=Math.max(12,Math.min(440,this.distance/factor));this.draw();}
 tilt(){this.pitch=this.pitch>.9?.48:1.2;this.draw();}
 reset(){this.yaw=.65;this.pitch=.85;this.distance=250;this.target=[...(this.home||[0,5,0])];this.draw();}
 draw(){if(!this.gl||!this.active)return;if(this.distance<150)this.requestHighMaterials();cancelAnimationFrame(this.frame);this.frame=requestAnimationFrame(()=>{if(!this.active||this.destroyed)return;const c=this.canvas,gl=this.gl,dpr=Math.min(Math.max(devicePixelRatio||1,1.5),3,this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE)/Math.max(c.clientWidth,c.clientHeight,1)),w=Math.max(1,Math.round(c.clientWidth*dpr)),h=Math.max(1,Math.round(c.clientHeight*dpr));if(c.width!==w||c.height!==h){c.width=w;c.height=h;}gl.useProgram(this.program);for(const item of this.materialTextures){gl.activeTexture(gl.TEXTURE0+item.unit);gl.bindTexture(gl.TEXTURE_2D,item.texture);gl.uniform1i(item.location,item.unit);}gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);gl.uniform1i(this.shadowLocation,0);gl.uniform1i(this.useShadowLocation,this.shadows?1:0);gl.uniformMatrix4fv(this.lightLocation,false,this.lightMatrix);gl.viewport(0,0,w,h);gl.clearColor(.46,.55,.57,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const camera=terrainCamera(this.target,this.distance,this.yaw,this.pitch,this.heightAt),t=camera.target,eye=camera.eye;this.target=t;this.lastCamera=camera;this.canvas.dataset.cameraTerrainClearance=String(eye[1]-Math.max(.2,this.heightAt(eye[0],eye[2])));gl.uniform3fv(this.eyeLocation,eye);gl.uniformMatrix4fv(this.matrix,false,multiply(perspective(w/h),lookAt(eye,t)));gl.drawArrays(gl.TRIANGLES,0,this.count);this.status(`${this.place.name} · ${this.info.kind === "valley" ? "Mountain valley" : "3D landscape"} · Artistic interpretation`);});}
 destroy(){this.destroyed=true;this.resize?.disconnect();cancelAnimationFrame(this.frame);if(this.gl){for(const item of this.materialTextures||[])this.gl.deleteTexture(item.texture);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.gl.deleteProgram(this.shadowProgram);this.gl.deleteTexture(this.shadowTexture);this.gl.deleteFramebuffer(this.shadowFramebuffer);this.gl.deleteRenderbuffer(this.shadowDepth);}}
}
