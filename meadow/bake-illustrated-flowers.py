"""Paint the interactive meadow's transparent, root-registered 2D bloom sequence."""
import json
import math
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
CATALOG = HERE.parent / 'collection'
CELL = 112
AA = 3
FRAMES = 7
ROOT = (56, 107)
SUN = (255, 247, 218)
PIGMENTS = {
    '黄': (255, 213, 91), '橙': (255, 169, 93), '白': (249, 243, 222),
    '乳白': (254, 240, 208), '蓝': (125, 190, 245), '红': (243, 120, 129),
    '酒红': (184, 96, 122), '粉红': (245, 172, 193), '珊瑚粉': (251, 155, 157),
    '紫': (184, 154, 228),
}


def mix(a, b, f):
    return tuple(round(u + (v-u)*f) for u, v in zip(a, b))


def cubic(points, n=10):
    a, b, c, d = points
    return [tuple((1-t)**3*a[i]+3*(1-t)**2*t*b[i]+3*(1-t)*t*t*c[i]+t**3*d[i]
                  for i in (0, 1)) for t in (j/n for j in range(n+1))]


class Painting:
    def __init__(self):
        self.image = Image.new('RGBA', (CELL*AA, CELL*AA))
        self.pen = ImageDraw.Draw(self.image)

    def polygon(self, points, color):
        self.pen.polygon([(round(x*AA),round(y*AA)) for x,y in points], color)

    def line(self, points, color, width):
        self.pen.line([(round(x*AA),round(y*AA)) for x,y in points],
                      fill=color, width=max(1, round(width*AA)), joint='curve')

    def dot(self, x, y, rx, ry, color):
        self.pen.ellipse(tuple(round(v*AA) for v in (x-rx,y-ry,x+rx,y+ry)), color)


def leaf(canvas, start, end, width, light):
    x,y = start
    dx,dy = end[0]-x,end[1]-y
    L = math.hypot(dx,dy) or 1
    px,py = -dy/L*width,dx/L*width
    mid = (x+dx*.54+px*.15,y+dy*.54+py*.15)
    top = cubic([start, (x+dx*.24+px,y+dy*.24+py), (x+dx*.70+px*.63,y+dy*.70+py*.63),end])
    under = cubic([end, (x+dx*.70-px*.72,y+dy*.70-py*.72), (x+dx*.23-px*.56,y+dy*.23-py*.56),start])
    canvas.polygon(top+under, light)
    canvas.polygon(under+[mid], mix(light,(71,130,106),.40))


def plant(canvas, cfg, heads, seed):
    rand=Random(seed)
    for j,(x,y,radius,_,_) in enumerate(heads):
        root=ROOT if j==0 else (54.5+(x-56)*.10, 81+(8 if j%2 else 0))
        bend=rand.uniform(-3.5,3.5)
        stem=cubic([root,(root[0]+bend,root[1]-12),
                    (x+bend*1.8,y+11), (x,y+.5)])
        canvas.line(stem,(104,148,98),max(.52,min(1.65,radius*.052)))
    x,y=heads[0][:2]
    if len(heads)>1:
        canvas.line(cubic([ROOT,(53,95),(55,85),(54.5,77)]),(108,153,99),1.4)
    narrow=cfg.get('leaf') in ('linear','grass','lance','needle')
    for j,side in enumerate((-1,1,-1,1)):
        t=.22+j*.115
        base=(ROOT[0]+(x-ROOT[0])*t, ROOT[1]+(y-ROOT[1])*t)
        lx=side*rand.uniform(10,21)
        ly=rand.uniform(6,16)
        color=mix((114,177,116),(177,207,117),rand.uniform(0,.55))
        leaf(canvas,base,(base[0]+lx,base[1]-ly),rand.uniform(2.2,3.6) if narrow else rand.uniform(4.3,6.7),color)


