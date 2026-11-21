// Regression contract: the user's accepted 34 models must keep their photo bytes and five-stage geometry.
require('./verify-baseline12.cjs');
const fs=require('fs'),crypto=require('crypto'),assert=require('assert'),path=require('path');
const R=path.resolve(__dirname,'..'),want=require('./accepted34-extra-fixtures.json'),T=require('../assets/three.min.js'),create=require('../collection/engine.js');
for(const [p,h] of Object.entries(want.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(R,p))).digest('hex'),h,'Accepted data changed: '+p);
for(const c of require('../collection/cup26-specimens.json')){
 c.surfaceMaps=require('../collection/textures/'+c.slug+'.json');const m=create(T,c),h=crypto.createHash('sha256');
 for(const p of [0,.25,.5,.75,1]){m.update(p);m.group.traverse(o=>{if(o.isMesh){h.update(o.geometry.attributes.position.array);if(o.isInstancedMesh)h.update(o.instanceMatrix.array);h.update(JSON.stringify(o.position.toArray()));}})}
 assert.equal(h.digest('hex'),want.geometry[c.slug],'Accepted geometry changed: '+c.slug);
}
console.log('PASS all accepted 34: immutable photos/maps/configs and five numerical geometry stages');
