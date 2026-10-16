// 중앙 플랫폼 = 용의 둥지: 현무암 바위, 빛나는 용암 균열, 피어오르는 불씨, 옅은 붉은 안개
// makeLair(w) → 플랫폼 그룹(원점 = 윗면 왼쪽 끝)에 붙인다. userData.update(dt, t)를 매 프레임 호출.
import * as THREE from '../vendor/three.module.js';
import { glowSprite, burst, T } from '../js/sprites2d.js';

// 맵별 둥지 색: MAP.theme.lair = { rock, rock2, top, glow, haze, ember:[..], emberG, crystal?, leaf? } (없으면 화산 용암 둥지)
export function makeLair(w) {
  const P = (window.MAP && MAP.theme && MAP.theme.lair) || null, lava = !P;
  const rockMat = new THREE.MeshStandardMaterial({ color: P ? P.rock : 0x3b3236, roughness: 0.95, flatShading: true });
  const rockMat2 = new THREE.MeshStandardMaterial({ color: P ? P.rock2 : 0x564549, roughness: 0.9, flatShading: true, ...(P && P.crystal ? { transparent: true, opacity: 0.85, roughness: 0.2, metalness: 0.1 } : {}) });
  const glowC = new THREE.Color(P ? P.glow : 0xff6a1a);
  const lavaMat = new THREE.MeshBasicMaterial({ color: glowC, toneMapped: false });
  const g = new THREE.Group();
  // 어두운 현무암 윗면 (풀 위에 얇게)
  const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.03, 1.3), new THREE.MeshStandardMaterial({ color: P ? P.top : 0x4a3c3c, roughness: 1 }));
  top.position.set(w / 2, 0.012, -0.02); g.add(top);
  // 용암 균열 (지그재그 띠)
  const cracks = [];
  for (let i = 0; i < 7; i++) {
    let x = w * (0.12 + 0.76 * i / 6), z = -0.5 + Math.random() * 0.2;
    for (let k = 0; k < 4; k++) {
      const len = 0.25 + Math.random() * 0.25, a = (Math.random() - 0.5) * 1.6 + Math.PI / 2;
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, len), lavaMat.clone());
      c.position.set(x + Math.cos(a) * len / 2 * 0.3, 0.032, z + len / 2); c.rotation.y = (Math.random() - 0.5) * 1.2;
      g.add(c); cracks.push(c); z += len * 0.9; x += (Math.random() - 0.5) * 0.25; if (z > 0.55) break;
    }
  }
  // 균열 위 빛 (가산 합성)
  const glows = [];
  for (let i = 0; i < 5; i++) { const s = glowSprite(P ? P.glow : 0xff5a1e, 1.1); s.position.set(w * (0.15 + 0.7 * i / 4), 0.1, 0); s.material.opacity = 0.7; g.add(s); glows.push(s); }
  // 바위 (플랫폼 뒤쪽과 양 끝 — 유닛 발밑을 가리지 않도록 z<0)
  const rocks = [[0.05, -0.45, 0.55], [0.16, -0.6, 0.38], [0.94, -0.5, 0.5], [0.84, -0.62, 0.34], [0.35, -0.66, 0.3], [0.62, -0.64, 0.36], [0.5, -0.7, 0.26]];
  for (const [fx, z, s] of rocks) {
    const r = new THREE.Mesh(P && P.crystal ? new THREE.OctahedronGeometry(s * 0.8, 0) : new THREE.DodecahedronGeometry(s, 0), Math.random() < 0.5 ? rockMat : rockMat2);
    r.position.set(w * fx, s * 0.45, z); r.scale.y = 0.8 + Math.random() * 0.5; r.rotation.set(Math.random(), Math.random() * 3, Math.random()); g.add(r);
  }
  // 옅은 붉은 안개
  const haze = glowSprite(P ? P.haze : 0xff3018, w * 1.05); haze.scale.set(w * 1.15, 3.2, 1); haze.position.set(w / 2, 1.3, -0.6); haze.material.opacity = 0.16; haze.renderOrder = 0.5; g.add(haze);
  let emb = 0;
  g.userData.update = (dt, t) => {
    for (let i = 0; i < cracks.length; i++) { const k = 0.65 + 0.35 * Math.sin(t * 2.4 + i * 1.7); if (lava) cracks[i].material.color.setRGB(1, 0.32 + 0.25 * k, 0.08 * k); else cracks[i].material.color.copy(glowC).multiplyScalar(0.6 + 0.4 * k); }
    for (let i = 0; i < glows.length; i++) glows[i].material.opacity = 0.55 + 0.25 * Math.sin(t * 1.9 + i * 2.3);
    haze.material.opacity = 0.2 + 0.05 * Math.sin(t * 0.8);
    emb += dt;
    if (emb > 0.07) { emb = 0;
      const p = new THREE.Vector3(w * (0.1 + Math.random() * 0.8), 0.1, (Math.random() - 0.6) * 1.0); g.localToWorld(p);
      burst(p.x, p.y, p.z, { n: 1, tex: T.glow, color: P ? P.ember : [0xff7a2a, 0xffb347, 0xff4a1a], spd: 0.25, size: P && P.leaf ? 0.12 : 0.16, life: 2.2, g: P ? P.emberG : -0.9, vy0: 0.5, add: true });
    }
  };
  return g;
}
