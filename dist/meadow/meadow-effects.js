/* Shared world-space wind, source-derived distance LOD, and restrained HDR bloom. */
(function(root){
'use strict';
const WIND=.075;
function createWind(T,trail=null){
 const time={value:0},strength={value:1},opening={value:1};const depths=new Map();
 const dayOpening=(x,z,value=opening.value)=>Math.max(0,Math.min(1,value+.065*Math.sin(x*.37+z*.29)*4*value*(1-value)));
 const openingAt=(x,z,value=opening.value)=>trail?trail.openingAt(x,z,dayOpening(x,z,value)):dayOpening(x,z,value);
 const declarations=`uniform float uMeadowTime;
uniform float uMeadowWind;
#ifdef MEADOW_CYCLE
uniform float uMeadowOpening;
#ifdef MEADOW_TRAIL
uniform sampler2D uGestureMap;
uniform vec2 uGestureOrigin;
uniform float uGestureMode;
#endif
attribute vec3 positionBud;
attribute vec3 positionHalf;
attribute vec3 normalBud;
attribute vec3 normalHalf;
float meadowOpening(){
 vec3 origin=modelMatrix[3].xyz;
 #ifdef USE_INSTANCING
 origin=(modelMatrix*instanceMatrix)[3].xyz;
 #endif
 float day=clamp(uMeadowOpening+0.065*sin(origin.x*0.37+origin.z*0.29)*4.0*uMeadowOpening*(1.0-uMeadowOpening),0.0,1.0);
 #ifdef MEADOW_TRAIL
 if(uGestureMode>0.0){
  vec2 uv=(origin.xz-uGestureOrigin)/20.;
  float wave=0.;
  if(all(greaterThanEqual(uv,vec2(0.)))&&all(lessThanEqual(uv,vec2(1.))))wave=texture2D(uGestureMap,uv).r;
  float rest=day*(.27+.13*sin(origin.x*1.43+origin.z*.93));
  return mix(day,mix(rest,1.,wave),uGestureMode);
 }
 #endif
 return day;
}
vec3 meadowPose(vec3 full, vec3 bud, vec3 halfPose,float amount){return amount<0.5?mix(bud,halfPose,smoothstep(0.0,0.5,amount)):mix(halfPose,full,smoothstep(0.5,1.0,amount));}
float meadowRestAngle(float height,float amount){return (1.0-amount)*0.16*smoothstep(0.42,1.05,height);}
vec2 meadowRotate(vec2 v,float angle){float c=cos(angle),s=sin(angle);return vec2(c*v.x-s*v.y,s*v.x+c*v.y);}
#endif
vec2 meadowBend(vec2 origin, float height) {
 float phase = origin.x * 0.19 + origin.y * 0.13;
 float wave = sin(phase - uMeadowTime * 0.52) * 0.70
            + sin(origin.x * 0.071 - origin.y * 0.113 - uMeadowTime * 0.31) * 0.30;
 float mask = pow(max(height, 0.0), 1.65);
 return vec2(wave + 0.40, sin(phase * 0.73 - uMeadowTime * 0.39) * 0.35) * 0.075 * mask * uMeadowWind;
}`;
 const bend=`vec3 transformed = vec3(position);
#ifdef MEADOW_CYCLE
float flowerOpening=meadowOpening();
transformed=meadowPose(position,positionBud,positionHalf,flowerOpening);
float restAngle=meadowRestAngle(transformed.y,flowerOpening);
transformed.yz=meadowRotate(vec2(transformed.y-0.42,transformed.z),restAngle)+vec2(0.42,0.0);
#endif
mat4 meadowObject = modelMatrix;
#ifdef USE_INSTANCING
 meadowObject = modelMatrix * instanceMatrix;
#endif
vec3 meadowOrigin = meadowObject[3].xyz;
vec2 meadowWorldBend = meadowBend(meadowOrigin.xz, transformed.y);
// Convert the fixed world wind direction into each instance's yaw frame.
vec3 meadowRight = normalize(meadowObject[0].xyz);
vec3 meadowForward = normalize(meadowObject[2].xyz);
transformed.x += dot(meadowWorldBend, meadowRight.xz);
transformed.z += dot(meadowWorldBend, meadowForward.xz);`;
 const sunDirection={value:new T.Vector3(.4,.3,-.8).normalize()},daylight={value:1},warmth={value:0};
 // Shape the reflected light before the common HDR/direct output transform.
 const inkPass=`
 #ifdef USE_MAP
 if(petalInk>.01){
  vec2 petalUV=clamp((fract(vMapUv*uPetalGrid)*64.-2.5)/59.,0.,1.);
  vec3 key=normalize(mat3(viewMatrix)*uInkSun);
  float incidence=dot(normal,key);
  float paintedLight=smoothstep(-.32,.54,incidence);
  float fold=(1.-smoothstep(.08,.54,petalUV.y))*.48;
  float litEnergy=dot(reflectedLight.directDiffuse,vec3(.213,.715,.072))/max(.025,dot(diffuseColor.rgb,vec3(.213,.715,.072)));
  float shade=clamp(.68*(1.-paintedLight)+fold+.22*(1.-smoothstep(.08,.45,litEnergy)),0.,1.);
  vec3 pigment=diffuseColor.rgb;
  vec3 shadow=pigment*vec3(.73,.65,.86)+vec3(.026,.015,.055);
  float ivory=smoothstep(.54,.78,min(pigment.r,min(pigment.g,pigment.b)))*(1.-smoothstep(.20,.43,max(pigment.r,max(pigment.g,pigment.b))-min(pigment.r,min(pigment.g,pigment.b))));
  shadow=mix(shadow,pigment*vec3(.77,.76,.89)+vec3(.016,.017,.032),ivory);
  vec3 sunny=pigment*vec3(1.16,1.055,.98)+vec3(.037,.023,.006);
  vec3 ink=mix(sunny,shadow,shade);
  float edge=max(smoothstep(.89,.985,abs(petalUV.x*2.-1.)),smoothstep(.91,.985,petalUV.y));
  float grazing=1.-abs(dot(normal,normalize(vViewPosition)));
  float rim=edge*(.12+.53*grazing)*smoothstep(-.50,.60,incidence)*uInkDay;
  ink=mix(ink,vec3(1.63,1.39,1.08),rim);
  ink*=mix(vec3(.57,.65,.81),vec3(1.06,1.05,1.04),uInkDay);
  ink*=mix(vec3(1.),vec3(1.13,.99,.90),uInkWarmth);
  outgoingLight=mix(outgoingLight,ink,petalInk);
 }
 #endif
 #include <opaque_fragment>`;
 function attach(material,{cycle=false,foliage=false}={}){
  // A material is shared by all distance levels; each level carries the same attributes.
  material.onBeforeCompile=shader=>{
   if(cycle&&material.isMeshStandardMaterial&&shader.fragmentShader){
    Object.assign(shader.uniforms,{uInkSun:sunDirection,uInkDay:daylight,uInkWarmth:warmth,uPetalGrid:{value:material.userData.petalGrid||new T.Vector2(1,1)}});
    shader.fragmentShader='uniform vec3 uInkSun; uniform float uInkDay,uInkWarmth; uniform vec2 uPetalGrid;\n'+shader.fragmentShader
     .replace('#include <map_fragment>','#include <map_fragment>\nfloat petalInk=1.-smoothstep(.53,.95,diffuseColor.a); diffuseColor.a=opacity;')
     .replace('#include <opaque_fragment>',inkPass);
   }
   if(foliage&&shader.fragmentShader){
    shader.uniforms.uInkDay=daylight;
    shader.fragmentShader='uniform float uInkDay;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
     vec3 leafInk=diffuseColor.rgb*vec3(1.12,1.02,.81)+vec3(.038,.057,.021);
     outgoingLight=mix(leafInk*(.64+.46*uInkDay),outgoingLight,.26);
     #include <opaque_fragment>`);
   }
   shader.uniforms.uMeadowTime=time;shader.uniforms.uMeadowWind=strength;shader.uniforms.uMeadowOpening=opening;
   if(cycle&&trail)Object.assign(shader.uniforms,trail.uniforms);
   shader.vertexShader=(cycle&&trail?'#define MEADOW_TRAIL\n':'')+(cycle?'#define MEADOW_CYCLE\n':'')+declarations+'\n'+shader.vertexShader.replace('#include <begin_vertex>',bend);
   if(foliage)shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
    float farGrass=smoothstep(5.,27.,distance(meadowOrigin,cameraPosition));
    transformed.y*=1.-farGrass;
    transformed.y-=farGrass*.12;
    #include <project_vertex>`);
   if(cycle)shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
float normalOpening=meadowOpening();
vec3 restPosition=meadowPose(position,positionBud,positionHalf,normalOpening);
objectNormal=normalize(meadowPose(normal,normalBud,normalHalf,normalOpening));
objectNormal.yz=meadowRotate(objectNormal.yz,meadowRestAngle(restPosition.y,normalOpening));
#ifdef USE_INSTANCING
 vec2 sway=meadowBend((modelMatrix*instanceMatrix)[3].xz,restPosition.y);
 vec3 windNormal=vec3(sway.x,0.,sway.y)*mat3(instanceMatrix);
 objectNormal=normalize(objectNormal-vec3(windNormal.x,0.,windNormal.z)*objectNormal.y*1.7);
#endif`);
  };
  material.customProgramCacheKey=()=> 'spring-ink-'+cycle+'-'+foliage+'-'+Boolean(trail);material.needsUpdate=true;return material;
 }
 function deformPoint(full,bud,half,plant){
  const amount=openingAt(plant.x,plant.z),a=amount<.5?bud:half,b=amount<.5?half:full;let t=amount<.5?amount*2:(amount-.5)*2;t=t*t*(3-2*t);
  const p=a.map((v,i)=>v+(b[i]-v)*t),mask=Math.max(0,Math.min(1,(p[1]-.42)/.63)),angle=(1-amount)*.16*mask*mask*(3-2*mask),c=Math.cos(angle),s=Math.sin(angle),y=p[1]-.42,z=p[2];
  p[1]=c*y-s*z+.42;p[2]=s*y+c*z;
  const phase=plant.x*.19+plant.z*.13,wave=Math.sin(phase-time.value*.52)*.7+Math.sin(plant.x*.071-plant.z*.113-time.value*.31)*.3,h=Math.max(p[1],0)**1.65;
  const wx=(wave+.40)*.075*h*strength.value,wz=Math.sin(phase*.73-time.value*.39)*.35*.075*h*strength.value,yaw=plant.rotationY;
  const pitch=plant.tiltX||0,bz=plant.tiltZ||0,cy=Math.cos(yaw),sy=Math.sin(yaw),ca=Math.cos(pitch),sa=Math.sin(pitch),cb=Math.cos(bz),sb=Math.sin(bz);
  p[0]+=wx*(cy*cb+sy*sa*sb)+wz*(cy*sa*sb-sy*cb);p[2]+=wx*sy*ca+wz*cy*ca;return p;
 }
 return {attach,openingAt,deformPoint,setSun(state){sunDirection.value.fromArray(state.sunDirection);daylight.value=Math.min(1,state.sunIntensity*state.sunVisibility/3.15);warmth.value=Math.min(1,Math.max(0,(state.hour-14)/4))*state.sunVisibility},setOpening:v=>opening.value=Math.max(0,Math.min(1,v)),setTime:t=>time.value=t,setStrength:s=>strength.value=s,offset(x,z,h,t){const p=x*.19+z*.13,w=Math.sin(p-t*.52)*.7+Math.sin(x*.071-z*.113-t*.31)*.3,m=Math.max(h,0)**1.65;return [(w+.40)*WIND*m,Math.sin(p*.73-t*.39)*.35*WIND*m]},depthMaterial(cycle=false){if(!depths.has(cycle))depths.set(cycle,attach(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}),{cycle}));return depths.get(cycle)},dispose(){for(const d of depths.values())d.dispose()}};
}

