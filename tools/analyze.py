#!/usr/bin/env python3
# tools/sim.js 결과(JSON) → 요약 텍스트 + 승률 히트맵 PNG.  사용: python3 tools/analyze.py results.json outdir
import json, sys, os, statistics as st
from collections import defaultdict
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
for f in fm.findSystemFonts():
    if 'NanumGothic-Bold' in f: fm.fontManager.addfont(f); plt.rcParams['font.family'] = fm.FontProperties(fname=f).get_name(); break
R = json.load(open(sys.argv[1])); OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
H = ['bear', 'chick', 'cat', 'turtle', 'fox', 'rabbit']; NM = {'bear': '뭉치', 'chick': '삐요', 'cat': '모모', 'turtle': '단단', 'fox': '살랑', 'rabbit': '토토'}
L = []; p = L.append
fin = [m for m in R if m['winner'] is not None]
p(f"총 {len(R)}경기, 승부 결정 {len(fin)}, 시간 제한(30분) 도달 {len(R)-len(fin)} ({(len(R)-len(fin))/max(1,len(R))*100:.1f}%)")
p(f"블루(왼쪽) 승률 {sum(m['winner']==0 for m in fin)/max(1,len(fin))*100:.1f}%  (전체 미러 제외: " +
  f"{sum(m['winner']==0 for m in fin if m['k0']!=m['k1'])/max(1,sum(1 for m in fin if m['k0']!=m['k1']))*100:.1f}%)")
ts = [m['t'] for m in fin]; p(f"평균 경기 시간 {st.mean(ts)/60:.1f}분 (중앙값 {st.median(ts)/60:.1f}, 최소 {min(ts)/60:.1f}, 최대 {max(ts)/60:.1f})")
# 영웅별 (미러 제외)
p("\n[영웅별 — 미러전 제외]")
agg = defaultdict(lambda: defaultdict(list))
for m in R:
    for side in (0, 1):
        k = m['h'][side]['key']; o = m['h'][1-side]['key']; s = m['h'][side]
        a = agg[k]
        if k != o and m['winner'] is not None: a['win'].append(m['winner'] == side)
        for f in ('kills', 'deaths', 'cs', 'earned', 'towers', 'dragons', 'dash', 'recallStart', 'recallDone', 'wards', 'starved', 'lv'):
            a[f].append(s[f])
        for i in range(3): a[f'sk{i}'].append(s['skill'][i])
        a['lv20'].append(s['lv20']); a['t'].append(m['t'])
        a['lv6'].append(s['lvAt'].get('6')); a['lv11'].append(s['lvAt'].get('11')); a['lv15'].append(s['lvAt'].get('15'))
def mean(x): x = [v for v in x if v is not None]; return st.mean(x) if x else float('nan')
p(f"{'영웅':4} {'승률':>6} {'K/D':>9} {'CS':>5} {'골드':>6} {'타워':>5} {'용':>4} {'스킬1/2/궁 (분당)':>18} {'대시':>5} {'귀환시작/완료':>11} {'마나부족%':>7} {'Lv6':>5} {'Lv11':>5} {'Lv20':>6} {'Lv20도달%':>8}")
for k in H:
    a = agg[k]; mins = [t/60 for t in a['t']]; per = lambda f: st.mean([v/mm for v, mm in zip(a[f], mins)])
    lv20r = sum(v is not None for v in a['lv20'])/max(1,len(a['lv20']))
    p(f"{NM[k]:4} {mean(a['win'])*100:5.1f}% {mean(a['kills']):4.1f}/{mean(a['deaths']):4.1f} {mean(a['cs']):5.0f} {mean(a['earned']):6.0f} {mean(a['towers']):5.1f} {mean(a['dragons']):4.2f} "
      f"{per('sk0'):5.1f}/{per('sk1'):4.1f}/{per('sk2'):4.1f}      {per('dash'):5.2f} {mean(a['recallStart']):5.1f}/{mean(a['recallDone']):4.1f} "
      f"{st.mean([s/t for s, t in zip(a['starved'], a['t'])])*100:6.1f}% {mean(a['lv6'])/60:4.1f}m {mean(a['lv11'])/60:4.1f}m {mean(a['lv20'])/60:5.1f}m {lv20r*100:6.0f}%")
# 매치업 행렬: 행 영웅이 열 영웅을 상대로 이긴 비율 (양 진영 합산)
M = [[None]*len(H) for _ in H]; cnt = [[0]*len(H) for _ in H]
p("\n[매치업 — 행 영웅의 승률 (양 진영 합산), 괄호=블루일 때 / 레드일 때]")
for i, a in enumerate(H):
    row = []
    for j, b in enumerate(H):
        w = n = wb = nb = wr = nr = 0
        for m in fin:
            if m['k0'] == a and m['k1'] == b: n += 1; nb += 1; w += m['winner'] == 0; wb += m['winner'] == 0
            if m['k1'] == a and m['k0'] == b and a != b: n += 1; nr += 1; w += m['winner'] == 1; wr += m['winner'] == 1
        if a == b: M[i][j] = wb/max(1, nb); cnt[i][j] = nb; row.append(f"미러 블루승 {wb/max(1,nb)*100:5.1f}% (n={nb})")
        else: M[i][j] = w/max(1, n); cnt[i][j] = n; row.append(f"{w/max(1,n)*100:5.1f}% ({wb/max(1,nb)*100:.0f}/{wr/max(1,nr)*100:.0f}, n={n})")
    p(f"{NM[a]} vs " + " | ".join(f"{NM[b]}: {r}" for b, r in zip(H, row)))
cap = defaultdict(int)
for m in R:
    if m['winner'] is None: cap[f"{NM[m['k0']]}(블루) vs {NM[m['k1']]}(레드)"] += 1
p("\n[시간 제한 도달 경기] " + (", ".join(f"{k}: {v}" for k, v in sorted(cap.items(), key=lambda x: -x[1])) or '없음'))
# 구매
p("\n[평균 구매 횟수/경기]")
for k in H:
    b = defaultdict(int); n = 0
    for m in R:
        for s in m['h']:
            if s['key'] == k: n += 1; [b.__setitem__(x, b[x]+v) for x, v in s['buys'].items()]
    p(f"{NM[k]}: " + ", ".join(f"{x} {v/n:.1f}" for x, v in sorted(b.items())))
txt = "\n".join(L); open(os.path.join(OUT, 'summary_stats.txt'), 'w').write(txt); print(txt)
# 히트맵
fig, ax = plt.subplots(figsize=(8.4, 7.2), dpi=150)
im = ax.imshow([[v*100 for v in r] for r in M], cmap='RdBu_r', vmin=20, vmax=80)
ax.set_xticks(range(len(H)), [NM[k] for k in H]); ax.set_yticks(range(len(H)), [NM[k] for k in H])
ax.set_xlabel('상대 영웅'); ax.set_ylabel('영웅')
for i in range(len(H)):
    for j in range(len(H)):
        lab = f"{M[i][j]*100:.0f}%\n(n={cnt[i][j]})" + ("\n미러: 블루 승률" if i == j else "")
        ax.text(j, i, lab, ha='center', va='center', fontsize=8.5, color='white' if abs(M[i][j]-0.5)>0.2 else 'black')
ax.set_title(f'라인 러쉬 AI vs AI 승률 (행 기준)\n총 {len(R)}경기, 양 진영 합산')
fig.colorbar(im, ax=ax, label='승률 %'); fig.tight_layout(); fig.savefig(os.path.join(OUT, 'winrate_heatmap.png'))
