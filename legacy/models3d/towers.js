// 타워 3D 모델 (lv 1~3 화살탑, branch 'rapid' 연사 / 'cannon' 대포)
import { THREE, g, mat, add, sphere, cyl, cone, box, capsule, face, limbRefs, starMesh, collectMats, torushandle } from '../../js/models.js';
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

