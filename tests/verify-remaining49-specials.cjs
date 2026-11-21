// Regressions found in reference/model contact sheets: blade pigments, balloon gaps, buried florets.
const assert=require('assert'),T=require('../assets/three.min.js'),create=require('../collection/engine.js');
const all=require('../collection/remaining49-specimens.json');
const model=id=>{const c=all.find(c=>c.sourceId===id);return create(T,{...c,surfaceMaps:require('../collection/textures/'+c.slug+'.json')})};
for(const id of ['332','394'])for(const p of model(id).heads[0].petals){assert(Array.isArray(p.material));assert(p.material[0]!==p.material[2],id+' claw pigment leaked across entire blade')}
const balloon=model('234');balloon.update(0);const cover=balloon.group.getObjectByName('balloon-bud');assert(cover,'sealed balloon cover missing');assert(cover.visible&&cover.material.opacity===1);balloon.update(1);assert(!cover.visible,'balloon cover obscures open flower');
const zinnia=model('471');zinnia.update(1);zinnia.group.updateMatrixWorld(true);const f=zinnia.group.getObjectByName('yellow-disk-floret'),core=zinnia.group.getObjectByName('disk-core');f.geometry.computeBoundingBox();core.geometry.computeBoundingBox();assert(f.geometry.boundingBox.max.y>core.geometry.boundingBox.max.y*core.scale.y+.03,'yellow florets buried in red disk');
console.log('PASS claw pigments stay on claws, balloon seals and sheds, yellow disk florets remain exposed');
