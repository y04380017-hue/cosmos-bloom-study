(async function(){
'use strict';
const $=s=>document.querySelector(s),stage=$('#stage'),loader=$('#loader'),format=n=>n.toLocaleString('zh-CN');
const catalog=await fetch('./catalog.json').then(r=>{if(!r.ok)throw new Error('花朵目录加载失败');return r.json()});
const bySlug=new Map(catalog.map(c=>[c.slug,c]));
for(const [layer,name] of [['ground','底层 · 伞形微花／碎花毯型'],['cluster','中层 · 丛生中花／群落型'],['focus','顶层 · 独生大花／焦点型']]){
 const section=document.createElement('section'),h=document.createElement('h3');h.textContent=name;section.append(h);
 for(const c of catalog.filter(x=>x.layer===layer)){const a=document.createElement('a');a.href=c.detailUrl;a.textContent=c.name;section.append(a)}$('#speciesList').append(section);
}
const shotViews=['entry','turn','hover'];
function showSpecimen(slug){
 const c=bySlug.get(slug);if(!c)return;
 $('#selectedName').textContent=c.name;$('#selectedMeta').textContent=c.category;
 const link=$('#selectedLink');link.href=c.detailUrl;link.hidden=false;
 const dialog=$('#flowerDialog'),frame=$('#specimenFrame');
 $('#specimenName').textContent=c.name;$('#specimenLatin').textContent='';
 $('#specimenInfo').textContent=c.category;$('#specimenFull').href=c.detailUrl;
 frame.onload=()=>{
  if(!dialog.open)return;
  const doc=frame.contentDocument,card=doc?.querySelector('.stage-card');if(!card)return;
  $('#specimenLatin').textContent=doc.querySelector('.specimen em')?.textContent||'';
  $('#specimenInfo').textContent=doc.querySelector('.intro p')?.textContent||c.category;
  // Keep the original document and its bound controls alive inside the model card.
  for(let n=card;n.parentElement&&n!==doc.body;n=n.parentElement){
   for(const sib of n.parentElement.children)if(sib!==n)sib.style.display='none';
   n.style.cssText+=';display:block;width:100%;max-width:none;padding:0;margin:0;min-height:0;border:0';
  }
  const style=doc.createElement('style');style.textContent='body{margin:0;background:#f6f8ef}#stage{height:clamp(165px,55vh,270px)!important;min-height:0!important}.stage-top,.stage-bottom{display:none!important}';doc.head.append(style);
 };
 if(!dialog.open)dialog.showModal();frame.src=c.detailUrl;
}
$('#closeSpec').onclick=()=>$('#flowerDialog').close();
$('#flowerDialog').addEventListener('close',()=>{const f=$('#specimenFrame');f.onload=null;f.removeAttribute('src')});
function connectExperience(hooks){
 const brush=$('#brushToggle'),cam=$('#cameraToggle'),flight=$('#flightToggle'),cursor=$('#handCursor'),status=$('#gestureStatus');
 let painting=false,cameraOn=false,flying=false,hold=0,pressed=null;
 function setFlying(value){flying=value;flight.setAttribute('aria-pressed',String(value));flight.textContent=value?'暂停飞行':'沿花带飞行';hooks.flight(value)}
 function setArmed(){const active=painting||cameraOn;hooks.arm(active);brush.setAttribute('aria-pressed',String(painting));brush.textContent=painting?'结束划动':'划动开花';if(!active)lost()}
 function lost(){cursor.hidden=true;hooks.end?.()}
 function paint(x,y){
  if($('#flowerDialog').open||!Number.isFinite(x+y)||x<0||y<0||x>1||y>1)return;
  hold=1.1;cursor.style.left=(x*100)+'%';cursor.style.top=(y*100)+'%';cursor.hidden=false;hooks.point(x,y);
 }
 const hand=MeadowHandInput.create({onPoint:paint,onLost:lost,onStatus:text=>{status.textContent=text},onActive:on=>{
  cameraOn=on;cam.setAttribute('aria-pressed',String(on));cam.textContent=on?'关闭摄像头':'开启摄像头手势';if(on)hooks.route();setArmed();
 }});
 cam.onclick=()=>{if(cameraOn)hand.stop();else hand.start()};
 brush.onclick=()=>{painting=!painting;if(painting)hooks.route();setArmed();status.textContent=painting?'按住并划过花丛，看它沿轨迹绽开。轻点一朵可看花谱。':(cameraOn?'向摄像头张开手掌，缓缓划过花丛。':'点「划动开花」后，按住鼠标或用手指划过花丛。')};
 flight.onclick=()=>{if(!flying)hooks.route();setFlying(!flying)};
 function coords(e){const b=stage.getBoundingClientRect();return [(e.clientX-b.left)/b.width,(e.clientY-b.top)/b.height]}
 function pointerDown(e){if(!painting||!e.isPrimary&&e.isPrimary!==undefined||e.button>0)return false;pressed={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};return true}
 function pointerMove(e){if(!pressed||pressed.id!==e.pointerId)return false;
  if(Math.hypot(e.clientX-pressed.x,e.clientY-pressed.y)>4)pressed.moved=true;
  if(pressed.moved)paint(...coords(e));return true}
 function pointerUp(e){if(!pressed||pressed.id!==e.pointerId)return null;const tap=!pressed.moved;pressed=null;lost();return tap}
 function cancel(){pressed=null;lost()}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();if(cameraOn)hand.stop()}});
 window.addEventListener('pagehide',e=>{cancel();if(e.persisted)hand.stop();else hand.dispose()});
 return {pointerDown,pointerMove,pointerUp,cancel,coords,leave(){setFlying(false);if(cameraOn)hand.stop();painting=false;setArmed()},get armed(){return painting||cameraOn},advance(dt){hold=Math.max(0,hold-dt);return flying&&!$('#flowerDialog').open?dt*(1-.92*Math.min(1,hold)):0},get flying(){return flying}};
}

