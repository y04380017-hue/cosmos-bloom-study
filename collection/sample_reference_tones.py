"""Extract conservative sRGB tonal anchors from manually selected petal ROIs.
These are observed photo colours, not recovered illumination-free albedo.
The original source JPEGs are read only; background and centers are hue-filtered.
"""
from pathlib import Path
import json,numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parent
regions={
 'calendula':([.04,.03,.95,.93],[.065,.18],.50,.30),
 'california-poppy':([.51,.30,.90,.92],[.075,.18],.50,.30),
 'scarlet-flax':([.13,.07,.69,.85],[.94,.045],.60,.18),
 'kerria':([.13,.04,.89,.96],[.10,.19],.45,.35),
 'long-headed-poppy':([.13,.10,.86,.88],[.005,.095],.40,.25),
 'blanket-flower':([.10,.08,.90,.96],[.93,.045],.50,.20),
 'phlox':([.10,.33,.88,.94],[.76,.96],.07,.40),
 'spiraea':([.03,.04,.94,.96],[0,1],0,.62),
 'blue-flax':([.09,.46,.53,.96],[.55,.76],.18,.32),
 'carnation':([.15,.14,.55,.51],[.74,.95],.10,.40),
 'rockrose':([.05,.02,.79,.92],[.72,.93],.13,.28),
 'cosmos':([.12,.20,.73,.87],[.065,.18],.55,.30),
}
result={}
for slug,(roi,hue,minsat,minval) in regions.items():
 p=ROOT/'assets'/f'{slug}.jpg' if slug!='cosmos' else ROOT.parent/'assets/reference.jpg'
 im=Image.open(p).convert('RGB');a=np.asarray(im)/255.;hsv=np.asarray(im.convert('HSV'))/255.;h,s,v=hsv[:,:,0],hsv[:,:,1],hsv[:,:,2]
 x0,y0,x1,y1=roi;inside=np.zeros(h.shape,bool);inside[int(y0*im.height):int(y1*im.height),int(x0*im.width):int(x1*im.width)]=True
 hueok=((h>=hue[0])&(h<=hue[1])) if hue[0]<hue[1] else ((h>=hue[0])|(h<=hue[1]))
 mask=inside&hueok&(s>=minsat)&(v>=minval)
 if slug=='spiraea':mask&=s<.20
 pixels=a[mask];assert len(pixels)>100,slug
 lum=pixels@np.array([.2126,.7152,.0722]);q=np.quantile(lum,[.18,.53,.88])
 colours=[]
 for value in q:
  band=pixels[np.argsort(abs(lum-value))[:max(40,len(pixels)//12)]];rgb=np.median(band,axis=0)
  colours.append('#'+''.join(f'{round(float(x)*255):02x}' for x in rgb))
 result[slug]={'shadow':colours[0],'body':colours[1],'light':colours[2],'sample_count':len(pixels),'roi_normalized':roi,'method':'photo sRGB luminance quantiles 18/53/88 after petal hue and saturation filtering'}
(ROOT/'reference-tones.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({k:[v['shadow'],v['body'],v['light']] for k,v in result.items()},indent=2))
