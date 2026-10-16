// 미니언 2D 패널. 기본: 부위 리그(minions/<원소>/tier<n>/atlas.png + rig.json, js/rig2d.js)
//  걷기(다리 번갈아 + 몸 들썩), 숨쉬기, 무기 휘두르기/지팡이 들어 시전, 피격 젖힘, 사망(뒤로 넘어지며 사라짐), 불꽃 일렁임·물 출렁임
// 리그를 못 불러오면(또는 ?rig=0) 예전처럼 그림 한 장 패널(스쿼시/스트레치)
// 그림: minions/<원소>/tier0(근접)·tier1(원거리 마법사)·tier2(공성/보스).png — 그림은 모두 오른쪽을 봄 (왼쪽으로 갈 때 좌우 반전)
import { makePanel, setFlash, groundDecal, glowSprite, burst, T, TEAM_RGB, THREE } from '../js/sprites2d.js';
import { rigOf, loadRigs, makeRigPanel, poseRig, rigTip } from '../js/rig2d.js';
export const ELEM_FX = { water: [0x8fd8ff, 0xffffff, 0x3a9cff], fire: [0xffb040, 0xffe070, 0xff5a2a], rock: [0xc9c3b4, 0x8a8a98, 0xe8e0d0] };
const ELEMS = ['water', 'fire', 'rock'];
export const minionPaths = () => { const a = []; for (const e of ELEMS) for (let i = 0; i < 3; i++) a.push(`minions/${e}/tier${i}.png`); return a; };
export const minionRigDirs = () => { const a = []; for (const e of ELEMS) for (let i = 0; i < 3; i++) a.push(`minions/${e}/tier${i}`); return a; };
export const loadMinionRigs = () => loadRigs(minionRigDirs());
// 무기 휘두르는 방향 (+1: 들어올리기=반시계). 망치가 몸 뒤(왼쪽 아래)에 있는 불 공성은 반대
const SWING_DIR = { 'fire/2': -1 };

