// 살랑 (여우 암살자, 단검) — 컷아웃 퍼펫. 파츠: characters/salang/*.png (fox_sheet 에서 잘라냄)
import {ctx,H,CS,TAU,GAME,IMG,cl,lerp,ss,eio,ein,eout,eback,seg,D,M,setShake,W2S,addFX,FXL,hitstop,mpt} from '../common/index.js';
import {cap,legDrawer} from '../common/cutout.js';
const SAL={name:'살랑',key:'salang',Tc:.38,stride:78,lift:30,legLen:120,armSwing:.85,shadow:80,torsoDY:4,neck:[4,-132],propLag:.7,
 P:{torso:{f:'salang/torso',p:[105,228],s:.66},head:{f:'salang/head',p:[108,192],s:.64},hood:{f:'salang/hood',p:[100,214],s:.7},
  hand:{f:'salang/hand',p:[45,12],s:.55},hand2:{f:'salang/hand2',p:[46,12],s:.55},boot:{f:'salang/boot',p:[55,14],s:.5},boot2:{f:'salang/boot2',p:[60,14],s:.5},
  tail:{f:'salang/tail',p:[22,52],s:.52,flip:true},dagger:{f:'salang/dagger',p:[45,42],s:.5}},
 leg:{hipF:[14,-6],hipB:[-14,-8],knee:[0,32],ankle:[0,28],sole:[0,60]},
 rest:{hx:0,hy:-116,lean:.05,sx:1,sy:1,breath:0,shF:-.35,elF:-.9,shB:.25,elB:-.7,fF:[22,0],fB:[-22,0],head:0,propA:.6,daggerB:.6},
 runPose(o,p,w){o.lean=.22;o.elF=-1.3;o.elB=-1.3;o.propA=.9},
 jumpPose(o){o.elF=-1.2;o.elB=-1.2},
 drawOrder(c){const{o,ch,h,legDraw,gF,gB,hipF,hipB}=c;
  // 꼬리 (등 뒤, 살랑살랑)
  ctx.save();c.torsoFrame();ctx.translate(-30,-30);ctx.rotate(-.35+Math.sin(ch.t*3)*.12+ch.sp.tail);D(h.P.tail);ctx.restore();
  const arm=(sh,a,el,hand,dk,dg)=>{ctx.save();c.torsoFrame();ctx.translate(...sh);ctx.rotate(a);const E=[0,40];cap([0,0],E,11,dk?'#b8642a':'#e98a3a',dk?'#7a3e16':'#b5601e');
   ctx.translate(...E);ctx.rotate(el);if(dg!=null){ctx.save();ctx.translate(0,72);ctx.rotate(dg-a-el);D(h.P.dagger,dk?.35:0);ctx.restore()}D(hand,dk?.35:0);const m=M().translate(0,72);ctx.restore();return m};
  ch.mats.handB=arm([-22,-112],o.shB,o.elB,h.P.hand2,1,o.daggerB??.6);
  legDraw(hipB,gB,1);legDraw(hipF,gF,0);c.torso();
  // 후드(뒤) + 얼굴
  ctx.save();c.torsoFrame();ctx.translate(h.neck[0]-6,h.neck[1]+6);ctx.rotate((o.head||0)+ch.sp.head);D(h.P.hood);ctx.restore();c.head();
  ch.mats.handF=arm([26,-112],o.shF,o.elF,h.P.hand,0,o.propA)},
 acts:{}};
SAL.leg.draw=legDrawer({c1:'#5a3a8a',c2:'#3a2260',d1:'#43296a',d2:'#2a1846',rT:14,rK:12.5,foot:SAL.P.boot,footB:SAL.P.boot2});
const R=SAL.rest;
function slashFX(ch,big){const x=ch.x+ch.face*70*CS,y=(ch.y-170)*CS;FXL.swoosh(x,y,ch.face,(big?190:140)*CS,-2.3,.9,big?'rgba(190,110,255,.95)':'rgba(220,180,255,.9)',big?1.5:1);FXL.flash(x+ch.face*60*CS,y,big?90:50,'210,160,255');FXL.spark(x+ch.face*60*CS,y,big?16:8,'#d9a8ff',big?480:320);hitstop(ch,big?.1:.05);if(big)setShake(.2)}
// 기본공격: 앞 단검 베기 (놓는 프레임 k=.4)
SAL.acts.basic={dur:.42,base:'idle',h:SAL,
 pose(o,k){let a,el,ln;if(k<.28){const e=eio(k/.28);a=lerp(R.shF,-2.2,e);el=lerp(R.elF,-1.4,e);ln=lerp(.05,-.05,e)}else if(k<.4){const e=eout(seg(k,.28,.4));a=lerp(-2.2,-.2,e);el=lerp(-1.4,-.2,e);ln=lerp(-.05,.25,e)}else{const e=eio(seg(k,.5,1));a=lerp(-.2,R.shF,e);el=lerp(-.2,R.elF,e);ln=lerp(.25,.05,e)}
  o.shF=a;o.elF=el;o.lean=ln;o.propA=a+el+1.6;o.fF=[22+ln*60,0];o.head=-ln*.2},
 tick(ch,p,k){if(p<.4&&k>=.4)slashFX(ch,false)}};
