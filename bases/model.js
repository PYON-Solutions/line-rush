// 기지 3D 모델 (stage 0~4: 초가집→동물 왕국 성, team 0 파랑 / 1 빨강)
import { THREE, g, mat, add, sphere, cyl, cone, box, capsule, face, limbRefs, starMesh, collectMats, torushandle } from '../js/models.js';
export function makeBase(stage, team) {
  const root = new THREE.Group();
  const accent = team === 0 ? 0x3a8fff : 0xff4a4a;
  const wood = 0x8a5e3a, stone = 0xb0a898, straw = 0xe8c84a, dark = 0x5a3e28;
  if (stage === 0) {
    // straw hut — soft thatch dome
    add(root, box(1.6, 1.0, 1.4, stone), 0, 0.5, 0);
    add(root, sphere(1, straw), 0, 1.35, 0, 1.15, 0.7, 1.05);
    add(root, sphere(1, 0xd4a830), 0, 1.55, 0, 0.85, 0.45, 0.8);
    add(root, box(0.4, 0.55, 0.08, wood), 0, 0.35, 0.72);
    add(root, box(0.25, 0.25, 0.08, 0x88aacc), 0.4, 0.6, 0.72);
  } else if (stage === 1) {
    // wooden cabin
    add(root, box(1.8, 1.2, 1.5, wood), 0, 0.6, 0);
    add(root, box(2.0, 0.15, 1.7, dark), 0, 1.25, 0);
    add(root, cone(0.1, 0.01, dark), 0, 1.5, 0); // placeholder roof ridge
    add(root, box(2.1, 0.8, 0.15, dark), 0, 1.55, 0, 1, 1, 1, 0.4, 0, 0);
    add(root, box(2.1, 0.8, 0.15, dark), 0, 1.55, 0, 1, 1, 1, -0.4, 0, 0);
    add(root, box(0.4, 0.6, 0.08, dark), 0, 0.4, 0.78);
  } else if (stage === 2) {
    // stone house + catapult
    add(root, box(2.0, 1.4, 1.6, stone), 0, 0.7, 0);
    add(root, box(2.2, 0.3, 1.8, 0x888880), 0, 1.5, 0);
    add(root, box(0.35, 0.5, 0.08, wood), 0, 0.35, 0.82);
    // catapult
    add(root, cyl(0.06, 0.06, 0.8, wood), 0.7, 1.7, 0.3, 1, 1, 1, 0, 0, 0.5);
    add(root, box(0.35, 0.1, 0.25, wood), 0.9, 2.05, 0.5);
  } else if (stage === 3) {
    // castle + cannons
    add(root, box(2.2, 1.8, 1.8, 0xc8c0b0), 0, 0.9, 0);
    add(root, box(0.5, 0.6, 0.5, 0xc8c0b0), -0.95, 2.0, -0.6);
    add(root, box(0.5, 0.6, 0.5, 0xc8c0b0), 0.95, 2.0, -0.6);
    add(root, box(0.5, 0.6, 0.5, 0xc8c0b0), -0.95, 2.0, 0.6);
    add(root, box(0.5, 0.6, 0.5, 0xc8c0b0), 0.95, 2.0, 0.6);
    add(root, box(2.4, 0.25, 2.0, 0x888880), 0, 1.85, 0);
    // cannons
    add(root, cyl(0.1, 0.12, 0.5, 0x333333, { metalness: 0.7 }), -0.5, 1.5, 0.9, 1, 1, 1, Math.PI / 2, 0, 0);
    add(root, cyl(0.1, 0.12, 0.5, 0x333333, { metalness: 0.7 }), 0.5, 1.5, 0.9, 1, 1, 1, Math.PI / 2, 0, 0);
  } else {
    // grand animal kingdom castle
    add(root, box(2.6, 2.2, 2.0, 0xd8d0c0), 0, 1.1, 0);
    add(root, box(0.6, 1.0, 0.6, 0xd8d0c0), -1.2, 2.6, -0.7);
    add(root, box(0.6, 1.0, 0.6, 0xd8d0c0), 1.2, 2.6, -0.7);
    add(root, box(0.6, 1.0, 0.6, 0xd8d0c0), 0, 2.8, 0);
    add(root, cone(0.45, 0.6, accent), 0, 3.5, 0);
    add(root, cone(0.35, 0.45, accent), -1.2, 3.3, -0.7);
    add(root, cone(0.35, 0.45, accent), 1.2, 3.3, -0.7);
    add(root, box(2.8, 0.3, 2.2, 0x888880), 0, 2.25, 0);
  }
  // flag
  const flag = new THREE.Group();
  add(flag, cyl(0.03, 0.03, 1.2, 0xe8c84a), 0, 0.6, 0);
  add(flag, box(0.45, 0.28, 0.04, accent), 0.25, 1.05, 0);
  // paw print
  add(flag, sphere(1, 0xffffff), 0.25, 1.05, 0.03, 0.06, 0.07, 0.02);
  for (const [px, py] of [[-0.06, 0.08], [0.06, 0.08], [-0.1, 0.02], [0.1, 0.02]]) {
    add(flag, sphere(1, 0xffffff), 0.25 + px, 1.05 + py, 0.03, 0.03, 0.03, 0.015);
  }
  flag.position.set(0.3, stage >= 3 ? 2.5 : 1.8, 0);
  root.add(flag);
  root.userData = { kind: 'base', stage, team, flag, mats: collectMats(root) };
  const sc = [1.3, 1.4, 1.5, 1.7, 2.0][stage] || 1.5;
  root.scale.setScalar(sc);
  return root;
}

/** Towers */
