import {TerrainModel,fbm,clamp} from './atlas-terrain.js';
// North is -Z. Relationships are text-informed; metric distances are an interpretation.
export const HOBBITON_LAYOUT=Object.freeze({
 bagEnd:{x:0,z:-62,color:0x3f6736,name:'Bag End · the green door'},
 bagshotRow:[{x:-13,z:-32,color:0x998343},{x:0,z:-31,color:0x9f7c35},{x:13,z:-31,color:0x495f5c}],
 villageSmials:[{x:-43,z:-15,color:0x8b6944},{x:37,z:-19,color:0x8b4b3f},{x:51,z:2,color:0x48694b},{x:-52,z:5,color:0x73523b},{x:-35,z:48,color:0x7d6c43},{x:38,z:51,color:0x52664b}],
 mill:{x:-15,z:17},bridge:{x:2,z:27},partyTree:{x:31,z:-8},partyField:{x:35,z:4},garden:{x:14,z:6},grange:{x:-27,z:-3},waterLevel:.65,
 people:[
  {x:11,z:7,yaw:-.4,activity:'garden',shirt:0xddd3b8,waistcoat:0x66513a},
  {x:15,z:8,yaw:.2,activity:'carry',shirt:0xe2d8bc,waistcoat:0x6b7351,skirt:true},
  {x:5,z:13,yaw:1.6,activity:'chat',shirt:0xc6b68e,waistcoat:0x526749},
  {x:6.5,z:13.4,yaw:-1.5,activity:'chat',shirt:0xcfc3ae,waistcoat:0x856047,skirt:true},
  {x:-11,z:12,yaw:.1,activity:'carry',shirt:0xddd0b1,waistcoat:0x696e45},
  {x:2,z:29,yaw:0,activity:'walk',path:[[2,35],[2,19],[3,4],[2,19]]},
  {x:3.3,z:30,yaw:0,activity:'walk',skirt:true,path:[[3.3,34],[3.3,19],[7,9],[3.3,19]]},
  {x:-8,z:-22,yaw:.6,activity:'garden',shirt:0xd4c6a8,waistcoat:0x5b7149},
  {x:2,z:-52,yaw:.1,activity:'chat',shirt:0xdccfae,waistcoat:0x72523c},
  {x:-35,z:45,yaw:1.2,activity:'carry',shirt:0xc8bc9f,waistcoat:0x687243},
  {x:34,z:11,yaw:-.6,activity:'walk',path:[[34,11],[37,6],[31,2],[34,11]]},
  {x:-24,z:-8,yaw:-.7,activity:'chat',shirt:0xc9b48e,waistcoat:0x805c3b}
 ]
});
export class HobbitonTerrain extends TerrainModel{
 constructor(profile){super(profile);this.waterLevel=HOBBITON_LAYOUT.waterLevel;}
 streamZ(x){return 26+Math.sin(x*.018)*3+Math.sin(x*.045)*1.1;}
 natural(x,z){
  const slope=1.8+(fbm(x*.013,z*.013,this.seed,5)-.37)*4;
  const hill=21*Math.exp(-((x/55)**2+((z+65)/43)**2));
  const downs=(fbm(x*.003,z*.003,this.seed+70,4)-.35)*15;
  const detail=(fbm(x*.13,z*.13,this.seed+8,3)-.35)*.38;
  const farHills=clamp((Math.hypot(x,z+35)-140)/240,0,1)*(fbm(x*.004,z*.004,this.seed+91,5)-.23)*65;
  let y=slope+hill+downs+detail+farHills;
  const d=Math.abs(z-this.streamZ(x)),bankBlend=1-clamp((d-3.5)/7,0,1);
  y=y*(1-bankBlend)+(this.waterLevel-1.3+d*.04)*bankBlend;
  return y;
 }
}
export const HOBBITON_TOUR=Object.freeze([
 {eye:[11,27,-40],target:[0,23,-62],title:'Bag End · morning on the Hill'},
 {eye:[10,5,47],target:[-6,2.3,19],title:'The bridge & Sandyman’s mill'},
 {eye:[19,10,-2],target:[0,11,-31],title:'Bagshot Row'},
 {eye:[13,28,-39],target:[0,23,-62],title:'Bag End beneath the Hill'},
 {eye:[23,4.5,15],target:[13,2.4,7],title:'A garden, and the neighbours'},
 {eye:[48,24,34],target:[29,8,-8],title:'The party tree & open field'}
]);
