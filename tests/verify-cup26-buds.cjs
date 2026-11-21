// Prevent colored petal strips poking through the outside of a closed bud.
const assert=require('assert'),T=require('../assets/three.min.js'),create=require('../collection/engine.js');
for(const c of require('../collection/cup26-specimens.json')){
 c.surfaceMaps=require('../collection/textures/'+c.slug+'.json');const model=create(T,c);model.update(0);const head=model.heads[0];
 // Interpolate each actual sepal's radial centerline at the petal vertex's height.
 const covers=head.sepals[0].geometry.attributes.position,N=18,W=12;let worst=-Infinity;
 for(const petal of head.petals){const p=petal.geometry.attributes.position;for(let i=0;i<p.count;i++){
  const y=p.getY(i);if(y<.04||y>c.bud.height*.94)continue;
  const row=(y+.025)/(c.bud.height*1.03)*N,j=Math.max(0,Math.min(N-1,Math.floor(row))),f=row-j;
  const a=j*(W+1)+W/2,b=(j+1)*(W+1)+W/2;
  const cover=(1-f)*Math.hypot(covers.getX(a),covers.getZ(a))+f*Math.hypot(covers.getX(b),covers.getZ(b));
  worst=Math.max(worst,Math.hypot(p.getX(i),p.getZ(i))-cover);
 }}
 assert(worst<.001,c.slug+' petals breach unopened sepal envelope by '+worst);
}
console.log('PASS closed buds contain their folded petals');
