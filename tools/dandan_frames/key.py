import numpy as np
from PIL import Image
BG=np.array([224.,15.,107.])
def bgcol(a):
    top=np.concatenate([a[0:3].reshape(-1,3),a[:,0:3].reshape(-1,3),a[:,-3:].reshape(-1,3)])
    return np.median(top,0)
def key(a,bg=None,lo=40,rng=50,shadow_y=None):
    """a: HxWx3 uint8 on magenta. returns RGBA uint8"""
    a=a.astype(np.float32)
    if bg is None: bg=bgcol(a)
    d=np.sqrt(((a-bg)**2).sum(-1))
    al=np.clip((d-lo)/rng,0,1)
    r,g,b=a[...,0],a[...,1],a[...,2]
    m=np.minimum(r-bg[0]*0+0,b)-g          # magenta-ness (bg ~ 92)
    mb=min(bg[0],bg[2])-bg[1]
    am=1-np.clip((m-12)/(mb-12-8),0,1)
    al=np.minimum(al,am)
    if shadow_y is not None:
        s=(a@bg)/(bg@bg); res=np.sqrt(((a-s[...,None]*bg)**2).sum(-1))
        ash=np.clip((res-14)/22,0,1)
        H=a.shape[0]; yy=np.arange(H)[:,None]
        ash=np.where(yy>=shadow_y,ash,1)
        al=np.minimum(al,ash)
    # unmix background from edge pixels
    aa=np.maximum(al,.25)[...,None]
    f=(a-(1-aa)*bg)/aa
    f=np.where((al<1)[...,None],f,a).clip(0,255)
    r,g,b=f[...,0],f[...,1],f[...,2]
    sp=np.clip(np.minimum(r,b)-g,0,None)
    f[...,0]=r-sp; f[...,2]=b-sp
    al=np.where(al<.06,0,al)
    return np.dstack([f.clip(0,255),al*255]).astype(np.uint8)
import cv2
def fix_edges(k,band=2.5):
    """chroma-bleed fix: pixels near the alpha boundary that are reddish get recoloured to dark luminance olive"""
    k=k.astype(np.float32); al=k[...,3]/255
    inside=(al>.5).astype(np.uint8)
    dist=cv2.distanceTransform(inside,cv2.DIST_L2,3)
    r,g,b=k[...,0],k[...,1],k[...,2]
    Y=.3*r+.59*g+.11*b
    red=np.clip((r-g-8)/30,0,1)*np.clip((r-b+10)/30,0,1)
    w=np.clip((band-dist)/band,0,1)*red
    w=np.where(al>0,w,0)
    tgt=np.dstack([Y*.95,Y*.9,Y*.55])
    k[...,:3]=k[...,:3]*(1-w[...,None])+tgt*w[...,None]
    # soften the outermost pixel
    k[...,3]=np.where(dist<1.2,k[...,3]*.75,k[...,3])
    return k.clip(0,255).astype(np.uint8)
