// The panoramic landscape uses quarter-turn longitude and normalized image height.
(function (root) {
  'use strict';
  const horizon = .41;
  // Walkable crest sampled around wind-circle.webp, including the ground beneath the trees.
  // Heights are thousandths of the panorama; interpolate across the 360-degree seam.
  const crests=[
    390,394,382,372,392,393,387,385,382,373,383,372,360,352,344,353,
    360,367,378,383,386,392,400,400,402,401,401,402,401,400,404,405,
    408,407,405,402,400,396,388,394,401,406,410,406,403,402,400,401,
    397,395,392,389,387,388,388,385,383,383,385,386,390,395,395,392
  ];
  function groundAt(longitude){
    const n=crests.length, position=((longitude%4+4)%4)*n/4, i=Math.floor(position);
    return .004+(crests[i]+(crests[(i+1)%n]-crests[i])*(position-i))*.001;
  }
  function seeded(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function makeField(catalog, aspect, seed = 19731, sector = 0) {
    if (!catalog.length) throw Error('Missing species');
    const random = seeded(seed), plants = [];
    const families = new Map();
    for (let i = 0; i < catalog.length; i++) {
      const family = catalog[i].colorFamily;
      if (!families.has(family)) families.set(family, []);
      families.get(family).push(i);
    }
    const pick = list => list[Math.floor(random() * list.length)];
    // A blue stream winds through white banks, with small warm and pink drifts beyond.
    function speciesAt(x, depth, i) {
      if (i < catalog.length) return i;
      const bank = x - (.43 + .17 * Math.sin(5.3 * depth + .6));
      const family = Math.abs(bank) < .17 ? 'blue' : Math.abs(bank) < .29 ? 'light' :
        depth < .26 ? 'pink' : bank > .36 && depth > .48 && depth < .78 ? 'warm' :
        Math.sin(x*8 + depth*4) > .3 ? 'violet' : 'light';
      return pick(families.get(family) || [...families.values()][0]);
    }
    // More distant parent points, smaller lower leaves and tighter groups in projection.
    // Jitter one parent inside each patch so a sweep has flowers even in a quiet bank.
    // A tile always represents the same quarter-turn, including on narrow screens.
    const cols=36, rowsOfClumps=23, count=cols*rowsOfClumps;
    const plantAspect=1.6;
    for (let i = 0; i < count; i++) {
      const strips=Math.floor(i/cols)<7 ? 4 : 1;
      for(let strip=0;strip<strips;strip++){
        const x=(i%cols+(strip+.12+.76*random())/strips)/cols;
        const depth=((Math.floor(i/cols)+.15+.70*random())/rowsOfClumps)**1.22;
        const crest=groundAt(sector+x);
        const y=crest+depth*(1-crest);
        const species=speciesAt(x,depth,(i*157)%count), groupSize=(strips===1?7:4)+2*Math.floor(random()*3);
        for (let k = 0; k < groupSize; k++) {
          const radius = (.008 + .030 * depth) * Math.sqrt(random()), angle = random() * 2 * Math.PI;
          const px = x + Math.cos(angle)*radius/plantAspect, py = y + Math.sin(angle)*radius*.36;
          if (px < 0 || px > 1 || py < groundAt(sector+px) || py > 1.015) continue;
          plants.push({x:px,y:py,species,size:(.016+.111*depth**1.28)*(.63+.54*random()),
            phase:random()*6.28, flip:random()<.5 ? -1 : 1, delay:random()*.31, start:Infinity});
        }
      }
    }
    plants.sort((a,b) => a.y-b.y);
    // A spatial index limits gesture work to the grass surrounding the hand.
    const columns=16, rows=12, bins=Array.from({length:columns*rows},()=>[]);
    const col=x=>Math.min(columns-1,Math.max(0,Math.floor(x*columns)));
    const row=y=>Math.min(rows-1,Math.max(0,Math.floor(y*rows)));
    plants.forEach(p=>bins[row(p.y)*columns+col(p.x)].push(p));
    let awoken=0;
    return {plants, get count(){return awoken;},
      wake(x,y,now,ratio=aspect, ribbon=false) {
        const crest=groundAt(sector+x);
        if (y<crest-.00001 || y>1.02) return 0;
        const depth=Math.max(0,(y-crest)/(1-crest));
        const rx=ribbon ? (.043+.033*depth)/1.15 : (.068+.103*depth)/ratio;
        const ry=ribbon ? .030+.024*depth : .027+.063*depth;
        if(x < -rx || x > 1+rx) return 0;
        let added=0;
        for(let r=row(y-ry);r<=row(y+ry);r++) for(let c=col(x-rx);c<=col(x+rx);c++) {
          for(const p of bins[r*columns+c]) {
            const distance=Math.hypot((p.x-x)/rx,(p.y-y)/ry);
            if(distance>1) continue;
            const arrival=now+(ribbon ? .34 : .84)*distance+p.delay*(ribbon ? .48 : 1);
            if(!Number.isFinite(p.start)) {added++;awoken++;}
            p.start=Math.min(p.start,arrival);
          }
        }
        return added;
      },
      clear(){ for (const p of plants) p.start=Infinity; awoken=0; }
    };
  }
  // Sample by distance travelled. The same sweep lays the same ribbon at any frame rate.
  function traceRibbon(previous,x,y,time,aspect,source,stamp) {
    const dx=previous ? (x-previous.x)*aspect : 0, dy=previous ? y-previous.y : 0;
    const length=Math.hypot(dx,dy), elapsed=previous ? time-previous.t : Infinity;
    if(!previous || previous.source!==source || elapsed>.40 || length>Math.min(.8,.13+elapsed*4.4)){
      stamp(x,y,time);
      return {x,y,t:time,source,length:0};
    }
    const spacing=.012, end=previous.length+length;
    for(let i=Math.floor(previous.length/spacing)+1;i*spacing<=end;i++){
      const arc=i*spacing, mix=(arc-previous.length)/length;
      const bend=(.015*Math.sin(arc*13)+.006*Math.sin(arc*23))*Math.min(1,arc/.09);
      stamp(previous.x+(dx*mix-dy/length*bend)/aspect,
        previous.y+dy*mix+dx/length*bend, previous.t+elapsed*mix);
    }
    return {x,y,t:time,source,length:end};
  }
  function opening(plant,now) {
    const t=Math.min(1,Math.max(0,(now-plant.start)/(1.15+plant.delay)));
    return t*t*(3-2*t);
  }
  const api={groundAt,horizon,makeField,opening,traceRibbon};
  if(typeof module==='object' && module.exports)module.exports=api;else root.SpringField=api;
})(globalThis);
