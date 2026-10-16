// 삐요 (병아리 궁수, 활)
import {ctx,H,CS,TAU,GAME,IMG,cl,lerp,ss,eio,ein,eout,eback,seg,D,M,setShake,solve2,rotv,W2S,S2W,addFX,FXL,hitstop,mpt,setTimeoutSim} from '../common/index.js';
// ================= PIYO =================
const PIYO_ARMS=[-31,-82];const PIYO={armS:PIYO_ARMS,
 // procedural bow fist in the wrist frame: forearm comes from -y, +y = toward the target (front of grip), +x = thumb side (up when aiming)
 fist(front,dk){D(front?this.P.gripFront:this.P.gripHand,dk)},
 seg(pt,A,B,dk){const L=Math.hypot(B[0]-A[0],B[1]-A[1]);let sy=Math.min(pt.s*(pt.maxS||1.25),Math.max(pt.s*.75,L/pt.len));ctx.save();ctx.translate(...A);ctx.rotate(Math.atan2(B[1]-A[1],B[0]-A[0])-Math.PI/2);if(pt.fromEnd)ctx.translate(0,L-pt.len*sy);D({f:pt.f,p:pt.p,s:[pt.s,sy]},dk);ctx.restore()},
 cap(S,E,dk){const ua=Math.atan2(E[1]-S[1],E[0]-S[0])-Math.PI/2;ctx.save();ctx.translate(S[0],S[1]);ctx.rotate(Math.max(-.5,Math.min(.5,Math.atan2(Math.sin(ua),Math.cos(ua))*.5)));D(this.P.shCap,dk);ctx.restore()},
 limb(S,E,H,hand,dk,noUp){const P=this.P;this.seg(P.foS,E,H,dk);if(noUp){ctx.save();ctx.beginPath();ctx.arc(E[0],E[1],17,0,TAU);ctx.clip();this.seg(P.upS,S,E,dk);ctx.restore();this.cap(S,E,dk)}const fa=Math.atan2(H[1]-E[1],H[0]-E[0]);ctx.save();ctx.translate(...H);ctx.rotate(fa-Math.PI/2);D(hand,dk);const m=M();ctx.restore();if(!noUp){this.seg(P.upS,S,E,dk);this.cap(S,E,dk)}return m},armDS:[-30,-84],faUnder:1,name:'삐요',key:'piyo',Tc:.36,stride:84,lift:34,legLen:103,armSwing:.8,shadow:80,torsoDY:22,neck:[6,-112],
 P:{torso:{f:'piyo/torso',p:[73,160],s:.8},head:{f:'piyo/head',p:[130,205],s:.82},ua:{f:'piyo/parts/far_upper',p:[40,14],s:[.56,58/94]},fa:{f:'piyo/parts/far_forearm',p:[35,10],s:[.56,.56]},hand:{f:'piyo/parts/hand_relaxed',p:[27,16],s:.55},shCap:{f:'piyo/parts/shoulder',p:[56,58],s:.36},upS:{f:'piyo/parts/upper',p:[40,14],s:.56,len:94},foS:{f:'piyo/parts/forearm',p:[34,10],s:.56,len:70,fromEnd:1,maxS:1.1},handS:{f:'piyo/parts/hand_relaxed',p:[27,16],s:.55},handD:{f:'piyo/parts/hand_pull',p:[32,26],s:.55},gripHand:{f:'piyo/parts/hand_grip_back',p:[34,30],s:.5},gripFront:{f:'piyo/parts/hand_grip_front',p:[34,30],s:.5},
  thigh:{f:'piyo/thigh',p:[54,10],s:.7},shin:{f:'piyo/shin',p:[54,3],s:.7},foot:{f:'piyo/foot',p:[54,11],s:.7},bow:{f:'piyo/bow_body',p:[148,115],s:.82},arrow:{f:'piyo/arrow_h',p:[10,23],s:.5},wing:{f:'piyo/wing',p:[12,80],s:.62},tail:{f:'piyo/wing',p:[12,80],s:.55,flip:true}},
 arm:{shF:[10,-88],shB:[26,-92],elb:[0,58],wri:[0,39.6],grip:[0,24.8]},
 leg:{hipF:[10,0],hipB:[-10,-2],knee:[0,36],ankle:[0,35],sole:[0,32]},
 rest:{hx:0,hy:-99,lean:0,sx:1,sy:1,breath:0,shF:.04,elF:-.3,wrF:0,shB:-.5,elB:-.55,wrB:0,fF:[10,0],fB:[-12,0],head:0,propA:.5},
 runPose(o,p,w){o.shB=-.75+.08*w;o.elB=-.55;o.propA=.6+.05*w},
 drawOrder(c){const{o,ch,h,arm,legDraw,gF,gB,hipF,hipB}=c;
  ctx.save();c.torsoFrame();ctx.translate(-44,-38);ctx.rotate(-.2+ch.sp.tail+Math.sin(ch.t*3)*.08);D(h.P.tail);ctx.restore();
  if(o.wings){ctx.save();c.torsoFrame();ctx.translate(-12,-78);ctx.rotate(-1.2-o.wings);D(h.P.wing,1);ctx.restore()}
  const bow=()=>{ctx.save();D(h.P.bow);ctx.restore();ch.mats.bow=M()};
  const TM=(()=>{ctx.save();c.torsoFrame();const m=M();ctx.restore();return m})();
  if(o.aiming){ // far (bow) arm behind the body, reaching toward the target
   legDraw(hipB,gB,1);arm('B',.14,bow,'uhf');legDraw(hipF,gF,0);if(o.drawArm){const{S,E}=o.drawArm;ctx.save();c.torsoFrame();PIYO.seg(h.P.upS,S,E);ctx.restore()}c.torso();c.head();arm('B',1,bow,'p');arm('B',.14,null,'h');
  }else{arm('B',.14,bow);legDraw(hipB,gB,1);legDraw(hipF,gF,0);if(o.drawArm){const{S,E}=o.drawArm;ctx.save();c.torsoFrame();PIYO.seg(h.P.upS,S,E);ctx.restore()}c.torso();c.head()}
  if(o.wings){ctx.save();c.torsoFrame();ctx.translate(14,-78);ctx.rotate(-1.0-o.wings*1.1);D(h.P.wing);ctx.restore()}
  // string (clean V from both tips to the nock point) + nocked arrow, then the draw hand on top
  const bm=ch.mats.bow;if(bm){ctx.save();ctx.setTransform(1,0,0,1,0,0);const bs=h.P.bow.s,BX=(86-148)*bs;const T=bm.transformPoint(new DOMPoint(BX,(16-115)*bs)),Bt=bm.transformPoint(new DOMPoint(BX,(218-115)*bs)),G=bm.transformPoint(new DOMPoint(0,-17));
   let N=bm.transformPoint(new DOMPoint(BX+(o.vib||0),0));if(o.nock&&o.ikF)N=TM.transformPoint(new DOMPoint(o.ikF[0],o.ikF[1]));
   const sc=CS*(H/720);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(T.x,T.y);ctx.lineTo(N.x,N.y);ctx.lineTo(Bt.x,Bt.y);ctx.strokeStyle='rgba(60,40,25,.9)';ctx.lineWidth=2.6*sc;ctx.stroke();ctx.strokeStyle='#fff6e0';ctx.lineWidth=1.2*sc;ctx.stroke();
   if(o.nock&&o.arrows){const a=Math.atan2(G.y-N.y,G.x-N.x),len=Math.hypot(G.x-N.x,G.y-N.y)/sc+26;(o.arrows===3?[-.06,0,.06]:[0]).forEach(d=>{ctx.save();ctx.translate(N.x,N.y);ctx.rotate(a+d);ctx.scale(sc,sc);drawArrow(len);ctx.restore()});ch.fxState.nock=[N,a]}
   ctx.restore()}
  const tuck=(S)=>{ctx.save();c.torsoFrame();ctx.beginPath();ctx.ellipse(S[0]+2,S[1]-4,15,13,0,0,TAU);ctx.restore();ctx.save();ctx.clip();c.torso();ctx.restore()};
  if(o.drawArm){const{S,E,H}=o.drawArm;ctx.save();c.torsoFrame();ch.mats.handF=PIYO.limb(S,E,H,h.P.handD,0,1);ctx.restore()}
  else if(o.ikF)arm('F',0,null);else{
   const S=PIYO.armS,r=(a,l)=>[-Math.sin(a)*l,Math.cos(a)*l],u=r(o.shF,36),E=[S[0]+u[0],S[1]+u[1]],f=r(o.shF+o.elF+.25,20),Hh=[E[0]+f[0],E[1]+f[1]];
   ctx.save();c.torsoFrame();ch.mats.handF=PIYO.limb(S,E,Hh,h.P.handS);ctx.restore()}},
 acts:{}};
