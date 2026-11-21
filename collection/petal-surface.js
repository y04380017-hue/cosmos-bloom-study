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
