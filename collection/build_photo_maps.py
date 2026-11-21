"""Extract directional petal textures from the unchanged reference JPEGs.

Coordinates are manually selected on visible petals, in normalized image space.
Each ribbon follows root → mid → tip and stays inside that petal. Pixels outside
the pigment mask are replaced by the nearest valid sample in the same ribbon.
The grayscale high-pass map describes fine relief, not literal surface depth.
"""
from pathlib import Path
import json, base64, hashlib
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy.ndimage import map_coordinates, distance_transform_edt
R=Path(__file__).resolve().parent
# root, middle, tip, maximum half-width; two independently sampled petals.
P={
'calendula': [([.50,.35],[.48,.23],[.465,.075],.033),([.59,.57],[.63,.67],[.66,.77],.026)],
'california-poppy':[([.625,.685],[.615,.55],[.62,.42],.075),([.655,.71],[.735,.67],[.79,.60],.060)],
'scarlet-flax':[([.295,.558],[.36,.60],[.445,.60],.036),([.38,.46],[.47,.39],[.54,.32],.049)],
'kerria':[([.52,.40],[.58,.30],[.63,.18],.075),([.39,.52],[.30,.55],[.17,.56],.070)],
'long-headed-poppy':[([.50,.387],[.50,.28],[.50,.17],.09),([.645,.48],[.74,.46],[.855,.44],.085)],
'blanket-flower':[([.49,.37],[.49,.24],[.49,.075],.018),([.54,.35],[.56,.23],[.557,.085],.013)],
'phlox':[([.550,.499],[.536,.447],[.522,.390],.040),([.567,.514],[.610,.485],[.650,.456],.035)],
'spiraea':[([.315,.218],[.329,.211],[.342,.205],.008),([.363,.361],[.360,.376],[.356,.392],.009)],
'blue-flax':[([.323,.648],[.332,.587],[.34,.522],.037),([.335,.70],[.385,.712],[.422,.738],.043)],
'carnation':[([.280,.303],[.269,.235],[.262,.155],.047),([.308,.301],[.358,.254],[.397,.205],.042)],
'rockrose':[([.48,.43],[.49,.31],[.50,.18],.095),([.42,.53],[.33,.55],[.21,.55],.080)],
'cosmos':[([.425,.375],[.424,.305],[.420,.235],.051),([.491,.445],[.553,.393],[.612,.344],.041)]}
C={'calendula':(.52,.43,.065),'california-poppy':(.625,.70,.042),'scarlet-flax':(.28,.50,.043),'kerria':(.48,.49,.045),'long-headed-poppy':(.47,.50,.036),'blanket-flower':(.49,.48,.073),'phlox':(.56,.51,.014),'spiraea':(.49,.42,.009),'blue-flax':(.31,.70,.018),'carnation':(.285,.318,.014),'rockrose':(.50,.51,.056),'cosmos':(.438,.469,.042)}
HUES={'calendula':(.055,.19),'california-poppy':(.055,.19),'scarlet-flax':(.93,.06),'kerria':(.10,.20),'long-headed-poppy':(.98,.11),'blanket-flower':None,'phlox':(.72,.98),'spiraea':None,'blue-flax':(.53,.80),'carnation':(.70,.97),'rockrose':(.70,.97),'cosmos':(.06,.19)}
SIZE=(128,256)
def pack(rgb,source):
 rgb=np.asarray(rgb,dtype=np.uint8);h,w=rgb.shape[:2]
 gray=Image.fromarray(rgb).convert('L')
 # Remove broad baked lighting; retain fine veins/wrinkles as small relief.
 a=np.asarray(gray,dtype=float);low=np.asarray(gray.filter(ImageFilter.GaussianBlur(4)),dtype=float)
 relief=np.clip(128+(a-low)*2.1,48,208).astype('uint8')
 rgba=np.dstack([rgb,np.full((h,w),255,dtype=np.uint8)])
 height=np.dstack([relief,relief,relief,np.full((h,w),255,dtype=np.uint8)])
 return dict(width=w,height=h,source=source,rgba=base64.b64encode(rgba.tobytes()).decode(),heightRgba=base64.b64encode(height.tobytes()).decode())
