/* Exercise permission, mirrored coordinates, reacquisition, camera cleanup and two-frame arming. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {openPalm,palmPoint} = require('../meadow/hand-input.js');

const hand = Array.from({length:21}, () => ({x:.30,y:.7,z:0}));
for (const k of [5,9,13,17]) for(let i=0;i<4;i++) hand[k+i] = {x:.24+(k-5)*.009,y:.53-.058*i,z:0};
assert(openPalm(hand));
const closed = hand.map(v => ({...v}));
for (const k of [5,9,13,17]) closed[k+3] = {...closed[k],y:.57};
assert(!openPalm(closed));
assert(palmPoint(hand,hand).x>.65);
assert(!palmPoint(closed,closed));
assert(!openPalm(hand.slice(1)));

function harness(getStream) {
  const events = [], frames = new Map(), tracks = [];
  const video = {readyState:3,currentTime:0,play:async()=>{},pause(){}};
  let next = 0, worker;
  function media() {
    const track = {stopped:false,stop(){this.stopped=true}};
    tracks.push(track);
    return {getVideoTracks:()=>[track], getTracks:()=>[track]};
  }
  const context = {
    URL, console, setTimeout, clearTimeout, Worker:class {
      constructor(){worker=this}
      terminate(){this.terminated=true}
      postMessage(m){
        if (m.type==='init') queueMicrotask(()=>this.onmessage({data:{type:'ready'}}));
        if (m.type==='frame') this.onmessage({data:worker.result});
      }
    },
    navigator:{mediaDevices:{getUserMedia:async opts=>{assert.equal(opts.audio,false);return getStream?getStream(media):media()}}},
    document:{currentScript:{src:'https://example.test/meadow/hand-input.js'},createElement:()=>video,addEventListener(){},removeEventListener(){}},
    addEventListener(){},removeEventListener(){}, requestAnimationFrame:cb=>{frames.set(++next,cb);return next},
    cancelAnimationFrame:key=>frames.delete(key), OffscreenCanvas:class {}, createImageBitmap:async()=>({close(){}})
  };
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../meadow/hand-input.js'),'utf8'),context);
  const input = context.MeadowHandInput.create({onPoint:(x,y)=>events.push(['point',x,y]),onStatus:m=>events.push(['status',m]),onLost:()=>events.push(['lost']),onActive:b=>events.push(['active',b])});
  async function frame(result) {
    worker.result = {type:'result',...result};
    const [id,cb] = [...frames][0];frames.delete(id);video.currentTime+=.1;await cb(video.currentTime*1000);
  }
  return {input,events,tracks,frame,frames};
}
(async () => {
  const normal = harness();
  assert(await normal.input.start());assert.equal(normal.tracks.length,1);
  await normal.frame({present:true,point:{x:.2,y:.3}});
  assert.equal(normal.events.filter(e=>e[0]==='point').length,0);
  await normal.frame({present:true,point:{x:.3,y:.4}});
  assert.equal(normal.events.filter(e=>e[0]==='point').length,1);
  await normal.frame({present:true,point:null});
  assert.equal(normal.events.filter(e=>e[0]==='lost').length,1);
  await normal.frame({present:true,point:{x:.8,y:.4}});await normal.frame({present:true,point:{x:.8,y:.4}});
  assert.deepEqual(normal.events.filter(e=>e[0]==='point').pop(),['point',.8,.4]);
  normal.input.stop();
  assert(normal.tracks[0].stopped);assert.equal(normal.frames.size,0);
  assert(await normal.input.start());normal.tracks[1].onended();assert(normal.tracks[1].stopped);
  normal.input.dispose();assert.equal(await normal.input.start(),false);
  const denied=harness(async()=>{throw Object.assign(new Error(),{name:'NotAllowedError'})});
  assert.equal(await denied.input.start(),false);
  assert(denied.events.at(-1)[1].includes('权限'));assert.deepEqual(denied.events.filter(e=>e[0]==='active'),[['active',true],['active',false]]);
  let resolve;
  const cancelled=harness(media=>new Promise(r=>resolve=()=>r(media())));
  const waiting=cancelled.input.start();cancelled.input.stop();resolve();
  assert.equal(await waiting,false);assert(cancelled.tracks[0].stopped);
  console.log('PASS hand pose gating, mirrored pointer, start/stop, denial, lost tracking, reacquisition, cancellation, disconnected camera.');
})().catch(e=>{console.error(e);process.exitCode=1});