export function makeMinion(elem, tier, team, mt) {
  const boss = typeof MINIONS !== 'undefined' && mt === MINIONS.boss;
  // 화면 키(월드 단위). 영웅 ≈ 2.2: 근접은 허리 높이, 원거리는 영웅만큼, 공성은 더 크게, 보스는 확실히 크게
  const h = boss ? 3.7 : [1.2, 2.05, 2.85][tier] || 2;
  const rig = rigOf(`minions/${elem}/tier${tier}`);
  const m = rig ? makeRigPanel(rig, h, { order: 3, shadowW: .6 }) : makePanel(`minions/${elem}/tier${tier}.png`, h, { order: 3, shadowW: .6 });
  const ring = groundDecal(T.ring(TEAM_RGB[team] || TEAM_RGB[0]), h * .62, h * .2); m.add(ring);
  let aura = null;
  if (boss) { aura = glowSprite(team ? 0xff7050 : 0x60b8ff, h * 1.5); aura.position.y = h * .5; m.add(aura); }
  m.userData.minion = { phase: Math.random() * 6, h, elem, team, aura, boss, fx: m.userData.panel.pivot.scale.x, tier, rig: !!rig,
    sdir: SWING_DIR[elem + '/' + tier] || 1, pose: {}, tip: new THREE.Vector3(), cast: null, t0: Math.random() * 9 };
  if (rig && tier === 1) { const g = glowSprite(ELEM_FX[elem][0], h * .5); g.material.opacity = 0; g.renderOrder = 3.2; m.userData.panel.pivot.add(g); m.userData.minion.cast = g; }
  m.userData.update = rig ? updateRig : updateMinion; m.userData.die = rig ? dieRig : dieMinion;
  return m;
}
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const Q = () => ({});
function pq(U, n) { return U.pose[n] || (U.pose[n] = Q()); }
// 공통 포즈 계산. k=공격 진행(0..1, 공격 아니면 -1), fl=피격, die=사망 진행
function rigPose(m, U, moving, k, fl, t, die) {
  const R = m.userData.panel.R, H = R.H, p = U.phase, roleOf = n => R.byName[n] && R.byName[n].def.role;
  const P = U.pose; P.t = t + U.t0;
  const sinP = Math.sin(p), atk = k >= 0, ka = atk ? Math.sin(k * Math.PI) : 0;
  const body = pq(U, 'body');
  const breathe = Math.sin(P.t * 3.2) * .018;
  body.px = 0; body.py = 0;
  body.dy = moving ? Math.abs(Math.cos(p)) * H * .035 : 0;
  body.dx = -fl * H * .03;
  body.r = (moving ? -.05 + Math.sin(p * 2) * .015 : 0) + fl * .14 - ka * .07;
  body.sy = 1 + breathe - fl * .06 + (moving ? (Math.abs(Math.cos(p)) - .5) * .04 : 0); body.sx = 1 - breathe * .5 + fl * .03;
  if (die > 0) { const e = ease(die); body.px = -R.W * .22; body.r = e * 1.0; body.dx = -e * H * .06; body.dy = -e * H * .04; body.sy = 1 - e * .08; body.sx = 1; }
  // 원소 효과
  const el = U.elem;
  P.bodyWob = el === 'fire' ? 1.6 : 0; P.bodyJig = el === 'water' ? Math.sin(P.t * 5.5) * .025 + (moving ? Math.cos(p * 2) * .02 : 0) + fl * .05 : 0;
  // 다리
  const lf = pq(U, 'legF'), lb = pq(U, 'legB');
  const swingL = moving ? .3 : 0;
  lf.r = swingL * sinP + (atk ? -.12 * ka : 0); lb.r = -swingL * sinP + (atk ? .08 * ka : 0);
  lf.dy = moving ? Math.max(0, -sinP) * H * .025 : 0; lb.dy = moving ? Math.max(0, sinP) * H * .025 : 0;
  // 몸이 들썩여도 발은 땅에: 다리는 몸 반대로 내려줌
  lf.dy -= body.dy * .85; lb.dy -= body.dy * .85;
  if (die > 0) { lf.r = lb.r = -ease(die) * .3; }
  // 반대 팔(바위)
  const ab = pq(U, 'armB'), aa = U.tier === 2 ? .45 : 1; ab.r = (moving ? -sinP * .22 : Math.sin(P.t * 2) * .04) * aa; if (atk) ab.r = -.2 * ka * aa;
  // 머리
  const hd = pq(U, 'head');
  hd.r = (moving ? Math.sin(p * 2) * .035 : Math.sin(P.t * 2.1) * .03) - ka * .045 + fl * .12 + (die > 0 ? ease(die) * .3 : 0);
  hd.dy = moving ? -Math.abs(Math.cos(p)) * H * .008 : Math.sin(P.t * 3.2 - .6) * H * .004;
  hd.r *= U.tier === 2 ? .6 : 1;
  hd.wob = roleOf('head') === 'flameHead' ? 4.5 : 0;
  // 무기
  const wp = pq(U, 'weapon'), role = roleOf('weapon'), d = U.sdir;
  wp.r = moving ? sinP * .1 : Math.sin(P.t * 2.4) * .04; wp.dx = 0; wp.dy = 0;
  if (atk) {
    if (role === 'staff') { wp.dy = H * .02 * ka; wp.r = -.22 * ka; }
    else if (role === 'punch') { wp.dx = H * .03 * Math.sin(Math.min(1, k * 1.3) * Math.PI); wp.r = k < .35 ? .12 * ease(k / .35) : .12 - .3 * Math.sin(Math.min(1, (k - .35) / .65) * Math.PI); }
    else {
      const up = role === 'hammer' ? .42 : role === 'bag' ? .5 : .95, down = role === 'hammer' ? .2 : role === 'bag' ? .3 : .55;
      // 0~.4 들어올림, .4~.7 내려침, .7~1 복귀
      wp.r = d * (k < .4 ? up * ease(k / .4) : k < .7 ? up - (up + down) * ease((k - .4) / .3) : -down * (1 - ease((k - .7) / .3)));
    }
  }
  wp.r += fl * .2;
  if (die > 0) wp.r = ease(die) * .5;
  poseRig(m, P);
}
function updateRig(m, e, dt, t) {
  const U = m.userData.minion, P = m.userData.panel, face = e.face < 0 ? -1 : 1;
  const moving = !!e.walking;
  U.phase += dt * (moving ? (U.boss ? 7 : U.tier === 2 ? 8 : 10) : 0);
  const sw = e.swing || 0, k = sw > 0 ? 1 - sw : -1, fl = Math.min(1, e.flash || 0);
  U.fx += (face - U.fx) * Math.min(1, dt * 16);
  P.pivot.scale.set(U.fx, 1, 1);
  P.pivot.position.set(k >= 0 && U.tier !== 1 ? face * Math.sin(k * Math.PI) * U.h * .1 : 0, 0, 0);
  P.pivot.rotation.z = 0;
  rigPose(m, U, moving, k, fl, t, 0);
  if (U.cast) { // 지팡이 끝 시전 빛
    const a = k >= 0 ? Math.sin(k * Math.PI) : 0; U.cast.material.opacity = a * .9;
    if (a > .01 && rigTip(m, 'weapon', U.tip)) { U.cast.position.copy(U.tip); const z = U.h * (.35 + a * .35); U.cast.scale.set(z, z, 1); }
  }
  setFlash(m, fl);
  if (m.userData.shadow) m.userData.shadow.scale.x = P.w * .65 * (1 - (moving ? Math.abs(Math.cos(U.phase)) * .12 : 0));
  if (U.aura) { const p = .85 + Math.sin(t * 4) * .15; U.aura.scale.set(U.h * 1.5 * p, U.h * 1.5 * p, 1); U.aura.material.opacity = .55 + .25 * Math.sin(t * 5); }
}
// 사망: 뒤로 넘어지며 하얗게 사라짐 + 원소 색 파티클
function dieRig(m, k, start) {
  const U = m.userData.minion, P = m.userData.panel;
  if (start) {
    const p = m.position;
    burst(p.x, p.y + U.h * .45, p.z + .1, { n: U.boss ? 26 : 12, color: ELEM_FX[U.elem] || ELEM_FX.water, spd: 3.2, size: .2 * (U.h / 1.4), life: .55, add: true });
    burst(p.x, p.y + U.h * .5, p.z + .1, { n: 5, tex: T.star, color: 0xffffff, spd: 2, size: .35, life: .45, g: 2, add: true });
    if (U.cast) U.cast.material.opacity = 0;
  }
  rigPose(m, U, false, -1, 0, performance.now() / 1000, Math.max(.001, k));
  setFlash(m, k * .7, 1 - k * k);
  if (m.userData.shadow) m.userData.shadow.material.opacity = .8 * (1 - k);
}

