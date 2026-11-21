/* FlowerScatter — seeded, three-storey meadow placement for Three.js r160+.
 * UMD: browser window.FlowerScatter; Node require('./flower-scatter.js').
 * Bud means the accepted exposed early bud, not the old sealed green bud.
 */
(function(root){
'use strict';
const STAGES=['Bud','Half','Full'],WEIGHTS=[.15,.35,.50];
const LAYERS={ground:{count:33000,height:1,min:.9,max:1.1},cluster:{count:10000,height:1.3,min:1.2,max:1.4},focus:{count:750,height:1.5,min:1.4,max:1.6}};
function seeded(seed){
 let n=2166136261;for(const c of String(seed)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}
 return ()=>{n=(n+0x6D2B79F5)|0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
}
function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
// Gradient simplex noise on a skewed triangular lattice. No Perlin/value-noise substitution.
function simplex2D(rng){
 const p=shuffle(Array.from({length:256},(_,i)=>i),rng),perm=Array.from({length:512},(_,i)=>p[i&255]);
 const grad=[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[1,0],[-1,0],[0,1],[0,-1],[0,1],[0,-1]],F=(Math.sqrt(3)-1)/2,G=(3-Math.sqrt(3))/6;
 function corner(x,y,index){const t=.5-x*x-y*y;if(t<=0)return 0;const g=grad[index%12];return t*t*t*t*(g[0]*x+g[1]*y)}
 return (x,y)=>{const s=(x+y)*F,i=Math.floor(x+s),j=Math.floor(y+s),t=(i+j)*G,a=x-i+t,b=y-j+t,ix=a>b?1:0,iy=a>b?0:1,I=i&255,J=j&255;
  return 70*(corner(a,b,perm[I+perm[J]])+corner(a-ix+G,b-iy+G,perm[I+ix+perm[J+iy]])+corner(a-1+2*G,b-1+2*G,perm[I+1+perm[J+1]]));
 };
}
function gaussianScale(rng,spread=.25){
 if(spread===0)return 1;
 // Box–Muller, sigma=spread/2; rejection at +/-2 sigma avoids clipped endpoint piles.
 for(let i=0;i<100;i++){const z=Math.sqrt(-2*Math.log(Math.max(Number.MIN_VALUE,rng())))*Math.cos(2*Math.PI*rng()),delta=spread*.5*z;if(Math.abs(delta)<=spread)return 1+delta}
 throw new Error('Gaussian sampler could not converge');
}
function stageBag(count,rng){
 const quotas=WEIGHTS.map(x=>x*count),counts=quotas.map(Math.floor),order=[0,1,2].sort((a,b)=>(quotas[b]-counts[b])-(quotas[a]-counts[a]));
 for(let i=0,left=count-counts.reduce((a,b)=>a+b,0);i<left;i++)counts[order[i]]++;
 return shuffle(STAGES.flatMap((s,i)=>Array(counts[i]).fill(s)),rng);
}
function mound(x,z,cx,cz,rx,rz){return Math.exp(-(((x-cx)/rx)**2)-((z-cz)/rz)**2)}
function terrainHeight(x,z){
 const u=x+40,n=96-z;
 const broad=2.5*Math.sin(x*.027+z*.016)+1.7*Math.cos(z*.034)+4*mound(x,z,80,-62,75,46);
 const near=.4*Math.sin(.121*u+.084*n)+.38*Math.cos(.183*n-.023*u)+.055*n+3.65*mound(u,n,17,22,14,14)+2.35*mound(u,n,-12,15,8,11)-.85*mound(u,n,2,13,10,12)+1.3*Math.sin(.15*n)*Math.max(0,Math.min(1,n/62));
 const t=Math.max(0,Math.min(1,(95-Math.abs(n-23))/39,(75-Math.abs(u))/30));return broad+(near-broad)*t*t*(3-2*t);
}
const referenceSpecies=['blue-flax','nemophila-menziesii','wood-sorrel','lobularia-maritima','cosmos','phlox','phlox-subulata'];
function plantingZones(x,z,noise){
 const u=x+40,n=96-z,bend=noise(x*.028,z*.028);
 const lane=n<40?-.95+.065*n+2.48*Math.sin(n*.193-.34)+.87*Math.sin(n*.085+.2):5.6+.28*(n-40)+17*Math.sin((n-40)*.045);
 const width=Math.min(22,Math.max(2,2.2+.14*Math.max(0,n)))+1.1*bend;
 const distance=Math.abs(u-lane);
 const pink=Math.min(Math.abs(n-(38+5*Math.sin(u*.074)+.22*u)),Math.abs(n-(145+19*Math.sin(u*.027))));
 const orange=Math.max(mound(u,n,3.55,3.1,1.30,1.65),mound(u,n,-6,15,1.65,2.10));
 const white=Math.min(Math.abs(distance-width*1.45),Math.abs(distance-(63+14*Math.sin(n*.032))));
 const scores={blue:1.04*Math.exp(-((distance/width)**2)),light:.97*Math.exp(-((white/(5+width*.35))**2)),pink:Math.exp(-((pink/14)**2)),warm:orange*1.7};
 return scores;
}
// Near the flight route, blue flax and baby-blue-eyes alternate in pockets.
// White wood-sorrel and alyssum pick out the banks and two hover landmarks.
function flightBeds(seed){
 const rng=seeded(seed+'/flight-river'),banks=[];
 for(let north=-2.8;north<=15;north+=.58){
  for(let east=-6.8;east<=5.8;east+=.62){
   const u=east+(rng()-.5)*.4,n=north+(rng()-.5)*.38;
   const axis=-1.5+1.9*Math.sin((n-1)*.37)+.15*n;
   const reach=2.5+.55*Math.sin(.92*n);
   const lateral=u-axis;
   const hoverPatch=mound(u,n,1.85,9.35,1.25,1.12);
   const westBank=Math.abs(u-(-3.6+.65*Math.sin(n*.76)));
   const returnCurve=n>1&&n<10&&westBank<1.7;
   const onBank=Math.abs(lateral)>reach*.73&&!(returnCurve&&westBank<.9);
   if((Math.abs(lateral)>reach+1+hoverPatch&&!returnCurve)||rng()<(onBank?.30:.22))continue;
   // Short scalloped openings preserve separate clusters and directional flow.
   if(Math.sin(n*1.8+u*.35)+.65*Math.cos(u*2.7-n*.7)>1.05)continue;
   // Protect the original apricot drift beside the route.
   if(mound(u,n,3.55,3.1,1.3,1.65)>.12)continue;
   const light=onBank||hoverPatch>.32;
   const slug=light?(Math.sin(u*.87+n*.71)>.15&&hoverPatch<.35?'lobularia-maritima':'wood-sorrel')
     :Math.sin(n*.75+u*.64)>.0?'blue-flax':'nemophila-menziesii';
   banks.push({slug,x:u-40,z:96-n,radius:.15+.09*rng(),count:rng()<.55?3:5,height:light?.47:.53});
  }
 }
 // Eye-level groups frame the right at the turn and show pale veins at hover.
 const anchors=[['blue-flax',-.85,2.85,.57],['nemophila-menziesii',-.32,3.32,.50],
  ['wood-sorrel',2.06,8.76,.55],['wood-sorrel',1.80,9.2,.48],['nemophila-menziesii',1.16,9.48,.43]];
 return anchors.map(([slug,u,n,height])=>({slug,x:u-40,z:96-n,height,count:3,radius:.19})).concat(shuffle(banks,rng));
}
function plan(catalog,options={}){
 if(!Array.isArray(catalog)||!catalog.length)throw new Error('A nonempty species catalog is required');
 const width=options.width??300,depth=options.depth??300,seed=String(options.seed??'flower-meadow-83'),counts={},heights={},pools={ground:[],cluster:[],focus:[]};
 for(const [name,v] of Object.entries({width,depth}))if(!Number.isFinite(v)||v<4||v>400)throw new Error(name+' must be between 4 and 400');
 const slugs=new Set();for(const c of catalog){if(!pools[c.layer])throw new Error('Unknown ecological layer: '+c.layer);if(!c.slug||slugs.has(c.slug))throw new Error('Missing or duplicate species slug');slugs.add(c.slug);pools[c.layer].push(c)}
 for(const name of Object.keys(LAYERS)){
  counts[name]=options.counts?.[name]??LAYERS[name].count;heights[name]=options.heights?.[name]??LAYERS[name].height;
  if(!Number.isSafeInteger(counts[name])||counts[name]<0||counts[name]>200000)throw new Error('Invalid '+name+' count');
  if(!Number.isFinite(heights[name])||heights[name]<LAYERS[name].min||heights[name]>LAYERS[name].max)throw new Error('Invalid '+name+' height');
  if(counts[name]>0&&(counts[name]<pools[name].length||!pools[name].length))throw new Error(name+' count must cover its species pool');
 }
 const frequency=options.clusterFrequency??.08;
 if(!Number.isFinite(frequency)||frequency<=0)throw new Error('clusterFrequency must be positive');
 if(options.focusSpacing!==undefined&&!(options.focusSpacing>0))throw new Error('Invalid spacing');
 const noise=simplex2D(seeded(seed+'/simplex')),plants=[],clumps=[],stages={Bud:0,Half:0,Full:0};
 const bySlug=new Map(catalog.map(s=>[s.slug,s])),widthScale=width/300,depthScale=depth/300;
 const family=s=>s.colorFamily==='violet'?'blue':s.colorFamily==='coral'?'warm':(['warm','light','blue','pink'].includes(s.colorFamily)?s.colorFamily:'light');
 const cells=[],grid=120,step=300/grid,byFamily={blue:[],light:[],pink:[],warm:[]};
 for(let j=0;j<grid;j++)for(let i=0;i<grid;i++){
  const x=(i+.5)*step-150,z=(j+.5)*step-150,scores=plantingZones(x,z,noise);
  const f=Object.keys(scores).reduce((a,b)=>scores[a]>scores[b]?a:b);
  cells.push({x,z,f,score:scores[f]+.08*noise(x*frequency*.5,z*frequency*.5)});
 }
 cells.sort((a,b)=>b.score-a.score);
 const active=cells.slice(0,Math.round(cells.length*.65));
 for(const c of active)byFamily[c.f].push(c);
 // The two warm accents occupy less than one grid cell at some resolutions.
 byFamily.warm=[{x:-36.45,z:92.9},{x:-46,z:81}];
 const refs=options.referenceClumps||[],useRefs=width>=200&&depth>=200;
 const nearBeds=useRefs&&refs.length?flightBeds(seed):[];
 for(const layer of ["focus","ground","cluster"]){
  const count=counts[layer];if(!count)continue;
  const rng=seeded(seed+'/'+layer),bag=stageBag(count,seeded(seed+'/'+layer+'/phase'));
  const pool=pools[layer],available=Object.fromEntries(Object.keys(byFamily).map(f=>[f,pool.filter(s=>family(s)===f)]));
  const dormant=pool.map(()=>rng()*150),usable=active.filter(c=>available[c.f].length&&c.f!=='warm');
  let used=0;
  function plant(s,cx,cz,total,radius,height){
   const id=clumps.length,phase=rng()*Math.PI*2;
   clumps.push({id,x:cx,z:cz,slug:s.slug,count:total,radius,layer});
   for(let i=0;i<total;i++){
    const a=phase+2.39996*i+(rng()-.5)*.35,r=radius*Math.sqrt((i+.4)/total);
    const x=Math.max(-width/2,Math.min(width/2,cx+Math.cos(a)*r)),z=Math.max(-depth/2,Math.min(depth/2,cz+Math.sin(a)*r*.83));
    const stage=bag[used++],scaleMultiplier=gaussianScale(rng,.18);
    plants.push({slug:s.slug,layer,stage,progress:STAGES.indexOf(stage)*.5,x,y:terrainHeight(x,z),z,rotationY:rng()*Math.PI*2,tiltX:(rng()-.5)*.25,tiltZ:(rng()-.5)*.28-.027,widthScale:.69,scaleMultiplier,scale:height*scaleMultiplier,accent:family(s)==="warm",clump:id});stages[stage]++;
   }
  }
  function locate(f){
   const source=byFamily[f].length?byFamily[f]:active,c=source[Math.floor(rng()*source.length)];
   const jitter=f==='warm'?1.25:step*.94;
   return [(c.x+(rng()-.5)*jitter)*widthScale,(c.z+(rng()-.5)*jitter)*depthScale];
  }
  const base=heights[layer]*.46;
  // Reserve representation before spending the remaining stem budget.
  for(const s of pool){const [x,z]=locate(family(s));plant(s,x,z,count>=pool.length*3+6?3:1,.17,base)}
  // Spend the existing budget on near-view groups before sampling the far slope.
  const flightBudget=Math.max(0,Math.min(Math.round(.25*count),Math.round(1350*count/LAYERS[layer].count)));
  let bankStems=0;
  for(const b of nearBeds){
   const s=bySlug.get(b.slug);if(!s||s.layer!==layer||bankStems+b.count>flightBudget||count-used-b.count<6)continue;
   plant(s,b.x,b.z,b.count,b.radius,b.height);bankStems+=b.count;
  }
  if(useRefs)for(let i=0;i<refs.length;i++){
   const [k,u,n,num,r,h]=refs[i],s=bySlug.get(referenceSpecies[k]);if(!s||s.layer!==layer)continue;
   const fraction=n<13?1:n<29?.70:.33;
   if(used+num>count*.66||i>3&&rng()>fraction)continue;
   plant(s,-40+u,96-n,num,r,h);
  }
  if(layer==='ground'){
   const tall=clumps.filter(c=>c.layer==='focus');
   for(const c of tall){
    if(used+9>count)break;
    const companionFamily=family(bySlug.get(c.slug)),choices=available[companionFamily].length?available[companionFamily]:available.light.length?available.light:pool;
    const s=choices[Math.floor(rng()*choices.length)],angle=rng()*Math.PI*2,r=.33+rng()*.24;
    plant(s,c.x+r*Math.cos(angle),c.z+r*Math.sin(angle),rng()<.5?3:5,.15,base*.9);
   }
  }
  while(used<count){
   const left=count-used,odd=[3,5,7,9].filter(n=>n<=left&&![1,2,4].includes(left-n));
   const total=odd.length?odd[Math.floor(rng()*odd.length)]:left===4?2:Math.min(3,left);
   const cell=usable.length?usable[Math.floor(rng()*usable.length)]:null;
   const f=cell?cell.f:family(pool[0]);
   let x,z;
   if(cell){x=(cell.x+(rng()-.5)*step)*widthScale;z=(cell.z+(rng()-.5)*step)*depthScale}
   else [x,z]=locate(f);
   // Keep the approved foreground groups legible and their grass openings clear.
   if(cell&&useRefs&&refs.length&&z>70&&z<110&&Math.abs(x+40)<Math.max(5,(104-z)*.65))continue;
   const choices=available[f],index=s=>pool.indexOf(s),score=s=>noise(x*.038+dormant[index(s)],z*.038-dormant[index(s)])+rng()*.05;
   let s=choices[0],best=-Infinity;
   for(const candidate of choices){const v=score(candidate);if(v>best){s=candidate;best=v}}
   plant(s,x,z,total,.10+rng()*.15,base);
  }
 }
 return {seed,width,depth,counts,heights,stages,plants,clumps,driftFraction:active.length/cells.length};
}
async function instantiate(T,layout,{loadTemplate,onProgress=()=>{}}={}){
 if(typeof loadTemplate!=='function')throw new Error('loadTemplate(slug) is required');
 const group=new T.Group();group.name='procedural-flower-meadow';const bySpecies=new Map(),meshes=[];
 for(const p of layout.plants){if(!bySpecies.has(p.slug))bySpecies.set(p.slug,[]);bySpecies.get(p.slug).push(p)}
 const stats={instances:0,species:bySpecies.size,batches:0,triangles:0},matrix=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3(),euler=new T.Euler();
 const dispose=()=>{for(const m of meshes){group.remove(m);m.dispose()}meshes.length=0};
 try{
  let done=0;
  for(const [slug,plants] of bySpecies){
   const template=await loadTemplate(slug);
   for(const stage of STAGES){
    const items=plants.filter(p=>p.stage===stage);if(!items.length)continue;
    const source=template?.stages?.[stage];if(!source?.geometry||!source?.material)throw new Error('Missing '+slug+' '+stage+' template');
    const mesh=new T.InstancedMesh(source.geometry,source.material,items.length);mesh.name=slug+'/'+stage;mesh.userData={slug,stage,layer:items[0].layer,plants:items};
    for(let i=0;i<items.length;i++){const p=items[i];position.set(p.x,p.y,p.z);rotation.setFromEuler(euler.set(p.tiltX||0,p.rotationY,p.tiltZ||0,"YXZ"));scale.set(p.scale*(p.widthScale??1),p.scale,p.scale*(p.widthScale??1));matrix.compose(position,rotation,scale);mesh.setMatrixAt(i,matrix)}
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.castShadow=items[0].layer!=='ground';mesh.receiveShadow=true;group.add(mesh);meshes.push(mesh);
    stats.instances+=items.length;stats.batches++;stats.triangles+=(source.geometry.index?.count??source.geometry.attributes.position.count)/3*items.length;
   }
   onProgress(++done,bySpecies.size);
  }
 }catch(error){dispose();throw error}
 // Geometry and materials belong to the shared template cache, not instances.
 return {group,stats,dispose};
}
const api={plan,instantiate,terrainHeight,plantingZones,seeded,simplex2D,gaussianScale};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FlowerScatter=api;
})(typeof globalThis!=='undefined'?globalThis:this);
