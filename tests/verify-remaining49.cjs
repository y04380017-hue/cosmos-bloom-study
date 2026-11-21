// Catches skipped original references, static/flat petals, lost photo maps and missing special anatomy.
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const R=path.resolve(__dirname,'../collection');
assert(fs.existsSync(R+'/remaining49-specimens.json'),'49 remaining reference models are missing');
const added=require(R+'/remaining49-specimens.json'),records=require(R+'/remaining49-reference-records.json'),batch=require(R+'/remaining49-review.json');
const ids='009 016 035 055 056 101 117 128 137 149 201 234 259 260 262 303 311 323 330 331 332 349 368 369 371 382 383 389 390 394 398 405 406 416 424 428 434 435 436 437 440 441 442 445 446 447 455 457 471'.split(' ');
assert.deepEqual(added.map(c=>c.sourceId),ids);assert.deepEqual(batch.map(c=>c.sourceId),ids);
const old=[...require(R+'/specimens.json'),require(R+'/cosmos-specimen.json'),...require(R+'/cup26-specimens.json')];
assert.equal(new Set([...old,...added].map(c=>c.scientific)).size,83);assert.equal(added.filter(c=>c.category==='重瓣／多层型').length,5);
const T=require('../assets/three.min.js'),create=require(R+'/engine.js');
for(const c of added){
 const ref=records.find(r=>r.id===c.sourceId);assert.equal(c.source_sha256,ref.sha256);assert.equal(c.scientific,ref.scientific_name);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(R,c.photo))).digest('hex'),ref.sha256);
 c.surfaceMaps=require(R+'/textures/'+c.slug+'.json');assert.equal(c.surfaceMaps.source_sha256,ref.sha256);
 assert(c.surfaceMaps.validSampleFractions.every(x=>x>.90),c.slug+' sampled background in petal pigment');
 const model=create(T,c);let poses=[];
 for(const p of [0,.25,.5,.75,1]){
  model.update(p);model.group.updateMatrixWorld(true);
  model.group.traverse(o=>{if(o.isMesh){for(const key of ['position','normal'])for(const x of o.geometry.attributes[key]?.array||[])assert(Number.isFinite(x),c.slug+' nonfinite '+key+' at '+p)}});
  poses.push(Array.from(model.heads[0].petals[0].geometry.attributes.position.array));
 }
 const radius=a=>{let max=0;for(let i=0;i<a.length;i+=3)max=Math.max(max,Math.hypot(a[i],a[i+2]));return max};
 assert(radius(poses[0])<.7,c.slug+' unbounded closed bud');assert(radius(poses[2])>radius(poses[0])*1.15,c.slug+' half remains closed');assert(radius(poses[4])>radius(poses[2])*1.22,c.slug+' full not distinct');
 model.update(0);assert.deepEqual(Array.from(model.heads[0].petals[0].geometry.attributes.position.array),poses[0]);
 model.update(.4999);const a=Array.from(model.heads[0].petals[0].geometry.attributes.position.array);model.update(.5001);const b=model.heads[0].petals[0].geometry.attributes.position.array;assert(Math.max(...a.map((v,i)=>Math.abs(v-b[i])))<.025,c.slug+' phase jumps');
 model.update(1);let totalVertices=0;
 for(const head of model.heads)for(const p of head.petals){
  const d=p.geometry.userData,mid=d.mid,v=p.geometry.attributes.position;assert(d.shell,c.slug+' flat petal');totalVertices+=v.count;
  assert(mid[(d.N*(d.W+1)+d.W/2)*3+1]>mid[d.W/2*3+1]+.12,c.slug+' drooping distal centerline');
  assert.equal(v.count,d.topCount*2);
  for(const m of Array.isArray(p.material)?p.material:[p.material]){assert(m.isMeshPhysicalMaterial&&m.map&&m.bumpMap);assert.equal(m.map.colorSpace,T.SRGBColorSpace);assert.equal(m.bumpMap.colorSpace,T.NoColorSpace);assert.equal(m.metalness,0);assert(m.roughness>=.5&&m.roughness<=.75)}
  for(let i=0;i<d.topCount;i+=37){const a=new T.Vector3().fromBufferAttribute(v,i),b=new T.Vector3().fromBufferAttribute(v,i+d.topCount);assert(a.distanceTo(b)>.007&&a.distanceTo(b)<.03,c.slug+' shell collapsed')}
 }
 assert(totalVertices<400000,c.slug+' excessive interactive petal vertex budget');
 if(c.sourceId==='428'){const corona=model.group.getObjectByName('filament-corona');assert(corona&&corona.children.length>=3,'Passiflora colored filament rings missing');assert(model.group.getObjectByName('raised-gynophore'));assert.equal(model.group.getObjectByName('passion-anthers').count,5);assert.equal(model.group.getObjectByName('passion-stigmas').count,3)}
 if(c.sourceId==='234')assert(model.group.getObjectByName('fused-corolla'),'Platycodon fused cup missing');
 if(c.sourceId==='424')assert(Array.isArray(model.heads[0].petals[0].material),'Oxalis reverse pigment missing');
 if(c.sourceId==='331')assert(c.rings.some(r=>r.profile==='trilobe'),'Clarkia three-lobed petals missing');
 if(c.category==='重瓣／多层型')assert(c.rings.length>=2,c.slug+' multilayer reference lost inner whorl');
 console.log('PASS',c.sourceId,c.name,model.stats.heads+' heads',model.stats.petals+' petals');
}
console.log('PASS 49 photo-specific additions and complete 83-reference coverage');
