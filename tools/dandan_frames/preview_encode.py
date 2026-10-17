import os,subprocess,shutil
from PIL import Image,ImageDraw,ImageFont
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',26)
segs=[(0,42,'idle'),(42,90,'walk →'),(90,141,'turn + walk ←'),(141,163,'turn → idle'),(163,199,'jump'),(199,259,'attack (auto)'),
 (259,311,'skill1 lasso pull'),(311,377,'skill2 shell bash knock-up'),(377,443,'ult earthquake'),(443,473,'dash'),(473,629,'recall'),(629,659,'hit'),(659,744,'death')]
os.makedirs('lab',exist_ok=True)
n=len(os.listdir('cap'))
for i in range(n):
    im=Image.open(f'cap/{i:04d}.png').convert('RGB').crop((0,0,1280,576))
    lab=next((s[2] for s in segs if s[0]<=i<s[1]),'')
    d=ImageDraw.Draw(im); x,y=330,92
    d.rounded_rectangle([x-10,y-6,x+20+d.textlength(lab,font=F),y+36],8,fill=(0,0,0))
    d.text((x,y),lab,font=F,fill=(255,240,140))
    im.save(f'lab/{i:04d}.png')
subprocess.run(['ffmpeg','-v','error','-y','-framerate','30','-i','lab/%04d.png','-c:v','libx264','-pix_fmt','yuv420p','-crf','22','-preset','slow','-movflags','+faststart','/workspace/dandan_fx/preview.mp4'],check=True)
print('ok')
