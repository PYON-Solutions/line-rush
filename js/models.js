// 3D 공통 도형 키트 + 맵 소품(발판/상자/바위/와드/투사체). 유닛별 모델은 minions/ towers/ bases/ dragons/ 폴더.
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
function torushandle(side) {
  const m = new THREE.Mesh(g('torusH', () => new THREE.TorusGeometry(0.12, 0.035, 6, 12)), mat(0xb8c0c8, { metalness: 0.7, roughness: 0.3 }));
  m.rotation.y = Math.PI / 2;
  return m;
}

/** 삐요 — yellow chick archer */
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

export { mat, g, add, sphere, cyl, cone, box, capsule, face, limbRefs, starMesh, collectMats, torushandle, THREE };
