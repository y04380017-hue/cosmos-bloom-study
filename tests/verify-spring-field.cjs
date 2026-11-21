// The meadow must remain empty until a local gesture. The gallery stays independent.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const catalog = require('../dist/meadow/catalog.json');
const {makeField, opening} = require('../dist/meadow/spring-field.js');
for (const aspect of [.48, 1, 1.77, 2.7]) {
  const field = makeField(catalog, aspect);
  assert.equal(field.count, 0);
  assert.equal(new Set(field.plants.map(p => p.species)).size, 83);
  assert.ok(field.plants.every(p => opening(p, 3600) === 0));
  assert.equal(field.wake(.5, .29, 5), 0);
  const local = field.wake(.52, .72, 5);
  const flowers = field.plants.filter(p => Number.isFinite(p.start));
  assert.ok(local > 0 && local < field.plants.length / 3);
  assert.ok(new Set(flowers.map(p => p.start)).size > 1);
  for (const flower of flowers) {
    assert.equal(opening(flower, 4), 0);
    assert.ok(opening(flower, flower.start + .5) > 0 && opening(flower, flower.start + .5) < 1);
    assert.equal(opening(flower, 12), 1);
  }
  assert.equal(field.wake(.52, .72, 15), 0);
  assert.equal(field.count, local);
  field.clear();
  assert.ok(field.plants.every(p => p.start === Infinity));
  assert.equal(field.count, 0);
}
const page = fs.readFileSync(path.join(root, 'meadow/index.html'), 'utf8');
assert.match(page, /href="\.\.\/flowers\/"/);
assert.doesNotMatch(page, /three\.min\.js|model-loader\.js/);
assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /url=\.\/meadow\//);
for (const plant of catalog) assert.ok(fs.existsSync(path.join(root, 'meadow', plant.detailUrl)));
console.log('PASS empty opening, 83 flower rows, delayed local blooms, persistence, reset, independent gallery, four aspect ratios.');

const {traceRibbon}=require('../dist/meadow/spring-field.js');
function sweep(fps,skipFrame=false){
  const bed=makeField(catalog,1.77);
  let stroke=null;
  for(let i=0;i<=fps*2;i++){
    if(skipFrame && i%7===3)continue;
    const fraction=i/(fps*2);
    stroke=traceRibbon(stroke,.16+.68*fraction,.71+.032*Math.sin(fraction*Math.PI*2),
      i/fps,1.77,'palm',(x,y,t)=>bed.wake(x,y,t,1.77,true));
  }
  const open=bed.plants.filter(p=>Number.isFinite(p.start));
  // Every portion of the ribbon must retain several flowers.
  for(let x=.17;x<.83;x+=.035)assert.ok(open.filter(p=>p.x>=x && p.x<x+.035).length>=5);
  return bed.count;
}
const regular=sweep(15), sparse=sweep(8,true), fast=sweep(30);
assert.ok(regular>500 && Math.abs(sparse/regular-1)<.06 && Math.abs(fast/regular-1)<.04);
console.log('Curved two-second sweep at 15 Hz, 8 Hz with dropped frames, and 30 Hz:',regular,sparse,fast);
