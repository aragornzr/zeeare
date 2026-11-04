// Deterministic natural relief shared by cinematic and interactive cameras.
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const seedOf=text=>[...text].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,17);
export function randomOf(seed){return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
export function noise2(x,z,seed=0){
 const hash=(a,b)=>{let h=Math.imul(a,374761393)^Math.imul(b,668265263)^seed;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;};
 const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
 return(hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v;
}
export function fbm(x,z,seed=0,octaves=5){let sum=0,amp=.5,f=1;for(let i=0;i<octaves;i++){sum+=noise2(x*f,z*f,seed+i*131)*amp;f*=2.03;amp*=.5;}return sum;}
export class TerrainModel{
 constructor(profile){this.profile=profile;this.seed=seedOf(profile.name);this.kind=profile.kind;this.waterLevel=profile.terrain?.waterLevel??0;this.amplitude=profile.terrain?.amplitude??30;this.flats=[];}
 riverX(z){return Math.sin(z*.007+this.seed%7)*24+Math.sin(z*.019)*6;}
 natural(x,z){
  const p=this.profile,kind=p.kind,s=this.seed,n=fbm(x*.004,z*.004,s),fine=fbm(x*.03,z*.03,s+5,3);
  let h=(n-.4)*this.amplitude+fine*2;
  const mountainous=['mountain','cave'].includes(kind)||(kind==='valley'&&(p.biome==='alpine'||p.name==='Rivendell')); 
  if(mountainous){const v=Math.abs(x-this.riverX(z)),ridge=Math.pow(1-Math.abs(noise2(x*.003,z*.003,s+30)*2-1),2);h+=Math.pow(clamp(v/170,0,1.8),1.7)*(45+ridge*85);h+=(ridge*25+(fine-.35)*18)*Math.min(1,v/60); }
  if(['river','valley','marsh'].includes(kind)){const d=Math.abs(x-this.riverX(z));h=this.waterLevel-3+Math.max(0,d-12)*.13+h*clamp((d-8)/36,0,1);if(kind==='marsh')h=this.waterLevel-.5+noise2(x*.035,z*.035,s)*1.8;}
  if(['lake','coast'].includes(kind)){const edge=kind==='lake'?Math.hypot(x*.8,z*.6)-85:x+30;h=this.waterLevel-8+Math.max(0,edge)*.13+fine*2;if(kind==='coast')h+=Math.max(0,x-80)*.06;}
  if(p.name==='Minas Tirith')h+=Math.max(0,-z-95)*.65+(fbm(x*.02,z*.02,s+90)-.3)*Math.max(0,Math.min(40,-z-70));
  if(p.name==='Lake-town')h=this.waterLevel-5+(n-.4)*3;
  if(kind==='desert')h+=Math.sin(x*.016+Math.sin(z*.01)*2)*10+Math.sin(x*.04+z*.006)*2;
  if(kind==='volcano'){const r=Math.hypot(x,z+25);h+=Math.max(0,160-r*.65)-Math.max(0,1-r/24)*55;}
  return h;
 }
 height(x,z){let h=this.natural(x,z);for(const f of this.flats){const d=Math.hypot(x-f.x,z-f.z),blend=1-clamp((d-f.radius)/f.edge,0,1);if(blend>0)h=h*(1-blend)+f.y*blend;}return h;}
 flatten(x,z,radius,y=this.natural(x,z),edge=12){this.flats.push({x,z,radius,y,edge});return y;}
 safeCamera(target,distance,yaw,pitch,clearance=2){
  const eye=[target[0]+Math.sin(yaw)*Math.cos(pitch)*distance,target[1]+Math.sin(pitch)*distance,target[2]+Math.cos(yaw)*Math.cos(pitch)*distance];
  for(let i=1;i<=16;i++){const f=i/16,x=target[0]+(eye[0]-target[0])*f,z=target[2]+(eye[2]-target[2])*f;eye[1]=Math.max(eye[1],(this.height(x,z)+clearance-target[1]*(1-f))/f);}return eye;
 }
}
