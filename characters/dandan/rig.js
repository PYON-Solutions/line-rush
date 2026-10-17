// 단단 (거북이 탱커, 덩굴 올가미) — 컷아웃 퍼펫. 파츠: characters/dandan/*.png (turtle_sheet 에서 잘라냄)
import {ctx,H,CS,TAU,GAME,IMG,cl,lerp,ss,eio,ein,eout,eback,seg,D,M,setShake,W2S,addFX,FXL,hitstop,mpt} from '../common/index.js';
import {cap,legDrawer,armPiece} from '../common/cutout.js';
import {applyKeys,smear} from '../common/keypose.js';
const GRIP=[5,82];
const DAN={name:'단단',key:'dandan',Tc:.44,stride:64,lift:24,legLen:100,armSwing:.7,shadow:92,torsoDY:6,neck:[-4,-148],propLag:.5,
 P:{torso:{f:'dandan/torso',p:[100,226],s:.75,flip:true},head:{f:'dandan/head',p:[200,198],s:.68},shell:{f:'dandan/shell_side',p:[262,232],s:.5},
  arm:{f:'dandan/arm',p:[50,18],s:.62},armW:{f:'dandan/arm_w',p:[56,16],s:.62},foot:{f:'dandan/foot',p:[58,24],s:.55},foot2:{f:'dandan/foot2',p:[62,22],s:.55},
  coil:{f:'dandan/coil',p:[96,34],s:.42},lasso:{f:'dandan/lasso',p:[90,20],s:.42}},
 leg:{hipF:[26,-8],hipB:[-20,-10],knee:[0,20],ankle:[0,18],sole:[0,62]},
 rest:{hx:0,hy:-98,lean:0,sx:1,sy:1,breath:0,shF:-.15,elF:0,shB:.12,elB:0,fF:[24,0],fB:[-20,0],head:0,propA:.25,shellK:0},
 runPose(o,p,w){o.propA=.1},
 jumpPose(o){o.shF=-.9;o.shB=-1.4},
 drawOrder(c){const{o,ch,h,legDraw,gF,gB,hipF,hipB}=c,K=o.shellK||0;
  if(K>=.5){ // 등껍질 속에 숨음 (궁극기): 등껍질만, 회전/스쿼시
   ctx.save();ctx.translate(o.hx,o.hy+60);ctx.rotate(o.shellRot||0);ctx.scale(1.05+.1*(o.shellSq||0),1.05-.15*(o.shellSq||0));ctx.rotate(Math.PI/2);D({f:'dandan/shell_side',p:[250,232],s:.5});ctx.restore();return}
  // 뒷팔(먼 쪽) → 등껍질 → 다리 → 몸통 → 머리 → 앞팔. 등껍질은 몸통 프레임에만 붙음 (몸 흔들림·기울기만 따라감, 팔과 무관)
  ctx.save();c.torsoFrame();armPiece(h.P.armW,[-18,-128],o.shB,1);ctx.restore();
  ctx.save();c.torsoFrame();ctx.translate(-44,-92);ctx.rotate(.12+(o.shellTilt||0));D(h.P.shell);ctx.restore();
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
// ── 덩굴 올가미 키포즈 (관절 각도 세트, 스킨과 무관 · 참고: newheroes/turtle_lasso_poses_ref.jpg) ──
const KP={
 rest:   {shF:R.shF,shB:R.shB,lean:0,hy:R.hy,fF:R.fF,fB:R.fB,head:0},
 windup: {shF:-2.95,shB:.75,lean:-.2,hy:R.hy+16,fF:[44,0],fB:[-42,0],head:-.12},   // 1) 머리 위로 올가미 돌리기: 뒤로 젖힘, 다리 넓게
 throw:  {shF:-1.62,shB:1.05,lean:.34,hy:R.hy+18,fF:[60,0],fB:[-50,0],head:.08},   // 2) 던지기: 팔 쭉 앞으로, 몸 앞으로 런지
 yank:   {shF:-1.3,shB:-1.22,lean:-.42,hy:R.hy+22,fF:[52,0],fB:[-44,0],head:.16},  // 3) 당기기: 크게 뒤로 젖히고 두 손으로 팽팽한 줄
 recover:{shF:-.55,shB:-.75,lean:.02,hy:R.hy+6,fF:[26,0],fB:[-20,0],head:.1}};      // 4) 회수: 배 앞에서 줄을 감음
DAN.keyPoses=KP;
const S1=[[0,KP.rest],[.1,KP.windup],[.33,KP.windup,{ease:'lin'}],[.42,KP.throw,{smear:true}],[.62,KP.throw,{ease:'lin'}],[1,KP.rest,{ease:'io'}]];
const PULL=[[0,KP.throw],[.12,KP.yank,{smear:true}],[.55,KP.yank,{ease:'lin'}],[.68,KP.recover],[.88,KP.recover,{ease:'lin'}],[1,KP.rest,{ease:'io'}]];
// 스킬1: 0~.1 감아올림 → (홀드, 올가미 회전) → .33~.42 던지기 스냅 (놓는 프레임 k=.42) → 홀드 → 복귀
DAN.acts.skill1={dur:.75,base:'idle',h:DAN,
 pose(o,k,ch){const r=applyKeys(o,S1,k,KP.rest);if(ch)ch._kpSmear=r.moving&&r.opt.smear;
  o.propA=k<.36?k*62:o.shF+.4;o.noCoil=k>.42&&k<.95},
 tick(ch,p,k,dt){const[x,y]=mpt(ch.mats.handF,0,0);smear(ch,ch.mats.handF,[0,0],ch._kpSmear||(k>.33&&k<.44),'rgba(200,255,150,',26);
  if(k<.36&&Math.random()<dt*40)FXL.spark(x,y,1,'#a8d860',160,4,0);if(p<.1&&k>=.1){FXL.ring(x,y,.35*CS/.62,'190,240,140');FXL.dust(ch.x-ch.face*40*CS,8,40)}
  if(p<.42&&k>=.42){FXL.flash(x,y,80,'190,240,140');FXL.swoosh(ch.x,(ch.y-170)*CS,ch.face,180*CS,-2.6,.12,'rgba(160,220,90,.95)');FXL.spark(x,y,10,'#c8f08a',380);FXL.dust(ch.x+ch.face*50*CS,8,50);setShake(.14)}}};
// 올가미 명중 시(게임에서 재생): 확 뒤로 젖혀 두 손으로 당김 → 줄 감으며 회수
DAN.acts.pull={dur:.7,base:'idle',h:DAN,
 pose(o,k,ch){const r=applyKeys(o,PULL,k,KP.rest);if(ch)ch._kpSmear=r.moving&&r.opt.smear;o.noCoil=k<.6;o.propA=k<.6?o.shF:o.shF+k*30},
 tick(ch,p,k){smear(ch,ch.mats.handF,[0,0],ch._kpSmear,'rgba(200,255,150,',22);
  if(p<.12&&k>=.12){const[x,y]=mpt(ch.mats.handF,0,0);FXL.flash(x,y,55,'200,240,150');FXL.spark(x,y,8,'#a8d860',260);FXL.dust(ch.x-ch.face*40*CS,8,60);FXL.dust(ch.x+ch.face*30*CS,8,40);setShake(.18)}}};
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
// 게임에서는 퍼펫 대신 프레임 애니메이션(AI 영상 → WebP 아틀라스)으로 그림: js/heroes2d.js + characters/common/frames.js
// 아틀라스 다시 만들기: tools/dandan_frames/ (build.py → pack.py, fx.py). 퍼펫(위 P/acts)은 캐릭터 뷰어용으로 남겨 둠
DAN.frames={json:'dandan/frames/dandan.json',fx:'dandan/fx/fx.json',worldH:2.62,
 act:{basic:'attack',basic3:'attack',bash:'bash',skill1:'skill1',skill2:'skill2',ult:'ult',pull:'pull'}};
export const FILES=Object.values(DAN.P).map(p=>p.f);
DAN.files=FILES;
export default DAN;