let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true});if(renderer.capabilities.maxAttributes<12){renderer.dispose();throw new Error('WebGL 图形能力不足：当前设备不支持连续花瓣变形，请尝试支持更多顶点属性的浏览器或设备。')}}catch(error){
 showFieldPreview(error);return;
}
function showFieldPreview(error){
 const img=document.createElement('img'),views=document.querySelectorAll('[data-view]');
 const clock=MeadowDayCycle.createController(),preview=MeadowFlightPreview.create(stage,{onSelect:showSpecimen});
 let view='turn',last=null,stopped=false,displayStamp='';
 img.className='pose-preview';stage.prepend(img);img.hidden=true;loader.hidden=true;
 $('#summary').textContent='低空花带 · 插画互动模式';$('#triangleCount').textContent='WebGL 未启动';$('#renderNote').textContent=error.message;
 $('.scene-bottom>span').textContent='点击花朵查看花谱';$('#selectedName').textContent='点击花朵，单独看看';$('#selectedMeta').textContent='近处的花可以点选。';
 for(const id of ['#density','#seed','#regenerate','#applySeed','#bloom'])$(id).disabled=true;
 document.querySelectorAll('[data-layer]').forEach(e=>e.disabled=true);
 const controls=connectExperience({arm:v=>preview.setInteractive(v),end:()=>preview.end(),point:(x,y)=>preview.point(x,y),route:()=>{if(!shotViews.includes(view))changeView('turn')},flight:v=>preview.setFlying(v)});
 function changeView(key){
  view=key;const close=shotViews.includes(key);
  preview.element.hidden=!close;img.hidden=close;
  if(close)preview.setShot(key);else controls.leave();
  views.forEach(b=>b.classList.toggle('active',b.dataset.view===view));displayStamp='';frameUI(clock.tick(0));
 }
 function frameUI(state){
  const mins=Math.floor(state.hour*60),pose=state.opening>.75?'Full':state.opening>.2?'Half':'Bud';
  const stamp=[view,mins,pose,clock.mode,Math.round(state.opening*100)].join('/');
  if(stamp===displayStamp)return;displayStamp=stamp;
  if(!shotViews.includes(view))img.src='./poses/'+view+'-'+pose+'.webp';
  $('#timeMode').value=clock.mode;if(clock.mode==='auto')$('#timeSlider').value=mins;
  $('#clockTime').textContent=[Math.floor(mins/60),mins%60].map(n=>String(n).padStart(2,'0')).join(':');
  $('#clockState').textContent=state.label;$('#clockMode').textContent=clock.mode==='auto'?'跟随设备本地时刻':'手动时刻';
  $('#openingValue').textContent=Math.round(state.opening*100)+'%';$('#openingBar').value=state.opening;$('#poseLabel').textContent='随日光舒展';
 }
 const el=preview.element;let start;
 el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);start=[e.clientX,e.clientY];controls.pointerDown(e)});
 el.addEventListener('pointermove',e=>controls.pointerMove(e));
 el.addEventListener('pointerup',e=>{const tap=controls.pointerUp(e);if(start&&tap!==false&&Math.hypot(start[0]-e.clientX,start[1]-e.clientY)<6)preview.pick(...controls.coords(e));start=null});
 el.addEventListener('pointercancel',()=>{start=null;controls.cancel()});
 function draw(now){
  if(stopped)return;requestAnimationFrame(draw);if(document.hidden){last=null;return}
  const dt=last===null?0:Math.min(.15,Math.max(0,(now-last)/1000));last=now;
  const state=clock.tick(dt);frameUI(state);
  if(shotViews.includes(view)){const travel=controls.advance(dt);preview.setFlying(travel>0);preview.update(state,dt,$('#wind').checked,travel)}
 }
 function manual(hour){clock.setManual(hour);$('#timeMode').value='manual';$('#timeSlider').value=Math.round(hour*60)}
 views.forEach(b=>b.onclick=()=>{if(shotViews.includes(b.dataset.view))controls.leave();changeView(b.dataset.view)});
 document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>manual(+b.dataset.period));
 $('#timeMode').onchange=()=>{if($('#timeMode').value==='auto')clock.setAuto();else manual(clock.tick(0).hour)};
 $('#timeSlider').oninput=()=>manual(Number($('#timeSlider').value)/60);
 window.addEventListener('pagehide',e=>{if(!e.persisted){stopped=true;preview.dispose()}});
 changeView('turn');requestAnimationFrame(draw);
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;stage.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#b2e3f9');scene.fog=null;
const trail=MeadowBloomTrail.create(THREE),wind=MeadowEffects.createWind(THREE,trail),bloom=MeadowEffects.createBloom(THREE,renderer);
if(!bloom.supported){$('#bloom').checked=false;$('#bloom').disabled=true;$('#renderNote').textContent='当前设备采用清晰画面模式，光晕与景深暂不可用；花朵开合与微风保持正常。'}
const referenceClumps=await fetch("./reference-clumps.json").then(r=>{if(!r.ok)throw new Error("花丛布局读取失败");return r.json()});
let understory;
const presets={
 overview:{theta:.30,phi:1.17,radius:147,target:[-27,1,29]},
 side:{theta:-1.37,phi:1.38,radius:105,target:[-22,1,58]},
 close:{theta:-.025,phi:1.49,radius:12,target:[-39.70,FlowerScatter.terrainHeight(-40,104)+1.26,92.04]},
 top:{theta:0,phi:.005,radius:390,target:[0,0,0]}
};
const camera=new THREE.PerspectiveCamera(43,1,.1,1800),target=new THREE.Vector3(...presets.close.target);
let {theta,phi,radius}=presets.close,activeView='turn',dirty=true,built=null,busy=false,closed=false,windTime=0,lastFrame=null;
let flightTime=0;
const daySky=MeadowDaySky.create(THREE,scene),clock=MeadowDayCycle.createController();let cycleState=clock.tick(0),lastClock='';
const noise=FlowerScatter.simplex2D(FlowerScatter.seeded('grass-colour'));
const groundGeometry=new THREE.PlaneGeometry(1,1,260,260);groundGeometry.rotateX(-Math.PI/2);const colors=[];
function groundAxis(u){
 const n=Math.abs(u)*260;
 return Math.sign(u)*(n<=114?n*1.5:171+(n-114)*60);
}
const rootGreen=new THREE.Color('#96c598'),sunlitGreen=new THREE.Color('#c6e3a0'),turfColor=new THREE.Color();
const surface=groundGeometry.attributes.position;
for(let i=0;i<surface.count;i++){
 const x=groundAxis(surface.getX(i)),z=groundAxis(surface.getZ(i));
 surface.setXYZ(i,x,FlowerScatter.terrainHeight(x,z),z);
 const patch=.5+.31*noise(x*.015,z*.015)+.16*noise(x*.035,z*.035);
 const elevation=FlowerScatter.terrainHeight(x,z);
 turfColor.copy(rootGreen).lerp(sunlitGreen,Math.max(0,Math.min(1,patch+.035*elevation)));
 colors.push(turfColor.r,turfColor.g,turfColor.b);
}
groundGeometry.computeVertexNormals();groundGeometry.computeBoundingSphere();groundGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const ground=new THREE.Mesh(groundGeometry,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1}));ground.position.y=-.015;ground.receiveShadow=true;scene.add(ground);const driftCover=MeadowDriftCover.attach(THREE,ground.material);
const blade=new THREE.BufferGeometry();
blade.setAttribute('position',new THREE.Float32BufferAttribute([-.013,0,0,.013,0,0,-.013,.09,.018,.013,.09,.018,-.011,.17,.05,.007,.17,.05,-.011,.20,.074],3));
const bladeColors=['#95bc79','#95bc79','#b8d98d','#b8d98d','#d2e69b','#d2e69b','#ddeca4'].flatMap(hex=>new THREE.Color(hex).toArray());
blade.setAttribute('color',new THREE.Float32BufferAttribute(bladeColors,3));
blade.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]);blade.computeVertexNormals();
const grass=new THREE.InstancedMesh(blade,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.94,side:THREE.DoubleSide}),120000),rng=FlowerScatter.seeded('grass'),dummy=new THREE.Object3D();
const coolBlade=new THREE.Color('#e1f2ed'),warmBlade=new THREE.Color('#fff9d9'),bladeTint=new THREE.Color();
for(let i=0;i<grass.count;i++){
 const x=i<26000?-40+(rng()-.5)*46:(rng()-.5)*300,z=i<26000?91+(rng()-.5)*51:(rng()-.5)*300;dummy.position.set(x,FlowerScatter.terrainHeight(x,z),z);dummy.rotation.y=rng()*Math.PI*2;dummy.scale.setScalar(.6+rng()*.8);dummy.updateMatrix();
 grass.setMatrixAt(i,dummy.matrix);grass.setColorAt(i,bladeTint.copy(coolBlade).lerp(warmBlade,rng()));
}
grass.name="meadow-grass-blades";grass.instanceMatrix.needsUpdate=true;grass.instanceColor.needsUpdate=true;grass.computeBoundingSphere();grass.receiveShadow=false;wind.attach(grass.material,{foliage:true});scene.add(grass);
const templates=new Map(),raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();let loadingPromise;
const controls=connectExperience({
 arm:enabled=>{trail.setEnabled(enabled);dirty=true},
 end:()=>trail.end(),
 point:(x,y)=>{
  if(!built)return;
  updateCamera();camera.updateMatrixWorld();mouse.set(x*2-1,1-y*2);raycaster.setFromCamera(mouse,camera);
  const {origin,direction}=raycaster.ray;
  // Intersect the flower-head surface, including the approved valley relief.
  const clearance=t=>{const x=origin.x+direction.x*t,z=origin.z+direction.z*t;return origin.y+direction.y*t-FlowerScatter.terrainHeight(x,z)-.48};
  for(let hi=.12;hi<=18;hi+=.12){
   if(clearance(hi)>0)continue;let lo=hi-.12;
   for(let i=0;i<5;i++){const mid=(lo+hi)/2;if(clearance(mid)>0)lo=mid;else hi=mid}
   trail.point(origin.x+direction.x*hi,origin.z+direction.z*hi);dirty=true;break;
  }
 },
 route:()=>{if(!shotViews.includes(activeView))selectView('turn')},
 flight:()=>{dirty=true}
});
function selectView(view){
 activeView=view;
 if(shotViews.includes(view))flightTime=MeadowFlight.times[view];
 else{const p=presets[view];theta=p.theta;phi=p.phi;radius=p.radius;target.set(...p.target)}
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 dirty=true;updateCamera();
}
function updateCamera(){
 if(shotViews.includes(activeView)){
  const pose=MeadowFlight.pose(flightTime);camera.position.set(...pose.eye);target.set(...pose.target);
  const dx=camera.position.x-target.x,dy=camera.position.y-target.y,dz=camera.position.z-target.z;
  radius=Math.hypot(dx,dy,dz);theta=Math.atan2(dx,dz);phi=Math.acos(dy/radius);
  camera.lookAt(target);return;
 }
 camera.position.set(target.x+radius*Math.sin(phi)*Math.sin(theta),target.y+radius*Math.cos(phi),target.z+radius*Math.sin(phi)*Math.cos(theta));camera.position.y=Math.max(camera.position.y,FlowerScatter.terrainHeight(camera.position.x,camera.position.z)+1.65);camera.lookAt(target)}
