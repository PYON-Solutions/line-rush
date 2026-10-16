// 모모 (고양이 마법사, 지팡이)
import {ctx,H,CS,TAU,GAME,IMG,cl,lerp,ss,eio,ein,eout,eback,seg,D,M,setShake,solve2,rotv,W2S,S2W,addFX,FXL,hitstop,mpt,setTimeoutSim} from '../common/index.js';
// ================= MOMO =================
const MOMO={name:'모모',key:'momo',Tc:.4,stride:62,lift:26,legLen:70,armSwing:.5,shadow:85,torsoDY:16,neck:[12,-124],propLag:.6,
 P:{torso:{f:'momo/body_c',p:[110,175],s:.85},head:{f:'momo/head_c',p:[134,229],s:.85},ua:{f:'momo/upperarm',p:[54,12],s:.55},fa:{f:'momo/forearm2',p:[51,10],s:.55},hand:{f:'momo/hand',p:[51,2],s:.55},
  foot:{f:'momo/foot_b',p:[28,14],s:.85},staff:{f:'momo/staff_c',p:[37,240],s:.7},armc:{f:'momo/arm_c',p:[16,18],s:.85},tail:{f:'momo/tail',p:[14,100],s:.65,flip:true},orb:{f:'momo/orb_c',p:[58,57],s:.5}},
 arm:{shF:[48,-88],shB:[-10,-90],elb:[0,45.6],wri:[0,41],grip:[0,21]},
 leg:{hipF:[26,-4],hipB:[-16,-6],knee:[0,36],ankle:[0,32],sole:[0,12],
  draw(hip,g,dk){const ol='#3b3236';const cap=(a,b,r,c1,c2)=>{ctx.lineCap='round';ctx.strokeStyle=ol;ctx.lineWidth=r*2+3.5;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
    const gr=ctx.createLinearGradient(a[0]-r,a[1],a[0]+r,a[1]);gr.addColorStop(0,c2);gr.addColorStop(.45,c1);gr.addColorStop(1,c2);ctx.strokeStyle=gr;ctx.lineWidth=r*2;ctx.stroke()};
   const G1=dk?'#8d8f99':'#b4b6bf',G2=dk?'#6e707a':'#8e909a';
   cap(hip,g.K,16,G1,G2);cap(g.K,g.T,14.5,G1,G2);
   // white paw: rounded, toes forward, flat sole on the ground
   ctx.save();ctx.translate(...g.T);ctx.rotate(g.rot);ctx.translate(0,12);
   ctx.beginPath();ctx.moveTo(-17,0);ctx.bezierCurveTo(-20,-18,-8,-25,4,-23);ctx.bezierCurveTo(18,-21,27,-12,26,-3);ctx.quadraticCurveTo(26,1,21,1);ctx.lineTo(-14,1);ctx.quadraticCurveTo(-17,1,-17,0);ctx.closePath();
   const pg=ctx.createLinearGradient(0,-16,0,1);pg.addColorStop(0,dk?'#d6d4d8':'#ffffff');pg.addColorStop(1,dk?'#a9a7ae':'#dcdadf');ctx.fillStyle=pg;ctx.fill();ctx.strokeStyle=ol;ctx.lineWidth=2.4;ctx.lineJoin='round';ctx.stroke();
   ctx.strokeStyle='rgba(80,70,80,.55)';ctx.lineWidth=1.6;ctx.lineCap='round';[[11,-9],[18,-6]].forEach(([x,y])=>{ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+1.5,y*.5,x+1,-1);ctx.stroke()});ctx.restore()}},
 rest:{hx:0,hy:-76,lean:0,sx:1,sy:1,breath:0,shF:-.2,elF:-.9,wrF:0,shB:.1,elB:-.4,wrB:0,fF:[30,0],fB:[-18,0],head:0,propA:.12,armA:0},
 runPose(o,p,w){o.armA=.1*w-.05;o.propA=.32},
 jumpPose(o){o.armA=-.3;o.propA=-.05},
 drawOrder(c){const{o,ch,h,arm,legDraw,gF,gB,hipF,hipB}=c;
  ctx.save();c.torsoFrame();ctx.translate(-58,-6);ctx.rotate(.15+Math.sin(ch.t*3.2)*.22+ch.sp.tail);D(h.P.tail);ctx.restore();
  legDraw(hipB,gB,1);legDraw(hipF,gF,0);ctx.save();c.torsoFrame();ctx.transform(1,0,Math.sin(ch.t*2.4)*.025+(o.robe||0),1,0,0);ctx.translate(0,0);ctx.restore();
  c.torso();c.head();
  const staff=()=>{D(h.P.staff);ch.mats.staff=M();if(o.staffGlow){ctx.save();ctx.translate(SH[0],SH[1]);const r=40+20*o.staffGlow;const gg=ctx.createRadialGradient(0,0,2,0,0,r);gg.addColorStop(0,`rgba(200,240,255,${.9*o.staffGlow})`);gg.addColorStop(1,'rgba(120,200,255,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.restore()}};
  // single clean sleeve+fist cut from the assembled art, pivoting at the shoulder; staff drawn behind the fist
  const aA=(o.armA||0)+(o.breath||0)*.015;ctx.save();c.torsoFrame();ctx.translate(78+(o.armX||0),-106);
  if(Math.abs(aA)>.04||o.armX){ctx.save();ctx.rotate(aA*.5);ctx.beginPath();ctx.rect(-20,-30,38,80);ctx.clip();D(h.P.armc);ctx.restore()}
  ctx.rotate(aA);
  ctx.save();ctx.translate(...MOMO_GRIP);ch.mats.handF=M();ctx.rotate((o.propA||0)-aA+ch.sp.ham*(h.propLag||0));staff();ctx.restore();
  D(h.P.armc);ctx.restore()},
 acts:{}};
function orbFX(x,y,face){addFX({x,y,vx:face*950,life:.7,f:face,up:(f,dt)=>{f.x+=f.vx*dt;if(Math.random()<.6)FXL.star4(f.x-f.f*20,f.y+(Math.random()-.5)*20,10,'rgba(190,240,255,1)');if(f.t+dt>=f.life){FXL.flash(f.x,f.y,70,'190,235,255');FXL.spark(f.x,f.y,10,'#bfefff',300,4,200)}},
 draw:(f,U,k)=>{const sc=CS*U;const r=60*sc;const g=ctx.createRadialGradient(0,0,4,0,0,r);g.addColorStop(0,'rgba(220,250,255,.95)');g.addColorStop(1,'rgba(80,180,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.rotate(f.t*8);ctx.scale(sc*.5,sc*.5);ctx.drawImage(IMG['momo/orb_c'],-58,-57)}})}
MOMO.acts.basic={dur:.55,base:'idle',h:MOMO,
 pose(o,k){const R=MOMO.rest;let aa,pa,ln,ax;
  if(k<.3){const e=eio(k/.3);aa=lerp(0,.22,e);pa=lerp(R.propA,-.25,e);ln=lerp(0,-.08,e);ax=lerp(0,-6,e)}
  else if(k<.42){const e=eout(seg(k,.3,.42));aa=lerp(.22,-.5,e);pa=lerp(-.25,.75,e);ln=lerp(-.08,.14,e);ax=lerp(-4,6,e)}
  else{const e=eio(seg(k,.5,1));aa=lerp(-.5,0,e);pa=lerp(.75,R.propA,e);ln=lerp(.14,0,e);ax=lerp(6,0,e)}
  o.armA=aa;o.armX=ax;o.propA=pa;o.lean=ln;o.staffGlow=k>.15&&k<.6?Math.sin(seg(k,.15,.6)*Math.PI):0;o.fF=[30+ln*60,0];o.head=ln*.4},
 tick(ch,p,k){if(p<.4&&k>=.4){const[x,y]=mpt(ch.mats.staff,SH[0],SH[1]);if(!GAME)orbFX(x,y,ch.face);FXL.flash(x,y,50,'200,240,255')}}};
MOMO.acts.skill1={dur:.62,base:'idle',h:MOMO,
 pose(o,k){const R=MOMO.rest;let aa,ln,ax;
  if(k<.3){const e=eio(k/.3);aa=lerp(0,.3,e);ln=lerp(0,-.12,e);ax=lerp(0,-6,e)}
  else if(k<.4){const e=eout(seg(k,.3,.4));aa=lerp(.3,-.38,e);ln=lerp(-.12,.26,e);ax=lerp(-6,8,e)}
  else{const e=eio(seg(k,.55,1));aa=lerp(-.38,0,e);ln=lerp(.26,0,e);ax=lerp(8,0,e)}
  o.armA=aa;o.armX=ax;o.propA=R.propA+aa*.5;o.lean=ln;o.fF=[30+ln*90,0];o.fB=[-18-ln*30,0];o.hy=R.hy+ln*20;o.head=ln*.3},
 tick(ch,p,k){if(p<.4&&k>=.4){const[x,y]=mpt(ch.mats.handF,0,0);const fx=x+ch.face*30*CS;FXL.flash(fx,y,90,'190,240,255');FXL.ring(fx,y,.5*CS/.62,'170,230,255');hitstop(ch,.07);setShake(.12);
   for(let i=0;i<12;i++){const a=(Math.random()-.5)*1.6+(ch.face>0?0:Math.PI),v=250+Math.random()*350;addFX({x:fx,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,rot:Math.random()*6,life:.5,up:(f,dt)=>{f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=500*dt;f.vx*=.96},draw:(f,U,q)=>{ctx.rotate(f.rot+q*4);ctx.globalAlpha=1-q;ctx.fillStyle='#d8f6ff';ctx.strokeStyle='#5ab8e8';ctx.lineWidth=2*U;ctx.beginPath();ctx.moveTo(0,-14*U);ctx.lineTo(6*U,0);ctx.lineTo(0,14*U);ctx.lineTo(-6*U,0);ctx.closePath();ctx.fill();ctx.stroke()}})}}}};
MOMO.acts.skill2={dur:.75,base:'idle',h:MOMO,start(ch){ch.x0=ch.x},
 pose(o,k){const c=Math.sin(seg(k,0,.3)*Math.PI);o.hy+=c*8;o.sx=1+.1*c;o.sy=1-.1*c;o.armA=-.35*c;o.propA=.12-.3*c},
 tick(ch,p,k){const out=seg(k,.22,.34),inn=seg(k,.42,.56);ch.alpha=k<.34?1-out:k<.42?0:inn;
  if(p<.22&&k>=.22){for(let i=0;i<10;i++)FXL.star4(ch.x+(Math.random()-.5)*120*CS,-(Math.random()*260)*CS,14+Math.random()*10,'rgba(255,240,170,1)');FXL.flash(ch.x,-130*CS,90,'230,220,255')}
  if(p<.38&&k>=.38){ch.x=ch.x0+ch.face*330*CS;for(let i=0;i<12;i++)FXL.star4(ch.x+(Math.random()-.5)*120*CS,-(Math.random()*260)*CS,14+Math.random()*12,'rgba(200,230,255,1)');FXL.flash(ch.x,-130*CS,100,'220,230,255')}},end(ch){ch.alpha=1}};
MOMO.acts.ult={dur:1.6,base:'idle',h:MOMO,
 pose(o,k){const e=eback(seg(k,0,.25)),r=eio(seg(k,.8,1));o.armA=lerp(0,-1.05,e*(1-r));o.armX=4*e*(1-r);o.propA=lerp(.12,-.05,e*(1-r));o.lean=-.12*e*(1-r);o.head=-.15*e*(1-r);o.staffGlow=k>.1&&k<.8?1:0},
 tick(ch,p,k){if(GAME)return;if(p<.22&&k>=.22){const tx=ch.x+ch.face*320*CS;const sx=tx+ch.face*420,sy=-720;addFX({x:sx,y:sy,tx,life:.55,f:ch.face,
   up:(f,dt)=>{const q=Math.min(1,f.t/.55),e=ein(q);f.x=lerp(sx,tx,e);f.y=lerp(sy,0,e);if(Math.random()<.9)FXL.star4(f.x+(Math.random()-.5)*30,f.y+(Math.random()-.5)*30,14,'rgba(255,230,120,1)');
    if(f.t+dt>=.55){FXL.ring(tx,0,1.7*CS/.62,'255,220,120');FXL.flash(tx,-60,200,'255,240,180');FXL.spark(tx,-20,26,'#ffd84a',650,7);for(let i=0;i<10;i++)FXL.star4(tx+(Math.random()-.5)*300,-(Math.random()*240),22,'rgba(255,245,190,1)');setShake(.4);hitstop(ch,.1);FXL.dust(tx,14,200)}},
   draw:(f,U,q)=>{const sc=CS*U;ctx.rotate(f.t*10);const R=70*sc;const g=ctx.createRadialGradient(0,0,5,0,0,R*2.2);g.addColorStop(0,'rgba(255,250,200,.95)');g.addColorStop(1,'rgba(255,200,60,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,R*2.2,0,TAU);ctx.fill();
    ctx.fillStyle='#ffd23f';ctx.strokeStyle='#a8641a';ctx.lineWidth=4*sc;ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?R*.45:R;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.arc(-R*.15,-R*.2,R*.18,0,TAU);ctx.fill()}})}}};
const MOMO_GRIP=[54.4,22.1],SH=[16.8,-101.5];
export const FILES=Object.values(MOMO.P).map(p=>p.f).concat(['momo/orb_c']);
MOMO.files=FILES;
export default MOMO;
