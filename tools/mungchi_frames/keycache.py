# 1) 크로마키 캐시: raw 프레임(마젠타) -> 1280x720 기준 RGBA 트림 PNG + bbox  (W=/workspace/mungchi_fx)
# python3 keycache.py [dir ...]   -> $W/out/keyed/<dir>/NNN.png , $W/out/keyed/<dir>/meta.json {idx:[x0,y0]}
import os,sys,json,numpy as np
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'../dandan_frames'))
from key import key
from PIL import Image
from scipy import ndimage
from multiprocessing import Pool
W=os.environ.get('W','/workspace/mungchi_fx')
DIRS=['raw','raw_idle','raw_atk2','raw_s1c','raw_s2','raw_ult','raw_ult2','raw_ultc','raw_jump','raw_dash','raw_recall','raw_hit','raw_death','raw_turn']
def full(p):
    im=Image.open(p).convert('RGB'); w,h=im.size
    if abs(w/h-16/9)>0.01:   # 640x480 turn clip: pad to 16:9 with bg colour (like build_turn.py)
        W2=int(round(h*16/9)); a=np.asarray(im); bgc=tuple(int(x) for x in np.median(a[:,0],axis=0))
        c=Image.new('RGB',(W2,h),bgc); c.paste(im,((W2-w)//2,0)); im=c
    if im.size!=(1280,720): im=im.resize((1280,720),Image.LANCZOS)
    return clean(key(np.asarray(im)))
def clean(a):   # drop small detached blobs (<4% of biggest)
    m=a[...,3]>40; d=ndimage.binary_dilation(m,iterations=6); lab,n=ndimage.label(d)
    a=a.copy()
    if n<=1: a[...,3]=np.where(a[...,3]>12,a[...,3],0); return a
    sz=ndimage.sum(m,lab,range(1,n+1)); keep=np.isin(lab,1+np.where(sz>=0.04*sz.max())[0])
    a[...,3]=np.where(keep&(a[...,3]>12),a[...,3],0); return a
def job(t):
    d,f=t; a=full(f'{W}/{d}/{f}'); im=Image.fromarray(a,'RGBA'); bb=im.getbbox()
    im.crop(bb).save(f'{W}/out/keyed/{d}/{f}'); return d,int(f[:3]),list(bb)
if __name__=='__main__':
    ds=sys.argv[1:] or DIRS; jobs=[]
    for d in ds:
        os.makedirs(f'{W}/out/keyed/{d}',exist_ok=True)
        jobs+=[(d,f) for f in sorted(os.listdir(f'{W}/{d}')) if f.endswith('.png')]
    meta={d:{} for d in ds}
    with Pool(8) as p:
        for d,i,bb in p.imap_unordered(job,jobs,chunksize=4): meta[d][i]=bb
    for d in ds: json.dump(meta[d],open(f'{W}/out/keyed/{d}/meta.json','w'))
    print('keyed',len(jobs))
