(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const canvas=$('field'),ctx=canvas.getContext('2d'),camera=$('camera'),status=$('status'),reset=$('reset'),time=$('time');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let width=1,height=1,field,atlas,active=false,lastPoint=null,pointer=null,keyboardStep=0,raf=0,nextMinute=0,daylight=1;
  const navigation=SpringCamera.create(), router=SpringCamera.route(), choice=$('viewHand'), sheet=$('specimen');
  const scenery=$('scenery'), sc=scenery.getContext('2d'), terrain=new Image();
  terrain.src='./wind-circle.webp';
  let backgroundKey='', pointerStart, dragging=false, species=[], hitList=[], mask;
  let aim=null;
  const maskSize=48;
  try{
    const saved=localStorage.getItem('meadow-hills-view-hand');
    if(['bloomFirst','auto','Left','Right'].includes(saved))choice.value=saved;
  }catch{}
  const now=()=>performance.now()/1000;
  const clockText='划过草坪开出花带，轻点已开的花查看图鉴';
  function resize(){
    width=canvas.clientWidth;height=canvas.clientHeight;
    const dpr=Math.min(devicePixelRatio||1,1.8);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx?.setTransform(dpr,0,0,dpr,0,0);
    scenery.width=canvas.width;scenery.height=canvas.height;sc?.setTransform(dpr,0,0,dpr,0,0);
    navigation.view.span=Math.max(.29,Math.min(1.65,(width/height)/1.6));backgroundKey='';

  }
  function lighting(){
    const d=new Date(),h=d.getHours()+d.getMinutes()/60;
    const mode=time.value, hour=mode==='auto'?h:({day:11,afternoon:15.5,dusk:18.5}[mode]);
    const strength=Math.max(0,Math.min(1,(19.7-hour)/2.4,(hour-5.2)/2));
    daylight=strength;
    const tint=hour<5.2||hour>19.7?'rgba(28,46,99,.58)':hour>=17.3?'rgba(243,141,118,'+(.10+.23*(1-strength))+')':
      hour<7?'rgba(252,205,171,.18)':hour>=14?'rgba(255,222,158,.065)':'rgba(255,250,210,.025)';
    $('light').style.background=tint;
  }
  // This small luminous disk is composited behind the corolla of a sunlit flower only.
  const halo=document.createElement('canvas');halo.width=halo.height=64;
  const glow=halo.getContext('2d');
  if(glow){
    const grad=glow.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0,'rgba(255,251,211,.8)');grad.addColorStop(.23,'rgba(255,239,172,.50)');
    grad.addColorStop(.62,'rgba(255,228,145,.17)');grad.addColorStop(1,'rgba(255,235,163,0)');
    glow.fillStyle=grad;glow.fillRect(0,0,64,64);
  }
  // Periodic waves share a world coordinate with the grass, flowers and panorama.
  function windAt(x,y,t){return Math.sin(t*1.08-x*Math.PI*2+y*7)+.34*Math.sin(t*.71-x*Math.PI*3+y*11);}
  const grass=Array.from({length:2060},(_,i)=>{
    const noise=n=>{const v=Math.sin((i+1)*n)*43758.5453;return v-Math.floor(v);};
    return {x:4*noise(19.31),y:.44+.59*noise(40.17),phase:noise(13.7)*6.28,scale:.55+.67*noise(37.1)};
  });
  function grassLight(t){
    ctx.lineCap='round';
    for(const g of grass){
      const r=SpringCamera.row(g.y,navigation.view),d=(g.y-.44)*1.8;
      const x=(.5+SpringCamera.offset(g.x,r.center)*r.sx)*width,y=r.y*height;
      if(x < -18 || x>width+18 || y>height+20)continue;
      const length=height*r.scale*(.003+.036*d*d)*g.scale;
      const breeze=windAt(g.x,g.y,t);
      const lit=breeze>.30;
      for(let blade=0;blade<4;blade++){
        const bx=x+(blade-1)*length*.21, l=length*(.73+.22*Math.sin(g.phase+blade));
        const lean=(blade-1.5)*.23+.28;
        const bend=lean+.62*breeze+.06*Math.sin(t+g.phase);
        ctx.lineWidth=Math.max(.70,l*.093);
        ctx.strokeStyle=blade===1 || blade===3 ? (lit?'rgba(244,243,152,.66)':'rgba(209,233,143,.48)') : 'rgba(84,152,66,.35)';
        ctx.beginPath();ctx.moveTo(bx,y);ctx.quadraticCurveTo(bx+l*(lean*.36+breeze*.12),y-l*.67,bx+l*bend,y-l*(.97-.17*Math.abs(bend)));ctx.stroke();
      }
    }
  }
  function paintLandscape(view,t){
    if(!terrain.naturalWidth || !sc)return;
    // Only the near, painted blades shimmer. The horizon stays still when the
    // camera is locked. Redraw the background at a lower cadence than the flowers.
    const phase=reduced.matches?0:Math.floor(t*20)/20;
    const key=[view.zoom,view.pan,view.travel,view.focus,phase].join(',');
    if(key===backgroundKey)return;
    backgroundKey=key;
    const sector=terrain.naturalWidth/SpringCamera.circumference,h=terrain.naturalHeight;
    const step=Math.max(5,Math.round(height/70));
    for(let y=0;y<height;y+=step){
      const end=Math.min(height,y+step),mid=(y+end)/2/height;
      const left=SpringCamera.worldPoint(0,mid,view),r=SpringCamera.row(left.y,view);
      const top=SpringCamera.worldPoint(0,y/height,view).y;
      const bottom=SpringCamera.worldPoint(0,end/height,view).y;
      const depth=Math.max(0,(left.y-.51)/.49);
      const drift=reduced.matches?0:depth*depth*.0035*windAt(r.center,left.y,phase);
      const sx=SpringCamera.wrap(left.x+drift)*sector,sw=sector/r.sx;
      const first=Math.min(sw,terrain.naturalWidth-sx),dst=width*first/sw;
      sc.drawImage(terrain,sx,top*h,first,(bottom-top)*h,0,y,dst,end-y+.35);
      if(sw-first>.001)sc.drawImage(terrain,0,top*h,sw-first,(bottom-top)*h,dst,y,width-dst,end-y+.35);
    }
  }
  function buildMask(image){
    const c=document.createElement('canvas');c.width=7*maskSize;c.height=species.length*maskSize;
    const g=c.getContext('2d');g.drawImage(image,0,0,c.width,c.height);
    const rgba=g.getImageData(0,0,c.width,c.height).data;
    return Uint8Array.from({length:c.width*c.height},(_,i)=>rgba[i*4+3]);
  }
  function flowerAt(x,y){
    for(let i=hitList.length-1;i>=0;i--){
      const h=hitList[i],dx=x-h.x,dy=y-h.y;
      if(Math.abs(dx)>h.side || dy>h.side*.16 || dy < -h.side*1.06)continue;
      const cos=Math.cos(h.wind),sin=Math.sin(h.wind);
      const u=Math.floor((.5+h.flip*(dx*cos+dy*sin)/h.side)*maskSize);
      const v=Math.floor((.96+(-dx*sin+dy*cos)/h.side)*maskSize);
      if(u<0 || v<0 || u>=maskSize || v>=maskSize)continue;
      if(mask[((h.species*maskSize+v)*7+h.frame)*maskSize+u]>42)return species[h.species];
    }
    return null;
  }
  function showFlower(item){
    if(!item || sheet.open)return;
    $('flowerName').textContent=item.name;$('latin').textContent=item.scientific;
    $('flowerMeta').textContent=[item.family,item.genus,item.category].filter(Boolean).join(' · ');
    $('flowerStory').textContent=item.description;$('fullSpecimen').href=item.detailUrl;
    const viewer=document.createElement('iframe');viewer.title=item.name+'三维模型';viewer.src=item.detailUrl+'?meadow=1';
    $('modelSlot').replaceChildren(viewer);sheet.showModal();router.reset();lastPoint=null;
  }
  $('closeSheet').addEventListener('click',()=>sheet.close());
  sheet.addEventListener('close',()=>{$('modelSlot').replaceChildren();lastPoint=null;canvas.focus();});
  function paint(stamp){
    const t=stamp/1000;
    if(t>=nextMinute){lighting();nextMinute=t+30;}

    const view=navigation.view;
    paintLandscape(view,t);
    ctx.clearRect(0,0,width,height);hitList.length=0;
    grassLight(reduced.matches?0:t);
    if(field && field.count && atlas){
      for(const p of field.plants){
        const age=t-p.start;
        if(age<0)continue;
        const progress=SpringField.opening(p,t), appearance=Math.min(1,age/.35);
        const r=SpringCamera.row(p.y,view);
        const side=height*p.size*r.scale*(.72+.28*appearance);
        if(side<1)continue;
        const x=(.5+SpringCamera.offset(p.x+p.tile,r.center)*r.sx)*width,y=r.y*height;
        if(x < -side || x>width+side || y<0 || y>height+side)continue;
        const wind=reduced.matches?0:windAt(p.x+p.tile,p.y,t)*.047+Math.sin(t*.63+p.phase)*.018;
        ctx.save();ctx.translate(x,y);ctx.rotate(wind);ctx.scale(p.flip,1);
        if(progress>.36 && side>7 && glow){
          const r=side*(.36+.14*progress);
          ctx.globalAlpha=(.14+.26*daylight)*progress;
          ctx.drawImage(halo,-r,-.69*side-r,2*r,2*r);
        }
        const f=progress*6,index=Math.min(6,Math.floor(f)),mix=f-index;
        const dx=-side*.5,dy=-side*.96;
        ctx.globalAlpha=appearance;
        ctx.drawImage(atlas,index*112,p.species*112,112,112,dx,dy,side,side);
        if(index<6 && mix>.015){ctx.globalAlpha=mix*appearance;ctx.drawImage(atlas,(index+1)*112,p.species*112,112,112,dx,dy,side,side);}
        if(appearance>.25)hitList.push({x,y,side,wind,flip:p.flip,frame:Math.min(6,Math.round(f)),species:p.species});
        ctx.restore();
      }
    }
    if(aim && active && !sheet.open && t-aim.t<.26){
      const x=aim.x*width,y=aim.y*height;
      ctx.save();ctx.beginPath();ctx.ellipse(x,y,10,4,0,0,Math.PI*2);
      ctx.strokeStyle='rgba(44,92,72,.65)';ctx.lineWidth=3;ctx.stroke();
      ctx.strokeStyle='#fffbe1';ctx.lineWidth=1.3;ctx.stroke();ctx.restore();
    }
    raf=requestAnimationFrame(paint);
  }
  function wake(x,y,source){
    if(!field || !atlas || sheet.open)return;
    const view=navigation.view, t=now(),ratio=width/height;
    if(source==='palm'){
      y=SpringCamera.palmTarget(x,y,view,SpringField.groundAt).y;
      aim={x,y,t};
    }
    if(y<SpringCamera.screenCrest(x,view,SpringField.groundAt)){lastPoint=null;return;}
    function stamp(sx,sy,when){
      const crest=SpringCamera.screenCrest(sx,view,SpringField.groundAt);
      const world=SpringCamera.worldPoint(sx,Math.max(crest+.001,Math.min(1,sy)),view);
      field.wake(world.x,world.y,when,ratio,source!=='key');
    }
    if(source==='key'){lastPoint=null;stamp(x,y,t);}
    else lastPoint=SpringField.traceRibbon(lastPoint,x,y,t,ratio,source,stamp);
    reset.disabled=field.count===0;
  }
  const preview=MeadowHandPreview.create($('handPreview'));
  const hand=MeadowHandInput.create({
    onVideo:preview.video,
    onHands:hands=>{
      if(sheet.open || $('roles').open){preview.frame(hands,{paused:true});router.reset();lastPoint=null;return;}
      const {side,bloom,nav,delta}=router.frame(hands,choice.value);
      const before=field?.count||0;
      navigation.update(delta);
      if(delta){syncAngle();syncFocus();lastPoint=null;aim=null;}
      else if(bloom)wake(bloom.x,bloom.y,'palm');
      else if(lastPoint?.source==='palm'){
        const seen=hands.find(h=>h.side===SpringCamera.opposite(side));
        if((seen && !seen.open && seen.extension<.45) || now()-lastPoint.t>.40)lastPoint=null;
      }
      preview.frame(hands,{side,bloom:!!bloom,navigating:!!delta,added:(field?.count||0)-before});
      const name=side==='Left'?'左手':'右手';
      const message=!side?(choice.value==='bloomFirst'?'先单独举起想用来开花的手并张开手掌':'先单独举起视角手，再举起另一只手'):
        delta?'双手取景 · '+$('degrees').value:
        bloom?(bloom.y<.39?'山坡开花 · 沿浅色光圈扫动':'视角已锁定 · 花带正沿掌心绽放'):name+'取景 · '+(nav?'两手同时移动以环视':'视角已锁定');
      if(status.textContent!==message)status.textContent=message;
    },
    onLost:()=>{aim=null;lastPoint=null;router.reset();},
    onActive:value=>{preview.active(value);router.reset(true);lastPoint=null;active=value;camera.textContent=value?'关闭手势':'开启手势';camera.setAttribute('aria-pressed',String(value));},
    onStatus:message=>{status.textContent=message;if(active)preview.status(message);}
  });
  camera.addEventListener('click',()=>{$('roles').open=false;active?hand.stop():hand.start();});
  function roleHint(){
    $('roleHint').textContent=choice.value==='bloomFirst'?'先单独举起右手并张掌，另一只手会自动负责取景。':choice.value==='auto'?'先单独举起视角手，另一只手自动负责开花。':choice.value==='Left'?'左手取景，右手自动开花。':'右手取景，左手自动开花。';
  }
  roleHint();
  choice.addEventListener('change',()=>{roleHint();$('roles').open=false;router.reset(true);lastPoint=null;
    try{localStorage.setItem('meadow-hills-view-hand',choice.value);}catch{}});
  function syncAngle(){const angle=Math.round(navigation.view.pan*90)%360;$('bearing').value=angle;$('degrees').value=angle+'°';}
  function syncFocus(){
    const value=Math.round(navigation.view.focus*100);
    $('focus').value=value;$('focusValue').value=value+'%';
    $('lookFar').textContent=value>=70?'返回草坡':'望向远坡';
  }
  function setFocus(value){
    navigation.focus(value);syncFocus();router.reset();lastPoint=null;aim=null;
  }
  $('focus').addEventListener('input',()=>setFocus(+$('focus').value/100));
  $('lookFar').addEventListener('click',()=>{
    setFocus(navigation.view.focus>=.70?0:1);$('roles').open=false;
  });
  $('bearing').addEventListener('input',()=>{navigation.heading(+$('bearing').value);$('degrees').value=$('bearing').value+'°';router.reset();lastPoint=null;});
  $('homeView').addEventListener('click',()=>{navigation.home();syncAngle();setFocus(0);$('roles').open=false;});
  time.addEventListener('change',lighting);
  reset.addEventListener('click',()=>{field?.clear();lastPoint=null;keyboardStep=0;reset.disabled=true;ctx?.clearRect(0,0,width,height);status.textContent=active?'草坪已重置，张开手掌即可再次唤醒花朵。':clockText;});
  function coords(e){const rect=canvas.getBoundingClientRect();return {x:e.clientX-rect.left,y:e.clientY-rect.top};}
  canvas.addEventListener('pointerdown',e=>{
    if(pointer!==null || e.button!==0)return;
    $('roles').open=false;pointer=e.pointerId;pointerStart=coords(e);dragging=false;
    canvas.setPointerCapture(pointer);lastPoint=null;
  });
  canvas.addEventListener('pointermove',e=>{
    if(e.pointerId!==pointer)return;
    const p=coords(e);
    if(!dragging && Math.hypot(p.x-pointerStart.x,p.y-pointerStart.y)<6)return;
    if(!dragging)wake(pointerStart.x/width,pointerStart.y/height,'pointer');
    dragging=true;wake(p.x/width,p.y/height,'pointer');
  });
  canvas.addEventListener('pointerup',e=>{
    if(e.pointerId!==pointer)return;
    const p=coords(e);
    if(!dragging){const item=flowerAt(p.x,p.y);if(item)showFlower(item);else wake(p.x/width,p.y/height,'pointer');}
    pointer=null;lastPoint=null;
  });
  for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===pointer){pointer=null;lastPoint=null;}});
  canvas.addEventListener('keydown',e=>{
    if(e.code==='ArrowUp'||e.code==='ArrowDown'){e.preventDefault();setFocus(navigation.view.focus+(e.code==='ArrowUp'?.1:-.1));return;}
    if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();navigation.heading(navigation.view.pan*90+(e.code==='ArrowLeft'?-5:5));syncAngle();router.reset();lastPoint=null;return;}
    if(e.code==='Enter'&&hitList.length){e.preventDefault();showFlower(species[hitList.at(-1).species]);return;}
    if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat){const n=keyboardStep++;wake(.5+.32*Math.sin(n*2.4),.70+.16*Math.sin(n*1.6),'key');}}
  });
  function run(){cancelAnimationFrame(raf);if(!document.hidden && ctx)raf=requestAnimationFrame(paint);}
  addEventListener('resize',resize);document.addEventListener('visibilitychange',run);
  addEventListener('pagehide',()=>cancelAnimationFrame(raf));addEventListener('pageshow',run);
  resize();lighting();run();
  async function start(){
    if(!ctx)throw Error('Canvas unavailable');
    const image=new Image();image.src='./illustrated-flowers.webp';
    const [catalog]=await Promise.all([fetch('./catalog.json').then(r=>{if(!r.ok)throw Error('catalog');return r.json();}),image.decode()]);
    if(image.naturalWidth!==7*112 || image.naturalHeight!==catalog.length*112)throw Error('atlas');
    species=catalog;atlas=image;mask=buildMask(image);
    const tiles=[0,1,2,3].map(offset=>{
      const tile=SpringField.makeField(catalog,width/height,19731+offset*131,offset);
      tile.plants.forEach(p=>p.tile=offset);return tile;
    });
    field={plants:tiles.flatMap(tile=>tile.plants).sort((a,b)=>a.y-b.y),
      get count(){return tiles.reduce((sum,tile)=>sum+tile.count,0);},
      wake(x,y,t,ratio,ribbon){tiles.forEach((tile,i)=>tile.wake(.5+SpringCamera.offset(x,i+.5),y,t,ratio,ribbon));},
      clear(){tiles.forEach(tile=>tile.clear());hitList.length=0;}
    };
    camera.disabled=false;canvas.setAttribute('aria-busy','false');status.textContent=clockText;
  }
  camera.disabled=true;canvas.setAttribute('aria-busy','true');status.textContent='正在准备春花…';
  start().catch(()=>{status.textContent='春花画稿加载失败，请刷新页面重试。';});
})();
