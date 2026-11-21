/* A small world-space opening mask shared by the colour pass, shadows and picking. */
(function(root){
'use strict';
function create(T){
 const size=128,span=20,step=span/size,pixels=new Uint8Array(size*size*4);
 const texture=new T.DataTexture(pixels,size,size,T.RGBAFormat);
 texture.minFilter=texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
 const origin=new T.Vector2(), mix={value:0};
 const uniforms={uGestureMap:{value:texture},uGestureOrigin:{value:origin},uGestureMode:mix};
 const marks=[];let enabled=false,clock=0,nextUpdate=0,last=null,hasInk=false;
 const clamp=x=>Math.max(0,Math.min(1,x));
 function setEnabled(value){enabled=value;if(!value)last=null}
 function point(x,z){
  if(!enabled||!Number.isFinite(x+z))return;
  const d=last?Math.hypot(x-last.x,z-last.z):0;
  if(last&&clock-last.t<.10&&d<.19)return;
  const n=last&&clock-last.t<.38&&d<3?Math.max(1,Math.ceil(d/.32)):1;
  for(let i=1;i<=n;i++)marks.push({x:x-(x-(last?.x??x))*(1-i/n),z:z-(z-(last?.z??z))*(1-i/n),t:clock});
  if(marks.length>120)marks.splice(0,marks.length-120);
  last={x,z,t:clock};nextUpdate=clock;
 }
 function tick(dt,eye){
  clock+=dt;mix.value+=(Number(enabled)-mix.value)*(1-Math.exp(-dt*4));
  if(Math.abs(mix.value-Number(enabled))<.002)mix.value=Number(enabled);
  if(clock<nextUpdate)return;
  nextUpdate=clock+.055;
  while(marks.length&&clock-marks[0].t>4.8)marks.shift();
  if(!marks.length&&!hasInk)return;
  origin.set(Math.floor((eye.x-span/2)/step)*step,Math.floor((eye.z-span/2)/step)*step);
  pixels.fill(0);hasInk=marks.length>0;
  for(const p of marks){
   const age=clock-p.t,r=1.35,cx=(p.x-origin.x)/step-.5,cz=(p.z-origin.y)/step-.5,reach=r/step;
   for(let j=Math.max(0,Math.floor(cz-reach));j<=Math.min(size-1,Math.ceil(cz+reach));j++)
    for(let i=Math.max(0,Math.floor(cx-reach));i<=Math.min(size-1,Math.ceil(cx+reach));i++){
     const dist=Math.hypot(i-cx,j-cz)*step,arrival=age-dist*.27;
     const phase=clamp(arrival/.52),release=clamp((4.55-arrival)/1.75);
     const gain=phase*phase*(3-2*phase)*release*clamp((r-dist)/.36);
     const index=4*(j*size+i);pixels[index]=Math.max(pixels[index],Math.round(255*gain));
    }
  }
  texture.needsUpdate=true;
 }
 function sample(x,z){
  const u=(x-origin.x)/step-.5,v=(z-origin.y)/step-.5,i=Math.floor(u),j=Math.floor(v);
  if(i<0||j<0||i+1>=size||j+1>=size)return 0;
  const a=u-i,b=v-j,at=(i,j)=>pixels[(j*size+i)*4]/255;
  return (at(i,j)*(1-a)+at(i+1,j)*a)*(1-b)+(at(i,j+1)*(1-a)+at(i+1,j+1)*a)*b;
 }
 function openingAt(x,z,base){
  const rest=base*(.27+.13*Math.sin(x*1.43+z*.93));
  return base+(rest+(1-rest)*sample(x,z)-base)*mix.value;
 }
 return {uniforms,setEnabled,point,tick,openingAt,end(){last=null},dispose(){texture.dispose()}};
}
const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MeadowBloomTrail=api;
})(typeof globalThis!=='undefined'?globalThis:this);
