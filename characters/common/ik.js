// 2본 IK (팔/다리)
import {cl,ang} from './core.js';
// two-bone solve: H->T, local bone vectors v1,v2 (at rot 0). pick: 'fwd' (max x) or 'up' (min y) or 'down'
export function solve2(hx,hy,tx,ty,v1,v2,pick){const l1=Math.hypot(...v1),l2=Math.hypot(...v2);let dx=tx-hx,dy=ty-hy,d=Math.hypot(dx,dy);const m=l1+l2-.3;if(d>m){dx*=m/d;dy*=m/d;d=m}if(d<Math.abs(l1-l2)+.3)d=Math.abs(l1-l2)+.3;
 const b=ang(dx,dy),al=Math.acos(cl((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));
 const c=[b-al,b+al].map(a=>[hx+l1*Math.cos(a),hy+l1*Math.sin(a)]);
 let K=pick==='fwd'?(c[0][0]>c[1][0]?c[0]:c[1]):pick==='up'?(c[0][1]<c[1][1]?c[0]:c[1]):pick==='back'?(c[0][0]<c[1][0]?c[0]:c[1]):(c[0][1]>c[1][1]?c[0]:c[1]);
 const T=[hx+dx,hy+dy];return {K,T,r1:ang(K[0]-hx,K[1]-hy)-ang(...v1),r2:ang(T[0]-K[0],T[1]-K[1])-ang(...v2)}}
export const rotv=(v,a)=>[v[0]*Math.cos(a)-v[1]*Math.sin(a),v[0]*Math.sin(a)+v[1]*Math.cos(a)];
