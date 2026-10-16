// 공용 코어: 캔버스 대상/월드 좌표 상태, 수학 유틸, 이미지 로더, 파츠 그리기(D)
// 다른 모듈은 이 파일의 let 변수를 import 하면 항상 최신 값을 보게 됨 (ES 모듈 live binding)
export let ctx=null,W=1,H=720,CS=.62,GY=560,camX=0,shake=0,GAME=false;
export function setTarget(c,w,h){ctx=c;W=w;H=h}
export function setWorld(o){if('CS'in o)CS=o.CS;if('GY'in o)GY=o.GY;if('camX'in o)camX=o.camX;if('GAME'in o)GAME=o.GAME;if('shake'in o)shake=o.shake}
export function setShake(v){shake=v}
export const cl=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,k)=>a+(b-a)*k,ss=k=>k*k*(3-2*k),eio=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2,ein=k=>k*k*k,eout=k=>1-Math.pow(1-k,3),
 eback=k=>{const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2)},seg=(k,a,b)=>cl((k-a)/(b-a),0,1),TAU=Math.PI*2;
export const IMG={};
// 파츠 이미지 경로: characters/<f>.png  (예: 'mungchi/torso' -> characters/mungchi/torso.png)
export const BASE=new URL('../',import.meta.url).href;
export function loadAll(list,cb){return new Promise(res=>{let n=0;const done=()=>{if(++n>=list.length){cb&&cb();res()}};if(!list.length){done();return}list.forEach(f=>{if(IMG[f]){if(IMG[f].complete)done();else IMG[f].addEventListener('load',done,{once:true});return}const i=new Image();i.onload=i.onerror=done;i.src=BASE+f+'.png';IMG[f]=i})})}
export const dc={};export function dark(f,k){const key=f+k;if(dc[key])return dc[key];const i=IMG[f],c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);g.globalCompositeOperation='source-atop';g.fillStyle=`rgba(20,25,60,${k})`;g.fillRect(0,0,c.width,c.height);return dc[key]=c}
// part: {f,p:[px,py],s:[sx,sy]|n,flip}
export function D(pt,dk){if(!pt)return;const s=Array.isArray(pt.s)?pt.s:[pt.s,pt.s];ctx.save();ctx.scale(s[0]*(pt.flip?-1:1),s[1]);const im=dk?dark(pt.f,(typeof dk==='number'&&dk<1)?dk:.38):IMG[pt.f];if(im)ctx.drawImage(im,-pt.p[0],-pt.p[1]);ctx.restore()}
export const ang=(x,y)=>Math.atan2(y,x);
export function M(){return ctx.getTransform()}
