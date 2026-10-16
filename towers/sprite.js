// 타워 2D 패널: 은은한 대기 동작, 발사 반동 + 총구 섬광, 레벨별 그림, 파괴 시 무너짐 + 파편
// 그림: towers/arrow_lv1~3, rapid, cannon × _blue/_red  (rapid·cannon 그림은 왼쪽을 겨눔 → 파랑팀은 좌우 반전)
import { makePanel, setFlash, burst, glowSprite, T } from '../js/sprites2d.js';
const H = 4.0;
const NAMES = { 1: 'arrow_lv1', 2: 'arrow_lv2', 3: 'arrow_lv3', rapid: 'rapid', cannon: 'cannon' };
export const towerPaths = () => Object.values(NAMES).flatMap(n => [`towers/${n}_blue.png`, `towers/${n}_red.png`]);
// 섬광 위치(패널 폭/높이 비율, 원본이 왼쪽을 볼 때)
const MUZZLE = { arrow_lv1: [0, .8], arrow_lv2: [0, .74], arrow_lv3: [0, .72], rapid: [-.3, .68], cannon: [-.36, .7] };
export function towerKey(lv, branch) { return NAMES[branch] || NAMES[Math.min(3, lv || 1)]; }
export function makeTower(lv, branch, team) {
  const key = towerKey(lv, branch);
  const m = makePanel(`towers/${key}_${team ? 'red' : 'blue'}.png`, H, { order: 2, shadowW: .9 });
  const flip = (key === 'rapid' || key === 'cannon') && !team ? -1 : 1;
  const P = m.userData.panel; P.pivot.scale.x = flip;
  const mz = MUZZLE[key], flash = glowSprite(0xfff0b0, key === 'cannon' ? 2.2 : 1.2);
  flash.position.set(mz[0] * P.w * flip, mz[1] * H, .1); flash.material.opacity = 0; m.add(flash);
  m.userData.tower = { key, flip, recoil: 0, seq: null, flash, phase: Math.random() * 6 };
  m.userData.update = updateTower; m.userData.die = dieTower;
  return m;
}
function updateTower(m, e, dt, t) {
  const U = m.userData.tower, P = m.userData.panel;
  if (U.seq === null) U.seq = e.shotSeq || 0;
  if ((e.shotSeq || 0) !== U.seq) {
    U.seq = e.shotSeq || 0; U.recoil = 1;
    const f = U.flash.position, p = m.position;
    burst(p.x + f.x, p.y + f.y, p.z + .2, { n: U.key === 'cannon' ? 10 : 4, color: U.key === 'cannon' ? [0xfff0a0, 0xff9a40, 0xaaaaaa] : 0xfff6d0, spd: U.key === 'cannon' ? 3 : 1.6, size: U.key === 'cannon' ? .3 : .14, life: .35, g: 1, add: true, sx: U.key === 'cannon' ? 1 : .6 });
  }
  U.recoil = Math.max(0, U.recoil - dt * (U.key === 'rapid' ? 9 : 4));
  const r = U.recoil * U.recoil, idle = Math.sin(t * 1.6 + U.phase) * .006, fl = Math.min(1, e.flash || 0);
  P.pivot.scale.set(U.flip * (1 + r * .05 + fl * .03), 1 - r * (U.key === 'cannon' ? .08 : .045) + idle - fl * .03, 1);
  P.pivot.rotation.z = (U.key === 'cannon' ? -U.flip * r * .05 : 0) + idle * .5;
  P.pivot.position.x = fl > .3 ? (Math.random() - .5) * .08 : 0;
  U.flash.material.opacity = r; U.flash.scale.setScalar((U.key === 'cannon' ? 2.2 : 1.2) * (.6 + r * .6));
  setFlash(m, fl * .6);
}
// 파괴: 가라앉으며 기울고 흐려짐 + 돌/나무 파편, 먼지
function dieTower(m, k, start) {
  const P = m.userData.panel, U = m.userData.tower;
  if (start) {
    const p = m.position;
    burst(p.x, p.y + 1.6, p.z + .3, { n: 22, color: [0x8a5a34, 0x9a9aa8, 0x6d4a2a, 0xb8b0a0], spd: 5, size: .3, life: 1.1, g: 12, spread: 1.4, spreadY: 1.5 });
    burst(p.x, p.y + .4, p.z + .3, { n: 10, tex: T.glow, color: 0xd8ccb0, spd: 1.2, size: 1.2, life: 1, g: -.5, spread: 1.6 });
  }
  P.pivot.position.set(Math.sin(k * 50) * .06 * (1 - k), -k * k * P.h * .45, 0);
  P.pivot.rotation.z = k * .18 * (U.flip || 1);
  P.pivot.scale.y = 1 - k * .3;
  setFlash(m, 0, 1 - k * k);
}
