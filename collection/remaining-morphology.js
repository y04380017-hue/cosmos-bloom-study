(function(root){
'use strict';
// Optional structures for the remaining reference set. These do not run on the accepted 34.
const TAU=Math.PI*2,smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
function profile(r,t,u,morph={}){
 const edge=smooth((t-.64)/.36),blade=Math.max(0,(t-(r.claw||.32))/(1-(r.claw||.32)));
 if(r.profile==='lanceolate')return {width:r.width*Math.pow(Math.sin(Math.PI*t),.85),trim:edge*.06*u*u};
 if(r.profile==='obovate')return {width:r.width*Math.pow(Math.sin(Math.PI*t*.96),.46)*(.35+.65*t),trim:edge*r.width*.18*u*u};
 if(r.profile==='clawed')return {width:r.width*(.025+.975*Math.pow(Math.sin(blade*Math.PI*.96),.52)),trim:edge*r.width*.15*u*u};
 if(r.profile==='heart')return {width:r.width*Math.pow(Math.sin(Math.PI*t*.94),.48),trim:edge*(.13*Math.exp(-u*u*38)+.17*u*u)};
 if(r.profile==='trilobe'){
  const nearest=Math.min(Math.abs(u+.69),Math.abs(u),Math.abs(u-.69));
  const cleft=(morph.lobeDepth||.76)*Math.exp(-Math.pow((Math.abs(u)-.345)/.095,2));
  return {width:.012+r.width*Math.pow(t,.90),trim:smooth((t-.30)/.70)*(cleft+.15*Math.pow(nearest/.345,2)+.12*Math.pow(Math.abs(u),8))};
 }
 return null;
}
function materialGroups(g,reverse,claw){
 const old=Array.from(g.index.array),cells=g.userData.N*g.userData.W,buckets=[[],[],[]];
 for(let i=0;i<cells;i++){const isClaw=claw&&Math.floor(i/g.userData.W)/g.userData.N<claw;
  buckets[isClaw?2:0].push(...old.slice(i*12,i*12+6));buckets[isClaw?2:reverse?1:0].push(...old.slice(i*12+6,i*12+12))}
 buckets[reverse?1:0].push(...old.slice(cells*12));g.setIndex(buckets.flat());g.clearGroups();let offset=0;
 for(let i=0;i<buckets.length;i++)if(buckets[i].length){g.addGroup(offset,buckets[i].length,i);offset+=buckets[i].length}
}
function passionCenter(T,c,maps){
 const g=new T.Group();g.name='reproductive-center';
 const add=(geo,color,name)=>{geo.computeVertexNormals();const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.66,metalness:0,bumpMap:maps.centerBump,bumpScale:.006}));m.name=name;m.castShadow=true;m.receiveShadow=true;g.add(m);return m};
 const base=add(new T.SphereGeometry(.31,24,12),'#b8c89b','passion-receptacle');base.scale.y=.30;base.position.y=.08;
 const corona=new T.Group();corona.name='filament-corona';g.add(corona);
 const observed=c.morphology.corona||{},count=observed.count||84;
 const bands=[{r0:.27,r1:.56,color:observed.rootColor||'#382454'},{r0:.56,r1:.79,color:observed.midColor||'#e7e4ed'},{r0:.79,r1:observed.radius||1.12,color:observed.tipColor||'#7b72b8'}],obj=new T.Object3D(),up=new T.Vector3(0,1,0);
 for(const [k,b] of bands.entries()){
  const m=new T.InstancedMesh(new T.CylinderGeometry(.009,.011,1,5),new T.MeshStandardMaterial({color:b.color,roughness:.7}),count);m.name='corona-band-'+k;m.castShadow=true;corona.add(m);
  for(let i=0;i<count;i++){
   const a=i*TAU/count,end=b.r1*(1+.045*Math.sin(i*2.4)),s=new T.Vector3(b.r0*Math.cos(a),.14+.13*b.r0, b.r0*Math.sin(a)),e=new T.Vector3(end*Math.cos(a+.012),.14+.13*end+.017*Math.sin(i*2),end*Math.sin(a+.012));
   obj.position.copy(s).lerp(e,.5);obj.scale.set(1,s.distanceTo(e),1);obj.quaternion.setFromUnitVectors(up,e.clone().sub(s).normalize());obj.updateMatrix();m.setMatrixAt(i,obj.matrix);
  }
 }
 const stalk=add(new T.CylinderGeometry(.042,.063,.62,12),'#aabd80','raised-gynophore');stalk.position.y=.41;
 const ovary=add(new T.SphereGeometry(.105,14,10),'#c4ce80','passion-ovary');ovary.position.y=.80;ovary.scale.y=1.3;
 const anthers=new T.InstancedMesh(new T.SphereGeometry(1,12,7),new T.MeshStandardMaterial({color:'#c1ba61',roughness:.75}),5);anthers.name='passion-anthers';g.add(anthers);
 for(let i=0;i<5;i++){const a=i*TAU/5;obj.position.set(.25*Math.cos(a),.74,.25*Math.sin(a));obj.scale.set(.11,.035,.06);obj.rotation.set(0,-a,0);obj.updateMatrix();anthers.setMatrixAt(i,obj.matrix);const arm=add(new T.CylinderGeometry(.013,.017,.26,8),'#b8c98a','anther-arm');arm.rotation.z=Math.PI/2;arm.rotation.y=-a;arm.position.set(.12*Math.cos(a),.73,.12*Math.sin(a))}
 const stigmas=new T.InstancedMesh(new T.SphereGeometry(.045,10,7),new T.MeshStandardMaterial({color:'#a58a65',roughness:.8}),3);stigmas.name='passion-stigmas';g.add(stigmas);
 for(let i=0;i<3;i++){const a=i*TAU/3+.35,s=new T.Vector3(0,.87,0),e=new T.Vector3(.21*Math.cos(a),1.04,.21*Math.sin(a));const branch=add(new T.CylinderGeometry(.019,.026,s.distanceTo(e),8),'#bec88b','passion-style');branch.position.copy(s).lerp(e,.5);branch.quaternion.setFromUnitVectors(up,e.clone().sub(s).normalize());obj.position.copy(e);obj.quaternion.identity();obj.scale.set(1.25,.65,1);obj.updateMatrix();stigmas.setMatrixAt(i,obj.matrix)}
 return g;
}
function addHead(T,Surface,head,c,maps){
 const data={};
 if(c.sourceId==='234'){
  const N=14,W=80,g=Surface.shell(T,N,W,.016),p=g.attributes.position.array;
  for(let j=0;j<=N;j++)for(let k=0;k<=W;k++){const t=j/N,a=k/W*TAU,r=.035+.40*t*t,o=(j*(W+1)+k)*3;p[o]=r*Math.cos(a);p[o+1]=-.16+.24*t+.015*t*t*Math.cos(a*5);p[o+2]=r*Math.sin(a)}
  Surface.finishShell(g);const m=new T.Mesh(g,maps.petals[0]);m.name='fused-corolla';m.castShadow=true;m.receiveShadow=true;head.add(m);data.corolla=m;
  const b=c.bud,bg=new T.SphereGeometry(1,40,28),pos=bg.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),crease=1+.045*Math.cos(5*Math.atan2(z,x));pos.setXYZ(i,x*b.radius*1.25*crease,pos.getY(i)*b.height*.56+b.height*.5,z*b.radius*1.25*crease)}
  bg.computeVertexNormals();const bm=maps.petals[0].clone();bm.transparent=true;const balloon=new T.Mesh(bg,bm);balloon.name='balloon-bud';balloon.castShadow=true;head.add(balloon);data.balloon=balloon;
 }
 const morph=c.morphology||{},length=morph.tubeLength||morph.corollaTube;
 if(typeof length==='number'){
  const tube=new T.Mesh(new T.CylinderGeometry(.065,.035,length,16,1,true),morph.tubeColor?new T.MeshStandardMaterial({color:morph.tubeColor,roughness:.72,side:T.DoubleSide}):maps.petals[0].clone());tube.material.side=T.DoubleSide;tube.position.y=-length/2+.025;tube.name='corolla-tube';tube.castShadow=true;head.add(tube);
 }
 return data;
}
function updateHead(data,p){if(data.corolla){const s=.12+.88*smooth(p);data.corolla.scale.set(s,.45+.55*smooth(p),s)}if(data.balloon){const opacity=1-smooth(p/.4);data.balloon.material.opacity=opacity;data.balloon.visible=opacity>.005;data.balloon.material.depthWrite=opacity>.99}}
function decorateCenter(T,c,g){
 const morph=c.morphology||{},white=morph.whiteFilamentPetaloids,florets=morph.diskFloretRing;
 if(morph.outerLongStamens){
  const mat=new T.MeshStandardMaterial({color:morph.outerStamenColor||'#c88a68',roughness:.75}),antherMat=new T.MeshStandardMaterial({color:c.center.tip,roughness:.72});
  for(let i=0;i<morph.outerLongStamens;i++){const a=i*TAU/morph.outerLongStamens,r=c.center.radius*1.1,h=morph.outerStamenHeight||.8,tip=new T.Vector3(r*1.6*Math.cos(a),h,r*1.6*Math.sin(a));
   const path=new T.CatmullRomCurve3([new T.Vector3(r*Math.cos(a),.02,r*Math.sin(a)),new T.Vector3(r*1.1*Math.cos(a),h*.65,r*1.1*Math.sin(a)),tip]);const m=new T.Mesh(new T.TubeGeometry(path,10,.006,5,false),mat);m.name='outer-long-stamen';g.add(m);const anther=new T.Mesh(new T.SphereGeometry(.022,7,5),antherMat);anther.position.copy(tip);anther.scale.y=1.65;g.add(anther);
  }
 }
 if(white||florets){
  const cfg=white||florets,count=cfg.count,mat=new T.MeshStandardMaterial({color:cfg.color,roughness:.72});
  for(let i=0;i<count;i++){const a=i*TAU/count,start=white?.15:cfg.radius,end=white?start+cfg.length:start+.045;
   const base=white?.08:(c.center.domeHeight||.075)+c.center.height*.65;
   const points=[new T.Vector3(start*Math.cos(a),base,start*Math.sin(a)),new T.Vector3((start+end)*.5*Math.cos(a),white?.26:base+.075,(start+end)*.5*Math.sin(a)),new T.Vector3(end*Math.cos(a),white?.19:base+.06,end*Math.sin(a))];
   const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),9,white?.008:.014,5,false),mat);m.name=white?'white-inner-filament':'yellow-disk-floret';m.castShadow=true;g.add(m);
  }
 }
}
const api={profile,materialGroups,passionCenter,addHead,updateHead,decorateCenter};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RemainingMorphology=api;
})(typeof globalThis!=='undefined'?globalThis:this);
