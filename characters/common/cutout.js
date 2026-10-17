// 컷아웃 영웅 공용 도구 (단단·살랑·토토): 캡슐 다리 + 발 이미지, 한 장짜리 팔, 무기 붙이기
import {ctx,D,M} from './core.js';
// 둥근 캡슐(외곽선 + 가로 그라데이션) — 팔다리 살/바지
export function cap(a,b,r,c1,c2,ol='#2e2a24'){ctx.lineCap='round';ctx.strokeStyle=ol;ctx.lineWidth=r*2+4;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
 const gr=ctx.createLinearGradient(a[0]-r,a[1],a[0]+r,a[1]);gr.addColorStop(0,c2);gr.addColorStop(.45,c1);gr.addColorStop(1,c2);ctx.strokeStyle=gr;ctx.lineWidth=r*2;ctx.stroke()}
// 다리: 엉덩이→무릎→발목 캡슐, 발목에 발/장화 이미지 (g = puppet legGeo 결과)
export function legDrawer(o){return function(hip,g,dk){const c1=dk?o.d1:o.c1,c2=dk?o.d2:o.c2;cap(hip,g.K,o.rT,c1,c2);cap(g.K,g.T,o.rK,c1,c2);
 ctx.save();ctx.translate(...g.T);ctx.rotate(g.rot);D(dk&&o.footB?o.footB:o.foot,dk?.3:0);ctx.restore()}}
// 한 장짜리 팔: 몸통 좌표계에서 어깨 위치 sh, 각도 a(0 = 아래로, 음수 = 앞으로). grip = 손 위치(파츠 로컬)
export function armPiece(part,sh,a,dk,grip,prop,propA){ctx.save();ctx.translate(...sh);ctx.rotate(a);
 let m=null;if(prop){ctx.save();ctx.translate(...grip);ctx.rotate(propA-a);prop();ctx.restore()}
 D(part,dk);if(grip)m=M().translate(...grip);ctx.restore();return m}
