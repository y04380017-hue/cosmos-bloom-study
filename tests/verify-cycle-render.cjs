const assert=require('assert'),T=require('../assets/three.min.js'),E=require('../meadow/meadow-effects.js'),fs=require('fs');
const wind=E.createWind(T);assert.equal(typeof wind.setOpening,'function','Missing continuous opening uniform');
wind.setOpening(.3);const mat=new T.MeshStandardMaterial();wind.attach(mat,{cycle:true});const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader};mat.onBeforeCompile(shader);assert.equal(shader.uniforms.uMeadowOpening.value,.3);assert(shader.vertexShader.includes('positionBud'));assert(shader.vertexShader.includes('normalHalf'));
const shadow=wind.depthMaterial(true),depth={uniforms:{},vertexShader:T.ShaderLib.depth.vertexShader};shadow.onBeforeCompile(depth);assert.equal(depth.uniforms.uMeadowOpening,shader.uniforms.uMeadowOpening);assert(depth.vertexShader.includes('positionBud'));
assert.equal(wind.openingAt(20,-8,0),0);assert.equal(wind.openingAt(20,-8,1),1);assert.notEqual(wind.openingAt(20,-8,.5),wind.openingAt(60,17,.5));
assert(fs.existsSync(require('path').join(__dirname,'../meadow/cycle-field.js')),'Missing clear-horizon field');
// Noon sun must fit inside the default overview instead of leaving the frame.
const Cycle=require('../meadow/day-cycle.js'),framing=new T.PerspectiveCamera(55,1.25,.1,1800),focus=new T.Vector3(-44,1,9);
framing.position.set(focus.x+93*Math.sin(1.46)*Math.sin(-.23),focus.y+93*Math.cos(1.46),focus.z+93*Math.sin(1.46)*Math.cos(-.23));framing.lookAt(focus);framing.updateMatrixWorld();
for(const hour of [11,12.5]){const sun=new T.Vector3(...Cycle.stateAt(hour).sunDirection).multiplyScalar(500).add(framing.position).project(framing);assert(sun.y<.95&&sun.y>0,'daytime sun disc must stay inside overview');}
const F=require('../meadow/cycle-field.js');assert.equal(F.distanceRetention(85),1);assert(F.distanceRetention(300)>0);assert(F.distanceRetention(150)>F.distanceRetention(300));assert(Math.abs(F.distanceRetention(85.001)-1)<.001,'no sudden horizon cutoff');
const full=new T.BoxGeometry(.3,1,.3);full.translate(0,.5,0);const small=new T.TetrahedronGeometry(.2);small.translate(0,.5,0);
const model={cycle:{near:{geometry:full,material:mat},far:{geometry:small,material:mat},horizon:{geometry:small,material:mat}}};
const plants=[5,40,120,300].map((z,i)=>({slug:'one',stage:'Full',layer:'focus',x:0,y:0,z:-z,rotationY:0,scale:1.5,id:i}));
const camera=new T.PerspectiveCamera(55,1,.1,1800);camera.position.set(0,2,0);camera.lookAt(0,1,-100);camera.updateMatrixWorld();
(async()=>{
 const field=await F.instantiate(T,{plants,width:300,depth:300},{loadTemplate:()=>model,wind,extendHorizon:false});field.update(camera,true);
 const visible=field.group.children.filter(m=>m.visible);assert.equal(visible.reduce((n,m)=>n+m.count,0),4,'no naked 90m culling ring');assert.equal(field.group.children.find(m=>m.userData.lod==='near').count,1);assert.equal(field.group.children.find(m=>m.userData.lod==='horizon').count,2);
 assert.equal(visible[0].customDepthMaterial,shadow);camera.lookAt(0,1,100);camera.updateMatrixWorld();field.update(camera,true);assert.equal(field.stats.visible,0,'behind-camera instances must be culled');
 const resizePlants=[0,10].map(x=>({...plants[0],x,z:-20}));const resized=await F.instantiate(T,{plants:resizePlants,width:300,depth:300},{loadTemplate:()=>model,wind,extendHorizon:false});camera.lookAt(0,2,-100);camera.aspect=.5;camera.updateProjectionMatrix();resized.update(camera,true);assert.equal(resized.stats.visible,1);camera.aspect=2;camera.updateProjectionMatrix();assert(resized.update(camera),'projection changes must invalidate cached frustum');assert.equal(resized.stats.visible,2,'resize must reveal newly visible flowers');resized.dispose();
 const expanded=F.horizonPlants({plants:[...plants,{...plants[0],id:8,x:100,z:20}],width:300,depth:300});assert(expanded.length>plants.length);assert(expanded.some(p=>Math.abs(p.x)>150||Math.abs(p.z)>150));assert(expanded.every(p=>p.scale===1.5),'horizon plants must not become giant impostors');
 assert.equal(typeof field.pick,'function','Picking must follow GPU-deformed flowers');
 const moved=wind.deformPoint([.4,1,0],[0,1.1,0],[.2,1.05,0],{x:0,z:0,rotationY:0});assert(moved.every(Number.isFinite));
 wind.setOpening(0);wind.setStrength(0);assert.deepEqual(wind.deformPoint([.4,0,0],[0,0,0],[.2,0,0],{x:0,z:0,rotationY:0}),[0,0,0],'closed roots stay anchored');
 const head=new T.BoxGeometry(.3,.2,.3);head.translate(0,.8,0);for(const [name,shift] of [['Bud',.7],['Half',.35]]){const pos=head.attributes.position.clone();for(let i=0;i<pos.count;i++)pos.setX(i,pos.getX(i)+shift);head.setAttribute('position'+name,pos);head.setAttribute('normal'+name,head.attributes.normal)}head.boundingSphere=new T.Sphere(new T.Vector3(0,.8,0),2);
 const sample={geometry:head,material:mat},picking=await F.instantiate(T,{plants:[plants[0]],width:300,depth:300},{loadTemplate:()=>({cycle:{near:sample,far:sample,horizon:sample}}),wind,extendHorizon:false});camera.lookAt(0,1,-100);picking.update(camera,true);
 const ray=new T.Raycaster(new T.Vector3(1.05,1.2,0),new T.Vector3(0,0,-1));assert(picking.pick(ray),'closed head shifted from Full must be pickable');wind.setOpening(1);assert.equal(picking.pick(ray),null,'Full head must not keep closed-stage pick geometry');picking.dispose();
 field.dispose();wind.dispose();console.log('PASS continuous-opening uniforms, matching shadows, frustum visibility, clear distance and horizon baseline.');
})().catch(e=>{console.error(e);process.exit(1)});
