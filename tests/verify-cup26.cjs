// Catches omissions, duplicate substitutes, flat/static morphs and wrong reproductive anatomy.
const assert=require('assert'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const R=path.resolve(__dirname,'../collection');
assert(fs.existsSync(R+'/cup26-specimens.json'),'The 22 additional reference studies are missing');
const added=require(R+'/cup26-specimens.json'),batch=require(R+'/cup26-review.json');
assert.equal(added.length,22);assert.equal(batch.length,26);
const ids=['051','052','053','141','159','174','176','213','218','301','312','320','327','337','347','360','376','380','402','404','419','423','425','426','427','444'];
assert.deepEqual(batch.map(c=>c.sourceId),ids);
assert.equal(new Set(batch.map(c=>c.slug)).size,26);
const old=[...require(R+'/specimens.json'),require(R+'/cosmos-specimen.json')];
assert.equal(new Set([...old,...added].map(c=>c.scientific)).size,34);
assert.deepEqual(batch.filter(c=>old.some(x=>x.slug===c.slug)).map(c=>c.sourceId),['141','159','402','427']);
const T=require('../assets/three.min.js'),create=require(R+'/engine.js');
const counts={'051':8,'052':6,'053':6,'174':5,'176':4,'213':4,'218':6,'301':5,'312':6,'320':5,'327':5,'337':8,'347':4,'360':4,'376':5,'380':5,'404':5,'419':4,'423':5,'425':7,'426':8,'444':5};
for(const c of added){
 c.surfaceMaps=require(R+'/textures/'+c.slug+'.json');const model=create(T,c);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(R,c.photo))).digest('hex'),c.source_sha256);
 assert.equal(c.surfaceMaps.source_sha256,c.source_sha256);
 assert(model.heads.length>0,c.slug+' missing heads');
 assert.equal(model.heads[0].petals.length,counts[c.sourceId],c.slug+' wrong visible petal arrangement');
 let poses=[];
 for(const p of [0,.25,.5,.75,1]){
  model.update(p);model.group.traverse(o=>{if(o.isMesh)for(const k of ['position','normal'])for(const x of o.geometry.attributes[k]?.array||[])assert(Number.isFinite(x),c.slug+' non-finite geometry at '+p)});
  if(p===0)model.group.traverse(o=>{if(o.name==='petal')for(const v of o.geometry.attributes.position.array)assert(Math.abs(v)<3,c.slug+' unbounded closed petals')});
  poses.push(Array.from(model.heads[0].petals[0].geometry.attributes.position.array));
 }
 const radius=a=>Math.max(...a.filter((_,i)=>i%3===0).map((x,i)=>Math.hypot(x,a[i*3+2])));
 assert(radius(poses[2])>radius(poses[0])*1.2,c.slug+' half is still closed');
 assert(radius(poses[4])>radius(poses[2])*1.3,c.slug+' bloom is not distinct from half');
 model.update(0);assert.deepEqual(Array.from(model.heads[0].petals[0].geometry.attributes.position.array),poses[0]);
 model.update(.4999);const a=Array.from(model.heads[0].petals[0].geometry.attributes.position.array);model.update(.5001);const b=model.heads[0].petals[0].geometry.attributes.position.array;
 assert(Math.max(...a.map((v,i)=>Math.abs(v-b[i])))<.02,c.slug+' half-stage discontinuity');
 model.update(1);
 for(const p of model.heads[0].petals){
  const d=p.geometry.userData,mid=d.mid;assert(d.shell,c.slug+' flat petal');
  assert(mid[(d.N*(d.W+1)+d.W/2)*3+1]>mid[d.W/2*3+1]+.15,c.slug+' droops');
  const g=p.geometry,v=g.attributes.position,m=p.material;assert.equal(v.count,d.topCount*2);assert.equal(g.attributes.uv.count,v.count);
  assert(m.isMeshPhysicalMaterial&&m.map.isDataTexture&&m.bumpMap.isDataTexture,c.slug+' missing photo physical material');
  assert.equal(m.map.colorSpace,T.SRGBColorSpace);assert.equal(m.bumpMap.colorSpace,T.NoColorSpace);assert.equal(m.metalness,0);assert(m.roughness>=.5&&m.roughness<=.75);
  for(let i=0;i<d.topCount;i+=11){const a=new T.Vector3().fromBufferAttribute(v,i),b=new T.Vector3().fromBufferAttribute(v,i+d.topCount);assert(a.distanceTo(b)>.009&&a.distanceTo(b)<.025,c.slug+' shell thickness lost')}
  const row=Math.round(d.N*.55),left=row*(d.W+1),right=left+d.W,center=left+d.W/2;assert((mid[left*3+1]+mid[right*3+1])/2>mid[center*3+1]+.025,c.slug+' edges lack upward curl');
 }
 if(c.sourceId==='301')assert(model.group.getObjectByName('staminal-column'),'Hibiscus-family reference missing projecting column');
 if(['176','419'].includes(c.sourceId))assert.equal(model.group.getObjectByName('cross-stigma').children.length,4,'Oenothera missing four stigma arms');
 if(c.sourceId==='337')assert(model.group.getObjectByName('disk-core'),'Chocolate cosmos needs a floret disk');
 console.log('PASS',c.sourceId,c.name,model.stats.heads+' heads',model.stats.petals+' petals');
}
console.log('PASS 26 source mappings and 22 new continuous 3D studies');
