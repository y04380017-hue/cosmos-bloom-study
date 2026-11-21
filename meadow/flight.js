/* A periodic, floating camera rail through the near blue/white drift. */
(function(root){
'use strict';
const scatter=typeof module==='object'&&module.exports?require('./flower-scatter.js'):root.FlowerScatter;
const times=Object.freeze({turn:0,hover:20,entry:56});
const period=64,tau=2*Math.PI;
// Each knot specifies east / north in the meadow's reference coordinates.
// Adjacent knots wrap around both ends so that the return glide is seamless.
const knots=[[-1.6,2.4],[.6,5.65],[1.65,9.1],[.8,11.8],[-1.55,11.2],[-3.15,8.65],[-3.8,4.15],[-2.95,.65]];
function path(phase){
 const v=((phase%1)+1)%1*knots.length,i=Math.floor(v),u=v-i;
 const at=offset=>knots[(i+offset+knots.length)%knots.length];
 const a=at(-1),b=at(0),c=at(1),d=at(2);
 return b.map((base,k)=>.5*(2*base+(-a[k]+c[k])*u+
  (2*a[k]-5*base+4*c[k]-d[k])*u*u+(-a[k]+3*base-3*c[k]+d[k])*u*u*u));
}
function pose(seconds=0){
 const time=((seconds%period)+period)%period,raw=time/period;
 // Slow down while approaching the white flowers, then ease away.
 const phase=raw-.72*(Math.sin(tau*(raw-times.hover/period))-Math.sin(-tau*times.hover/period))/tau;
 const [u,n]=path(phase),[fu,fn]=path(phase+.038);
 const x=u-40,z=96-n,dx=fu-u,dz=n-fn,length=Math.hypot(dx,dz);
 const hover=.5+.5*Math.cos(tau*(raw-times.hover/period));
 const entry=Math.exp(-8.5*(1-Math.cos(tau*(raw-times.entry/period))));
 // Fly behind the path marker so an approaching clump enters as a whole.
 // The vertical offset follows terrain independently of the direction of travel.
 const headingX=dx/length,headingZ=dz/length;
 const eyeX=x-.65*headingX,eyeZ=z-.65*headingZ;
 const altitude=1.91+.036*Math.sin(tau*phase)+.035*hover+.035*entry;
 const y=scatter.terrainHeight(eyeX,eyeZ)+altitude;
 const pitch=(28.8-6.8*entry+1.8*Math.sin(tau*phase))*Math.PI/180;
 // Put the focus on the flower heads several metres ahead, including on slopes.
 const look=2.85+.65*entry;
 return {eye:[eyeX,y,eyeZ],target:[eyeX+headingX*look,y-Math.tan(pitch)*look,eyeZ+headingZ*look]};
}
const api={times,period,pose};
if(typeof module==='object'&&module.exports)module.exports=api;else root.MeadowFlight=api;
})(typeof globalThis!=='undefined'?globalThis:this);
