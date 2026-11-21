const assert=require('assert'),fs=require('fs'),crypto=require('crypto'),path=require('path');
const T=require('../assets/three.min.js'),create=require('../collection/engine.js'),specs=require('./load-specimens.cjs');
function verify(m,slug){
 const g=m.geometry,d=g.userData,p=g.attributes.position,mat=m.material;
 assert(d.shell&&g.type==='BufferGeometry',slug+' must have a real shell');
 assert.equal(p.count,d.topCount*2);assert.equal(g.attributes.uv.count,p.count);
 const edges=new Map();for(let i=0;i<g.index.count;i+=3){const tri=[0,1,2].map(k=>g.index.getX(i+k));for(let k=0;k<3;k++){
  const a=tri[k],b=tri[(k+1)%3],key=Math.min(a,b)+','+Math.max(a,b);const old=edges.get(key)||{n:0,sign:0};old.n++;old.sign+=a<b?1:-1;edges.set(key,old);
 }}
 for(const e of edges.values()){assert.equal(e.n,2,slug+' open/nonmanifold rim');assert.equal(e.sign,0,slug+' inconsistent winding')}
 for(let i=0;i<d.topCount;i++){
  const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+d.topCount);
  assert(a.distanceTo(b)>.009,slug+' lost shell thickness');assert(a.distanceTo(b)<.025,slug+' excessive thickness');
 }
 assert(mat.isMeshStandardMaterial||mat.isMeshPhysicalMaterial);assert.equal(mat.metalness,0);assert(mat.roughness>=.5&&mat.roughness<=.75);
 assert(mat.map?.isDataTexture&&mat.bumpMap?.isDataTexture,slug+' lacks photo/color or height map');
 assert.equal(mat.map.colorSpace,T.SRGBColorSpace);assert.equal(mat.bumpMap.colorSpace,T.NoColorSpace);assert(mat.bumpScale>0&&mat.bumpScale<.025);
 assert.equal(mat.side,T.FrontSide,'closed shell should render its outward faces');
 const row=Math.round(d.N*.55),center=row*(d.W+1)+d.W/2,left=row*(d.W+1),right=left+d.W;
 const mid=g.userData.mid;assert((mid[left*3+1]+mid[right*3+1])/2>mid[center*3+1]+.025,slug+' edges do not cup upward');
 const tip=d.N*(d.W+1)+d.W/2;assert(mid[tip*3+1]>mid[d.W/2*3+1]+.15,slug+' distal centerline droops');
}
for(const c of specs){
 const bytes=fs.readFileSync(path.resolve(__dirname,'../collection',c.photo));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),c.source_sha256);
 assert.equal(c.surfaceMaps.source_sha256,c.source_sha256);
 for(const tile of [...c.surfaceMaps.petals,c.surfaceMaps.center]){
  const rgba=Buffer.from(tile.rgba,'base64'),height=Buffer.from(tile.heightRgba,'base64');assert.equal(rgba.length,tile.width*tile.height*4);assert.equal(height.length,rgba.length);
  const gray=[];for(let i=0;i<height.length;i+=4){assert.equal(height[i],height[i+1]);assert.equal(height[i],height[i+2]);gray.push(height[i]);}
  assert(Math.max(...gray)-Math.min(...gray)>8,c.slug+' flat bump map');
 }
 if(c.runtime)continue;
 const model=create(T,c);model.update(1);for(const m of model.heads[0].petals)verify(m,c.slug);
 console.log('PASS '+c.slug+': closed shell, measurable thickness, upward cup, photo map + linear relief');
}
const cosmos=require('./verify-geometry.cjs').scene;let rays=0;cosmos.traverse(m=>{if(m.name==='cosmos-petal'){verify(m,'cosmos');rays++}});assert.equal(rays,8);assert(cosmos.getObjectByName('petal-rim-light'));
console.log('PASS all 12 photo textures and shell geometry. GPU lighting is not verified by this CPU check.');
