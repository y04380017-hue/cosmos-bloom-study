/* Reusable leaf and seed-head meshes. All plants share the meadow wind clock. */
(function(root){
'use strict';
function create(T,layout,wind){
 const group=new T.Group(),rng=FlowerScatter.seeded(layout.seed+'/understory'),dummy=new T.Object3D();
 function geometry(kind){
  const pos=[],colors=[],indices=[];
  function leaf(a,length,height,span,hex,tip){
   const k=pos.length/3,dx=Math.cos(a),dz=Math.sin(a),along=(d,h,w)=>pos.push(dx*d-dz*w,h,dz*d+dx*w);
   along(0,0,0);along(length*.45,height*.61,span);along(length*.45,height*.73,0);along(length*.45,height*.61,-span);along(length,height,0);
   const c=new T.Color(hex),t=new T.Color(tip);
   colors.push(...c.toArray(),...c.clone().lerp(t,.48).toArray(),...t.toArray(),...c.toArray(),...t.toArray());
   indices.push(k,k+1,k+2,k,k+2,k+3,k+1,k+4,k+2,k+2,k+4,k+3);
  }
  const n=kind==='grass'?8:kind==='clover'?6:7;
  for(let i=0;i<n;i++){
   const a=i*2.4+rng()*.27;
   if(kind==='grass')leaf(a,.10+rng()*.11,.65+rng()*.35,.017,'#9fc27f','#dce998');
   else if(kind==='seed')leaf(a,.055,.91+rng()*.09,.024,'#9fb876','#e4d69a');
   else if(kind==='clover')leaf(a,.52+rng()*.35,.25+rng()*.19,.21,'#a0c786','#cce09a');
   else leaf(a,.57+rng()*.36,.28+rng()*.31,.15,'#91b67e','#c9dd92');
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 function batch(kind,items){
  if(!items.length)return;
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.95,side:T.DoubleSide});
  wind.attach(material,{foliage:true});const mesh=new T.InstancedMesh(geometry(kind),material,items.length);mesh.name='understory/'+kind;
  items.forEach(([x,z,height,angle],i)=>{dummy.position.set(x,FlowerScatter.terrainHeight(x,z)-.008,z);dummy.rotation.set(0,angle,0);dummy.scale.setScalar(height);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});
  mesh.computeBoundingSphere();group.add(mesh);
 }
 const grass=[],seeds=[],clover=[];
 batch('rosette',layout.plants.map(p=>[p.x,p.z,.09+p.scale*.13,p.rotationY]));
 for(const c of layout.clumps){
  for(let i=0;i<3;i++){
   const a=rng()*6.283,r=.23+rng()*.43,x=c.x+r*Math.cos(a),z=c.z+r*Math.sin(a),h=.25+rng()*.25;
   grass.push([x,z,h,a]);if(i===0&&rng()<.17)seeds.push([x,z,h*1.08,a]);
  }
 }
 for(let i=0;i<17000;i++){const near=i<4300,x=near?-40+(rng()-.5)*33:(rng()-.5)*layout.width,z=near?91+(rng()-.5)*30:(rng()-.5)*layout.depth;clover.push([x,z,.09+rng()*.13,rng()*6.283]);if(i%2===0)grass.push([x,z,.17+rng()*.19,rng()*6.283])}
 batch('grass',grass);batch('seed',seeds);batch('clover',clover);
 return {group,dispose(){for(const m of group.children){m.geometry.dispose();m.material.dispose();m.dispose()}}};
}
root.MeadowUnderstory={create};
})(typeof globalThis!=='undefined'?globalThis:this);
