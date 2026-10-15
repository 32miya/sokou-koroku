#!/usr/bin/env python3
"""icons/cut/job_NNN.png を、ゲームに埋め込むコンテンツファイル content/job_icons.js にまとめる
使い方: python3 tools/pack_icons.py   （そのあと python3 tools/build.py）"""
import base64, io, json, pathlib
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent
jobs = {r['file']: r['job'] for r in json.loads((root/'icons/jobs.json').read_text(encoding='utf-8'))}
lines, total, missing = [], 0, []
for f, job in jobs.items():
    p = root/'icons/cut'/f'{f}.png'
    if not p.exists(): missing.append(f); continue
    im = Image.open(p).convert('RGBA').resize((128, 128), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=82, method=6)
    b = base64.b64encode(buf.getvalue()).decode(); total += len(b)
    lines.append(f" {json.dumps(job, ensure_ascii=False)}:'data:image/webp;base64,{b}'")
(root/'content/job_icons.js').write_text(
    '/* ===== 生業アイコン（tools/pack_icons.py が自動生成。手で編集しない） ===== */\n'
    'ROOTS.addJobIcons({\n' + ',\n'.join(lines) + '\n});\n', encoding='utf-8')
print(f'✓ content/job_icons.js  {len(lines)}/{len(jobs)} 個  {total/1024:.0f} KB')
if missing: print('  まだない:', missing[0], '〜', missing[-1], f'（{len(missing)}個）')
