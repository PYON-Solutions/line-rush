# 3) 트림된 프레임 -> 2048 아틀라스 WebP + mungchi.json   (Q=품질)  -> $W/out/pack/
# 거의 같은 프레임(크기 같고 평균 차 < DUP)은 아틀라스 칸을 공유
import json,os,numpy as np
from PIL import Image
W=os.environ.get('W','/workspace/mungchi_fx')
Q=int(os.environ.get('Q','78')); DUP=float(os.environ.get('DUP','0.8')); MAXW=2048; MAXH=2048; PAD=2
M=json.load(open(f'{W}/out/frames.json'));B=json.load(open(f'{W}/out/box.json'))
items=[];uniq=[]
for a,m in M.items():
    for j,f in enumerate(m['frames']):
        im=Image.open(f'{W}/out/frames/'+f['file']); arr=np.asarray(im,np.float32)
        same=next((u for u in uniq if u['im'].size==im.size and np.abs(u['arr']-arr).mean()<DUP),None)
        if same: same['users'].append((a,j))
        else: uniq.append(dict(im=im,arr=arr,users=[(a,j)]))
print('frames',sum(len(u['users']) for u in uniq),'unique',len(uniq))
uniq.sort(key=lambda u:-u['im'].height)
def new(): return dict(img=Image.new('RGBA',(MAXW,MAXH),(0,0,0,0)),x=0,y=0,rh=0,used=0)
sheets=[new()];cur=sheets[0]
for u in uniq:
    im=u['im'];w,h=im.size
    if cur['x']+w>MAXW: cur['x']=0;cur['y']+=cur['rh']+PAD;cur['rh']=0
    if cur['y']+h>MAXH: cur=new();sheets.append(cur)
    cur['img'].paste(im,(cur['x'],cur['y']))
    for a,j in u['users']: M[a]['frames'][j]['rect']=[len(sheets)-1,cur['x'],cur['y'],w,h]
    cur['x']+=w+PAD;cur['rh']=max(cur['rh'],h);cur['used']=max(cur['used'],cur['y']+h)
os.makedirs(f'{W}/out/pack',exist_ok=True);tot=0;files=[]
for f in os.listdir(f'{W}/out/pack'): os.remove(f'{W}/out/pack/{f}')
for i,s in enumerate(sheets):
    H=1
    while H<s['used']: H*=2
    im=s['img'].crop((0,0,MAXW,H)); fn=f'mungchi_{i}.webp'
    im.save(f'{W}/out/pack/'+fn,'WEBP',quality=Q,alpha_quality=90,method=6)
    sz=os.path.getsize(f'{W}/out/pack/'+fn);tot+=sz;files.append(dict(file=fn,w=MAXW,h=H));print(fn,im.size,sz//1024,'KB')
out=dict(version=1,box=B['box'],anchor=B['anchor'],scale=B['scale'],atlases=files,actions={})
for a,m in M.items():
    out['actions'][a]=dict({k:v for k,v in m.items() if k!='frames'},frames=[dict(r=f['rect'],o=f['off'],**({'hand':f['hand']} if f.get('hand') else {})) for f in m['frames']])
json.dump(out,open(f'{W}/out/pack/mungchi.json','w'),separators=(',',':'))
print('total',tot//1024,'KB')