// procedural arrow: nock at x=0, point at x=len (local units)
function drawArrow(len){const L=len;ctx.lineCap='round';
 // fletching (3 feathers seen from side: top & bottom vanes)
 const fl=(sgn)=>{ctx.beginPath();ctx.moveTo(4,0);ctx.lineTo(8,sgn*9);ctx.quadraticCurveTo(20,sgn*10,30,sgn*2.5);ctx.lineTo(28,0);ctx.closePath();ctx.fill();ctx.stroke()};
 ctx.strokeStyle='#7a2f1e';ctx.lineWidth=1.2;ctx.fillStyle='#e9533f';fl(-1);ctx.fillStyle='#fff3e6';fl(1);
 // shaft
 ctx.strokeStyle='#5a3418';ctx.lineWidth=5.2;ctx.beginPath();ctx.moveTo(1,0);ctx.lineTo(L-12,0);ctx.stroke();ctx.strokeStyle='#c8874a';ctx.lineWidth=3;ctx.stroke();
 // nock
 ctx.fillStyle='#3d2a1a';ctx.fillRect(-1.5,-2.6,4,5.2);
 // point (steel broadhead)
 ctx.beginPath();ctx.moveTo(L+4,0);ctx.lineTo(L-12,-6);ctx.lineTo(L-9,0);ctx.lineTo(L-12,6);ctx.closePath();ctx.fillStyle='#d9e2ea';ctx.fill();ctx.strokeStyle='#4a5560';ctx.lineWidth=1.3;ctx.stroke();
 ctx.fillStyle='#ffffff';ctx.beginPath();ctx.moveTo(L+1,-.5);ctx.lineTo(L-10,-4.2);ctx.lineTo(L-9,-.8);ctx.closePath();ctx.fill()}
