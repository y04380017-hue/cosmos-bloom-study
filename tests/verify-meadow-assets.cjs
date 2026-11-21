'use strict';
// Guards missing species/stages, wrong texture transfer, floating plants and
// accidental reintroduction of the closed outer wrapping in the meadow bake.
const fs=require('fs'),path=require('path'),assert=require('assert'),zlib=require('zlib');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'dist/meadow/models');
// Measure the actual photo tiles delivered by the meadow loader. Constant tiles
// are leaves, stems or flower centres and intentionally use separate pigments.
function checkPetalPaint(raw,material){
 const source=Buffer.from(raw.atlas.rgba,'base64'),paint=material.map.image.data;
 const {width,height}=raw.atlas;
 let tiles=0,lift=0;
 for(let y=0;y<height;y+=64)for(let x=0;x<width;x+=64){
  const start=(y*width+x)*4;
  if(!source[start+3])continue;
  let pixels=0,oldChroma=0,newChroma=0,oldLight=0,newLight=0,low=255,high=0;
  const colours=new Set();
  for(let v=3;v<62;v+=3)for(let u=3;u<62;u+=3){
   const k=((y+v)*width+x+u)*4;
   colours.add(source.readUInt32LE(k));
   const luma=a=>.2126*a[k]+.7152*a[k+1]+.0722*a[k+2];
   const chroma=a=>Math.max(a[k],a[k+1],a[k+2])-Math.min(a[k],a[k+1],a[k+2]);
   oldLight+=luma(source);newLight+=luma(paint);oldChroma+=chroma(source);newChroma+=chroma(paint);
   low=Math.min(low,luma(paint));high=Math.max(high,luma(paint));pixels++;
  }
  if(colours.size<2)continue;
  assert(newLight+.25*pixels>=oldLight,raw.slug+' painted petals must be lighter');
  assert(newChroma<=oldChroma*.58+pixels*1.5,raw.slug+' petal chroma must soften');
  assert(high>low,raw.slug+' retain internal petal variation');
  lift+=(newLight-oldLight)/pixels;tiles++;
 }
 assert(tiles>=2,raw.slug+' missing photo-derived petal tiles');
 assert.deepEqual(Buffer.from(material.bumpMap.image.data),Buffer.from(raw.atlas.bump,'base64'));
 return lift/tiles;
}
async function run(){
 assert(fs.existsSync(path.join(folder,'manifest.json')),'The meadow must contain all 83 reusable three-stage model packs');
 const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
 const originals=[...require('../collection/specimens.json'),require('../collection/cosmos-specimen.json'),...require('../collection/cup26-specimens.json'),...require('../collection/remaining49-specimens.json')];
 assert.equal(manifest.species.length,83);assert.equal(new Set(manifest.species.map(x=>x.slug)).size,83);
 assert.deepEqual(new Set(manifest.species.map(x=>x.slug)),new Set(originals.map(x=>x.slug)));
 const T=require('../assets/three.min.js'),loader=require('../meadow/model-loader.js');
 const fetch=async url=>({ok:true,arrayBuffer:async()=>{const b=fs.readFileSync(path.join(folder,path.basename(url)));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}});
 const lightnessLift=[];let triangles=0,maxTriangles=0,bytes=0;
 for(const entry of manifest.species){
  const file=fs.readFileSync(path.join(folder,entry.slug+'.meshpack'));bytes+=file.length;
  const raw=JSON.parse(zlib.gunzipSync(file).toString());
  assert.equal(raw.slug,entry.slug);assert.equal(raw.sourceSha256,originals.find(c=>c.slug===entry.slug).source_sha256);
  assert.deepEqual(Object.keys(raw.stages),['Bud','Half','Full']);
  assert(raw.diagnostics.hiddenWrapping>0,'A source must account for its removed wrapping');
  assert(!raw.diagnostics.visibleNames.some(x=>['bud-cover','cosmos-bract','balloon-bud'].includes(x)));
  const original=originals.find(c=>c.slug===entry.slug);
  const heads=original.heads?.length||(original.layout==='spiraea'?42:original.layout==='phlox'?17:original.layout==='flax'?3:1);
  const expectedPetals=original.slug==='cosmos'?8:heads*original.rings.reduce((n,r)=>n+r.count,0);
  assert.equal(raw.diagnostics.bakedPetals,expectedPetals,'LOD must retain every source petal');
  const model=await loader.loadTemplate(T,entry.slug,{baseUrl:'./models/',fetch});
  lightnessLift.push(checkPetalPaint(raw,model.stages.Full.material));
  let previous;
  for(const stage of ['Bud','Half','Full']){
   const {geometry:g,material:m}=model.stages[stage];
   assert(g.index&&g.attributes.uv&&g.attributes.normal&&g.attributes.color);
   assert(m.isMeshStandardMaterial);assert.equal(m.map.colorSpace,T.SRGBColorSpace);assert.equal(m.bumpMap.colorSpace,T.NoColorSpace);
   for(const atlas of [m.map,m.bumpMap])assert(!atlas.generateMipmaps&&atlas.minFilter===T.LinearFilter,'Atlas island colors must not merge through automatic coarse mip levels');
   assert(m.map.image.data.some(v=>v!==255),'Atlas must contain source colors');
   let lo=255,hi=0;for(let i=0;i<m.bumpMap.image.data.length;i+=4){lo=Math.min(lo,m.bumpMap.image.data[i]);hi=Math.max(hi,m.bumpMap.image.data[i])}assert(hi-lo>15,'Bump atlas must contain varying source heights');
   for(const key of ['position','normal','uv','color'])for(const value of g.attributes[key].array)assert(Number.isFinite(value));
   for(const index of g.index.array)assert(index<g.attributes.position.count);
   g.computeBoundingBox();assert(Math.abs(g.boundingBox.min.y)<.002,'Every pose must stay grounded');
   if(stage==='Full')assert(Math.abs(g.boundingBox.max.y-1)<.002,'One full-pose scale must normalize plant height');
   const pose=Buffer.from(g.attributes.position.array.buffer).toString('base64');assert.notEqual(pose,previous,'Stages must use distinct geometry');previous=pose;
   const count=g.index.count/3;triangles+=count;maxTriangles=Math.max(maxTriangles,count);
  }
  model.dispose();
 }
 assert(bytes<40*1024*1024,'83 meadow packs exceeded the delivery budget');
 console.log(JSON.stringify({passed:83,poses:249,minMeanPetalLumaLift:Math.round(Math.min(...lightnessLift)),megabytes:+(bytes/1024/1024).toFixed(2),averageTriangles:Math.round(triangles/249),maxTriangles,renderer:'real geometry and materials; no GPU renderer'},null,2));
}
run().catch(e=>{console.error(e);process.exit(1)});
