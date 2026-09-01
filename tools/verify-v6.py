from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import sys

ROOT = Path(__file__).resolve().parents[1]
ATTRS = {'script':'src', 'link':'href'}

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs=[]
    def handle_starttag(self, tag, attrs):
        if tag not in ATTRS: return
        d=dict(attrs); val=d.get(ATTRS[tag])
        if val: self.refs.append((tag,val))

def resolve(html, ref):
    ref=ref.strip()
    if not ref or ref.startswith(('#','data:','mailto:','tel:','javascript:','http://','https://','//')):
        return None
    path=unquote(urlsplit(ref).path)
    if not path: return None
    if path.startswith('/app/'):
        return ROOT / path[len('/app/'):]
    if path == '/app':
        return ROOT / 'index.html'
    if path.startswith('/'):
        return ROOT / path[1:]
    return html.parent / path

missing=[]; refs=0
htmls=sorted(ROOT.rglob('*.html'))
for html in htmls:
    parser=Parser(); parser.feed(html.read_text(encoding='utf-8'))
    for tag,ref in parser.refs:
        target=resolve(html,ref)
        if target is None: continue
        refs+=1
        if not target.exists():
            missing.append((html.relative_to(ROOT).as_posix(), tag, ref, target.relative_to(ROOT).as_posix() if target.is_relative_to(ROOT) else str(target)))

# Hard V6 checks for competing custom Pages workflows.
workflows=list((ROOT/'.github'/'workflows').glob('*.yml'))+list((ROOT/'.github'/'workflows').glob('*.yaml')) if (ROOT/'.github'/'workflows').exists() else []
pages_workflows=[]
for wf in workflows:
    txt=wf.read_text(encoding='utf-8',errors='ignore').lower()
    if 'pages' in txt and ('deploy-pages' in txt or 'configure-pages' in txt or 'github-pages' in txt):
        pages_workflows.append(wf.relative_to(ROOT).as_posix())

print(f'HTML revisados: {len(htmls)}')
print(f'Referencias locales script/link: {refs}')
if missing:
    print('REFERENCIAS FALTANTES:')
    for row in missing: print('  -', ' | '.join(row))
if pages_workflows:
    print('WORKFLOWS DE PAGES EN CONFLICTO:')
    for x in pages_workflows: print('  -',x)
if missing or pages_workflows:
    sys.exit(1)
print('V6 ROUTE/CASE VERIFIER: OK')