function shootArrow(ch,N,a,opts={}){const[wx,wy]=S2W(N.x,N.y);const sp=opts.sp||1500;addFX({x:wx,y:wy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:opts.life||.55,g:opts.g??300,f:ch.face,
 up:(f,dt)=>{f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=f.g*dt;if(f.y>-2&&f.t>.05){f.life=f.t;FXL.spark(f.x,f.y,6,'#bfe8ff',200,4);FXL.dust(f.x,3,20)}},
 draw:(f,U,k)=>{const sc=CS*U*.72;ctx.rotate(Math.atan2(f.vy,f.vx));ctx.strokeStyle='rgba(200,240,255,.5)';ctx.lineWidth=5*sc;ctx.beginPath();ctx.moveTo(-40*sc,0);ctx.lineTo(-220*sc,0);ctx.stroke();ctx.scale(sc/.72,sc/.72);ctx.translate(-90,0);drawArrow(110)}})}
function piyoShot(dur,multi,aim){return {dur,base:'idle',h:PIYO,start(ch){ch.fxState.fired=0},
 pose(o,k,ch){const R=PIYO.rest,A=PIYO.arm,sB=A.shB,sF=A.shF,steep=aim<-.4,LB=steep?-.32:-.1,a=steep?aim-LB:aim,cA=Math.cos(a),sA=Math.sin(a);
  const raise=eio(seg(k,0,.2)),rec=eio(seg(k,.8,1)),on=raise*(1-rec),rel=k>=.62;
  // anchor at the chin / beak corner; arrow line runs level (aim) from there to the bow grip at arm's length
  const anc=steep?[12,-96]:[6,-103];const reach=121;let t=60;for(let i=0;i<12;i++){const gx=anc[0]+t*cA,gy=anc[1]+t*sA;const d=Math.hypot(gx-sB[0],gy-sB[1]);t+=reach-d}
  const G=[anc[0]+t*cA,anc[1]+t*sA];
  const restG=[sB[0]+40,sB[1]+80];
  o.ikB=[lerp(restG[0],G[0],on),lerp(restG[1],G[1],on),'down'];o.wrB=0;o.propA=lerp(R.propA,a,on)+(rel?Math.sin(seg(k,.62,.74)*Math.PI)*.08:0);
  // draw hand path stays BELOW the face: rest -> set point in front of chest (under the beak) -> back along the jaw to the anchor
  const H0=[78,-80],E0=[-8,-60],EF=[-46,-106],restH=[6,-26],restE=[-4,-42],relH=[-4,-107],relE=[-52,-110];
  const L2=(p,q,e)=>[lerp(p[0],q[0],e),lerp(p[1],q[1],e)];let H,E;
  if(k<.22){const e=ss(seg(k,.03,.22));H=L2(restH,H0,e);H[1]+=Math.sin(e*Math.PI)*6;E=L2(restE,E0,e)}
  else if(k<.62){const d=eio(seg(k,.24,.52));H=L2(H0,anc,d);H[1]+=Math.sin(d*Math.PI)*3;E=L2(E0,EF,d);if(k>.52)H[1]+=Math.sin(k*260)*.4}
  else{const f=eout(seg(k,.62,.7));H=L2(anc,relH,f);E=L2(EF,relE,f);if(rec>0){H=L2(H,restH,rec);E=L2(E,restE,rec)}}
  o.ikF=[H[0],H[1]];o.drawArm={S:PIYO.armDS,E,H};o.wrF=0;o.aiming=on>.3;
  o.nock=k>=.22&&k<.62;o.arrows=multi;o.vib=rel?Math.sin((k-.62)*120)*10*Math.exp(-(k-.62)*25):0;
  const dr=k<.62?eio(seg(k,.24,.52)):1-eio(seg(k,.62,1));o.lean=LB*dr;o.head=-.04*dr+(a<-.4?-.05*dr:0);o.hy=R.hy+2*dr;o.fF=[18,0];o.fB=[-20,0]},
 tick(ch,p,k){if(GAME)return;if(p<.62&&k>=.62&&ch.fxState.nock){const[N,a]=ch.fxState.nock;(multi===3?[-.13,0,.13]:[0]).forEach(d=>shootArrow(ch,N,a+d,aim<-.5?{sp:1700,life:.5,g:0}:{}));if(multi===3)setShake(.06)}
  if(this.rain&&p<.66&&k>=.66){for(let i=0;i<16;i++){const x0=ch.x+ch.face*(140+Math.random()*360)*CS,dl=Math.random()*.6;setTimeoutSim(dl,()=>{const N={x:0,y:0};const[px,py]=W2S(x0-ch.face*120*CS,-760*CS);shootArrow(ch,{x:px,y:py},Math.atan2(1,ch.face*.18),{sp:1500,life:1.2,g:400})})}}}}}
