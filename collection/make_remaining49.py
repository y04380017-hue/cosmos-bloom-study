"""Build the remaining49 model configurations from individually inspected source photos."""
from pathlib import Path
import json,hashlib,shutil,sys,math
R=Path(__file__).resolve().parent
records=json.loads((R/'remaining49-reference-records.json').read_text())
observations={x['id']:x for x in json.loads((R/'remaining49-photo-observations.json').read_text())}

def layout(o):
    kind=o.get('arrangement','single'); n=o.get('headCount',1)
    if o.get('morphology',{}).get('microflowerCluster') or o.get('morphology',{}).get('axillaryClusters'):
        micro=o['morphology'].get('microflowerCluster');result=[]
        for g in range(3):
            for i in range(7 if micro else 5):
                a=i*2*math.pi/(7 if micro else 5)+g*.7;r=.30 if micro else .31
                result.append(dict(position=[(g-1)*1.05+r*math.cos(a),2.15+g*.47+.15*math.sin(a),r*math.sin(a)],scale=.23 if micro else .26,tilt=[.22*math.sin(a),-.22*math.cos(a)],delay=.012*(i%5)))
        return result
    if kind=='single': return [dict(position=[0,2.85,0],scale=1,tilt=[.03,-.05])]
    if kind=='pair': return [dict(position=[-.50,2.72,.15],scale=.78,tilt=[.10,-.14]),dict(position=[1.03,3.23,-.27],scale=.58,tilt=[.16,-.20],delay=.055)]
    if kind=='trio': return [dict(position=[0,2.95,.20],scale=.72,tilt=[.08,-.10]),dict(position=[1.05,3.32,-.38],scale=.48,tilt=[.15,-.18],delay=.05),dict(position=[-1.02,2.21,-.25],scale=.49,tilt=[-.10,.15],delay=.08)]
    n=max(3,min(13,int(n))); result=[dict(position=[0,3.12,0],scale=.44,tilt=[.04,-.04])]
    for i in range(n-1):
        outer=i>=6; k=i-6 if outer else i; count=max(1,n-7) if outer else min(6,n-1); a=k*2*math.pi/count+(.55 if outer else .1)
        r=1.55 if outer else .93; y=2.38 if outer else 2.86
        result.append(dict(position=[r*math.cos(a),y+.08*math.sin(a*2),r*math.sin(a)],scale=.35 if outer else .40,tilt=[.15*math.sin(a),-.15*math.cos(a)],delay=.014*(i%5)))
    return result

def main():
    source=Path(sys.argv[1]) if len(sys.argv)>1 else None; configs=[];review=[]
    for n,r in enumerate(records,35):
        o=observations[r['id']];slug=r['scientific_name'].lower().replace(' ','-');photo='assets/'+slug+'.jpg'
        if source:
            original=source/r['paths'][0];assert hashlib.sha256(original.read_bytes()).hexdigest()==r['sha256'];shutil.copyfile(original,R/photo)
        assert hashlib.sha256((R/photo).read_bytes()).hexdigest()==r['sha256']
        c={k:o[k] for k in ['rings','center','leaf','edge','ruffle','curvature','bud','focus']}
        c.update(batch='remaining49',number=n,sourceId=r['id'],slug=slug,name=r['name'],scientific=r['scientific_name'],category=r['dimension_labels'][0],photo=photo,source=r['source_metadata'],source_sha256=r['sha256'],revision='V7 · 剩余49种扩展',layout='branch',heads=layout(o),profile=o['rings'][0]['profile'],morphology=o.get('morphology',{}),lighting=dict(key=[-4,7,4],keyIntensity=2.65,ambient=.58,fill=.22,rim=.65,exposure=1.03))
        c['meshSegments']=[16,20] if len(c['heads'])>4 else [24,28]
        if r['id'] in ['201','349']:c['meshSegments']=[20,64]
        if r['id']=='331':c['meshSegments']=[24,48]
        if r['id']=='394':c['meshSegments']=[28,56];c['morphology']['crinkledBlade']=True
        for ring in c['rings']:
            ring.setdefault('rotation',0);ring.setdefault('base',.12)
        # Refinements after source/model contact-sheet review.
        if r['id']=='137':
            for ring in c['rings']:ring['width']*=.76
        if r['id']=='128':c['rings'][0].update(profile='obovate',width=.55)
        if r['id']=='331':c['morphology']['lobeDepth']=.84
        if r['id']=='368':c['rings'][0]['claw']=.48
        if r['id']=='016':c['rings'][-1].update(cup=.30,lift=-.055)
        if r['id']=='394':c['ruffle']=.105
        c['bud'].setdefault('shed',False)
        c['note']='依据本张照片的可见花型与色彩建立三维习作；遮挡处、花苞和展开路径含建模推定。'
        uncertain=o.get('uncertainties',[])
        if isinstance(uncertain,str):uncertain=[uncertain]
        c['note']+=' '.join(uncertain)
        if len(c['heads'])>4:c['note']+=' 成簇花朵采用代表花头展示层次，数量不等同于原图逐朵计数。'
        if 'reverseMaterialIndex' in o:c['reverseMaterialIndex']=o['reverseMaterialIndex']
        if r['id']=='428':c['morphology']['passionflower']=True
        if r['id']=='234':
            c['morphology'].update(fusedCorolla=True,style=True,styleHeight=.36,styleColor='#ddd7cb');c['bud'].update(petalColored=True,shed=True);c['center'].update(type='stamens',height=.24)
        if r['id']=='260':c['center']['type']='stamens';c['morphology'].update(style=True,styleHeight=.8,styleColor='#e0e8eb')
        if r['id']=='471':c['center']['domeHeight']=.24
        if r['id'] in ['101','447']:c['center']['domeHeight']=.45 if r['id']=='101' else .32
        configs.append(c);review.append(dict(order=n-34,sourceId=r['id'],number=n,slug=slug,name=r['name'],scientific=r['scientific_name'],category=c['category'],url=f'{n:02d}-{slug}.html'))
    assert len(configs)==49 and len({c['scientific'] for c in configs})==49
    (R/'remaining49-specimens.json').write_text(json.dumps(configs,ensure_ascii=False,indent=2))
    (R/'remaining49-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2))
    print('Built 49 individually observed configurations, numbers 35–83')
if __name__=='__main__':main()
