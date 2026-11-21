// Catch incorrect category routing, uniform middle placement, sealed stage mapping,
// biased rotations/scales, non-reproducibility, and incorrect instance matrices.
const assert=require('assert'),fs=require('fs'),path=require('path');
const modulePath=path.join(__dirname,'../meadow/flower-scatter.js');
const api=fs.existsSync(modulePath)?require(modulePath):{};
assert.equal(typeof api.plan,'function','Missing procedural scatter planner');
const catalog=require('../meadow/catalog.json'),records=require('../collection/all83-reference-records.json');
const expected={'伞形微花／碎花毯型':'ground','丛生中花／群落型':'cluster','独生大花／焦点型':'focus'};
assert.equal(catalog.length,83);
for(const c of catalog)assert.equal(c.layer,expected[records.find(r=>r.id===c.sourceId).dimension_labels[2]],c.slug+' misclassified');
const options={referenceClumps:require('../meadow/reference-clumps.json'),seed:'verified-meadow'};
const layout=api.plan(catalog,options),p=layout.plants;
assert.equal(p.length,43750);assert.equal(new Set(p.map(x=>x.slug)).size,83);
assert.deepEqual(layout.counts,{ground:33000,cluster:10000,focus:750});
assert.deepEqual(layout.stages,{Bud:6563,Half:15312,Full:21875});
assert.deepEqual(api.plan(catalog,options),layout,'seed must replay exactly');
assert.notDeepEqual(api.plan(catalog,{seed:'different'}).plants,p,'different seed must regenerate');
const bins=Array(8).fill(0),scales=[];
for(const x of p){
 assert(Math.abs(x.x)<=150&&Math.abs(x.z)<=150);assert.equal(x.y,api.terrainHeight(x.x,x.z));
 assert(x.rotationY>=0&&x.rotationY<Math.PI*2);bins[Math.floor(x.rotationY/(Math.PI*2)*8)]++;
 const clump=layout.clumps[x.clump];assert([3,5,7,9].includes(clump.count));assert.equal(clump.slug,x.slug);
 assert(Math.hypot(x.x-clump.x,x.z-clump.z)<=.251);assert(x.scale>.27&&x.scale<.84);scales.push(x.scaleMultiplier);
 if(x.accent)assert(Math.min(Math.hypot(x.x+36.45,x.z-92.9),Math.hypot(x.x+46,x.z-81))<2.8);
 assert.equal(x.progress,{Bud:0,Half:.5,Full:1}[x.stage]);
 assert.equal(x.layer,catalog.find(c=>c.slug===x.slug).layer);
 assert(Math.abs(x.tiltZ)<=Math.PI/18);
}
for(const b of bins)assert(Math.abs(b-p.length/8)<p.length/8*.18,'yaw distribution biased');
const mean=scales.reduce((a,b)=>a+b,0)/scales.length,variance=scales.reduce((a,b)=>a+(b-mean)**2,0)/scales.length;
assert(Math.abs(mean-1)<.008);assert(variance>.004&&variance<.009,'scale must be truncated Gaussian, not uniform');
assert(!scales.includes(.75)&&!scales.includes(1.25),'clamping creates endpoint spikes');
function dispersion(layer){const h=Array(64).fill(0);for(const x of p.filter(x=>x.layer===layer))h[Math.min(7,Math.floor((x.x+150)/37.5))+8*Math.min(7,Math.floor((x.z+150)/37.5))]++;const m=h.reduce((a,b)=>a+b)/64;return Math.sqrt(h.reduce((a,b)=>a+(b-m)**2,0)/64)/m}
assert.equal(layout.driftFraction,.65);
const low=layout.clumps.filter(c=>c.layer==='ground');
for(const c of layout.clumps.filter(c=>c.layer==='focus'))assert(low.some(l=>Math.hypot(l.x-c.x,l.z-c.z)<.59),'focal group needs low companion flowers');
assert.throws(()=>api.plan(catalog,{width:0}),/width/);
assert.throws(()=>api.plan(catalog,{counts:{ground:-1}}),/count/);
assert.throws(()=>api.plan(catalog.map(c=>({...c,layer:'unknown'}))),/layer/);
assert.equal(api.plan(catalog,{width:8,depth:8,counts:{ground:11,cluster:57,focus:15}}).plants.length,83);
const T=require('../assets/three.min.js');
(async()=>{
 const geometry=new T.BoxGeometry(.3,1,.3);geometry.translate(0,.5,0);
 const materials={Bud:new T.MeshStandardMaterial({color:0x994411}),Half:new T.MeshStandardMaterial({color:0xb35522}),Full:new T.MeshStandardMaterial({color:0xcc6633})};
 const mini={plants:[{slug:'one',layer:'ground',stage:'Bud',x:2,y:0,z:-3,rotationY:Math.PI/2,scale:.8},{slug:'one',layer:'ground',stage:'Full',x:-2,y:0,z:4,rotationY:0,scale:1.2}]};
 const built=await api.instantiate(T,mini,{loadTemplate:async()=>({stages:Object.fromEntries(Object.entries(materials).map(([s,material])=>[s,{geometry,material}]))})});
 assert.equal(built.group.children.length,2);assert.equal(built.stats.instances,2);
 for(const mesh of built.group.children){assert(mesh.isInstancedMesh);const item=mesh.userData.plants[0];assert.equal(mesh.material,materials[item.stage]);const mat=new T.Matrix4();mesh.getMatrixAt(0,mat);const pos=new T.Vector3(),rot=new T.Quaternion(),scale=new T.Vector3();mat.decompose(pos,rot,scale);assert(pos.distanceTo(new T.Vector3(item.x,item.y,item.z))<1e-6);assert(Math.abs(scale.x-item.scale)<1e-6);assert(mesh.boundingSphere&&Number.isFinite(mesh.boundingSphere.radius));}
 built.dispose();assert.equal(built.group.children.length,0);
 await assert.rejects(()=>api.instantiate(T,mini,{loadTemplate:async()=>({stages:{}})}),/stage|template/);
 console.log(JSON.stringify({result:'PASS',plants:p.length,species:83,stages:layout.stages,scaleMean:mean,scaleVariance:variance,groundDispersion:dispersion('ground'),clusterDispersion:dispersion('cluster')}));
})();
