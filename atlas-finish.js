import * as THREE from './assets/vendor/three.module.js';
import {graphicsLevel} from './graphics-quality.js';
// Linear HDR scene → multi-scale contact shading & micro-contrast → volumetric sun shafts & bloom → one filmic transform.
export class AtlasFinish{
 constructor(renderer){
  this.renderer=renderer;
  const floatColor=renderer.extensions.has('EXT_color_buffer_float');
  this.target=new THREE.WebGLRenderTarget(1,1,{type:floatColor?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true,samples:0});
  this.target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{
   tColor:{value:this.target.texture},tDepth:{value:this.target.depthTexture},uTexel:{value:new THREE.Vector2(1,1)},uProjectionInverse:{value:new THREE.Matrix4()},uExposure:{value:1},uFar:{value:14000},uPixelScale:{value:1},uAO:{value:.3},uBloom:{value:.055},uSaturation:{value:1.025},uWarmth:{value:.008},uFocal:{value:1},uCameraWorld:{value:new THREE.Matrix4()},uAerialDensity:{value:0},uAerialHeight:{value:60},uAerialColor:{value:new THREE.Color(0xc0cbc0)},uSunShafts:{value:0},uMicroContrast:{value:.14},uVignette:{value:.075}
  },vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor,tDepth;
uniform vec2 uTexel;
uniform mat4 uProjectionInverse,uCameraWorld;
uniform float uAerialDensity,uAerialHeight;uniform vec3 uAerialColor;
uniform float uFar,uExposure,uPixelScale,uAO,uBloom,uSaturation,uWarmth,uFocal,uSunShafts,uMicroContrast,uVignette;
vec3 viewAt(vec2 uv){float z=texture2D(tDepth,uv).r;vec4 p=uProjectionInverse*vec4(uv*2.-1.,z*2.-1.,1.);return p.xyz/p.w;}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 srgb(vec3 c){return mix(12.92*c,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
vec3 highlight(vec3 c){float light=max(c.r,max(c.g,c.b));return c*max(0.,light-1.18)/max(light,.001);}
void main(){
 vec3 color=texture2D(tColor,vUv).rgb,p=viewAt(vUv);
 float depth=-p.z,occlusion=0.,weight=0.;
 vec3 normal=normalize(cross(dFdx(p),dFdy(p)));if(dot(normal,-p)<0.)normal=-normal;
 if(depth<uFar*.95){
  float radius=clamp(1.9*uFocal/max(depth,.1),2.*uTexel.y,52.*uTexel.y*uPixelScale);
  for(int i=0;i<16;i++){
   float angle=float(i)*2.399963,ring=sqrt((float(i)+.5)/16.);
   vec2 uv=clamp(vUv+vec2(cos(angle)*uTexel.x/uTexel.y,sin(angle))*radius*ring,uTexel,1.-uTexel);
   vec3 delta=viewAt(uv)-p;float dist=length(delta);
   float sampleWeight=1.-smoothstep(.18,2.8,dist);
   occlusion+=max(0.,dot(normal,delta/max(dist,.001))-.10)*sampleWeight;weight+=1.;
  }
  color*=1.-min(.68,occlusion/max(1.,weight)*uAO*3.15);
  vec3 neighbours=vec3(0.);float count=0.;
  for(int j=0;j<4;j++){
   vec2 uv=vUv+vec2(j<2?(j==0?-1.:1.):0.,j>=2?(j==2?-1.:1.):0.)*uTexel;
   if(abs(viewAt(uv).z-p.z)<max(.08,depth*.001)){neighbours+=texture2D(tColor,uv).rgb;count+=1.;}
  }
  // Limit local micro-contrast sharpening to the local range so bright silhouettes do not ring.
  if(count>0.){vec3 average=neighbours/count;vec3 detail=color-average;
   vec3 limit=max(color,average)*.075;
   color=max(vec3(0.),color+clamp(detail*uMicroContrast,-limit,limit));}
 }
 vec3 glow=vec3(0.);
 for(int k=0;k<12;k++){float a=float(k)*2.399963;vec2 offset=vec2(cos(a),sin(a))*(2.+float(k)*1.65)*uTexel*uPixelScale;glow+=highlight(texture2D(tColor,clamp(vUv+offset,uTexel,1.-uTexel)).rgb);}
 color+=glow*(uBloom/12.);
 // Subtle volumetric sun-shaft scattering across sky silhouettes and ridges.
 if(uSunShafts>0.){
  vec2 sunAnchor=vec2(.28,.82);vec2 ray=(sunAnchor-vUv)*.045;vec3 shafts=vec3(0.);
  for(int s=1;s<=6;s++){
   vec2 suv=clamp(vUv+ray*float(s),uTexel,1.-uTexel);
   float sDepth=-viewAt(suv).z;
   float skyMask=smoothstep(uFar*.35,uFar*.92,sDepth);
   shafts+=texture2D(tColor,suv).rgb*skyMask*(1.-float(s)/7.);
  }
  color+=shafts*(uSunShafts*.045)*vec3(1.08,.96,.80);
 }
 // Height-layered aerial perspective: keep near materials crisp and separate ridgelines.
 if(uAerialDensity>0.&&depth<uFar*.95){
  vec3 worldPoint=(uCameraWorld*vec4(p,1.)).xyz;float cameraHeight=uCameraWorld[3].y;
  float haze=0.;
  for(int h=0;h<4;h++){float height=mix(cameraHeight,worldPoint.y,(float(h)+.5)/4.);
   haze+=exp(-max(0.,height)/max(1.,uAerialHeight));}
  float aerial=1.-exp(-max(0.,length(p)-16.)*uAerialDensity*haze*.26);
  color=mix(color,uAerialColor,min(.68,aerial));
 }
 float lum=dot(color,vec3(.2126,.7152,.0722));color=mix(vec3(lum),color,uSaturation);
 color*=vec3(1.+uWarmth,1.+.15*uWarmth,1.-uWarmth);color=srgb(aces(color*uExposure));
 color*=1.-smoothstep(.26,.86,length(vUv-.5))*uVignette;
 float dither=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
 gl_FragColor=vec4(color+(dither-.5)/255.,1.);
}`});
  this.scene=new THREE.Scene();this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material);this.scene.add(this.quad);this.camera=new THREE.Camera();
 }
 configure(quality,lighting={}){
  const samples=Math.min(graphicsLevel(quality).samples,this.renderer.capabilities.maxSamples||0);
  if(samples!==this.target.samples){this.target.dispose();this.target.samples=samples;}
  const u=this.material.uniforms;u.uAerialDensity.value=lighting.aerialDensity??0;u.uAerialHeight.value=lighting.aerialHeight??60;u.uAerialColor.value.set(lighting.aerialColor??0xc0cbc0);u.uAO.value=lighting.occlusion??.3;u.uBloom.value=lighting.bloom??.055;u.uSaturation.value=lighting.saturation??1.025;u.uWarmth.value=lighting.warmth??.008;u.uSunShafts.value=lighting.sunShafts??0;u.uMicroContrast.value=lighting.microContrast??.14;u.uVignette.value=lighting.vignette??.075;
 }
 resize(width,height){this.target.setSize(width,height);this.material.uniforms.uTexel.value.set(1/width,1/height);this.material.uniforms.uPixelScale.value=Math.max(1,height/1080);}
 render(scene,camera){
  const r=this.renderer,priorTarget=r.getRenderTarget(),priorTone=r.toneMapping;
  const u=this.material.uniforms;camera.updateMatrixWorld();u.uCameraWorld.value.copy(camera.matrixWorld);u.uExposure.value=r.toneMappingExposure;u.uFar.value=camera.far;u.uProjectionInverse.value.copy(camera.projectionMatrixInverse);u.uFocal.value=camera.projectionMatrix.elements[5]*.5;
  try{r.toneMapping=THREE.NoToneMapping;r.setRenderTarget(this.target);r.render(scene,camera);r.setRenderTarget(priorTarget);r.render(this.scene,this.camera);}finally{r.toneMapping=priorTone;r.setRenderTarget(priorTarget);}
 }
 dispose(){this.target.dispose();this.quad.geometry.dispose();this.material.dispose();}
}
