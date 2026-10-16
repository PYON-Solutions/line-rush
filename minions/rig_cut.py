#!/usr/bin/env python3
# 페인팅 PNG → 부위 아틀라스(atlas.png) + rig.json. 실행: python3 minions/rig_cut.py  (저장소 루트에서)
# 앞 부위 아래는 몸통 색을 번지게(inpaint) 메워 돌릴 때 구멍이 안 보이게, 투명 픽셀 RGB도 이웃 색으로 채워 흰 테두리 방지.
import json, os, sys
import numpy as np, cv2
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
from rig_specs import S

def polymask(shape, poly):
    m = Image.new('L', (shape[1], shape[0]), 0); ImageDraw.Draw(m).polygon([tuple(p) for p in poly], fill=255)
    return np.array(m) > 127

def bleed(rgb, a):
    # 투명 영역 RGB를 가장 가까운 불투명 색으로 (필터링 시 흰/검은 테두리 방지)
    solid = (a > 40).astype(np.uint8)
    if solid.sum() == 0: return rgb
    _, lab = cv2.distanceTransformWithLabels(1 - solid, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(solid); idx = np.zeros(lab.max() + 1, np.int64)
    # 라벨 → 해당 0픽셀 좌표
    lab_s = lab[ys, xs]; idx[lab_s] = np.arange(len(ys))
    out = rgb.copy(); o = idx[lab]; out[...] = rgb[ys[o], xs[o]]
    out[solid > 0] = rgb[solid > 0]; return out

def cut(src, specs, outdir, debug=None):
    im = np.array(Image.open(src).convert('RGBA')); H, W = im.shape[:2]
    rgb = im[..., :3].copy(); A = im[..., 3].astype(np.float32) / 255
    inside = A > 0.5
    masks = {}
    for p in specs:
        if p['name'] == 'body': continue
        masks[p['name']] = polymask(im.shape, p['poly'])
        for extra in p.get('polys', []): masks[p['name']] |= polymask(im.shape, extra)
    # 겹치는 곳은 나중(앞)에 그리는 부위 차지
    order = [p['name'] for p in specs if p['name'] != 'body']
    for i, n in enumerate(order):
        for m2 in order[i + 1:]:
            if not [q for q in specs if q['name'] == m2][0].get('parent'): masks[n] &= ~masks[m2]
    # 색으로 빼기: 지팡이가 망토 위를 지날 때 망토(파란색)는 몸통에 남김
    for p in specs:
        ex = p.get('excl')
        if not ex: continue
        r, g, b = [rgb[..., i].astype(int) for i in range(3)]
        keep = np.zeros((H, W), bool)
        if ex.get('blue'): keep |= (b > r + 40) & (b > g - 10) & (b > 90)
        keep[:ex.get('below', 0)] = False
        keep = cv2.morphologyEx(keep.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0
        masks[p['name']] &= ~keep
    # 부위에 딸려 온 작은 조각(다른 부위의 외곽선 등)은 몸통에 돌려줌 → 움직일 때 떨어진 조각이 안 보이게
    for p in specs:
        n = p['name']
        if n == 'body' or p.get('polys'): continue
        cnt, lab, st, _ = cv2.connectedComponentsWithStats((masks[n] & (A > 0.25)).astype(np.uint8), 8)
        if cnt <= 2: continue
        main = 1 + int(np.argmax(st[1:, 4]))
        for i in range(1, cnt):
            if i != main and st[i, 4] < min(1500, 0.15 * st[main, 4]): masks[n] &= ~(lab == i)
    # 자식(jaw 등)은 부모 영역에서 빠짐
    for p in specs:
        if p.get('parent') and p['parent'] in masks: masks[p['parent']] &= ~masks[p['name']]
    removed = np.zeros((H, W), bool)
    for p in specs:
        if p['name'] == 'body': continue
        removed |= masks[p['name']]
    # 몸 뒤 부위: 폴리곤 밖으로 o px 더 (몸통 밑에 숨은 부분) → 돌아가도 이음새 틈이 안 보임
    ext = {}
    for p in specs:
        o = p.get('over', 0)
        if p['name'] == 'body' or o <= 0: continue
        others = np.zeros((H, W), bool)
        for q in specs:
            if q['name'] not in ('body', p['name']) and q['name'] in masks and q.get('over', 0) <= 0: others |= masks[q['name']]
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * o + 1, 2 * o + 1))
        allow = inside & ~removed   # 몸통 자리만 (다른 움직이는 부위 자리는 X)
        if p.get('overInto'):
            pts = cv2.findNonZero((masks[p['name']] & inside).astype(np.uint8))
            hull = np.zeros((H, W), np.uint8); cv2.fillConvexPoly(hull, cv2.convexHull(pts), 1)
            for q in p['overInto']: allow |= masks[q] & inside & (hull > 0)
        ext[p['name']] = (cv2.dilate(masks[p['name']].astype(np.uint8), k) > 0) & allow
    parts_img = {}
    def fill_region(owner_mask, p):
        r = p.get('fill', 0)
        if r <= 0: return np.zeros_like(owner_mask)
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
        om = owner_mask.astype(np.uint8)
        # 오목한 곳만 메움(closing) + 이음새 덮을 만큼 살짝(4px) 넓힘 → 실루엣 밖으로 튀어나오지 않게
        clo = cv2.morphologyEx(om, cv2.MORPH_CLOSE, k) > 0
        grow = cv2.dilate(om, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * min(r, 8) + 1, 2 * min(r, 8) + 1))) > 0
        return (clo | grow) & masks[p['name']] & inside
    # 몸통
    body_own = inside & ~removed
    body_fill = np.zeros((H, W), bool); mouth_fill = {}
    for p in specs:
        if p['name'] == 'body' or p.get('parent'): continue
        backs = np.zeros((H, W), bool)
        for q in specs:
            if q.get('over', 0) > 0: backs |= masks[q['name']] & inside
        body_fill |= fill_region(body_own | backs, p) & ~backs
    def make_layer(own_alpha_mask, fill_mask, soft_mask=None, mouth=None):
        a = A.copy() * (own_alpha_mask | fill_mask)
        if soft_mask is not None:
            sm = cv2.GaussianBlur(soft_mask.astype(np.float32), (0, 0), 1.2)
            a = np.minimum(a, np.where(soft_mask, np.maximum(sm, 0), sm) * A)
        col = rgb.copy()
        if fill_mask.any():
            lum = rgb.astype(np.float32).mean(axis=2)
            known = own_alpha_mask & (A > 0.9) & (lum > 70)   # 진한 외곽선 색은 번지지 않게
            # 메울 영역 = fill. inpaint는 마스크된 픽셀을 주변에서 채움
            work = col.copy(); hole = (fill_mask | (~known & ~own_alpha_mask)).astype(np.uint8) * 255
            # 멀리 있는 미지 영역까지 inpaint하면 느리니 fill 근처만
            near = cv2.dilate(fill_mask.astype(np.uint8), np.ones((91, 91), np.uint8)) > 0
            hole_near = ((fill_mask | ~known) & near).astype(np.uint8) * 255   # 모르는 픽셀은 원본으로 쓰지 않음
            work[~known] = 0
            col2 = cv2.inpaint(work, hole_near, 6, cv2.INPAINT_TELEA)
            col[fill_mask] = col2[fill_mask]
            # 새로 생긴 가장자리엔 원본처럼 진한 외곽선(2px)
            lay = (own_alpha_mask | fill_mask).astype(np.uint8)
            nearbg = cv2.dilate((~inside).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
            edge = (lay > 0) & (cv2.erode(lay, np.ones((5, 5), np.uint8)) == 0) & fill_mask & nearbg
            col[edge] = (col[edge] * 0.25 + np.array([40, 26, 30]) * 0.75).astype(np.uint8)
            if mouth is not None: col[mouth] = (np.array([70, 14, 18]) * 0.7 + col[mouth] * 0.3).astype(np.uint8)
        return col, a
    layers = []
    for p in specs:
        n = p['name']
        if n == 'body':
            col, a = make_layer(body_own, body_fill)
            # 몸 안쪽 자른 선은 1px 남짓 부드럽게 (뒤 부위와 자연스럽게 이어지게)
            cutin = cv2.dilate((inside & ~(body_own | body_fill)).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
            sm = cv2.GaussianBlur((body_own | body_fill).astype(np.float32), (0, 0), 1.3)
            a = np.where(cutin, np.minimum(a, sm), a)
        else:
            own = masks[n] & inside
            fill = np.zeros((H, W), bool); mouth = None
            if n in ext: fill |= ext[n] & ~own   # 몸 뒤로 숨는 연장 부분: 이 부위 색으로 번져 채움
            for c in specs:
                if c.get('parent') == n:
                    f = masks[c['name']] & inside
                    if c.get('mouth'):
                        # 턱 밑은 입속 색 (위쪽 절반만 보이게 진하게)
                        fill |= f; mouth = f
                    else: fill |= fill_region(own, c)
            col, a = make_layer(own, fill, soft_mask=None, mouth=mouth)
            if p.get('fill', 0) > 0 and not p.get('parent'):
                # 몸통 위 이음새 부드럽게: 폴리곤 경계가 몸 안쪽인 곳만 1.2px 페더
                pm = masks[n] | fill
                sm = cv2.GaussianBlur(pm.astype(np.float32), (0, 0), 1.0)
                a = np.minimum(a, sm * 1.0 + 0) if True else a
        a8 = np.clip(a * 255 + .5, 0, 255).astype(np.uint8)
        col = bleed(col, a8)
        ys, xs = np.nonzero(a8 > 2)
        x0, x1, y0, y1 = max(0, xs.min() - 2), min(W, xs.max() + 3), max(0, ys.min() - 2), min(H, ys.max() + 3)
        layers.append((p, np.dstack([col, a8])[y0:y1, x0:x1], (x0, y0)))
    # 아틀라스(선반 배치)
    pad = 4; layers_sorted = sorted(range(len(layers)), key=lambda i: -layers[i][1].shape[0])
    AW = 1024 if W > 500 else 512
    while True:
        x = y = rowh = 0; pos = {}; ok = True
        for i in layers_sorted:
            h, w = layers[i][1].shape[:2]
            if w + pad > AW: ok = False; break
            if x + w + pad > AW: x = 0; y += rowh; rowh = 0
            pos[i] = (x + pad // 2, y + pad // 2); x += w + pad; rowh = max(rowh, h + pad)
        AH = y + rowh
        if ok and AH <= AW: break
        AW *= 2
    AH = 1 << int(np.ceil(np.log2(max(AH, 4))))
    atlas = np.zeros((AH, AW, 4), np.uint8)
    rig = dict(src=os.path.basename(src), w=W, h=H, aw=AW, ah=AH, parts=[])
    for i, (p, L, (ox, oy)) in enumerate(layers):
        ax, ay = pos[i]; h, w = L.shape[:2]; atlas[ay:ay + h, ax:ax + w] = L
        e = dict(name=p['name'], role=p.get('role', p['name']), rect=[int(ax), int(ay), int(w), int(h)], at=[int(ox), int(oy)],
                 pivot=list(p.get('pivot', (W / 2, H))), grid=p.get('grid', [1, 1]))
        if p.get('parent'): e['parent'] = p['parent']
        if p.get('tip'): e['tip'] = list(p['tip'])
        rig['parts'].append(e)
    # 투명 영역 RGB 번짐 (아틀라스 단위 한 번 더)
    atlas[..., :3] = bleed(atlas[..., :3], atlas[..., 3])
    os.makedirs(outdir, exist_ok=True)
    Image.fromarray(atlas).save(os.path.join(outdir, 'atlas.png'), optimize=True)
    json.dump(rig, open(os.path.join(outdir, 'rig.json'), 'w'), separators=(',', ':'))
    if debug:
        dbg = Image.new('RGBA', (W, H), (90, 140, 90, 255)); dbg.alpha_composite(Image.fromarray(im))
        d = ImageDraw.Draw(dbg)
        cols = [(255, 0, 0), (0, 0, 255), (255, 255, 0), (255, 0, 255), (0, 255, 255), (255, 128, 0)]
        for k, p in enumerate([q for q in specs if q['name'] != 'body']):
            c = cols[k % len(cols)]; d.polygon([tuple(v) for v in p['poly']], outline=c + (255,))
            px, py = p['pivot']; d.ellipse([px - 4, py - 4, px + 4, py + 4], fill=c + (255,)); d.text((px + 5, py - 5), p['name'], fill=c + (255,))
        dbg.save(debug)
    return rig

if __name__ == '__main__':
    root = os.path.join(os.path.dirname(__file__), '..'); os.chdir(root)
    dbgdir = sys.argv[1] if len(sys.argv) > 1 else None
    for src, specs in S.items():
        out = src[:-4] if src.startswith('minions') else 'dragons/' + os.path.basename(src)[:-4] + '_rig'
        cut(src, specs, out, debug=dbgdir and os.path.join(dbgdir, src.replace('/', '_')))
        print('ok', src, '->', out)
