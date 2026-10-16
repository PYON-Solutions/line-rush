// Procedural cute toy-figure models for Line Rush (Three.js)
import * as THREE from '../vendor/three.module.js';

const geoCache = {};
function g(key, factory) {
  if (!geoCache[key]) geoCache[key] = factory();
  return geoCache[key];
}
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: opts.roughness ?? 0.55, metalness: opts.metalness ?? 0.05,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 0,
    flatShading: false, transparent: !!opts.opacity, opacity: opts.opacity ?? 1,
  });
}
function add(parent, mesh, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function sphere(r, color, opts) {
  return new THREE.Mesh(g('sph', () => new THREE.SphereGeometry(1, 12, 10)), mat(color, opts));
}
function cyl(rt, rb, h, color, opts) {
  const key = `cyl_${rt}_${rb}_${h}`;
  return new THREE.Mesh(g(key, () => new THREE.CylinderGeometry(rt, rb, h, 10)), mat(color, opts));
}
function cone(r, h, color, opts) {
  return new THREE.Mesh(g(`cone_${r}_${h}`, () => new THREE.ConeGeometry(r, h, 10)), mat(color, opts));
}
function box(w, h, d, color, opts) {
  return new THREE.Mesh(g(`box_${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d)), mat(color, opts));
}
function capsule(r, len, color, opts) {
  // approximate with cylinder + spheres
  const grp = new THREE.Group();
  add(grp, cyl(r, r, len, color, opts), 0, 0, 0);
  add(grp, sphere(r, color, opts), 0, len / 2, 0, r, r, r);
  add(grp, sphere(r, color, opts), 0, -len / 2, 0, r, r, r);
  return grp;
}

function face(grp, y, z, opts = {}) {
  const eyeC = opts.eyeColor || 0x1a1208;
  const browC = opts.browColor || 0x3a2818;
  const scl = opts.scale || 1;
  // eyes
  const el = add(grp, sphere(1, eyeC), -0.22 * scl, y, z, 0.14 * scl, 0.18 * scl, 0.08 * scl);
  const er = add(grp, sphere(1, eyeC), 0.22 * scl, y, z, 0.14 * scl, 0.18 * scl, 0.08 * scl);
  add(grp, sphere(1, 0xffffff), -0.18 * scl, y + 0.05 * scl, z + 0.05, 0.05 * scl, 0.05 * scl, 0.03 * scl);
  add(grp, sphere(1, 0xffffff), 0.26 * scl, y + 0.05 * scl, z + 0.05, 0.05 * scl, 0.05 * scl, 0.03 * scl);
  // furrowed brows
  const bl = add(grp, box(0.22, 0.05, 0.06, browC), -0.22 * scl, y + 0.16 * scl, z + 0.02, 1, 1, 1, 0, 0, 0.35);
  const br = add(grp, box(0.22, 0.05, 0.06, browC), 0.22 * scl, y + 0.16 * scl, z + 0.02, 1, 1, 1, 0, 0, -0.35);
  // snout/nose
  if (opts.nose !== false) {
    add(grp, sphere(1, opts.noseColor || 0x1a1208), 0, y - 0.08 * scl, z + 0.12 * scl, 0.07 * scl, 0.06 * scl, 0.05 * scl);
  }
  return { el, er, bl, br };
}

function limbRefs(grp) {
  const L = { armL: new THREE.Group(), armR: new THREE.Group(), legL: new THREE.Group(), legR: new THREE.Group(), body: new THREE.Group(), head: new THREE.Group(), weapon: new THREE.Group() };
  Object.values(L).forEach(g => grp.add(g));
  return L;
}

/** 뭉치 — brown baby bear with pot helmet + hammer */
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
function torushandle(side) {
  const m = new THREE.Mesh(g('torusH', () => new THREE.TorusGeometry(0.12, 0.035, 6, 12)), mat(0xb8c0c8, { metalness: 0.7, roughness: 0.3 }));
  m.rotation.y = Math.PI / 2;
  return m;
}

/** 삐요 — yellow chick archer */
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

function starMesh(r, color) {
  // bake size into a unique geometry so add() scale=1 is fine
  const key = `octa_${r}`;
  const geo = g(key, () => {
    const g0 = new THREE.OctahedronGeometry(r, 0);
    g0.scale(1, 1.25, 0.35);
    return g0;
  });
  return new THREE.Mesh(geo, mat(color, { emissive: color, ei: 0.2 }));
}

function collectMats(obj) {
  const mats = [];
  obj.traverse(c => { if (c.isMesh && c.material) mats.push(c.material); });
  return mats;
}

/** Minions: water/fire/rock spirits */
export function makeMinion(elem, tier, team) {
  // elem: 'water'|'fire'|'rock', tier: 0 melee, 1 ranged, 2 siege
  const root = new THREE.Group();
  const L = limbRefs(root);
  const colors = {
    water: { body: 0x4ab4ff, glow: 0x7fd0ff, accent: 0x2a80d0 },
    fire: { body: 0xff6a3a, glow: 0xff9a4a, accent: 0xd04020 },
    rock: { body: 0x9a9aa8, glow: 0xb9b9c9, accent: 0x6a6a78 },
  };
  const c = colors[elem] || colors.water;
  const teamAccent = team === 0 ? 0x3a8fff : 0xff4a4a;
  const scale = tier === 0 ? 0.7 : tier === 1 ? 0.9 : 1.25;
  if (tier === 0) {
    // melee droplet/flame with helmet
    if (elem === 'water' || elem === 'fire') {
      add(L.body, sphere(1, c.body, { emissive: c.glow, ei: 0.2 }), 0, 0.45, 0, 0.4, 0.5, 0.4);
      if (elem === 'water') add(L.body, cone(0.25, 0.35, c.body, { emissive: c.glow, ei: 0.2 }), 0, 0.9, 0);
      else {
        add(L.body, cone(0.2, 0.4, 0xffcc44, { emissive: 0xff8800, ei: 0.4 }), 0, 0.95, 0);
        add(L.body, cone(0.12, 0.25, 0xffee88, { emissive: 0xffaa00, ei: 0.5 }), 0.1, 1.05, 0.05);
      }
    } else {
      add(L.body, sphere(1, c.body), 0, 0.4, 0, 0.4, 0.35, 0.4);
      add(L.body, sphere(1, c.glow), -0.15, 0.55, 0.2, 0.18, 0.15, 0.15);
    }
    // helmet
    add(L.head, cyl(0.35, 0.4, 0.22, 0xb0b8c0, { metalness: 0.6, roughness: 0.35 }), 0, 0.55, 0);
    add(L.head, sphere(1, 0xb0b8c0, { metalness: 0.6 }), 0, 0.68, 0, 0.35, 0.12, 0.35);
    // face on body
    add(L.body, sphere(1, 0x1a1208), -0.12, 0.5, 0.35, 0.08, 0.1, 0.05);
    add(L.body, sphere(1, 0x1a1208), 0.12, 0.5, 0.35, 0.08, 0.1, 0.05);
    add(L.body, sphere(1, 0xffffff), -0.1, 0.53, 0.38, 0.03, 0.03, 0.02);
    // weapon
    if (elem === 'water') {
      add(L.armR, cyl(0.03, 0.03, 0.55, 0x555555), 0.15, 0.2, 0.15);
      add(L.armR, cone(0.08, 0.2, c.glow, { emissive: c.glow, ei: 0.3 }), 0.15, 0.55, 0.15);
    } else if (elem === 'fire') {
      add(L.armR, cyl(0.04, 0.04, 0.45, 0x5a3820), 0.15, 0.15, 0.15);
      add(L.armR, sphere(1, 0xffcc44, { emissive: 0xff6600, ei: 0.5 }), 0.15, 0.45, 0.15, 0.12, 0.12, 0.12);
    } else {
      add(L.armR, box(0.15, 0.35, 0.12, c.accent), 0.2, 0.25, 0.1);
    }
    // tiny legs
    add(L.legL, sphere(1, c.body), -0.15, 0.12, 0.05, 0.1, 0.12, 0.1);
    add(L.legR, sphere(1, c.body), 0.15, 0.12, 0.05, 0.1, 0.12, 0.1);
    L.armL.position.set(-0.35, 0.45, 0);
    L.armR.position.set(0.35, 0.45, 0);
  } else if (tier === 1) {
    // ranged medium
    add(L.body, sphere(1, c.body, { emissive: c.glow, ei: 0.15 }), 0, 0.55, 0, 0.45, 0.55, 0.4);
    if (elem === 'fire') add(L.body, cone(0.25, 0.5, 0xffcc44, { emissive: 0xff8800, ei: 0.35 }), 0, 1.1, 0);
    if (elem === 'water') add(L.body, cone(0.28, 0.4, c.body, { emissive: c.glow, ei: 0.2 }), 0, 1.05, 0);
    add(L.body, sphere(1, 0x1a1208), -0.14, 0.6, 0.38, 0.09, 0.11, 0.05);
    add(L.body, sphere(1, 0x1a1208), 0.14, 0.6, 0.38, 0.09, 0.11, 0.05);
    // hood/cape with team color
    add(L.body, sphere(1, teamAccent), 0, 0.85, -0.1, 0.4, 0.25, 0.35);
    add(L.armL, cyl(0.08, 0.1, 0.35, c.body), -0.05, -0.1, 0);
    add(L.armR, cyl(0.08, 0.1, 0.35, c.body), 0.05, -0.1, 0);
    L.armL.position.set(-0.4, 0.6, 0);
    L.armR.position.set(0.4, 0.6, 0);
    add(L.legL, sphere(1, c.accent), -0.15, 0.15, 0, 0.12, 0.15, 0.12);
    add(L.legR, sphere(1, c.accent), 0.15, 0.15, 0, 0.12, 0.15, 0.12);
    // staff/bow hint
    add(L.weapon, cyl(0.035, 0.035, 0.7, 0x5a3820), 0.3, 0.5, 0.2);
    add(L.weapon, sphere(1, c.glow, { emissive: c.glow, ei: 0.4 }), 0.3, 0.9, 0.2, 0.1, 0.1, 0.1);
  } else {
    // siege / boss — big with crown
    add(L.body, sphere(1, c.body, { emissive: c.glow, ei: 0.15 }), 0, 0.7, 0, 0.65, 0.75, 0.55);
    if (elem === 'fire') {
      add(L.body, cone(0.35, 0.7, 0xffaa33, { emissive: 0xff6600, ei: 0.4 }), 0, 1.4, 0);
      add(L.body, cone(0.2, 0.4, 0xffee66, { emissive: 0xffaa00, ei: 0.5 }), 0.2, 1.55, 0.1);
    }
    if (elem === 'water') add(L.body, cone(0.4, 0.55, c.body, { emissive: c.glow, ei: 0.25 }), 0, 1.35, 0);
    // crown
    add(L.head, cyl(0.35, 0.4, 0.2, 0xe8c84a, { metalness: 0.5 }), 0, 1.2, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      add(L.head, cone(0.06, 0.18, 0xe8c84a, { metalness: 0.5 }), Math.cos(a) * 0.32, 1.4, Math.sin(a) * 0.32);
    }
    add(L.body, sphere(1, 0x1a1208), -0.2, 0.75, 0.5, 0.12, 0.14, 0.06);
    add(L.body, sphere(1, 0x1a1208), 0.2, 0.75, 0.5, 0.12, 0.14, 0.06);
    add(L.body, box(0.15, 0.06, 0.04, 0x1a1208), 0, 0.55, 0.52); // frown
    // armor plates team color
    add(L.body, box(0.7, 0.25, 0.5, teamAccent), 0, 0.45, 0);
    add(L.armL, sphere(1, c.body), -0.55, 0.7, 0.1, 0.25, 0.3, 0.22);
    add(L.armR, sphere(1, c.body), 0.55, 0.7, 0.1, 0.25, 0.3, 0.22);
    add(L.legL, sphere(1, c.accent), -0.25, 0.2, 0, 0.2, 0.22, 0.2);
    add(L.legR, sphere(1, c.accent), 0.25, 0.2, 0, 0.2, 0.22, 0.2);
    // big weapon
    add(L.weapon, cyl(0.06, 0.06, 1.0, 0x5a3820), 0.6, 0.6, 0.2);
    add(L.weapon, box(0.4, 0.35, 0.25, c.accent), 0.6, 1.2, 0.2);
  }
  root.scale.setScalar(scale);
  root.userData = { L, kind: 'minion', tier, elem, team, mats: collectMats(root) };
  return root;
}

/** Wind dragon — cute white-green */
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
export function makeTower(lv, branch, team) {
  const root = new THREE.Group();
  const accent = team === 0 ? 0x3a8fff : 0xff4a4a;
  const wood = 0xa06a35, stone = 0x9a9aa8, dark = 0x5a3e28;
  add(root, box(1.0, 0.25, 1.0, stone), 0, 0.12, 0); // foundation
  if (branch === 'cannon') {
    add(root, cyl(0.4, 0.5, 1.4, stone), 0, 0.9, 0);
    add(root, box(1.1, 0.2, 1.1, dark), 0, 1.65, 0);
    add(root, cyl(0.15, 0.18, 0.7, 0x333333, { metalness: 0.7 }), 0, 1.9, 0.4, 1, 1, 1, Math.PI / 2, 0, 0);
  } else if (branch === 'rapid') {
    add(root, box(0.7, 1.5, 0.7, wood), 0, 0.9, 0);
    add(root, box(1.0, 0.15, 1.0, dark), 0, 1.7, 0);
    for (let i = 0; i < 3; i++) {
      add(root, cyl(0.03, 0.03, 0.6, 0x888888, { metalness: 0.5 }), (i - 1) * 0.2, 2.0, 0.2, 1, 1, 1, Math.PI / 2, 0, 0);
    }
  } else {
    // wooden arrow tower
    const h = 1.0 + lv * 0.15;
    add(root, box(0.15, h, 0.15, wood), -0.3, h / 2 + 0.2, -0.3);
    add(root, box(0.15, h, 0.15, wood), 0.3, h / 2 + 0.2, -0.3);
    add(root, box(0.15, h, 0.15, wood), -0.3, h / 2 + 0.2, 0.3);
    add(root, box(0.15, h, 0.15, wood), 0.3, h / 2 + 0.2, 0.3);
    // X braces
    add(root, box(0.08, h * 0.9, 0.08, wood), 0, h / 2 + 0.2, -0.3, 1, 1, 1, 0, 0, 0.6);
    add(root, box(0.08, h * 0.9, 0.08, wood), 0, h / 2 + 0.2, -0.3, 1, 1, 1, 0, 0, -0.6);
    add(root, box(1.0, 0.12, 1.0, wood), 0, h + 0.25, 0);
    add(root, box(1.05, 0.2, 0.08, wood), 0, h + 0.4, 0.45);
    add(root, box(1.05, 0.2, 0.08, wood), 0, h + 0.4, -0.45);
    // spears
    const nSpears = Math.min(lv, 3);
    for (let i = 0; i < nSpears; i++) {
      add(root, cyl(0.03, 0.03, 0.7, wood), (i - (nSpears - 1) / 2) * 0.2, h + 0.7, 0.1, 1, 1, 1, 0.3, 0, 0);
      add(root, cone(0.05, 0.12, stone), (i - (nSpears - 1) / 2) * 0.2, h + 1.1, 0.22);
    }
  }
  // flag
  add(root, cyl(0.025, 0.025, 0.9, 0xe8c84a), 0.4, 2.2, 0);
  add(root, box(0.35, 0.22, 0.03, accent), 0.6, 2.55, 0);
  add(root, sphere(1, 0xffffff), 0.6, 2.55, 0.03, 0.05, 0.05, 0.015);
  root.userData = { kind: 'tower', lv, branch, team, mats: collectMats(root) };
  root.scale.setScalar(1.2);
  return root;
}

export function makeCrate() {
  const root = new THREE.Group();
  add(root, box(0.7, 0.7, 0.7, 0xb5824e), 0, 0.35, 0);
  add(root, box(0.72, 0.08, 0.72, 0x7a5230), 0, 0.35, 0);
  add(root, box(0.08, 0.72, 0.72, 0x7a5230), 0, 0.35, 0);
  root.userData = { kind: 'crate', mats: collectMats(root) };
  return root;
}

export function makeRock() {
  const root = new THREE.Group();
  add(root, sphere(1, 0x9a9aac), 0, 0.35, 0, 0.45, 0.38, 0.4);
  add(root, sphere(1, 0xb9b9c9), -0.15, 0.5, 0.15, 0.22, 0.18, 0.2);
  add(root, sphere(1, 0x7ecb5e), 0.1, 0.65, 0.05, 0.2, 0.1, 0.15); // moss
  root.userData = { kind: 'rock', mats: collectMats(root) };
  return root;
}

export function makeWard(team) {
  const root = new THREE.Group();
  add(root, cyl(0.04, 0.04, 0.5, 0x8a5e3a), 0, 0.25, 0);
  add(root, sphere(1, 0xffe9a8, { emissive: 0xffcf3a, ei: 0.6 }), 0, 0.55, 0, 0.15, 0.15, 0.15);
  add(root, sphere(1, 0xffcf3a, { emissive: 0xffaa00, ei: 0.8 }), 0, 0.55, 0, 0.08, 0.08, 0.08);
  root.userData = { kind: 'ward', team, mats: collectMats(root) };
  return root;
}

export function makePlatform(w, isCenter) {
  const root = new THREE.Group();
  const depth = 1.4;
  // chunky floating island
  add(root, box(w, 0.45, depth, 0x8a5e3a), w / 2, -0.15, 0);
  add(root, box(w + 0.2, 0.22, depth + 0.2, 0x6ecf55), w / 2, 0.15, 0);
  add(root, box(w + 0.05, 0.08, depth + 0.05, 0xa8f070), w / 2, 0.28, 0);
  // tapered underside (box scaled)
  add(root, box(w * 0.7, 0.5, depth * 0.7, 0xa7764c), w / 2, -0.55, 0);
  if (isCenter) {
    add(root, sphere(1, 0xb4ffdc, { opacity: 0.4, emissive: 0x88ffcc, ei: 0.25 }), w / 2, 0.35, 0, w * 0.35, 0.1, depth * 0.35);
  }
  root.userData = { kind: 'plat' };
  return root;
}

export function makeProjectile(kind, elem) {
  const root = new THREE.Group();
  if (kind === 'arrow') {
    add(root, cyl(0.03, 0.03, 0.5, 0x7a5230), 0, 0, 0, 1, 1, 1, 0, 0, Math.PI / 2);
    add(root, cone(0.06, 0.15, 0xdddddd), 0.3, 0, 0, 1, 1, 1, 0, 0, -Math.PI / 2);
    add(root, box(0.08, 0.12, 0.02, 0xffffff), -0.25, 0, 0);
  } else if (kind === 'orb') {
    add(root, sphere(1, 0xb89cff, { emissive: 0x8866ff, ei: 0.6 }), 0, 0, 0, 0.15, 0.15, 0.15);
  } else if (kind === 'ice') {
    add(root, sphere(1, 0x9fe0ff, { emissive: 0x66ccff, ei: 0.5 }), 0, 0, 0, 0.18, 0.18, 0.18);
    add(root, starMesh(0.12, 0xffffff));
  } else if (kind === 'drop') {
    const col = elem ? 0xff8a3a : 0x5fc4ff;
    add(root, sphere(1, col, { emissive: col, ei: 0.5 }), 0, 0, 0, 0.1, 0.12, 0.1);
  } else if (kind === 'wind') {
    add(root, sphere(1, 0xc8fff0, { emissive: 0x88ffcc, ei: 0.5 }), 0, 0, 0, 0.14, 0.14, 0.14);
  } else if (kind === 'rock') {
    add(root, sphere(1, 0x8f8a80), 0, 0, 0, 0.14, 0.12, 0.13);
  } else if (kind === 'ball') {
    add(root, sphere(1, 0x333333), 0, 0, 0, 0.14, 0.14, 0.14);
  } else if (kind === 'star') {
    add(root, starMesh(0.4, 0xffe066));
    add(root, starMesh(0.22, 0xfffbe0));
  } else {
    add(root, sphere(1, 0xffffff, { emissive: 0xffffff, ei: 0.3 }), 0, 0, 0, 0.1, 0.1, 0.1);
  }
  root.userData = { kind: 'proj' };
  return root;
}

export function makeHero(key, team) {
  if (key === 'bear') return makeBear(team);
  if (key === 'chick') return makeChick(team);
  return makeCat(team);
}

export { mat, g, THREE };
