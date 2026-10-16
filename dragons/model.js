// 드래곤 3D 모델
import { THREE, g, mat, add, sphere, cyl, cone, box, capsule, face, limbRefs, starMesh, collectMats, torushandle } from '../js/models.js';
export function makeDragon() {
  const root = new THREE.Group();
  const L = limbRefs(root);
  const white = 0xf0fff5, green = 0x6ecf8a, mint = 0xa8ffcf;
  add(L.body, sphere(1, white), 0, 0.6, 0, 0.7, 0.55, 0.5);
  add(L.body, sphere(1, mint), 0, 0.5, 0.35, 0.4, 0.35, 0.25); // belly
  // head
  add(L.head, sphere(1, white), 0, 0, 0, 0.45, 0.4, 0.42);
  add(L.head, sphere(1, 0x1a1208), -0.15, 0.05, 0.35, 0.1, 0.12, 0.06);
  add(L.head, sphere(1, 0x1a1208), 0.15, 0.05, 0.35, 0.1, 0.12, 0.06);
  add(L.head, sphere(1, 0xffffff), -0.12, 0.1, 0.38, 0.04, 0.04, 0.02);
  add(L.head, cone(0.08, 0.2, green), -0.25, 0.35, 0.1);
  add(L.head, cone(0.08, 0.2, green), 0.25, 0.35, 0.1);
  add(L.head, cone(0.1, 0.18, 0xff8aa8), 0, -0.05, 0.42, 1, 1, 1, Math.PI / 2, 0, 0);
  L.head.position.set(0.55, 0.85, 0.15);
  // wings
  const wingL = new THREE.Group(), wingR = new THREE.Group();
  add(wingL, sphere(1, mint, { opacity: 0.85 }), 0, 0, 0, 0.15, 0.5, 0.7);
  add(wingR, sphere(1, mint, { opacity: 0.85 }), 0, 0, 0, 0.15, 0.5, 0.7);
  wingL.position.set(-0.5, 0.8, -0.1); wingR.position.set(0.5, 0.8, -0.1);
  root.add(wingL); root.add(wingR);
  // tail
  add(L.body, cyl(0.12, 0.05, 0.7, green), -0.6, 0.4, -0.2, 1, 1, 1, 0, 0, 1.0);
  add(L.body, sphere(1, mint), -0.95, 0.55, -0.35, 0.15, 0.12, 0.12);
  // legs
  add(L.legL, sphere(1, white), -0.25, 0.2, 0.15, 0.15, 0.2, 0.15);
  add(L.legR, sphere(1, white), 0.25, 0.2, 0.15, 0.15, 0.2, 0.15);
  root.userData = { L, kind: 'dragon', wingL, wingR, mats: collectMats(root) };
  root.scale.setScalar(1.4);
  return root;
}

/** Bases stages 0-4 */