def petal_outline(profile):
    if profile in ('ray','lanceolate'):
        return (.44,.91,.87,.09)
    if profile in ('clawed','fan','obovate','trilobe','trilobed','heart'):
        return (.81,1.17,.89,.20)
    return (.56,1.04,.91,.17)


def head(canvas, cfg, spec, head_info, progress, seed):
    cx,cy,radius,delay,lean=head_info
    p=max(.0,min(1.,(progress-delay)/(1-delay)))
    angle_open=.14+1.37*p
    spread=math.sin(angle_open)
    lift=math.cos(angle_open)
    rand=Random(seed)
    color=PIGMENTS[spec['sourceColorLabel']]
    # Keep cultivar hue variations within each source family.
    paint=cfg.get('color')
    if paint and len(paint)==7 and spec['sourceColorLabel']!='白':
        tint=tuple(int(paint[i:i+2],16) for i in (1,3,5))
        color=mix(color,tint,.13)
    shade=mix(color,(148,137,194),.34)
    if spec['sourceColorLabel'] in ('白','乳白'):
        shade=(207,202,221)
    rings=cfg.get('rings') or [{'length':1.,'width':.5,'count':6}]
    longest=max(r['length'] for r in rings)
    phase=rand.uniform(-.6,.6)
    if p>.12 and rings[0]['width']/longest>.31:
        throat=radius*(.17+.17*p)
        canvas.dot(cx,cy-.63*radius*lift,throat,throat*(.50+.10*spread),shade)
    for k,ring in enumerate(rings):
        n=ring['count']
        prof=ring.get('profile') or cfg.get('profile') or 'oval'
        w0,w1,tip,neck=petal_outline(prof)
        petals=[]
        for i in range(n):
            angle=phase+float(ring.get('rotation',0))+i*math.tau/n+rand.uniform(-.035,.035)
            ax,az=math.cos(angle),math.sin(angle)
            L=radius*ring['length']/longest*rand.uniform(.96,1.035)
            # Width in the source config describes petal half breadth.
            W=L*min(.84,ring['width']/ring['length']*1.14)
            W*=.40+.60*spread
            anchor=L*(.12+.035*k)
            def P(t,w):
                radial=t*L*spread+anchor
                up=L*(lift*.74*t + (.07+.04*(1-p))*math.sin(t*math.pi))
                x=cx+ax*radial-az*w*W+lean*up*.12
                y=cy+az*radial*.62+ax*w*W*.62-up-.5*k
                return (x,y)
            # Build in local petal space to keep individual silhouettes while opening.
            left=cubic([P(0,0),P(.16,-neck),P(w0,-1),P(tip,-.80)])
            if prof in ('ray','lanceolate'):
                cap=cubic([left[-1],P(.96,-.48),P(1,.16),P(tip,.48)])
            elif prof in ('heart','trilobe','trilobed','fan','clawed') or cfg.get('edge') in ('notched','serrate'):
                cap=cubic([left[-1],P(w1,-.60),P(1.09,-.28),P(.95,-.07)],6)
                cap+=cubic([cap[-1],P(.99,.11),P(1.12,.48),P(tip,.80)],6)
            else:
                cap=cubic([left[-1],P(1.12,-.54),P(1.09,.67),P(tip,.80)])
            right=cubic([cap[-1],P(w0,.99),P(.17,neck),P(0,0)])
            # Back and front rows are painted separately in projection.
            illum=(-ax*.58-az*.39+1)*.50
            face=mix(mix(shade,color,.59+.34*p),SUN,.045+.17*illum+.018*k)
            under=mix(shade,face,.15)
            rim=mix(face,SUN,.54)
            fold=cubic([P(0,0),P(.20,-.05),P(.51,-.45),P(.66,-.87)])
            cup=cubic([P(.03,-.06),P(.19,-.40),P(.36,-.58),P(.47,-.52)],6)
            cup+=cubic([cup[-1],P(.31,-.15),P(.25,.13),P(.14,.22)],5)
            petals.append((az,left,cap,right,fold,cup,face,under,rim,illum,L))
        petals.sort(key=lambda item:item[0])
        for _,left,cap,right,fold,cup,face,under,rim,illum,L in petals:
            canvas.polygon(left+cap+right,under)
            canvas.polygon(fold+left[6:]+cap+right,face)
            if L>8:
                canvas.polygon(cup,mix(face,under,.54))
            if illum>.43 and L>8:
                canvas.line(left[8:]+cap[1:max(2,len(cap)//2)],rim,min(.77,L*.033))
    if p>.22:
        cr=cfg.get('center',{})
        raw=cr.get('color','#e9be58')
        center_color=tuple(int(raw[i:i+2],16) for i in (1,3,5))
        center_color=mix(center_color,(239,203,114),.35)
        ratio=max(.069,min(.26,cr.get('radius',.17)/longest))
        size=radius*ratio*(.22+.78*p)
        canvas.dot(cx,cy-.45,size,size*.68,mix(center_color,(162,127,118),.34))
        canvas.dot(cx-size*.08,cy-size*.22-.45,size*.89,size*.48,center_color)
        if size>2:
            for j in range(min(12, max(3,int(size*1.45)))):
                rad=math.sqrt(rand.random())*size*.86
                ang=rand.random()*math.tau
                canvas.dot(cx+math.cos(ang)*rad,cy-.7+math.sin(ang)*rad*.48,
                           .38,.38,mix(center_color,SUN,.56))


def layout(cfg,seed):
    rand=Random(seed)
    raw=cfg.get('heads')
    if not raw:
        arr={'flax':[(-.45,2.85,.09,.79),(.85,2.3,.2,.52)],
             'phlox':[(-.52,2.75,.30,.59),(.62,2.70,.42,.58),(.16,3.18,-.26,.55)],
             'spiraea':[(math.cos(i*2.4)*math.sqrt(i)*.34,2.93+math.sin(i)*.15,math.sin(i*2.4)*math.sqrt(i)*.30,.31) for i in range(11)]}
        raw=[{'position':[a,b,c],'scale':d} for a,b,c,d in arr.get(cfg.get('layout'),[(0,2.85,0,.99)])]
    positions=[]
    for h in raw:
        x,y,z=h['position']
        sx=x*26+z*5
        sy=-y*23+z*13
        radius=34*h['scale']
        positions.append((sx+3.0,sy,radius,h.get('delay',0)*.64,rand.uniform(-1,1)))
    width=max(abs(x)+r*1.19 for x,y,r,*_ in positions)
    top=max(-y+r*1.02 for x,y,r,*_ in positions)
    fit=min(1.05,51/max(1,width),102/max(1,top))
    return [(ROOT[0]+x*fit,ROOT[1]+y*fit,r*fit,d,tilt) for x,y,r,d,tilt in positions]


def main():
    data={}
    for file in ('specimens','cup26-specimens','remaining49-specimens'):
        for cfg in json.loads((CATALOG/(file+'.json')).read_text()):
            data[cfg['slug']]=cfg
    cosmos=json.loads((CATALOG/'cosmos-specimen.json').read_text())
    data[cosmos['slug']]=cosmos
    species=json.loads((HERE/'catalog.json').read_text())
    atlas=Image.new('RGBA',(CELL*FRAMES,CELL*len(species)))
    for row,spec in enumerate(species):
        cfg=data[spec['slug']]
        heads=layout(cfg,row+1)
        for frame in range(FRAMES):
            painting=Painting()
            plant(painting,cfg,heads,row+1)
            for j,h in sorted(enumerate(heads),key=lambda pair:pair[1][1]):
                head(painting,cfg,spec,h,frame/(FRAMES-1),row*123+j)
            cell=painting.image.resize((CELL,CELL),Image.Resampling.LANCZOS)
            atlas.paste(cell,(frame*CELL,row*CELL))
    atlas.save(HERE/'illustrated-flowers.webp',lossless=True,method=4)


if __name__=='__main__':
    main()
