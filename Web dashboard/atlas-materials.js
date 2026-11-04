// World-space procedural surfaces remain detailed as the camera moves closer.
export const terrainVertexShader = `
attribute vec3 aPosition,aNormal,aColor;
attribute float aMaterial;
uniform mat4 uMatrix,uLightMatrix;
varying vec3 vColor,vNormal,vWorld;
varying vec4 vShadow;
varying float vDistance,vMaterial;
void main(){vColor=aColor;vNormal=aNormal;vWorld=aPosition;vMaterial=aMaterial;
vShadow=uLightMatrix*vec4(aPosition,1.);gl_Position=uMatrix*vec4(aPosition,1.);vDistance=gl_Position.w;}
`;
export const terrainFragmentShader = `
precision highp float;
varying vec3 vColor,vNormal,vWorld;
varying vec4 vShadow;
varying float vDistance,vMaterial;
uniform sampler2D uShadowMap;
uniform bool uShadows;
uniform vec3 uEye;
uniform sampler2D uGround,uStone,uRoof,uGroundNormal,uStoneNormal,uRoofNormal;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return noise(p)*.55+noise(p*2.03)*.28+noise(p*4.11)*.12+noise(p*8.17)*.05;}
float unpackDepth(vec4 c){return dot(c,vec4(1.,1./256.,1./65536.,1./16777216.));}
void main(){
 vec3 n=normalize(vNormal),base=vColor,p=vWorld;float detail=noise(p*.8);
 float rough=.85,specular=.025;
 if(vMaterial<.5){
  vec3 photo=texture2D(uGround,p.xz/8.).rgb;
  vec3 grainNormal=texture2D(uGroundNormal,p.xz/8.).xyz*2.-1.;
  n=normalize(n+vec3(grainNormal.x,0.,grainNormal.y)*.28);
  float textureValue=dot(photo,vec3(.299,.587,.114));base*=.45+textureValue*1.6;
  float patches=noise(p*.15),grain=textureValue;
  base*=.72+patches*.4+grain*.16;
  float rock=smoothstep(.18,.55,1.-n.y);
  base=mix(base,vec3(.34,.33,.29)*( .7+noise(p*.7)*.6),rock);
  base=mix(base,base*vec3(1.08,.94,.75),smoothstep(.55,.8,patches)*.4);
 }else if(vMaterial<1.5){
  vec2 uv=abs(n.y)>.6?p.xz:(abs(n.z)>abs(n.x)?p.xy:p.zy);
  vec3 photo=texture2D(uStone,uv/2.5).rgb;
  vec3 relief=texture2D(uStoneNormal,uv/2.5).xyz*2.-1.;
  if(abs(n.y)>.6)n=normalize(n+vec3(relief.x,0.,relief.y)*.3);else if(abs(n.z)>abs(n.x))n=normalize(n+vec3(relief.x,relief.y,0.)*.3);else n=normalize(n+vec3(0.,relief.y,relief.x)*.3);
  base*=.6+dot(photo,vec3(.299,.587,.114))*1.35;
  vec2 brick=vec2(uv.x*1.15+mod(floor(uv.y*1.6),2.)*.5,uv.y*1.6);
  vec2 cell=fract(brick);float mortar=(1.-smoothstep(.025,.065,min(cell.x,1.-cell.x)))*.25+(1.-smoothstep(.025,.08,min(cell.y,1.-cell.y)))*.25;
  base*=.82+hash(vec3(floor(brick),0.))*.22+detail*.12-mortar;
  rough=.72;
 }else if(vMaterial<2.5){
  vec3 photo=texture2D(uRoof,p.xz/3.).rgb;
  vec3 relief=texture2D(uRoofNormal,p.xz/3.).xyz*2.-1.;
  n=normalize(n+vec3(relief.x,0.,relief.y)*.35);
  base*=.6+dot(photo,vec3(.299,.587,.114))*1.5;
  vec2 uv=p.xz*2.9;uv.x+=mod(floor(uv.y),2.)*.5;
  vec2 tile=fract(uv);float edge=1.-smoothstep(.015,.09,min(min(tile.x,1.-tile.x),tile.y));
  base*=.75+hash(vec3(floor(uv),0.))*.32+tile.y*.15-edge*.28;rough=.55;specular=.06;
 }else if(vMaterial<3.5){base*=.7+detail*.48;rough=1.;}
 else if(vMaterial<4.5){base*=.7+noise(vec3(p.x*18.,p.y*.5,p.z*18.))*.45;}
 else if(vMaterial<5.5){
  n=normalize(n+vec3(sin(p.x*1.3+p.z*.7)*.09,0.,cos(p.z*1.6-p.x*.6)*.08));
  base=mix(base,vec3(.18,.4,.44),noise(p*.17)*.4);rough=.15;specular=.65;
 }

 vec3 sun=normalize(vec3(-.5,1.,.6)),view=normalize(uEye-p),halfway=normalize(sun+view);
 float diffuse=max(dot(n,sun),0.);
 vec3 sc=vShadow.xyz/vShadow.w*.5+.5;float visibility=1.;
 if(uShadows&&sc.x>0.&&sc.x<1.&&sc.y>0.&&sc.y<1.&&sc.z<1.){
  float total=0.;float bias=max(.0006,.0018*(1.-diffuse));
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
   float depth=unpackDepth(texture2D(uShadowMap,sc.xy+vec2(float(x),float(y))/2048.));total+=sc.z-bias<=depth?1.:.16;
  }visibility=total/9.;
 }
 float sky=.22+.19*max(n.y,0.);vec3 ambient=vec3(.68,.79,.94)*sky;
 vec3 direct=vec3(1.09,1.01,.85)*diffuse*visibility*.88;
 float shine=pow(max(dot(n,halfway),0.),mix(90.,9.,rough))*specular*visibility;
 vec3 color=base*(ambient+direct)+vec3(1.,.9,.72)*shine;
 float fog=1.-exp(-max(vDistance-140.,0.)*.0028);
 color=mix(color,vec3(.46,.55,.57),fog*.72);
 color=color/(color+vec3(.42));color=pow(color,vec3(.88));
 gl_FragColor=vec4(color,1.);
}
`;