PIYO.acts.basic=piyoShot(.8,1,-.1);PIYO.acts.skill1=piyoShot(.75,3,-.12);PIYO.acts.ult=piyoShot(1.5,1,-.62);PIYO.acts.ult.rain=true;
PIYO.acts.skill2={dur:.6,base:'idle',h:PIYO,start(ch){ch.x0=ch.x},
 pose(o,k,ch){const f=Math.sin(ch.t*42);o.wings=.55+.55*f;o.lean=-.22*Math.sin(Math.PI*k);o.footRel=ch.y<-1;if(o.footRel){o.fF=[18,78];o.fB=[-8,84];o.footRotF=-.3}o.shF=-.4;o.elF=-1.2;o.sy=1+.05*Math.sin(Math.PI*k)},
 tick(ch,p,k,dt){ch.x=ch.x0-ch.face*300*CS*eout(k);ch.y=-110*Math.sin(Math.PI*k);if(Math.random()<dt*30)addFX({x:ch.x+(Math.random()-.5)*60*CS,y:(ch.y-110)*CS,vx:(Math.random()-.5)*60,vy:40,r:Math.random()*6,life:.6,up:(f,dt)=>{f.x+=f.vx*dt;f.y+=f.vy*dt;f.r+=dt*3},draw:(f,U,q)=>{ctx.rotate(f.r);ctx.fillStyle=`rgba(255,215,60,${1-q})`;ctx.beginPath();ctx.ellipse(0,0,9*U,3.5*U,0,0,TAU);ctx.fill()}});
  if(p<1&&k>=1)FXL.dust(ch.x,6,60)},end(ch){ch.y=0}};
export const FILES=Object.values(PIYO.P).map(p=>p.f).concat(['piyo/arrow_h']);
PIYO.files=FILES;
export {drawArrow,shootArrow};
export default PIYO;
