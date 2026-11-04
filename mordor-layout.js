import {TerrainModel,fbm,clamp} from './atlas-terrain.js';
// Interpretive regional compression, north = -Z. Coordinates are not canonical distances.
export const MORDOR_LAYOUT={gate:{x:-420,z:-510},udun:{x:-390,z:-345},isenmouthe:{x:-355,z:-205},doom:{x:-60,z:-70},baradDur:{x:300,z:50},cirithUngol:{x:-535,z:195},nurn:{x:230,z:555},sea:{x:435,z:640},bounds:{minX:-900,maxX:1000,minZ:-850,maxZ:950}};
const gauss=(d,w)=>Math.exp(-d*d/(w*w));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export class MordorTerrain extends TerrainModel{
 natural(x,z){
  const s=this.seed,n=fbm(x*.009,z*.009,s),f=fbm(x*.065,z*.065,s+19,4);
  const warp=(n-.4)*28,r=fbm((x+warp)*.019,(z-warp)*.019,s+7,4),ridge=Math.pow(1-Math.abs(r*2-1),2);
  // Broad ash hummocks, fractured low ribs and finer stone relief, rather than a level floor.
  const stony=Math.pow(1-Math.abs(f*2-1),3);
  let h=17+(n-.42)*34+(f-.4)*7+stony*4;
  const west=-650+Math.sin(z*.007)*38+Math.sin(z*.023)*11;
  const north=-650+Math.sin(x*.008)*29+Math.sin(x*.025)*10;
  const south=795+Math.sin(x*.005)*25+Math.sin(x*.017)*13;
  // Unequal shoulders and narrow drainage cuts break the long mountain walls into spurs.
  const westCut=Math.pow(.5+.5*Math.sin(z*.049+Math.sin(x*.025)*1.8),12);
  const northCut=Math.pow(.5+.5*Math.sin(x*.046+Math.sin(z*.028)*1.7),12);
  const southCut=Math.pow(.5+.5*Math.sin(x*.039+Math.sin(z*.031)*1.5),12);
  const westMass=gauss(x-west,94)*(135+ridge*235);
  h+=westMass*(1-.28*westCut)+gauss(x-west-96,51)*(22+ridge*36);
  h+=gauss(z-north,86)*(140+ridge*240)*(1-.29*northCut)*(1-.95*gauss(x+420,58))*clamp((850-x)/180,0,1);
  const southernWall=gauss(z-south,91)*(100+ridge*190)*(1-.25*southCut)*clamp((640-x)/210,0,1);
  h+=southernWall;
  // Natural opening at Morannon; mountain flanks continue behind the paired towers.
  const gate=Math.hypot((x+420)*.85,z+510);
  h-=gauss(gate,68)*24;
  h+=gauss(x+565,60)*gauss(z+520,130)*(142+ridge*35)+gauss(x+275,63)*gauss(z+525,135)*(160+ridge*38);
  // Uneven Udûn basin enclosed by lateral spurs and the southern Iron Jaws.
  h+=gauss(x+510,43)*gauss(z+355,150)*(112+ridge*24)+gauss(x+230,45)*gauss(z+355,160)*(104+ridge*23);
  h+=gauss(z+205,35)*gauss(x+370,175)*(100+ridge*21)*(1-gauss(x+355,32));
  h-=gauss(Math.hypot(x+390,z+345),115)*9;
  // Eroded, asymmetric solitary volcano. Radial gullies die away before the crater.
  const dx=x+60,dz=(z+70)*1.05,dist=Math.hypot(dx,dz),a=Math.atan2(dz,dx);
  const foot=178+Math.sin(a*3+.8)*10+Math.sin(a*7)*4;
  const v=clamp(1-dist/foot,0,1),summit=v>0?Math.pow(v,1.17)*247:0;
  const radialCut=Math.pow(.5+.5*Math.sin(a*19+dist*.025+Math.sin(a*7)*.8),7);
  const gullies=radialCut*smooth(24,48,dist)*(1-smooth(130,190,dist))*19;
  const brokenRim=gauss(dist-23,11)*(4+Math.sin(a*5)*3+Math.sin(a*11)*2);
  h+=summit-gauss(dist,14)*70+brokenRim-gullies;
  // A few narrow non-luminous clefts in the central plateau; not rivers of lava.
  const fissureLine=z-(55+Math.sin(x*.011)*24+Math.sin(x*.033)*7);
  h-=gauss(fissureLine,1.8)*5*gauss(x-30,260)*(1-gauss(dist,180));
  // Southern Nurn is gently undulating; retain its southern boundary but leave the east open.
  const fertile=smooth(350,520,z);
  h=h*(1-fertile)+((n-.4)*13+9+southernWall)*fertile;
  const lake=Math.hypot((x-435)/190,(z-640)/98);h-=gauss(lake,.9)*18;
  return h;
 }
}
export const MORDOR_TOUR=[
 {title:'Morannon · Towers of the Teeth',eye:[-385,185,-735],target:[-420,55,-510]},
 {title:'Udûn · the staging basin',eye:[-190,205,-420],target:[-390,38,-345]},
 {title:'Isenmouthe · the Iron Jaws',eye:[-300,135,-105],target:[-355,42,-205]},
 {title:'Gorgoroth · ash and military roads',eye:[230,190,-265],target:[-90,45,80]},
 {title:'Orodruin · the road to Sammath Naur',eye:[-290,260,100],target:[-60,145,-70]},
 {title:'Barad-dûr · walls upon walls',eye:[535,245,285],target:[300,140,50]},
 {title:'Cirith Ungol · stairs above the ravine',eye:[-355,235,315],target:[-535,155,195]},
 {title:'Nurn · fields beside the inland sea',eye:[130,205,720],target:[345,8,560]}
];
