/* Device-local artistic daylight cycle. No location request or astronomical claim. */
(function(root){
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)},mix=(a,b,t)=>a+(b-a)*t;
const rgb=hex=>[16,8,0].map(s=>(parseInt(hex.slice(1),16)>>s&255)/255);
const palettes={
 night:{zenith:'#627baa',horizon:'#afc8dc',sunColor:'#ffd0a3',ambient:1.04,sunIntensity:0,rimIntensity:.78,exposure:1.07},
 dawn:{zenith:'#68bced',horizon:'#c6e7f5',sunColor:'#ffe4ba',ambient:.82,sunIntensity:2.3,rimIntensity:.75,exposure:1.04},
 day:{zenith:'#58b9f1',horizon:'#b2e3f9',sunColor:'#fff7e8',ambient:.98,sunIntensity:3.85,rimIntensity:1.24,exposure:1.04},
 afternoon:{zenith:'#6abce8',horizon:'#d6e9ed',sunColor:'#ffe5b8',ambient:.92,sunIntensity:3.15,rimIntensity:1.05,exposure:1.04},
 dusk:{zenith:'#8887cb',horizon:'#ffc7a2',sunColor:'#ffc490',ambient:.74,sunIntensity:1.65,rimIntensity:.65,exposure:1.05}
};
const keys=[[0,'night'],[5,'night'],[6.5,'dawn'],[9,'day'],[14,'day'],[17.3,'afternoon'],[18.7,'dusk'],[20,'night'],[24,'night']];
function labelAt(hour){return hour>=6&&hour<15?'白天':hour>=15&&hour<17.75?'午后':hour>=17.75&&hour<19.5?'黄昏':'夜间休憩'}
function stateAt(hour){
 if(!Number.isFinite(hour))throw new Error('Time must be finite');hour=(hour%24+24)%24;
 let pair=0;while(pair<keys.length-2&&hour>=keys[pair+1][0])pair++;
 const [a,nameA]=keys[pair],[b,nameB]=keys[pair+1],p=palettes[nameA],q=palettes[nameB],blend=smooth(a,b,hour),state={hour,label:labelAt(hour)};
 for(const key of ['zenith','horizon','sunColor']){const ca=rgb(p[key]),cb=rgb(q[key]);state[key]=ca.map((v,i)=>mix(v,cb[i],blend))}
 for(const key of ['ambient','sunIntensity','rimIntensity','exposure'])state[key]=mix(p[key],q[key],blend);
 state.opening=smooth(6,9,hour)*(1-smooth(15,19,hour));
 state.windStrength=mix(.35,1,state.opening);
 const t=(hour-5.5)/14,alt=Math.sin(t*Math.PI)*.32,az=(.5-clamp(t))*2.6;
 state.sunDirection=[Math.sin(az)*Math.cos(alt),Math.sin(alt),-Math.cos(az)*Math.cos(alt)];
 state.sunVisibility=smooth(5.5,6,hour)*(1-smooth(17.6,18.5,hour));return state;
}
function localHour(date){return date.getHours()+date.getMinutes()/60+date.getSeconds()/3600+date.getMilliseconds()/3600000}
function createController(now=()=>new Date()){
 let mode='auto',hour=localHour(now()),start=hour,target=hour,elapsed=3;
 return {get mode(){return mode},setManual(value){if(!Number.isFinite(value))throw new Error('Invalid manual hour');start=hour;target=clamp(value,0,23.999);elapsed=0;mode='manual'},setAuto(){mode='auto';hour=localHour(now());elapsed=3},tick(dt=0){
  if(mode==='auto')hour=localHour(now());else{elapsed+=Math.max(0,Math.min(dt,.25));hour=mix(start,target,smooth(0,2.4,elapsed))}
  return stateAt(hour);
 },get transitioning(){return mode==='manual'&&elapsed<2.4}};
}
const api={stateAt,labelAt,localHour,createController};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MeadowDayCycle=api;
})(typeof globalThis!=='undefined'?globalThis:this);