// ---------- 예전 방식(그림 한 장) ----------
function updateMinion(m, e, dt, t) {
  const U = m.userData.minion, P = m.userData.panel, face = e.face < 0 ? -1 : 1;
  const moving = !!e.walking;
  U.phase += dt * (moving ? (U.boss ? 7 : U.tier === 2 ? 8 : 10) : 0);
  const b = moving ? Math.abs(Math.sin(U.phase)) : 0;            // 0=착지, 1=공중
  const breathe = Math.sin(t * 3.2 + U.phase) * .025;
  let sy = 1 + breathe + (moving ? (b - .45) * .18 : 0);
  // 공격 돌진 (swing 1→0)
  const sw = e.swing || 0, k = sw > 0 ? Math.sin((1 - sw) * Math.PI) : 0;
  const fl = Math.min(1, e.flash || 0);
  sy -= fl * .16 + k * .06;
  const sx = 1 / Math.max(.75, sy);
  U.fx += (face - U.fx) * Math.min(1, dt * 16);                  // 뒤집힐 때 살짝 납작해지며 돌아섬
  P.pivot.scale.set(U.fx * sx, sy, 1);
  P.pivot.position.set(face * k * U.h * .28, b * U.h * .14, 0);
  P.pivot.rotation.z = -face * (k * .28 + (moving ? Math.sin(U.phase * 2) * .04 : 0));
  setFlash(m, fl);
  if (m.userData.shadow) m.userData.shadow.scale.x = P.w * .65 * (1 - b * .25);
  if (U.aura) { const p = .85 + Math.sin(t * 4) * .15; U.aura.scale.set(U.h * 1.5 * p, U.h * 1.5 * p, 1); U.aura.material.opacity = .55 + .25 * Math.sin(t * 5); }
}
// 사망 팝: 옆으로 퍼지며 납작 → 사라짐 + 원소 색 파티클
function dieMinion(m, k, start) {
  const U = m.userData.minion, P = m.userData.panel;
  if (start) {
    const p = m.position;
    burst(p.x, p.y + U.h * .45, p.z + .1, { n: U.boss ? 26 : 12, color: ELEM_FX[U.elem] || ELEM_FX.water, spd: 3.2, size: .2 * (U.h / 1.4), life: .55, add: true });
    burst(p.x, p.y + U.h * .5, p.z + .1, { n: 5, tex: T.star, color: 0xffffff, spd: 2, size: .35, life: .45, g: 2, add: true });
  }
  const e = 1 - Math.pow(1 - k, 2);
  P.pivot.scale.set((1 + e * .7) * Math.sign(U.fx || 1), Math.max(.05, 1 - e * .8), 1);
  setFlash(m, 1 - k, 1 - k);
  if (m.userData.shadow) m.userData.shadow.material.opacity = .8 * (1 - k);
}
