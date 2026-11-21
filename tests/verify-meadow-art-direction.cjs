// Spatial/color pipeline regressions from the user's V11 screenshot.
const assert=require('assert'),T=require('../assets/three.min.js'),S=require('../meadow/flower-scatter.js'),D=require('../meadow/day-cycle.js'),Sky=require('../meadow/day-sky.js'),E=require('../meadow/meadow-effects.js');
const catalog=require('../meadow/catalog.json'),layout=S.plan(catalog,{seed:'flower-meadow-83'}),ground=layout.plants.filter(p=>p.layer==='ground');
// Use adjacent cells at ~1m separation, not implementation patch IDs.
const cells=new Map();for(const p of ground){const k=Math.floor(p.x)+','+Math.floor(p.z);cells.set(k,p)}
let pairs=0,same=0;for(const p of ground){const other=cells.get((Math.floor(p.x)+1)+','+Math.floor(p.z));if(other){pairs++;if(p.slug===other.slug)same++}}
assert(same/pairs>.55,'ground species are still per-plant confetti: '+same/pairs);
assert.equal(new Set(layout.plants.map(p=>p.slug)).size,83);for(const p of layout.plants)assert.equal(p.layer,catalog.find(c=>c.slug===p.slug).layer);
assert(D.stateAt(11).sunIntensity>3*D.stateAt(11).ambient,'flat ambient fill still dominates daylight');
const scene=new T.Scene(),sky=Sky.create(T,scene);assert.equal(sky.material.toneMapped,false,'authored sky must keep its chroma in direct output');assert(sky.material.fragmentShader.includes('vec4(sky,0.0)'),'sky coverage mask must survive the HDR target');sky.dispose();
const wind=E.createWind(T),mat=new T.MeshStandardMaterial();
wind.attach(mat,{cycle:true});
const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
mat.onBeforeCompile(shader);
assert(shader.fragmentShader.includes('float paintedLight'),'flower colour shader must use the painted diffuse response');
assert(sky.material.fragmentShader.includes('farRidge')&&sky.material.fragmentShader.includes('cloudLobe'));
wind.dispose();mat.dispose();
const screens=[],renderer={capabilities:{isWebGL2:true,maxSamples:4},extensions:{has:()=>true},setRenderTarget(){},render(s){if(s!==scene)screens.push(s.children[0].material)}};
const lens=E.createBloom(T,renderer);lens.resize(1200,800);lens.setFocus(6);lens.render(scene,new T.PerspectiveCamera());const composite=screens.at(-1);
assert(composite.fragmentShader.includes('toneMapping('));assert(composite.fragmentShader.includes('surfaceCoverage'),'sky must bypass surface ACES in composed output');
assert(composite.fragmentShader.includes('lensWeight'),'depth filtering must reject foreground/sky bleed');assert(composite.uniforms.uLensRadius.value>=6,'distant softness must exceed subpixel cross blur');lens.dispose();
console.log(JSON.stringify({result:'PASS',adjacentSameSpecies:same/pairs,species:83,daylightKeyFill:D.stateAt(11).sunIntensity/D.stateAt(11).ambient}));
