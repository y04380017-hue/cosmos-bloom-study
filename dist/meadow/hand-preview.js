/* The preview uses the already-open camera and the same accepted hands as the meadow. */
(function(root){
  'use strict';
  const colors={bloom:'#ffb8cb',view:'#8cedf2',idle:'#e6e9d9'};
  const bones=[[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[17,0]];
  function create(panel){
    const canvas=panel.querySelector('canvas'), ctx=canvas.getContext('2d');
    const label=panel.querySelector('output');
    const trails=new Map();
    let video=null,staleTimer;
    function message(text){if(label.textContent!==text)label.textContent=text;}
    function clear(){
      clearTimeout(staleTimer);
      trails.clear();
      ctx?.clearRect(0,0,canvas.width,canvas.height);
    }
    function active(value){
      clear();video=null;panel.hidden=!value;
      message(value?'正在准备摄像头…':'');
    }
    function frame(hands,{side=null,bloom=false,navigating=false,paused=false,added=0}={}){
      if(panel.hidden || !ctx)return;
      const time=performance.now();
      const w=canvas.width,h=canvas.height;
      const aspect=(video?.videoWidth/video?.videoHeight)||4/3;
      const width=Math.min(w,h*aspect), height=width/aspect;
      const left=(w-width)/2,top=(h-height)/2;
      ctx.clearRect(0,0,w,h);
      ctx.save();ctx.beginPath();ctx.rect(left,top,width,height);ctx.clip();
      if(video?.readyState>=2){
        ctx.save();ctx.translate(left+width,top);ctx.scale(-1,1);
        ctx.drawImage(video,0,0,width,height);ctx.restore();
        ctx.fillStyle='rgba(17,39,39,.36)';ctx.fillRect(left,top,width,height);
      }
      let edge=false, missing=false;
      for(const id of ['Left','Right']){
        const hand=hands.find(h=>h.side===id);
        const trail=trails.get(id)||{samples:[],visible:false,seen:false};
        trails.set(id,trail);
        trail.samples=trail.samples.filter(p=>time-p.t<2000);
        if(hand){
          const mode=side===id?'view':side && bloom && !navigating && !paused?'bloom':'idle';
          const last=trail.samples.at(-1);
          const joins=trail.visible && last && time-last.t<300 && Math.hypot(last.x-hand.x,last.y-hand.y)<.30;
          trail.samples.push({x:hand.x,y:hand.y,t:time,mode,joins});
          if(trail.samples.length>64)trail.samples.shift();
          trail.seen=true;
          edge ||= hand.points.some(([x,y])=>x<.035 || x>.965 || y<.035 || y>.965);
        }else if(trail.seen){missing=true;}
        trail.visible=!!hand;
        for(let i=1;i<trail.samples.length;i++){
          const a=trail.samples[i-1], b=trail.samples[i];
          if(!b.joins)continue;
          ctx.globalAlpha=Math.max(.1,1-(time-b.t)/2000);
          ctx.lineCap='round';ctx.lineWidth=4;ctx.strokeStyle=colors[b.mode];
          ctx.beginPath();ctx.moveTo(left+a.x*width,top+a.y*height);ctx.lineTo(left+b.x*width,top+b.y*height);ctx.stroke();
        }
        ctx.globalAlpha=1;
        if(!hand)continue;
        const color=colors[trail.samples.at(-1).mode];
        ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.8;ctx.beginPath();
        for(const chain of bones){
          chain.forEach((index,i)=>{
            const [x,y]=hand.points[index];
            if(i===0)ctx.moveTo(left+x*width,top+y*height);
            else ctx.lineTo(left+x*width,top+y*height);
          });
        }
        ctx.stroke();
        for(const [x,y] of hand.points){
          ctx.beginPath();ctx.arc(left+x*width,top+y*height,2,0,Math.PI*2);ctx.fill();
        }
      }
      ctx.restore();
      let state;
      if(paused)state='开花已暂停';
      else if(!hands.length)state='未追踪到手';
      else if(!side)state='等待分配双手';
      else if(navigating)state='正在取景';
      else if(bloom)state=added>0?'正在生成花带':'开花手已张开';
      else state=hands.some(h=>h.side!==side)?'张开手掌以开花':'等待开花手入镜';
      const hint=edge?' · 手靠近画面边缘':missing && hands.length?' · 一只手失去追踪':'';
      message(state+hint);
      clearTimeout(staleTimer);
      staleTimer=setTimeout(()=>{clear();message('等待新的识别画面…');},900);
    }
    return {active,frame,video(element){video=element;},status:message};
  }
  const api={create};
  if(typeof module==='object' && module.exports)module.exports=api;else root.MeadowHandPreview=api;
})(globalThis);
