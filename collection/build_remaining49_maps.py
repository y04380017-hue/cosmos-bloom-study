"""Extract photo-native pigment/gray relief without recoloring the reference image."""
from pathlib import Path
import json,hashlib,sys
import numpy as np
from PIL import Image,ImageDraw
from build_photo_maps import pack,sample
from build_cup26_maps import ribbon
R=Path(__file__).resolve().parent

def main():
    configs=json.loads((R/'remaining49-specimens.json').read_text());obs={x['id']:x for x in json.loads((R/'remaining49-photo-observations.json').read_text())}
    qa=Path(sys.argv[1]) if len(sys.argv)>1 else R.parent/'.superpowers/remaining49-textures';qa.mkdir(exist_ok=True,parents=True)
    for start in range(0,len(configs),7):
        rows=configs[start:start+7];sheet=Image.new('RGB',(230*len(rows),430),'#edf0e8');draw=ImageDraw.Draw(sheet)
        for n,c in enumerate(rows):
            item=obs[c['sourceId']];im=Image.open(R/c['photo']).convert('RGB');assert hashlib.sha256((R/c['photo']).read_bytes()).hexdigest()==c['source_sha256']
            petals=[];fractions=[]
            for i,points in enumerate(item['ribbons']):
                mask=item.get('masks',[item['mask']]*len(item['ribbons']))[i];rgb,cov=ribbon(im,points,mask);petals.append(pack(rgb,c['slug']+':petal-'+str(i)));fractions.append(round(cov,4));sheet.paste(Image.fromarray(rgb).resize((min(70,220//len(item['ribbons'])),260)),(n*230+i*min(74,224//len(item['ribbons'])),25))
            x,y,r=item['centerCrop'];w,h=im.size;xs,ys=np.meshgrid(np.linspace((x-r)*w,(x+r)*w,64),np.linspace((y-r)*h,(y+r)*h,64));center=pack(sample(im,np.stack([xs,ys],axis=2)),c['slug']+':center')
            data=dict(source_sha256=c['source_sha256'],method='individually inspected photo ribbons; grayscale high-pass relief, not measured depth',petals=petals,center=center,bumpScale=.010 if c['ruffle']>.03 else .006,roughness=.60,sourceRibbons=item['ribbons'],validSampleFractions=fractions)
            (R/'textures'/f"{c['slug']}.json").write_text(json.dumps(data,separators=(',',':')))
            draw.text((n*230,5),c['sourceId']+' '+c['slug'][:24],fill='#273c30');draw.text((n*230,290),str(fractions),fill='#273c30');im.thumbnail((220,100));sheet.paste(im,(n*230,315));print(c['sourceId'],fractions)
        sheet.save(qa/f'textures-{start//7+1}.jpg')
if __name__=='__main__':main()
