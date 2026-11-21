from pathlib import Path
import json,base64,html,hashlib,re,io
from PIL import Image,ImageOps
ROOT=Path(__file__).resolve().parent
PROJECT=ROOT.parent
OUT=PROJECT/'dist/flowers';OUT.mkdir(exist_ok=True,parents=True)
configs=json.loads((ROOT/'specimens.json').read_text())+[json.loads((ROOT/'cosmos-specimen.json').read_text())]+json.loads((ROOT/'cup26-specimens.json').read_text())+json.loads((ROOT/'remaining49-specimens.json').read_text())
batch=json.loads((ROOT/'cup26-review.json').read_text())
batch_by_slug={c['slug']:c for c in batch}
remaining=json.loads((ROOT/'remaining49-review.json').read_text())
remaining_by_slug={c['slug']:c for c in remaining}

cosmos_viewer=re.findall(r'<script>([\s\S]*?)</script>',(PROJECT/'prototype.html').read_text())[-1]
template=(ROOT/'page.template.html').read_text();style=(ROOT/'style.css').read_text();engine=(ROOT/'bloom-playback.js').read_text()+'\n'+(ROOT/'petal-surface.js').read_text()+'\n'+(ROOT/'remaining-morphology.js').read_text()+'\n'+(ROOT/'engine.js').read_text();viewer=(ROOT/'viewer.js').read_text();three=(PROJECT/'assets/three.min.js').read_text();license=(PROJECT/'assets/THREE-LICENSE.txt').read_text()
shared=OUT/'shared';shared.mkdir(exist_ok=True)
for name,data in [('style.css',style),('three.min.js',three),('engine.js',engine),('viewer.js',viewer),('THREE-LICENSE.txt',license)]:
 (shared/name).write_text(data)
