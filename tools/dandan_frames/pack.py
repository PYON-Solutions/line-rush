# pack ../out/frames/*.png -> ../out/pack/dandan_N.webp + dandan.json
import json,os,sys
from PIL import Image
Q=int(os.environ.get('Q','82')); MAXW=2048; MAXH=2048; PAD=2
M=json.load(open('../out/frames.json'));B=json.load(open('../out/box.json'))
items=[]
for a,m in M.items():
    for j,f in enumerate(m['frames']): items.append((a,j,Image.open('../out/frames/'+f['file'])))
items.sort(key=lambda t:-t[2].height)
sheets=[];cur=None
def new(): return dict(img=Image.new('RGBA',(MAXW,MAXH),(0,0,0,0)),x=0,y=0,rh=0,used=0)
cur=new();sheets.append(cur)
for a,j,im in items:
    w,h=im.size
    if cur['x']+w>MAXW: cur['x']=0;cur['y']+=cur['rh']+PAD;cur['rh']=0
    if cur['y']+h>MAXH: cur=new();sheets.append(cur)
    cur['img'].paste(im,(cur['x'],cur['y']))
    f=M[a]['frames'][j]; f['rect']=[len(sheets)-1,cur['x'],cur['y'],w,h]
    cur['x']+=w+PAD;cur['rh']=max(cur['rh'],h);cur['used']=max(cur['used'],cur['y']+h)
os.makedirs('../out/pack',exist_ok=True);tot=0;files=[]
for i,s in enumerate(sheets):
    H=1
    while H<s['used']: H*=2
    im=s['img'].crop((0,0,MAXW,H)); fn=f'dandan_{i}.webp'
    im.save('../out/pack/'+fn,'WEBP',quality=Q,alpha_quality=90,method=6)
    sz=os.path.getsize('../out/pack/'+fn);tot+=sz;files.append(dict(file=fn,w=MAXW,h=H));print(fn,im.size,sz//1024,'KB')
out=dict(version=1,box=B['box'],anchor=B['anchor'],scale=B['scale'],atlases=files,actions={})
for a,m in M.items():
    out['actions'][a]=dict({k:v for k,v in m.items() if k!='frames'},frames=[dict(r=f['rect'],o=f['off'],**({'hand':f['hand']} if f.get('hand') else {})) for f in m['frames']])
json.dump(out,open('../out/pack/dandan.json','w'),separators=(',',':'))
print('total',tot//1024,'KB', 'frames',len(items))
