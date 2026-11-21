/* Clear-horizon meadow. Same source geometry, same height unit at every distance. */
(function(root){
'use strict';
const terrainHeight=(typeof module!=='undefined'&&module.exports?require('./flower-scatter.js'):root.FlowerScatter).terrainHeight;
function horizonPlants(layout){
 const result=[...layout.plants];
 for(const dx of [-1,0,1])for(const dz of [-1,0,1]){
  if(!dx&&!dz)continue;
  layout.plants.forEach((p,i)=>{
   const x=p.x+dx*layout.width,z=p.z+dz*layout.depth,edge=Math.max(Math.abs(x),Math.abs(z));
   // Dense continuation at the field border, then subpixel thinning at distance.
   const divisor=edge<190?1:edge<260?2:edge<350?4:7;
   if(p.accent||(i+Math.abs(dx*3+dz))%divisor)return;
   result.push({...p,x,z,y:terrainHeight(x,z),background:true});
  });
 }
 return result;
}
function distanceRetention(distance){return Math.min(1,Math.pow(85/Math.max(85,distance),2.3))}
function plantSample(p){const n=Math.sin(p.x*12.9898+p.z*78.233)*43758.5453;return n-Math.floor(n)}
async function instantiate(T,layout,{loadTemplate,wind,extendHorizon=true}){
 const plants=extendHorizon?horizonPlants(layout):layout.plants,group=new T.Group();group.name='procedural-flower-meadow';
 const pickCache=new Map(),buckets=new Map(),meshes=[],enabled={ground:true,cluster:true,focus:true};
 for(const p of plants){if(!buckets.has(p.slug))buckets.set(p.slug,{items:[],slug:p.slug,layer:p.layer});buckets.get(p.slug).items.push(p)}
 const stats={instances:layout.plants.length,background:plants.length-layout.plants.length,species:buckets.size,drawn:0,visible:0,triangles:0,batches:0};
 const dummy=new T.Object3D(),frustum=new T.Frustum(),projection=new T.Matrix4(),sphere=new T.Sphere(new T.Vector3(),2.2),last=new T.Vector3(Infinity,Infinity,Infinity),lastQuat=new T.Quaternion(),lastProjection=new T.Matrix4();
 const dispose=()=>{for(const m of meshes){group.remove(m);m.dispose()}meshes.length=0;buckets.clear();for(const g of pickCache.values())g.dispose();pickCache.clear()};
 try{
  for(const b of buckets.values()){
   const model=await loadTemplate(b.slug);b.matrices=new Float32Array(b.items.length*16);b.previous=new Uint8Array(b.items.length);b.samples=Float32Array.from(b.items,plantSample);
   b.items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.tiltX||0,p.rotationY,p.tiltZ||0,"YXZ");dummy.scale.set(p.scale*(p.widthScale??1),p.scale,p.scale*(p.widthScale??1));dummy.updateMatrix();dummy.matrix.toArray(b.matrices,i*16)});
   for(const lod of ['near','far','horizon']){
    const source=model.cycle?.[lod];if(!source)throw new Error('Missing cycle '+lod+' '+b.slug);
    wind.attach(source.material,{cycle:true});const m=new T.InstancedMesh(source.geometry,source.material,b.items.length);m.count=0;m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    m.userData={slug:b.slug,layer:b.layer,lod,plants:[]};m.name=b.slug+'/'+lod;m.customDepthMaterial=wind.depthMaterial(true);m.castShadow=lod==='near'&&b.layer!=='ground';m.receiveShadow=lod==='near';group.add(m);meshes.push(m);b[lod]=m;
   }
  }
 }catch(e){dispose();throw e}
 function recount(){stats.visible=0;stats.triangles=0;stats.batches=0;for(const m of meshes){m.visible=enabled[m.userData.layer]&&m.count>0;if(m.visible){stats.visible+=m.count;stats.triangles+=m.count*(m.geometry.index?.count??m.geometry.attributes.position.count)/3;stats.batches++}}}
 function update(camera,force=false){
  if(!force&&last.distanceToSquared(camera.position)<.045&&lastQuat.angleTo(camera.quaternion)<.008&&lastProjection.equals(camera.projectionMatrix))return false;
  last.copy(camera.position);lastQuat.copy(camera.quaternion);lastProjection.copy(camera.projectionMatrix);camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);stats.drawn=0;
  const downward=Math.max(0,-camera.getWorldDirection(new T.Vector3()).y);
  const overhead=Math.max(0,(downward-.65)/.35);
  for(const b of buckets.values()){
   for(const lod of ['near','far','horizon']){b[lod].count=0;b[lod].userData.plants.length=0}
   b.items.forEach((p,i)=>{
    sphere.center.set(p.x,p.y+.65,p.z);sphere.radius=p.scale*1.6;if(!frustum.intersectsSphere(sphere))return;
    const d=sphere.center.distanceTo(camera.position),near=d<(b.previous[i]===1?7.2:6.25),lod=near?'near':d<45?'far':'horizon';
    // Stable stochastic density, with hysteresis: far petals become subpixel,
    // so thin gradually rather than ending the meadow at a distance ring.
    if(lod==='horizon'&&p.layer!=='focus'&&d>85){const retention=distanceRetention(d),keep=retention+(1-retention)*overhead+(b.previous[i]===3?.012:0);if(b.samples[i]>keep){b.previous[i]=4;return}}
    b.previous[i]=near?1:lod==='far'?2:3;
    const m=b[lod];m.instanceMatrix.array.set(b.matrices.subarray(i*16,i*16+16),m.count*16);m.userData.plants.push(p);m.count++;stats.drawn++;
   });
   for(const lod of ['near','far','horizon']){const m=b[lod];if(m.count){m.instanceMatrix.needsUpdate=true;m.computeBoundingBox();m.computeBoundingSphere();m.boundingSphere.radius+=.7;m.boundingBox.expandByScalar(.7)}}
  }recount();return true;
 }
 function pick(raycaster){
  // CPU picking evaluates the same poses only for ray-adjacent candidates.
  // Rendering stays on the GPU; a closed flower must not retain its Full hitbox.
  const candidates=[],matrix=new T.Matrix4(),bounds=new T.Sphere();group.updateMatrixWorld(true);
  for(const m of meshes)if(m.visible)for(let i=0;i<m.count;i++){
   m.getMatrixAt(i,matrix);matrix.premultiply(m.matrixWorld);bounds.copy(m.geometry.boundingSphere).applyMatrix4(matrix);
   if(raycaster.ray.intersectsSphere(bounds))candidates.push({mesh:m,index:i,matrix:matrix.clone(),lower:Math.max(0,raycaster.ray.origin.distanceTo(bounds.center)-bounds.radius)});
  }
  candidates.sort((a,b)=>a.lower-b.lower);let best=null;
  for(const c of candidates){if(best&&c.lower>best.distance)break;const original=c.mesh.geometry,plant=c.mesh.userData.plants[c.index];let geometry=pickCache.get(original);
   if(!geometry){geometry=new T.BufferGeometry();geometry.setIndex(original.index);geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(original.attributes.position.array.length),3));geometry.boundingSphere=original.boundingSphere.clone();for(const name of ['normal','uv'])if(original.attributes[name])geometry.setAttribute(name,original.attributes[name]);pickCache.set(original,geometry)}
   const attrs=original.attributes,out=geometry.attributes.position;
   for(let i=0;i<out.count;i++){const read=a=>[a.getX(i),a.getY(i),a.getZ(i)],full=read(attrs.position),p=wind.deformPoint(full,attrs.positionBud?read(attrs.positionBud):full,attrs.positionHalf?read(attrs.positionHalf):full,plant);out.setXYZ(i,...p)}
   const proxy=new T.Mesh(geometry,c.mesh.material);proxy.matrixWorld.copy(c.matrix);const hits=[];proxy.raycast(raycaster,hits);
   for(const hit of hits)if(!best||hit.distance<best.distance)best={...hit,object:c.mesh,instanceId:c.index};
  }return best;
 }
 return {group,stats,update,pick,setLayer(layer,value){enabled[layer]=value;recount()},dispose};
}
const api={instantiate,horizonPlants,distanceRetention};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MeadowCycleField=api;
})(typeof globalThis!=='undefined'?globalThis:this);
