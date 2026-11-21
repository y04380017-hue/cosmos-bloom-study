// Catches frozen/synchronized wind, moving roots, mismatched shadow shader,
// incorrect near/far compaction and selection metadata after camera movement.
const assert=require('assert'),fs=require('fs'),T=require('../assets/three.min.js');
const file=require('path').resolve(__dirname,'../meadow/meadow-effects.js');
assert(fs.existsSync(file),'Missing wind and distance-rendering module');
const E=require(file);
const wind=E.createWind(T);
const root=wind.offset(5,-9,0,3),tip1=wind.offset(5,-9,1,3),tip2=wind.offset(45,39,1,3),later=wind.offset(5,-9,1,8);
assert.deepEqual(root,[0,0]);assert(Math.hypot(...tip1)>.001);assert.notDeepEqual(tip1,tip2);assert.notDeepEqual(tip1,later);assert(Math.hypot(...tip1)<.16);
const material=new T.MeshStandardMaterial();wind.attach(material);wind.setTime(12);
const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader};material.onBeforeCompile(shader);
assert.equal(shader.uniforms.uMeadowTime.value,12);assert(shader.vertexShader.includes('instanceMatrix'));assert(shader.vertexShader.includes('meadowBend'));
const depth=wind.depthMaterial(),depthShader={uniforms:{},vertexShader:T.ShaderLib.depth.vertexShader};depth.onBeforeCompile(depthShader);
assert.equal(depthShader.uniforms.uMeadowTime,shader.uniforms.uMeadowTime);assert(depthShader.vertexShader.includes('meadowBend'));
assert(!shader.vertexShader.includes('#include <begin_vertex>'),'wind hook must replace begin_vertex');
// HDR is optional even on WebGL2. A missing extension must not make the default view black.
for(const hdr of [false,true]){
 let active=null,sceneRenderTarget;
 const scene=new T.Scene(),renderer={capabilities:{isWebGL2:true,maxSamples:4},extensions:{has:name=>hdr&&name==='EXT_color_buffer_float'},setRenderTarget:t=>active=t,render:s=>{if(s===scene)sceneRenderTarget=active}};
 const bloom=E.createBloom(T,renderer);bloom.resize(1000,600);bloom.render(scene,new T.PerspectiveCamera());
 if(!hdr){assert.equal(sceneRenderTarget,null,'unsupported HDR must render directly without clipping light into an 8-bit target');assert.equal(bloom.supported,false);bloom.dispose();continue}
 assert.equal(bloom.supported,true);assert.equal(sceneRenderTarget.texture.type,T.HalfFloatType);
 assert.equal(sceneRenderTarget.samples,4,'bloom must preserve antialiasing on thin petals');assert.equal(sceneRenderTarget.width,1000);assert.equal(active,null,'composition must return to canvas');
 bloom.render(scene,new T.PerspectiveCamera(),false);assert.equal(sceneRenderTarget,null);bloom.dispose();
}
const geo=new T.BoxGeometry(.3,1,.3);geo.translate(0,.5,0);const low=new T.TetrahedronGeometry(.2);low.translate(0,.5,0);
const template={stages:{Full:{geometry:geo,material}},farStages:{Full:{geometry:low,material}}};
const plants=[0,10,40,130].map((x,i)=>({slug:'test',layer:'focus',stage:'Full',x,y:0,z:0,rotationY:0,scale:1.5,id:i}));
(async()=>{
 const built=await E.instantiate(T,{plants},{loadTemplate:()=>template,wind});
 built.update(new T.Vector3(0,2,0),true);
 assert.equal(built.stats.instances,4);assert.equal(built.stats.drawn,3);
 const near=built.group.children.find(m=>m.userData.lod==='near'),far=built.group.children.find(m=>m.userData.lod==='far');
 assert.deepEqual(near.userData.plants.map(p=>p.id),[0,1]);assert.deepEqual(far.userData.plants.map(p=>p.id),[2]);
 assert.equal(near.customDepthMaterial,depth);assert(near.boundingSphere.radius>5);
 built.update(new T.Vector3(111,2,0),true);
 assert.equal(built.stats.drawn,3);assert.deepEqual(near.userData.plants.map(p=>p.id),[3]);assert.deepEqual(far.userData.plants.map(p=>p.id),[1,2]);
 const m=new T.Matrix4();near.getMatrixAt(0,m);assert.equal(m.elements[12],130);assert.equal(m.elements[0],1.5);
 built.setLayer('focus',false);assert(built.group.children.every(m=>!m.visible));assert.equal(built.stats.visible,0);
 built.setLayer('focus',true);assert.equal(built.stats.visible,3);
 let sourceDisposed=false;geo.addEventListener('dispose',()=>sourceDisposed=true);built.dispose();assert(!sourceDisposed);assert.equal(built.group.children.length,0);wind.dispose();
 console.log('PASS dynamic wind anchors, spatial phase, shared shadow time, near/far culling, compacted picking and ownership.');
})().catch(e=>{console.error(e);process.exit(1)});
