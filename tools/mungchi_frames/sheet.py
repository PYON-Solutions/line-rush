import json,sys
import os; W=os.environ.get('W','/workspace/mungchi_fx')
from PIL import Image,ImageDraw,ImageFont
FT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',15);FS=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
M=json.load(open(W+'/out/frames.json'));B=json.load(open(W+'/out/box.json'))
acts=sys.argv[2].split(',') if len(sys.argv)>2 else list(M)
sc=float(sys.argv[3]) if len(sys.argv)>3 else .5
out=sys.argv[1] if len(sys.argv)>1 else '/tmp/all.png'
bw,bh=B['box'];ax,ay=B['anchor']; tw,th=int(bw*sc),int(bh*sc)
cols=max(len(M[a]['frames']) for a in acts); LW=175
img=Image.new('RGB',(LW+cols*tw,len(acts)*(th+18)),(30,30,36));d=ImageDraw.Draw(img)
for r,a in enumerate(acts):
    m=M[a];y0=r*(th+18)
    d.text((6,y0+th//2-24),f"{a}\n{len(m['frames'])}f @ {m['fps']}fps\n{'loop' if m['loop'] else 'one-shot'}{'' if m.get('key') is None else ' key='+str(m['key'])}",fill=(255,255,200),font=FT)
    for c,f in enumerate(m['frames']):
        t=Image.new('RGBA',(bw,bh),(96,116,136,255) if c!=m.get('key') else (140,110,90,255))
        im=Image.open(W+'/out/frames/'+f['file']);t.alpha_composite(im,tuple(f['off']))
        dd=ImageDraw.Draw(t);dd.line([(ax-12,ay),(ax+12,ay)],fill='red',width=2);dd.line([(ax,ay-12),(ax,ay+12)],fill='red',width=2)
        if f.get('hand'): hx,hy=ax+f['hand'][0],ay+f['hand'][1];dd.ellipse([hx-5,hy-5,hx+5,hy+5],outline='cyan',width=2)
        t=t.convert('RGB').resize((tw,th),Image.LANCZOS);img.paste(t,(LW+c*tw,y0+14))
        d.text((LW+c*tw+3,y0+2),f"#{f['src']}",fill=(200,200,200),font=FS)
img.save(out);print(out,img.size)
