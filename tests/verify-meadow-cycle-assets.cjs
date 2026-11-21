'use strict';
// These checks reject missing reductions, independently simplified morph poses,
// detached roots, bad atlas sampling and excessive distant geometry. They read
// the shipped assets rather than borrowing the reducer's implementation.
const assert=require('assert'),fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=path.resolve(__dirname,'../dist/meadow'),catalog=require('../meadow/catalog.json');
const names=['Bud','Half','Full'],budgets={far:1200,horizon:550};
const read=file=>JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
const array=(Type,value)=>{const b=Buffer.from(value,'base64');return new Type(b.buffer,b.byteOffset,b.byteLength/Type.BYTES_PER_ELEMENT)};
function bounds(p){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++){lo[i%3]=Math.min(lo[i%3],p[i]);hi[i%3]=Math.max(hi[i%3],p[i])}return {lo,hi}}
function tile(uv,i,atlas){return Math.floor(uv[i*2]/65535*atlas.width/64)+','+Math.floor(uv[i*2+1]/65535*atlas.height/64)}
let bytes=0;const totals={far:0,horizon:0},maxima={far:0,horizon:0};
for(const c of catalog){
 const file=path.join(ROOT,'models-cycle',c.slug+'.meshpack');
 assert(fs.existsSync(file),'Missing cycle geometry for '+c.slug);
 const data=read(file),source=read(path.join(ROOT,'models',c.slug+'.meshpack'));
 bytes+=fs.statSync(file).size;
 assert.equal(data.schema,1);assert.equal(data.slug,c.slug);assert.equal(data.sourceSha256,source.sourceSha256);
 assert.equal(data.positionUnit,source.positionUnit,'Morph units must not change');assert(!data.atlas,'Reuse the photograph atlas');
 for(const level of Object.keys(budgets)){
  assert(data.levels[level],c.slug+' missing '+level);const poses=[];let first;
  for(const stage of names){
   const s=data.levels[level].stages[stage],src=source.stages[stage],label=c.slug+'/'+level+'/'+stage;
   assert(s,label+' missing');assert.equal(s.indexType,'u16');assert.equal(s.sourceProgress,src.sourceProgress);
   const p=array(Int16Array,s.position),n=array(Int8Array,s.normal),uv=array(Uint16Array,s.uv),co=array(Uint8Array,s.color),ix=array(Uint16Array,s.index),sp=array(Int16Array,src.position),su=array(Uint16Array,src.uv),sc=array(Uint8Array,src.color);
   assert(p.length>=12&&p.length%3===0,label+' collapsed');assert.equal(n.length,p.length);assert.equal(co.length,p.length);assert.equal(uv.length,p.length/3*2);
   assert(ix.length>9&&ix.length%3===0,label+' empty triangles');assert(ix.length/3<=budgets[level],label+' triangle budget');
   if(data.diagnostics.sourceHeads===1)assert(ix.length/3<=(level==='far'?480:160),label+' single-head triangle budget');
   else assert(data.diagnostics.budgetException,label+' multihead exception must be explained');
   if(level==='horizon'&&data.diagnostics.sourceHeads<=20)assert(ix.length/3<=500,label+' fewer than 21 heads must stay within the standard multihead budget');
   if(first){assert.equal(s.index,first.index,label+' changed morph topology');assert.equal(s.position.length,first.position.length,label+' changed morph vertex count');assert.equal(s.uv,first.uv,label+' changed atlas coordinates');assert.equal(s.color,first.color,label+' changed vertex colors')}else first=s;
   const b=bounds(p),sb=bounds(sp);
   for(let k=0;k<3;k++){assert(b.hi[k]>b.lo[k],label+' lost 3D extent');assert(b.lo[k]>=sb.lo[k]&&b.hi[k]<=sb.hi[k],label+' exceeds source bounds');assert(Math.abs(b.lo[k]-sb.lo[k])*data.positionUnit<.003&&Math.abs(b.hi[k]-sb.hi[k])*data.positionUnit<.003,label+' lost stage bounds')}
   assert(Math.abs(b.lo[1]-sb.lo[1])*data.positionUnit<.001,label+' detached root');
   const islands=new Map();for(let i=0;i<sp.length/3;i++){const t=tile(su,i,source.atlas);let range=islands.get(t);if(!range){range={lo:[255,255,255],hi:[0,0,0]};islands.set(t,range)}for(let k=0;k<3;k++){range.lo[k]=Math.min(range.lo[k],sc[i*3+k]);range.hi[k]=Math.max(range.hi[k],sc[i*3+k])}}
   const seen=new Set();for(let i=0;i<p.length/3;i++){assert(Math.hypot(n[i*3],n[i*3+1],n[i*3+2])>=125,label+' invalid normal');const t=tile(uv,i,source.atlas),range=islands.get(t);assert(range,label+' UV crossed source atlas islands');seen.add(t);for(let k=0;k<3;k++)assert(co[i*3+k]>=range.lo[k]&&co[i*3+k]<=range.hi[k],label+' invented vertex color')}
   for(const t of islands.keys())assert(seen.has(t),label+' lost source atlas island '+t);
   // A compact source bud must still have colored flower surface near it.
   // Global clustering used to blend the separate phlox heads into one canopy.
   if(c.slug==='phlox'&&stage==='Bud'){
    const spoints=[[.0,1.01,.0],[.217,.943,.042]];
    const flowerTiles=new Set(['2,0','0,1']);
    for(const point of spoints){let nearest=Infinity;for(let i=0;i<p.length/3;i++)if(flowerTiles.has(tile(uv,i,source.atlas)))nearest=Math.min(nearest,Math.hypot(...point.map((v,k)=>p[i*3+k]*data.positionUnit-v)));assert(nearest<.065,label+' merged a distinct source flower head')}
   }
   if(c.slug==='spiraea'){
    const point=[-.05238,.49494,.00239];let nearest=Infinity;
    for(let i=0;i<p.length/3;i++)if(tile(uv,i,source.atlas)==='0,0')nearest=Math.min(nearest,Math.hypot(...point.map((v,k)=>p[i*3+k]*data.positionUnit-v)));
    assert(nearest<.03,label+' broke the main source branch');
   }
   if(c.slug==='lobularia-maritima'){
    const point=[-.38957,.66157,.03668];let nearest=Infinity;
    for(let i=0;i<p.length/3;i++)if(tile(uv,i,source.atlas)==='0,0')nearest=Math.min(nearest,Math.hypot(...point.map((v,k)=>p[i*3+k]*data.positionUnit-v)));
    assert(nearest<.02,label+' detached a flower from its source stem');
   }
   for(let i=0;i<ix.length;i+=3){const a=ix[i],b=ix[i+1],c=ix[i+2];assert(a<p.length/3&&b<p.length/3&&c<p.length/3,label+' out-of-range index');assert(a!==b&&b!==c&&a!==c,label+' collapsed triangle');const ab=[0,1,2].map(k=>p[b*3+k]-p[a*3+k]),ac=[0,1,2].map(k=>p[c*3+k]-p[a*3+k]);assert(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])>0,label+' degenerate triangle')}
   poses.push(s.position);
  }
  assert.equal(new Set(poses).size,3,c.slug+'/'+level+' lost bloom poses');const count=array(Uint16Array,first.index).length/3;
  totals[level]+=count;maxima[level]=Math.max(maxima[level],count);
 }
}
assert.equal(catalog.length,83);const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'models-cycle/manifest.json'),'utf8'));
assert.equal(manifest.species.length,83);assert.equal(new Set(manifest.species.map(s=>s.slug)).size,83);
for(const entry of manifest.species){const data=read(path.join(ROOT,'models-cycle',entry.slug+'.meshpack'));assert.equal(entry.bytes,fs.statSync(path.join(ROOT,'models-cycle',entry.slug+'.meshpack')).size);assert.equal(entry.sourceHeads,data.diagnostics.sourceHeads);for(const level of Object.keys(budgets))assert.equal(entry.levels[level].triangles,array(Uint16Array,data.levels[level].stages.Full.index).length/3)}
console.log(JSON.stringify({result:'PASS',species:83,poses:498,averageTriangles:Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,v/83])),maximumTriangles:maxima,totalBytes:bytes}));
