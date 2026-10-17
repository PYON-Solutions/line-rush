# Build Dandan frame atlas: python3 build.py  -> ../out/
import json,os,sys
from key import *
SC=0.69; AX,AY=300,377          # anchor in source px (body centre x, feet baseline y)
BOX=(0,-40,736,400)            # logical crop box in source px (same for all actions)
def U(a,b,n): return [int(round(a+(b-a)*i/n)) for i in range(n)]
# per action: frames (src idx), fps, loop, key (index of hit/release frame), options
A={
 'idle':  dict(src='idle',f=U(42,79,8),fps=5.2,loop=True),
 'walk':  dict(src='walk',f=list(range(8,29,2)),fps=12,loop=True),
 'turn':  dict(src='turn',f=[5,7,23,25,29],fps=36,loop=False,dx={5:-20,7:-45,23:-95,25:-122,29:-134}),
 'attack':dict(src='attack',f=[7,10,13,16,46,49],fps=16,loop=False,key=3,fadeR=600),
 'skill1':dict(src='skill1',f=[23,27,31,35,41,43,45],fps=20,loop=False,key=5,
               cut={43:520,45:545},hand={41:(505,95),43:(522,172),45:(540,208)}),
 'pull':  dict(src='skill1',f=[49,53,57,59],fps=8,loop=False,
               cut={49:545,53:500,57:410,59:410},hand={49:(530,240),53:(476,230),57:(405,244),59:(405,246)},dx={57:50,59:50}),
 'skill2':dict(src='skill2',f=[5,9,13,17,21],fps=12,loop=False),
 'bash':  dict(src='skill2',f=[25,29,31,33,39,41,43,47],fps=14,loop=False,key=3),
 'ult':   dict(src='ult',f=[5,8,11,23,25,27,29,33,45,9],fps=9,loop=False,key=5,shadow=320),
 'jump':  dict(src='jump',f=[16,20,22,34,36,40],fps=12,loop=False,footnorm=[20,22,34,36]),
 'dash':  dict(src='dash',f=[9,13,19,27,35,39],fps=20,loop=False),
 'recall':dict(src='recall',f=[10,19,28,37,46,58,70,79]+[82,85,88,91,94,97],fps=8,loop=True,loopFrom=8,pingpong=True),
 'hit':   dict(src='hit',f=[9,11,13],fps=12,loop=False),
 'death': dict(src='death',f=[13,33,41,43,45,47,49,53],fps=10,loop=False),
}
only=sys.argv[1:] or list(A)
def load(src,i):
    a=Image.open(f'../raw/dandan_{src}/{i:03d}.png').convert('RGB')
    if a.size!=(736,400):
        w=736; h=round(a.size[1]*736/a.size[0]); a=a.resize((w,h),Image.LANCZOS)
        # turn clip: centre-crop to 736x400 with alignment offset
        oy=TURN_OY; a=a.crop((0,oy,736,oy+400))
    return np.array(a)
TURN_OY=int(os.environ.get('TURN_OY','8'))
def edgefade(al,act,o):
    H,W=al.shape; x=np.arange(W)[None,:]; y=np.arange(H)[:,None]
    f=np.clip((W-1-x)/40,0,1)*np.clip(x/30,0,1)*np.clip(y/14,0,1)
    if 'fadeR' in o: f=f*np.clip((W-1-x)/(W-o['fadeR']),0,1)
    return al*f
os.makedirs('../out/frames',exist_ok=True)
meta=json.load(open('../out/frames.json')) if os.path.exists('../out/frames.json') and sys.argv[1:] else {}
for act in only:
    o=A[act];fr=[]
    for i in o['f']:
        a=load(o['src'],i)
        k=key(a,shadow_y=o.get('shadow')).astype(np.float32)
        k=fix_edges(k.astype(np.uint8)).astype(np.float32)
        al=k[...,3]/255
        c=o.get('cut',{}).get(i)
        if c: x=np.arange(736)[None,:]; al=al*np.clip((c+22-x)/22,0,1)
        al=edgefade(al,act,o)
        k[...,3]=al*255
        dx=o.get('dx',{}).get(i,0); dy=0
        if i in o.get('footnorm',[]):
            ys=np.nonzero((al[:, 150:470]>.5).any(1))[0]; dy=AY-ys.max()
        im=Image.fromarray(k.clip(0,255).astype(np.uint8))
        # place into logical box
        Wb,Hb=BOX[2]-BOX[0],BOX[3]-BOX[1]
        can=Image.new('RGBA',(Wb,Hb),(0,0,0,0)); can.paste(im,(dx-BOX[0],dy-BOX[1]))
        can=can.resize((round(Wb*SC),round(Hb*SC)),Image.LANCZOS)
        bb=can.getbbox()
        if bb is None: bb=(0,0,1,1)
        crop=can.crop(bb); fn=f'{act}_{len(fr):02d}.png'; crop.save('../out/frames/'+fn)
        h=o.get('hand',{}).get(i)
        fr.append(dict(file=fn,src=i,off=[bb[0],bb[1]],size=list(crop.size),
             hand=[round((h[0]+dx-AX)*SC,1),round((h[1]+dy-AY)*SC,1)] if h else None))
    m=dict(fps=o['fps'],loop=o['loop'],frames=fr)
    for kk in ('key','loopFrom','pingpong'):
        if kk in o: m[kk]=o[kk]
    meta[act]=m; print(act,len(fr),'frames')
json.dump(meta,open('../out/frames.json','w'),indent=1)
json.dump(dict(scale=SC,box=[round((BOX[2]-BOX[0])*SC),round((BOX[3]-BOX[1])*SC)],anchor=[round((AX-BOX[0])*SC,1),round((AY-BOX[1])*SC,1)]),open('../out/box.json','w'))
