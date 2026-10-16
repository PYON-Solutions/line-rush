// 캐릭터 엔진: 상태/포즈/스프링/업데이트/그리기 (영웅별 데이터는 characters/<hero>/rig.js)
import {ctx,H,CS,TAU,cl,lerp,ss,D,M} from './core.js';
import {solve2,rotv} from './ik.js';
import {W2S,S2W,FXL} from './effects.js';
export function newChar(hero,x,face){return {hero,x,y:0,vy:0,face,mode:'idle',t:0,act:null,at:0,combo:0,hitstop:0,alpha:1,trail:[],sp:{head:0,headV:0,hel:0,helV:0,ear:0,earV:0,ham:0,hamV:0,tail:0,tailV:0},prev:null,mats:{},fxState:{}}}
export function setMode(ch,m){ch.mode=m;ch.t=0;ch.at=0;ch.act=null;ch.landT=0;ch.jumpT=0;if(m==='jump'){ch.vy=0}
 const A=ch.hero.acts[m];if(A){ch.act=A;ch.actName=m;if(A.start)A.start(ch)}}
export function basePose(ch){const h=ch.hero,m=ch.mode,t=ch.t;const o=Object.assign({},h.rest);o.fF=[...h.rest.fF];o.fB=[...h.rest.fB];o.footRel=false;o.footRotF=0;o.footRotB=0;
 if(m==='idle'||ch.act&&ch.act.base==='idle'){const b=Math.sin(t*2.6);o.breath=b;o.hy=h.rest.hy+b*1.5;o.shF+=b*.04;o.shB-=b*.04;o.elF-=b*.05;o.head=Math.sin(t*1.3)*.03}
 if(m==='run'||ch.act&&ch.act.base==='run'){const Tc=h.Tc,p=((ch.runT||t)/Tc)%1,S=h.stride,lift=h.lift;
  const leg=q=>{q=(q%1+1)%1;if(q<.5){const k=q/.5;return [S/2-S*k,0,0]}const k=(q-.5)/.5,e=ss(k);return [-S/2+S*e,-Math.sin(Math.PI*k)*lift*(k<.5?1.15:.85),k<.35?.55*(1-k/.35)*-1+0:k>.8?-.15:0]};
  const a=leg(p),b=leg(p+.5);o.fF=[a[0]+h.rest.fF[0]*.5,a[1]];o.fB=[b[0]+h.rest.fB[0]*.5,b[1]];o.footRotF=a[2]*-1;o.footRotB=b[2]*-1;
  // toe-off: rotate foot toe-down during early swing
  const c=Math.cos(4*Math.PI*(p-.25));o.hy=h.rest.hy+h.legLen*.06+h.legLen*.055*c;o.hx=h.legLen*.02*Math.sin(TAU*p)+4;o.lean=.13+.03*c;o.sy=1-.02*c;o.sx=1+.012*c;
  const w=Math.cos(TAU*p);o.shB=-.75*w*h.armSwing;o.elB=-1.2+.3*w;o.shF=.75*w*h.armSwing;o.elF=-1.2-.3*w;o.head=-.04+.02*Math.sin(4*Math.PI*p);o.runP=p;
  if(h.runPose)h.runPose(o,p,w)}
 if(m==='jump'){const j=ch.jumpT;
  if(j<.14){const k=ss(j/.14);o.hy=lerp(h.rest.hy,h.rest.hy+h.legLen*.25,k);o.sx=1+.1*k;o.sy=1-.12*k;o.shF+=.3*k;o.shB+=.4*k}
  else if(ch.landT>0){const k=ch.landT/.18;o.hy=lerp(h.rest.hy,h.rest.hy+h.legLen*.25,k);o.sx=1+.1*k;o.sy=1-.12*k}
  else{const v=ch.vy/900;o.sy=1+cl(-v,-.3,1)*.12;o.sx=1-cl(-v,-.3,1)*.08;o.footRel=true;o.fF=[h.legLen*.3,h.legLen*.62];o.fB=[-h.legLen*.1,h.legLen*.7];o.footRotF=-.3;o.footRotB=.25;o.shF=-1.3+v*.3;o.elF=-.5;o.shB=-2.2+v*.3;o.elB=-.5;o.lean=.05;if(h.jumpPose)h.jumpPose(o)}}
 return o}
