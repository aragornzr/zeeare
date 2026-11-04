import {TerrainModel,fbm,clamp} from './atlas-terrain.js';
export const BAG_END_LAYOUT=Object.freeze({
 home:Object.freeze({x:0,z:-10,width:18.5,height:4.6,doorX:-1.5,doorRadius:1.22}),
 gate:Object.freeze({x:-6,z:9,width:2.8}),
 oak:Object.freeze({x:1,z:-29,scale:1.65}),
 bilbo:Object.freeze({x:1.1,z:-7.8,yaw:-.45}),
 gandalf:Object.freeze({x:-6.2,z:10.3,yaw:-.18}),
 path:Object.freeze([[-1.8,-8],[-2.2,-3],[-4.1,2],[-6,9],[-9.5,17],[-15,26],[-25,34]]),
 neighbours:Object.freeze([{x:-32,z:9,color:0x857343},{x:31,z:7,color:0x6d493a},{x:-49,z:-13,color:0x41665a},{x:49,z:-15,color:0x6f5a42},{x:38,z:28,color:0x5e704c}])
});
export class BagEndTerrain extends TerrainModel{
 constructor(profile){super(profile);this.waterLevel=-25;}
 natural(x,z){
  const hill=11*Math.exp(-((x/43)**2+((z+28)/38)**2));
  const folds=(fbm(x*.017,z*.017,this.seed,5)-.38)*5.8;
  const near=(fbm(x*.19,z*.19,this.seed+11,3)-.4)*.18;
  const distance=clamp((Math.hypot(x,z+20)-75)/140,0,1);
  const woodedDowns=(fbm(x*.0033,z*.0033,this.seed+83,5)-.23)*58;
  const background=9*Math.exp(-(((x+95)/75)**2+((z+130)/85)**2))+13*Math.exp(-(((x-100)/85)**2+((z+180)/90)**2));
  return 2.2+hill+folds+near+distance*woodedDowns+background;
 }
}
// Offsets are relative to the stone terrace elevation, keeping every shot grounded.
export const BAG_END_TOUR=Object.freeze([
 {eye:[-2.8,1.8,19],target:[0,1.9,-10],title:'Bilbo’s home · a visitor at the gate'},
 {eye:[-2.2,1.65,17],target:[-2,1.65,-8],title:'Gandalf arrives with his staff'},
 {eye:[6.4,2.5,-.5],target:[1,1,-7.8],title:'Bilbo lights his cigar'},
 {eye:[-11,3,14],target:[-4.1,.3,1],title:'Frodo sets off down the lane'},
 {eye:[-29,10,23],target:[0,3,-13],title:'A green door beneath the old oak'},
 {eye:[26,15,15],target:[2,4,-23],title:'Wooded hills and neighbouring smials'}
]);
