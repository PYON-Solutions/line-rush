// (사용 안 함) 예전 3D 영웅 모델. 현재 영웅은 characters/ 의 2D 퍼펫.
import { THREE, g, mat, add, sphere, cyl, cone, box, capsule, face, limbRefs, starMesh, collectMats, torushandle } from '../js/models.js';
export function makeBear(team = 0) {
  const root = new THREE.Group();
  const L = limbRefs(root);
  const fur = 0xc98a4b, furD = 0xa86e38, blue = 0x3a6fd8, furTrim = 0xf0ebe3;
  // legs
  add(L.legL, cyl(0.16, 0.18, 0.35, blue), 0, -0.18, 0);
  add(L.legL, sphere(1, blue), 0, -0.38, 0.02, 0.2, 0.12, 0.24);
  add(L.legL, box(0.28, 0.08, 0.32, furTrim), 0, -0.42, 0.02);
  L.legL.position.set(-0.18, 0.42, 0);
  add(L.legR, cyl(0.16, 0.18, 0.35, blue), 0, -0.18, 0);
  add(L.legR, sphere(1, blue), 0, -0.38, 0.02, 0.2, 0.12, 0.24);
  add(L.legR, box(0.28, 0.08, 0.32, furTrim), 0, -0.42, 0.02);
  L.legR.position.set(0.18, 0.42, 0);
  // body
  add(L.body, sphere(1, blue), 0, 0.55, 0, 0.48, 0.52, 0.4);
  add(L.body, sphere(1, furTrim), 0, 0.78, 0.05, 0.4, 0.18, 0.36); // fur collar
  add(L.body, box(0.55, 0.1, 0.42, 0x6b4423), 0, 0.38, 0); // belt
  add(L.body, box(0.12, 0.12, 0.05, 0xe8c84a), 0, 0.38, 0.22);
  add(L.body, box(0.1, 0.1, 0.04, 0xffffff), 0, 0.58, 0.38); // star
  // arms
  add(L.armL, cyl(0.12, 0.14, 0.4, blue), 0, -0.15, 0);
  add(L.armL, sphere(1, fur), 0, -0.38, 0, 0.16, 0.16, 0.16);
  add(L.armL, sphere(1, furTrim), 0, 0.05, 0, 0.18, 0.1, 0.18);
  L.armL.position.set(-0.48, 0.7, 0);
  add(L.armR, cyl(0.12, 0.14, 0.4, blue), 0, -0.15, 0);
  add(L.armR, sphere(1, fur), 0, -0.38, 0, 0.16, 0.16, 0.16);
  add(L.armR, sphere(1, furTrim), 0, 0.05, 0, 0.18, 0.1, 0.18);
  L.armR.position.set(0.48, 0.7, 0);
  // hammer in right hand
  const ham = L.weapon;
  add(ham, cyl(0.05, 0.05, 0.85, 0x8b5a2b), 0, 0.15, 0);
  add(ham, box(0.42, 0.32, 0.32, 0xa06a35), 0, 0.62, 0);
  add(ham, box(0.1, 0.16, 0.08, 0x4a9fff, { emissive: 0x2266ff, ei: 0.45 }), 0.22, 0.62, 0);
  add(ham, box(0.07, 0.07, 0.07, 0xe8c84a), 0.22, 0.62, 0.05);
  ham.position.set(0, -0.35, 0.12);
  ham.rotation.set(0.4, 0, -0.5);
  L.armR.add(ham);
  // head
  add(L.head, sphere(1, fur), 0, 0, 0, 0.55, 0.5, 0.5);
  add(L.head, sphere(1, furD), -0.42, 0.15, 0, 0.16, 0.18, 0.12); // ears
  add(L.head, sphere(1, furD), 0.42, 0.15, 0, 0.16, 0.18, 0.12);
  add(L.head, sphere(1, 0xf5c6b0), -0.42, 0.15, 0.04, 0.08, 0.1, 0.04);
  add(L.head, sphere(1, 0xf5c6b0), 0.42, 0.15, 0.04, 0.08, 0.1, 0.04);
  add(L.head, sphere(1, 0xf0d0b0), 0, -0.08, 0.35, 0.28, 0.22, 0.18); // snout
  face(L.head, 0.05, 0.42, { scale: 1, browColor: 0x5a3820, noseColor: 0x1a1208 });
  // pot helmet
  add(L.head, cyl(0.42, 0.48, 0.35, 0xb8c0c8, { metalness: 0.7, roughness: 0.3 }), 0, 0.35, 0);
  add(L.head, sphere(1, 0xb8c0c8, { metalness: 0.7, roughness: 0.3 }), 0, 0.52, 0, 0.42, 0.2, 0.42);
  add(L.head, sphere(1, 0x9aa2aa, { metalness: 0.8 }), 0, 0.7, 0, 0.08, 0.08, 0.08); // knob
  add(L.head, torushandle(-0.5), -0.5, 0.4, 0);
  add(L.head, torushandle(0.5), 0.5, 0.4, 0);
  L.head.position.set(0, 1.15, 0);
  root.userData = { L, kind: 'bear', team, mats: collectMats(root) };
  root.scale.setScalar(1.15);
  return root;
}
export function makeChick(team = 0) {
  const root = new THREE.Group();
  const L = limbRefs(root);
  const yel = 0xf2c230, yelD = 0xe0a820, green = 0x3a9a4a, blue = 0x3a7fd8, brown = 0x6b4423;
  // legs / boots
  add(L.legL, cyl(0.1, 0.12, 0.28, brown), 0, -0.12, 0);
  add(L.legL, box(0.22, 0.1, 0.28, brown), 0, -0.28, 0.04);
  L.legL.position.set(-0.14, 0.3, 0);
  add(L.legR, cyl(0.1, 0.12, 0.28, brown), 0, -0.12, 0);
  add(L.legR, box(0.22, 0.1, 0.28, brown), 0, -0.28, 0.04);
  L.legR.position.set(0.14, 0.3, 0);
  // body
  add(L.body, sphere(1, green), 0, 0.45, 0, 0.4, 0.45, 0.35);
  add(L.body, box(0.5, 0.1, 0.38, brown), 0, 0.32, 0);
  add(L.body, box(0.1, 0.1, 0.05, 0xe8c84a), 0, 0.32, 0.2);
  // scarf
  add(L.body, sphere(1, blue), 0, 0.7, 0.05, 0.35, 0.12, 0.32);
  add(L.body, box(0.12, 0.35, 0.08, blue), -0.25, 0.55, 0.2, 1, 1, 1, 0.3, 0, 0.4);
  // arms/wings
  add(L.armL, sphere(1, yel), 0, -0.1, 0, 0.18, 0.28, 0.12);
  add(L.armL, box(0.16, 0.2, 0.12, brown), 0, -0.25, 0);
  L.armL.position.set(-0.4, 0.55, 0);
  add(L.armR, sphere(1, yel), 0, -0.1, 0, 0.18, 0.28, 0.12);
  add(L.armR, box(0.16, 0.2, 0.12, brown), 0, -0.25, 0);
  L.armR.position.set(0.4, 0.55, 0);
  // bow
  const bow = L.weapon;
  add(bow, cyl(0.04, 0.04, 0.7, 0x5a3820), 0, 0, 0, 1, 1, 1, 0, 0, 0.4);
  add(bow, cyl(0.03, 0.03, 0.5, 0x5a3820), 0.15, 0.25, 0, 1, 1, 1, 0, 0, -0.9);
  add(bow, cyl(0.03, 0.03, 0.5, 0x5a3820), 0.15, -0.25, 0, 1, 1, 1, 0, 0, 0.9);
  add(bow, sphere(1, 0x4a9fff, { emissive: 0x2266ff, ei: 0.3 }), 0.05, 0, 0.05, 0.06, 0.06, 0.06);
  bow.position.set(0.05, -0.28, 0.1);
  bow.rotation.set(0.2, 0.4, 0.3);
  L.armR.add(bow);
  // head
  add(L.head, sphere(1, yel), 0, 0, 0, 0.5, 0.48, 0.48);
  add(L.head, sphere(1, yelD), -0.35, -0.05, 0.1, 0.18, 0.2, 0.12); // cheek fluff
  add(L.head, sphere(1, yelD), 0.35, -0.05, 0.1, 0.18, 0.2, 0.12);
  face(L.head, 0.05, 0.4, { scale: 0.95, browColor: 0x5a3820, nose: false });
  // beak
  add(L.head, cone(0.12, 0.2, 0xff8a2a), 0, -0.05, 0.5, 1, 1, 1, Math.PI / 2, 0, 0);
  // green feathered cap
  add(L.head, sphere(1, green), 0, 0.28, -0.05, 0.45, 0.28, 0.4);
  add(L.head, cone(0.2, 0.35, green), 0.15, 0.45, -0.1, 1, 1, 1, 0.3, 0, -0.4);
  add(L.head, box(0.55, 0.08, 0.4, brown), 0, 0.15, 0);
  add(L.head, cone(0.06, 0.35, yel), 0.35, 0.4, 0, 1, 1, 1, 0, 0, -0.8); // yellow feather
  // tail fluff
  add(L.body, sphere(1, yel), 0, 0.35, -0.35, 0.2, 0.18, 0.15);
  L.head.position.set(0, 1.05, 0);
  root.userData = { L, kind: 'chick', team, mats: collectMats(root) };
  root.scale.setScalar(1.1);
  return root;
}

