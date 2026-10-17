import json,sys
from PIL import Image,ImageDraw
M=json.load(open('../out/frames.json'));B=json.load(open('../out/box.json'))
acts=sys.argv[2].split(',') if len(sys.argv)>2 else list(M)
sc=float(sys.argv[3]) if len(sys.argv)>3 else .5
out=sys.argv[1] if len(sys.argv)>1 else '/tmp/all.png'
bw,bh=B['box'];ax,ay=B['anchor']; tw,th=int(bw*sc),int(bh*sc)
cols=max(len(M[a]['frames']) for a in acts); LW=90
img=Image.new('RGB',(LW+cols*tw,len(acts)*(th+16)),(30,30,36));d=ImageDraw.Draw(img)
for r,a in enumerate(acts):
    m=M[a];y0=r*(th+16)
    d.text((4,y0+th//2),f"{a}\n{len(m['frames'])}f {m['fps']}fps\n{'loop' if m['loop'] else ''} key={m.get('key','-')}",fill=(255,255,200))
    for c,f in enumerate(m['frames']):
        t=Image.new('RGBA',(bw,bh),(96,116,136,255) if c!=m.get('key') else (140,110,90,255))
        im=Image.open('../out/frames/'+f['file']);t.alpha_composite(im,tuple(f['off']))
        dd=ImageDraw.Draw(t);dd.line([(ax-12,ay),(ax+12,ay)],fill='red',width=2);dd.line([(ax,ay-12),(ax,ay+12)],fill='red',width=2)
        if f.get('hand'): hx,hy=ax+f['hand'][0],ay+f['hand'][1];dd.ellipse([hx-5,hy-5,hx+5,hy+5],outline='cyan',width=2)
        t=t.convert('RGB').resize((tw,th),Image.LANCZOS);img.paste(t,(LW+c*tw,y0+14))
        d.text((LW+c*tw+3,y0+1),f"#{f['src']}",fill=(200,200,200))
img.save(out);print(out,img.size)
