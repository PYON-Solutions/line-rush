// 뭉치 (곰 전사, 망치) - 파츠 배치(P), 관절(arm/leg), 휴식 포즈(rest), 동작(acts)
import {ctx,H,CS,TAU,GAME,IMG,cl,lerp,ss,eio,ein,eout,eback,seg,D,M,setShake,solve2,rotv,W2S,S2W,addFX,FXL,hitstop,mpt,setTimeoutSim} from '../common/index.js';
// ================= MUNGCHI =================
const MUNG={name:'뭉치',key:'mungchi',Tc:.46,stride:120,lift:45,legLen:153,armSwing:1,shadow:95,torsoDY:30,neck:[10,-128],propLag:1,
 P:{torso:{f:'mungchi/torso',p:[72,178],s:[1,.92]},head:{f:'mungchi/head',p:[96,200],s:.92},helmet:{f:'mungchi/helmet',p:[96,200],s:.94},ear:{f:'mungchi/ear',p:[96,200],s:.95},
  ua:{f:'mungchi/upperarm',p:[70,28],s:.62},fa:{f:'mungchi/forearm2',p:[52,19],s:.62},hand:{f:'mungchi/hand',p:[52,7],s:.62},
  thigh:{f:'mungchi/thigh',p:[52,12],s:.8},shin:{f:'mungchi/shin',p:[62,19],s:.82},foot:{f:'mungchi/foot',p:[60,15],s:.82},hammer:{f:'mungchi/hammer',p:[52,86],s:.95}},
 arm:{shF:[16,-92],shB:[-22,-95],elb:[-9.3,49.6],wri:[0,31],grip:[0,31]},
 leg:{hipF:[12,0],hipB:[-14,-2],knee:[0,40],ankle:[-1.6,64],sole:[-4,49]},
 rest:{hx:0,hy:-146,lean:0,sx:1,sy:1,breath:0,shF:-.12,elF:-.55,wrF:0,shB:.15,elB:-.4,wrB:0,fF:[14,0],fB:[-18,0],head:0,propA:.5},
 runPose(o,p,w){o.shF=-.45+.2*w;o.elF=-1.0-.15*w;o.wrF=-.1;o.propA=-.35},
 headExtra(ch,o){const s=ch.sp;ctx.save();ctx.translate(-49*.92,-94*.92);ctx.rotate(s.ear);ctx.translate(49*.92,94*.92);D(this.P.ear);ctx.restore();ctx.save();ctx.translate(0,s.hel);ctx.rotate(s.hel*.006);D(this.P.helmet);ctx.restore()},
 drawOrder(c){const{o,ch,h,arm,legDraw,gF,gB,hipF,hipB}=c;const ham=()=>{D(h.P.hammer);ch.mats.ham=M()};
  arm('B',1,null);legDraw(hipB,gB,1);legDraw(hipF,gF,0);
  if(o.behind)arm('F',0,ham,'p');c.torso();c.head();arm('F',0,ham,o.behind?'uhf':'uphf')},
 preDraw(ch){if(ch.shield>0){}},
 postDraw(ch){if(ch.shield>0){const U=H/720,k=ch.shield;const[x,y]=W2S(ch.x,(ch.y-200)*CS);const R=170*CS*U*(1+.03*Math.sin(ch.t*12));ctx.save();ctx.translate(x,y);ctx.globalAlpha=Math.min(1,k*3);
   const g=ctx.createRadialGradient(0,0,R*.4,0,0,R);g.addColorStop(0,'rgba(255,215,90,0)');g.addColorStop(.75,'rgba(255,200,60,.22)');g.addColorStop(1,'rgba(255,180,30,.55)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,R*.9,R,0,0,TAU);ctx.fill();
   ctx.strokeStyle='rgba(255,230,140,.9)';ctx.lineWidth=4*U;ctx.stroke();
   ctx.strokeStyle='rgba(255,240,180,.35)';ctx.lineWidth=2*U;for(let i=0;i<6;i++){const a=i*TAU/6+ch.t*.6;ctx.beginPath();for(let j=0;j<7;j++){const b=a+j*TAU/6*.17;const rr=R*.55;ctx.lineTo(Math.cos(b)*rr*.9,Math.sin(b)*rr)}ctx.stroke()}
   for(let i=0;i<8;i++){const a=i*TAU/8+ch.t*2;ctx.fillStyle='rgba(255,245,200,.9)';ctx.beginPath();ctx.arc(Math.cos(a)*R*.88,Math.sin(a)*R*.97,3.5*U,0,TAU);ctx.fill()}ctx.restore()}},
 acts:{}};
function mBasic(strong){return {dur:strong?.62:.44,base:'idle',
 pose(o,k,ch){const R=this.h.rest,S=strong;const up=S?1.9:1.25,wpA=S?-2.7:-2.2,end=S?-2.15:-1.75,endA=S?.35:-.05;
  let sh,el,pa,ln,step=0;
  if(k<.28){const e=eio(k/.28);sh=lerp(R.shF,up,e);el=lerp(R.elF,-.9,e);pa=lerp(R.propA,wpA,e);ln=lerp(0,S?-.18:-.1,e)}
  else if(k<.42){const e=ein(seg(k,.28,.42))*.7+seg(k,.28,.42)*.3;sh=lerp(up,end,e);el=lerp(-.9,-.15,e);pa=lerp(wpA,endA,e);ln=lerp(S?-.18:-.1,S?.3:.2,e);step=e}
  else{const e=eio(seg(k,.42,1));const ov=Math.sin(seg(k,.42,.6)*Math.PI)*(S?.25:.12)*(1-e);sh=lerp(end,R.shF,e)-ov;el=lerp(-.15,R.elF,e);pa=lerp(endA,R.propA,e)+ov;ln=lerp(S?.3:.2,0,e);step=1-e}
  o.shF=sh;o.elF=el;o.propA=pa;o.lean=ln;o.fF=[14+step*(S?34:20),0];o.fB=[-18-step*(S?14:6),0];o.hy=R.hy+step*(S?14:7);o.shB=.15-ln*1.5;o.elB=-.5-ln;o.head=ln*.3;o.behind=sh>.55},
 tick(ch,p,k){if(p<.42&&k>=.42){const[hx,hy]=mpt(ch.mats.ham,100,0);FXL.flash(hx,hy,strong?70:45);FXL.star4(hx,hy,strong?60:38,'rgba(255,250,210,1)');FXL.spark(hx,hy,strong?14:7,'#ffe9a0',strong?420:300);
   const[sx,sy]=W2S(0,0);FXL.swoosh(ch.x+ch.face*10*CS,(ch.y-210)*CS,ch.face,(strong?180:160)*CS,strong?-2.6:-2.2,strong?.5:.2,strong?'rgba(255,220,120,.9)':'rgba(255,255,255,.8)',strong?1.3:1);
   hitstop(ch,strong?.1:.05);setShake(strong?.28:.08);if(strong){FXL.ring(hx,0,.9*CS/.62);FXL.dust(hx,8,60)}}}}}
MUNG.acts.basic=mBasic(false);MUNG.acts.basic3=mBasic(true);MUNG.acts.basic.h=MUNG.acts.basic3.h=MUNG;
MUNG.acts.skill1={dur:1.0,base:'idle',h:MUNG,
 pose(o,k,ch){const R=MUNG.rest;let sh,el,pa,ln,hy=R.hy;
  if(k<.36){const e=eio(k/.36);sh=lerp(R.shF,-3.75,e);el=lerp(R.elF,-1.5,e);pa=lerp(R.propA,-2.35,e);ln=lerp(0,-.2,e)}
  else if(k<.48){const e=ein(seg(k,.36,.48));sh=lerp(-3.75,-.9,e);el=lerp(-1.5,-.05,e);pa=lerp(-2.35,.6,e);ln=lerp(-.2,.38,e)}
  else if(k<.64){const q=seg(k,.48,.64);sh=-.9+.12*Math.sin(q*Math.PI)*(1-q);el=-.05;pa=.6;ln=.38-.04*q;hy=R.hy+24}
  else{const e=eio(seg(k,.64,1));sh=lerp(-.9,R.shF,e);el=lerp(-.05,R.elF,e);pa=lerp(.6,R.propA,e);ln=lerp(.34,0,e);hy=lerp(R.hy+24,R.hy,e)}
  o.shF=sh;o.elF=el;o.propA=pa;o.lean=ln;o.hy=hy;o.shB=-ln*1.6+.1;o.elB=-.6-ln;o.head=ln*.35;o.behind=k>.1&&k<.43;
  if(ch.y<-2){o.footRel=true;o.fF=[40,128];o.fB=[-20,138];o.footRotF=-.25;o.footRotB=.2}else if(k>.48){o.fF=[44,0];o.fB=[-34,0]}},
 tick(ch,p,k){if(k<.48){const q=k/.48;ch.y=-150*Math.sin(Math.PI*Math.min(1,q*1.15))*(q<.75?1:1);if(q>.75)ch.y=-150*(1-ein((q-.75)/.25))}
  if(p<.48&&k>=.48){ch.y=0;const[hx,hy]=mpt(ch.mats.ham,100,0);FXL.ring(hx,0,1.3*CS/.62);FXL.flash(hx,-30,110);FXL.dust(hx,14,140);FXL.spark(hx,0,16,'#ffe9a0',500);hitstop(ch,.1);setShake(.32)}}};
MUNG.acts.skill2={dur:1.4,base:'idle',h:MUNG,start(ch){FXL.spark(ch.x,-120*CS,14,'#ffd34d',350,5,0)},
 pose(o,k){const e=eback(seg(k,0,.2)),r=eio(seg(k,.85,1));o.shF=lerp(-.12,-1.0,e*(1-r));o.elF=lerp(-.55,-1.7,e*(1-r));o.propA=lerp(.85,-1.45,e*(1-r));o.hy=-146+8*e*(1-r);o.lean=-.05*e*(1-r);o.shB=lerp(.15,-.6,e*(1-r))},
 tick(ch,p,k,dt){ch.shield=k<.85?Math.min(1,k*6):1-(k-.85)/.15;ch.glow=ch.shield>.05?`rgba(255,200,60,${.9*ch.shield})`:null;if(Math.random()<dt*20)FXL.star4(ch.x+(Math.random()-.5)*200*CS,-(Math.random()*300)*CS,12,'rgba(255,230,120,1)')},
 end(ch){ch.shield=0;ch.glow=null}};
MUNG.acts.ult={dur:.85,base:'run',runSpeed:2.4,h:MUNG,
 pose(o,k){const a=seg(k,0,.15),e=eio(a),r=eio(seg(k,.85,1));o.lean=lerp(.13,.45,e)*(1-r);o.shF=-1.45;o.elF=-.35;o.propA=-.15;o.hy+= (1-a)*10;},
 tick(ch,p,k,dt){ch.trailOn=k>.12&&k<.9;if(k>.15&&k<.85){ch.x+=ch.face*1500*CS*dt;if(Math.random()<dt*40){const yy=-(40+Math.random()*260)*CS;addFX({x:ch.x-ch.face*60*CS,y:yy,life:.25,f:ch.face,draw:(f,U,q)=>{ctx.strokeStyle=`rgba(255,255,255,${.7*(1-q)})`;ctx.lineWidth=3*U;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-f.f*(80+q*120)*U,0);ctx.stroke()}})}if(Math.random()<dt*25)FXL.dust(ch.x,1,30)}
  if(p<.85&&k>=.85){const[hx,hy]=mpt(ch.mats.ham,100,0);FXL.ring(hx,0,1.1*CS/.62);FXL.flash(hx,hy,90);FXL.spark(hx,hy,12,'#ffe9a0',450);setShake(.25);hitstop(ch,.08)}},end(ch){ch.trailOn=false}};
export const FILES=Object.values(MUNG.P).map(p=>p.f);
MUNG.files=FILES;
export default MUNG;
