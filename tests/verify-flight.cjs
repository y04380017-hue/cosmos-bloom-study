// Frame plant centres through the shipped perspective camera along the full rail.
const assert=require('node:assert/strict');
const T=require('../assets/three.min.js'),S=require('../meadow/flower-scatter.js'),flight=require('../meadow/flight.js');
const catalog=require('../meadow/catalog.json'),referenceClumps=require('../meadow/reference-clumps.json');
const camera=new T.PerspectiveCamera(43,1.6,.1,1400);
const point=new T.Vector3();
assert.deepEqual(flight.pose(0),flight.pose(flight.period));
for(let t=0;t<flight.period;t+=.25){
 const {eye,target}=flight.pose(t),height=eye[1]-S.terrainHeight(eye[0],eye[2]);
 assert(height>=1.84&&height<2.05,'the track must hover above the flowers');
 const direction=eye.map((a,i)=>a-target[i]);
 const pitch=Math.atan2(direction[1],Math.hypot(direction[0],direction[2]))*180/Math.PI;
 assert(pitch>=20&&pitch<=32,'avoid horizon flips and steep top-down shots');
 if(t===0)assert(pitch>26&&pitch<34,'turn shot requires a readable down-angle');
 assert(Math.hypot(...flight.pose(t+.25).eye.map((v,i)=>v-eye[i]))<.4,'camera must glide continuously');
}
for(const density of [.5,1,2]){
 const counts={ground:density*33000,cluster:density*10000,focus:density*750};
 const {plants}=S.plan(catalog,{referenceClumps,counts});
 assert.equal(plants.length,43750*density);assert.equal(new Set(plants.map(p=>p.slug)).size,83);
 const near=plants.filter(p=>p.x>-49&&p.x<-32&&p.z>77&&p.z<104);
 // Keep complete nearby plants inside the viewport, including the stems and a
 // margin for tilt and wind. Test narrow layouts as well as the desktop stage.
 for(const aspect of [.85,1.6,2.2]){
  camera.aspect=aspect;camera.updateProjectionMatrix();
  for(let time=0;time<flight.period;time+=1){
   const {eye,target}=flight.pose(time);
   camera.position.set(...eye);camera.lookAt(...target);camera.updateMatrixWorld();
   const visible=near.filter(p=>{
    if(Math.hypot(p.x-eye[0],p.z-eye[2])<.7){
     assert(eye[1]-p.y-p.scale*1.12>.6,'canopy too close at '+time);
    }
    if(Math.hypot(p.x-eye[0],p.z-eye[2])>4.8)return false;
    const width=p.scale*.62;
    for(const x of [-width,width])for(const z of [-width,width])for(const h of [0,p.scale*1.12]){
     point.set(p.x+x,p.y+h,p.z+z).project(camera);
     if(point.z<=0||point.z>=1||Math.abs(point.x)>.91||Math.abs(point.y)>.89)return false;
    }
    return true;
   });
   assert(visible.length>=3,'too few fully framed plants at '+time+'s / '+density+' / '+aspect);
   if(aspect===1.6&&time===flight.times.hover)assert(visible.some(p=>p.slug==='wood-sorrel'));
  }
 }
}
console.log('PASS loop continuity, ground clearance, turn camera, white hover landmark, whole-plant framing across three aspect ratios and three densities.');
