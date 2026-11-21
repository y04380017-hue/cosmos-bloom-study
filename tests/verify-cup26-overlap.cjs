// Detect adjacent broad petals occupying the same open surface (visible grid flicker).
const assert=require('assert'),T=require('../assets/three.min.js'),create=require('../collection/engine.js');
function heightAt(g,x,z){
 const d=g.userData,p=g.userData.mid,idx=g.index.array;let best=-Infinity;
 for(let i=0;i<idx.length;i+=6){ // upper grid triangles occur before lower pair in shell index stream
  // Shell alternates two top triangles then two bottom triangles; use only top indices.
  for(let off=0;off<6;off+=3){const a=idx[i+off],b=idx[i+off+1],c=idx[i+off+2];if(a>=d.topCount||b>=d.topCount||c>=d.topCount)continue;
   const ax=p[a*3],az=p[a*3+2],bx=p[b*3],bz=p[b*3+2],cx=p[c*3],cz=p[c*3+2],den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(den)<1e-10)continue;
   const u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/den,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/den,w=1-u-v;
   if(u>=0&&v>=0&&w>=0)best=Math.max(best,u*p[a*3+1]+v*p[b*3+1]+w*p[c*3+1]);
  }
 }return best;
}
for(const slug of ['tea-flower','tufted-poppy','missouri-primrose','white-peony','yellow-prickly-poppy','matilija-poppy','himalayan-peony','fernleaf-peony']){
 const c=require('../collection/cup26-specimens.json').find(x=>x.slug===slug);c.surfaceMaps=require('../collection/textures/'+slug+'.json');const m=create(T,c);m.update(1);
 let close=0,overlap=0;for(let x=-1.3;x<=1.3;x+=.08)for(let z=-1.3;z<=1.3;z+=.08){if(Math.hypot(x,z)<.38)continue;
  const heights=m.heads[0].petals.map(p=>heightAt(p.geometry,x,z)).filter(Number.isFinite).sort((a,b)=>b-a);if(heights.length>1){overlap++;if(heights[0]-heights[1]<.018)close++}
 }
 const ratio=close/Math.max(1,overlap);console.log(slug,{close,overlap,ratio});assert(ratio<.12,slug+' excessive coincident petal area');
}
