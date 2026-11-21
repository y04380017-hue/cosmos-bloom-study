// Exercise the shipped page scripts and real model packs. Only DOM and GPU
// rendering are replaced: this catches broken scene wiring and control actions.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../dist/meadow'),T=require('../assets/three.min.js');
class E{
 constructor(tag='div'){this.tag=tag;this.dataset={};this.listeners={};this.children=[];this.style={};this.classList={toggle(){}};this.checked=true;this.disabled=false;this.hidden=false;this.textContent='';this.value='';this.clientWidth=1000;this.clientHeight=680}
 setAttribute(n,v){this[n]=v}removeAttribute(n){delete this[n]}getAttribute(n){return this[n]??null}append(...x){this.children.push(...x)}prepend(x){this.children.unshift(x)}addEventListener(n,f){this.listeners[n]=f}setPointerCapture(){}getBoundingClientRect(){return {left:0,top:0,width:1000,height:680}}
}
async function run(failRenderer=false){
 const els={},el=s=>els[s]??=new E(),layers=['focus','cluster','ground'].map(layer=>Object.assign(new E(),{dataset:{layer}})),views=['overview','turn','top','side','entry','hover'].map(view=>Object.assign(new E(),{dataset:{view}})),windowListeners={};
 el('#timeMode').value='auto';el('#timeSlider').value='660';el('#density').value='1';el('#seed').value='flower-meadow-83';let raf,rendered,camera,rendererDisposed=false;const errors=[];
 const Three={...T,WebGLRenderer:class{constructor(){if(failRenderer===true)throw new Error('GPU unavailable for test');this.domElement=new E('canvas');this.shadowMap={};this.capabilities={maxAttributes:typeof failRenderer==='number'?failRenderer:16}}setPixelRatio(){}setSize(){}setRenderTarget(){}render(s,c){if(s.getObjectByName('procedural-flower-meadow')){rendered=s;camera=c}}dispose(){rendererDisposed=true}}};
 const ctx={addEventListener(){},removeEventListener(){},THREE:Three,console:{error:e=>errors.push(e.message),warn(){},log(){}},setTimeout,clearTimeout,setInterval,clearInterval,atob,Blob,Response,TextDecoder,DecompressionStream,Date,document:{hidden:false,createElement:tag=>new E(tag),querySelector:s=>s.startsWith('[data-layer=')?layers.find(e=>e.dataset.layer===s.match(/"(.*?)"/)[1]):el(s),querySelectorAll:s=>s==='[data-layer]'?layers:s==='[data-view]'?views:s==='button,select,input'?[el('#density'),el('#seed'),el('#regenerate'),el('#applySeed'),...layers,...views]:[],addEventListener(){},removeEventListener(){}},window:{devicePixelRatio:1,addEventListener:(n,f)=>windowListeners[n]=f},ResizeObserver:class{constructor(cb){this.cb=cb}observe(){this.cb()}},requestAnimationFrame:f=>raf=f,fetch:async url=>{const file=path.resolve(ROOT,url);assert(file.startsWith(ROOT+'/'));return new Response(fs.readFileSync(file))}};
 vm.createContext(ctx);for(const file of ['flower-scatter.js','model-loader.js','meadow-effects.js','day-cycle.js','day-sky.js','cycle-field.js','understory.js','drift-cover.js','flight.js','bloom-trail.js','hand-input.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),ctx);
 // The painting renderer has its own phase and hit tests; mock only its canvas.
 ctx.MeadowFlightPreview={create(stage){const element=new E('canvas');stage.prepend(element);return {element,update(){},point(){},end(){},pick(){},setShot(){},setInteractive(){},setFlying(){},dispose(){}}}};
 await vm.runInContext(fs.readFileSync(path.join(ROOT,'viewer.js'),'utf8'),ctx);
 assert.equal(el('#speciesList').children.reduce((n,s)=>n+s.children.length-1,0),83);
 if(failRenderer){assert(el('#triangleCount').textContent.includes('WebGL'));assert(el('#loader').hidden);assert(el('#density').disabled);views[3].onclick();el('#timeSlider').value='990';el('#timeSlider').oninput();for(let i=0;i<85;i++)raf(2000+i*50);assert(el('#stage').children[0].src.endsWith('side-Half.webp'));if(failRenderer===8)assert(rendererDisposed,'unsupported renderer must be disposed');windowListeners.pagehide({persisted:false});return}
 assert.deepEqual(errors,[]);assert.equal(el('#loader').hidden,true);assert(el('#bloom').disabled,'non-HDR device should clearly expose direct rendering fallback');raf(1000);assert(rendered&&camera);assert(camera.position.y-ctx.FlowerScatter.terrainHeight(camera.position.x,camera.position.z)<2.7,'default view should stand among flowers');
 let meadow=rendered.getObjectByName('procedural-flower-meadow');assert(meadow);assert(meadow.children.some(m=>m.visible&&m.count>0));assert.equal(el('#count-ground').textContent,'33,000');assert.equal(rendered.fog,null,'fog must be completely removed');assert(rendered.getObjectByName('clear-day-sky'));assert(rendered.getObjectByName('daylight-sun'));
 assert.equal(new Set(meadow.children.map(m=>m.userData.slug)).size,83);
 // Check the assembled scene: spring grass, a brighter blade tip, and the
 // nearest focus bloom visibly off-centre in the actual default camera.
 const turf=rendered.children.find(o=>o.isMesh&&o.geometry.type==='PlaneGeometry');
 const blade=rendered.getObjectByName('meadow-grass-blades');
 const turfColours=turf.geometry.attributes.color;
 for(let i=0;i<turfColours.count;i+=71){
  assert(turfColours.getY(i)>.43&&turfColours.getY(i)>turfColours.getX(i)&&turfColours.getY(i)>turfColours.getZ(i));
 }
 const bladeColours=blade.geometry.attributes.color;
 assert(bladeColours.getY(bladeColours.count-1)>bladeColours.getY(0)&&blade.material.vertexColors);
 const nearby=meadow.children.filter(m=>m.userData.lod==='near').flatMap(m=>m.userData.plants);
 assert(nearby.filter(p=>camera.position.distanceTo(new T.Vector3(p.x,p.y+p.scale,p.z))<3).length>=8,'flight needs a readable foreground');
 assert(camera.getWorldDirection(new T.Vector3()).y<-.4);
 for(const kind of ['rosette','grass','seed','clover'])assert(rendered.getObjectByName('understory/'+kind).count>0);
 const testShader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader};meadow.children[0].material.onBeforeCompile(testShader);raf(2000);const t1=testShader.uniforms.uMeadowTime.value;raf(2040);assert(testShader.uniforms.uMeadowTime.value>t1,'visible scene must animate wind');el('#wind').checked=false;el('#wind').onchange();const paused=testShader.uniforms.uMeadowTime.value;raf(2080);raf(2120);assert.equal(testShader.uniforms.uMeadowTime.value,paused);el('#wind').checked=true;el('#wind').onchange();
el('#timeMode').value='manual';el('#timeMode').onchange();el('#timeSlider').value='660';el('#timeSlider').oninput();for(let i=0;i<75;i++)raf(2200+i*50);assert.equal(Math.round(testShader.uniforms.uMeadowOpening.value*100),100);const noonSun=rendered.getObjectByName('daylight-sun').position.clone();
 el('#timeSlider').value='1110';el('#timeSlider').oninput();for(let i=0;i<75;i++)raf(6000+i*50);assert(testShader.uniforms.uMeadowOpening.value<.15);assert(rendered.getObjectByName('daylight-sun').position.y<noonSun.y);assert(el('#clockState').textContent.includes('黄昏'));
 el('#timeMode').value='auto';el('#timeMode').onchange();raf(10000);assert(el('#clockMode').textContent.includes('设备'));
 const hash=g=>{const h=crypto.createHash('sha256');for(const m of g.children)h.update(m.instanceMatrix.array);return h.digest('hex')},first=hash(meadow);
 layers[2].checked=false;layers[2].onchange();assert(meadow.children.filter(m=>m.userData.layer==='ground').every(m=>!m.visible));assert(!el('#summary').textContent.includes('NaN'));
 layers[2].checked=true;layers[2].onchange();views[2].onclick();raf();assert(camera.position.y>40);
 views[1].onclick();await el('#applySeed').onclick();raf();meadow=rendered.getObjectByName('procedural-flower-meadow');assert.equal(hash(meadow),first,'UI must reproduce the seed');
 el('#seed').value='alternate';await el('#applySeed').onclick();raf();meadow=rendered.getObjectByName('procedural-flower-meadow');assert.notEqual(hash(meadow),first);
 el('#density').value='.5';await el('#density').onchange();raf();meadow=rendered.getObjectByName('procedural-flower-meadow');assert(meadow.children.some(m=>m.visible&&m.count>0));assert.equal(el('#count-ground').textContent,'16,500');assert.equal(new Set(meadow.children.map(m=>m.userData.slug)).size,83);
 const canvas=el('#stage').children[0];canvas.listeners.webglcontextlost({preventDefault(){}});assert(!el('#loader').hidden);assert(el('#loader').textContent.includes('刷新'));
 windowListeners.pagehide({persisted:true});assert(!rendererDisposed,'Back-forward cache must keep the renderer alive');assert(meadow.children.length>0);windowListeners.pageshow();raf();
 windowListeners.pagehide({persisted:false});assert(rendererDisposed);assert.equal(meadow.children.length,0);assert.deepEqual(errors,[]);
 const page=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');for(const m of page.matchAll(/(?:href|src)="([^"]+)"/g)){if(!/^(https?:|#)/.test(m[1]))assert(fs.existsSync(path.resolve(ROOT,m[1])),m[1])}
 console.log('PASS meadow UI: all83 real templates,300m field, animated instances,device-time,manualscrubbing,continuous bloom,seed replay,layer toggles,views,density,context loss,cleanup,links. GPU rendering not verified.');
}
(async()=>{await run();await run(true);await run(8);console.log('PASS WebGL-unavailable UI keeps catalog and script accessible')})().catch(e=>{console.error(e);process.exit(1)});
