// 단단 (거북이 탱커, 덩굴 올가미) — 컷아웃 퍼펫. 파츠: characters/dandan/*.png (turtle_sheet 에서 잘라냄)
import {ctx,H,CS,TAU,GAME,IMG,cl,lerp,ss,eio,ein,eout,eback,seg,D,M,setShake,W2S,addFX,FXL,hitstop,mpt} from '../common/index.js';
import {cap,legDrawer,armPiece} from '../common/cutout.js';
const GRIP=[5,82];
const DAN={name:'단단',key:'dandan',Tc:.44,stride:64,lift:24,legLen:100,armSwing:.7,shadow:92,torsoDY:6,neck:[-4,-148],propLag:.5,
 P:{torso:{f:'dandan/torso',p:[100,226],s:.75,flip:true},head:{f:'dandan/head',p:[200,198],s:.68},shell:{f:'dandan/shell',p:[120,134],s:.72},
  arm:{f:'dandan/arm',p:[50,18],s:.62},armW:{f:'dandan/arm_w',p:[56,16],s:.62},foot:{f:'dandan/foot',p:[58,24],s:.55},foot2:{f:'dandan/foot2',p:[62,22],s:.55},
  coil:{f:'dandan/coil',p:[96,34],s:.42},lasso:{f:'dandan/lasso',p:[90,20],s:.42}},
 leg:{hipF:[26,-8],hipB:[-20,-10],knee:[0,20],ankle:[0,18],sole:[0,62]},
 rest:{hx:0,hy:-98,lean:0,sx:1,sy:1,breath:0,shF:-.15,elF:0,shB:.12,elB:0,fF:[24,0],fB:[-20,0],head:0,propA:.25,shellK:0},
 runPose(o,p,w){o.propA=.1},
 jumpPose(o){o.shF=-.9;o.shB=-1.4},
 drawOrder(c){const{o,ch,h,legDraw,gF,gB,hipF,hipB}=c,K=o.shellK||0;
  if(K>=.5){ // 등껍질 속에 숨음 (궁극기): 등껍질만, 회전/스쿼시
   ctx.save();ctx.translate(o.hx,o.hy+60);ctx.rotate(o.shellRot||0);ctx.scale(1.05+.1*(o.shellSq||0),1.05-.15*(o.shellSq||0));D({f:'dandan/shell',p:[120,180],s:.8});ctx.restore();return}
  ctx.save();c.torsoFrame();ctx.translate(-54,-92);ctx.rotate(-.12+(o.shellTilt||0));D(h.P.shell);ctx.restore();
  ctx.save();c.torsoFrame();armPiece(h.P.armW,[-26,-128],o.shB,1);ctx.restore();
  legDraw(hipB,gB,1);legDraw(hipF,gF,0);c.torso();
  if(K>0){ctx.save();ctx.translate(0,K*60);c.head();ctx.restore()}else c.head();
  ctx.save();c.torsoFrame();const coil=o.noCoil?null:()=>{D(h.P.coil)};ch.mats.handF=armPiece(h.P.arm,[40,-126],o.shF,0,GRIP,coil,o.propA);ctx.restore()},
 acts:{}};
DAN.leg.draw=legDrawer({c1:'#93b04e',c2:'#617d2c',d1:'#6f8a3c',d2:'#4a6022',rT:17,rK:15,foot:DAN.P.foot,footB:DAN.P.foot2});
const R=DAN.rest;
// 기본공격: 덩굴 감은 주먹 내지르기 (놓는 프레임 k=.42)
DAN.acts.basic={dur:.5,base:'idle',h:DAN,
 pose(o,k){let a,ln;if(k<.3){const e=eio(k/.3);a=lerp(R.shF,.7,e);ln=lerp(0,-.1,e)}else if(k<.42){const e=eout(seg(k,.3,.42));a=lerp(.7,-1.55,e);ln=lerp(-.1,.18,e)}else{const e=eio(seg(k,.5,1));a=lerp(-1.55,R.shF,e);ln=lerp(.18,0,e)}
  o.shF=a;o.lean=ln;o.shB=.12-ln;o.fF=[24+ln*80,0];o.hy=R.hy+Math.abs(ln)*14;o.propA=a*.4},
 tick(ch,p,k){if(p<.42&&k>=.42){const[x,y]=mpt(ch.mats.handF,0,0);FXL.flash(x,y,50,'210,255,170');FXL.star4(x,y,40,'rgba(230,255,200,1)');FXL.spark(x,y,8,'#cfe98a',300);hitstop(ch,.05)}}};
// 등껍질 박치기 강화 타격 (스킬2 발동 후 다음 공격): 몸을 던지는 박치기 (놓는 프레임 k=.45)
DAN.acts.bash={dur:.62,base:'idle',h:DAN,
 pose(o,k){let ln,st;if(k<.3){const e=eio(k/.3);ln=lerp(0,-.25,e);st=0}else if(k<.45){const e=eout(seg(k,.3,.45));ln=lerp(-.25,.55,e);st=e}else{const e=eio(seg(k,.55,1));ln=lerp(.55,0,e);st=1-e}
  o.lean=ln;o.shellTilt=-ln*.6;o.shF=-.4-ln;o.shB=-.6;o.fF=[24+st*44,0];o.fB=[-20-st*16,0];o.hy=R.hy+st*16;o.head=ln*.4},
 tick(ch,p,k){if(p<.45&&k>=.45){const x=ch.x+ch.face*90*CS,y=-180*CS;FXL.flash(x,y,90,'255,230,150');FXL.ring(x,0,.8*CS/.62,'255,220,140');FXL.spark(x,y,14,'#ffd27a',450);FXL.dust(x,8,60);setShake(.25);hitstop(ch,.1)}}};
