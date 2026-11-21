"""Photo-specific shape observations; parameters approximate hidden geometry."""
from pathlib import Path
import json, hashlib, shutil, sys
R=Path(__file__).resolve().parent
records=json.loads((R/'cup26-reference-records.json').read_text())
old=json.loads((R/'specimens.json').read_text())+[json.loads((R/'cosmos-specimen.json').read_text())]
def ring(n,length,width,cup,rotation=0,base=.12,profile='rounded'):
 return dict(count=n,length=length,width=width,cup=cup,rotation=rotation,base=base,profile=profile)
def center(radius=.24,count=95,height=.26,color='#edbd25',tip='#f8d345',**kw):
 return dict(type='stamens',radius=radius,count=count,height=height,color=color,tip=tip,filled=True,**kw)
def heads(kind):
 if kind=='pair':return [dict(position=[-.32,2.9,0],scale=.88,tilt=[.08,-.08]),dict(position=[1.08,2.35,.20],scale=.52,tilt=[.20,-.22],delay=.06)]
 if kind=='trio':return [dict(position=[0,2.8,.20],scale=.76,tilt=[.04,-.04]),dict(position=[1.08,3.32,-.25],scale=.48,tilt=[.12,-.16],delay=.05),dict(position=[-.98,2.24,-.30],scale=.46,tilt=[-.10,.18],delay=.09)]
 return [dict(position=[0,2.85,0],scale=1,tilt=[0,-.05])]
def spec(id,slug,rings,cc,leaf,focus,*,arr='single',edge='fine',ruffle=.012,bud='round',shed=False,curve=None,morph=None):
 return dict(sourceId=id,slug=slug,rings=rings,center=cc,leaf=leaf,focus=focus,layout='branch',heads=heads(arr),profile='rounded',edge=edge,ruffle=ruffle,
  bud=dict(type=bud,count=5 if not shed else 2,radius=.30,height=1.15,shed=shed),
  curvature=curve or dict(edgeLift=.12,tipCurl=.085,edgeRoll=.72,uprightLift=.14,fineFold=.003),
  morphology=morph or {},lighting=dict(key=[-4,7,4],keyIntensity=2.65,ambient=.58,fill=.22,rim=.65,exposure=1.03))
