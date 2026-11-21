const assert=require('node:assert/strict');
const {describeHands}=require('../dist/meadow/hand-input.js');
const {create,route,row,worldPoint}=require('../dist/meadow/spring-camera.js');
const catalog=require('../dist/meadow/catalog.json');

function hand(x,folded){
  const p=Array.from({length:21},()=>({x,y:.72,z:0}));
  for(const k of [5,9,13,17]){
    for(let j=0;j<4;j++){
      p[k+j]={x:x+(k-11)*.008,y:.53-.05*j,z:0};
    }
    if(folded)p[k+3]={...p[k],y:.56};
  }
  return p;
}
const both={landmarks:[hand(.25,false),hand(.71,true)],
  handedness:[[{categoryName:'Right',score:.96}],[{categoryName:'Left',score:.95}]]};
const raw=describeHands(both),r=route();
assert.ok(raw[0].open && raw[0].extension>.8 && !raw[1].open && raw[1].extension<.15);
assert.ok(raw[0].x>raw[1].x);
const c=create();
let time=0;
function frame(hands,preferred='auto'){
  const step=r.frame(hands,preferred,time+=65);
  c.update(step.delta);return step;
}
const [flower,nav]=raw;
for(let i=0;i<4;i++)assert.equal(frame(raw).side,null);
for(let i=0;i<3;i++)frame([nav]);
assert.equal(frame(raw).side,'Left');
frame([nav,flower]);
const fixed={...c.view};
for(let i=0;i<12;i++){
  const m=frame([{...flower,x:flower.x-i*.013},nav]);
  assert.ok(m.bloom && !m.delta);assert.deepEqual(c.view,fixed);
}
for(let i=0;i<15;i++)frame([{...nav,x:nav.x+.01*i},flower]);
assert.deepEqual(c.view,fixed);
let paired=0;
for(let i=0;i<18;i++){
  const m=frame([{...nav,x:nav.x+.14+i*.009,size:nav.size*(1+i*.017),extension:i*.044},{...flower,x:flower.x-i*.01}]);
  if(m.delta)paired++;
}
assert.ok(paired>12 && c.view.pan>0 && c.view.zoom>fixed.zoom && c.view.travel>0);
const held={...c.view};
for(let i=0;i<9;i++){
  const m=frame([{...nav,x:nav.x+.14+17*.009,size:nav.size*(1+17*.017),extension:1-i*.1},{...flower,x:flower.x-.17+i*.01}]);
  assert.ok(!m.delta);assert.deepEqual(c.view,held);
}
frame([]);frame([flower]);assert.equal(frame([flower]).side,'Left');
assert.deepEqual(c.view,held);
r.reset(true);for(let i=0;i<3;i++)frame([flower]);assert.equal(frame(raw).side,'Right');
const ambiguous={...both,handedness:[both.handedness[0],both.handedness[0]]};
assert.deepEqual(describeHands(ambiguous),[]);
const {offset,wrap}=require('../dist/meadow/spring-camera.js');
for(const angle of [0,177,359,360,721,-1]){
  c.heading(angle);
  for(const y of [.1,.41,.55,.82,1])for(const x of [-.22,.25,.81,1.23]){
    const line=row(y,c.view),screen=.5+offset(x,line.center)*line.sx;
    const actual=worldPoint(screen,line.y,c.view);
    assert.ok(Math.abs(offset(actual.x,x))+Math.abs(actual.y-y)<1e-8);
  }
}
assert.ok(Math.abs(offset(.01,3.99)-.02)<1e-8);
c.heading(0);const original={...c.view};c.heading(360);assert.deepEqual(c.view,original);
c.update({x:2,depth:0,extension:0});assert.equal(c.view.pan,wrap(5.5));
assert.ok(catalog.length===83 && catalog.every(f=>f.scientific && f.family && f.genus && f.description));
console.log('PASS dual hands, swapped roles, duplicate rejection, independent zoom/pan/dolly, reacquisition, world picking coordinates and 83 species introductions.');
