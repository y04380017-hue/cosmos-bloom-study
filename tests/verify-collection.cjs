const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');const file=path.join(root,'collection/engine.js');
assert(fs.existsSync(file),'Missing eleven-flower modeling engine');
const THREE=require('../assets/three.min.js');const create=require(file);
const configs=require('./load-specimens.cjs').filter(c=>!c.runtime);assert.equal(configs.length,11);
const expectedHeads={phlox:17,spiraea:42,flax:3,single:1};const results=[];
for(const c of configs){
 const model=create(THREE,c);assert.equal(model.heads.length,expectedHeads[c.layout]);
 for(const h of model.heads)assert.equal(h.petals.length,c.rings.reduce((n,r)=>n+r.count,0));
 const poses=[];
 for(const p of [0,.25,.5,.75,1]){
  model.update(p);let triangles=0;model.group.updateMatrixWorld(true);
  model.group.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;for(const key of ['position','normal'])if(g.attributes[key])for(const value of g.attributes[key].array)assert(Number.isFinite(value),`${c.slug} nonfinite ${key} at ${p}`);triangles+=(g.index?.count||g.attributes.position.count)/3});
  const arr=Array.from(model.heads[0].petals[0].geometry.attributes.position.array);poses.push(arr);assert(triangles>100);
 }
 const radial=arr=>Math.max(...arr.filter((_,i)=>i%3===0).map((x,i)=>Math.hypot(x,arr[i*3+2])));
 assert(radial(poses[4])>radial(poses[0])*1.7,`${c.slug} bloom does not expand`);
 assert.notDeepEqual(poses[0],poses[2]);assert.notDeepEqual(poses[2],poses[4]);
 model.update(0);assert.deepEqual(Array.from(model.heads[0].petals[0].geometry.attributes.position.array),poses[0],`${c.slug} reset changed closed pose`);
 model.update(1);assert.deepEqual(Array.from(model.heads[0].petals[0].geometry.attributes.position.array),poses[4]);
 model.update(.4999);const a=Array.from(model.heads[0].petals[0].geometry.attributes.position.array);model.update(.5001);const b=Array.from(model.heads[0].petals[0].geometry.attributes.position.array);assert(Math.max(...a.map((v,i)=>Math.abs(v-b[i])))<.02,`${c.slug} discontinuity around half bloom`);
 if(c.center.type==='poppy'){assert(model.group.getObjectByName('stigma-cap'));assert(!model.group.getObjectByName('disk-core'))}
 if(c.center.type==='disk')assert(model.group.getObjectByName('disk-core'));
 if(c.profile==='trilobed'||c.edge==='serrate'){
  model.update(1);const p=model.heads[0].petals[0].geometry.attributes.position;const ring=[];for(let k=0;k<=32;k++){const i=28*33+k;ring.push(Math.hypot(p.getX(i),p.getZ(i)))}
  let peaks=0;for(let k=1;k<ring.length-1;k++)if(ring[k]>ring[k-1]&&ring[k]>ring[k+1])peaks++;
  assert(peaks>=(c.profile==='trilobed'?3:5),`${c.slug} missing distinct lobes/teeth`);
 }
 results.push({flower:c.name,heads:model.heads.length,petalsPerHead:model.heads[0].petals.length,states:5,status:'PASS'});
}
console.log(JSON.stringify(results,null,2));console.log('All 11 geometry/morph checks passed. GPU rendering is a separate check.');
