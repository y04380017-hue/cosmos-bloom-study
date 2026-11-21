from pathlib import Path
import json
R=Path(__file__).resolve().parent
tones=json.loads((R/'reference-tones.json').read_text())
# edge lift, distal curl, twist, fine fold, rolled margin, per-petal bend.
curves={
'calendula':(.065,-.055,.020,.016,.40,[.03,-.04,.02,-.03]),
'california-poppy':(.120,-.065,.025,.014,.55,[.07,-.03,.035,-.025]),
'scarlet-flax':(.080,-.025,.025,.009,.30,[.09,.015,-.045,-.035,.045]),
'kerria':(.045,.018,.018,.012,.28,[.02,-.025,.035,-.02,.01]),
'long-headed-poppy':(.110,-.035,.055,.025,.72,[.12,-.035,.055,-.075]),
'blanket-flower':(.085,-.045,.025,.020,.50,[.08,.04,-.015,-.05,-.08,-.04,.01,.03,.07]),
'phlox':(.035,-.022,.012,.006,.20,[.01,-.018,.012,-.005,.008]),
'spiraea':(.025,-.012,.009,.004,.15,[.015,-.01,.008,-.005,.01]),
'blue-flax':(.040,-.028,.018,.008,.24,[.025,-.025,.035,-.01,.015]),
'carnation':(.060,-.035,.024,.012,.38,[.06,-.025,.035,-.02,.01]),
'rockrose':(.140,-.045,.055,.035,.85,[.10,-.04,.055,-.06,.035])}
base={'calendula':'#edbf08','california-poppy':'#c88a03','scarlet-flax':'#510309','kerria':'#e6b018','long-headed-poppy':'#69170e','blanket-flower':'#9d1225','phlox':'#b51b7a','spiraea':'#d7dcc6','blue-flax':'#dce3fa','carnation':'#efd3eb','rockrose':'#ba80bc'}
grooves={'calendula':(.28,3.5),'california-poppy':(.18,3),'scarlet-flax':(.12,3),'kerria':(.12,3),'long-headed-poppy':(.26,4.5),'blanket-flower':(.25,4.5),'phlox':(.10,3),'spiraea':(.08,2),'blue-flax':(.25,5),'carnation':(.14,4),'rockrose':(.30,4.5)}
result={}
for slug,curve in curves.items():
 edge,tip,twist,fold,roll,bends=curve;strength,count=grooves[slug]
 result[slug]={'appearance':{'shadow':tones[slug]['shadow'],'highlight':tones[slug]['light'],'grooveStrength':strength*.60,'grooveCount':count,'variation':.035,'rimLight':.17,'layerShade':.62 if slug=='calendula' else 0},'curvature':{'edgeLift':edge,'tipCurl':tip,'twist':twist,'fineFold':fold*.25,'edgeRoll':roll,'bendByPetal':bends},'color':tones[slug]['body'],'baseColor':base[slug],'lighting':{'key':[4,9,4] if slug in ['long-headed-poppy','rockrose','scarlet-flax'] else [-3.5,9,4],'keyIntensity':3.0,'ambient':.72,'fill':.24,'exposure':1.0},'revision':'V3 · 立体薄壳、原图纹理与光影'}
 if slug!='blanket-flower':result[slug]['tipColor']=tones[slug]['light']
 if slug=='phlox':result[slug].update(eye=.48,color='#f6d2f2',tipColor='#ffe4fa')
 if slug=='blue-flax':result[slug]['veinColor']='#5c77c9'
 if slug=='calendula':result[slug]['color']='#f9b10a'
 if slug=='spiraea':result[slug]['color']='#f2f3f3'
# V3: firm upward cups; the old negative bends are intentionally superseded.
for slug,r in result.items():
 cur=r['curvature'];cur.update(tipCurl=.10 if slug in ['california-poppy','long-headed-poppy','rockrose'] else .065,
  edgeLift=.18 if slug in ['california-poppy','long-headed-poppy','rockrose'] else .115,
  edgeRoll=.85 if slug in ['long-headed-poppy','rockrose'] else .65,
  uprightLift=.15 if slug not in ['spiraea','phlox'] else .095,
  bendByPetal=[.02,.03,.015,.025,.02],twist=0)
 r['lighting'].update(keyIntensity=2.65,ambient=.58,fill=.22,rim=.65,exposure=1.03)
(R/'appearance-refinements.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
