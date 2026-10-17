import json,os,numpy as np
from PIL import Image
def F(n,i,size):
    return np.array(Image.open(f'../raw/fx_{n}/{i:03d}.png').convert('RGB').resize(size,Image.LANCZOS)).astype(np.float32)
def lumalpha(a,floor=8):
    m=a.max(-1); al=np.clip((m-floor)/(255-floor),0,1)
    c=a/np.maximum(m[...,None],1)*255
    c=np.where(al[...,None]>0,c,0)
    return np.dstack([c.clip(0,255),al*255]).astype(np.uint8)
FX={
 'quake': dict(size=(320,180),frames=[1,3,5,7,9,12,15,19,24,30],fps=13,loop=False),
 'impact':dict(size=(170,170),frames=[1,3,5,7,9,11,13,15,17,19,21,23],fps=24,loop=False),
}
os.makedirs('../out/fx',exist_ok=True); meta={}
def save(name,ims,o):
    w,h=ims[0].size; cols=min(len(ims),max(1,2048//w)); rows=(len(ims)+cols-1)//cols
    sh=Image.new('RGBA',(w*cols,h*rows),(0,0,0,0))
    for j,im in enumerate(ims): sh.paste(im,((j%cols)*w,(j//cols)*h))
    sh.save(f'../out/fx/fx_{name}.webp','WEBP',quality=int(os.environ.get('Q','70')),alpha_quality=85,method=6)
    meta[name]=dict(file=f'fx_{name}.webp',w=w,h=h,cols=cols,n=len(ims),fps=o['fps'],loop=o['loop'],**({'loopFrom':o['loopFrom']} if 'loopFrom' in o else {}))
    print(name,len(ims),sh.size,os.path.getsize(f'../out/fx/fx_{name}.webp')//1024,'KB')
for n,o in FX.items():
    save(n,[Image.fromarray(lumalpha(F(n,i,o['size']))) for i in o['frames']],o)
# recall: 12-frame crossfaded loop (src 10..58, fade from 58..74) + 4-frame finale burst (85..97)
S=(136,240);s,L,W=10,48,16
loop=[]
for t in range(0,L,4):
    a=F('recall',s+t,S)
    if t<W: k=t/W; a=F('recall',s+L+t,S)*(1-k)+a*k
    loop.append(Image.fromarray(lumalpha(a)))
fin=[Image.fromarray(lumalpha(F('recall',i,S))) for i in (85,89,93,97)]
save('recall',loop+fin,dict(fps=12,loop=True,loopFrom=0))
meta['recall']['loopN']=len(loop)
json.dump(meta,open('../out/fx/fx.json','w'),indent=1)
