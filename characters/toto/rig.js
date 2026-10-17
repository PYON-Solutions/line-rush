// 토토 (토끼 소환사, 당근 지팡이) — 컷아웃 퍼펫. 파츠: characters/toto/*.png (rabbit_sheet 에서 잘라냄)
import {ctx,H,CS,TAU,GAME,IMG,cl,lerp,ss,eio,ein,eout,eback,seg,D,M,setShake,W2S,addFX,FXL,hitstop,mpt} from '../common/index.js';
import {cap,legDrawer,armPiece} from '../common/cutout.js';
const GRIP=[13,73],TIP=[0,-88];
const TOTO={name:'토토',key:'toto',Tc:.4,stride:56,lift:24,legLen:72,armSwing:.6,shadow:78,torsoDY:2,neck:[4,-112],propLag:.6,
 P:{torso:{f:'toto/torso',p:[130,218],s:.6},head:{f:'toto/head',p:[112,283],s:.6},sleeve:{f:'toto/sleeve',p:[55,18],s:.55},sleeve2:{f:'toto/sleeve2',p:[52,18],s:.55},
  boot:{f:'toto/boot',p:[60,16],s:.48,flip:true},boot2:{f:'toto/boot2',p:[70,14],s:.48,flip:true},staff:{f:'toto/staff',p:[85,235],s:.5},spirit:{f:'toto/spirit',p:[46,90],s:.4}},
 leg:{hipF:[14,-4],hipB:[-14,-6],knee:[0,18],ankle:[0,16],sole:[0,38]},
 rest:{hx:0,hy:-70,lean:0,sx:1,sy:1,breath:0,shF:-.45,elF:0,shB:.15,elB:0,fF:[18,0],fB:[-16,0],head:0,propA:.12},
 runPose(o,p,w){o.shF=-.5+.1*w;o.propA=.35},
 jumpPose(o){o.shF=-.8;o.propA=-.1},
 drawOrder(c){const{o,ch,h,legDraw,gF,gB,hipF,hipB}=c;
  // 동그란 꼬리
  ctx.save();c.torsoFrame();ctx.translate(-62,-24+Math.sin(ch.t*4)*1.5);const g=ctx.createRadialGradient(-4,-4,2,0,0,17);g.addColorStop(0,'#fff');g.addColorStop(1,'#e6dcd6');ctx.fillStyle=g;ctx.strokeStyle='#4a3a34';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,16,0,TAU);ctx.fill();ctx.stroke();ctx.restore();
  ctx.save();c.torsoFrame();armPiece(h.P.sleeve2,[-22,-104],o.shB,1);ctx.restore();
  legDraw(hipB,gB,1);legDraw(hipF,gF,0);c.torso();c.head();
  const staff=()=>{D(h.P.staff);ch.mats.staff=M();if(o.glow){ctx.save();ctx.translate(...TIP);const r=46+20*o.glow,gg=ctx.createRadialGradient(0,0,2,0,0,r);gg.addColorStop(0,`rgba(255,250,200,${.9*o.glow})`);gg.addColorStop(.5,`rgba(255,180,80,${.5*o.glow})`);gg.addColorStop(1,'rgba(255,160,60,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.restore()}};
  ctx.save();c.torsoFrame();ch.mats.handF=armPiece(h.P.sleeve,[26,-104],o.shF,0,GRIP,staff,o.propA);ctx.restore()},
 acts:{}};
TOTO.leg.draw=legDrawer({c1:'#fbf6f2',c2:'#d9cfc8',d1:'#d8cfc8',d2:'#b0a59e',rT:13,rK:12,foot:TOTO.P.boot,footB:TOTO.P.boot2});
const R=TOTO.rest;
function seedFX(x,y,face){addFX({x,y,vx:face*900,life:.6,up:(f,dt)=>{f.x+=f.vx*dt;if(Math.random()<.5)FXL.spark(f.x,f.y,1,'#d8ff7a',60,4,0)},draw:(f,U)=>{const r=26*U,g=ctx.createRadialGradient(0,0,2,0,0,r);g.addColorStop(0,'rgba(255,255,210,1)');g.addColorStop(.5,'rgba(190,255,90,.8)');g.addColorStop(1,'rgba(120,220,60,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill()}})}
// 기본공격: 지팡이를 앞으로 휘둘러 빛나는 씨앗 발사 (놓는 프레임 k=.4)
TOTO.acts.basic={dur:.5,base:'idle',h:TOTO,
 pose(o,k){let a,pa,ln;if(k<.3){const e=eio(k/.3);a=lerp(R.shF,-.1,e);pa=lerp(R.propA,-.35,e);ln=lerp(0,-.08,e)}else if(k<.4){const e=eout(seg(k,.3,.4));a=lerp(-.1,-1.1,e);pa=lerp(-.35,.75,e);ln=lerp(-.08,.12,e)}else{const e=eio(seg(k,.5,1));a=lerp(-1.1,R.shF,e);pa=lerp(.75,R.propA,e);ln=lerp(.12,0,e)}
  o.shF=a;o.propA=pa;o.lean=ln;o.glow=k>.15&&k<.6?Math.sin(seg(k,.15,.6)*Math.PI):0;o.fF=[18+ln*50,0]},
 tick(ch,p,k){if(p<.4&&k>=.4){const[x,y]=mpt(ch.mats.staff,...TIP);if(!GAME)seedFX(x,y,ch.face);FXL.flash(x,y,50,'230,255,170')}}};
// 스킬1 당근 정령 소환: 지팡이를 높이 들고 빙글 (놓는 프레임 k=.35)
TOTO.acts.skill1={dur:.75,base:'idle',h:TOTO,
 pose(o,k){const e=eback(seg(k,0,.3)),r=eio(seg(k,.75,1)),q=e*(1-r);o.shF=lerp(R.shF,-2.6,q);o.propA=lerp(R.propA,-.2,q)+Math.sin(k*18)*.15*q;o.lean=-.1*q;o.head=-.15*q;o.glow=q},
 tick(ch,p,k){if(p<.35&&k>=.35){const[x,y]=mpt(ch.mats.staff,...TIP);FXL.flash(x,y,90,'255,220,140');FXL.star4(x,y,60,'rgba(255,240,180,1)');FXL.spark(x,y,16,'#ffb347',360,5,100);FXL.ring(ch.x,0,.7*CS/.62,'255,200,110')}}};
// 스킬2 씨앗 폭탄: 아래에서 위로 퍼 올려 던짐 (놓는 프레임 k=.42)
TOTO.acts.skill2={dur:.6,base:'idle',h:TOTO,
 pose(o,k){let a,pa,ln;if(k<.3){const e=eio(k/.3);a=lerp(R.shF,.5,e);pa=lerp(R.propA,.9,e);ln=lerp(0,-.06,e)}else if(k<.42){const e=eout(seg(k,.3,.42));a=lerp(.5,-1.9,e);pa=lerp(.9,-.5,e);ln=lerp(-.06,.1,e)}else{const e=eio(seg(k,.55,1));a=lerp(-1.9,R.shF,e);pa=lerp(-.5,R.propA,e);ln=lerp(.1,0,e)}
  o.shF=a;o.propA=pa;o.lean=ln;o.glow=k<.5?k*2:0;o.shB=-.6*Math.sin(Math.min(1,k*2)*Math.PI)},
 tick(ch,p,k){if(p<.42&&k>=.42){const[x,y]=mpt(ch.mats.staff,...TIP);FXL.flash(x,y,60,'200,255,140');FXL.spark(x,y,10,'#a8e05a',300)}}};
// 궁극기 거대 당근 나무: 지팡이를 땅에 꽂음 (놓는 프레임 k=.45)
TOTO.acts.ult={dur:1.1,base:'idle',h:TOTO,
 pose(o,k){let a,pa,hy=R.hy;if(k<.3){const e=eback(k/.3);a=lerp(R.shF,-2.7,e);pa=lerp(R.propA,-.1,e)}else if(k<.45){const e=ein(seg(k,.3,.45));a=lerp(-2.7,-.9,e);pa=lerp(-.1,0,e);hy=R.hy+10*e}else{const e=eio(seg(k,.7,1));a=lerp(-.9,R.shF,e);pa=lerp(0,R.propA,e);hy=lerp(R.hy+10,R.hy,e)}
  o.shF=a;o.propA=pa;o.hy=hy;o.glow=k>.1&&k<.8?1:0;o.lean=k>.3&&k<.7?.12:0},
 tick(ch,p,k){if(p<.45&&k>=.45){FXL.ring(ch.x+ch.face*60*CS,0,1.1*CS/.62,'255,190,90');FXL.flash(ch.x+ch.face*60*CS,-60*CS,120,'255,230,150');FXL.dust(ch.x+ch.face*60*CS,10,120);FXL.spark(ch.x+ch.face*60*CS,0,16,'#8fd14a',500,6);setShake(.3);hitstop(ch,.08)}}};
export const FILES=Object.values(TOTO.P).map(p=>p.f);
TOTO.files=FILES;
export default TOTO;
