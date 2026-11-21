
'use strict';
// Reference-guided procedural model. Not a photogrammetric reconstruction.
// Bud, half-bloom and full-bloom are deliberately designed geometric key poses.
const $=s=>document.querySelector(s), stage=$('#stage'), slider=$('#progress');
let progress=0, playing=false, lastTime=0, geometryDirty=true;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const dialog=$('#photoDialog');
if($('#selectFlower'))$('#selectFlower').onchange=e=>{location.href=e.target.value};
$('#openPhoto').onclick=()=>dialog.showModal();
$('#openPhoto').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();dialog.showModal()}};
$('#closePhoto').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
function updateUI(){
 slider.value=progress;const pc=Math.round(progress*100);$('#percentage').textContent=pc+'%';
 slider.style.background=`linear-gradient(90deg,#315d4e ${pc}%,#e2e7dd ${pc}%)`;
 const phase=progress<.25?'微开苞 / EARLY BLOOM':progress<.8?'半开 / OPENING':'盛开 / FULL BLOOM';
 if($('#stageName').textContent!==phase)$('#stageName').textContent=phase;
 document.querySelectorAll('[data-progress]').forEach(b=>b.classList.toggle('active',Math.abs(+b.dataset.progress-progress)<.04));
 $('#play').textContent=playing?'Ⅱ 暂停':'▶ 播放开花';
}
function setProgress(p,stop=true){progress=clamp(p);if(stop)playing=false;geometryDirty=true;updateUI()}
slider.addEventListener('input',()=>setProgress(+slider.value));
$('#reset').onclick=()=>setProgress(0);
document.querySelectorAll('[data-progress]').forEach(b=>b.onclick=()=>setProgress(+b.dataset.progress));
$('#play').onclick=()=>{if(playing){playing=false;updateUI();return}if(progress>=.999)setProgress(0);playing=true;lastTime=performance.now();updateUI()};
try{init()}catch(error){console.error(error);$('#loader').hidden=false;$('#loader').textContent='三维画面暂时无法启动。请使用支持 WebGL 的浏览器，并开启硬件加速。原始参考照片仍可查看。';document.querySelectorAll('#play,#reset,#progress,[data-progress],[data-view]').forEach(e=>e.disabled=true)}
function init(){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#edf0e8');scene.fog=new THREE.Fog('#edf0e8',16,40);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
 stage.prepend(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','可旋转的三维黄花波斯菊。方向键旋转，加减号缩放。');
 const camera=new THREE.PerspectiveCamera(39,1,.05,100);
 const hemi=new THREE.HemisphereLight(0xffffff,0xb5b7ae,.58);scene.add(hemi);
 const key=new THREE.DirectionalLight(0xffffff,2.65);key.position.set(4.5,9,2.8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-5,right:5,top:6,bottom:-4,near:.5,far:25});key.shadow.bias=-.00015;key.shadow.normalBias=.003;key.shadow.radius=4;scene.add(key);
 const fill=new THREE.DirectionalLight(0xf3f6ff,.24);fill.position.set(4,3,-4);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xfff4df,.65);rim.name='petal-rim-light';rim.position.set(-4,5,-5);scene.add(rim);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xedf0e8,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.21;ground.receiveShadow=true;scene.add(ground);
 const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.85,1.9,.18,96),new THREE.MeshStandardMaterial({color:0xf1f2e9,roughness:.9}));plinth.position.y=-.09;plinth.receiveShadow=true;plinth.castShadow=true;scene.add(plinth);
 const topRing=new THREE.Mesh(new THREE.TorusGeometry(1.73,.006,5,120),new THREE.MeshStandardMaterial({color:0xcbd4c0,roughness:1}));topRing.rotation.x=Math.PI/2;topRing.position.y=.005;scene.add(topRing);
 const plant=new THREE.Group();scene.add(plant);
 const stemMat=new THREE.MeshStandardMaterial({color:0x5d782b,roughness:.85});
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(-.065,.8,.02),new THREE.Vector3(.065,1.8,-.03),new THREE.Vector3(0,3.05,0)]);
 const stem=new THREE.Mesh(new THREE.TubeGeometry(curve,50,.023,9,false),stemMat);stem.castShadow=true;plant.add(stem);
 // Finely divided leaves: a thin rachis and opposing narrow lobes.
 function leafBlade(start,end,width){
  const dir=new THREE.Vector3().subVectors(end,start),side=new THREE.Vector3(-dir.z,.15,dir.x).normalize();
  const arr=[],idx=[],N=13;for(let j=0;j<=N;j++){const t=j/N;const c=start.clone().lerp(end,t);c.y+=Math.sin(t*Math.PI)*.06;const w=width*Math.pow(Math.sin(Math.PI*t),.8);for(const s of [-1,1]){const q=c.clone().addScaledVector(side,w*s);arr.push(q.x,q.y,q.z)}}
  for(let j=0;j<N;j++){const a=j*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x557d39,roughness:.85,side:THREE.DoubleSide}));m.castShadow=true;plant.add(m);
 }
 for(let k=0;k<3;k++){
  const angle=k*2.3+.5,y=.75+k*.39;const base=new THREE.Vector3(0,y,0),tip=new THREE.Vector3(Math.cos(angle)*.85,y+.28,Math.sin(angle)*.85);
  const rachis=new THREE.Mesh(new THREE.CylinderGeometry(.005,.011,base.distanceTo(tip),6),stemMat);rachis.position.copy(base).lerp(tip,.5);rachis.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),tip.clone().sub(base).normalize());plant.add(rachis);
  for(let j=1;j<=5;j++){const t=j/6,p=base.clone().lerp(tip,t);for(const s of [-1,1]){const len=.23*(1-t)+.08;const a=angle+s*.75;const q=p.clone().add(new THREE.Vector3(Math.cos(a)*len,.10,Math.sin(a)*len));leafBlade(p,q,.022)}}leafBlade(base.clone().lerp(tip,.75),tip.clone().add(new THREE.Vector3(Math.cos(angle)*.2,.07,Math.sin(angle)*.2)),.028);
 }
 const head=new THREE.Group();head.position.y=3.05;head.rotation.z=-.06;plant.add(head);
 const receptacle=new THREE.Mesh(new THREE.SphereGeometry(.29,28,16),new THREE.MeshStandardMaterial({color:0x6d8337,roughness:.85}));receptacle.scale.y=.48;receptacle.position.y=-.04;head.add(receptacle);
 const petals=[],bracts=[],N=36,W=24;
 const photoMaterials=PetalSurface.materials(THREE,FLOWER_SPEC);
 const bractMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,side:THREE.DoubleSide,roughness:.85});
 function makeSurface(isBract,index){
  if(!isBract){const geo=PetalSurface.shell(THREE,N,W,.019);const mesh=new THREE.Mesh(geo,photoMaterials.petals[index%2]);mesh.name='cosmos-petal';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;head.add(mesh);return mesh;}
  const p=new Float32Array((N+1)*(W+1)*3),c=new Float32Array(p.length),indices=[];
  for(let j=0;j<=N;j++)for(let k=0;k<=W;k++){
   const t=j/N,u=k/W*2-1,o=(j*(W+1)+k)*3,col=new THREE.Color();
   if(isBract){const vein=.07*Math.cos(u*12);col.setRGB(.20+.16*t+vein,.31+.15*t+vein,.055+.035*t)}
   c[o]=col.r;c[o+1]=col.g;c[o+2]=col.b;
   if(j<N&&k<W){const a=j*(W+1)+k;indices.push(a,a+1,a+W+1,a+1,a+W+2,a+W+1)}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('color',new THREE.BufferAttribute(c,3));geo.setIndex(indices);
  const mesh=new THREE.Mesh(geo,bractMat);mesh.name=isBract?'cosmos-bract':'cosmos-petal';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;head.add(mesh);return mesh;
 }
 for(let i=0;i<8;i++){petals.push(makeSurface(false,i));bracts.push(makeSurface(true,i))}
 const disk=new THREE.Group();head.add(disk);disk.position.y=.055;
 const core=new THREE.Mesh(new THREE.SphereGeometry(.31,36,16),new THREE.MeshStandardMaterial({color:0xffffff,map:photoMaterials.centerMap,bumpMap:photoMaterials.centerBump,bumpScale:.014,roughness:.68,metalness:0}));core.scale.y=.38;disk.add(core);
 const count=110,florets=new THREE.InstancedMesh(new THREE.CylinderGeometry(.017,.010,.11,5,1,true),new THREE.MeshStandardMaterial({color:0xe3ac10,roughness:.65,metalness:0,bumpMap:photoMaterials.centerBump,bumpScale:.007,side:THREE.DoubleSide}),count);
 const tips=new THREE.InstancedMesh(new THREE.TorusGeometry(.019,.006,4,5),new THREE.MeshStandardMaterial({color:0xffc928,roughness:.8}),count);
 const anthers=new THREE.InstancedMesh(new THREE.SphereGeometry(.010,5,4),new THREE.MeshStandardMaterial({color:0xbe7404,roughness:.9}),count);
 const obj=new THREE.Object3D(),col=new THREE.Color();
 for(let i=0;i<count;i++){
  const r=.28*Math.sqrt((i+.5)/count),a=i*2.39996323,h=.06+.08*Math.sqrt(1-r*r/.09),x=r*Math.cos(a),z=r*Math.sin(a);
  obj.position.set(x,h+.04,z);obj.rotation.set(.14*Math.sin(a),a,.14*Math.cos(a));obj.updateMatrix();florets.setMatrixAt(i,obj.matrix);
  col.setHSL(.104+.025*Math.sin(i*1.8),.9,.46+.055*Math.cos(i));florets.setColorAt(i,col);
  obj.position.y+=.056;obj.rotation.x+=Math.PI/2;obj.updateMatrix();tips.setMatrixAt(i,obj.matrix);
  obj.position.y+=.018;obj.updateMatrix();anthers.setMatrixAt(i,obj.matrix);
 }
 florets.castShadow=true;disk.add(florets,tips,anthers);
 function deform(bloom){
  for(let i=0;i<8;i++){
   // Slight staggering during opening, identical closed and open endpoints.
   const p=clamp(bloom+.022*Math.sin(i*2.4)*Math.sin(Math.PI*bloom)),lo=p<.5,alpha=smooth(lo?p*2:(p-.5)*2);
   const angle=i*Math.PI/4+.05+.006*Math.sin(i*2.1),ca=Math.cos(angle),sa=Math.sin(angle);
   const positions=petals[i].geometry.attributes.position.array;
   const bp=bracts[i].geometry.attributes.position.array;
   for(let j=0;j<=N;j++)for(let k=0;k<=W;k++){
    const t=j/N,u=k/W*2-1,o=(j*(W+1)+k)*3;
    // Individual spatulate rays: narrow neck, broad distal blade, rounded shoulders.
    // Broader distal blades bring neighboring petals close while keeping a narrow visible seam.
    const tipTrim=smooth((t-.80)/.20)*(.012*(1+Math.cos(u*Math.PI*3))+.10*Math.pow(Math.abs(u),6));
    const len=1.16*(1+.027*Math.sin(i*1.7));
    const bladeWidth=Math.min((.105+.46*Math.pow(t,1.1)-.18*Math.pow(t,4))*1.20,(.27+len*t)*Math.tan(.38))*(1+.010*Math.sin(i*2.1));
    const rb=.235*(1-t)+.22*Math.sin(Math.PI*t),yb=.035+.77*t,wb=Math.max(.006,.018*(1-t)+.145*Math.sin(Math.PI*t));
    const rh=.27+.55*t-tipTrim,yh=.045+.83*t-.08*t*t+.05*u*u*t+.018*Math.sin(i*1.9)*t,wh=.68*bladeWidth;
    const petalBend=[.035,.055,.025,.040,.020,.045,.030,.050][i];
    const marginRoll=.15*u*u*Math.sin(Math.PI*t)+.065*Math.pow(Math.abs(u),4)*t;
    const tipCurl=.085*Math.pow(smooth((t-.68)/.32),2);
    const pleat=.0035*Math.cos((u*4+.07*Math.sin(t*5))*Math.PI*2)*Math.sin(Math.PI*t);
    const rf=.27+len*t-tipTrim,yf=.055+.13*t+.085*t*t+marginRoll+tipCurl+petalBend*t*t+.025*u*Math.sin(i+1)*t+pleat,wf=bladeWidth;
    const r=lo?mix(rb,rh,alpha):mix(rh,rf,alpha),y=lo?mix(yb,yh,alpha):mix(yh,yf,alpha),width=lo?mix(wb,wh,alpha):mix(wh,wf,alpha);
    const w=width*u;positions[o]=r*ca-w*sa;positions[o+1]=y+.006*Math.cos(u*10*Math.PI)*Math.sin(Math.PI*t)*p;positions[o+2]=r*sa+w*ca;
    const bt=smooth(clamp(p*1.8)),bcR=.245*(1-t)+.30*Math.sin(Math.PI*t),bcY=.005+.84*t;
    const boR=.245+.16*t,boY=-.025-.18*t;
    const br=mix(bcR,boR,bt),by=mix(bcY,boY,bt),a=angle+Math.PI/8+u*mix(.425*(1-.80*Math.pow(t,5)),.32*Math.sqrt(1-t),bt);
    bp[o]=br*Math.cos(a);bp[o+1]=by;bp[o+2]=br*Math.sin(a);
   }
   PetalSurface.finishShell(petals[i].geometry);bracts[i].geometry.attributes.position.needsUpdate=true;bracts[i].geometry.computeVertexNormals();
  }
  const scale=.67+.33*smooth(bloom);disk.scale.set(scale,.80+.20*bloom,scale);
 }
 let theta=.35,phi=.80,radius=7.7;let target=new THREE.Vector3(0,2.0,0),cameraDirty=true;
 const views={perspective:{theta:.35,phi:.80,r:7.7,y:2.0},top:{theta:0,phi:.045,r:6.0,y:3.05},side:{theta:.5,phi:1.43,r:7.2,y:2.0}};
 function cameraUpdate(){camera.position.set(target.x+radius*Math.sin(phi)*Math.sin(theta),target.y+radius*Math.cos(phi),target.z+radius*Math.sin(phi)*Math.cos(theta));camera.lookAt(target);cameraDirty=false}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{const v=views[b.dataset.view];theta=v.theta;phi=v.phi;radius=v.r;target.y=v.y;cameraDirty=true;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b))});
 const pointers=new Map();let pinch=0;const canvas=renderer.domElement;
 const clearView=()=>document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'));
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pinch=0});
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1){theta-=(e.clientX-old.x)*.008;phi=clamp(phi-(e.clientY-old.y)*.006,.035,1.85)}else{const [a,b]=[...pointers.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0)radius=clamp(radius*pinch/d,3.7,11);pinch=d}cameraDirty=true;clearView();
 });
 const release=e=>{pointers.delete(e.pointerId);pinch=0};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
 canvas.addEventListener('wheel',e=>{e.preventDefault();radius=clamp(radius*Math.exp(e.deltaY*.001),3.7,11);cameraDirty=true},{passive:false});
 canvas.addEventListener('keydown',e=>{let changed=true;if(e.key==='ArrowLeft')theta-=.10;else if(e.key==='ArrowRight')theta+=.10;else if(e.key==='ArrowUp')phi=clamp(phi-.08,.035,1.85);else if(e.key==='ArrowDown')phi=clamp(phi+.08,.035,1.85);else if(e.key==='+'||e.key==='=')radius=clamp(radius-.3,3.7,11);else if(e.key==='-')radius=clamp(radius+.3,3.7,11);else changed=false;if(changed){e.preventDefault();cameraDirty=true;clearView()}});
 new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();cameraDirty=true}).observe(stage);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;updateUI();$('#loader').hidden=false;$('#loader').textContent='三维显示暂时中断，请刷新页面恢复。'});
 document.addEventListener('visibilitychange',()=>{lastTime=performance.now()});
 $('#loader').hidden=true;updateUI();
 function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-lastTime)/1000,.08);lastTime=now;let redraw=false;if(playing&&!document.hidden){progress=clamp(progress+dt/9);geometryDirty=true;if(progress>=1)playing=false;updateUI()}
  if(geometryDirty){deform(BloomPlayback.pose(progress));BloomPlayback.reveal(head);geometryDirty=false;redraw=true}if(cameraDirty){cameraUpdate();redraw=true}if(redraw)renderer.render(scene,camera);
 }requestAnimationFrame(frame);
}
