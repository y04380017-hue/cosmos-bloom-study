(function(root){
'use strict';
// The display timeline begins with exposed, slightly parted petals.
// Keep the approved half-open and fully open geometry at 50% and 100%.
function pose(progress){
 const p=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
 return p<.5?.25+.5*p:p;
}
function reveal(group){
 group.traverse(part=>{
  if(part.name==='bud-cover'||part.name==='cosmos-bract'||part.name==='balloon-bud')part.visible=false;
 });
}
const api={pose,reveal};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BloomPlayback=api;
})(typeof globalThis!=='undefined'?globalThis:this);

(function(root){
'use strict';
// A closed, deformable thin shell. The first grid is the upper petal surface;
// the second is the lower surface. Every boundary is bridged, including the tip.
function shell(T,N,W,thickness){
 const count=(N+1)*(W+1),g=new T.BufferGeometry(),idx=[],uv=new Float32Array(count*4);
 for(let j=0;j<=N;j++)for(let k=0;k<=W;k++){
  const a=j*(W+1)+k;for(const off of [0,count]){uv[(a+off)*2]=k/W;uv[(a+off)*2+1]=j/N}
  if(j<N&&k<W){const b=a+1,d=a+W+1,e=d+1;idx.push(a,b,d,b,e,d,a+count,d+count,b+count,b+count,d+count,e+count)}
 }
 // Directed boundary of the top mesh; reverse each edge on the wall.
 const boundary=[];
 for(let k=0;k<W;k++)boundary.push([k,k+1]);
 for(let j=0;j<N;j++)boundary.push([j*(W+1)+W,(j+1)*(W+1)+W]);
 for(let k=W;k>0;k--)boundary.push([N*(W+1)+k,N*(W+1)+k-1]);
 for(let j=N;j>0;j--)boundary.push([j*(W+1),(j-1)*(W+1)]);
 for(const [a,b] of boundary)idx.push(b,a,a+count,b,a+count,b+count);
 g.setAttribute('position',new T.BufferAttribute(new Float32Array(count*6),3).setUsage(T.DynamicDrawUsage));
 g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);
 g.userData={shell:true,N,W,topCount:count,thickness,mid:new Float32Array(count*3)};
 return g;
}
function finishShell(g){
 const {N,W,topCount:C,thickness,mid}=g.userData,p=g.attributes.position.array;
 mid.set(p.subarray(0,C*3));
 for(let j=0;j<=N;j++)for(let k=0;k<=W;k++){
  const id=j*(W+1)+k,o=id*3;
  const l=(j*(W+1)+Math.max(0,k-1))*3,r=(j*(W+1)+Math.min(W,k+1))*3;
  const b=(Math.max(0,j-1)*(W+1)+k)*3,f=(Math.min(N,j+1)*(W+1)+k)*3;
  const ux=mid[r]-mid[l],uy=mid[r+1]-mid[l+1],uz=mid[r+2]-mid[l+2],tx=mid[f]-mid[b],ty=mid[f+1]-mid[b+1],tz=mid[f+2]-mid[b+2];
  let nx=uy*tz-uz*ty,ny=uz*tx-ux*tz,nz=ux*ty-uy*tx,len=Math.hypot(nx,ny,nz);
  if(len<1e-10){nx=0;ny=1;nz=0;len=1}
  const h=thickness*(.68+.32*Math.sin(j/N*Math.PI))*.5/len;
  p[o]=mid[o]+nx*h;p[o+1]=mid[o+1]+ny*h;p[o+2]=mid[o+2]+nz*h;
  p[o+C*3]=mid[o]-nx*h;p[o+C*3+1]=mid[o+1]-ny*h;p[o+C*3+2]=mid[o+2]-nz*h;
 }
 g.attributes.position.needsUpdate=true;g.computeVertexNormals();
}
function decode(s){
 const binary=typeof atob==='function'?atob(s):Buffer.from(s,'base64').toString('binary');
 return Uint8Array.from(binary,x=>x.charCodeAt(0));
}
function texture(T,data,key,srgb){
 const tex=new T.DataTexture(decode(data[key]),data.width,data.height,T.RGBAFormat);
 tex.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;tex.flipY=false;
 tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;
 tex.wrapS=tex.wrapT=T.ClampToEdgeWrapping;tex.anisotropy=4;tex.needsUpdate=true;
 tex.name=data.source+' / '+key;return tex;
}
function materials(T,c){
 if(!c.surfaceMaps)throw new Error('Missing source-photo maps for '+c.slug);
 const maps=c.surfaceMaps,petals=maps.petals.map((data,i)=>{
  const map=texture(T,data,'rgba',true),bump=texture(T,data,'heightRgba',false);
  return new T.MeshPhysicalMaterial({color:0xffffff,map,bumpMap:bump,bumpScale:maps.bumpScale,
   roughness:maps.roughness,metalness:0,clearcoat:.055,clearcoatRoughness:.55,
   // Small mapped fill preserves pigment in shadow without flattening lighting.
   emissive:0xffffff,emissiveMap:map,emissiveIntensity:.018,side:T.FrontSide});
 });
 const centerMap=texture(T,maps.center,'rgba',true),centerBump=texture(T,maps.center,'heightRgba',false);
 return {petals,centerMap,centerBump};
}
const api={shell,finishShell,materials};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PetalSurface=api;
})(typeof globalThis!=='undefined'?globalThis:this);

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

