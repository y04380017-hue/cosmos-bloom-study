'use strict';
// One Full-pose clustering is shared by every bloom pose. All three positions
// and normals use the same original vertex memberships and averaging weights;
// this is a morphable source-mesh reduction, never a sprite or replacement.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=path.resolve(__dirname,'..'),IN=path.join(ROOT,'dist/meadow/models'),OUT=path.join(ROOT,'dist/meadow/models-cycle');
const STAGES=['Bud','Half','Full'];
const SPECS=new Map([...require('../collection/specimens.json'),require('../collection/cosmos-specimen.json'),...require('../collection/cup26-specimens.json'),...require('../collection/remaining49-specimens.json')].map(s=>[s.slug,s]));
const typed=(Type,value)=>{const b=Buffer.from(value,'base64');return new Type(b.buffer,b.byteOffset,b.byteLength/Type.BYTES_PER_ELEMENT)};
const b64=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');
function decode(s){return {p:typed(Int16Array,s.position),n:typed(Int8Array,s.normal),uv:typed(Uint16Array,s.uv),co:typed(Uint8Array,s.color),ix:typed(s.indexType==='u16'?Uint16Array:Uint32Array,s.index)}}
function bounds(p){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++){lo[i%3]=Math.min(lo[i%3],p[i]);hi[i%3]=Math.max(hi[i%3],p[i])}return {lo,hi}}
function faceNormal(p,a,b,c){const ab=[0,1,2].map(k=>p[b*3+k]-p[a*3+k]),ac=[0,1,2].map(k=>p[c*3+k]-p[a*3+k]);return [ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]]}
function prepare(data){
 const poses=STAGES.map(name=>decode(data.stages[name])),full=poses[2],bb=poses.map(s=>bounds(s.p));
 for(let i=0;i<2;i++)if(poses[i].p.length!==full.p.length||data.stages[STAGES[i]].index!==data.stages.Full.index)throw new Error(data.slug+' does not share source topology');
 const rgba=typed(Uint8Array,data.atlas.rgba),cols=data.atlas.width/64,rows=data.atlas.height/64,tiles=[],green=[],roots=new Set(),islands=new Set();
 for(let i=0;i<full.p.length/3;i++){
  const tx=Math.floor(full.uv[i*2]/65535*cols),ty=Math.floor(full.uv[i*2+1]/65535*rows),tile=ty*cols+tx,pixel=((ty*64+32)*data.atlas.width+tx*64+32)*4;
  tiles.push(tile);islands.add(tile);green.push(rgba[pixel+1]>rgba[pixel]*1.13&&rgba[pixel+1]>rgba[pixel+2]*1.13);
  if(poses.some((s,j)=>s.p[i*3+1]===bb[j].lo[1]))roots.add(i);
 }
 // Connected source petals are ordered by flower head by the accepted model
 // baker. Their original ring counts identify those boundaries without
 // rebuilding any shape. Separate local grids prevent neighboring heads from
 // averaging together when the distant cell grows larger than a flower.
 const perHead=SPECS.get(data.slug).rings?.reduce((n,r)=>n+r.count,0)||data.diagnostics.sourcePetals,headCount=Math.round(data.diagnostics.sourcePetals/perHead),regions=new Int32Array(full.p.length/3),origins=[],keepHorizon=new Uint8Array(full.p.length/3).fill(1),protectedVertices=new Set(),stemSides=new Int8Array(full.p.length/3).fill(-1);
 if(headCount>1){
  const parent=Uint32Array.from({length:full.p.length/3},(_,i)=>i),find=i=>parent[i]===i?i:parent[i]=find(parent[i]);
  for(let j=0;j<full.ix.length;j+=3)for(let k=1;k<3;k++)parent[find(full.ix[j+k])]=find(full.ix[j]);
  const connected=new Map();for(let i=0;i<parent.length;i++){const root=find(i);if(!connected.has(root))connected.set(root,[]);connected.get(root).push(i)}
  const components=Array.from(connected.values(),vertices=>{const center=[0,0,0],bud=[0,0,0],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];let movement=0;for(const i of vertices){movement=Math.max(movement,Math.hypot(...[0,1,2].map(k=>(full.p[i*3+k]-poses[0].p[i*3+k])*data.positionUnit)));for(let k=0;k<3;k++){center[k]+=full.p[i*3+k]/vertices.length;bud[k]+=poses[0].p[i*3+k]/vertices.length;lo[k]=Math.min(lo[k],full.p[i*3+k]);hi[k]=Math.max(hi[k],full.p[i*3+k])}}return {vertices,center,bud,lo,hi,movement}});
  const mainBranch=components.filter(c=>c.movement<.002).sort((a,b)=>Math.max(...b.hi.map((v,k)=>v-b.lo[k]))-Math.max(...a.hi.map((v,k)=>v-a.lo[k])))[0];
  const broadLeaves=components.filter(c=>c.movement<.002&&c.vertices.length===15),broadLeafCount=broadLeaves.length,leafRegions=new Map();
  // The longest source branch already has only a few dozen triangles. Keep it
  // intact: averaging its bent tube rings can leave holes in the middle.
  if(mainBranch)for(const v of mainBranch.vertices)protectedVertices.add(v);
  const petals=[...components].sort((a,b)=>b.movement-a.movement).slice(0,data.diagnostics.sourcePetals).sort((a,b)=>a.vertices[0]-b.vertices[0]),petalRegion=new Map(),budCenters=[];
  for(let head=0;head<headCount;head++){
   const parts=petals.slice(head*perHead,(head+1)*perHead),fullCenter=[0,0,0],budCenter=[0,0,0];for(const part of parts){petalRegion.set(part,head);for(let k=0;k<3;k++){fullCenter[k]+=part.center[k]/parts.length;budCenter[k]+=part.bud[k]/parts.length}}origins.push(fullCenter);budCenters.push(budCenter);
  }
  // The source foliage baker emits three compound-leaf/frond groups. Keep
  // those groups separate, without paying for every tiny leaflet at horizon.
  if(broadLeafCount>3)for(let group=0;group<3;group++){
   const parts=broadLeaves.slice(Math.floor(group*broadLeafCount/3),Math.floor((group+1)*broadLeafCount/3)),center=[0,0,0],region=origins.length;
   for(const part of parts){leafRegions.set(part,region);for(let k=0;k<3;k++)center[k]+=part.center[k]/parts.length}origins.push(center);
  }
  for(const component of components){
   let region=petalRegion.get(component);const extent=component.hi.map((v,k)=>(v-component.lo[k])*data.positionUnit).sort((a,b)=>b-a);
   if(region===undefined){
    // Minute reproductive pieces need not be repeated at every distant head.
    // Retain all petals, stems and leaves; atlas anchors still keep their color
    // islands represented. This omission is shared by every bloom pose.
    const structural=component.movement<.002&&(extent[0]>.075||extent[0]>extent[1]*3);
    if(!structural)for(const v of component.vertices)keepHorizon[v]=0;
    if(component.movement<.002&&(component.vertices.length===28&&extent[0]>.15||extent[0]>.2&&extent[0]>extent[1]*3)){
     region=origins.length;origins.push(component.center);for(const v of component.vertices)green[v]=true;
     // Keep the end rings at their source attachment points. Otherwise a
     // large cell shortens the stem and leaves its separate flower floating.
     const endTolerance=(component.hi[1]-component.lo[1])*.025;
     for(const v of component.vertices)if(full.p[v*3+1]>=component.hi[1]-endTolerance)protectedVertices.add(v);
     // A branch can point in any direction. Classify its circumference in a
     // local radial plane, not the world x/z plane used by upright stems.
     const point=i=>Array.from(full.p.slice(i*3,i*3+3)),distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
     const a=component.vertices.reduce((best,v)=>distance(point(v),component.center)>distance(point(best),component.center)?v:best,component.vertices[0]),b=component.vertices.reduce((best,v)=>distance(point(v),point(a))>distance(point(best),point(a))?v:best,a),axis=point(b).map((v,k)=>v-point(a)[k]);
     const axisLength=Math.hypot(...axis);for(let k=0;k<3;k++)axis[k]/=axisLength;
     const radial=Math.abs(axis[1])<.9?[axis[2],0,-axis[0]]:[0,-axis[2],axis[1]],radialLength=Math.hypot(...radial);for(let k=0;k<3;k++)radial[k]/=radialLength;
     const tangent=[axis[1]*radial[2]-axis[2]*radial[1],axis[2]*radial[0]-axis[0]*radial[2],axis[0]*radial[1]-axis[1]*radial[0]];
     let phase;
     for(const v of component.vertices){const n=Array.from(full.n.slice(v*3,v*3+3)),dot=a=>a.reduce((sum,x,k)=>sum+x*n[k],0),angle=Math.atan2(dot(tangent),dot(radial));if(phase===undefined)phase=angle;stemSides[v]=(Math.round((angle-phase)/Math.PI*1.5)+6)%3}
    }
    else{let distance=Infinity;for(let i=0;i<budCenters.length;i++){const d=Math.hypot(...component.bud.map((v,k)=>v-budCenters[i][k]));if(d<distance){distance=d;region=i}}}
    if(component.movement<.002&&component.vertices.length===15){
     if(broadLeafCount<=3)for(const v of component.vertices)protectedVertices.add(v);
     else region=leafRegions.get(component);
    }
   }
   for(const i of component.vertices)regions[i]=region;
  }
 }
 // Anchor choices are made once, then copied with the same source indices in
 // every pose. This keeps root contact, stage bounds and every photo island.
 const anchors=new Map(),islandAnchors=new Map();
 for(let i=0;i<full.ix.length;i+=3){
  const tri=Array.from(full.ix.slice(i,i+3)),areas=poses.map(s=>Math.hypot(...faceNormal(s.p,...tri)));if(areas.some(a=>a===0))continue;
  const quality=Math.min(...areas),tile=tiles[tri[0]],current=islandAnchors.get(tile);
  if(!current||quality>current.quality)islandAnchors.set(tile,{tri,quality});
  for(let stage=0;stage<3;stage++)for(let axis=0;axis<3;axis++)for(const edge of ['lo','hi']){
   if(!tri.some(v=>poses[stage].p[v*3+axis]===bb[stage][edge][axis]))continue;
   const key=[stage,axis,edge].join('/'),old=anchors.get(key);if(!old||quality>old.quality)anchors.set(key,{tri,quality,stage,axis,edge});
  }
 }
 return {poses,full,bb,tiles,green,roots,islands,anchors,islandAnchors,regions,origins,headCount,keepHorizon,protectedVertices,stemSides};
}
function simplify(data,prepared,cell,horizon=false){
 const {poses,full,tiles,green,roots,regions,origins}=prepared,groups=new Map(),members=[],lookup=new Uint32Array(full.p.length/3);
 for(let i=0;i<lookup.length;i++){
  // Four sides keep slender green stems volumetric. Separate root vertices
  // from the stem above, so a larger spatial cell cannot lift the plant.
  const side=prepared.stemSides[i]>=0?prepared.stemSides[i]:green[i]?(full.n[i*3]>=0?1:0)+(full.n[i*3+2]>=0?2:0):0;
  const origin=origins[regions[i]]||[0,0,0],key=prepared.protectedVertices.has(i)?'source/'+i:[regions[i],tiles[i],side,roots.has(i)?1:0,...[0,1,2].map(k=>Math.floor((full.p[i*3+k]-origin[k])*data.positionUnit/cell))].join('/');
  let id=groups.get(key);if(id===undefined){id=members.length;groups.set(key,id);members.push([])}members[id].push(i);lookup[i]=id;
 }
 const attributes=poses.map(s=>({p:[],n:[],uv:[],co:[]}));
 for(const vertices of members)for(let stage=0;stage<3;stage++){
  const s=poses[stage],out=attributes[stage],p=[0,0,0],n=[0,0,0],uv=[0,0],co=[0,0,0];
  for(const v of vertices){for(let k=0;k<3;k++){p[k]+=s.p[v*3+k];n[k]+=s.n[v*3+k];co[k]+=s.co[v*3+k]}for(let k=0;k<2;k++)uv[k]+=s.uv[v*2+k]}
  out.p.push(...p.map(v=>Math.round(v/vertices.length)));out.uv.push(...uv.map(v=>Math.round(v/vertices.length)));out.co.push(...co.map(v=>Math.round(v/vertices.length)));
  let length=Math.hypot(...n);if(length<1){const v=vertices.find(i=>Math.hypot(...s.n.slice(i*3,i*3+3))>0);if(v!==undefined)for(let k=0;k<3;k++)n[k]=s.n[v*3+k];length=Math.hypot(...n)}
  out.n.push(...n.map(v=>length?Math.round(v/length*127):0));
 }
 const triangles=[],seen=new Set(),used=new Set();
 for(let i=0;i<full.ix.length;i+=3){if(horizon&&!prepared.keepHorizon[full.ix[i]])continue;const tri=Array.from(full.ix.slice(i,i+3),v=>lookup[v]);if(new Set(tri).size<3||attributes.some(s=>Math.hypot(...faceNormal(s.p,...tri))===0))continue;const key=[...tri].sort((a,b)=>a-b).join(',');if(seen.has(key))continue;seen.add(key);triangles.push(...tri);tri.forEach(v=>used.add(v))}
 const output=poses.map(()=>({p:[],n:[],uv:[],co:[]})),remap=new Map();
 for(const id of used){remap.set(id,remap.size);for(let stage=0;stage<3;stage++){const a=attributes[stage],b=output[stage];b.p.push(...a.p.slice(id*3,id*3+3));b.n.push(...a.n.slice(id*3,id*3+3));b.uv.push(...a.uv.slice(id*2,id*2+2));b.co.push(...a.co.slice(id*3,id*3+3))}}
 const indices=triangles.map(i=>remap.get(i)),copied=new Map(),copiedTriangles=new Set();let anchorTriangles=0;
 function append(tri){const key=[...tri].sort((a,b)=>a-b).join(',');if(copiedTriangles.has(key))return;copiedTriangles.add(key);anchorTriangles++;
  for(const source of tri){let id=copied.get(source);if(id===undefined){id=output[0].p.length/3;copied.set(source,id);for(let stage=0;stage<3;stage++){const s=poses[stage],out=output[stage];out.p.push(...s.p.slice(source*3,source*3+3));out.n.push(...s.n.slice(source*3,source*3+3));out.uv.push(...s.uv.slice(source*2,source*2+2));out.co.push(...s.co.slice(source*3,source*3+3))}}indices.push(id)}
 }
 for(const anchor of prepared.anchors.values()){const b=bounds(output[anchor.stage].p);if(b[anchor.edge][anchor.axis]!==prepared.bb[anchor.stage][anchor.edge][anchor.axis])append(anchor.tri)}
 const present=new Set(output[2].uv.filter((_,i)=>i%2===0).map((u,i)=>Math.floor(u/65535*data.atlas.width/64)+Math.floor(output[2].uv[i*2+1]/65535*data.atlas.height/64)*data.atlas.width/64));
 for(const tile of prepared.islands)if(!present.has(tile)){const anchor=prepared.islandAnchors.get(tile);if(!anchor)throw new Error(data.slug+' source island has no valid morph triangle: '+tile);append(anchor.tri)}
 // Original poles occasionally have zero normals. Recover their normals from
 // the retained incident faces, while keeping the shared morph correspondence.
 for(const out of output){const sums=new Float64Array(out.p.length);for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3),n=faceNormal(out.p,...tri);for(const v of tri)for(let k=0;k<3;k++)sums[v*3+k]+=n[k]}
  for(let i=0;i<out.n.length;i+=3){let n=out.n.slice(i,i+3),length=Math.hypot(...n);if(length<1){n=Array.from(sums.slice(i,i+3));length=Math.hypot(...n)}if(length<1){n=[0,1,0];length=1}for(let k=0;k<3;k++)out.n[i+k]=Math.round(n[k]/length*127)}
 }
 const index=b64(Uint16Array.from(indices)),stages={};
 for(let stage=0;stage<3;stage++){const s=output[stage];stages[STAGES[stage]]={position:b64(Int16Array.from(s.p)),normal:b64(Int8Array.from(s.n)),uv:b64(Uint16Array.from(s.uv)),color:b64(Uint8Array.from(s.co)),index,indexType:'u16',sourceProgress:data.stages[STAGES[stage]].sourceProgress}}
 return {stages,counts:{triangles:indices.length/3,vertices:output[0].p.length/3,voxelSize:cell,anchorTriangles,sourceTriangles:full.ix.length/3}};
}
function build(slug){
 const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(IN,slug+'.meshpack')))),prepared=prepare(data),levels={},counts={};
 const multihead=prepared.headCount>1;
 const targets={far:Math.min(1200,Math.max(480,prepared.headCount*60)),horizon:Math.min(400,Math.max(100,prepared.headCount*16+60))};
 for(const [level,budget] of Object.entries(targets)){
  let selected;for(const cell of [.035,.045,.055,.07,.085,.10,.12,.145,.175,.21,.25,.30,.36,.43,.52,.63,.76,.92,1.12,1.4,1.8,2.4,3.2,4.4]){const candidate=simplify(data,prepared,cell,level==='horizon');if(!selected||candidate.counts.triangles<selected.counts.triangles)selected=candidate;if(selected.counts.triangles<=budget)break}
  levels[level]={stages:selected.stages};counts[level]={...selected.counts,targetTriangles:budget};
  if(selected.counts.triangles>(level==='far'?(multihead?1200:480):(multihead?(prepared.headCount>20?550:500):160)))throw new Error(slug+' '+level+' cannot fit the source-preserving budget: '+selected.counts.triangles);
 }
 const packed={schema:1,slug,sourceSha256:data.sourceSha256,positionUnit:data.positionUnit,levels,diagnostics:{method:'Full-pose source vertex clustering within photo-atlas islands and separate source-head regions, with identical memberships/weights in Bud/Half/Full. Source roots, stage extrema, main branches, broad leaves and radial stem sides are retained. Horizon omits minute repeated reproductive parts while keeping all source atlas islands.',sourceHeads:prepared.headCount,budgetException:multihead?'Separate flower heads and long branches retain independent spatial grids; the multihead budget prioritizes their three-dimensional silhouettes.':null,counts}},bytes=zlib.gzipSync(JSON.stringify(packed),{level:9});
 fs.writeFileSync(path.join(OUT,slug+'.meshpack'),bytes);return {slug,bytes:bytes.length,sourceHeads:prepared.headCount,budgetException:packed.diagnostics.budgetException,levels:counts};
}
if(require.main===module){fs.mkdirSync(OUT,{recursive:true});const catalog=require('./catalog.json'),selected=process.argv[2]?new Set(process.argv[2].split(',')):null,entries=[],started=performance.now();for(const c of catalog){if(selected&&!selected.has(c.slug))continue;const entry=build(c.slug);entries.push(entry);console.log(c.slug+': '+Object.entries(entry.levels).map(([k,v])=>k+' '+v.triangles+' triangles').join(', '))}if(!selected)fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify({schema:1,source:'83 accepted source meshes; shared three-pose topology per level',stages:STAGES,levels:['far','horizon'],species:entries},null,2)+'\n');console.log(JSON.stringify({species:entries.length,bytes:entries.reduce((n,e)=>n+e.bytes,0),seconds:(performance.now()-started)/1000}))}
module.exports={build,prepare,simplify};
