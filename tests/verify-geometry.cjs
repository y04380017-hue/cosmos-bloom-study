const fs=require('fs'),vm=require('vm'),assert=require('assert');
const THREE=require('../assets/three.min.js');
class E{constructor(){this.style={};this.classList={toggle(){},remove(){}};this.dataset={};this.clientWidth=780;this.clientHeight=490;this.listeners={};this.textContent='';this.value='1'}addEventListener(n,f){this.listeners[n]=f}setAttribute(){}prepend(){}observe(){}showModal(){}close(){}}
const els={};const el=s=>els[s]??=new E();
const stops=[0,.5,1].map(p=>{const e=new E();e.dataset.progress=''+p;return e});const views=['perspective','top','side'].map(v=>{const e=new E();e.dataset.view=v;return e});
let renderScene,camera,raf;
THREE.WebGLRenderer=class{constructor(){this.domElement=new E();this.shadowMap={}}setPixelRatio(){}setSize(){}render(s,c){s.updateMatrixWorld(true);c.updateMatrixWorld(true);renderScene=s;camera=c}};
const ctx={BloomPlayback:require('../collection/bloom-playback.js'),THREE,PetalSurface:require('../collection/petal-surface.js'),FLOWER_SPEC:require('./load-specimens.cjs').at(-1),console,window:{devicePixelRatio:1},document:{querySelector:el,querySelectorAll:s=>s.includes('data-progress')?stops:views,addEventListener(){},hidden:false},ResizeObserver:class{constructor(cb){this.cb=cb}observe(){this.cb()}},performance:{now:()=>0},requestAnimationFrame:fn=>{raf=fn}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../prototype.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/g).at(-1).slice(8,-9),ctx);
function snapshot(p){vm.runInContext(`setProgress(${p})`,ctx);raf(100);assert(renderScene,'scene did not render');let meshes=[];
renderScene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,pos=g.attributes.position;for(const x of pos.array)assert(Number.isFinite(x),'Nonfinite vertex');if(g.attributes.normal)for(const x of g.attributes.normal.array)assert(Number.isFinite(x),'Nonfinite normal');if(g.type==='PlaneGeometry')return;
const count=o.isInstancedMesh?o.count:1;for(let k=0;k<count;k++){
const mat=new THREE.Matrix4().copy(o.matrixWorld);if(o.isInstancedMesh){const t=new THREE.Matrix4();o.getMatrixAt(k,t);mat.multiply(t)}
const vertices=[];const vec=new THREE.Vector3();for(let i=0;i<pos.count;i++){vec.fromBufferAttribute(pos,i).applyMatrix4(mat);vertices.push(vec.x,vec.y,vec.z)}
let cols=g.attributes.color?Array.from(g.attributes.color.array):null;let col=o.material.color.toArray();if(o.isInstancedMesh&&o.instanceColor){const c=new THREE.Color();o.getColorAt(k,c);col=col.map((v,i)=>v*c.toArray()[i])}
meshes.push({vertices,indices:g.index?Array.from(g.index.array):Array.from({length:pos.count},(_,i)=>i),colors:cols,color:col});
}});
return {meshes,camera:camera.matrixWorldInverse.toArray(),projection:camera.projectionMatrix.toArray(),progress:p};}
let counts=[];for(let p=0;p<1.001;p+=.1){const s=snapshot(p);counts.push(s.meshes.length)}
snapshot(1);
assert.equal(el('#percentage').textContent,'100%');el('#reset').onclick();assert.equal(el('#percentage').textContent,'0%');el('#play').onclick();raf(5100);assert(Number(el('#progress').value)>0);el('#play').onclick();assert.equal(el('#play').textContent,'▶ 播放开花');
stops[1].onclick();assert.equal(el('#percentage').textContent,'50%');views[2].onclick();raf(5200);
snapshot(.5);
console.log(JSON.stringify({result:'passed',posesChecked:11,meshInstances:counts[0],checks:['finite vertices and normals','timeline key states','reset','play/pause','view switching'],renderer:'WebGL replaced with capture stub; GPU rendering NOT verified'},null,2));

snapshot(1);
const rays=[];renderScene.traverse(o=>{if(o.isMesh && o.name==='cosmos-petal' && o.geometry.userData.shell)rays.push(o)});
assert.equal(rays.length,8,'Expected eight independent ray florets');
let minimum=180,maximum=0;
for(let row=11;row<=36;row++){
 const intervals=rays.map((o,i)=>{
  const pos=o.geometry.attributes.position;
  const angles=[];for(let k=0;k<=24;k++){
   const index=row*25+k;let a=Math.atan2(pos.getZ(index),pos.getX(index));
   const center=i*Math.PI/4+.05;while(a-center>Math.PI)a-=2*Math.PI;while(a-center< -Math.PI)a+=2*Math.PI;angles.push(a);
  }return [Math.min(...angles),Math.max(...angles)];
 });
 for(let i=0;i<8;i++){
  const next=(i+1)%8, gap=(intervals[next][0]+(i===7?Math.PI*2:0)-intervals[i][1])*180/Math.PI;
  minimum=Math.min(minimum,gap);maximum=Math.max(maximum,gap);
 }
}
console.log({minimumPetalGapDegrees:minimum,maximumPetalGapDegrees:maximum});
assert(minimum>=.35,'Adjacent cosmos petals lost their narrow visible separation');
assert(maximum<=8.5,'Cosmos petals are still too widely separated after the V2 refinement');
console.log('PASS: all eight fully open ray florets have distinct broad silhouettes.');

module.exports={scene:renderScene,snapshot};
