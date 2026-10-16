// 미니언 3D 모델 (물/불/바위 정령, tier 0 근접 · 1 원거리 · 2 공성)
import { THREE, g, mat, add, sphere, cyl, cone, box, capsule, face, limbRefs, starMesh, collectMats, torushandle } from '../js/models.js';
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