(OUT/'photos').mkdir(exist_ok=True)
H=html.escape
names=[f"{x['number']:02d}-{x['slug']}.html" for x in configs]
cards={}
for i,c in enumerate(configs):
 c['surfaceMaps']=json.loads((ROOT/'textures'/f"{c['slug']}.json").read_text())
 photo=(ROOT/c['photo']).read_bytes();assert hashlib.sha256(photo).hexdigest()==c['source_sha256']
 uri='photos/'+c['slug']+'.jpg'
 (OUT/uri).write_bytes(photo)
 thumb=ImageOps.exif_transpose(Image.open(io.BytesIO(photo))).convert('RGB');thumb.thumbnail((480,320),Image.Resampling.LANCZOS)
 thumb_bytes=io.BytesIO();thumb.save(thumb_bytes,format='JPEG',quality=78,optimize=True)
 thumb_uri='data:image/jpeg;base64,'+base64.b64encode(thumb_bytes.getvalue()).decode()
 source=c['source'];author=source.get('署名','原材料包记录');source_url=source.get('图源/图库页','');license_url=source.get('许可说明页','')
 credit=H(author)
 if source_url.startswith('https://'):credit+=f' · <a href="{H(source_url,quote=True)}" target="_blank" rel="noopener">原图来源</a>'
 if license_url.startswith('https://'):credit+=f' · <a href="{H(license_url,quote=True)}" target="_blank" rel="noopener">许可说明</a>'
 options=''.join(f'<option value="{names[j]}" {"selected" if j==i else ""}>{j+1:02d} · {H(x["name"])}</option>' for j,x in enumerate(configs))
 values=dict(SLUG=c['slug'],NAME=H(c['name']),NUMBER=f'{i+1:02d}',SCIENTIFIC=H(c['scientific']),CATEGORY=H(c['category']),SUBTITLE=H(c['focus'][0]+'，随时间慢慢展开。'),FOCUS=''.join('<li>'+H(x)+'</li>' for x in c['focus']),NOTE=H(c['note']),PHOTO=uri,CREDIT=credit,HASH=c['source_sha256'],OPTIONS=options,STYLE=style,THREE=three,ENGINE=engine,VIEWER=cosmos_viewer if c.get('runtime')=='cosmos' else viewer,CONFIG=json.dumps(c,ensure_ascii=False).replace('</','<\\/'),LICENSE=license,PREV=names[i-1] if i else 'index.html',PREVLABEL=configs[i-1]['name'] if i else '检查目录',PREVCLASS='',NEXT=names[i+1] if i<len(configs)-1 else 'index.html',NEXTLABEL=configs[i+1]['name'] if i<len(configs)-1 else '全部看完 · 返回目录',NEXTCLASS='')
 if c['slug'] in remaining_by_slug:
  b=remaining_by_slug[c['slug']];j=b['order']-1
  values.update(PREV=remaining[j-1]['url'] if j else 'remaining49.html',PREVLABEL=remaining[j-1]['name'] if j else '本轮49种目录',NEXT=remaining[j+1]['url'] if j<48 else 'remaining49.html',NEXTLABEL=remaining[j+1]['name'] if j<48 else '本轮49种已看完',PREVATTR='data-remaining-prev',NEXTATTR='data-remaining-next',PAGERHOME='remaining49.html',BATCHNOTE=f"本轮 {b['order']:02d} / 49 · 春野版")
 elif c['slug'] in batch_by_slug:
  b=batch_by_slug[c['slug']];j=b['order']-1
  values.update(PREV=batch[j-1]['url'] if j else 'cup26.html',PREVLABEL=batch[j-1]['name'] if j else '杯状26种目录',NEXT=batch[j+1]['url'] if j<25 else 'cup26.html',NEXTLABEL=batch[j+1]['name'] if j<25 else '杯状26种已看完',PREVATTR='data-batch-prev',NEXTATTR='data-batch-next',PAGERHOME='cup26.html',BATCHNOTE=f"杯状 {b['order']:02d} / 26 · 已验收")
 else:values.update(PREVATTR='',NEXTATTR='',PAGERHOME='index.html',BATCHNOTE='原有12种基准 · 已验收')
 values.update(TOTAL=str(len(configs)),REVISION='春野版 · 三阶段',REVIEWSTATE='已验收样株' if c['springReference']==c['slug'] else '春野版')
 page=re.sub(r'__([A-Z]+)__',lambda m:values.get(m.group(1),m.group(0)),template)
 assert not re.findall(r'__[A-Z]+__',page.replace('__THREE__',''))
 (OUT/names[i]).write_text(page)
 badge='已验收样株' if c['springReference']==c['slug'] else '春野版'
 cards[c['slug']]=f'<a class="card" href="{names[i]}"><div class="picture"><img loading="lazy" src="{thumb_uri}" alt="{H(c["name"])}参考原图缩略图"></div><div class="cardbody"><span class="num">{c["number"]:02d} / {len(configs)} · {badge}</span><h2>{H(c["name"])}</h2><em>{H(c["scientific"])}</em><p>{H(c["focus"][0])}</p><span class="enter">检查微开苞 · 半开 · 盛开 ↗</span></div></a>'
