const assert=require('node:assert/strict');
const field=require('../dist/meadow/spring-field.js');
const camera=require('../dist/meadow/spring-camera.js');
const catalog=require('../dist/meadow/catalog.json');
const nav=camera.create(), roles=camera.route(), tiles=Array.from({length:4},(_,i)=>
  field.makeField(catalog,1.6,19731+i*131,i));
function hand(side,x,y){return {side,x,y,size:.13,extension:.95,open:true};}
const right=hand('Right',.33,.27),left=hand('Left',.72,.39);
let tick=0;
function track(hands){return roles.frame(hands,'bloomFirst',tick+=67);}
for(let i=0;i<4;i++)track([right]);
assert.equal(track([right,left]).side,'Left');
const initial={...nav.view};
for(let i=0;i<12;i++){
  const result=track([{...right,x:.33+i*.012},left]);
  assert.ok(result.bloom && !result.delta);nav.update(result.delta);
}
assert.deepEqual(nav.view,initial);
for(let i=0;i<19;i++){
  const result=track([{...right,x:.46+i*.009},{...left,y:.39-.012*i}]);
  nav.update(result.delta);
}
assert.ok(nav.view.focus>.5);
function worldAtPalm(x,y){const aim=camera.palmTarget(x,y,nav.view,field.groundAt);return camera.worldPoint(x,aim.y,nav.view);}
function plantAt(x,y,time){
  const w=camera.worldPoint(x,y,nav.view);
  tiles.forEach((tile,i)=>tile.wake(.5+camera.offset(w.x,i+.5),Math.max(w.y,field.groundAt(w.x)),time,1.6,true));
}
function project(wx,wy){const r=camera.row(wy,nav.view);return [.5+camera.offset(wx,r.center)*r.sx,r.y];}
for(const angle of [0,90,180,270,315]){
  nav.heading(angle);nav.focus(1);
  const before=tiles.reduce((n,t)=>n+t.count,0);
  let previous=null;
  for(let i=0;i<=30;i++){
    const x=.13+.74*i/30,aim=camera.palmTarget(x,.265+.009*Math.sin(i/4),nav.view,field.groundAt);
    const w=worldAtPalm(x,.265+.009*Math.sin(i/4));
    assert.ok(w.y>=field.groundAt(w.x) && w.y-field.groundAt(w.x)<.018);
    previous=field.traceRibbon(previous,x,aim.y,i/15,1.6,'palm',plantAt);
  }
  const after=tiles.reduce((n,t)=>n+t.count,0);
  assert.ok(after-before>35,'far ribbon '+angle);
}
const bloom=tiles[0].plants.find(p=>isFinite(p.start)&&p.y<.41);
assert.ok(bloom,'flowers must grow above the old cutoff');
nav.heading(0);nav.focus(0);
const opening=bloom.start, point=project(bloom.x,bloom.y);
nav.focus(1);const focused=project(bloom.x,bloom.y);
assert.ok(Math.abs(point[1]-focused[1])>.025);
const picked=camera.worldPoint(...focused,nav.view);
assert.ok(Math.abs(camera.offset(picked.x,bloom.x))+Math.abs(picked.y-bloom.y)<1e-8);
nav.heading(360);nav.focus(0);assert.deepEqual(project(bloom.x,bloom.y),point);assert.equal(bloom.start,opening);
console.log('PASS right-hand assignment, locked sweep, vertical camera gesture, ridge planting at five headings, persistent flower after turn and dolly.');