(function(root){
'use strict';
const Remaining=typeof module!=='undefined'&&module.exports?require('./remaining-morphology.js'):root.RemainingMorphology;
const Surface=typeof module!=='undefined'&&module.exports?require('./petal-surface.js'):root.PetalSurface;
// Reference-guided geometry; hidden structures and the motion path are inferred.
function createFlowerStudy(T,c){
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,smooth=v=>{v=clamp(v);return v*v*(3-2*v)},TAU=Math.PI*2;
 const group=new T.Group();group.name=c.slug;const heads=[],stemMat=new T.MeshStandardMaterial({color:c.layout==='spiraea'?0x77543b:0x56733c,roughness:.93});
 const greenMat=new T.MeshStandardMaterial({color:c.leaf==='grayoval'?0x829379:0x5b783d,roughness:.95,side:T.DoubleSide});
 const photoMaterials=Surface.materials(T,c);
 const curvature=c.curvature||{},isRemaining=c.batch==='remaining49';
 const N=c.meshSegments?.[0]||(c.layout==='spiraea'?14:c.layout==='phlox'?18:28),W=c.meshSegments?.[1]||(c.layout==='spiraea'?16:c.layout==='phlox'?24:32);
 const SN=c.layout==='spiraea'?9:18,SW=c.layout==='spiraea'?8:12;
 function mesh(geo,mat,parent=group,name=''){geo.computeVertexNormals();const m=new T.Mesh(geo,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function stem(points,radius,parent=group){const cr=new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a)));return mesh(new T.TubeGeometry(cr,24,radius,7,false),stemMat,parent,'stem')}
 function leaf(start,angle,length,width,serrate=false){
  const vertices=[],idx=[],L=22,K=10;
  for(let j=0;j<=L;j++){const t=j/L;const teeth=serrate?1-.10*(.5+.5*Math.cos(t*18*Math.PI)):1;const w=width*Math.pow(Math.sin(t*Math.PI),.8)*teeth;
   for(let k=0;k<=K;k++){const u=k/K*2-1,r=t*length,y=start[1]+.27*t+.07*Math.sin(t*Math.PI)+.035*u*u*Math.sin(t*Math.PI);vertices.push(start[0]+r*Math.cos(angle)-w*u*Math.sin(angle),y,start[2]+r*Math.sin(angle)+w*u*Math.cos(angle));if(j<L&&k<K){let a=j*(K+1)+k;idx.push(a,a+1,a+K+1,a+1,a+K+2,a+K+1)}}
  }const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(idx);mesh(g,greenMat,group,'leaf');
 }
 function foliage(){
  if(c.leaf==='none')return;
  if(['palmate','compound','trifoliate','filigree','spiny'].includes(c.leaf)){
   for(let i=0;i<3;i++){
    const y=.62+i*.47,a=.4+i*2.15,tip=[Math.cos(a)*.60,y+.23,Math.sin(a)*.60];
    stem([[0,y,0],tip],.008);
    if(c.leaf==='palmate')for(let j=-2;j<=2;j++)leaf(tip,a+j*.39,.72-Math.abs(j)*.09,.115);
    else if(c.leaf==='trifoliate')for(let j=-1;j<=1;j++)leaf(tip,a+j*1.05,.46,.22);
    else if(c.leaf==='compound'){
     leaf(tip,a,.46,.15,true);for(let j=1;j<=3;j++)for(const s of [-1,1])leaf([tip[0]*j/4,y+.23*j/4,tip[2]*j/4],a+s*.88,.40,.13,true);
    }else if(c.leaf==='filigree')for(let j=1;j<7;j++)for(const s of [-1,1]){
     const p=[tip[0]*j/7,y+.23*j/7,tip[2]*j/7],b=a+s*.8;
     leaf(p,b,.47,.018);for(let k=1;k<4;k++)leaf([p[0]+Math.cos(b)*k*.1,p[1]+k*.04,p[2]+Math.sin(b)*k*.1],b+s*.6,.22,.009);
    }else{leaf([0,y,0],a,1.02,.22,true);for(let j=1;j<5;j++)for(const s of [-1,1])leaf([Math.cos(a)*j*.18,y+j*.06,Math.sin(a)*j*.18],a+s*.85,.25,.035)}
   }return;
  }
  for(let i=0;i<3;i++){const y=.65+i*.46,a=.45+i*2.2;
   if(c.leaf==='divided'){stem([[0,y,0],[Math.cos(a)*.4,y+.15,Math.sin(a)*.4],[Math.cos(a)*.8,y+.25,Math.sin(a)*.8]],.009);for(let j=1;j<6;j++)for(const s of [-1,1]){const t=j/6;leaf([Math.cos(a)*.8*t,y+.25*t,Math.sin(a)*.8*t],a+s*.8,.35*(1-.5*t),.025)}}
   else{const narrow=['grass','linear'].includes(c.leaf);leaf([0,y,0],a,narrow?.82:1.02,narrow?.035:c.leaf==='lance'?.19:.30,c.leaf==='serrate');if(c.leaf==='grass'||c.leaf==='grayoval')leaf([0,y,0],a+Math.PI,.75,narrow?.03:.23)}
  }
 }
 function surface(parent,ring,i,layer){
  const thickness=c.layout==='spiraea'?.014:c.layout==='phlox'?.016:.018;
  const g=Surface.shell(T,N,W,thickness);
  const bladeVariants=photoMaterials.petals.map((_,j)=>j).filter(j=>!isRemaining||j!==ring.clawMaterialIndex);
  const variant=Number.isInteger(ring.materialIndex)?ring.materialIndex:c.slug==='calendula'?(layer===0?1:0):bladeVariants[i%bladeVariants.length];
  const reverse=isRemaining&&Number.isInteger(c.reverseMaterialIndex),claw=isRemaining&&Number.isInteger(ring.clawMaterialIndex);if(reverse||claw)Remaining.materialGroups(g,reverse,claw?(ring.claw||.32):0);
  const m=mesh(g,reverse||claw?[photoMaterials.petals[variant],photoMaterials.petals[reverse?c.reverseMaterialIndex:variant],photoMaterials.petals[claw?ring.clawMaterialIndex:variant]]:photoMaterials.petals[variant],parent,'petal');m.frustumCulled=false;m.userData={ring,i,layer};return m;
 }
 function center(head){
  if(isRemaining&&c.morphology?.passionflower){const g=Remaining.passionCenter(T,c,photoMaterials);head.add(g);return g}
  const cfg=c.center,g=new T.Group();g.name=cfg.type==='disk'?'disk-center':'reproductive-center';head.add(g);
  const mat=new T.MeshStandardMaterial({color:cfg.color,roughness:.72,metalness:0,bumpMap:photoMaterials.centerBump,bumpScale:.009}),tipMat=new T.MeshStandardMaterial({color:cfg.tip,roughness:.63,metalness:0,bumpMap:photoMaterials.centerBump,bumpScale:.005});
  const count=cfg.count,obj=new T.Object3D();
  if(cfg.type==='column'){
   const column=mesh(new T.CylinderGeometry(.042,.066,cfg.height,18),mat,g,'staminal-column');column.position.y=cfg.height*.5;
   for(let i=0;i<cfg.count;i++){
    const a=i*2.3999632,y=isRemaining?.10+Math.max(.08,cfg.height-.13)*(i/cfg.count):.22+.42*(i/cfg.count);
    const dot=mesh(new T.SphereGeometry(.019,6,5),new T.MeshStandardMaterial({color:0xe1c555,roughness:.7}),g,'column-anther');dot.position.set(.066*Math.cos(a),y,.066*Math.sin(a));
   }
   for(let i=0;i<5;i++){
    const a=i*TAU/5,st=new T.Vector3(0,cfg.height-.09,0),end=new T.Vector3(.105*Math.cos(a),cfg.height+.035,.105*Math.sin(a));
    const branch=mesh(new T.CylinderGeometry(.012,.016,st.distanceTo(end),8),mat,g,'style-branch');branch.position.copy(st).lerp(end,.5);branch.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.clone().sub(st).normalize());
    const tip=mesh(new T.SphereGeometry(.038,10,7),tipMat,g,'stigma-lobe');tip.position.copy(end);
   }
  }else if(cfg.type==='disk'){
   const core=mesh(new T.SphereGeometry(cfg.radius,24,12),new T.MeshStandardMaterial({color:0xffffff,map:photoMaterials.centerMap,bumpMap:photoMaterials.centerBump,bumpScale:.014,roughness:.68,metalness:0}),g,'disk-core');core.scale.y=isRemaining&&cfg.domeHeight?cfg.domeHeight/cfg.radius:.35;
   const tubes=new T.InstancedMesh(new T.CylinderGeometry(.017,.011,cfg.height,5,1,true),mat,count);
   const ends=new T.InstancedMesh(new T.TorusGeometry(.017,.005,4,5),tipMat,count);const col=new T.Color();
   for(let i=0;i<count;i++){
    const r=cfg.radius*.92*Math.sqrt((i+.5)/count),a=i*2.3999632,y=.04+(isRemaining?(cfg.domeHeight||.075):.075)*Math.sqrt(clamp(1-r*r/(cfg.radius*cfg.radius)));
    obj.position.set(r*Math.cos(a),y+cfg.height*.4,r*Math.sin(a));obj.rotation.set(.16*Math.sin(a),a,.16*Math.cos(a));obj.updateMatrix();tubes.setMatrixAt(i,obj.matrix);
    obj.position.y+=cfg.height*.5;obj.rotation.x+=Math.PI/2;obj.updateMatrix();ends.setMatrixAt(i,obj.matrix);
    if(c.slug==='blanket-flower'){col.set(r<cfg.radius*.46?0xd6ac28:0x8d1b2d);tubes.setColorAt(i,col);col.set(r<cfg.radius*.46?0x682126:0xe7b01a);ends.setColorAt(i,col)}
   }tubes.castShadow=true;g.add(tubes,ends);
  }else if(cfg.type==='throat'){
   const throat=mesh(new T.CylinderGeometry(.068,.045,.075,16),mat,g,'floral-throat');throat.position.y=-.035;
   for(let i=0;i<5;i++){const a=i*TAU/5;const tiny=mesh(new T.SphereGeometry(.012,6,4),tipMat,g,'small-anther');tiny.position.set(Math.cos(a)*.032,.01,Math.sin(a)*.032)}
  }else{
   const stamens=new T.InstancedMesh(new T.CylinderGeometry(.004,.006,1,5),mat,count);
   const anthers=new T.InstancedMesh(new T.SphereGeometry(.017,6,5),tipMat,count);
   for(let i=0;i<count;i++){
    const a=i*2.3999632,r=cfg.radius*(cfg.filled?.98*Math.sqrt((i+.5)/count):.48+.50*Math.sqrt((i+.5)/count)),len=cfg.height*(.70+.30*(.5+.5*Math.sin(i*2.1)));
    const start=new T.Vector3(Math.cos(a)*r*.65,.01,Math.sin(a)*r*.65),end=new T.Vector3(Math.cos(a)*r*1.45,len,Math.sin(a)*r*1.45);
    obj.position.copy(start).lerp(end,.5);obj.scale.set(1,start.distanceTo(end),1);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.clone().sub(start).normalize());obj.updateMatrix();stamens.setMatrixAt(i,obj.matrix);
    obj.position.copy(end);obj.quaternion.identity();obj.scale.set(.80,isRemaining&&c.morphology?.antherShape==='elongated'?2.5:1.30,.80);obj.updateMatrix();anthers.setMatrixAt(i,obj.matrix);
   }g.add(stamens,anthers);
   if(cfg.type==='poppy'){
    const stigmaMat=new T.MeshStandardMaterial({color:0xadc85d,roughness:.93});const cap=mesh(new T.CylinderGeometry(.125,.115,.105,10),stigmaMat,g,'stigma-cap');cap.position.y=.20;
    for(let i=0;i<10;i++){const a=i*TAU/10;const ridge=mesh(new T.CylinderGeometry(.007,.006,.115,4),new T.MeshStandardMaterial({color:0xd4de8c,roughness:1}),g,'stigma-ridge');ridge.position.set(Math.cos(a)*.057,.257,Math.sin(a)*.057);ridge.rotation.z=Math.PI/2;ridge.rotation.y=-a}
   }else if(cfg.green){const core=mesh(new T.SphereGeometry(cfg.radius*.38,12,8),new T.MeshStandardMaterial({color:0xa5b965,roughness:.95}),g,'pistil');core.scale.y=.65;core.position.y=.035}
  }
  const morph=c.morphology||{};
  if(morph.darkThroat){const dark=mesh(new T.SphereGeometry(.27,24,12),new T.MeshStandardMaterial({color:morph.darkThroat,roughness:.8}),g,'dark-throat');dark.scale.y=.17;dark.position.y=.015}
  if(morph.crossStigma||morph.style){
   const height=morph.styleHeight||.28,styleMat=new T.MeshStandardMaterial({color:morph.styleColor||0xd9dfad,roughness:.75});
   const style=mesh(new T.CylinderGeometry(.010,.015,height,8),styleMat,g,'projecting-style');style.position.y=height/2;
   if(morph.crossStigma){const cross=new T.Group();cross.name='cross-stigma';g.add(cross);for(let i=0;i<4;i++){
    const a=i*TAU/4,curve=new T.CatmullRomCurve3([new T.Vector3(0,height,0),new T.Vector3(.09*Math.cos(a),height+.025,.09*Math.sin(a)),new T.Vector3(.21*Math.cos(a),height+.015,.21*Math.sin(a))]);mesh(new T.TubeGeometry(curve,12,.015,6,false),styleMat,cross,'stigma-arm');
   }}
  }
  if(morph.stigmaColor){const p=mesh(new T.SphereGeometry(.073,10,7),new T.MeshStandardMaterial({color:morph.stigmaColor,roughness:.83}),g,'central-stigma');p.position.y=cfg.height+.02;p.scale.set(1,.8,1)}
  if(morph.carpels)for(let i=0;i<morph.carpels;i++){
   const a=i*TAU/morph.carpels,p=mesh(new T.SphereGeometry(.045,10,8),new T.MeshStandardMaterial({color:0xa8bc78,roughness:.8}),g,'carpel');p.scale.set(1,2.3,1);p.position.set(.065*Math.cos(a),.18,.065*Math.sin(a));
  }
  if(morph.nectaries)for(let i=0;i<10;i++){
   const a=i*TAU/10,nectar=mesh(new T.CylinderGeometry(.032,.018,.09,8,1,true),new T.MeshStandardMaterial({color:0xb2c179,roughness:.8,side:T.DoubleSide}),g,'nectary');nectar.position.set(.18*Math.cos(a),.07,.18*Math.sin(a));
  }
  if(isRemaining)Remaining.decorateCenter(T,c,g);
  return g;
 }
 function createHead(position,scale=1,tilt=[0,0],delay=0){
  const h=new T.Group();h.position.set(...position);h.scale.setScalar(scale);h.rotation.x=tilt[0];h.rotation.z=tilt[1];group.add(h);
  const petals=[],sepals=[];c.rings.forEach((r,l)=>{for(let i=0;i<r.count;i++)petals.push(surface(h,r,i,l))});
  const bmat=isRemaining&&c.bud.petalColored?photoMaterials.petals[0].clone():greenMat.clone();if(c.bud.shed){bmat.transparent=true;bmat.depthWrite=false}
  for(let i=0;i<c.bud.count;i++){
   const n=SN,w=SW,arr=new Float32Array((n+1)*(w+1)*3),idx=[];
   for(let j=0;j<n;j++)for(let k=0;k<w;k++){const a=j*(w+1)+k;idx.push(a,a+1,a+w+1,a+1,a+w+2,a+w+1)}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(arr,3).setUsage(T.DynamicDrawUsage));g.setIndex(idx);if(isRemaining&&c.bud.petalColored){const uv=[];for(let j=0;j<=n;j++)for(let k=0;k<=w;k++)uv.push(k/w,j/n);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2))}const m=mesh(g,bmat,h,'bud-cover');m.frustumCulled=false;sepals.push(m);
  }
  if(c.bud.type==='tube'){
   const len=c.slug==='carnation'?.68:.38;
   const tube=mesh(new T.CylinderGeometry(.10,.07,len,20,1,true),c.slug==='phlox'?new T.MeshStandardMaterial({color:0xca6aa8,roughness:.85,side:T.DoubleSide}):greenMat,h,'floral-tube');tube.position.y=-len*.5;
   const calyx=mesh(new T.CylinderGeometry(.075,.055,.25,10),greenMat,h,'calyx-tube');calyx.position.y=-len-.025;
  }
  const receptacle=mesh(new T.SphereGeometry(Math.max(.12,c.center.radius*.82),20,10),greenMat,h,'receptacle');receptacle.scale.y=.42;receptacle.position.y=-.06;
  const central=center(h);const data={group:h,petals,sepals,center:central,budMaterial:bmat,delay,scale};if(isRemaining)data.extra=Remaining.addHead(T,Surface,h,c,photoMaterials);heads.push(data);return data;
 }
 if(c.heads){
  c.heads.forEach((h,i)=>{const p=h.position;stem([[0,0,0],[p[0]*.22,1.15,p[2]*.2],[p[0]*.7,p[1]-.55,p[2]*.7],p],i===0?.024:.014);createHead(p,h.scale,h.tilt,h.delay||0)});foliage();
 }else if(c.layout==='single'){
  stem([[0,0,0],[-.06,1,0],[.04,2.1,-.04],[0,2.85,0]],.024);createHead([0,2.85,0],1,[0,-.05]);foliage();
 }else if(c.layout==='flax'){
  stem([[0,0,0],[.08,1.6,0],[0,2.7,0]],.018);createHead([0,2.7,.15],.82,[.08,.12]);
  stem([[.02,1.4,0],[.75,2.4,-.25],[1.10,3.35,-.3]],.012);createHead([1.10,3.35,-.3],.49,[.12,-.22],.04);
  stem([[.02,1.2,0],[-.6,1.8,-.3],[-.95,2.2,-.4]],.011);createHead([-.95,2.2,-.4],.43,[-.22,.18],.10);foliage();
 }else if(c.layout==='phlox'){
  stem([[0,0,0],[.04,1.3,0],[0,2.75,0]],.038);foliage();
  const positions=[[0,3.20,0]];
  for(let i=0;i<6;i++){const a=i*TAU/6+.18;positions.push([.69*Math.cos(a),2.97+.07*Math.sin(a),.69*Math.sin(a)])}
  for(let i=0;i<10;i++){const a=i*TAU/10+.43;positions.push([1.22*Math.cos(a),2.57+.09*Math.sin(a*2),1.22*Math.sin(a)])}
  positions.forEach((p,i)=>{stem([[0,1.8,0],[p[0]*.65,p[1]-.42,p[2]*.65],p],.010);createHead(p,.47,[p[2]*.36,-p[0]*.36],.02*(i%5))});
 }else if(c.layout==='spiraea'){
  stem([[-1.48,.08,0],[-.82,1.1,-.07],[.28,2.2,0],[1.18,3.38,-.05]],.036);
  for(let j=0;j<6;j++){
   const f=j/5,base=[-1.32+2.45*f,.50+2.65*f,0];
   for(let k=0;k<7;k++){
    const a=k*TAU/6+j*.7,r=k===6?0:.29,pos=[base[0]+r*Math.cos(a),base[1]+.10+.10*Math.cos(a),base[2]+r*Math.sin(a)+.13];
    stem([base,[mix(base[0],pos[0],.6),pos[1]-.04,mix(base[2],pos[2],.6)],pos],.006);
    createHead(pos,.275,[.12+.25*Math.sin(a),-.18+.20*Math.cos(a)],.014*((j+k)%7));
   }
  }
 }
 function deformPetal(m,p){
  const {ring:r,i,layer}=m.userData,arr=m.geometry.attributes.position.array;
  const phase=clamp(p+.020*Math.sin(i*2.4+layer)*Math.sin(Math.PI*p)-layer*.018*Math.sin(Math.PI*p));
  const first=phase<.5,alpha=smooth(first?phase*2:(phase-.5)*2),a=i*TAU/r.count+r.rotation+layer*.021,ca=Math.cos(a),sa=Math.sin(a);
  for(let j=0;j<=N;j++)for(let k=0;k<=W;k++){
   const t=j/N,u=k/W*2-1,o=(j*(W+1)+k)*3,edgeRamp=smooth((t-.65)/.35);
   let tipTrim=0,fullWidth;
   const profile=r.profile||c.profile;
   const observedProfile=isRemaining?Remaining.profile(r,t,u,c.morphology):null;
   if(observedProfile){fullWidth=observedProfile.width;tipTrim=observedProfile.trim}
   else if(profile==='oval')fullWidth=r.width*Math.pow(Math.sin(Math.PI*t),.55)*(.88+.12*t);
   else if(profile==='rounded'){fullWidth=r.width*Math.pow(Math.sin(Math.PI*t*.94),.48);tipTrim=edgeRamp*r.width*.24*u*u}
   else if(profile==='ray'){fullWidth=r.width*Math.pow(Math.sin(t*Math.PI*.92),.42);tipTrim=edgeRamp*(.018*(1+Math.cos(u*3*Math.PI))+.07*Math.pow(Math.abs(u),6))}
   else if(profile==='fan'){fullWidth=.018+r.width*Math.pow(t,.86);const tri=1-Math.abs(2*((u+1)*4%1)-1);tipTrim=edgeRamp*(.056*tri+.33*u*u)}
   else{fullWidth=.012+r.width*Math.pow(t,.86);tipTrim=((isRemaining?(c.morphology?.lobeDepth||.39):.39)*Math.pow(Math.sin(u*1.5*Math.PI),2)+.06*u*u)*smooth((t-.45)/.55)}
   if(isRemaining&&(c.edge==='serrate'||c.morphology?.terminalTeeth||c.morphology?.toothCount))tipTrim+=edgeRamp*(c.morphology?.terminalTeeth?.17:.12)*(.5+.5*Math.cos(u*(c.morphology?.terminalTeeth||c.morphology?.toothCount||11)*Math.PI));
   if(c.edge==='notch')tipTrim+=edgeRamp*(isRemaining?(c.morphology?.notchDepth||.045):.045)*Math.exp(-u*u*90);
   if(isRemaining&&c.morphology?.crinkledBlade)tipTrim+=edgeRamp*.09*(.5+.5*Math.sin(u*29+i));
   const length=r.length*(1+.025*Math.sin(i*1.7+layer)),fullR=r.base+length*t-tipTrim-.018*Math.pow(smooth((t-.75)/.25),2);
   fullWidth=Math.max(.006,fullWidth);
   const wrinkle=Math.min(isRemaining?.11:.050,c.ruffle)*Math.sin(Math.PI*t)*(.42*Math.sin(t*17+u*6+i)+.33*Math.cos(u*18-t*7+i*.8)+.25*Math.sin(u*29+t*13+i*2.3))*(.6+.4*Math.abs(u));
   const crinkled=isRemaining&&c.morphology?.crinkledBlade;
   const edgeWave=c.edge==='ruffle'?(crinkled?.19:.04)*Math.sin(u*15+i+(crinkled?t*11:0))*Math.pow(Math.abs(u),3)*t:0;
   // Upright centerline plus a spoon cross-section; all distal curl is upward.
   const bend=.012+.020*(.5+.5*Math.sin(i*1.7+layer));
   const lip=smooth((t-.64)/.36),edge=Math.pow(Math.abs(u),2);
   const rollAngle=(curvature.edgeRoll||.65)*smooth((Math.abs(u)-.45)/.55)*Math.sin(Math.PI*t*.85);
   const rollLift=fullWidth*.55*(1-Math.cos(rollAngle));
   const fold=(curvature.fineFold||.003)*Math.min(1,r.width/.65)*Math.cos(u*6*Math.PI+.24*Math.sin(t*5)+i*.13)*Math.sin(Math.PI*t);
   const tipCurl=isRemaining?Math.max(.015,curvature.tipCurl||.07):(curvature.tipCurl||.07);
   const localCurve=(curvature.edgeLift||.12)*edge*Math.sin(Math.PI*t)+tipCurl*lip*lip+bend*t*t+rollLift+fold;
   const overlapTwist=c.heads?-.13*u*Math.sin(Math.PI*t*.90):0;
   const layerLift=isRemaining?(r.lift||0)+layer*(.035+.10*Math.sin(Math.PI*t*.85)):c.heads?layer*(.05+.18*Math.sin(Math.PI*t*.85)):layer*.042;
   const upright=isRemaining?Math.max(.07,curvature.uprightLift||.13):(curvature.uprightLift||.13);
   const fullY=overlapTwist+.045+layerLift+upright*t+Math.max(.045,r.cup)*t*t+wrinkle+edgeWave*.55+localCurve;
   fullWidth*=1-.08*(curvature.edgeRoll||.65)*smooth((Math.abs(u)-.45)/.55)*Math.sin(Math.PI*t);
   const b=c.bud,pointed=b.type==='pointed'||b.type==='tube',closedR=b.radius*(pointed?(1-t)*(.70+.31*Math.sin(Math.PI*t)):.70*(1-t)+.73*Math.sin(Math.PI*t)),closedY=.025+b.height*.97*t,closedW=Math.max(.006,(pointed?b.radius*(1-t)*.5:b.radius*Math.sin(Math.PI*t))*Math.tan(Math.PI/(c.heads?c.rings.reduce((n,rr)=>n+rr.count,0):r.count))*.68+.006*(1-t));
   const halfR=r.base+length*.43*t-tipTrim*.40,halfY=.025+Math.max(.65,length*.75)*t-.10*t*t+wrinkle*.48+localCurve*.24;
   const halfW=fullWidth*(c.profile==='ray'?.65:.55);
   const rr=first?mix(closedR,halfR,alpha):mix(halfR,fullR,alpha),yy=first?mix(closedY,halfY,alpha):mix(halfY,fullY,alpha),ww=first?mix(closedW,halfW,alpha):mix(halfW,fullWidth,alpha);
   const side=u*ww;arr[o]=rr*ca-side*sa;arr[o+1]=yy;arr[o+2]=rr*sa+side*ca;
  }
  Surface.finishShell(m.geometry);
 }
 function update(v){
  const progress=clamp(Number.isFinite(v)?v:0);
  for(const h of heads){
   const p=clamp((progress-h.delay)/(1-h.delay));h.petals.forEach(m=>deformPetal(m,p));
   const b=c.bud,open=smooth(p*1.8),sepOpacity=b.shed?1-smooth((p-.17)/.30):1;h.budMaterial.opacity=sepOpacity;
   h.sepals.forEach((m,i)=>{
    const arr=m.geometry.attributes.position.array;m.visible=sepOpacity>.005;
    for(let j=0;j<=SN;j++)for(let k=0;k<=SW;k++){
     const t=j/SN,u=k/SW*2-1,o=(j*(SW+1)+k)*3;
     let closedRadius=b.radius*(.78*(1-t)+.91*Math.sin(Math.PI*t));if(b.type==='pointed'||b.type==='tube')closedRadius=b.radius*(1-t)*(.85+.4*Math.sin(Math.PI*t));
     if(c.heads)closedRadius*=1.17;
     const rad=mix(closedRadius,b.radius*(.8+.55*t),open),y=mix(-.025+b.height*1.03*t,-.06-.22*t,open),ang=i*TAU/b.count+u*(Math.PI/b.count)*1.07*mix(1-.025*t*t,Math.pow(1-t,.55),open);
     arr[o]=rad*Math.cos(ang);arr[o+1]=y-(b.shed?open*.18:0);arr[o+2]=rad*Math.sin(ang);
    }m.geometry.attributes.position.needsUpdate=true;m.geometry.computeVertexNormals();
   });
   const sc=isRemaining?.12+.88*smooth(p):.72+.28*smooth(p);h.center.scale.set(sc,isRemaining?.14+.86*smooth(p):.80+.20*p,sc);
   if(isRemaining)Remaining.updateHead(h.extra,p);
  }return progress;
 }
 update(1);return {group,heads,update,stats:{heads:heads.length,petals:heads.reduce((n,h)=>n+h.petals.length,0),species:c.slug}};
}
if(typeof module!=='undefined'&&module.exports)module.exports=createFlowerStudy;else root.createFlowerStudy=createFlowerStudy;
})(typeof globalThis!=='undefined'?globalThis:this);