def sample(im,coords):
 arr=np.asarray(im,dtype=float)
 return np.stack([map_coordinates(arr[:,:,i],[coords[:,:,1],coords[:,:,0]],order=1,mode='nearest') for i in range(3)],axis=2).clip(0,255).astype('uint8')
def ribbon(im,points,slug):
 w,h=im.size;root,mid,tip,half=points
 p0,p1,p2=[np.array(p)*[w-1,h-1] for p in (root,mid,tip)]
 tw,th=SIZE;t=np.linspace(0,1,th)[:,None];u=np.linspace(-1,1,tw)[None,:,None]
 center=(1-t)**2*p0+2*t*(1-t)*p1+t*t*p2
 tangent=2*(1-t)*(p1-p0)+2*t*(p2-p1);side=np.stack([-tangent[:,1],tangent[:,0]],axis=1);side/=np.linalg.norm(side,axis=1)[:,None]
 width=half*w*(.22+.78*np.sin(np.pi*t[:,0])**.65)
 xy=center[:,None,:]+u*side[:,None,:]*width[:,None,None]
 rgb=sample(im,xy);hsv=np.array(Image.fromarray(rgb).convert('HSV'))/255;hh,ss,vv=hsv[:,:,0],hsv[:,:,1],hsv[:,:,2]
 if slug=='spiraea':valid=(ss<.20)&(vv>.66)
 elif slug=='blanket-flower':valid=((hh<.19)|(hh>.93))&(ss>.32)&(vv>.20)
 else:
  lo,hi=HUES[slug];valid=(((hh>=lo)&(hh<=hi)) if lo<hi else ((hh>=lo)|(hh<=hi)))&(ss>(.055 if slug in ['phlox','carnation','rockrose'] else .20))&(vv>.14)
 coverage=float(valid.mean());assert coverage>.58,(slug,'wrong petal crop',coverage)
 nearest=distance_transform_edt(~valid,return_distances=False,return_indices=True);rgb[~valid]=rgb[nearest[0][~valid],nearest[1][~valid]]
 return rgb,coverage,xy
def main():
 configs=json.loads((R/'specimens.json').read_text())+[json.loads((R/'cosmos-specimen.json').read_text())]
 out=R/'textures';out.mkdir(exist_ok=True);qa=R.parent.parent/'qa/v3';qa.mkdir(exist_ok=True,parents=True)
 sheet=Image.new('RGB',(12*160,430),'#f4f5ef');draw=ImageDraw.Draw(sheet);records=[]
 for n,c in enumerate(configs):
  slug=c['slug'];photo=R/c['photo'];assert hashlib.sha256(photo.read_bytes()).hexdigest()==c['source_sha256'];im=Image.open(photo).convert('RGB');petals=[];coverage=[]
  for i,points in enumerate(P[slug]):
   rgb,cov,xy=ribbon(im,points,slug);petals.append(pack(rgb,slug+':petal-'+str(i)));coverage.append(round(cov,4))
   tile=Image.fromarray(rgb).resize((72,260));sheet.paste(tile,(n*160+i*76,30))
  x,y,r=C[slug];w,h=im.size;xs,ys=np.meshgrid(np.linspace((x-r)*w,(x+r)*w,64),np.linspace((y-r)*h,(y+r)*h,64));center=pack(sample(im,np.stack([xs,ys],axis=2)),slug+':center')
  roughness=.65 if slug in ['long-headed-poppy','rockrose'] else .59
  bump=.013 if slug in ['long-headed-poppy','rockrose'] else .007
  data=dict(source_sha256=c['source_sha256'],method='reference-photo petal ribbons; grayscale high-pass relief',petals=petals,center=center,bumpScale=bump,roughness=roughness,sourceRibbons=P[slug],validSampleFractions=coverage)
  (out/(slug+'.json')).write_text(json.dumps(data,separators=(',',':')))
  draw.text((n*160+2,8),slug,fill='#223e32');draw.text((n*160+2,304),str(coverage),fill='#223e32')
  thumb=im.copy();thumb.thumbnail((152,100));sheet.paste(thumb,(n*160,325));records.append(dict(slug=slug,coverage=coverage))
 sheet.save(qa/'texture-review.jpg');(qa/'texture-extraction.json').write_text(json.dumps(records,indent=2));print(json.dumps(records))
if __name__=='__main__':main()