function draw(now=0){
 if(closed)return;requestAnimationFrame(draw);
 if(document.hidden){lastFrame=null;return}
 const dt=lastFrame===null?0:Math.max(0,Math.min(.05,(now-lastFrame)/1000));lastFrame=now;
 const wasTransitioning=clock.transitioning;cycleState=clock.tick(dt);
 const stamp=clock.mode+'/'+Math.floor(cycleState.hour*3600);if(stamp!==lastClock||wasTransitioning){dirty=true;updateTimeUI();lastClock=stamp}
 const travel=controls.advance(dt);if(travel&&built)flightTime+=travel;
 const blowing=$('#wind').checked;if(blowing)windTime+=dt;
 if(dirty||blowing||controls.flying||controls.armed||trail.uniforms.uGestureMode.value>0){updateCamera();trail.tick(dt,camera.position);if(built&&built.update(camera)){updateSummary()}
  wind.setSun(cycleState);wind.setTime(windTime);wind.setOpening(cycleState.opening);driftCover.setOpening(cycleState.opening);wind.setStrength(blowing?cycleState.windStrength:0);daySky.update(cycleState,camera);renderer.toneMappingExposure=cycleState.exposure;bloom.setFocus(shotViews.includes(activeView)?radius:Math.max(2.5,radius*.85));bloom.render(scene,camera,$('#bloom').checked);dirty=false;
 }
}requestAnimationFrame(draw);
new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight,ratio=Math.min(window.devicePixelRatio||1,1.25);renderer.setSize(w,h);bloom.resize(Math.floor(w*ratio),Math.floor(h*ratio));camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true}).observe(stage);
$('#wind').onchange=()=>{lastFrame=null;dirty=true};$('#bloom').onchange=()=>dirty=true;
function updateTimeUI(){
 const seconds=Math.floor(cycleState.hour*3600),h=Math.floor(seconds/3600),m=Math.floor(seconds/60)%60,s=seconds%60;
 $('#clockTime').textContent=[h,m,s].map(x=>String(x).padStart(2,'0')).join(':');$('#clockState').textContent=cycleState.label;
 $('#clockMode').textContent=clock.mode==='auto'?'跟随设备 · '+Intl.DateTimeFormat().resolvedOptions().timeZone:'手动时刻 · 平滑切换';
 if(clock.mode==='auto')$('#timeSlider').value=cycleState.hour*60;
 $('#openingValue').textContent=Math.round(cycleState.opening*100)+'%';$('#openingBar').value=cycleState.opening;
 $('#poseLabel').textContent=cycleState.opening>.85?'舒展盛开':cycleState.opening>.15?'花瓣缓缓开合':'花瓣合拢 · 花头微垂';
}
function manual(hour){clock.setManual(hour);$('#timeMode').value='manual';$('#timeSlider').value=hour*60;lastClock='';dirty=true}
$('#timeMode').onchange=()=>{if($('#timeMode').value==='auto')clock.setAuto();else manual(cycleState.hour);lastClock='';dirty=true};
$('#timeSlider').oninput=()=>manual(Number($('#timeSlider').value)/60);
document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>manual(Number(b.dataset.period)));
updateTimeUI();
function lock(value){busy=value;for(const selector of ['#regenerate','#applySeed','#density','#seed'])$(selector).disabled=value}
async function loadAll(){
 if(loadingPromise)return loadingPromise;
 loadingPromise=(async()=>{let next=0,done=0;const run=async()=>{while(next<catalog.length){const c=catalog[next++],model=await MeadowModels.loadTemplate(THREE,c.slug,{baseUrl:'./models/',cycleBaseUrl:'./models-cycle/',colorFamily:c.colorFamily});templates.set(c.slug,model);loader.textContent=`正在准备花朵 ${++done} / 83 · ${c.name}`;await new Promise(resolve=>setTimeout(resolve,0))}};await Promise.all(Array.from({length:4},run))})();
 return loadingPromise;
}
function updateSummary(){if(!built)return;
 $('#summary').textContent=`${format(built.stats.instances)}株 · 83种花 · 晴空下的三层花田`;
 $('#triangleCount').textContent=`当前视距${format(built.stats.visible)}株 · 近远景自动切换`;
}
function updateLayers(){if(built){for(const e of document.querySelectorAll('[data-layer]'))built.setLayer(e.dataset.layer,e.checked);updateSummary();dirty=true}}
async function regenerate(){
 if(busy)return;lock(true);loader.hidden=false;
 try{
  const multiplier=Number($('#density').value),layout=FlowerScatter.plan(catalog,{referenceClumps,seed:$('#seed').value||'flower-meadow-83',counts:{ground:33000*multiplier,cluster:10000*multiplier,focus:750*multiplier}});
  await loadAll();loader.textContent='正在铺展花海…';await new Promise(resolve=>setTimeout(resolve,0));
  const next=await MeadowCycleField.instantiate(THREE,layout,{loadTemplate:slug=>templates.get(slug),wind});
  driftCover.setLayout(layout,catalog);const nextUnderstory=MeadowUnderstory.create(THREE,layout,wind);
  if(understory){scene.remove(understory.group);understory.dispose()}understory=nextUnderstory;scene.add(understory.group);
  if(built){scene.remove(built.group);built.dispose()}built=next;scene.add(built.group);updateCamera();built.update(camera,true);
  for(const [layer,count] of Object.entries(layout.counts))$('#count-'+layer).textContent=format(count);
  $('#selectedName').textContent='点击花朵，单独看看';$('#selectedMeta').textContent='查看它的分类与当前生长阶段。';$('#selectedLink').hidden=true;
  updateLayers();loader.hidden=true;dirty=true;
 }catch(error){console.error(error);loader.textContent='花海未能加载：'+error.message+'。可刷新重试或返回单朵检查目录。'}finally{lock(false)}
}
$('#regenerate').onclick=()=>{$('#seed').value='meadow-'+Date.now().toString(36);regenerate()};$('#applySeed').onclick=regenerate;$('#seed').addEventListener('keydown',e=>{if(e.key==='Enter')regenerate()});$('#density').onchange=regenerate;
document.querySelectorAll('[data-layer]').forEach(e=>e.onchange=updateLayers);
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{controls.leave();selectView(b.dataset.view)});
function leavePreset(){if(activeView)controls.leave();activeView=null;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',false))}
const pointers=new Map();let start=null,pinch=0,moved=false;const canvas=renderer.domElement,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);if(controls.pointerDown(e))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});start={x:e.clientX,y:e.clientY};moved=false;pinch=0});
canvas.addEventListener('pointermove',e=>{if(controls.pointerMove(e))return;if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>5){moved=true;leavePreset()}
 if(pointers.size===1){if(e.shiftKey||e.buttons===2){target.x-=dx*.018*Math.cos(theta);target.z+=dx*.018*Math.sin(theta);target.x-=dy*.018*Math.sin(theta);target.z-=dy*.018*Math.cos(theta);target.x=clamp(target.x,-150,150);target.z=clamp(target.z,-150,150)}else{theta-=dx*.006;phi=clamp(phi-dy*.005,.08,1.52)}}else{const [a,b]=[...pointers.values()],dist=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0)radius=clamp(radius*pinch/dist,3,390);pinch=dist;moved=true}dirty=true;
});
canvas.addEventListener('pointerup',e=>{const brushTap=controls.pointerUp(e),wasClick=brushTap===null?!moved&&pointers.size===1:brushTap;pointers.delete(e.pointerId);pinch=0;if(!wasClick||!built)return;updateCamera();camera.updateMatrixWorld();scene.updateMatrixWorld(true);const rect=canvas.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);const hit=built.pick(raycaster);if(!hit)return;showSpecimen(hit.object.userData.plants[hit.instanceId].slug)});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{controls.cancel();pointers.delete(e.pointerId);pinch=0});
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{e.preventDefault();leavePreset();radius=clamp(radius*Math.exp(e.deltaY*.001),3,390);dirty=true},{passive:false});
stage.addEventListener('keydown',e=>{let changed=true;if(e.key==='ArrowLeft')theta-=.1;else if(e.key==='ArrowRight')theta+=.1;else if(e.key==='ArrowUp')phi=clamp(phi-.08,.08,1.52);else if(e.key==='ArrowDown')phi=clamp(phi+.08,.08,1.52);else if(e.key==='+'||e.key==='=')radius=clamp(radius-1,3,390);else if(e.key==='-')radius=clamp(radius+1,3,390);else changed=false;if(changed){e.preventDefault();leavePreset();dirty=true}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();loader.hidden=false;loader.textContent='三维显示中断，请刷新恢复；可选择轻量模式降低显示开销。'});
document.addEventListener('visibilitychange',()=>{lastFrame=null;lastClock='';dirty=true});
// A persisted pagehide enters the browser's back-forward cache. Keep its scene
// alive so returning from an individual flower study restores the same meadow.
window.addEventListener('pageshow',()=>{lastFrame=null;lastClock='';dirty=true});
window.addEventListener('pagehide',event=>{if(event.persisted)return;closed=true;trail.dispose();driftCover.dispose();understory?.dispose();built?.dispose();for(const t of templates.values())t.dispose();blade.dispose();grass.material.dispose();grass.dispose();groundGeometry.dispose();ground.material.dispose();wind.dispose();bloom.dispose();daySky.dispose();renderer.dispose()});
selectView("turn");await regenerate();
})().catch(error=>{console.error(error);const loader=document.querySelector('#loader');loader.hidden=false;loader.textContent='花海初始化失败：'+error.message});