// 스킬1 덩굴 올가미: 머리 위로 고리를 빙빙 돌리며 감아올림(0~.33, 약 0.23초) → 크게 휘둘러 던짐 (놓는 프레임 k=.42) → 팔을 뻗은 채 줄을 잡고 있음
DAN.acts.skill1={dur:.75,base:'idle',h:DAN,
 pose(o,k){let a,ln,b;
  if(k<.33){const q=eio(Math.min(1,k/.12));a=lerp(R.shF,-2.95,q);ln=lerp(0,-.14,q);b=lerp(R.shB,.5,q)}
  else if(k<.42){const e=eout(seg(k,.33,.42));a=lerp(-2.95,-1.15,e);ln=lerp(-.14,.26,e);b=lerp(.5,.9,e)}
  else{const e=eio(seg(k,.62,1));a=lerp(-1.15,R.shF,e);ln=lerp(.26,0,e);b=lerp(.9,R.shB,e)}
  o.shF=a;o.shB=b;o.lean=ln;o.propA=k<.33?k*58:k<.42?a+.6:a;o.noCoil=k>.42&&k<.92;o.fF=[24+ln*90,0];o.fB=[-20-ln*30,0];o.hy=R.hy+Math.abs(ln)*14;o.head=-ln*.25},
 tick(ch,p,k,dt){if(k<.33){const[x,y]=mpt(ch.mats.handF,0,0);if(Math.random()<dt*40)FXL.spark(x,y,1,'#a8d860',160,4,0);if(p<.12&&k>=.12)FXL.ring(x,y,.35*CS/.62,'190,240,140')}
  if(p<.42&&k>=.42){const[x,y]=mpt(ch.mats.handF,0,0);FXL.flash(x,y,70,'190,240,140');FXL.swoosh(ch.x,(ch.y-170)*CS,ch.face,170*CS,-2.6,.12,'rgba(160,220,90,.95)');FXL.spark(x,y,10,'#c8f08a',380);setShake(.12)}}};
// 올가미가 맞았을 때: 뒤로 젖히며 두 손으로 확 잡아당김 (게임에서 명중 시 재생)
DAN.acts.pull={dur:.55,base:'idle',h:DAN,
 pose(o,k){const e=eout(seg(k,0,.22)),r=eio(seg(k,.6,1)),q=e*(1-r);
  o.lean=-.32*q;o.shF=lerp(-1.5,-.55,e)*(1-r)+R.shF*r;o.shB=lerp(-1.3,-.45,e)*(1-r)+R.shB*r;o.noCoil=k<.9;o.propA=o.shF;
  o.fF=[24+22*q,0];o.fB=[-20-22*q,0];o.hy=R.hy+12*q;o.head=.18*q},
 tick(ch,p,k){if(p<.05&&k>=.05){const[x,y]=mpt(ch.mats.handF,0,0);FXL.flash(x,y,50,'200,240,150');FXL.spark(x,y,8,'#a8d860',260);FXL.dust(ch.x-ch.face*30*CS,8,40);setShake(.15)}}};
// 스킬2 등껍질 박치기 준비: 웅크려 등껍질에 힘을 모음
DAN.acts.skill2={dur:.55,base:'idle',h:DAN,
 pose(o,k){const e=eback(seg(k,0,.35)),r=eio(seg(k,.7,1)),q=e*(1-r);o.lean=-.15*q;o.hy=R.hy+18*q;o.shF=-.9*q+R.shF;o.shB=-.9*q;o.shellTilt=.2*q;o.head=.1*q},
 tick(ch,p,k){if(p<.3&&k>=.3){FXL.ring(ch.x,0,.6*CS/.62,'255,215,120');FXL.flash(ch.x-ch.face*40*CS,-170*CS,90,'255,220,140');FXL.spark(ch.x,-160*CS,12,'#ffd27a',300,5,0)}}};
// 궁극기 대지 진동: 등껍질에 숨었다가(0~.35) 뛰어올라 쿵 (놓는 프레임 k=.62)
DAN.acts.ult={dur:1.25,base:'idle',h:DAN,
 pose(o,k,ch){const hide=seg(k,0,.2),out=seg(k,.85,1);o.shellK=hide*(1-out);o.shellRot=k<.62?Math.sin(k*50)*.08*hide:0;o.shellSq=k>.62&&k<.75?Math.sin(seg(k,.62,.75)*Math.PI):0;o.head=-.3*hide;o.hy=R.hy+20*hide*(1-out)},
 tick(ch,p,k,dt){if(k>.35&&k<.62){const q=seg(k,.35,.62);ch.y=-160*Math.sin(Math.PI*q)}else ch.y=0;
  if(p<.62&&k>=.62){ch.y=0;FXL.ring(ch.x,0,1.6*CS/.62,'220,190,120');FXL.ring(ch.x,0,1.1*CS/.62,'255,240,170');FXL.flash(ch.x,-40*CS,140,'255,235,170');FXL.dust(ch.x,18,260);FXL.spark(ch.x,0,22,'#c9a46a',600,7);setShake(.45);hitstop(ch,.12)}},
 end(ch){ch.y=0}};
export const FILES=Object.values(DAN.P).map(p=>p.f);
DAN.files=FILES;
export default DAN;