export function getPose(ch){const o=basePose(ch);if(ch.act&&ch.act.pose)ch.act.pose(o,ch.at,ch);return o}
export function springs(ch,dt,o){const s=ch.sp,pr=ch.prev||o,id=Math.max(dt,1e-3);const vy=(o.hy-pr.hy)/id+(ch.vy||0)*.15,va=((o.propA||0)-(pr.propA||0))/id;
 const st=(x,v,tg,k,d)=>{v+=(tg-x)*k*dt-v*d*dt;x+=v*dt;return [x,v]};
 [s.head,s.headV]=st(s.head,s.headV,cl(vy*.0009,-.12,.12),180,14);
 [s.hel,s.helV]=st(s.hel,s.helV,cl(-vy*.012,-4,4),260,12);
 [s.ear,s.earV]=st(s.ear,s.earV,cl(vy*.003,-.35,.35),140,6);
 [s.ham,s.hamV]=st(s.ham,s.hamV,cl(-va*.03,-.45,.45),160,9);
 [s.tail,s.tailV]=st(s.tail,s.tailV,cl(-vy*.004+(ch.mode==='run'?.25:0),-.5,.5),60,5);ch.prev=o}
export function update(ch,dt){
 if(ch.hitstop>0){ch.hitstop-=dt;return}
 ch.t+=dt;const h=ch.hero;
 if(ch.mode==='run'){ch.runT=(ch.runT||0)+dt;ch.x+=ch.face*(h.stride/(h.Tc/2))*CS*dt;const p=(ch.runT/h.Tc)%1,pp=((ch.runT-dt)/h.Tc)%1;if((pp<.5)!==(p<.5))FXL.dust(ch.x,1,10)}
 if(ch.mode==='jump'){const pj=ch.jumpT;ch.jumpT+=dt;if(pj<.14&&ch.jumpT>=.14)ch.vy=-950;
  if(ch.jumpT>=.14&&!(ch.landT>0)&&ch.landT!==-1){ch.vy+=2700*dt;ch.y+=ch.vy*dt;if(ch.y>=0&&ch.vy>0){ch.y=0;ch.vy=0;ch.landT=.18;FXL.dust(ch.x,8,80)}}
  else if(ch.landT>0){ch.landT-=dt;if(ch.landT<=0){ch.landT=-1;if(!ch.demo)setMode(ch,'idle')}}}
 if(ch.act){const A=ch.act,p=ch.at;ch.at=Math.min(1,ch.at+dt/A.dur);if(A.tick)A.tick(ch,p,ch.at,dt);if(ch.at>=1&&ch.act===A){if(A.end)A.end(ch);if(!ch.demo)setMode(ch,'idle');else ch.act=null}}
 if(ch.act&&ch.act.base==='run')ch.runT=(ch.runT||0)+dt*(ch.act.runSpeed||1);
 springs(ch,dt,getPose(ch));
 if(ch.trailOn){ch.trail.unshift({x:ch.x,y:ch.y,o:getPose(ch)});if(ch.trail.length>12)ch.trail.pop()}else if(ch.trail.length)ch.trail.pop();
}
export function drawChar(ch,o,ghost){const h=ch.hero,U=H/720,S=CS*U;const[sx,sy]=W2S(ch.x,0);
 ctx.save();ctx.translate(sx,sy);
 if(!ghost){const sh=Math.max(.35,1+ch.y/420);ctx.fillStyle='rgba(30,60,20,.28)';ctx.beginPath();ctx.ellipse(0,0,h.shadow*S*sh,20*S*sh,0,0,TAU);ctx.fill()}
 ctx.translate(0,ch.y*S);ctx.scale(S*ch.face,S);ctx.scale(o.sx,o.sy);
 const L=h.leg;const hipF=[o.hx+L.hipF[0],o.hy+L.hipF[1]],hipB=[o.hx+L.hipB[0],o.hy+L.hipB[1]];
 const legGeo=(hip,f,rel,rot)=>{const fp=rel?[hip[0]+f[0],hip[1]+f[1]]:[f[0],f[1]];const sv=rotv(L.sole,rot),ank=[fp[0]-sv[0],fp[1]-sv[1]];return Object.assign(solve2(hip[0],hip[1],ank[0],ank[1],L.knee,L.ankle,'fwd'),{rot})};
 const gF=legGeo(hipF,o.fF,o.footRel,o.footRotF||0),gB=legGeo(hipB,o.fB,o.footRel,o.footRotB||0);
 const legDraw=(hip,g,dk)=>{ if(L.draw)return L.draw(hip,g,dk);
  ctx.save();ctx.translate(...hip);ctx.rotate(g.r1);D(h.P.thigh,dk);ctx.restore();
  ctx.save();ctx.translate(...g.K);ctx.rotate(g.r2);D(h.P.shin,dk);ctx.restore();
  ctx.save();ctx.translate(...g.T);ctx.rotate(g.rot);D(h.P.foot,dk);ctx.restore()};
 const torsoFrame=()=>{ctx.translate(o.hx,o.hy+h.torsoDY);ctx.rotate(o.lean)};
 const A=h.arm;
 // arm angles: FK or IK
 const armAng=(side)=>{const ik=o['ik'+side];const sp=A['sh'+side];if(ik){const r=solve2(sp[0],sp[1],ik[0],ik[1],A.elb,[A.wri[0]+A.grip[0],A.wri[1]+A.grip[1]],ik[2]||'down');return [r.r1,r.r2-r.r1,o['wr'+side]||0]}return [o['sh'+side],o['el'+side],o['wr'+side]||0]};
 const arm=(side,dk,prop,partsMask='uphf')=>{const[a1,a2,a3]=armAng(side);ctx.save();torsoFrame();ctx.translate(...A['sh'+side]);ctx.rotate(a1);if(partsMask.includes('u'))D(h.P.ua,dk);
  ctx.translate(...A.elb);ctx.rotate(a2);ctx.save();ctx.translate(...A.wri);ctx.rotate(a3);
  const FST=side==='B'&&h.fist;if(FST&&partsMask.includes('p')){ctx.save();ctx.translate(...A.grip);h.fist(0,dk);ctx.restore()}
  if(prop&&partsMask.includes('p')){ctx.save();ctx.translate(...A.grip);ctx.rotate((o.propA||0)-o.lean-a1-a2-a3+ch.sp.ham*(h.propLag||0));prop();ctx.restore()}
  ch.mats['hand'+side]=M().translate(...A.grip);
  if(partsMask.includes('h')){if(FST){ctx.save();ctx.translate(...A.grip);h.fist(1,dk);ctx.restore()}else D(h.P.hand,dk)}ctx.restore();if(partsMask.includes('f')){D(h.P.fa,dk);if(h.faUnder){ctx.rotate(-a2);ctx.translate(-A.elb[0],-A.elb[1]);D(h.P.ua,dk)}}ctx.restore()};
 const ctxObj={o,ch,h,arm,torsoFrame,legDraw,gF,gB,hipF,hipB,head:()=>{ctx.save();torsoFrame();ctx.translate(h.neck[0],h.neck[1]+(o.breath||0)*-1.2);ctx.rotate(o.head+ch.sp.head);D(h.P.head);if(h.headExtra)h.headExtra(ch,o);ctx.restore()},
  torso:()=>{ctx.save();torsoFrame();ctx.scale(1-(o.breath||0)*.012,1+(o.breath||0)*.018);D(h.P.torso);ctx.restore()}};
 h.drawOrder(ctxObj);
 ctx.restore()}
