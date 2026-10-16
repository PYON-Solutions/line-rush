// 기지 2D 패널: 5단계(초가집→나무집→돌집→성→동물 왕국 성), 팀 깃발은 그림에 포함, 피격 흔들림, 업그레이드 반짝임
import { makePanel, setFlash, burst, glowSprite, T } from '../js/sprites2d.js';
export const basePaths = () => [1, 2, 3, 4, 5].flatMap(i => [`bases/stage${i}_blue.png`, `bases/stage${i}_red.png`]);
export const baseHeight = st => 4.3 + st * 0.35;
export function makeBase(stage, team, upgraded) {
  const h = baseHeight(stage);
  const m = makePanel(`bases/stage${stage + 1}_${team ? 'red' : 'blue'}.png`, h, { order: 1.8, shadowW: .95 });
  m.userData.base = { h, seq: null, recoil: 0, sparkle: upgraded ? 1 : 0, glow: null };
  if (upgraded) { const g = glowSprite(0xfff2a0, h * 1.6); g.position.y = h * .5; m.add(g); m.userData.base.glow = g; m.userData.base.burst = true; }
  m.userData.update = updateBase; m.userData.die = dieBase;
  return m;
}
function updateBase(m, e, dt, t) {
  const U = m.userData.base, P = m.userData.panel, p = m.position;
  if (U.burst) { U.burst = false; burst(p.x, p.y + U.h * .4, p.z + .4, { n: 30, tex: T.star, color: [0xffffff, 0xffe066, 0xfff6c0], spd: 4, size: .45, life: 1.1, g: 2, spread: 2.5, spreadY: U.h * .6, add: true }); }
  if (U.sparkle > 0) { U.sparkle = Math.max(0, U.sparkle - dt * .8); if (U.glow) U.glow.material.opacity = U.sparkle; if (Math.random() < dt * 25 * U.sparkle) burst(p.x + (Math.random() - .5) * 3, p.y + Math.random() * U.h, p.z + .4, { n: 1, tex: T.star, color: 0xfff6c0, spd: .5, size: .4, life: .6, g: 0, add: true }); }
  if (U.seq === null) U.seq = e.shotSeq || 0;
  if ((e.shotSeq || 0) !== U.seq) { U.seq = e.shotSeq || 0; U.recoil = 1; }
  U.recoil = Math.max(0, U.recoil - dt * 4);
  const fl = Math.min(1, e.flash || 0);
  P.pivot.position.x = Math.sin(t * 70) * fl * .1;
  P.pivot.scale.set(1 + fl * .02, 1 - fl * .03 - U.recoil * U.recoil * .03, 1);
  setFlash(m, fl * .5);
}
function dieBase(m, k, start) {
  const P = m.userData.panel, p = m.position;
  if (start) burst(p.x, p.y + 2, p.z + .5, { n: 40, color: [0x8a5a34, 0x9a9aa8, 0xb8b0a0, 0xffd23f], spd: 6, size: .35, life: 1.4, g: 10, spread: 3, spreadY: 2 });
  P.pivot.position.set(Math.sin(k * 60) * .1 * (1 - k), -k * k * P.h * .5, 0); setFlash(m, 0, 1 - k * k);
}
