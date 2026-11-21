// Execute shipped inline scripts with a renderer stub; GPU rendering is NOT verified.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const THREE=require('../assets/three.min.js'),create=require('../collection/engine.js'),configs=[...require('./load-specimens.cjs'),...[...require('../collection/cup26-specimens.json'),...require('../collection/remaining49-specimens.json')].map(c=>({...c,surfaceMaps:require('../collection/textures/'+c.slug+'.json')}))];
const preserved=require('./half-full83-fixtures.json').stages;
const petalHash=group=>{const h=crypto.createHash('sha256');group.traverse(o=>{if(o.name==='petal'||o.name==='cosmos-petal')h.update(o.geometry.attributes.position.array)});return h.digest('hex')};
const uncovered=group=>group.traverse(o=>{if(['bud-cover','cosmos-bract','balloon-bud'].includes(o.name))assert(!o.visible,'Wrapping reappears: '+o.name)});
const out=path.resolve(__dirname,'../dist/flowers'),viewer=fs.readFileSync(path.resolve(__dirname,'../collection/viewer.js'),'utf8');
class E{
 constructor(){this.style={};this.dataset={};this.classes=new Set();this.classList={toggle:(n,v)=>v?this.classes.add(n):this.classes.delete(n),remove:n=>this.classes.delete(n)};this.clientWidth=780;this.clientHeight=520;this.listeners={};this.textContent='';this.value='1';this.hidden=false;this.disabled=false;this.open=false}
 addEventListener(n,f){this.listeners[n]=f}setAttribute(){}prepend(e){this.canvas=e}showModal(){this.open=true}close(){this.open=false}setPointerCapture(){}
}
for(const c of configs){
 const name=String(c.number).padStart(2,'0')+'-'+c.slug+'.html',page=fs.readFileSync(path.join(out,name),'utf8');
 const scripts=[...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);assert.equal(scripts.length,4);
 scripts.forEach((s,i)=>new vm.Script(s,{filename:name+':script-'+i}));
 const embedded={THREE,atob};vm.createContext(embedded);vm.runInContext(scripts[1],embedded);vm.runInContext(scripts[2],embedded);const embeddedMaterials=vm.runInContext('PetalSurface.materials(THREE,FLOWER_SPEC)',embedded);assert(embeddedMaterials.petals.every(m=>m.map.isDataTexture&&m.bumpMap.isDataTexture));assert(scripts[3].includes('new THREE.WebGLRenderer'));
 const data=page.match(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/)[1];assert.equal(crypto.createHash('sha256').update(Buffer.from(data,'base64')).digest('hex'),c.source_sha256);
 assert(!/<(?:script|link)[^>]+(?:src|href)=["']https?:/i.test(page),'External runtime dependency');
 for(const m of page.matchAll(/(?:href|value)="([^"]+\.html)"/g))if(!m[1].startsWith('http'))assert(fs.existsSync(path.join(out,m[1])),name+' broken link '+m[1]);
 if(c.runtime==='cosmos'){const original=fs.readFileSync(path.resolve(__dirname,'../prototype.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/g).at(-1).slice(8,-9);assert.equal(scripts[3],original)}
 const els={},el=s=>els[s]??=new E(),stops=[0,.5,1].map(p=>Object.assign(new E(),{dataset:{progress:String(p)}})),views=['perspective','top','side'].map(v=>Object.assign(new E(),{dataset:{view:v}}));
 let raf,rendered,camera,actualModel,resize,time=0;
 const T={...THREE,WebGLRenderer:class{constructor(){this.domElement=new E();this.shadowMap={}}setPixelRatio(){}setSize(){}render(s,c){rendered=s;camera=c}}};
 const ctx={atob,THREE:T,PetalSurface:require('../collection/petal-surface.js'),FLOWER_SPEC:c,createFlowerStudy:(t,cfg)=>(actualModel=create(t,cfg)),console,window:{devicePixelRatio:1},location:{href:''},document:{hidden:false,querySelector:el,querySelectorAll:s=>s==='[data-progress]'?stops:s==='[data-view]'?views:[el('#play'),el('#reset'),el('#progress'),...stops,...views],addEventListener(){}},ResizeObserver:class{constructor(f){this.f=f;resize=f}observe(){this.f()}},performance:{now:()=>time},requestAnimationFrame:f=>{raf=f}};
 vm.createContext(ctx);vm.runInContext(scripts[1],ctx);vm.runInContext(scripts[2],ctx);const factory=ctx.createFlowerStudy;ctx.createFlowerStudy=(t,cfg)=>(actualModel=factory(t,cfg));vm.runInContext(scripts[3],ctx);raf(time+=16);assert(rendered);assert.equal(el('#percentage').textContent,'0%','Initial stage must be微开苞');uncovered(rendered);const initialHash=petalHash(rendered);const firstPetal=rendered.getObjectByName(c.runtime?'cosmos-petal':'petal');const mid=firstPetal.geometry.userData,tip=(mid.N*(mid.W+1)+mid.W/2)*3;const initialTip=Math.hypot(mid.mid[tip],mid.mid[tip+2]);assert(initialTip>.06,c.slug+' still has a sealed tip');assert.equal(el('#loader').hidden,true);assert(rendered.getObjectByName('petal-rim-light'));assert(rendered.children.filter(x=>x.isDirectionalLight).length>=3);
 for(let i=0;i<3;i++){stops[i].onclick();raf(time+=16);assert.equal(el('#percentage').textContent,[0,50,100][i]+'%');assert(stops[i].classes.has('active'));uncovered(rendered);if(i>0)assert.equal(petalHash(rendered),preserved[c.slug][[0,.5,1][i]],c.slug+' changed accepted half/full petals');if(i===1){const halfTip=Math.hypot(mid.mid[tip],mid.mid[tip+2]);assert(initialTip<halfTip*.85,c.slug+' initial pose is already half open')}}
 el('#play').onclick();raf(time);assert.equal(petalHash(rendered),initialHash,c.slug+' replay starts closed');uncovered(rendered);el('#play').onclick();el('#reset').onclick();raf(time+=16);assert.equal(el('#percentage').textContent,'0%');assert.equal(petalHash(rendered),initialHash,c.slug+' reset starts closed');uncovered(rendered);
 el('#play').onclick();raf(time+=80);assert(Number(el('#progress').value)>0);const before=el('#progress').value;el('#play').onclick();raf(time+=80);assert.equal(el('#progress').value,before);
 el('#progress').value='.37';el('#progress').listeners.input();raf(time+=16);assert.equal(el('#percentage').textContent,'37%');
 if(c.heads){
  stops[2].onclick();
  for(const view of c.batch==='remaining49'?views:[views[1]]){view.onclick();raf(time+=16);
  for(const [width,height] of [[335,405],[680,520],[780,520]]){
   el('#stage').clientWidth=width;el('#stage').clientHeight=height;resize();raf(time+=16);camera.updateMatrixWorld(true);actualModel.group.updateMatrixWorld(true);
   for(const head of actualModel.heads)for(const petal of head.petals){const p=petal.geometry.attributes.position;for(let i=0;i<p.count;i+=3){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(petal.matrixWorld).project(camera);assert(Math.abs(v.x)<.97&&Math.abs(v.y)<.97,c.slug+' clips in '+view.dataset.view+' view at '+width+'x'+height)}}
  }
  }
 }
 views[1].onclick();raf(time+=16);const top=camera.position.clone();views[2].onclick();raf(time+=16);assert(camera.position.distanceTo(top)>1);
 const canvas=el('#stage').canvas;canvas.listeners.keydown({key:'ArrowLeft',preventDefault(){}});raf(time+=16);assert(!views[2].classes.has('active'));
 el('#openPhoto').onclick();assert(el('#photoDialog').open);el('#closePhoto').onclick();assert(!el('#photoDialog').open);
 el('#selectFlower').onchange({target:{value:'index.html'}});assert.equal(ctx.location.href,'index.html');
 canvas.listeners.webglcontextlost({preventDefault(){}});assert.equal(el('#loader').hidden,false);assert(el('#loader').textContent.includes('刷新'));
 // Dispose CPU geometry/materials between independent specimens.
 (actualModel?.group||rendered).traverse(o=>{if(o.isMesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())}});
 console.log('PASS '+c.name+': embedded source, original image hash, links, stage buttons, slider, play/pause, reset, views, photo, lost-context message');
}
console.log('PASS all 83 pages. WebGL GPU execution and frame rate remain unverified.');