export function renderChar(ch){const h=ch.hero;
 if(h.preDraw)h.preDraw(ch);
 ch.trail.forEach((g,i)=>{if(i%3)return;ctx.save();ctx.globalAlpha=.35*(1-i/12)*ch.alpha;const sx=ch.x,sy=ch.y;ch.x=g.x;ch.y=g.y;drawChar(ch,g.o,true);ch.x=sx;ch.y=sy;ctx.restore()});
 ctx.save();ctx.globalAlpha=ch.alpha;if(ch.glow){ctx.shadowColor=ch.glow;ctx.shadowBlur=18*(H/720)}drawChar(ch,getPose(ch));ctx.restore();
 if(h.postDraw)h.postDraw(ch)}
export const lerpPose=(o,a,b,k,keys)=>keys.forEach(kk=>o[kk]=lerp(a[kk],b[kk],k));
export function hitstop(ch,t){ch.hitstop=Math.max(ch.hitstop,t)}
export function mpt(m,x,y){if(!m)return [0,0];const p=m.transformPoint(new DOMPoint(x,y));return S2W(p.x,p.y)}
export const SIMQ=[];export function setTimeoutSim(d,fn){SIMQ.push({d,fn})}export function tickSim(dt){for(let i=SIMQ.length-1;i>=0;i--){SIMQ[i].d-=dt;if(SIMQ[i].d<=0){const f=SIMQ[i].fn;SIMQ.splice(i,1);f()}}}
