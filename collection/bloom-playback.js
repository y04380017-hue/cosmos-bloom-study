(function(root){
'use strict';
// The display timeline begins with exposed, slightly parted petals.
// Match the five approved review models throughout the timeline.
function pose(progress){
 const p=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
 return .25+.75*p;
}
function reveal(group){
 group.traverse(part=>{
  if(part.name==='bud-cover'||part.name==='cosmos-bract'||part.name==='balloon-bud')part.visible=false;
 });
}
const api={pose,reveal};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BloomPlayback=api;
})(typeof globalThis!=='undefined'?globalThis:this);
