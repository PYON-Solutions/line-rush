# 2) 동작별 프레임 선택 + 공통 스케일/발 앵커 -> $W/out/frames/*.png + frames.json + box.json
# 클립마다 001(기본 서 있는 자세)로 스케일: 서 있는 키 = TH px, 발바닥 = AY, 머리 중심 x = AX (모든 동작 공통 → 동작이 바뀌어도 크기/위치가 튀지 않음)
import os,sys,json,numpy as np
from PIL import Image
W=os.environ.get('W','/workspace/mungchi_fx'); K=f'{W}/out/keyed'
TH=int(os.environ.get('TH','250'))
def R(a,b,s=1): return list(range(a,b+1,s))
# ref: 스케일 기준 클립 (raw_ultc 1-15 = raw_ult 10..52, 16-35 = raw_ult2)
A={
 # idle: 5..89 매 2프레임(12fps, 3.5초 주기). 89 다음 = 91≈5 (90↔5 차이 2.3 = 인접 프레임 수준) → 이음매 없이 루프
 'idle':  dict(d='raw_idle',f=R(5,89,2),fps=12,loop=True),
 'walk':  dict(d='raw',f=R(13,35,2),fps=12,loop=True),
 'attack':dict(d='raw_atk2',f=[4,10,14,17,20,23,26,29,33,38,43,48,54],fps=16,loop=False,key=6),
 # skill1: 0..7 공중(게임 점프 속도 vy로 프레임 선택), 8 = 내려찍기 착지(doSlam) 순간, 이후 회복
 'skill1':dict(d='raw_s1c',f=[28,32,36,40,44,48,52,55,58,61,66,72,80,86,90,94,97],fps=20,loop=False,key=8,footnorm='air'),
 'skill2':dict(d='raw_s2',f=[13,17,20,23,26,29,33,37,41,45,49,53,56,59,62,66,70],fps=24,loop=False,key=6),
 # ult: 돌진 중 달리기 루프(raw_ult 39..51, 주기 13프레임 → 52≈39) → 돌진 끝에 마무리 내려찍기 (raw_ultc 16-35 = raw_ult2)
 'ultrun':dict(d='raw_ult',f=[34,39,41,43,45,47,49,51],fps=14,loop=True,loopFrom=1),
 'ultfin':dict(d='raw_ultc',ref='raw_ult2',f=[18,20,22,23,24,25,26,27,28,29,30,31,32,33,34,35],fps=16,loop=False,key=6),
 # jump: 0 도약 웅크림, 1..6 공중(vy로 선택), 7.. 착지
 'jump':  dict(d='raw_jump',f=R(28,61,3),fps=16,loop=False,footnorm='all',air=[1,6],land=7),
 'dash':  dict(d='raw_dash',f=[31,34,40,46,52,58,61,64,67,70],fps=28,loop=False),
 # recall: 인트로(망치 내려놓고 두 손 모음) 12프레임 → 고요한 숨쉬기 루프(왕복, loopFps)
 'recall':dict(d='raw_recall',f=R(1,45,4)+R(49,97,6),fps=8,loop=True,loopFrom=12,pingpong=True,loopFps=4,hand=dict(start=8,xy=[60,-110])),   # 모은 두 손(앵커 기준 px) — 귀환 에너지 구슬 위치
 'hit':   dict(d='raw_hit',f=R(16,58,6),fps=26,loop=False),
 'death': dict(d='raw_death',f=R(52,73,2),fps=12,loop=False),
 # turn: 오른쪽 → 왼쪽(끝 = 기본 자세 좌우 반전). 머리 중심을 앵커에 고정(영상 속 이동 제거), 발은 기준선
 'turn':  dict(d='raw_turn',f=[1,4,16,18,20,40,44,47,50,53,56,60],fps=48,loop=False,footnorm='all',headc=True),
}
for k,v in json.load(open(os.environ['OVR'])).items() if os.environ.get('OVR') else []: A[k].update(v)
META={}
def meta(d):
    if d not in META: META[d]={int(k):v for k,v in json.load(open(f'{K}/{d}/meta.json')).items()}
    return META[d]
def ref(d):
    bb=meta(d)[1]; a=np.asarray(Image.open(f'{K}/{d}/001.png'))[...,3]>128
    xs=np.nonzero(a[:int(a.shape[0]*.3)])[1]; return dict(h=bb[3]-bb[1],bot=bb[3],cx=bb[0]+xs.mean())
REFH={}  # ref standing height in out px after scale (=TH)
placed={}
for act,o in A.items():
    fr=[]
    for i in o['f']:
        d=o['d']; rd=o.get('ref',d); r=ref(rd); s=TH/r['h']
        bb=meta(d)[i]; im=Image.open(f'{K}/{d}/{i:03d}.png')
        w,h=max(1,round(im.width*s)),max(1,round(im.height*s)); im=im.resize((w,h),Image.LANCZOS)
        # position relative to anchor (anchor = 0,0): x = (bb0-cx)*s, y = (bb1-bot)*s
        x=(bb[0]-r['cx'])*s; y=(bb[1]-r['bot'])*s
        if o.get('headc'):   # 머리(위 30%) 중심 x를 앵커로
            al=np.asarray(im)[...,3]>128; xs=np.nonzero(al[:int(al.shape[0]*.3)])[1]; x=-xs.mean()
        fr.append([im,x,y,i,o.get('footnorm')])
    # footnorm: 'all' = 모든 프레임 발(bbox 아래)을 기준선에 (영상의 높이 변화 제거, 높이는 게임 코드가),
    #           'air' = 기준선보다 위로 뜬 프레임만 내림
    for f in fr:
        if f[4]:
            bottom=f[2]+f[0].height
            if f[4]=='all' or bottom<-2: f[2]-=bottom
    placed[act]=fr
# union box
x0=min(f[1] for L in placed.values() for f in L); y0=min(f[2] for L in placed.values() for f in L)
x1=max(f[1]+f[0].width for L in placed.values() for f in L); y1=max(f[2]+f[0].height for L in placed.values() for f in L)
x0,y0=int(np.floor(x0))-2,int(np.floor(y0))-2; x1,y1=int(np.ceil(x1))+2,int(np.ceil(y1))+2
os.makedirs(f'{W}/out/frames',exist_ok=True)
for f in os.listdir(f'{W}/out/frames'): os.remove(f'{W}/out/frames/{f}')
M={}
for act,L in placed.items():
    o=A[act]; fr=[]
    for j,(im,x,y,i,_) in enumerate(L):
        # sub-pixel placement: paste at integer pos (error < .5px at out scale)
        fn=f'{act}_{j:02d}.png'; im.save(f'{W}/out/frames/{fn}')
        fr.append(dict(file=fn,src=i,off=[round(x-x0,2),round(y-y0,2)],size=list(im.size)))   # 소수점 위치 유지 (반올림 떨림 방지)
        hd=o.get('hand')
        if hd and j>=hd['start']: fr[-1]['hand']=hd['xy']
    m=dict(fps=round(o['fps'],3),loop=o['loop'],frames=fr)
    for kk in ('key','loopFrom','pingpong','loopFps','air','land'):
        if kk in o: m[kk]=o[kk]
    M[act]=m; print(act,len(fr))
json.dump(M,open(f'{W}/out/frames.json','w'),indent=1)
json.dump(dict(scale=TH,box=[x1-x0,y1-y0],anchor=[-x0,-y0]),open(f'{W}/out/box.json','w'))
print('box',x1-x0,y1-y0,'anchor',-x0,-y0)
