'use strict';
const $=s=>document.querySelector(s),stage=$('#stage'),slider=$('#progress'),spec=FLOWER_SPEC;
const meadowEmbed=typeof location!=='undefined' && location.search==='?meadow=1';
if(meadowEmbed)document.documentElement.classList.add('meadow-embed');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));let progress=0,playing=false,geometryDirty=true,lastTime=0;
$('#selectFlower').onchange=e=>{location.href=e.target.value};
const dialog=$('#photoDialog');$('#openPhoto').onclick=()=>dialog.showModal();$('#openPhoto').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();dialog.showModal()}};$('#closePhoto').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
function updateUI(){const pc=Math.round(progress*100);slider.value=progress;$('#percentage').textContent=pc+'%';slider.style.background=`linear-gradient(90deg,#315d4e ${pc}%,#e2e7dd ${pc}%)`;const label=progress<.2?'微开苞 / EARLY BLOOM':progress<.85?'半开 / OPENING':'盛开 / BLOOM';if($('#stageName').textContent!==label)$('#stageName').textContent=label;document.querySelectorAll('[data-progress]').forEach(b=>b.classList.toggle('active',Math.abs(+b.dataset.progress-progress)<.025));$('#play').textContent=playing?'Ⅱ 暂停':'▶ 播放开花'}
function setProgress(p,stop=true){progress=clamp(p);if(stop)playing=false;geometryDirty=true;updateUI()}
slider.addEventListener('input',()=>setProgress(+slider.value));$('#reset').onclick=()=>setProgress(0);document.querySelectorAll('[data-progress]').forEach(b=>b.onclick=()=>setProgress(+b.dataset.progress));$('#play').onclick=()=>{if(playing){playing=false;updateUI();return}if(progress>=.999)setProgress(0);playing=true;lastTime=performance.now();updateUI()};
try{init()}catch(err){console.error(err);showPosePreview()}
function showPosePreview(){
 const img=document.createElement('img'),poses=['Bud','Half','Full'];
 img.className='pose-preview';stage.prepend(img);
 $('#loader').hidden=true;$('.view-controls').hidden=true;
 $('.live-badge').textContent='模型三阶段预览';
 $('.stage-hint').textContent='选择生长阶段查看模型投影';
 function show(value){
  const index=Math.round(value*2);setProgress(index/2);
  img.src='./poses/'+spec.slug+'-'+poses[index]+'.webp';img.alt=spec.name+' · '+$('#stageName').textContent;
  $('#play').textContent='下个阶段 →';
 }
 slider.step='.5';slider.addEventListener('input',()=>show(+slider.value));
 $('#reset').onclick=()=>show(0);$('#play').onclick=()=>show(((Math.round(progress*2)+1)%3)/2);
 document.querySelectorAll('[data-progress]').forEach(b=>b.onclick=()=>show(+b.dataset.progress));
 show(0);
}
function init(){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#edf0e8');scene.fog=new THREE.Fog('#edf0e8',18,42);
 const light=spec.lighting||{};
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.toneMappingExposure=1;
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label',spec.name+'三维画面；方向键旋转，加减号缩放');stage.prepend(canvas);
 const camera=new THREE.PerspectiveCamera(39,1,.05,90);scene.add(new THREE.HemisphereLight(0xfffbed,0xc5d9cf,1.35));const key=new THREE.DirectionalLight(0xfff1d9,1.8);key.position.set(-4,7,3);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-5,right:5,top:6,bottom:-4,near:.5,far:22});key.shadow.bias=-.00015;key.shadow.normalBias=.003;scene.add(key);const fill=new THREE.DirectionalLight(0xf3f6ff,light.fill||.24);fill.position.set(4,3,-4);scene.add(fill);const rim=new THREE.DirectionalLight(0xfff9ec,1.3);rim.name='petal-rim-light';rim.position.set(-4,5,-5);scene.add(rim);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xedf0e8,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.20;floor.receiveShadow=true;scene.add(floor);
 const stand=new THREE.Mesh(new THREE.CylinderGeometry(1.92,1.96,.17,80),new THREE.MeshStandardMaterial({color:0xf1f2e9,roughness:.95}));stand.position.y=-.08;stand.receiveShadow=true;stand.castShadow=true;scene.add(stand);
 const model=createFlowerStudy(THREE,spec);scene.add(model.group);
 model.group.updateMatrixWorld(true);
 const bloomBounds=spec.heads?new THREE.Box3().setFromObject(model.group,true):null;
 let activeView='perspective';
 let theta=.25,phi=spec.layout==='spiraea'?.77:.60,radius=spec.layout==='phlox'?8.2:7.6,target=new THREE.Vector3(0,spec.layout==='spiraea'?1.85:2.05,0),cameraDirty=true;
 const singleHead=spec.layout==='single'||spec.heads?.length===1;
 const views={perspective:{t:.25,p:spec.layout==='spiraea'?.77:.60,r:spec.layout==='phlox'?8.2:7.6,y:spec.layout==='spiraea'?1.85:2.05},top:{t:0,p:spec.layout==='spiraea'?.60:.045,r:singleHead?5.5:7.0,y:singleHead?2.85:spec.layout==='spiraea'?1.85:2.85},side:{t:.5,p:1.43,r:7.4,y:2.05}};
 function fitTopView(){
  if(!bloomBounds||!activeView||(spec.batch!=='remaining49'&&activeView!=='top'))return;
  const tan=Math.tan(camera.fov*Math.PI/360),aspect=Math.max(.1,stage.clientWidth/Math.max(1,stage.clientHeight));
  const direction=new THREE.Vector3(Math.sin(phi)*Math.sin(theta),Math.cos(phi),Math.sin(phi)*Math.cos(theta)),right=new THREE.Vector3(Math.cos(theta),0,-Math.sin(theta)),up=new THREE.Vector3().crossVectors(direction,right);
  let fit=views[activeView].r;
  for(const x of [bloomBounds.min.x,bloomBounds.max.x])for(const y of [bloomBounds.min.y,bloomBounds.max.y])for(const z of [bloomBounds.min.z,bloomBounds.max.z]){
   const p=new THREE.Vector3(x,y,z).sub(target),depth=p.dot(direction);
   fit=Math.max(fit,depth+Math.abs(p.dot(right))/(tan*aspect*.92),depth+Math.abs(p.dot(up))/(tan*.92));
  }radius=fit;
 }
 function cameraUpdate(){camera.position.set(radius*Math.sin(phi)*Math.sin(theta),target.y+radius*Math.cos(phi),radius*Math.sin(phi)*Math.cos(theta));camera.lookAt(target);cameraDirty=false}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{activeView=b.dataset.view;const v=views[activeView];theta=v.t;phi=v.p;radius=v.r;target.y=v.y;fitTopView();cameraDirty=true;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b))});
 const clearView=()=>{activeView=null;document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'))};const pointers=new Map();let pinch=0;
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pinch=0});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){theta-=(e.clientX-old.x)*.008;phi=clamp(phi-(e.clientY-old.y)*.006,.035,1.85)}else{const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0&&d>0)radius=clamp(radius*pinch/d,3.4,12);pinch=d}cameraDirty=true;clearView()});
 const release=e=>{pointers.delete(e.pointerId);pinch=0};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);canvas.addEventListener('wheel',e=>{e.preventDefault();radius=clamp(radius*Math.exp(e.deltaY*.001),3.4,12);cameraDirty=true},{passive:false});
 canvas.addEventListener('keydown',e=>{let changed=true;if(e.key==='ArrowLeft')theta-=.10;else if(e.key==='ArrowRight')theta+=.10;else if(e.key==='ArrowUp')phi=clamp(phi-.08,.035,1.85);else if(e.key==='ArrowDown')phi=clamp(phi+.08,.035,1.85);else if(e.key==='+'||e.key==='=')radius=clamp(radius-.3,3.4,12);else if(e.key==='-')radius=clamp(radius+.3,3.4,12);else changed=false;if(changed){e.preventDefault();cameraDirty=true;clearView()}});
 new ResizeObserver(()=>{renderer.setSize(stage.clientWidth,stage.clientHeight);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();fitTopView();cameraDirty=true}).observe(stage);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;updateUI();$('#loader').hidden=false;$('#loader').textContent='三维显示暂时中断，请刷新恢复。'});document.addEventListener('visibilitychange',()=>{lastTime=performance.now()});
 $('#loader').hidden=true;updateUI();
 function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-lastTime)/1000,.08);lastTime=now;let draw=false;if(playing&&!document.hidden){progress=clamp(progress+dt/10);geometryDirty=true;if(progress===1)playing=false;updateUI()}if(geometryDirty){model.update(BloomPlayback.pose(progress));BloomPlayback.reveal(model.group);geometryDirty=false;draw=true}if(cameraDirty){cameraUpdate();draw=true}if(draw)renderer.render(scene,camera)}requestAnimationFrame(frame);
}

if(meadowEmbed)document.querySelector('[data-progress="1"]').click();