S=[
spec('051','white-peony',[ring(5,1.46,.78,.16),ring(3,1.20,.69,.29,.57)],center(.28,125,.32), 'palmate', ['白色宽瓣错落相接，金黄花蕊密集','外层舒展、内层略向上抱合，保留瓣缘轻皱','对照白瓣受光面与灰绿阴影的变化'],arr='pair',edge='ruffle',ruffle=.035,morph={'carpels':3}),
spec('052','white-prickly-poppy',[ring(3,1.56,.98,.20),ring(3,1.42,.94,.27,1.047)],center(.23,110,.22), 'spiny', ['六枚宽白瓣构成浅杯，瓣缘有细密起伏','黄色花心中央保留暗红柱头','保留白瓣细纹与自然明暗'],edge='ruffle',ruffle=.045,shed=True,morph={'stigmaColor':'#793433'}),
spec('053','matilija-poppy',[ring(3,1.65,1.05,.16),ring(3,1.54,1.00,.23,1.047)],center(.34,190,.42,tip='#efa311'), 'divided', ['六枚宽白瓣，褶皱沿瓣面向外展开','隆起的金黄花蕊呈饱满团簇','花缘轻卷，保留独立瓣片的轮廓'],edge='ruffle',ruffle=.050,shed=True,curve=dict(edgeLift=.16,tipCurl=.10,edgeRoll=.9,uprightLift=.14,fineFold=.010),morph={'stigmaColor':'#d2ba54'}),
spec('174','red-maids',[ring(5,1.37,.72,.30)],dict(type='stamens',radius=.24,count=34,height=.62,color='#a72573',tip='#c19d49',filled=False), 'none', ['五枚亮玫紫宽瓣围成浅碟','细长紫红花丝向上展开，顶端浅色花药','花瓣微卷，中央花蕊高于瓣面'],ruffle=.015,morph={'style':True}),
spec('176','pink-evening-primrose',[ring(4,1.48,1.03,.29)],center(.20,8,.56,color='#eee9c4',tip='#f4ebc0'), 'lance', ['四枚浅粉宽瓣，瓣面紫粉细脉清楚','黄绿色花喉与十字形柱头','花瓣边缘略有缺口，形成清晰的四瓣浅杯'],arr='pair',edge='notch',morph={'crossStigma':True,'styleHeight':.72,'styleColor':'#dfdfa3'}),
spec('213','corn-poppy',[ring(2,1.53,1.02,.28),ring(2,1.46,1.0,.37,1.571)],dict(type='poppy',radius=.25,count=105,height=.28,color='#3c1c2d',tip='#33212c',filled=False), 'divided', ['四枚薄红宽瓣，两两交叠但边界清晰','瓣根深红近黑，围绕绿色放射状柱头','花瓣有柔和褶皱，盛开保持上扬'],edge='ruffle',ruffle=.043,shed=True),
spec('218','japanese-camellia',[ring(6,1.35,.74,.46)],center(.20,95,.75,color='#efbeb0',tip='#f0c72a'), 'serrate', ['红色厚实宽瓣围成开口浅碗','浅粉花丝与金黄花药形成突出的中央花束','花瓣交叠紧密，边缘光滑而立挺'],curve=dict(edgeLift=.14,tipCurl=.11,edgeRoll=.75,uprightLift=.16,fineFold=.002)),
spec('301','sunset-hibiscus',[ring(5,1.65,.96,.40)],dict(type='column',radius=.16,count=48,height=.85,color='#dccd72',tip='#9c3029'), 'palmate', ['五枚奶油黄宽瓣围成漏斗浅杯','深酒红花喉，中央花柱与五个深色柱头突出','花瓣纵向纹理和微卷边缘分明'],ruffle=.018,bud='pointed',morph={'darkThroat':'#371b20'}),
spec('312','yellow-prickly-poppy',[ring(3,1.39,.86,.46),ring(3,1.23,.79,.57,1.047)],center(.20,85,.42,color='#e3cc62',tip='#edcf54'), 'spiny', ['六枚黄色宽瓣形成较深杯口','浅黄花丝中央保留红褐柱头','花瓣薄皱，与带刺萼叶形成区别'],edge='ruffle',ruffle=.035,shed=True,morph={'stigmaColor':'#762331'}),
spec('320','tea-flower',[ring(5,1.15,.72,.22)],center(.32,150,.43,color='#ead486',tip='#e2b944'), 'serrate', ['小型白色圆瓣围住密集金黄花蕊','花瓣浅杯上扬，宽卵形茶叶有锯齿','白瓣中的浅灰阴影与黄色花心分开'],arr='pair'),
spec('327','flowering-quince',[ring(5,1.25,.73,.20)],center(.24,45,.29,color='#c5a578',tip='#ac8c43'), 'serrate', ['五枚珊瑚粉圆瓣，瓣片相接但可辨','浅褐金色花蕊集中，花朵沿枝分布','花瓣厚润，杯口较浅'],arr='trio'),
spec('337','chocolate-cosmos',[ring(8,1.33,.36,.20,profile='oval',base=.22)],dict(type='disk',radius=.25,count=28,height=.22,color='#451329',tip='#edd47b'), 'divided', ['八枚深酒红长圆瓣，瓣端轻尖','深红小花盘点缀黄色花药','保留红紫明暗与纵向脉络，瓣缘微卷'],curve=dict(edgeLift=.10,tipCurl=.065,edgeRoll=.65,uprightLift=.13,fineFold=.003)),
spec('347','bush-poppy',[ring(4,1.48,.84,.27)],center(.21,95,.27,color='#c59411',tip='#d7a91e'), 'grayoval', ['四枚明黄宽瓣，花瓣间保留分界','中央花蕊为紧凑金黄色团簇','花瓣略起伏，保持上扬的杯面'],edge='ruffle',ruffle=.025,shed=True),
spec('360','tufted-poppy',[ring(4,1.34,.79,.63)],center(.12,28,.31,color='#caa227',tip='#d6b13b'), 'divided', ['四枚亮黄薄瓣形成较高的杯口','杯内保留较深金黄阴影，瓣端圆润','狭长花苞逐渐张为半开与盛开'],bud='pointed',shed=True,curve=dict(edgeLift=.13,tipCurl=.10,edgeRoll=.7,uprightLift=.18,fineFold=.002)),
spec('376','common-rock-rose',[ring(5,1.36,.74,.26)],center(.21,80,.25,color='#dea523',tip='#eeb727'), 'lance', ['五枚宽薄黄瓣，轻皱的边缘彼此可辨','小型金黄花蕊团位于花面中央','保留黄瓣纵向细纹和上扬的侧影'],edge='ruffle',ruffle=.036),
spec('380','christmas-rose',[ring(5,1.32,.73,.23)],center(.22,52,.40,color='#dce1a5',tip='#e4d98e'), 'palmate', ['五枚厚实白色花被片，外轮廓较圆','中央浅黄雄蕊和绿白雌蕊分层','白瓣保留冷灰阴影，浅杯姿态挺立'],arr='trio',morph={'carpels':5,'nectaries':True}),
spec('404','common-flax',[ring(5,1.23,.62,.15)],center(.10,5,.20,color='#ccd4e9',tip='#e5dfa8'), 'linear', ['五枚淡蓝紫宽瓣，细脉向白色瓣根汇集','淡黄绿色花心，花面轻微内凹','多个花头错落展开，保留独立花瓣'],arr='trio',morph={'style':True}),
spec('419','missouri-primrose',[ring(4,1.54,1.04,.45)],center(.18,8,.57,color='#c8c03f',tip='#dad262'), 'lance', ['四枚宽黄瓣构成杯碗，瓣缘起伏','细长花丝与十字形柱头明显突出','杯内深黄阴影和瓣面亮黄细纹分开'],edge='ruffle',ruffle=.025,bud='pointed',morph={'crossStigma':True,'styleHeight':.82,'styleColor':'#c7c54b'}),
spec('423','wood-sorrel',[ring(5,1.19,.51,.23)],center(.10,10,.18,color='#d2cf7c',tip='#e0ce54'), 'trifoliate', ['五枚白色长圆瓣，清晰紫色脉纹','花心浅黄绿，瓣根聚拢而瓣端微展','数朵小花轻盈错落，叶片为三出心形'],arr='trio',edge='notch',morph={'style':True}),
spec('425','himalayan-peony',[ring(3,1.43,.84,.23),ring(4,1.25,.70,.34,.8)],center(.28,115,.37,color='#d8ae31',tip='#ecc85e'), 'palmate', ['白色宽瓣环抱金黄色花心','瓣缘浅波浪，内外层稍有错落','依据远景原图保留舒展、向上的花面'],edge='ruffle',ruffle=.022,morph={'carpels':3}),
spec('426','fernleaf-peony',[ring(5,1.40,.78,.64),ring(3,1.16,.70,.73,.47)],center(.30,130,.43,color='#ecb620',tip='#f3cf34'), 'filigree', ['红色宽瓣围出圆润杯碗，内外瓣相接','饱满金黄花蕊与深红瓣根对比鲜明','花下保留纤细分裂叶，花面立挺'],edge='ruffle',ruffle=.018,morph={'carpels':3}),
spec('444','dog-rose',[ring(5,1.38,.80,.16)],center(.24,70,.28,color='#d8c58b',tip='#cba956'), 'compound', ['五枚近白带淡粉的心形宽瓣','金黄细蕊簇集中，瓣端有轻微缺口','花朵沿枝疏松排列，保持浅碟形'],arr='pair',edge='notch')
]
byid={r['id']:r for r in records};new=[]
source_root=Path(sys.argv[1]) if len(sys.argv)>1 else None
for n,c in enumerate(S,13):
 r=byid[c['sourceId']];c.update(number=n,name=r['name'],scientific=r['scientific_name'],category='杯状／盘状微凹型',photo='assets/'+c['slug']+'.jpg',source=r['source_metadata'],source_sha256=r['sha256'],revision='V4 · 杯状／盘状微凹型扩展',note='以这张实拍中的花型、纹理与明暗为参照；可见瓣片有遮挡时，片数和背面形态作近似。花苞与展开路径属于建模推定。')
 if source_root:
  p=source_root/r['paths'][0];assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256'];shutil.copyfile(p,R/c['photo'])
 assert hashlib.sha256((R/c['photo']).read_bytes()).hexdigest()==r['sha256']
 c['note'] += (' 原图为侧背面，花心不可完整辨认，花心细节为推定。' if c['sourceId']=='360' else '')
 new.append(c)
(R/'cup26-specimens.json').write_text(json.dumps(new,ensure_ascii=False,indent=2))
all_by_scientific={c['scientific']:c for c in old+new}
review=[]
for i,r in enumerate(records,1):
 c=all_by_scientific[r['scientific_name']];assert c['source_sha256']==r['sha256']
 review.append(dict(order=i,sourceId=r['id'],slug=c['slug'],name=c['name'],scientific=c['scientific'],number=c['number'],url=f"{c['number']:02d}-{c['slug']}.html",baseline=c in old))
(R/'cup26-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2))
print(f'{len(new)} new specimens; {len(review)} entries in the source classification; {len(old)+len(new)} unique studies')
