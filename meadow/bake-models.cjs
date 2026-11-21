'use strict';
// Meadow-only static LOD assets. Source studies and their reference maps remain
// unchanged. Closed thin-shell petals, every flower head and every petal remain;
// invisible wrapping is omitted and minute reproductive detail is reduced.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'dist/meadow/models');
const T=require('../assets/three.min.js'),create=require('../collection/engine.js'),playback=require('../collection/bloom-playback.js');
const configs=[...require('../collection/specimens.json'),require('../collection/cosmos-specimen.json'),...require('../collection/cup26-specimens.json'),...require('../collection/remaining49-specimens.json')].sort((a,b)=>a.number-b.number);
const L={...T,
 SphereGeometry:class extends T.SphereGeometry{constructor(r){super(r,6,4)}},
 CylinderGeometry:class extends T.CylinderGeometry{constructor(rt,rb,h,rad,hs,open){super(rt,rb,h,Math.min(rad||4,4),1,open)}},
 TubeGeometry:class extends T.TubeGeometry{constructor(p,n,r,rad,closed){super(p,Math.min(n||6,6),r,Math.min(rad||3,3),closed)}},
 TorusGeometry:class extends T.TorusGeometry{constructor(r,t){super(r,t,3,5)}}
};
const b64=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const toSRGB=x=>x<=.0031308?12.92*x:1.055*Math.pow(x,1/2.4)-.055;
const toLinear=x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);
function modelFor(spec){
 const c=JSON.parse(JSON.stringify(spec));c.surfaceMaps=JSON.parse(fs.readFileSync(path.join(ROOT,'collection/textures',c.slug+'.json'),'utf8'));
 const heads=c.heads?.length||(c.layout==='spiraea'?42:c.layout==='phlox'?17:c.layout==='flax'?3:1),petals=heads*c.rings.reduce((s,r)=>s+r.count,0);
 c.meshSegments=petals>100?[3,4]:petals>35?[4,4]:[5,6];
 if(c.rings.some(r=>r.profile==='trilobe'))c.meshSegments=[5,12];
 c.center.count=Math.min(c.center.count,heads>10?3:heads>5?5:12);
 return create(L,c);
}
function visible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true}
function key(m){return [(m.map?.uuid||''),(m.bumpMap?.uuid||''),m.color.r,m.color.g,m.color.b].join(':')}
function atlasFor(group){
 const materials=[],keys=new Map();
 group.traverse(o=>{if(!o.isMesh||!visible(o))return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(!keys.has(key(m))){keys.set(key(m),materials.length);materials.push(m)}});
 const cols=Math.min(4,Math.max(1,Math.ceil(Math.sqrt(materials.length)))),rows=Math.ceil(materials.length/cols),width=2**Math.ceil(Math.log2(cols*64)),height=2**Math.ceil(Math.log2(rows*64)),rgba=new Uint8Array(width*height*4),bump=new Uint8Array(rgba.length);
 // Two-texel gutters protect linear sampling; the loader disables cross-tile mipmaps.
 materials.forEach((m,id)=>{
  const ox=(id%cols)*64,oy=Math.floor(id/cols)*64,im=m.map?.image,bm=m.bumpMap?.image;
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
   const u=clamp((x-2)/59),v=clamp((y-2)/59),p=((oy+y)*width+ox+x)*4;
   const sample=(im,k,def)=>im?.data?im.data[(Math.round(v*(im.height-1))*im.width+Math.round(u*(im.width-1)))*4+k]/255:def;
   for(let k=0;k<3;k++){const c=[m.color.r,m.color.g,m.color.b][k],tex=sample(im,k,1);rgba[p+k]=Math.round(clamp(toSRGB(c*(im?toLinear(tex):1)))*255);bump[p+k]=Math.round(sample(bm,k,.5)*255)}
   rgba[p+3]=bump[p+3]=255;
  }
 });
 return {width,height,rgba,bump,keys,cols};
}
function reducedLeaf(g){
 const count=g.attributes.position.count;let N,W;
 if(count===23*11){N=22;W=10}else if(count===14*2){N=13;W=1}else return g;
 const rows=[0,Math.round(N*.25),Math.round(N*.5),Math.round(N*.75),N],cols=W===1?[0,1]:[0,W/2,W],positions=[],normals=[],indices=[];
 for(const j of rows)for(const k of cols){const i=j*(W+1)+k;positions.push(g.attributes.position.getX(i),g.attributes.position.getY(i),g.attributes.position.getZ(i));normals.push(g.attributes.normal.getX(i),g.attributes.normal.getY(i),g.attributes.normal.getZ(i))}
 for(let j=0;j<rows.length-1;j++)for(let k=0;k<cols.length-1;k++){const a=j*cols.length+k,b=a+1,d=a+cols.length,e=d+1;indices.push(a,b,d,b,e,d)}
 const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(positions,3));out.setAttribute('normal',new T.Float32BufferAttribute(normals,3));out.setIndex(indices);return out;
}
function bake(group,atlas){
 group.updateMatrixWorld(true);const position=[],normal=[],uv=[],color=[],index=[];let hiddenWrapping=0,petals=0;const names=new Set();
 const v=new T.Vector3(),n=new T.Vector3(),inst=new T.Matrix4(),nm=new T.Matrix3(),ic=new T.Color();
 group.traverse(o=>{
  if(['bud-cover','cosmos-bract','balloon-bud'].includes(o.name)){hiddenWrapping++;return}
  if(!o.isMesh||!visible(o)||o.material.opacity<.005)return;
  names.add(o.name);if(o.name==='petal'||o.name==='cosmos-petal')petals++;
  const original=o.geometry,g=(o.name==='leaf'||(o.name===''&&original.attributes.position.count===28))?reducedLeaf(original):original;
  const pos=g.attributes.position,norm=g.attributes.normal,tex=g.attributes.uv,co=g.attributes.color;
  const groups=Array.isArray(o.material)?g.groups:[{start:0,count:g.index?g.index.count:pos.count,materialIndex:0}];
  for(let instance=0;instance<(o.isInstancedMesh?o.count:1);instance++){
   const world=o.matrixWorld.clone();ic.setRGB(1,1,1);if(o.isInstancedMesh){o.getMatrixAt(instance,inst);world.multiply(inst);if(o.instanceColor)o.getColorAt(instance,ic)}nm.getNormalMatrix(world);
   for(const part of groups){
    const mat=Array.isArray(o.material)?o.material[part.materialIndex]:o.material;if(mat.opacity<.005)continue;
    const tile=atlas.keys.get(key(mat)),ox=tile%atlas.cols*64,oy=Math.floor(tile/atlas.cols)*64,remap=new Map();
    for(let j=part.start;j<part.start+part.count;j++){
     const old=g.index?g.index.getX(j):j;let fresh=remap.get(old);
     if(fresh===undefined){fresh=position.length/3;remap.set(old,fresh);v.fromBufferAttribute(pos,old).applyMatrix4(world);position.push(v.x,v.y,v.z);n.fromBufferAttribute(norm,old).applyMatrix3(nm).normalize();normal.push(n.x,n.y,n.z);
      const u=tex?clamp(tex.getX(old)):.5,w=tex?clamp(tex.getY(old)):.5;uv.push((ox+2.5+u*59)/atlas.width,(oy+2.5+w*59)/atlas.height);
      color.push(ic.r*(mat.vertexColors&&co?co.getX(old):1),ic.g*(mat.vertexColors&&co?co.getY(old):1),ic.b*(mat.vertexColors&&co?co.getZ(old):1));
     }index.push(fresh);
    }
   }
  }
  if(g!==original)g.dispose();
 });
 return {position,normal,uv,color,index,hiddenWrapping,petals,names:[...names]};
}
function dispose(group){const gs=new Set(),ms=new Set(),ts=new Set();group.traverse(o=>{if(o.isMesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){ms.add(m);for(const value of Object.values(m))if(value?.isTexture)ts.add(value)}}});for(const g of gs)g.dispose();for(const m of ms)m.dispose();for(const t of ts)t.dispose()}
function build(spec){
 const model=modelFor(spec);model.update(1);playback.reveal(model.group);const atlas=atlasFor(model.group),full=bake(model.group,atlas);
 let minY=Infinity,maxY=-Infinity;for(let i=1;i<full.position.length;i+=3){minY=Math.min(minY,full.position[i]);maxY=Math.max(maxY,full.position[i])}const sourceHeight=maxY-minY;
 const stages={};let largest=0;
 for(const [stage,display] of [['Bud',0],['Half',.5],['Full',1]]){
  model.update(playback.pose(display));playback.reveal(model.group);const mesh=stage==='Full'?full:bake(model.group,atlas);
  for(let i=0;i<mesh.position.length;i++){mesh.position[i]=(mesh.position[i]-(i%3===1?minY:0))/sourceHeight;largest=Math.max(largest,Math.abs(mesh.position[i]))}mesh.sourceProgress=playback.pose(display);stages[stage]=mesh;
 }
 const unit=largest/32767,packed={};
 for(const [stage,s] of Object.entries(stages)){
  const Indices=s.position.length/3<65536?Uint16Array:Uint32Array;
  packed[stage]={position:b64(Int16Array.from(s.position,v=>Math.round(v/unit))),normal:b64(Int8Array.from(s.normal,v=>Math.round(clamp(v,-1,1)*127))),uv:b64(Uint16Array.from(s.uv,v=>Math.round(clamp(v)*65535))),color:b64(Uint8Array.from(s.color,v=>Math.round(clamp(v)*255))),index:b64(Indices.from(s.index)),indexType:Indices===Uint16Array?'u16':'u32',sourceProgress:s.sourceProgress};
 }
 const raw={schema:1,slug:spec.slug,sourceSha256:spec.source_sha256,sourceHeight,positionUnit:unit,atlas:{width:atlas.width,height:atlas.height,rgba:b64(atlas.rgba),bump:b64(atlas.bump)},stages:packed,diagnostics:{sourcePetals:full.petals,bakedPetals:full.petals,hiddenWrapping:full.hiddenWrapping,visibleNames:full.names,note:'Static meadow LOD uses the existing curved petals and same photo-derived atlas for all three stages; fine veins, leaves, stems and reproductive details are lower resolution than the individual study.'}};
 const buffer=zlib.gzipSync(JSON.stringify(raw),{level:9});fs.writeFileSync(path.join(OUT,spec.slug+'.meshpack'),buffer);
 const entry={slug:spec.slug,number:spec.number,name:spec.name,bytes:buffer.length,triangles:full.index.length/3,vertices:full.position.length/3,sourceHeight,atlasSize:[atlas.width,atlas.height],petals:full.petals};dispose(model.group);return entry;
}
if(require.main===module){
 fs.mkdirSync(OUT,{recursive:true});const selected=process.argv[2]?new Set(process.argv[2].split(',')):null,entries=[];
 for(const c of configs){if(selected&&!selected.has(c.slug))continue;const entry=build(c);entries.push(entry);console.log(c.slug+': '+entry.triangles+' triangles, '+Math.round(entry.bytes/1024)+' KB')}
 if(!selected){const manifest={schema:1,source:'83 accepted reference-guided studies',stages:['Bud','Half','Full'],species:entries};fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('TOTAL '+(entries.reduce((n,e)=>n+e.bytes,0)/1024/1024).toFixed(2)+' MB')}
}
module.exports={build};
