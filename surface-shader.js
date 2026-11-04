// World-space PBR projection keeps material scale independent of mesh dimensions.
export function applyWorldSurface(material,type,scale,{weathered=false}={}){
 material.onBeforeCompile=shader=>{
  shader.uniforms.uSurfaceScale={value:scale};shader.uniforms.uSurfaceWeather={value:weathered?1:0};shader.uniforms.uSurfacePale={value:type==='stone'&&Math.min(material.color.r,material.color.g)>.6?.52:0};
  shader.vertexShader='varying vec3 vSurfacePosition;varying vec3 vSurfaceNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec4 surfacePoint=vec4(transformed,1.);vec3 surfaceNormal=normal;
   #ifdef USE_INSTANCING
   surfacePoint=instanceMatrix*surfacePoint;
   mat3 instanceBasis=mat3(instanceMatrix);
   surfaceNormal/=vec3(dot(instanceBasis[0],instanceBasis[0]),dot(instanceBasis[1],instanceBasis[1]),dot(instanceBasis[2],instanceBasis[2]));
   surfaceNormal=instanceBasis*surfaceNormal;
   #endif
   vSurfacePosition=(modelMatrix*surfacePoint).xyz;
   mat3 modelBasis=mat3(modelMatrix);
   surfaceNormal/=vec3(dot(modelBasis[0],modelBasis[0]),dot(modelBasis[1],modelBasis[1]),dot(modelBasis[2],modelBasis[2]));
   vSurfaceNormal=normalize(modelBasis*surfaceNormal);`);
  shader.fragmentShader=`varying vec3 vSurfacePosition;varying vec3 vSurfaceNormal;uniform float uSurfaceScale,uSurfacePale,uSurfaceWeather;
   float surfaceNoise(vec3 p){return .5+.25*sin(p.x*.67+p.z*.41)+.16*sin(p.z*1.23-p.y*.83)+.09*cos(p.x*2.11+p.y*1.73);}
   vec3 surfaceSample(sampler2D tex,vec3 p,vec3 weights){
    vec3 primary=texture2D(tex,p.zy).rgb*weights.x+texture2D(tex,p.xz).rgb*weights.y+texture2D(tex,p.xy).rgb*weights.z;
    vec3 q=p*.43+vec3(.31,.57,.19);
    vec3 secondary=texture2D(tex,q.yz).rgb*weights.x+texture2D(tex,q.zx).rgb*weights.y+texture2D(tex,q.yx).rgb*weights.z;
    return mix(primary,secondary,.26);
   }
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   vec3 surfaceN=normalize(vSurfaceNormal),surfaceWeights=pow(abs(surfaceN),vec3(5.));
   surfaceWeights/=max(.001,surfaceWeights.x+surfaceWeights.y+surfaceWeights.z);
   vec3 worldUV=vSurfacePosition*uSurfaceScale;
   vec3 surfaceColor=surfaceSample(map,worldUV,surfaceWeights);surfaceColor=mix(surfaceColor,vec3(dot(surfaceColor,vec3(.2126,.7152,.0722))*1.85),uSurfacePale);
   float surfaceMacro=surfaceNoise(vSurfacePosition*.37);
   float surfaceMicro=surfaceNoise(vSurfacePosition*3.4);
   surfaceColor*=mix(.84,1.10,surfaceMacro)*mix(.95,1.05,surfaceMicro);
   // Broad mineral staining and moss/lichen patina break texture repetition without fake geometric seams.
   float weatherPatch=surfaceNoise(vSurfacePosition*.73)*surfaceNoise(vSurfacePosition*.19+vec3(7.));
   float upward=smoothstep(.28,.85,surfaceN.y);
   float dampBase=smoothstep(4.5,0.,vSurfacePosition.y)*uSurfaceWeather*.14;
   float wear=uSurfaceWeather*smoothstep(.20,.52,weatherPatch)*.18;
   surfaceColor=mix(surfaceColor,surfaceColor*vec3(.76,.84,.64),wear*upward);
   surfaceColor*=(1.-uSurfaceWeather*(1.-surfaceMacro)*.06)*(1.-dampBase);
   diffuseColor.rgb*=surfaceColor;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
   vec3 sx=texture2D(normalMap,worldUV.zy).xyz*2.-1.,sy=texture2D(normalMap,worldUV.xz).xyz*2.-1.,sz=texture2D(normalMap,worldUV.xy).xyz*2.-1.;
   vec3 surfaceSign=sign(surfaceN);
   vec3 surfaceBump=vec3(0.,sx.y,sx.x*surfaceSign.x)*surfaceWeights.x+vec3(sy.x,0.,sy.y*surfaceSign.y)*surfaceWeights.y+vec3(sz.x*surfaceSign.z,sz.y,0.)*surfaceWeights.z;
   // Fade subpixel normal detail to suppress sparkling during camera motion.
   float surfaceFootprint=max(length(dFdx(worldUV)),length(dFdy(worldUV)));
   float surfaceRelief=1.-smoothstep(.025,.32,surfaceFootprint);
   normal=normalize(mat3(viewMatrix)*normalize(surfaceN+surfaceBump*(.48*surfaceRelief)));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
   float roughnessFactor=roughness;
   #ifdef USE_ROUGHNESSMAP
   float dampRough=smoothstep(3.5,0.,vSurfacePosition.y)*uSurfaceWeather*.12;
   roughnessFactor=clamp(roughness*(.45+.65*surfaceSample(roughnessMap,worldUV,surfaceWeights).g)-dampRough,.18,1.);
   #endif`);
 };
 material.customProgramCacheKey=()=> 'atlas-world-pbr-v7-'+type+'-'+weathered;
 return material;
}
