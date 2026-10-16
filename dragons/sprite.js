// 드래곤 2D 패널 (그림은 오른쪽을 봄). 기본: 부위 리그(dragons/<이름>_rig/atlas.png + rig.json)
//  날개 퍼덕임(양 날개 어깨 기준 회전), 꼬리 흔들기(끝으로 갈수록 더 휨), 머리 끄덕임, 공격 시 목 내밀기 + 입 벌려 불 뿜기, 몸 둥실
// 리그가 없으면(또는 ?rig=0) 예전처럼 그림 한 장(둥실 + 날갯짓 스쿼시)
import { makePanel, setFlash, glowSprite, burst, THREE } from '../js/sprites2d.js';
import { rigOf, loadRigs, makeRigPanel, poseRig, rigTip } from '../js/rig2d.js';
export const dragonPaths = (name = 'dragon') => [`dragons/${name}.png`];
export const loadDragonRig = (name = 'dragon') => loadRigs([`dragons/${name}_rig`]);
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
export function makeDragon(name = 'dragon') {
  const h = 3.1, rig = rigOf(`dragons/${name}_rig`);
  const m = rig ? makeRigPanel(rig, h, { order: 2.5, shadowW: .7 }) : makePanel(`dragons/${name}.png`, h, { order: 2.5, shadowW: .7 });
  const g = glowSprite(0xb8ffe8, h * 1.3); g.position.y = h * .55; g.material.opacity = .35; m.add(g);
  m.userData.dragon = { h, fx: 1, glow: g, pose: { body: {}, wingN: {}, wingF: {}, tail: {}, head: {}, jaw: {} }, atk: -1, lastCd: 0, tip: new THREE.Vector3(), fired: false, mouth: null };
  const U = m.userData.dragon;
  if (rig) { U.mouth = glowSprite(0xffa040, h * .4); U.mouth.material.opacity = 0; U.mouth.renderOrder = 2.7; m.userData.panel.pivot.add(U.mouth); }
  m.userData.update = rig ? updateRig : (m, e, dt, t) => {
    const U = m.userData.dragon, P = m.userData.panel, face = e.face < 0 ? -1 : 1;
    U.fx += (face - U.fx) * Math.min(1, dt * 8);
    const flap = Math.sin(t * 6), fl = Math.min(1, e.flash || 0);
    P.pivot.position.y = -.35 + Math.sin(t * 2) * .15;
    P.pivot.scale.set(U.fx * (1 - flap * .03), 1 + flap * .04 - fl * .08, 1);
    P.pivot.rotation.z = Math.sin(t * 2) * .03 * face;
    U.glow.material.opacity = .25 + .1 * Math.sin(t * 3);
    setFlash(m, fl);
  };
  m.userData.die = (m, k, start) => {
    const p = m.position; if (start) burst(p.x, p.y + 2, p.z + .3, { n: 30, color: [0xb8ffe8, 0xffffff, 0x7fe0c0], spd: 4, size: .3, life: 1, add: true });
    const P = m.userData.panel;
    if (P.R) { const U = m.userData.dragon, Q = U.pose; Q.t = performance.now() / 1000; Q.body.r = ease(k) * .5; Q.body.dy = -ease(k) * 60; Q.wingN.r = -ease(k) * .5; Q.wingF.r = -ease(k) * .4; Q.head.r = -ease(k) * .4; Q.jaw.r = -.3 * ease(k); poseRig(m, Q); if (U.mouth) U.mouth.material.opacity = 0; }
    else P.pivot.scale.setScalar(Math.max(.05, 1 - k));
    setFlash(m, P.R ? k * .6 : 1 - k, 1 - k);
  };
  return m;
}
function updateRig(m, e, dt, t) {
  const U = m.userData.dragon, P = m.userData.panel, face = e.face < 0 ? -1 : 1, Q = U.pose, H = P.R.H;
  U.fx += (face - U.fx) * Math.min(1, dt * 8);
  const fl = Math.min(1, e.flash || 0);
  // 공격 감지: 엔진이 공격할 때 cd를 1.6으로 다시 채움
  const cd = e.cd || 0; if (cd > U.lastCd + .5 && cd > 1) { U.atk = 0; U.fired = false; } U.lastCd = cd;
  if (U.atk >= 0) { U.atk += dt / .75; if (U.atk >= 1) U.atk = -1; }
  const k = U.atk, ka = k >= 0 ? Math.sin(Math.min(1, k * 1.15) * Math.PI) : 0, jaw = k >= 0 ? Math.sin(Math.min(1, Math.max(0, (k - .1) / .75)) * Math.PI) : 0;
  P.pivot.position.y = -.35 + Math.sin(t * 2) * .12;
  P.pivot.scale.set(U.fx, 1, 1); P.pivot.rotation.z = 0; P.pivot.position.x = face * ka * U.h * .07; // 공격: 몸째 앞으로 쑥
  Q.t = t;
  const flap = Math.sin(t * 6.2);
  Q.body.px = 0; Q.body.py = H * .45; Q.body.r = Math.sin(t * 2) * .025 - ka * .05 + fl * .1; Q.body.dy = -flap * 6; Q.body.dx = -fl * 12; Q.body.sy = 1 - fl * .04; Q.body.sx = 1;
  // 날개: 위로 들 때(+) 조금 길어지고 아래로 내릴 때 짧아짐(원근)
  Q.wingN.r = .3 * flap + .02; Q.wingN.sy = .92 + .1 * flap; Q.wingN.sx = 1;
  const f2 = Math.sin(t * 6.2 - .35); Q.wingF.r = .09 * f2; Q.wingF.sy = .92 + .1 * f2;
  Q.tail.bend = Math.sin(t * 1.7) * .35 + fl * .2; Q.tail.r = Math.sin(t * 1.7 - .6) * .04;
  Q.head.r = Math.sin(t * 2 + 1) * .03 - ka * .04 + fl * .12; Q.head.dx = ka * 4; Q.head.dy = Math.sin(t * 2 + .5) * 3;
  Q.jaw.r = -.42 * jaw - (Math.sin(t * .9) > .97 ? .08 : 0);
  poseRig(m, Q);
  // 불 뿜기: 입 앞 빛 + 앞쪽으로 날아가는 불똥
  if (U.mouth) {
    U.mouth.material.opacity = jaw * .95;
    if (jaw > .01 && rigTip(m, 'jaw', U.tip)) { U.mouth.position.copy(U.tip); U.mouth.position.x += .15; const z = U.h * (.25 + jaw * .35); U.mouth.scale.set(z, z, 1); }
    if (!U.fired && k > .3) {
      U.fired = true; const p = m.position, tx = p.x + U.tip.x * U.fx, ty = p.y + P.pivot.position.y + U.tip.y;
      burst(tx, ty, p.z + .4, { n: 16, color: [0xffd060, 0xff8030, 0xff4020, 0xffffff], spd: 1.6, vx0: 5.5 * face, vy0: -.5, g: 1, size: .32, life: .5, add: true, spreadY: .2 });
    }
  }
  U.glow.material.opacity = .25 + .1 * Math.sin(t * 3);
  setFlash(m, fl);
}
