"""Prepare the online meadow. Re-bake model packs separately when models change."""
from pathlib import Path
import shutil,json,sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from sunlit_plates import bake_plates
ROOT=Path(__file__).resolve().parent
OUT=ROOT.parent/'dist/meadow'
OUT.mkdir(exist_ok=True,parents=True)
for name in ['index.html','spring.css','spring-field.js','spring-camera.js','spring-sound.js','wind-circle.webp','spring-view.js','spring-grass.webp','illustrated-flowers.webp','style.css','viewer.js','flower-scatter.js','model-loader.js','meadow-effects.js','day-cycle.js','day-sky.js','cycle-field.js','catalog.json','reference-clumps.json','understory.js','drift-cover.js','drift-study.webp','study-entry.webp','study-turn.webp','study-hover.webp','flight.js','bloom-trail.js','hand-input.js','hand-preview.js','flight-preview.js']:
    shutil.copyfile(ROOT/name,OUT/name)
(OUT.parent/'index.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>风过春野 · 手势花海</title><meta http-equiv="refresh" content="0;url=./meadow/"><a href="./meadow/">进入手势花海</a></html>')
bake_plates(ROOT,OUT)
shutil.copyfile(ROOT/'flight-poses/flowers.json',OUT/'flight-poses/flowers.json')
shutil.copyfile(ROOT.parent/'assets/three.min.js',OUT/'three.min.js')
manifest=OUT/'models/manifest.json'
if not manifest.exists() or len(json.loads(manifest.read_text())['species'])!=83:
    raise RuntimeError('Run node meadow/bake-models.cjs before publishing: 83 model packs are required')
cycle_manifest=OUT/'models-cycle/manifest.json'
if not cycle_manifest.exists() or len(json.loads(cycle_manifest.read_text())['species'])!=83:
    raise RuntimeError('Run node meadow/bake-cycle-lods.cjs: 83 continuous-cycle packs are required')
print('Prepared online meadow: 83 species, continuous device-time cycle, no offline bundle')
