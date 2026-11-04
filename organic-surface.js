// Thin-surface backlighting approximation, evaluated per light in linear space.
// Preserves the caller's pore, weave and wind shader customizations.
export function applyOrganicSurface(material,kind='leaf'){
 const previous=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  const skin=kind==='skin';
  shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>',
   '#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>');
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
   #if NUM_DIR_LIGHTS > 0
   for(int organicLight=0;organicLight<NUM_DIR_LIGHTS;organicLight++){
    float organicBack=max(0.,dot(-normal,directionalLights[organicLight].direction));
    float organicRim=pow(1.-max(0.,dot(normal,geometryViewDir)),2.);
    vec3 organicTint=vec3(${skin?'1.,.32,.16':'.58,.85,.24'});
    reflectedLight.directDiffuse+=diffuseColor.rgb*directionalLights[organicLight].color*organicTint*
     (organicBack*organicBack)*getShadowMask()*(${skin?'.045':'.095'}+organicRim*${skin?'.025':'.04'});
   }
   #endif`);
 };
 material.customProgramCacheKey=()=>cacheKey+'-organic-'+kind+'-v1';
 return material;
}
