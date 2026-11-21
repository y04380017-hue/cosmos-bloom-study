(function(root){
  'use strict';
  const horizon=.41, circumference=4;
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const wrap=x=>((x%circumference)+circumference)%circumference;
  const offset=(x,center)=>wrap(x-center+circumference/2)-circumference/2;
  const opposite=side=>side==='Right'?'Left':'Right';
  // Focus is a dolly toward the hillside, with its optical axis rising toward the crest.
  // Both directions of the projection use the same scale and screen anchor.
  const lens=view=>view.zoom*(1+1.65*(view.focus||0));
  const anchor=view=>horizon+.16*(view.focus||0);
  function row(y,view){
    const depth=Math.max(0,(y-horizon)/(1-horizon));
    const scale=lens(view)/(1-view.travel*depth);
    return {scale,sx:scale/(view.span||1),center:.5+view.pan,y:anchor(view)+(y-horizon)*scale};
  }
  function worldPoint(x,y,view){
    const d=y-anchor(view);
    const wy=horizon+d/(lens(view)+view.travel*Math.max(0,d)/(1-horizon));
    const r=row(wy,view);
    return {x:r.center+(x-.5)/r.sx,y:wy};
  }
  function screenCrest(x,view,groundAt){
    let y=anchor(view);
    for(let i=0;i<5;i++){
      const longitude=worldPoint(x,y,view).x;
      y=row(groundAt(longitude),view).y;
    }
    return y;
  }
  function palmTarget(x,y,view,groundAt){
    const top=screenCrest(x,view,groundAt);
    const reach=clamp((y-.24)/.54,0,1);
    // Reserve the upper part of a comfortable, chest-height sweep for the hills.
    return {x,y:top+.008+(.985-top-.008)*Math.pow(reach,1.55)};
  }
  function create(){
    const view={zoom:1.12,travel:0,pan:0,focus:0,span:1};
    function focus(value){view.focus=clamp(value,0,1);}
    function heading(degrees){view.pan=wrap(degrees/90);}
    function update(delta){
      if(!delta)return;
      view.pan=wrap(view.pan+delta.x*2.75);
      focus(view.focus-(delta.y||0)*3.4+delta.depth*.36);
      view.zoom=clamp(view.zoom+delta.extension*.87,1.1,2.15);
      view.travel=clamp(view.travel+delta.depth*.78,Math.max(-.20,1.002-view.zoom),.38);
    }
    function home(){Object.assign(view,{zoom:1.12,travel:0,pan:0,focus:0});}
    return {view,heading,focus,update,home};
  }
  function route(){
    const tracks=new Map();
    let identified=null,lastTime=null;
    function reset(forget=false){tracks.clear();lastTime=null;if(forget)identified=null;}
    function frame(hands,preferred='auto',time=performance.now()){
      if(lastTime!==null && (time-lastTime>280 || time<lastTime))tracks.clear();
      lastTime=time;
      for(const side of ['Left','Right']){
        const h=hands.find(v=>v.side===side);
        if(!h){tracks.delete(side);continue;}
        const prev=tracks.get(side);
        const fresh=!prev || Math.hypot(prev.raw.x-h.x,prev.raw.y-h.y)>.30;
        const history=fresh?[]:prev.history.slice(-2);
        const last=history.at(-1);
        const dx=last?h.x-last.x:0,dy=last?h.y-last.y:0;
        const depth=last?Math.log(h.size/last.size):0;
        const base=history[0]||h;
        const reach=Math.hypot(h.x-base.x,h.y-base.y,.19*Math.log(h.size/base.size));
        const speed=Math.hypot(dx,dy,.19*depth);
        const aligned=dx*(h.x-base.x)+dy*(h.y-base.y)+.0361*depth*Math.log(h.size/base.size)>0;
        // Both a sustained displacement and a fresh raw step are required. A
        // stationary palm stops the camera immediately, even while the other moves.
        const moving=history.length===2 && aligned && speed>.0025 && reach>.012;
        history.push(h);
        tracks.set(side,{raw:h,history,moving,delta:{x:dx,y:dy,depth,extension:last?h.extension-last.extension:0},
          count:fresh?1:prev.count+1,openCount:h.open?(fresh?1:prev.openCount+1):0,
          x:fresh?h.x:prev.x+.55*(h.x-prev.x),y:fresh?h.y:prev.y+.55*(h.y-prev.y)});
      }
      if(preferred==='Left' || preferred==='Right')identified=preferred;
      else if(!identified && tracks.size===1){
        const [side,track]=tracks.entries().next().value;if(track.count>=3 && (preferred!=='bloomFirst' || track.openCount>=2))identified=preferred==='bloomFirst'?opposite(side):side;
      }
      const nav=tracks.get(identified),b=identified?tracks.get(opposite(identified)):null;
      return {side:identified,bloom:b && (b.openCount>=2 || (b.raw.open && b.raw.extension>.7) ||
          (b.count>1 && b.raw.extension>.62 && b.history.slice(0,-1).some(sample=>sample.open)))?b:null,nav:nav?.count>=2?nav:null,
        delta:nav?.moving && b?.moving?nav.delta:null};
    }
    return {reset,frame};
  }
  const api={row,worldPoint,screenCrest,palmTarget,create,route,offset,wrap,circumference,opposite};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.SpringCamera=api;
})(globalThis);
