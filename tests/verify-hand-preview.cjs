const assert=require('node:assert/strict');
const {create}=require('../dist/meadow/hand-preview.js');
const {describeHands}=require('../dist/meadow/hand-input.js');
const paths=[], labels={};let path=[];
const ctx=new Proxy({
  beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},
  stroke(){if(this.lineWidth===4)paths.push(path);}
},{get:(target,key)=>target[key]||(()=>{})});
const canvas={width:320,height:240,getContext:()=>ctx};
const panel={hidden:true,querySelector:q=>q==='canvas'?canvas:labels};
const preview=create(panel);
const points=Array.from({length:21},(_,i)=>({x:.3+(i%4)*.01,y:.5+i*.004,z:0}));
const raw=describeHands({landmarks:[points],handedness:[[{categoryName:'Right',score:.98}]]});
assert.equal(raw[0].points.length,21);
assert.deepEqual(raw[0].points[3],[1-points[3].x,points[3].y]);
const hand=raw[0];
const action={side:'Left',bloom:true,added:8};
preview.active(true);preview.frame([hand],action);
assert.equal(panel.hidden,false);assert.match(labels.textContent,/正在生成花带/);
preview.frame([{...hand,x:hand.x+.02}],action);
assert.equal(paths.length,1);
preview.frame([],{});assert.match(labels.textContent,/未追踪/);
paths.length=0;preview.frame([{...hand,x:hand.x+.1}],action);
assert.equal(paths.length,1,'old segment still visible, no bridge over lost detection');
preview.frame([{...hand,points:hand.points.map(()=>[.995,.5])},{...hand,side:'Left'}],{side:'Left',navigating:true});
assert.match(labels.textContent,/正在取景.*边缘/);
preview.frame([hand],{paused:true});assert.match(labels.textContent,/暂停/);
preview.active(false);assert.equal(panel.hidden,true);assert.equal(labels.textContent,'');
console.log('PASS mirrored hand joints, role/action feedback, tracking gaps, frame boundaries and shutdown');
