// 드래곤 2D 패널: 둥실 떠오름, 날갯짓 스쿼시, 방향 반전, 피격 플래시 (그림은 오른쪽을 봄)
import { makePanel, setFlash, glowSprite, burst } from '../js/sprites2d.js';
export const dragonPaths = (name = 'dragon') => [`dragons/${name}.png`];
export function makeDragon(name = 'dragon') {
  const h = 3.1, m = makePanel(`dragons/${name}.png`, h, { order: 2.5, shadowW: .7 });
  const g = glowSprite(0xb8ffe8, h * 1.3); g.position.y = h * .55; g.material.opacity = .35; m.add(g);
  m.userData.dragon = { h, fx: 1, glow: g };
  m.userData.update = (m, e, dt, t) => {
    const U = m.userData.dragon, P = m.userData.panel, face = e.face < 0 ? -1 : 1;
    U.fx += (face - U.fx) * Math.min(1, dt * 8);
    const flap = Math.sin(t * 6), fl = Math.min(1, e.flash || 0);
    P.pivot.position.y = -.35 + Math.sin(t * 2) * .15;
    P.pivot.scale.set(U.fx * (1 - flap * .03), 1 + flap * .04 - fl * .08, 1);
    P.pivot.rotation.z = Math.sin(t * 2) * .03 * face;
    U.glow.material.opacity = .25 + .1 * Math.sin(t * 3);
    setFlash(m, fl);
  };
  m.userData.die = (m, k, start) => { const p = m.position; if (start) burst(p.x, p.y + 2, p.z + .3, { n: 30, color: [0xb8ffe8, 0xffffff, 0x7fe0c0], spd: 4, size: .3, life: 1, add: true }); m.userData.panel.pivot.scale.setScalar(Math.max(.05, 1 - k)); setFlash(m, 1 - k, 1 - k); };
  return m;
}
