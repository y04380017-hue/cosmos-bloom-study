(function(root){
'use strict';
const bytes=s=>{if(typeof Buffer!=='undefined')return Uint8Array.from(Buffer.from(s,'base64'));const b=atob(s);return Uint8Array.from(b,c=>c.charCodeAt(0))};
function array(Type,s){const b=bytes(s);return new Type(b.buffer,b.byteOffset,b.byteLength/Type.BYTES_PER_ELEMENT)}
async function readPack(url,fetcher){
 const response=await fetcher(url);if(!response.ok)throw new Error("Flower model unavailable: "+url);
 const raw=new Uint8Array(await response.arrayBuffer());
 if(raw[0]===31&&raw[1]===139){if(typeof DecompressionStream==='undefined')throw new Error('gzip DecompressionStream support required');return JSON.parse(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text())}
 return JSON.parse(new TextDecoder().decode(raw));
}
async function loadTemplate(T,slug,options={}){
 if(!/^[a-z0-9-]+$/.test(slug))throw new Error('Invalid flower slug');
 const fetcher=options.fetch||fetch;
 const [data,far,cycleData]=await Promise.all([
  readPack((options.baseUrl||'./models/')+slug+'.meshpack',fetcher),
  options.farBaseUrl?readPack(options.farBaseUrl+slug+'.meshpack',fetcher):null,
  options.cycleBaseUrl?readPack(options.cycleBaseUrl+slug+'.meshpack',fetcher):null
 ]);
 if(data.schema!==1||data.slug!==slug||far&&(far.schema!==1||far.slug!==slug||far.sourceSha256!==data.sourceSha256))throw new Error('Invalid flower model pack');
 if(cycleData&&(cycleData.slug!==slug||cycleData.sourceSha256!==data.sourceSha256))throw new Error('Mismatched cycle model source');
 // Full automatic mip chains blend separate atlas islands at meadow distance.
 // Linear sampling keeps species/petal colors within their padded atlas tiles.
 const texture=(pixels,srgb)=>{const t=new T.DataTexture(pixels,data.atlas.width,data.atlas.height,T.RGBAFormat);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.flipY=false;t.generateMipmaps=false;t.minFilter=T.LinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=4;t.needsUpdate=true;return t};
 function pigments(pixels,family){
  const colors={blue:[92,166,237],light:[249,239,216],pink:[240,153,183],violet:[166,144,221],warm:[253,193,92],coral:[238,125,122]};
  const target=family && colors[slug==='phlox-subulata'?'pink':family];
  const {width,height}=data.atlas,tile=64;
  const source=pixels.slice(),words=new Uint32Array(source.buffer);
  for(let y=0;y<height;y+=tile)for(let x=0;x<width;x+=tile){
   const first=y*width+x;let textured=false;
   const mean=[0,0,0];
   for(let v=3;v<62;v+=3)for(let u=3;u<62;u+=3){
    const k=first+v*width+u;
    if(words[k]!==words[first])textured=true;
    for(let c=0;c<3;c++)mean[c]+=source[4*k+c]/400;
   }
   if(!textured){
    const [r,g,b]=mean;
    if(words[first] && g>r*1.08 && g>b*1.16){
     const leaf=[.55*r+70,.55*g+83,.55*b+54];
     for(let v=0;v<tile;v++)for(let u=0;u<tile;u++){
      const i=4*(first+v*width+u);
      for(let c=0;c<3;c++)pixels[i+c]=Math.round(leaf[c]);
     }
    }
    continue;
   }
   const luma=.213*mean[0]+.715*mean[1]+.072*mean[2];
   const familyWeight=family==='blue' ? .79 : family==='light' ? .75 : .44;
   const body=mean.map((n,c)=>target ? target[c]*familyWeight+n*(1-familyWeight) :
    luma+.52*(n-luma)+.42*(255-luma)*Math.sqrt(luma/255));
   for(let v=0;v<tile;v++)for(let u=0;u<tile;u++){
    const i=4*(first+v*width+u);
    let local=0;
    for(const dy of [-3,0,3])for(const dx of [-3,0,3]){
     const k=4*(first+Math.max(0,Math.min(63,v+dy))*width+Math.max(0,Math.min(63,u+dx)));
     local+=(source[k]*.213+source[k+1]*.715+source[k+2]*.072)/9;
    }
    const wash=Math.max(-20,Math.min(16,(local-luma)*.26));
    for(let c=0;c<3;c++)pixels[i+c]=Math.min(255,Math.max(0,Math.round(body[c]+wash)));
    // The opaque shader reads this tile tag before restoring surface alpha.
    pixels[i+3]=128;
   }
  }
  return pixels;
 }
 const map=texture(pigments(bytes(data.atlas.rgba),options.colorFamily),true),bumpMap=texture(bytes(data.atlas.bump),false);
 const material=new T.MeshStandardMaterial({color:0xffffff,map,bumpMap,bumpScale:.00012,roughness:.91,metalness:0,vertexColors:true,side:T.DoubleSide,emissive:0xffffff,emissiveMap:map,emissiveIntensity:.018});
 material.userData.petalGrid=new T.Vector2(data.atlas.width/64,data.atlas.height/64);
 material.name=slug+' / spring pigment';
 function geometrySet(pack){const result={};
 for(const stage of ['Bud','Half','Full']){
  const s=pack.stages[stage],g=new T.BufferGeometry(),p=array(Int16Array,s.position),positions=new Float32Array(p.length);
  for(let i=0;i<p.length;i++)positions[i]=p[i]*pack.positionUnit;
  g.setAttribute('position',new T.BufferAttribute(positions,3));
  g.setAttribute('normal',new T.BufferAttribute(array(Int8Array,s.normal),3,true));
  g.setAttribute('uv',new T.BufferAttribute(array(Uint16Array,s.uv),2,true));
  g.setAttribute('color',new T.BufferAttribute(array(Uint8Array,s.color),3,true));
  g.setIndex(new T.BufferAttribute(array(s.indexType==='u16'?Uint16Array:Uint32Array,s.index),1));
  g.computeBoundingBox();g.computeBoundingSphere();
  g.name=slug+' / '+stage;g.userData={slug,stage,sourceSha256:data.sourceSha256,sourceProgress:s.sourceProgress,normalizedFullHeight:1};
  result[stage]={geometry:g,material};
 }
 return result;}
 const stages=geometrySet(data),farStages=far?geometrySet(far):null;
 function morphGeometry(poses){
  const full=poses.Full.geometry,g=new T.BufferGeometry();
  for(const [name,attribute] of Object.entries(full.attributes))g.setAttribute(name,attribute);g.setIndex(full.index);
  for(const [stage,suffix] of [['Bud','Bud'],['Half','Half']]){
   const other=poses[stage].geometry;if(other.attributes.position.count!==full.attributes.position.count||other.index.count!==full.index.count)throw new Error('Incompatible morph topology');
   g.setAttribute('position'+suffix,other.attributes.position);g.setAttribute('normal'+suffix,other.attributes.normal);
  }
  g.computeBoundingBox();for(const stage of ['Bud','Half'])g.boundingBox.union(poses[stage].geometry.boundingBox);g.boundingBox.expandByScalar(.4);g.boundingSphere=new T.Sphere();g.boundingBox.getBoundingSphere(g.boundingSphere);
  g.userData={slug,sourceSha256:data.sourceSha256,cycle:true};return {geometry:g,material};
 }
 const cycle={};const lodSources=[];
 if(cycleData){cycle.near=morphGeometry(stages);for(const lod of ['far','horizon']){const poses=geometrySet({...cycleData,stages:cycleData.levels[lod].stages});lodSources.push(...Object.values(poses));cycle[lod]=morphGeometry(poses)}}
 let disposed=false;
 return {slug,stages,farStages,cycle,fullHeight:1,sourceHeight:data.sourceHeight,diagnostics:data.diagnostics,dispose(){if(disposed)return;disposed=true;for(const s of [...Object.values(stages),...Object.values(farStages||{}),...Object.values(cycle),...lodSources])s.geometry.dispose();material.dispose();map.dispose();bumpMap.dispose()}};
}
const api={loadTemplate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MeadowModels=api;
})(typeof globalThis!=='undefined'?globalThis:this);
