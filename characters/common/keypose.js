// 키포즈 시스템: 큰 동작을 '관절 각도 세트'(스킨 그림과 무관)로 정의한 키포즈 사이를 빠르게 스냅.
// 포즈 = { shF, shB, lean, hy, fF:[x,y], fB:[x,y], head, propA, ... } 숫자/배열 값만. 다른 영웅·스킨도 같은 형식으로 재사용.
// keys: [[k, pose, {ease:'snap'|'io'|'out', smear:true}], ...] (k 오름차순, 0..1). 같은 포즈를 연속 두면 '홀드'.
// snap = 짧고 빠른 전환 + 살짝 오버슈트(eback).
import {ctx,TAU,lerp,eio,eout,eback,seg} from './core.js';
import {addFX,W2S} from './effects.js';
import {mpt} from './puppet.js';
const EASE={snap:k=>eback(k),io:eio,out:eout,lin:k=>k};
function mix(a,b,e){if(Array.isArray(a))return a.map((v,i)=>lerp(v,b[i],e));return lerp(a,b,e)}
// 현재 진행률 k의 포즈를 o에 씀. 반환: {i, e, moving} (i=도착 키 인덱스, e=전환 진행, moving=전환 중)
export function applyKeys(o,keys,k,base){
  let i=1;while(i<keys.length-1&&k>keys[i][0])i++;
  const [k0,p0]=keys[i-1],[k1,p1,opt={}]=keys[i],t=k1>k0?seg(k,k0,k1):1,e=(EASE[opt.ease||'snap'])(t);
  const A=Object.assign({},base,p0),B=Object.assign({},base,p1);
  for(const n in B){const a=A[n],b=B[n];if(typeof b==='number'||Array.isArray(b))o[n]=mix(a??b,b,e);else o[n]=b}
  return {i,e:t,moving:t>0&&t<1&&!same(p0,p1),opt};
}
function same(a,b){return a===b}
// 모션 스미어/잔상: 전환 중에 손(또는 지정 행렬 점)의 궤적을 짧은 리본으로 남김
export function smear(ch,mat,pt,on,col='rgba(200,255,150,',w=22){
  const [x,y]=mpt(mat,pt[0],pt[1]),p=ch._sm;ch._sm=[x,y];
  if(!on||!p)return;const dx=x-p[0],dy=y-p[1];if(dx*dx+dy*dy<16)return;
  addFX({x:p[0],y:p[1],x2:x,y2:y,life:.16,draw:(f,U,k)=>{ctx.lineCap='round';ctx.strokeStyle=col+(0.55*(1-k))+')';ctx.lineWidth=w*(1-k*.6)*U;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo((f.x2-f.x)*U,(f.y2-f.y)*U);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,'+(0.5*(1-k))+')';ctx.lineWidth=w*.3*U;ctx.stroke()}});
}
