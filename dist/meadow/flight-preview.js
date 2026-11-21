/* Canvas 2D companion to the low-flight cameras. Each scene has registered
 * botanical poses: the blend around a moving palm is measured in image space,
 * so a bloom stays attached to its flower as the camera drifts. */
(function(root){
'use strict';
const shots=['turn','hover','entry'];
const gridWidth=128,gridHeight=72,artWidth=1254,artHeight=706;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
function create(stage,{onSelect=()=>{}}={}){
 const element=document.createElement('canvas');
 element.style.cssText='position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair';
 element.setAttribute('aria-label','低空花带手绘预览，划过花丛使其绽放，轻点花朵可查看花谱');
 stage.prepend(element);
 const ctx=element.getContext('2d',{alpha:false});
 const layers=Object.create(null),frames=Object.create(null);
 let flowers={},current='turn',interactive=false,flying=false,disposed=false;
 let motion=0,windTime=0,elapsed=0,drawDebt=1,interaction=0,dirty=true,lastOpening=-1;
 let clock={hour:11,opening:1,windStrength:1},lastWind=false;
 let lastPoint=null,screen={x:0,y:0,w:1,h:1};
 const glow=new Float32Array(gridWidth*gridHeight),target=new Float32Array(glow.length);
 const half=document.createElement('canvas'),full=document.createElement('canvas');
 const mix=document.createElement('canvas'),overlay=document.createElement('canvas');
 const mixCtx=mix.getContext('2d',{alpha:false}),overlayCtx=overlay.getContext('2d');
 half.width=full.width=gridWidth;half.height=full.height=gridHeight;
 mix.width=overlay.width=artWidth;mix.height=overlay.height=artHeight;
 const halfCtx=half.getContext('2d'),fullCtx=full.getContext('2d');
 const halfPixels=halfCtx.createImageData(gridWidth,gridHeight),fullPixels=fullCtx.createImageData(gridWidth,gridHeight);
 halfPixels.data.fill(255);fullPixels.data.fill(255);
 const controller=new AbortController();
 fetch('./flight-poses/flowers.json',{signal:controller.signal})
  .then(r=>r.ok?r.json():{}).then(data=>{if(!disposed)flowers=data}).catch(()=>{});
 function load(shot){
  if(layers[shot])return;
  const pack=layers[shot]={};
  for(const pose of ['full','half','bud']){
   const img=new Image();img.decoding='async';
   img.onload=()=>{if(disposed)return;pack[pose]=img;dirty=true;
    if(shot===current)draw();
    if(pose==='full'&&shot==='turn')for(const s of shots)if(s!==shot)load(s);
   };
   img.onerror=()=>{if(!disposed){dirty=true;delete pack[pose]}};
   img.src='./flight-poses/'+shot+'-'+pose+'.webp';frames[shot+pose]=img;
  }
 }
 function transform(){
  const W=element.width,H=element.height;
  const glide=Math.sin(motion*.104),lift=Math.sin(motion*.137+.55);
  // A small breathing margin supports the wind shift while keeping the
  // complete focal clump in frame, including on narrower touch displays.
  const focusX={turn:.19,entry:.48,hover:.77}[current];
  const zoom=1.014+.004*Math.sin(motion*.113-.75);
  const size=Math.max(W/artWidth,H/artHeight)*zoom,w=artWidth*size,h=artHeight*size;
  const x=(W-w)*(focusX+.026*glide),y=(H-h)*(.51+.045*lift);
  screen={x,y,w,h};return screen;
 }
 function fromScreen(nx,ny){
  return [(nx*element.width-screen.x)/screen.w,(ny*element.height-screen.y)/screen.h];
 }
 function stamp(x,y){
  const rx=.047+.052*y,ry=rx*artWidth/artHeight;
  const loX=Math.max(0,Math.floor((x-rx)*gridWidth)),hiX=Math.min(gridWidth-1,Math.ceil((x+rx)*gridWidth));
  const loY=Math.max(0,Math.floor((y-ry)*gridHeight)),hiY=Math.min(gridHeight-1,Math.ceil((y+ry)*gridHeight));
  for(let j=loY;j<=hiY;j++)for(let i=loX;i<=hiX;i++){
   const dx=((i+.5)/gridWidth-x)/rx,dy=((j+.5)/gridHeight-y)/ry;
   const d=Math.sqrt(dx*dx+dy*dy);if(d>=1)continue;
   const k=j*gridWidth+i;
   // Negative ages let the outer corollas respond a fraction after the centre.
   const impulse=(1-smooth((d-.52)/.48))*1.35;
   target[k]=Math.max(target[k],impulse);
  }
 }
 function point(nx,ny){
  if(disposed||element.hidden||!Number.isFinite(nx+ny)||nx<0||nx>1||ny<0||ny>1)return;
  const [x,y]=fromScreen(nx,ny);
  if(lastPoint&&elapsed-lastPoint.t<.19){
   const dx=x-lastPoint.x,dy=y-lastPoint.y,dist=Math.hypot(dx,dy);
   if(dist<.31){const n=Math.ceil(dist/.024);for(let i=1;i<n;i++)stamp(lastPoint.x+dx*i/n,lastPoint.y+dy*i/n)}
  }
  stamp(x,y);lastPoint={x,y,t:elapsed};dirty=true;
 }
 function drawLayer(img,mask){
  overlayCtx.globalCompositeOperation='source-over';overlayCtx.clearRect(0,0,artWidth,artHeight);
  overlayCtx.drawImage(img,0,0,artWidth,artHeight);overlayCtx.globalCompositeOperation='destination-in';
  overlayCtx.drawImage(mask,0,0,artWidth,artHeight);overlayCtx.globalCompositeOperation='source-over';
  mixCtx.drawImage(overlay,0,0);
 }
 function compose(pack){
  const bud=pack.bud||pack.half||pack.full,mid=pack.half||pack.full||bud,open=pack.full||mid;
  const resting=clock.opening*(1-interaction*.91);
  let maxField=0;
  for(let i=0;i<glow.length;i++){
   maxField=Math.max(maxField,glow[i]);
   const amount=resting+(1-resting)*smooth(glow[i]);
   halfPixels.data[i*4+3]=Math.round(255*smooth(amount*2));
   fullPixels.data[i*4+3]=Math.round(255*smooth(amount*2-1));
  }
  mixCtx.globalAlpha=1;
  if(maxField<.003){
   const first=resting<.5?bud:mid,second=resting<.5?mid:open;
   mixCtx.drawImage(first,0,0,artWidth,artHeight);
   mixCtx.globalAlpha=smooth(resting<.5?resting*2:resting*2-1);mixCtx.drawImage(second,0,0,artWidth,artHeight);mixCtx.globalAlpha=1;
  }else{
   halfCtx.putImageData(halfPixels,0,0);fullCtx.putImageData(fullPixels,0,0);
   mixCtx.drawImage(bud,0,0,artWidth,artHeight);drawLayer(mid,half);drawLayer(open,full);
  }
 }
 function light(){
  const h=clock.hour,day=smooth((h-5)/3)*(1-smooth((h-17)/3.2));
  const dusk=smooth((h-14)/4)*(1-smooth((h-19)/2));
  if(dusk>.003){ctx.fillStyle='rgba(248,157,110,'+(dusk*.18)+')';ctx.fillRect(0,0,element.width,element.height)}
  if(day<.995){ctx.fillStyle='rgba(37,44,99,'+((1-day)*.30)+')';ctx.fillRect(0,0,element.width,element.height)}
 }
 function draw(){
  if(disposed||element.hidden)return;
  const pack=layers[current];if(!pack||!(pack.full||pack.half||pack.bud))return;
  const W=Math.max(1,Math.round(stage.clientWidth*Math.min(1.4,root.devicePixelRatio||1)));
  const H=Math.max(1,Math.round(stage.clientHeight*Math.min(1.4,root.devicePixelRatio||1)));
  if(element.width!==W||element.height!==H){element.width=W;element.height=H;dirty=true}
  if(dirty){compose(pack);lastOpening=clock.opening;dirty=false}
  const {x,y,w,h}=transform();
  // A row-dependent phase keeps the horizon still while the closest flowers
  // catch the breeze. Overscan leaves enough room at both horizontal edges.
  if(!lastWind)ctx.drawImage(mix,x,y,w,h);
  else{
   const bands=28,amp=Math.min(W,H)*.002*(clock.windStrength??1);
   for(let j=0;j<bands;j++){
    const t=j/bands,mask=t*t,sy=Math.floor(artHeight*t),end=Math.ceil(artHeight*(j+1)/bands);
    const dx=amp*mask*(Math.sin(windTime*.58-5*t)+.32*Math.sin(windTime*.89+8*t));
    ctx.drawImage(mix,0,sy,artWidth,end-sy,x+dx,y+sy/artHeight*h,w,(end-sy)/artHeight*h+.55);
   }
  }
  light();
 }
 function update(state,dt=0,wind=true,travelDt=dt){
  if(disposed||element.hidden)return;clock=state;dt=Math.max(0,Math.min(.2,dt));elapsed+=dt;
  if(wind)windTime+=dt;
  if(flying)motion+=Math.max(0,Math.min(.2,travelDt));
  const old=interaction;
  interaction+=((interactive?1:0)-interaction)*(1-Math.exp(-dt*3.2));
  dirty=dirty||Math.abs(old-interaction)>.0002||Math.abs(lastOpening-state.opening)>.0004;
  lastWind=wind;
  for(let i=0;i<glow.length;i++){
   if(!target[i]&&!glow[i])continue;
   const before=glow[i],aim=clamp(target[i]);
   glow[i]+=(aim-glow[i])*(1-Math.exp(-dt*(aim>glow[i]?8:2.9)));
   target[i]=Math.max(0,target[i]-dt*.255);
   if(glow[i]<.0009&&!target[i])glow[i]=0;
   if(Math.abs(before-glow[i])>.00008)dirty=true;
  }
  drawDebt+=dt;if(drawDebt>=1/28||dt===0){drawDebt=0;draw()}
 }
 function pick(nx,ny){
  if(disposed||element.hidden)return null;
  const [x,y]=fromScreen(nx,ny),rows=flowers[current]||[];
  const ix=Math.max(0,Math.min(gridWidth-1,Math.floor(x*gridWidth))),iy=Math.max(0,Math.min(gridHeight-1,Math.floor(y*gridHeight)));
  const g=smooth(glow[iy*gridWidth+ix]),rest=clock.opening*(1-interaction*.91),v=rest+(1-rest)*g;
  let best=Infinity,slug=null;
  for(const [fx,fy,rx,ry,id,bx,by] of rows){
   const cx=bx+(fx-bx)*v,cy=by+(fy-by)*v;
   const dx=(x-cx)/Math.max(.008,rx*(.34+.75*v)),dy=(y-cy)/Math.max(.011,ry*(.65+.45*v));
   const d=dx*dx+dy*dy;if(d<1.15&&d<best){best=d;slug=id}
  }
  if(slug)onSelect(slug);return slug;
 }
 function setShot(id){if(!shots.includes(id)||disposed)return;current=id;motion=0;lastPoint=null;target.fill(0);glow.fill(0);dirty=true;load(id);draw()}
 function setInteractive(v){interactive=!!v;if(!v)lastPoint=null}
 function dispose(){disposed=true;controller.abort();for(const img of Object.values(frames)){img.onload=null;img.onerror=null}element.remove();mix.width=overlay.width=half.width=full.width=1}
 load(current);
 return {element,update,point,end(){lastPoint=null},pick,setShot,setInteractive,setFlying(v){flying=!!v},dispose};
}
root.MeadowFlightPreview={create};
})(typeof globalThis!=='undefined'?globalThis:this);
