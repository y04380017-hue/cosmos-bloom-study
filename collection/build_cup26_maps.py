"""Extract untouched source pixels along individually inspected petal ribbons."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import distance_transform_edt
from build_photo_maps import sample,pack
R=Path(__file__).resolve().parent
def hue_range(h,lo,hi):return ((h>=lo)&(h<=hi)) if lo<hi else ((h>=lo)|(h<=hi))
def mask_pixels(rgb,m):
 h,s,v=(np.asarray(Image.fromarray(rgb).convert('HSV'),dtype=float)/255).transpose(2,0,1)
 mode=m.get('mode')
 if mode=='white' or 'max_saturation' in m:
  valid=s<m.get('saturationMax',m.get('max_saturation',.35))
  if 'allow_hue' in m:valid|=hue_range(h,*m['allow_hue'])
 elif mode=='pale-pink':valid=(s<.10)|hue_range(h,m['hueMin'],m['hueMax'])
 elif mode=='cream-and-eye':valid=(s<.22)|hue_range(h,.09,.20)|((hue_range(h,.92,.07))&(v<.45))
 else:
  lo,hi=m.get('hue',[m.get('hueMin'),m.get('hueMax')]);valid=hue_range(h,lo,hi)&(s>m.get('saturationMin',m.get('min_saturation',.2)))
  if m.get('allow_low_saturation_highlights'):valid|=(s<.10)&(v>.60)
 return valid&(v>m.get('valueMin',m.get('min_value',.2)))
def ribbon(im,points,mask):
 w,h=im.size;p0,p1,p2=[np.array(p)*[w-1,h-1] for p in points[:3]];half=points[3]
 t=np.linspace(0,1,256)[:,None];u=np.linspace(-1,1,128)[None,:,None]
 mid=(1-t)**2*p0+2*t*(1-t)*p1+t*t*p2
 tangent=2*(1-t)*(p1-p0)+2*t*(p2-p1);side=np.stack([-tangent[:,1],tangent[:,0]],axis=1);side/=np.linalg.norm(side,axis=1)[:,None]
 width=half*w*(.22+.78*np.sin(np.pi*t[:,0])**.65)
 rgb=sample(im,mid[:,None,:]+u*side[:,None,:]*width[:,None,None]);valid=mask_pixels(rgb,mask);coverage=float(valid.mean())
 assert coverage>.90,('Texture ribbon needs inspection',coverage)
 nearest=distance_transform_edt(~valid,return_distances=False,return_indices=True);rgb[~valid]=rgb[nearest[0][~valid],nearest[1][~valid]]
 return rgb,coverage
def main():
 obs={x['id']:x for x in json.loads((R/'cup26-photo-observations.json').read_text())};configs=json.loads((R/'cup26-specimens.json').read_text())
 qa=R.parent.parent/'qa/cup26';qa.mkdir(exist_ok=True,parents=True)
 for start in range(0,len(configs),8):
  sheet=Image.new('RGB',(len(configs[start:start+8])*170,420),'#edf0e8');draw=ImageDraw.Draw(sheet)
  for n,c in enumerate(configs[start:start+8]):
   item=obs[c['sourceId']];im=Image.open(R/c['photo']).convert('RGB');assert hashlib.sha256((R/c['photo']).read_bytes()).hexdigest()==c['source_sha256']
   petals=[];fractions=[]
   for i,points in enumerate(item['ribbons']):
    rgb,cov=ribbon(im,points,item['mask']);petals.append(pack(rgb,c['slug']+':petal-'+str(i)));fractions.append(round(cov,4));sheet.paste(Image.fromarray(rgb).resize((78,260)),(n*170+i*82,25))
   x,y,r=item.get('centerCrop',item.get('center_crop'));w,h=im.size;xs,ys=np.meshgrid(np.linspace((x-r)*w,(x+r)*w,64),np.linspace((y-r)*h,(y+r)*h,64));center=pack(sample(im,np.stack([xs,ys],axis=2)),c['slug']+':center')
   data=dict(source_sha256=c['source_sha256'],method='inspected reference-photo ribbons; grayscale high-pass relief (not measured depth)',petals=petals,center=center,bumpScale=.012 if c['ruffle']>.03 else .006,roughness=.57 if c['sourceId'] in ['218','327'] else .63,sourceRibbons=item['ribbons'],validSampleFractions=fractions)
   (R/'textures'/f"{c['slug']}.json").write_text(json.dumps(data,separators=(',',':')))
   draw.text((n*170,5),c['sourceId']+' '+c['slug'][:17],fill='#273c30');draw.text((n*170,290),str(fractions),fill='#273c30');im.thumbnail((165,100));sheet.paste(im,(n*170,315))
   print(c['sourceId'],c['slug'],fractions)
  sheet.save(qa/f'textures-{start//8+1}.jpg')
if __name__=='__main__':main()
