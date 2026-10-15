#!/usr/bin/env python3
"""検査してから1枚のHTMLに組み立てる:  python3 tools/build.py
出力: dist/sokou.html（そのまま公開・Gravityへの移植用）"""
import pathlib, subprocess, sys
root = pathlib.Path(__file__).resolve().parent.parent

r = subprocess.run(['node', str(root/'tools/validate.js')])
if r.returncode != 0:
    sys.exit('検査に失敗したため組み立てを中止しました')

manifest = [l.strip() for l in (root/'content/manifest.txt').read_text(encoding='utf-8').splitlines()
            if l.strip() and not l.strip().startswith('#')]
parts = [('src/registry.js', (root/'src/registry.js').read_text(encoding='utf-8'))]
parts += [(f'content/{f}', (root/'content'/f).read_text(encoding='utf-8')) for f in manifest]
parts += [('src/fx.js', (root/'src/fx.js').read_text(encoding='utf-8'))]
parts += [('src/engine.js', (root/'src/engine.js').read_text(encoding='utf-8'))]

js = '\n'.join(f'/* ===== {name} ===== */\n{src}' for name, src in parts)
html = (root/'src/shell.html').read_text(encoding='utf-8') + '<script>\n' + js + '\n</script>\n'
out = root/'dist/sokou.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
# 手元で直接開く用：文字コード指定と最低限のリセットを付けた完全なHTML
standalone = ('<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n'
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  '<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}img{max-width:100%}[hidden]{display:none!important}'
  ':root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>\n'
  '</head>\n<body>\n' + html + '</body>\n</html>\n')
(root/'祖先遡行録.html').write_text(standalone, encoding='utf-8')
(root/'index.html').write_text(standalone, encoding='utf-8')
print(f'✓ {out.relative_to(root)} と 祖先遡行録.html  {len(html.encode())/1024:.0f} KB')
