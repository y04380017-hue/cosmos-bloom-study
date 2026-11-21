/* Distant flower colour resolves the same planted groups after individual
 * petals fall below a pixel. Near the camera only the true meshes are shown. */
(function(root){
'use strict';
function raster(layout,catalog,size=384){
 const tint={blue:[113,176,232],light:[252,242,219],pink:[249,191,208],violet:[202,190,241],warm:[252,208,150],coral:[250,192,164]};
 const bySlug=new Map(catalog.map(s=>[s.slug,s.slug==='phlox-subulata'?tint.pink:tint[s.colorFamily]||tint.light]));
 const sums=new Float32Array(size*size*4),rgba=new Uint8Array(sums.length);
 for(const c of layout.clumps){
  const cx=(c.x/layout.width+.5)*size-.5,cz=(c.z/layout.depth+.5)*size-.5,t=bySlug.get(c.slug);
  const radius=(c.layer==='focus'?2.3:3.4)*size/layout.width,extent=Math.ceil(radius*1.7);
  for(let j=Math.max(0,Math.floor(cz)-extent);j<=Math.min(size-1,Math.ceil(cz)+extent);j++)
   for(let i=Math.max(0,Math.floor(cx)-extent);i<=Math.min(size-1,Math.ceil(cx)+extent);i++){
    const r=((i-cx)**2+(j-cz)**2)/(radius*radius);if(r>2.9)continue;
    const w=c.count*.105*Math.exp(-r*1.9),q=4*(j*size+i);
    for(let k=0;k<3;k++)sums[q+k]+=w*t[k];sums[q+3]+=w;
   }
 }
 for(let i=0;i<sums.length;i+=4){const w=sums[i+3];if(w<=0)continue;
  for(let j=0;j<3;j++)rgba[i+j]=Math.round(sums[i+j]/w);
  rgba[i+3]=Math.round(255*(1-Math.exp(-w*1.15)));
 }
 return rgba;
}
function attach(T,material){
 const cover={value:null},opening={value:1},extent={value:new T.Vector2(300,300)};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{uDrift:cover,uDriftOpening:opening,uFieldSize:extent});
  shader.vertexShader='varying vec3 driftWorld;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\ndriftWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader='varying vec3 driftWorld; uniform sampler2D uDrift; uniform vec2 uFieldSize; uniform float uDriftOpening;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 fieldUV=driftWorld.xz/uFieldSize+.5;
    vec4 ink=texture2D(uDrift,clamp(fieldUV,0.,1.));
    vec2 edge=min(fieldUV,1.-fieldUV);
    float inside=smoothstep(0.,.014,min(edge.x,edge.y));
    float distFade=smoothstep(17.,62.,distance(cameraPosition,driftWorld));
    float grain=.86+.14*sin(driftWorld.x*2.1+sin(driftWorld.z*1.6))*sin(driftWorld.z*2.8);
    diffuseColor.rgb=mix(diffuseColor.rgb,ink.rgb,ink.a*inside*distFade*grain*(.38+.54*uDriftOpening));`);
 };
 return {setLayout(layout,catalog){const s=384,t=new T.DataTexture(raster(layout,catalog,s),s,s,T.RGBAFormat);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;cover.value?.dispose();cover.value=t;extent.value.set(layout.width,layout.depth)},setOpening(v){opening.value=v},dispose(){cover.value?.dispose()}};
}
const api={raster,attach};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MeadowDriftCover=api;
})(typeof globalThis!=='undefined'?globalThis:this);