/** 모모 — gray kitten wizard */
export function makeCat(team = 0) {
  const root = new THREE.Group();
  const L = limbRefs(root);
  const gray = 0x9aa0b8, grayD = 0x6a7088, white = 0xf2f2f8, blue = 0x3a62e0, gold = 0xf0d060;
  // legs
  add(L.legL, cyl(0.11, 0.13, 0.28, blue), 0, -0.1, 0);
  add(L.legL, sphere(1, white), 0, -0.28, 0.04, 0.15, 0.1, 0.2);
  L.legL.position.set(-0.16, 0.3, 0);
  add(L.legR, cyl(0.11, 0.13, 0.28, blue), 0, -0.1, 0);
  add(L.legR, sphere(1, white), 0, -0.28, 0.04, 0.15, 0.1, 0.2);
  L.legR.position.set(0.16, 0.3, 0);
  // robe body
  add(L.body, sphere(1, blue), 0, 0.48, 0, 0.44, 0.52, 0.38);
  add(L.body, sphere(1, white), 0, 0.72, 0.08, 0.4, 0.14, 0.34);
  add(L.body, box(0.52, 0.09, 0.4, 0x6b4423), 0, 0.38, 0);
  add(L.body, box(0.12, 0.12, 0.05, gold), 0, 0.38, 0.22);
  // star badges (small flat)
  for (const [sx, sy] of [[-0.18, 0.52], [0.16, 0.45]]) {
    add(L.body, starMesh(0.07, gold), sx, sy, 0.36);
  }
  // arms
  add(L.armL, cyl(0.1, 0.12, 0.34, blue), 0, -0.1, 0);
  add(L.armL, sphere(1, white), 0, -0.3, 0, 0.14, 0.14, 0.14);
  L.armL.position.set(-0.44, 0.62, 0);
  add(L.armR, cyl(0.1, 0.12, 0.34, blue), 0, -0.1, 0);
  add(L.armR, sphere(1, white), 0, -0.3, 0, 0.14, 0.14, 0.14);
  L.armR.position.set(0.44, 0.62, 0);
  // staff + fish
  const staff = L.weapon;
  add(staff, cyl(0.035, 0.035, 1.05, 0x8b5a2b), 0, 0.4, 0);
  add(staff, sphere(1, gold, { metalness: 0.55 }), 0, 0.98, 0, 0.09, 0.09, 0.09);
  const fish = new THREE.Group();
  add(fish, sphere(1, 0x5aacff, { emissive: 0x2288ff, ei: 0.55 }), 0, 0, 0, 0.2, 0.13, 0.11);
  add(fish, cone(0.07, 0.14, 0x5aacff, { emissive: 0x2288ff, ei: 0.4 }), -0.22, 0, 0, 1, 1, 1, 0, 0, Math.PI / 2);
  add(fish, box(0.03, 0.1, 0.02, 0x3a7fd8), 0.14, 0.08, 0);
  add(fish, sphere(1, 0x1a1208), 0.08, 0.03, 0.08, 0.03, 0.03, 0.02);
  fish.position.set(0, 1.18, 0);
  staff.add(fish);
  staff.userData.fish = fish;
  staff.position.set(0.08, -0.05, 0.12);
  L.armL.add(staff);
  // head — big cute kitten
  add(L.head, sphere(1, gray), 0, 0, 0, 0.5, 0.46, 0.46);
  add(L.head, sphere(1, white), 0, -0.06, 0.28, 0.32, 0.26, 0.22);
  // pointy ears
  add(L.head, cone(0.13, 0.3, gray), -0.3, 0.38, -0.02, 1, 1.1, 0.7, 0.15, 0, -0.2);
  add(L.head, cone(0.13, 0.3, gray), 0.3, 0.38, -0.02, 1, 1.1, 0.7, 0.15, 0, 0.2);
  add(L.head, cone(0.07, 0.18, 0xf5b8c8), -0.3, 0.34, 0.02, 1, 1, 0.5, 0.15, 0, -0.2);
  add(L.head, cone(0.07, 0.18, 0xf5b8c8), 0.3, 0.34, 0.02, 1, 1, 0.5, 0.15, 0, 0.2);
  face(L.head, 0.04, 0.4, { scale: 0.95, browColor: 0x5a6078, noseColor: 0xff8aa8 });
  // big floppy wizard hat (blue with gold stars)
  const hat = new THREE.Group();
  add(hat, cyl(0.52, 0.52, 0.1, blue), 0, 0, 0); // brim
  add(hat, cone(0.38, 0.95, blue), 0, 0.5, -0.05, 1, 1, 1, 0.25, 0.15, 0); // bent tip
  add(hat, sphere(1, blue), 0.12, 0.95, -0.15, 0.12, 0.12, 0.12); // tip bulb
  for (const [hx, hy, hz] of [[0.12, 0.45, 0.28], [-0.15, 0.35, 0.3], [0.0, 0.7, 0.18]]) {
    add(hat, starMesh(0.08, gold), hx, hy, hz);
  }
  hat.position.set(0, 0.32, 0);
  L.head.add(hat);
  // tail
  const tail = new THREE.Group();
  add(tail, cyl(0.07, 0.045, 0.45, gray), 0, 0.18, 0, 1, 1, 1, 0.7, 0, 0.2);
  add(tail, sphere(1, white), 0.05, 0.42, 0.12, 0.09, 0.09, 0.09);
  tail.position.set(0, 0.32, -0.32);
  L.body.add(tail);
  L.head.position.set(0, 1.02, 0);
  root.userData = { L, kind: 'cat', team, mats: collectMats(root), tail };
  root.scale.setScalar(1.12);
  return root;
}

export function makeHero(key, team) {
  if (key === 'bear') return makeBear(team);
  if (key === 'chick') return makeChick(team);
  return makeCat(team);
}
