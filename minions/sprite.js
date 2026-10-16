// 미니언 2D 패널: 통통 튀는 걷기(스쿼시/스트레치), 방향 전환(좌우 반전), 공격 돌진, 피격 플래시, 사망 팝
// 그림: minions/<원소>/tier0(근접)·tier1(원거리)·tier2(공성/보스).png — 기본 그림은 오른쪽을 봄
import { makePanel, setFlash, groundDecal, glowSprite, burst, T, TEAM_RGB } from '../js/sprites2d.js';
const S = 0.028;
export const ELEM_FX = { water: [0x8fd8ff, 0xffffff, 0x3a9cff], fire: [0xffb040, 0xffe070, 0xff5a2a], rock: [0xc9c3b4, 0x8a8a98, 0xe8e0d0] };
export const minionPaths = () => { const a = []; for (const e of ['water', 'fire', 'rock']) for (let i = 0; i < 3; i++) a.push(`minions/${e}/tier${i}.png`); return a; };

export function makeMinion(elem, tier, team, mt) {
  const boss = typeof MINIONS !== 'undefined' && mt === MINIONS.boss;
  const h = (mt ? mt.h : 50) * S * (tier === 0 ? 1.45 : 1.3);
  const m = makePanel(`minions/${elem}/tier${tier}.png`, h, { order: 3, shadowW: .65 });
  const ring = groundDecal(T.ring(TEAM_RGB[team] || TEAM_RGB[0]), h * .62, h * .2); m.add(ring);
  let aura = null;
  if (boss) { aura = glowSprite(team ? 0xff7050 : 0x60b8ff, h * 1.5); aura.position.y = h * .5; m.add(aura); }
  m.userData.minion = { phase: Math.random() * 6, h, elem, team, aura, boss, fx: m.userData.panel.pivot.scale.x, tier };
  m.userData.update = updateMinion; m.userData.die = dieMinion;
  return m;
}
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
