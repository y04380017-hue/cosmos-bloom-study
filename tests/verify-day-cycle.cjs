// Catches UTC drift, frozen hidden-tab clocks, discontinuous midnight and fixed-stage-only flowers.
const assert=require('assert'),fs=require('fs');
assert(fs.existsSync(require('path').join(__dirname,'../meadow/day-cycle.js')),'Missing local-clock daylight controller');
const D=require('../meadow/day-cycle.js');
const day=D.stateAt(11),afternoon=D.stateAt(16.5),dusk=D.stateAt(18.5),night=D.stateAt(23);
assert(day.opening>.98);assert(afternoon.opening<day.opening&&afternoon.opening>dusk.opening);assert(dusk.opening<.15);assert.equal(night.opening,0);
assert(day.sunDirection[1]>afternoon.sunDirection[1]&&afternoon.sunDirection[1]>dusk.sunDirection[1]);assert.equal(night.sunVisibility,0);
for(let h=0;h<24;h+=.02){const a=D.stateAt(h),b=D.stateAt((h+.001)%24);assert(Math.abs(a.opening-b.opening)<.005);assert(a.sunDirection.every(Number.isFinite));assert(a.ambient>=.7);}
assert(Math.abs(D.stateAt(23.999).ambient-D.stateAt(0).ambient)<.01);
let clock=new Date(2026,10,13,11,22,33),c=D.createController(()=>clock);
let s=c.tick(0);assert.equal(c.mode,'auto');assert(Math.abs(s.hour-(11+22/60+33/3600))<1e-9);assert.equal(s.opening,1);
c.setManual(18.5);for(let i=0;i<90;i++)s=c.tick(.05);assert(Math.abs(s.hour-18.5)<.001);assert(s.opening<.15);
clock=new Date(2026,10,13,7,12,0);c.setAuto();s=c.tick(0);assert(Math.abs(s.hour-7.2)<1e-9,'auto must immediately use local device time');
clock=new Date(2026,10,13,17,0,0);s=c.tick(0);assert.equal(s.hour,17,'returning after tab suspension must resync');
c.setManual(11);s=c.tick(.1);assert(s.hour>11&&s.hour<17,'preset changes must interpolate');
assert.equal(D.labelAt(11),'白天');assert.equal(D.labelAt(16.5),'午后');assert.equal(D.labelAt(18.5),'黄昏');assert.equal(D.labelAt(23),'夜间休憩');
console.log('PASS device local clock, daylight closure, midnight continuity, manual transition and immediate resync.');