async function instantiate(T,layout,{loadTemplate,wind,farDistance=105,onProgress=()=>{}}){
 const group=new T.Group();group.name='procedural-flower-meadow';
 const buckets=new Map(),meshes=[],enabled={ground:true,cluster:true,focus:true};
 for(const p of layout.plants){const key=p.slug+'/'+p.stage;if(!buckets.has(key))buckets.set(key,{slug:p.slug,stage:p.stage,layer:p.layer,items:[]});buckets.get(key).items.push(p)}
 const stats={instances:layout.plants.length,species:new Set(layout.plants.map(p=>p.slug)).size,batches:0,triangles:0,drawn:0,visible:0};
 const matrix=new T.Matrix4(),position=new T.Vector3(),quaternion=new T.Quaternion(),scale=new T.Vector3(),up=new T.Vector3(0,1,0),last=new T.Vector3(Infinity,Infinity,Infinity);
 const dispose=()=>{for(const mesh of meshes){group.remove(mesh);mesh.dispose()}meshes.length=0;buckets.clear()};
 try{
  let done=0;
  for(const bucket of buckets.values()){
   const model=await loadTemplate(bucket.slug);bucket.matrices=new Float32Array(bucket.items.length*16);bucket.lods=new Uint8Array(bucket.items.length);
   bucket.items.forEach((p,i)=>{matrix.compose(position.set(p.x,p.y,p.z),quaternion.setFromAxisAngle(up,p.rotationY),scale.setScalar(p.scale));matrix.toArray(bucket.matrices,i*16)});
   for(const lod of ['near','far']){
    const source=(lod==='near'?model.stages:model.farStages)?.[bucket.stage];if(!source)throw new Error('Missing '+lod+' geometry: '+bucket.slug);
    wind?.attach(source.material);
    const mesh=new T.InstancedMesh(source.geometry,source.material,bucket.items.length);mesh.name=bucket.slug+'/'+bucket.stage+'/'+lod;mesh.count=0;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.userData={slug:bucket.slug,stage:bucket.stage,layer:bucket.layer,lod,plants:[]};
    mesh.castShadow=lod==='near'&&bucket.layer!=='ground';mesh.receiveShadow=lod==='near';if(wind)mesh.customDepthMaterial=wind.depthMaterial();
    bucket[lod]=mesh;meshes.push(mesh);group.add(mesh);
   }onProgress(++done,buckets.size);
  }
 }catch(e){dispose();throw e}
 function refreshStats(){stats.batches=0;stats.visible=0;stats.triangles=0;for(const m of meshes){m.visible=enabled[m.userData.layer]&&m.count>0;if(m.visible){stats.batches++;stats.visible+=m.count;stats.triangles+=m.count*(m.geometry.index?.count??m.geometry.attributes.position.count)/3}}}
 function update(camera,force=false){
  if(!force&&last.distanceToSquared(camera)<4)return false;last.copy(camera);stats.drawn=0;
  for(const bucket of buckets.values()){
   bucket.near.count=0;bucket.far.count=0;bucket.near.userData.plants.length=0;bucket.far.userData.plants.length=0;
   bucket.items.forEach((p,i)=>{
    const distance=Math.hypot(p.x-camera.x,p.z-camera.z);if(distance>farDistance)return;
    // Two metre hysteresis avoids flickering as orbit/zoom crosses the boundary.
    const near=distance<(bucket.lods[i]===1?22:20);bucket.lods[i]=near?1:2;
    const mesh=near?bucket.near:bucket.far;mesh.instanceMatrix.array.set(bucket.matrices.subarray(i*16,i*16+16),mesh.count*16);mesh.userData.plants.push(p);mesh.count++;stats.drawn++;
   });
   for(const mesh of [bucket.near,bucket.far])if(mesh.count){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.6;mesh.boundingBox.expandByScalar(.6)}
  }
  refreshStats();return true;
 }
 return {group,stats,update,setLayer(layer,value){enabled[layer]=value;refreshStats()},dispose};
}
function createBloom(T,renderer){
 const webgl2=!!renderer.capabilities?.isWebGL2,hdr=webgl2&&renderer.extensions?.has('EXT_color_buffer_float');
 // Avoid clipping HDR lighting into an 8-bit intermediate on older devices.
 if(!hdr)return {supported:false,setFocus(){},resize(){},render(scene,camera){renderer.setRenderTarget(null);renderer.render(scene,camera)},dispose(){}};
 const make=()=>new T.WebGLRenderTarget(1,1,{type:hdr?T.HalfFloatType:T.UnsignedByteType,depthBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
 const sceneTarget=make();sceneTarget.depthBuffer=true;sceneTarget.samples=webgl2?Math.min(4,renderer.capabilities.maxSamples||0):0;
 const hasDepth=webgl2||!!renderer.extensions?.has('WEBGL_depth_texture');
 if(hasDepth)sceneTarget.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
 const ping=make(),pong=make(),camera=new T.OrthographicCamera(-1,1,1,-1,0,1),screen=new T.Scene(),geometry=new T.PlaneGeometry(2,2);
 const vertex='varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
 const blur=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{tInput:{value:null},uStep:{value:new T.Vector2()},uExtract:{value:1},uThreshold:{value:hdr?1.05:.72}},vertexShader:vertex,fragmentShader:`varying vec2 vUv; uniform sampler2D tInput; uniform vec2 uStep; uniform float uExtract;uniform float uThreshold;
 vec3 sampleLight(vec2 uv){vec3 c=texture2D(tInput,uv).rgb;if(uExtract>0.5){float b=dot(c,vec3(0.2126,0.7152,0.0722));c*=smoothstep(uThreshold,uThreshold+0.7,b)*max(b-uThreshold,0.0)/max(b,0.001);}return c;}
 void main(){vec3 c=sampleLight(vUv)*0.227027;c+=(sampleLight(vUv+uStep*1.384615)+sampleLight(vUv-uStep*1.384615))*0.316216;c+=(sampleLight(vUv+uStep*3.230769)+sampleLight(vUv-uStep*3.230769))*0.070270;gl_FragColor=vec4(c,1.0);}`});
 const composite=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{tScene:{value:sceneTarget.texture},tBloom:{value:pong.texture},uStrength:{value:.24},tDepth:{value:sceneTarget.depthTexture||sceneTarget.texture},uDepthEnabled:{value:hasDepth?1:0},uPixel:{value:new T.Vector2(1,1)},uNearFar:{value:new T.Vector2(.1,1800)},uFocus:{value:6},uLensRadius:{value:9}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;uniform sampler2D tScene;uniform sampler2D tBloom;uniform float uStrength;uniform sampler2D tDepth;uniform float uDepthEnabled;uniform vec2 uPixel;uniform vec2 uNearFar;uniform float uFocus;uniform float uLensRadius;
 float viewDistance(vec2 uv){float d=texture2D(tDepth,uv).x;return uNearFar.x*uNearFar.y/(uNearFar.y-d*(uNearFar.y-uNearFar.x));}
 float lensWeight(float center,float neighbour,float coverage){
  // Never pull bright sky or a sharp foreground petal into distant green bokeh.
  float sameSurface=step(0.5,coverage);
  float foreground=step(max(uFocus*1.35,center*0.35),neighbour);
  return sameSurface*mix(1.0,foreground,step(uFocus*1.6,center));
 }
 void main(){
 vec4 centerColor=texture2D(tScene,vUv);float surfaceCoverage=centerColor.a;vec3 base=centerColor.rgb;
 if(uDepthEnabled>0.5&&surfaceCoverage>0.5){
  float distance=viewDistance(vUv);
  float nearBlur=1.0-smoothstep(uFocus*0.35,uFocus*0.65,distance);
  float farBlur=smoothstep(uFocus*1.45,uFocus*3.6,distance);
  float radius=max(nearBlur*0.4,farBlur)*uLensRadius;
  if(radius>0.15){
   vec3 sum=base;float total=1.0;
   // Eight aperture samples; depth gating keeps focused petals readable.
   for(int i=0;i<8;i++){
    float n=float(i),angle=n*2.39996323,r=sqrt((n+0.5)/8.0);
    vec2 uv=clamp(vUv+vec2(cos(angle),sin(angle))*r*radius*uPixel,vec2(0.001),vec2(0.999));
    vec4 tap=texture2D(tScene,uv);float weight=lensWeight(distance,viewDistance(uv),tap.a);
    sum+=tap.rgb*weight;total+=weight;
   }base=sum/total;
  }
 }
 vec3 linearColor=base+texture2D(tBloom,vUv).rgb*uStrength;
 // The opaque scene target stores sky=0 / lit-surface=1 in alpha. This
 // keeps the authored clear sky identical to direct rendering, instead of
 // washing it through the ACES curve intended for physically lit surfaces.
 vec3 displayColor=linearColor;
 #ifdef TONE_MAPPING
 displayColor=mix(linearColor,toneMapping(linearColor),surfaceCoverage);
 #endif
 gl_FragColor=vec4(displayColor,1.0);
 #include <colorspace_fragment>
 }`});
 const quad=new T.Mesh(geometry,blur);quad.frustumCulled=false;screen.add(quad);let w=1,h=1;
 return {supported:true,setFocus(distance){composite.uniforms.uFocus.value=Math.max(1,distance);composite.uniforms.uLensRadius.value=distance<3?2.6:distance<12?10:6},resize(width,height){width=Math.max(1,width);height=Math.max(1,height);composite.uniforms.uPixel.value.set(1/width,1/height);w=Math.max(1,Math.floor(width/4));h=Math.max(1,Math.floor(height/4));sceneTarget.setSize(width,height);ping.setSize(w,h);pong.setSize(w,h)},render(scene,camera3D,enabled=true){
  composite.uniforms.uNearFar.value.set(camera3D.near,camera3D.far);
  if(!enabled){renderer.setRenderTarget(null);renderer.render(scene,camera3D);return}
  renderer.setRenderTarget(sceneTarget);renderer.render(scene,camera3D);
  quad.material=blur;blur.uniforms.tInput.value=sceneTarget.texture;blur.uniforms.uStep.value.set(1.45/w,0);blur.uniforms.uExtract.value=1;renderer.setRenderTarget(ping);renderer.render(screen,camera);
  blur.uniforms.tInput.value=ping.texture;blur.uniforms.uStep.value.set(0,1.45/h);blur.uniforms.uExtract.value=0;renderer.setRenderTarget(pong);renderer.render(screen,camera);
  quad.material=composite;renderer.setRenderTarget(null);renderer.render(screen,camera);
 },dispose(){for(const t of [sceneTarget,ping,pong])t.dispose();sceneTarget.depthTexture?.dispose();geometry.dispose();blur.dispose();composite.dispose()}};
}
const api={createWind,instantiate,createBloom};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MeadowEffects=api;
})(typeof globalThis!=='undefined'?globalThis:this);
