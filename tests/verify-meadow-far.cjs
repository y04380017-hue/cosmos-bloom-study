// Real generated assets: reductions must retain three-dimensional silhouettes,
// stage identity, source-photo atlas islands, and valid indexed triangles.
const fs=require('fs'),path=require('path'),zlib=require('zlib'),assert=require('assert');
const ROOT=path.resolve(__dirname,'../dist/meadow'),catalog=require('../meadow/catalog.json');
const read=f=>JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
const typed=(Type,s)=>{const b=Buffer.from(s,'base64');return new Type(b.buffer,b.byteOffset,b.byteLength/Type.BYTES_PER_ELEMENT)};
const bounds=(p,u)=>{const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++){const k=i%3;lo[k]=Math.min(lo[k],p[i]*u);hi[k]=Math.max(hi[k],p[i]*u)}return {lo,hi}};
let total=0,maximum=0,bytes=0;
for(const c of catalog){
 const file=path.join(ROOT,'models-far',c.slug+'.meshpack');
 assert(fs.existsSync(file),'Missing far geometry for '+c.slug);
 const far=read(file),source=read(path.join(ROOT,'models',c.slug+'.meshpack'));bytes+=fs.statSync(file).size;
 assert.equal(far.schema,1);assert.equal(far.slug,c.slug);assert.equal(far.sourceSha256,source.sourceSha256);assert.equal(far.positionUnit,source.positionUnit);
 assert(!far.atlas,'Far geometry reuses the original species atlas');
 const fingerprints=[];
 for(const stage of ['Bud','Half','Full']){
  const f=far.stages[stage],s=source.stages[stage],p=typed(Int16Array,f.position),n=typed(Int8Array,f.normal),uv=typed(Uint16Array,f.uv),co=typed(Uint8Array,f.color),ix=typed(f.indexType==='u16'?Uint16Array:Uint32Array,f.index),src=typed(Int16Array,s.position);
  assert(p.length>12&&p.length%3===0&&ix.length>9&&ix.length%3===0,c.slug+' '+stage+' collapsed');
  assert.equal(n.length,p.length);assert.equal(uv.length,p.length/3*2);assert.equal(co.length,p.length);
  const b=bounds(p,far.positionUnit),sb=bounds(src,source.positionUnit);
  for(let k=0;k<3;k++){assert(b.hi[k]>b.lo[k],c.slug+' must remain three dimensional');assert(b.lo[k]>=sb.lo[k]-.001&&b.hi[k]<=sb.hi[k]+.001);assert(sb.hi[k]-b.hi[k]<.19&&b.lo[k]-sb.lo[k]<.19,c.slug+' bounds lost')}
  assert(Math.abs(b.lo[1]-sb.lo[1])<.015,c.slug+' ground/root height changed');
  const cols=source.atlas.width/64,rows=source.atlas.height/64,allowed=new Set();const suv=typed(Uint16Array,s.uv);
  for(let i=0;i<suv.length;i+=2)allowed.add(Math.floor(suv[i]/65535*cols)+','+Math.floor(suv[i+1]/65535*rows));
  for(let i=0;i<p.length/3;i++){assert(Math.hypot(n[i*3],n[i*3+1],n[i*3+2])>110,'normal invalid');assert(allowed.has(Math.floor(uv[i*2]/65535*cols)+','+Math.floor(uv[i*2+1]/65535*rows)),'UV crossed atlas islands')}
  for(let i=0;i<ix.length;i+=3){const [a,b,c]=[ix[i],ix[i+1],ix[i+2]];assert(a<p.length/3&&b<p.length/3&&c<p.length/3);assert(a!==b&&a!==c&&b!==c);const ab=[0,1,2].map(k=>p[b*3+k]-p[a*3+k]),ac=[0,1,2].map(k=>p[c*3+k]-p[a*3+k]);assert(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])>0,'degenerate triangle')}
  const triangles=ix.length/3;total+=triangles;maximum=Math.max(maximum,triangles);assert(triangles<typed(s.indexType==='u16'?Uint16Array:Uint32Array,s.index).length/3,c.slug+' was not reduced');fingerprints.push(f.position+f.index);
 }
 assert.equal(new Set(fingerprints).size,3,c.slug+' stages must remain distinct');
}
assert(total/249<600,'Far geometry average too expensive');assert(maximum<1800,'Far geometry outlier too expensive');
console.log(JSON.stringify({result:'PASS',species:83,stages:249,averageTriangles:total/249,maximumTriangles:maximum,totalBytes:bytes}));
