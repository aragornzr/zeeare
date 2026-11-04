// Visual beats share the same timing as the original audio sound design.
export const WHIP_BEATS=Object.freeze([6.4,13.4,19.1,26.2]);
export const CLASH_BEATS=Object.freeze([7,14,19.7,26.8]);
export const FELLOWSHIP_NAMES=Object.freeze([
 'Gandalf the Grey','Aragorn','Legolas','Gimli','Boromir',
 'Frodo Baggins','Samwise Gamgee','Meriadoc Brandybuck','Peregrin Took'
]);
const pulse=(t,center,width)=>Math.max(0,1-Math.abs(t-center)/width);
export function battlePose(time){
 const attack=Math.max(0,...CLASH_BEATS.map(t=>pulse(time,t-.12,.65)));
 const clash=Math.max(0,...CLASH_BEATS.map(t=>pulse(time,t,.16)));
 const staff=Math.max(pulse(time,17,.65),pulse(time,28,.65));
 const roar=Math.max(...[4,12,25].map(t=>pulse(time,t+1,1.8)));
 const caption=time>=9.7&&time<11.8?'Go back to the shadow!':time>=22.3&&time<24.4?'You shall not pass!':'';
 return{attack,clash,staff,roar,caption};
}
export function hallChasePose(time=0){
 const t=Math.max(0,Math.min(32,Number(time)||0)),progress=t/32;
 const base=battlePose(t);
 const goblinSurge=.35+.65*Math.sin(progress*Math.PI)+.15*Math.sin(t*1.8);
 const balrogGlow=.45+.55*Math.min(1,t/14)+base.roar*.35;
 const staffLight=.72+base.staff*.55+base.clash*.35+Math.sin(t*2.4)*.08;
 const sprintSpeed=1.15+.25*Math.sin(progress*Math.PI);
 const phaseCaption=t<5.5?'Gandalf lights the vast Hall of Durin as drums echo in the deep':
  t<9.7?'Goblins of Moria pour from the pillars — the Fellowship runs!':
  base.caption?base.caption:
  t<18.5?'Almost surrounded by the Goblin horde, Gandalf leads the nine forward':
  t<26.5?'Afar in the pillared depths, the Balrog of Morgoth rises in shadow and flame!':
  'Through shadow and encircling steel, Gandalf’s staff blazes across Khazad-dûm!';
 return{...base,progress,goblinSurge,balrogGlow,staffLight,sprintSpeed,phaseCaption};
}
