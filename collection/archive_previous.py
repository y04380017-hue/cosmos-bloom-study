"""Archive the V13 viewer without duplicating the same program and photographs."""
import base64
import hashlib
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'dist/previous/flowers'
V13 = '4d786403d2da6cedaf2a5a2f58b0c8d2885c820d'
shared = ARCHIVE / 'shared'
shared.mkdir(exist_ok=True)
photos = {hashlib.sha256(p.read_bytes()).digest(): p.name for p in (ROOT / 'dist/flowers/photos').glob('*.jpg')}
for page in sorted(ARCHIVE.glob('*.html')):
    original = subprocess.check_output(['git', 'show', V13 + ':dist/flowers/' + page.name], cwd=ROOT)
    html = original.decode()
    if not re.match(r'^\d\d-', page.name):
        assert page.read_bytes() == original
        continue

    def script_ref(match):
        js = match[1]
        if js.startswith('const FLOWER_SPEC='):
            return match[0]
        data = js.encode()
        filename = hashlib.sha256(data).hexdigest() + '.js'
        (shared / filename).write_bytes(data)
        return '<script src="shared/' + filename + '"></script>'

    def photo_ref(match):
        digest = hashlib.sha256(base64.b64decode(match[1])).digest()
        return 'src="../../flowers/photos/' + photos[digest] + '"'

    html = re.sub(r'<script>([\s\S]*?)</script>', script_ref, html)
    html = re.sub(r'src="data:image/jpeg;base64,([^"]+)"', photo_ref, html)
    page.write_text(html)
    # Validate the entire original page, including every old mesh, map and shader.
    restored = re.sub(r'<script src="(shared/[^"]+)"></script>', lambda m: '<script>' + (ARCHIVE / m[1]).read_text() + '</script>', html)
    restored = re.sub(r'src="(../../flowers/photos/[^"]+)"', lambda m: 'src="data:image/jpeg;base64,' + base64.b64encode((ARCHIVE / m[1]).read_bytes()).decode() + '"', restored)
    assert restored.encode() == original, page.name
print('Validated original V13 contents for all 83 studies and 4 catalogs')
