// The approved twelve are an explicit immutable visual baseline for this batch.
const fs=require('fs'),crypto=require('crypto'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),T=require('../assets/three.min.js'),create=require('../collection/engine.js'),specs=require('./load-specimens.cjs');
for(const [p,want] of Object.entries(require('./baseline12-files.json')))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'),want,'Approved source/texture/archive changed: '+p);
const expected=require('./baseline12-geometry.json');
for(const c of specs.filter(x=>!x.runtime)){
 const m=create(T,c),hash=crypto.createHash('sha256');for(const p of [0,.25,.5,.75,1]){m.update(p);m.group.traverse(o=>{if(o.isMesh){hash.update(o.geometry.attributes.position.array);if(o.isInstancedMesh)hash.update(o.instanceMatrix.array);hash.update(JSON.stringify(o.position.toArray()));}})}
 assert.equal(hash.digest('hex'),expected[c.slug],'Approved geometry changed: '+c.slug);
}
console.log('PASS approved twelve: unchanged source photos/material maps, five geometry stages, Cosmos runtime and old archives');
