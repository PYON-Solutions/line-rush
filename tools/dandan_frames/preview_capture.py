# deterministic in-game capture: virtual clock (performance.now / rAF overridden), 30fps
import sys,os,shutil,subprocess,json
from playwright.sync_api import sync_playwright
OUT=sys.argv[1] if len(sys.argv)>1 else '/workspace/dandan_fx/test/cap'
FPS=30; U='http://127.0.0.1:8642/?lv=10'
INIT="""(()=>{let vt=0;const cbs=[];const rn=performance.now.bind(performance);performance.now=()=>vt;
window.requestAnimationFrame=cb=>{cbs.push(cb);return cbs.length};window.__vt=()=>vt;
window.__step=ms=>{vt+=ms;const c=cbs.splice(0);for(const f of c){try{f(vt)}catch(e){console.error(e)}}};
window.__auto=setInterval(()=>window.__step(16),16);})()"""
shutil.rmtree(OUT,ignore_errors=True);os.makedirs(OUT)
with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader']);pg=b.new_page(viewport={'width':915,'height':412},device_scale_factor=1.4)
  errs=[];pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)));pg.on('console',lambda m:errs.append(m.type+' '+m.text) if m.type=='error' else None)
  pg.on('response',lambda r: r.status>=400 and errs.append(f'HTTP {r.status} {r.url}'))
  pg.add_init_script(INIT);pg.goto(U);pg.wait_for_function('window.__LR');pg.wait_for_timeout(2500)
  pg.evaluate("__LR.setHero('turtle');__LR.startMatch()");pg.wait_for_timeout(1500)
  pg.evaluate("clearInterval(window.__auto)")
  ev=lambda js: pg.evaluate(js)
  # keep enemy hero passive & out of the way; hero near own base
  ev("(()=>{const G=__LR.G,h=G.hero,a=G.ai;window.__a=a;a.ai0=a.ai;a.ai=null;a.x=h.x+1400;h.mp=9999;h.cds=[0,0,0];G.msg.length=0})()")
  N=[0]
  def shot(): pg.screenshot(path=f'{OUT}/{N[0]:04d}.png');N[0]+=1
  def run(sec,each=None):
    for i in range(int(round(sec*FPS))):
      if each: ev(each)
      ev(f"__step({1000/FPS})");shot()
  K=lambda k,d: pg.keyboard.down(k) if d else pg.keyboard.up(k)
  keep="(()=>{const G=__LR.G,h=G.hero;h.mp=9999;h.hp=Math.max(h.hp,h.maxHp*.6);G.msg.length=0;for(const e of G.ents)if(e.kind==='minion'&&Math.abs(e.x-h.x)<500)e.x+=(e.team?600:-600);})()"
  run(1.4,keep)                                     # idle
  K('ArrowRight',1);run(1.6,keep);K('ArrowRight',0)  # walk right
  K('ArrowLeft',1);run(1.7,keep);K('ArrowLeft',0)    # turn + walk left
  K('ArrowRight',1);run(0.25,keep);K('ArrowRight',0);run(0.5,keep)  # turn back, idle
  pg.keyboard.press('ArrowUp');run(1.2,keep)          # jump
  # enemy hero in front, passive -> auto basic attacks
  ev("(()=>{const G=__LR.G,h=G.hero,a=window.__a;a.x=h.x+90;a.y=h.y;a.face=-1;a.hp=a.maxHp;})()")
  run(2.0,keep+";(()=>{const a=window.__a,h=__LR.G.hero;a.hp=a.maxHp;a.x=h.x+90})()")
  # lasso: enemy at range, pulled in
  ev("(()=>{const G=__LR.G,h=G.hero,a=window.__a;a.x=h.x+330;h.face=1;h.atkT=1.5})()");run(0.15,keep)
  pg.keyboard.press('Digit1');run(1.6,keep+";window.__a.hp=window.__a.maxHp")
  # shell bash: skill2 then next attack knocks up
  ev("(()=>{const h=__LR.G.hero,a=window.__a;a.x=h.x+90;h.atkT=0.7})()")
  pg.keyboard.press('Digit2');run(2.2,keep+";window.__a.hp=window.__a.maxHp")
  # ult
  ev("(()=>{const h=__LR.G.hero,a=window.__a;a.x=h.x+150;h.atkT=3})()");pg.keyboard.press('Digit3');run(2.2,keep+";window.__a.hp=window.__a.maxHp;__LR.G.hero.atkT=Math.max(__LR.G.hero.atkT,.5)")
  # dash (enemy away)
  ev("(()=>{const h=__LR.G.hero,a=window.__a;a.x=h.x+1500;h.face=1})()");pg.keyboard.press('ShiftLeft');print('dash',ev("[__LR.G.hero.dashFx,__LR.G.hero.dashCd,__LR.G.hero.stun,__LR.G.hero.root]"));run(1.0,keep)
  # recall (4s channel)
  pg.keyboard.press('KeyB');run(4.6,keep)
  run(0.6,keep)
  # hit: big hit + short stun
  ev("(()=>{const h=__LR.G.hero;h.flash=1;h.hp-=h.maxHp*.08;h.stun=0.45})()");run(1.0)
  # death: enemy hero next to us, aggressive, we have 1 hp
  ev("(()=>{const G=__LR.G,h=G.hero,a=window.__a;a.x=h.x+260;a.y=h.y;a.face=-1;h.atkT=9;h.hp=Math.min(h.hp,60);G.proj.push({kind:'arrow',x:a.x-20,y:h.y-40,team:a.team,owner:a,target:h,dmg:99999,spd:900,homing:true,aoe:0})})()");run(2.8)
  print('death',ev("[__LR.G.hero.respawn,__LR.G.hero.hp]"))
  print('\n'.join(errs) or 'no errors');print('frames',N[0]);b.close()
