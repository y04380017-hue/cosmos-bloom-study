'use strict';
// Distant flower LOD is a reduced version of the accepted three-dimensional
// meshes, not a billboard or a substitute flower. Every retained UV stays in
// its source-photo atlas island. No coordinate renormalization is performed.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=path.resolve(__dirname,'..'),IN=path.join(ROOT,'dist/meadow/models'),OUT=path.join(ROOT,'dist/meadow/models-far');
const typed=(Type,s)=>{const b=Buffer.from(s,'base64');return new Type(b.buffer,b.byteOffset,b.byteLength/Type.BYTES_PER_ELEMENT)};
const b64=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');
function decode(s){return {p:typed(Int16Array,s.position),n:typed(Int8Array,s.normal),uv:typed(Uint16Array,s.uv),co:typed(Uint8Array,s.color),ix:typed(s.indexType==='u16'?Uint16Array:Uint32Array,s.index)}}
function simplify(data,s,cell){
 const {p,n,uv,co,ix}=decode(s),unit=data.positionUnit,cols=data.atlas.width/64,rgba=typed(Uint8Array,data.atlas.rgba),groups=new Map(),lookup=new Uint32Array(p.length/3),clusters=[];
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<p.length;i++){lo[i%3]=Math.min(lo[i%3],p[i]);hi[i%3]=Math.max(hi[i%3],p[i])}
 for(let i=0;i<p.length/3;i++){
  const tx=Math.floor(uv[i*2]/65535*data.atlas.width/64),ty=Math.floor(uv[i*2+1]/65535*data.atlas.height/64),tile=ty*cols+tx;
  const pixel=((ty*64+32)*data.atlas.width+tx*64+32)*4,green=rgba[pixel+1]>rgba[pixel]*1.13&&rgba[pixel+1]>rgba[pixel+2]*1.13;
  // Keep the four sides of slender stems/branches. Without this safeguard a
  // spatial reducer collapses their tiny radius, leaving heads without roots.
  const side=green?(n[i*3]>=0?1:0)+(n[i*3+2]>=0?2:0):0;
  const key=[tile,side,...[0,1,2].map(k=>Math.floor(p[i*3+k]*unit/cell))].join('/');
  let c=groups.get(key);if(!c){c={id:clusters.length,count:0,p:[0,0,0],n:[0,0,0],uv:[0,0],co:[0,0,0],fallback:[n[i*3],n[i*3+1],n[i*3+2]],min:[false,false,false],max:[false,false,false]};groups.set(key,c);clusters.push(c)}
  c.count++;lookup[i]=c.id;
  for(let k=0;k<3;k++){c.p[k]+=p[i*3+k];c.n[k]+=n[i*3+k];c.co[k]+=co[i*3+k];if(p[i*3+k]===lo[k])c.min[k]=true;if(p[i*3+k]===hi[k])c.max[k]=true}
  c.uv[0]+=uv[i*2];c.uv[1]+=uv[i*2+1];
 }
 for(const c of clusters){for(let k=0;k<3;k++){c.p[k]=Math.round(c.min[k]?lo[k]:c.max[k]?hi[k]:c.p[k]/c.count);c.co[k]=Math.round(c.co[k]/c.count)}c.uv=c.uv.map(v=>Math.round(v/c.count));let len=Math.hypot(...c.n);if(len<1){c.n=c.fallback;len=Math.hypot(...c.n)}c.n=c.n.map(v=>Math.round(v/len*127))}
 const triangles=[],seen=new Set(),used=new Set();
 for(let i=0;i<ix.length;i+=3){
  const a=lookup[ix[i]],b=lookup[ix[i+1]],c=lookup[ix[i+2]];if(a===b||b===c||a===c)continue;
  const ab=clusters[b].p.map((v,k)=>v-clusters[a].p[k]),ac=clusters[c].p.map((v,k)=>v-clusters[a].p[k]);if(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])===0)continue;
  const key=[a,b,c].sort((a,b)=>a-b).join(',');if(seen.has(key))continue;seen.add(key);triangles.push(a,b,c);used.add(a);used.add(b);used.add(c);
 }
 const positions=[],normals=[],uvs=[],colors=[],remap=new Map();
 for(const id of used){const c=clusters[id];remap.set(id,positions.length/3);positions.push(...c.p);normals.push(...c.n);uvs.push(...c.uv);colors.push(...c.co)}
 const indices=triangles.map(i=>remap.get(i));
 // A root can be thinner than one voxel in every direction. Preserve source
 // triangles touching extrema if the surviving mesh lost a boundary, so its
 // scale/foot placement remains identical to the near model.
 const bounds=[0,1,2].map(k=>({min:Infinity,max:-Infinity}));for(let i=0;i<positions.length;i++){bounds[i%3].min=Math.min(bounds[i%3].min,positions[i]);bounds[i%3].max=Math.max(bounds[i%3].max,positions[i])}
 const copied=new Map();
 for(let axis=0;axis<3;axis++)for(const edge of ['min','max']){
  const desired=edge==='min'?lo[axis]:hi[axis];if(Math.abs(bounds[axis][edge]-desired)*unit<.003)continue;
  let chosen=-1,area=-1;
  for(let i=0;i<ix.length;i+=3){if(![ix[i],ix[i+1],ix[i+2]].some(v=>p[v*3+axis]===desired))continue;const ab=[0,1,2].map(k=>p[ix[i+1]*3+k]-p[ix[i]*3+k]),ac=[0,1,2].map(k=>p[ix[i+2]*3+k]-p[ix[i]*3+k]);const a=Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]);if(a>area){chosen=i;area=a}}
  if(chosen>=0&&area>0)for(let j=0;j<3;j++){const old=ix[chosen+j];let id=copied.get(old);if(id===undefined){id=positions.length/3;copied.set(old,id);positions.push(...p.slice(old*3,old*3+3));normals.push(...n.slice(old*3,old*3+3));colors.push(...co.slice(old*3,old*3+3));uvs.push(...uv.slice(old*2,old*2+2))}indices.push(id)}
 }
 // A few original pole vertices have a zero source normal. Recover those
 // from the retained surface rather than sending undefined lighting to GLSL.
 for(let i=0;i<normals.length;i+=3){let len=Math.hypot(normals[i],normals[i+1],normals[i+2]);if(len>=110)continue;const sum=[0,0,0];for(let j=0;j<indices.length;j+=3){if(!indices.slice(j,j+3).includes(i/3))continue;const a=indices[j]*3,b=indices[j+1]*3,c=indices[j+2]*3,ab=[0,1,2].map(k=>positions[b+k]-positions[a+k]),ac=[0,1,2].map(k=>positions[c+k]-positions[a+k]);const nn=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];for(let k=0;k<3;k++)sum[k]+=nn[k]}len=Math.hypot(...sum);if(len<1){sum[1]=1;len=1}for(let k=0;k<3;k++)normals[i+k]=Math.round(sum[k]/len*127)}
 return {position:b64(Int16Array.from(positions)),normal:b64(Int8Array.from(normals)),uv:b64(Uint16Array.from(uvs)),color:b64(Uint8Array.from(colors)),index:b64(Uint16Array.from(indices)),indexType:'u16',sourceProgress:s.sourceProgress,triangles:indices.length/3,vertices:positions.length/3,cell};
}
function build(slug){
 const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(IN,slug+'.meshpack')))),stages={},counts={};
 for(const [stage,s] of Object.entries(data.stages)){
  let selected;for(const cell of [.035,.045,.055,.07,.085,.10,.12,.145,.175,.21,.25,.30,.36]){selected=simplify(data,s,cell);if(selected.triangles<=480)break}
  const {triangles,vertices,cell,...packed}=selected;stages[stage]=packed;counts[stage]={sourceTriangles:decode(s).ix.length/3,triangles,vertices,voxelSize:cell};
 }
 const packed={schema:1,slug,sourceSha256:data.sourceSha256,positionUnit:data.positionUnit,stages,diagnostics:{method:'Source-mesh vertex clustering within photo-atlas islands; slender green stems retain side normals; three-dimensional curved petals remain.',counts}},bytes=zlib.gzipSync(JSON.stringify(packed),{level:9});fs.writeFileSync(path.join(OUT,slug+'.meshpack'),bytes);
 return {slug,bytes:bytes.length,stages:counts};
}
if(require.main===module){fs.mkdirSync(OUT,{recursive:true});const catalog=require('./catalog.json'),selected=process.argv[2]?new Set(process.argv[2].split(',')):null,entries=[];for(const c of catalog){if(selected&&!selected.has(c.slug))continue;const e=build(c.slug);entries.push(e);console.log(c.slug+': '+Object.values(e.stages).map(s=>s.triangles).join('/')+' triangles')}if(!selected)fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify({schema:1,species:entries},null,2)+'\n')}
module.exports={build,simplify};