// 스킬1 그림자 베기: 반 발짝 내딛으며 양손 교차 베기 (이동 아님, 놓는 프레임 k=.4)
SAL.acts.skill1={dur:.55,base:'idle',h:SAL,
 pose(o,k){let a,b,ln,st;if(k<.3){const e=eio(k/.3);a=lerp(R.shF,-2.6,e);b=lerp(R.shB,-2.3,e);ln=lerp(.05,-.12,e);st=0}else if(k<.4){const e=eout(seg(k,.3,.4));a=lerp(-2.6,0,e);b=lerp(-2.3,-.3,e);ln=lerp(-.12,.4,e);st=e}else{const e=eio(seg(k,.55,1));a=lerp(0,R.shF,e);b=lerp(-.3,R.shB,e);ln=lerp(.4,.05,e);st=1-e}
  o.shF=a;o.shB=b;o.elF=-.3;o.elB=-.3;o.lean=ln;o.propA=a+1.3;o.daggerB=b+1.3;o.fF=[22+st*46,0];o.fB=[-22-st*10,0];o.hy=R.hy+st*16},
 tick(ch,p,k){if(p<.4&&k>=.4){slashFX(ch,true);const x=ch.x+ch.face*120*CS;addFX({x,y:-180*CS,life:.3,f:ch.face,draw:(f,U,q)=>{ctx.scale(f.f,1);ctx.globalAlpha=1-q;ctx.strokeStyle='#f3e0ff';ctx.lineWidth=7*U*(1-q);ctx.beginPath();ctx.moveTo(-80*U,-70*U);ctx.lineTo(80*U,70*U);ctx.moveTo(-80*U,70*U);ctx.lineTo(80*U,-70*U);ctx.stroke()}})}}};
// 스킬2 그림자 표식: 단검을 던짐 (놓는 프레임 k=.42)
SAL.acts.skill2={dur:.55,base:'idle',h:SAL,
 pose(o,k){let a,ln;if(k<.3){const e=eio(k/.3);a=lerp(R.shF,-3.0,e);ln=lerp(.05,-.15,e)}else if(k<.42){const e=eout(seg(k,.3,.42));a=lerp(-3.0,-1.3,e);ln=lerp(-.15,.2,e)}else{const e=eio(seg(k,.6,1));a=lerp(-1.3,R.shF,e);ln=lerp(.2,.05,e)}
  o.shF=a;o.elF=-.2;o.lean=ln;o.propA=k>.42&&k<.85?null:a+1.8;o.fF=[22+ln*50,0]},
 tick(ch,p,k){if(p<.42&&k>=.42){const[x,y]=mpt(ch.mats.handF,0,0);FXL.flash(x,y,50,'200,140,255');FXL.spark(x,y,8,'#c99cff',260)}}};
// 궁극기 그림자 분신: 단검을 가슴 앞에 모으고 보라 기운 폭발 (놓는 프레임 k=.35)
SAL.acts.ult={dur:.9,base:'idle',h:SAL,
 pose(o,k){const e=eback(seg(k,0,.3)),r=eio(seg(k,.75,1)),q=e*(1-r);o.shF=lerp(R.shF,-1.2,q);o.shB=lerp(R.shB,-1.0,q);o.elF=-1.6*q+R.elF*(1-q);o.elB=-1.6*q;o.propA=lerp(.6,-1.4,q);o.daggerB=lerp(.6,-1.3,q);o.lean=-.1*q;o.hy=R.hy+10*q;o.head=-.1*q},
 tick(ch,p,k,dt){if(k<.35&&Math.random()<dt*40)FXL.spark(ch.x+(Math.random()-.5)*160*CS,-Math.random()*300*CS,1,'#b07aff',150,5,-200);
  if(p<.35&&k>=.35){FXL.ring(ch.x,0,1.2*CS/.62,'180,110,255');FXL.flash(ch.x,-180*CS,150,'190,130,255');FXL.spark(ch.x,-180*CS,20,'#cf9bff',520,6,0);setShake(.25);hitstop(ch,.08)}}};
export const FILES=Object.values(SAL.P).map(p=>p.f);
SAL.files=FILES;
export default SAL;
