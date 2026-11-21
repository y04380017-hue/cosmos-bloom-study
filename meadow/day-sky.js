/* Clear sky, painted cloud banks, distant ridges and the device-time sun. */
(function(root){
'use strict';
function create(T,scene){
 const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,toneMapped:false,uniforms:{uZenith:{value:new T.Color()},uHorizon:{value:new T.Color()},uSunColor:{value:new T.Color()},uSunDirection:{value:new T.Vector3()},uSunVisibility:{value:1}},vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec3 vDirection;uniform vec3 uZenith;uniform vec3 uHorizon;uniform vec3 uSunColor;uniform vec3 uSunDirection;uniform float uSunVisibility;

 float cloudLobe(vec2 p,vec2 centre,vec2 size){
  return 1.0-length((p-centre)/size);
 }
 void main(){
  vec3 direction=normalize(vDirection);
  float height=pow(max(direction.y,0.0),0.55);
  float azimuth=atan(direction.x,direction.z);
  vec3 sky=mix(uHorizon,uZenith,height);
  float facing=dot(direction,normalize(uSunDirection));
  float disc=smoothstep(cos(0.019),cos(0.016),facing);
  float halo=exp((facing-1.0)*550.0)*0.12;
  sky+=uSunColor*(disc*3.2+halo)*uSunVisibility;

  // Discrete banks with clear sky between them; their outlines wrap at +/-pi.
  float sector=(azimuth/6.2831853+.5)*8.0;
  float cell=mod(floor(sector),8.0),phase=cell*2.39996;
  vec2 p=vec2(fract(sector)-.5,direction.y-.21-.075*sin(phase));
  p.x+=.07*cos(phase);p.x*=1.0+.15*sin(phase);
  float shape=cloudLobe(p,vec2(-.12,0.),vec2(.16,.030));
  shape=max(shape,cloudLobe(p,vec2(.00,.025),vec2(.13,.062)));
  shape=max(shape,cloudLobe(p,vec2(.11,.012),vec2(.094,.040)));
  shape=max(shape,cloudLobe(p,vec2(.19,-.002),vec2(.10,.018)));
  float mask=smoothstep(-.06,.07,shape)*(1.0-smoothstep(.973,.999,facing));
  float lit=smoothstep(-.012,.018,p.y+.009*sin(p.x*18.+phase));
  vec3 cloudShadow=mix(uHorizon,uSunColor,.16);
  vec3 cloudLight=mix(uHorizon,uSunColor,.79);
  sky=mix(sky,mix(cloudShadow,cloudLight,lit),mask*(.09+.77*uSunVisibility));

  // Two painted silhouettes put a readable shape on the horizon in all directions.
  float farRidge=.035+.014*sin(3.*azimuth+.8)+.009*sin(7.*azimuth)+.004*sin(13.*azimuth);
  float nearRidge=.011+.006*sin(4.*azimuth-.9)+.004*sin(9.*azimuth+1.);
  vec3 farColour=uHorizon*vec3(.70,.84,.90);
  vec3 nearColour=uHorizon*vec3(.51,.75,.64);
  sky=mix(sky,farColour,1.-smoothstep(farRidge-.001,farRidge+.001,direction.y));
  sky=mix(sky,nearColour,1.-smoothstep(nearRidge-.001,nearRidge+.001,direction.y));
  gl_FragColor=vec4(sky,0.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const geometry=new T.SphereGeometry(1500,32,16),dome=new T.Mesh(geometry,material);dome.name='clear-day-sky';dome.frustumCulled=false;dome.renderOrder=-100;scene.add(dome);
 const ambient=new T.HemisphereLight(0xfffcf4,0x8ba798,.98);scene.add(ambient);
 const sun=new T.DirectionalLight(0xfff7e8,4.6);sun.name='daylight-sun';sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:160});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;scene.add(sun);scene.add(sun.target);
 const rim=new T.DirectionalLight(0xfffcf4,1.05);scene.add(rim);scene.add(rim.target);
 const moonRim=new T.Color(0xc3d4fc),dayRim=new T.Color(0xfffcf4);
 const color=(target,values)=>target.setRGB(...values,T.SRGBColorSpace);
 return {sun,ambient,material,update(state,camera){
  dome.position.copy(camera.position);color(material.uniforms.uZenith.value,state.zenith);color(material.uniforms.uHorizon.value,state.horizon);color(material.uniforms.uSunColor.value,state.sunColor);material.uniforms.uSunDirection.value.set(...state.sunDirection);material.uniforms.uSunVisibility.value=state.sunVisibility;
  ambient.intensity=state.ambient;sun.intensity=state.sunIntensity*state.sunVisibility;sun.castShadow=sun.intensity>.05;color(sun.color,state.sunColor);
  sun.target.position.set(camera.position.x,0,camera.position.z-10);sun.position.copy(sun.target.position).addScaledVector(material.uniforms.uSunDirection.value,80);
  rim.color.copy(moonRim).lerp(dayRim,state.sunVisibility);rim.intensity=state.rimIntensity;rim.position.set(camera.position.x-8,19,camera.position.z-15);rim.target.position.set(camera.position.x,1,camera.position.z-5);
 },dispose(){geometry.dispose();material.dispose();sun.shadow.map?.dispose();for(const o of [dome,ambient,sun,sun.target,rim,rim.target])scene.remove(o)}};
}
const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MeadowDaySky=api;
})(typeof globalThis!=='undefined'?globalThis:this);