gallery='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>__TITLE__ · 开花检查目录</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f6f1;color:#233935;font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif}header{padding:26px 6%;border-bottom:1px solid #dfe4da;display:flex;justify-content:space-between;font-size:12px}a{color:inherit;text-decoration:none}header span{color:#7b887d;font-size:10px;letter-spacing:.1em}main{max-width:1380px;margin:auto;padding:45px 5%}small{letter-spacing:.16em;color:#7a8d7b;font-size:10px}h1{font-size:clamp(26px,4vw,44px);font-weight:500;letter-spacing:-.03em;margin:16px 0}p.intro{color:#647668;font-size:14px;line-height:1.95;max-width:800px}.actions{display:flex;gap:10px;margin:22px 0 35px;flex-wrap:wrap}.actions a{padding:12px 16px;border-radius:6px;border:1px solid #cfd8c7;font-size:12px}.actions a:first-child{background:#315d4e;color:white;border-color:#315d4e}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}.card{border:1px solid #dbe2d4;border-radius:12px;overflow:hidden;background:#fcfcf8;transition:transform .2s,box-shadow .2s}.card:hover{transform:translateY(-4px);box-shadow:0 12px 25px #273e3310}.picture{height:230px;background:#e8ede2;overflow:hidden}.picture img{width:100%;height:100%;object-fit:cover}.cardbody{padding:22px}.num{font-size:10px;color:#79917e;letter-spacing:.14em}h2{font-size:21px;font-weight:500;margin:10px 0 7px}em{font-family:Georgia,serif;font-size:14px;color:#718170}.card p{font-size:12px;color:#63765f;line-height:1.8;min-height:23px}.enter{display:block;font-size:11px;color:#375e49;border-top:1px solid #e2e6db;padding-top:14px;margin-top:17px}.notice{font-size:12px;color:#69796a;line-height:1.9;padding:22px;background:#eaf0e4;border-radius:9px;margin-top:32px}footer{margin-top:40px;border-top:1px solid #dfe4da;padding:22px 6%;font-size:10px;color:#80907f}@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.grid{grid-template-columns:1fr}.picture{height:260px}header span{display:none}main{padding-top:32px}}
</style></head><body><header><a href="index.html">✳ 花开实验室</a><span>REFERENCE-GUIDED BLOOM STUDIES</span></header><main><small>原始实拍对照 / 微开苞 → 半开 → 盛开</small><h1>__TITLE__</h1><p class="intro">__INTRO__</p><div class="actions"><a href="../previous/flowers/index.html">上一版 · 83 种模型</a><a href="../meadow/index.html">进入手势花海</a><a href="remaining49.html">本轮49种 · 逐一检查</a><a href="cup26.html">已验收26种 · 杯状目录</a><a href="baseline12.html">原有12种基准</a><a href="index.html">全部83种</a><a href="__FIRST__">从本组第一朵开始 →</a></div><div class="grid">__CARDS__</div><div class="notice"><strong>卡片展示各品种的原始实拍。进入后可从正面与侧面检查春野版的微开苞、半开和盛开。</strong></div></main><footer>83 STUDIES · 原图对照 / 独立瓣形 / 三阶段连续开合</footer></body></html>'''
groups=[('remaining49.html','花瓣结构 · 本轮49种','本轮新增44种单瓣／扁平型和5种重瓣／多层型，均以已验收的12种为基准。顺序与原材料包一致，编号延续总目录35—83。每页均可查看原图、切换三阶段，并用上一朵／下一朵逐项检查。',[next(c for c in configs if c['slug']==b['slug']) for b in remaining]),
 ('index.html','春野花谱 · 83 种','五株验收样株与 78 种配套花模组成春野花海。选择一种花查看原图、三维形态与三个开花阶段。',configs),
 ('cup26.html','杯状／盘状微凹型 · 26种','依据原分类「花瓣层数与几何结构 → 杯状／盘状微凹型」列出全部26种，顺序与原材料包一致。其中4种来自原有基准，22种来自上一批扩展，本组均已验收。各页底部的上一朵／下一朵会按本组顺序跳转，供你最后逐项检查。',[next(c for c in configs if c['slug']==b['slug']) for b in batch]),
 ('baseline12.html','原有十二种 · 基准目录','保留原有12种花的模型、花瓣纹理和开花动作，包括黄花波斯菊。可随时与本轮扩展的花朵对照检查。',configs[:12])]
for filename,title,intro,items in groups:
 first=f"{items[0]['number']:02d}-{items[0]['slug']}.html"
 display_cards=[cards[c['slug']].replace(f"{c['number']:02d} / {len(configs)}",f"{j+1:02d} / {len(items)} · 总目录 {c['number']:02d}") if filename in ['cup26.html','remaining49.html'] else cards[c['slug']] for j,c in enumerate(items)]
 content=gallery.replace('__CARDS__',''.join(display_cards)).replace('__TITLE__',H(title)).replace('__INTRO__',H(intro)).replace('__FIRST__',first)
 (OUT/filename).write_text(content)
print(json.dumps({'studies':len(names),'newBatch':len(remaining),'acceptedCupBatch':len(batch),'mode':'online-only','output':str(OUT)},ensure_ascii=False))

# Prepare the new online scene without rebuilding or altering the study models.
import runpy
runpy.run_path(str(PROJECT/'meadow/build_meadow.py'),run_name='__main__')
