#!/usr/bin/env python3
"""アイコン一覧画像（5列×4行）を1枚ずつ切り出し、背景を透明にする
使い方: python3 tools/cut_icons.py 開始番号 一覧画像 [開始番号 一覧画像 ...]
出力: icons/cut/job_NNN.png（透明PNG・正方形）"""
import sys, pathlib
import numpy as np
from PIL import Image, ImageFilter
from collections import deque
from scipy import ndimage

root = pathlib.Path(__file__).resolve().parent.parent
out = root/'icons/cut'; out.mkdir(parents=True, exist_ok=True)
COLS, ROWS, SIZE = 5, 4, 128
# ラベルが絵に重なって自動で外せないものは、下端を手で削る（番号: 削る割合）
TRIM_BOTTOM = {78: 0.16}

def fgmask(a):
    mx, mn = a.max(2), a.min(2)
    return ((mx - mn) > 35) | (mx < 170)

def runs(v, thr, mingap):
    """しきい値を超える区間を、mingap 未満の隙間はつないで返す"""
    on = v > thr; res = []; s = None; gap = 0
    for i, x in enumerate(on):
        if x:
            if s is None: s = i
            gap = 0; e = i
        elif s is not None:
            gap += 1
            if gap >= mingap: res.append((s, e)); s = None
    if s is not None: res.append((s, e))
    return res

def bands(profile, n, length):
    """n個の帯を見つける。うまく見つからなければ等分する"""
    r = [x for x in runs(profile, 0.02, 3) if x[1] - x[0] > length * 0.08]
    if len(r) == n: return r
    step = length / n
    return [(int(i * step), int((i + 1) * step) - 1) for i in range(n)]

def remove_bg(img):
    a = np.asarray(img.convert('RGB')).astype(int)
    h, w, _ = a.shape
    mx, mn = a.max(2), a.min(2)
    bgish = (mn > 222) & ((mx - mn) < 26)          # 白・薄い灰色（市松模様含む）
    seen = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bgish[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bgish[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and bgish[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    alpha = np.where(seen, 0, 255).astype(np.uint8)
    # 縁を少しなじませる：背景に接する明るい画素は半透明に
    A = Image.fromarray(alpha)
    edge = np.asarray(A.filter(ImageFilter.MinFilter(3))) < 255
    light = mn > 190
    alpha = np.where((alpha == 255) & edge & light, 110, alpha)
    rgba = np.dstack([a.astype(np.uint8), alpha])
    return Image.fromarray(rgba, 'RGBA')

def cut(start, path):
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(int)
    H, W, _ = a.shape; fg = fgmask(a)
    cols = bands(fg.mean(0), COLS, W)
    # 行：ラベル行（細い帯）を除いた太い帯を絵の行とみなす
    rr = runs(fg.mean(1), 0.02, 2)
    icon_rows = [x for x in rr if x[1] - x[0] > H / ROWS * 0.45]
    if len(icon_rows) != ROWS:
        step = H / ROWS; icon_rows = []
        for i in range(ROWS):
            y0, y1 = int(i * step), int((i + 1) * step) - 1
            sub = runs(fg[y0:y1 + 1].mean(1), 0.02, 2)
            big = max(sub, key=lambda r: r[1] - r[0]) if sub else (0, y1 - y0)
            icon_rows.append((y0 + big[0], y0 + big[1]))
    n = start
    for (y0, y1) in icon_rows:
        for (x0, x1) in cols:
            # セルの下に入り込んだ番号ラベル（細い文字の帯）を外す
            sub = fg[y0:y1 + 1, x0:x1 + 1].mean(1)
            rs = runs(sub, 0.01, 1)
            while len(rs) > 1 and (rs[-1][1] - rs[-1][0]) < (y1 - y0) * 0.16:
                rs.pop()
            yb = y0 + rs[-1][1] if rs else y1
            cell = im.crop((max(0, x0 - 2), max(0, y0 - 2), min(W, x1 + 3), min(H, yb + 2)))
            if n in TRIM_BOTTOM:
                cell = cell.crop((0, 0, cell.width, round(cell.height * (1 - TRIM_BOTTOM[n]))))
            c = remove_bg(cell)
            # 絵から離れた小さな塊（番号ラベルの文字など）を消す
            al = np.asarray(c.getchannel('A')) > 40
            lab, k = ndimage.label(al)
            if k > 1:
                sizes = ndimage.sum(al, lab, range(1, k + 1)); big = sizes.max()
                keep = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v >= big * 0.06])
                arr = np.asarray(c).copy(); arr[..., 3] = np.where(keep | (arr[..., 3] <= 40) & ndimage.binary_dilation(keep, iterations=1), arr[..., 3], 0)
                c = Image.fromarray(arr, 'RGBA')
            bb = c.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
            if bb: c = c.crop(bb)
            side = max(c.size); pad = round(side * 0.04)
            sq = Image.new('RGBA', (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
            sq.paste(c, ((sq.width - c.width) // 2, (sq.height - c.height) // 2), c)
            sq = sq.resize((SIZE, SIZE), Image.LANCZOS)
            sq.save(out / f'job_{n:03d}.png'); n += 1
    print(f'{pathlib.Path(path).name}: job_{start:03d}〜job_{n-1:03d}  列{len(cols)} 行{len(icon_rows)}')

args = sys.argv[1:]
for i in range(0, len(args), 2):
    cut(int(args[i]), args[i + 1])
