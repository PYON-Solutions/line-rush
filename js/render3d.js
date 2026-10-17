// Three.js 2.5D renderer for Line Rush
import * as THREE from '../vendor/three.module.js';
import { makeCrate, makeRock, makeWard, makePlatform, makeProjectile } from './models.js';
import { makeLair } from '../dragons/lair.js';
const PLAT_TOP = 0.32; const lairs = [];
import { loadSprites, fxGroup, tickFx, burst as fxBurst, glowSprite, T } from './sprites2d.js';
import { makeMinion, minionPaths, loadMinionRigs } from '../minions/sprite.js';
import { makeDragon, dragonPaths, loadDragonRig } from '../dragons/sprite.js';
import { makeBase, basePaths, baseHeight } from '../bases/sprite.js';
import { makeTower, towerPaths } from '../towers/sprite.js';
import { heroesReady, makePuppetHero, updatePuppet, heroDeath, heroDeathReset, DEATH_LEN } from './heroes2d.js';
// 영웅은 characters/ 의 2D 퍼펫, 미니언·타워·기지·드래곤은 각 폴더의 2D 페인팅 패널
export const assetsReady = Promise.all([heroesReady, loadSprites([...minionPaths(), ...towerPaths(), ...basePaths(), ...dragonPaths()]), loadMinionRigs(), loadDragonRig()]);

const GROUND_Y = 0;
const SCALE = 0.028; // game units → world units (hero ~72px → ~2 units)

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.id = 'game3d';
  renderer.domElement.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;touch-action:none;';
  container.insertBefore(renderer.domElement, container.firstChild);

  const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xbfe6ff, 40, 120);

  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.5, 200);
  camera.position.set(0, 8, 18);

  // Lighting
  const hemi = new THREE.HemisphereLight(0xfff0d8, 0x5a8a4a, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe6c0, 1.1);
  sun.position.set(12, 28, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -10;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xa0c8ff, 0.35);
  fill.position.set(-10, 10, -8);
  scene.add(fill);

  // World root (scrolls with camera conceptually — we move camera)
  const world = new THREE.Group();
  scene.add(world);

  // ===== 맵 테마 배경 (MAP.theme): 땅·언덕(메사/봉우리/화산)·나무(둥근/선인장/소나무/고사목)·구름·날씨(눈/화산재)·용암 =====
  // 맵을 바꾸면 setMap(map) → 통째로 다시 만든다. 공유 지오메트리 + 적은 폴리곤 (안드로이드 고려)
  const groundLen = 4400 * SCALE + 20;
  const groundCenterX = (4400 * SCALE) / 2;
  const envG = new THREE.Group(); world.add(envG);
  const hills = new THREE.Group(); world.add(hills);
  const clouds = new THREE.Group(); scene.add(clouds);
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff8d0, fog: false }));
  sunMesh.position.set(30, 16, -40); scene.add(sunMesh);
  const weather = { pts: null, kind: null, lava: [], glows: [] };
  let skyTex = null;
  const GEO = {
    trunk: new THREE.CylinderGeometry(0.08, 0.12, 0.6, 6), leaf: new THREE.SphereGeometry(0.45, 8, 6),
    cone: new THREE.ConeGeometry(1, 1, 7), cyl: new THREE.CylinderGeometry(1, 1, 1, 7), puff: new THREE.SphereGeometry(1, 8, 6),
  };
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });
  function disposeGroup(g) { for (const c of [...g.children]) { g.remove(c); c.traverse(o => { if (o.geometry && !Object.values(GEO).includes(o.geometry)) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map && m.map !== T.glow && m.map !== T.dot) m.map.dispose(); m.dispose(); }); }); } }
  function skyGradient(top, bot) {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#' + new THREE.Color(top).getHexString()); gr.addColorStop(1, '#' + new THREE.Color(bot).getHexString());
    x.fillStyle = gr; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function makeTree(kind, col, snowy) {
    const t = new THREE.Group();
    if (kind === 'cactus') { const m = M(col);
      const a = new THREE.Mesh(GEO.cyl, m); a.scale.set(0.13, 1.2, 0.13); a.position.y = 0.6; t.add(a);
      for (const [sx, h] of [[-1, 0.55], [1, 0.75]]) { const b = new THREE.Mesh(GEO.cyl, m); b.scale.set(0.08, 0.35, 0.08); b.position.set(sx * 0.28, h + 0.15, 0); t.add(b);
        const j = new THREE.Mesh(GEO.cyl, m); j.scale.set(0.07, 0.28, 0.07); j.rotation.z = Math.PI / 2; j.position.set(sx * 0.15, h, 0); t.add(j); }
    } else if (kind === 'pine') {
      const tr = new THREE.Mesh(GEO.trunk, M(0x5a4030)); tr.position.y = 0.25; t.add(tr);
      for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(GEO.cone, M(col)); c.scale.set(0.55 - k * 0.13, 0.6, 0.55 - k * 0.13); c.position.y = 0.65 + k * 0.38; t.add(c);
        if (snowy) { const s = new THREE.Mesh(GEO.cone, M(0xffffff)); s.scale.set(0.3 - k * 0.07, 0.25, 0.3 - k * 0.07); s.position.y = 0.85 + k * 0.38; t.add(s); } }
    } else if (kind === 'deadtree') { const m = M(col);
      const a = new THREE.Mesh(GEO.cyl, m); a.scale.set(0.06, 1.0, 0.06); a.position.y = 0.5; t.add(a);
      for (const [x, y, r] of [[-0.18, 0.75, 0.8], [0.16, 0.6, -0.9], [0.1, 0.95, -0.6]]) { const b = new THREE.Mesh(GEO.cyl, m); b.scale.set(0.035, 0.45, 0.035); b.position.set(x, y, 0); b.rotation.z = r; t.add(b); }
    } else {
      const tr = new THREE.Mesh(GEO.trunk, M(0x7a5a3a)); tr.position.y = 0.3; t.add(tr);
      const lf = new THREE.Mesh(GEO.leaf, new THREE.MeshStandardMaterial({ color: col })); lf.position.y = 0.85; t.add(lf);
    }
    return t;
  }
  function hillProfile(shape, i, seg, amp, yBase, par) {
    const u = i / seg;
    if (shape === 'mesa') { // 평평한 꼭대기 + 가파른 절벽
      const k = Math.sin(u * 23 + par * 9), lvl = k > 0.35 ? 1 : k > -0.2 ? 0.45 : 0;
      return yBase - amp * 0.4 + lvl * amp * 1.9;
    }
    if (shape === 'peaks') { const f = Math.abs(((u * 14 + par * 3) % 2) - 1); return yBase - amp * 0.3 + (1 - f) * amp * 1.8 + Math.sin(i * 1.7) * amp * 0.15; }
    if (shape === 'volcano') { const f = Math.abs(((u * 9 + par * 2) % 2) - 1); return yBase - amp * 0.5 + Math.pow(1 - f, 1.6) * amp * 2.0 + Math.sin(i * 2.9) * amp * 0.2; }
    return yBase + Math.sin(i * 0.7 + par) * amp + Math.sin(i * 1.3) * amp * 0.4;
  }
  function makeHillLayer(th, z, color, amp, seg, yBase, parallax, nTrees) {
    const g = new THREE.Group(); g.userData.parallax = parallax;
    const shape = new THREE.Shape(), W = groundLen + 60, sh = th.hillShape || 'round', ys = [];
    shape.moveTo(-30, -5);
    for (let i = 0; i <= seg; i++) { const y = hillProfile(sh, i, seg, amp, yBase, parallax); ys.push(y); shape.lineTo(-30 + (W * i) / seg, y); }
    shape.lineTo(W - 30, -5); shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true }));
    mesh.position.z = z; mesh.receiveShadow = true; g.add(mesh);
    if (th.snow && sh === 'peaks') { // 봉우리 눈 모자
      const cap = new THREE.Shape(); cap.moveTo(-30, ys[0] - 0.4); for (let i = 0; i <= seg; i++) cap.lineTo(-30 + W * i / seg, ys[i] + 0.02);
      for (let i = seg; i >= 0; i--) cap.lineTo(-30 + W * i / seg, ys[i] - Math.max(0.15, (ys[i] - yBase) * 0.45)); cap.closePath();
      const cm = new THREE.Mesh(new THREE.ShapeGeometry(cap), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })); cm.position.z = z + 2.01; g.add(cm);
    }
    if (th.lava && sh === 'volcano') { // 산비탈 용암 줄기
      for (let i = 2; i < seg; i += 5) if (ys[i] > ys[i - 1] && ys[i] > ys[i + 1]) {
        const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.35, (ys[i] + 5) * 0.6), new THREE.MeshBasicMaterial({ color: 0xff5a14, toneMapped: false, fog: false, transparent: true, opacity: 0.9 }));
        lm.position.set(-30 + W * i / seg, ys[i] - (ys[i] + 5) * 0.3, z + 2.02); g.add(lm); weather.lava.push(lm);
        const gl = glowSprite(0xff4a10, 3); gl.position.set(lm.position.x, ys[i] + 0.3, z + 2.1); gl.material.opacity = 0.6; g.add(gl); weather.glows.push(gl);
      }
    }
    const kind = th.trees || 'round', col = th.treeColor || 0x4fa552;
    for (let i = 0; i < nTrees; i++) {
      const tx = (i * 7.3 + parallax * 10) % (W - 10) - 20, idx = Math.max(0, Math.min(seg, Math.round((tx + 30) / W * seg)));
      const tree = makeTree(kind, col, th.snow); tree.position.set(tx, Math.min(ys[idx], ys[Math.min(seg, idx + 1)]) - 0.05, z + 0.5 + (i % 2));
      tree.scale.setScalar(0.7 + (i % 3) * 0.2); g.add(tree);
    }
    hills.add(g); return g;
  }
  function buildTheme(map) {
    const th = (map && map.theme) || {};
    disposeGroup(envG); disposeGroup(hills); disposeGroup(clouds); weather.lava = []; weather.glows = [];
    if (weather.pts) { scene.remove(weather.pts); weather.pts.geometry.dispose(); weather.pts.material.dispose(); weather.pts = null; }
    const sky = th.sky ?? (map && map.sky) ?? 0x7ec8f0;
    if (skyTex) skyTex.dispose();
    skyTex = skyGradient(th.skyTop ?? new THREE.Color(sky).multiplyScalar(0.72).getHex(), th.fog ?? 0xbfe6ff);
    scene.background = skyTex;
    scene.fog.color.set(th.fog ?? 0xbfe6ff); scene.fog.near = th.fogNear ?? 40; scene.fog.far = th.fogFar ?? 120;
    const hm = th.hemi || [0xfff0d8, 0x5a8a4a, 0.85]; hemi.color.set(hm[0]); hemi.groundColor.set(hm[1]); hemi.intensity = hm[2];
    sun.color.set(th.sun ?? 0xffe6c0); sunMesh.material.color.set(th.sunDisc ?? 0xfff8d0); sunMesh.position.y = th.sunY ?? 16;
    // 땅
    const add = (geo, color, x, y, z, o = {}) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.9, metalness: o.m ?? 0, transparent: !!o.op, opacity: o.op ?? 1 })); m.position.set(x, y, z); m.receiveShadow = true; envG.add(m); return m; };
    add(new THREE.BoxGeometry(groundLen, 0.4, 8), th.ground ?? 0x6cbb63, groundCenterX, -0.27, 0);
    add(new THREE.BoxGeometry(groundLen, 1.5, 8.2), th.dirt ?? 0x8a5e3a, groundCenterX, -1.15, 0, { r: 0.95 });
    add(new THREE.BoxGeometry(groundLen, 0.08, 8.1), th.edge ?? 0x8fe06a, groundCenterX, -0.05, 0);
    add(new THREE.BoxGeometry(groundLen, 0.05, 2.2), th.path ?? 0x7ed35f, groundCenterX, -0.025, 0, { r: 0.85 }); // 윗면 ≈ 0.0 = 유닛 발 높이
    // 길가 장식 (풀·꽃 / 마른 풀·돌 / 눈 더미 / 화산 돌·불씨)
    const tc = th.tufts || [0x5db84a, 0xfff066, 0xff88bb], tm = tc.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...(th.lava && c === tc[0] ? { emissive: c, emissiveIntensity: 1.2 } : {}) }));
    for (let i = 0; i < 60; i++) {
      const x = (i * 3.7 + 1.2) % (4400 * SCALE), z = ((i * 17) % 7) - 3.2; if (Math.abs(z) < 0.9) continue;
      const m = new THREE.Mesh(th.snow || th.lava ? GEO.puff : GEO.cone, i % 5 === 0 ? tm[0] : i % 3 === 0 ? tm[1] : tm[2]);
      if (th.snow || th.lava) { m.scale.set(0.18, 0.08, 0.14); m.position.set(x, 0.02, z); } else { m.scale.set(0.08, 0.25, 0.08); m.position.set(x, 0.12, z); m.rotation.z = (i % 5) * 0.1 - 0.2; }
      envG.add(m);
    }
    if (th.ice) for (let i = 0; i < 26; i++) { // 얼음판 (길 앞뒤, 반짝임)
      const m = add(new THREE.CylinderGeometry(1, 1, 0.03, 10), 0xcfefff, 3 + i * 4.6, 0.01, (i % 2 ? 1 : -1) * (2.0 + (i % 3) * 0.5), { r: 0.08, m: 0.2, op: 0.8 });
      m.scale.set(0.9 + (i % 4) * 0.35, 1, 0.45);
    }
    if (th.lava) for (const z of [-3.3, 3.4]) { // 용암 강 (앞뒤)
      const lm = new THREE.Mesh(new THREE.BoxGeometry(groundLen, 0.06, 0.9), new THREE.MeshBasicMaterial({ color: 0xff5a14, toneMapped: false })); lm.position.set(groundCenterX, 0.0, z); envG.add(lm); weather.lava.push(lm);
      for (let i = 0; i < 12; i++) { const gl = glowSprite(0xff5010, 3.5); gl.position.set(5 + i * 10.3, 0.3, z); gl.material.opacity = 0.5; envG.add(gl); weather.glows.push(gl); }
    }
    // 언덕 3겹
    const hc = th.hills || [0x85c97a, 0xa6d8a0, 0xb8e0b0], big = th.hillShape === 'mesa' || th.hillShape === 'volcano' ? 1.25 : th.hillShape === 'peaks' ? 1.5 : 1;
    makeHillLayer(th, -8, hc[0], 1.2 * big, 40, 1.5, 0.45, 18);
    makeHillLayer(th, -14, hc[1], 2.0 * big, th.hillShape ? 60 : 30, 2.5, 0.25, 12);
    makeHillLayer(th, -22, hc[2], 2.8 * big, th.hillShape ? 50 : 24, 3.5, 0.12, th.hillShape === 'mesa' ? 0 : 8);
    // 구름 (화산: 어두운 연기)
    for (let i = 0; i < 8; i++) {
      const c = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: th.clouds ?? 0xffffff, roughness: 1, transparent: true, opacity: th.cloudOpacity ?? 0.9 });
      for (const [dx, dy, r] of [[0, 0, 0.8], [0.7, 0.2, 0.9], [1.4, 0, 0.7], [0.7, -0.15, 0.7]]) { const s = new THREE.Mesh(GEO.puff, mat); s.scale.setScalar(r); s.position.set(dx, dy, 0); c.add(s); }
      c.position.set(i * 12 - 20, 10 + (i % 4) * 1.5, -28 - (i % 3) * 3); if (th.ash) c.scale.set(1.8, 1.2, 1);
      c.userData.speed = 0.15 + (i % 5) * 0.05; c.userData.baseX = c.position.x; clouds.add(c);
    }
    // 날씨: 눈송이 / 화산재+불씨 — 점 하나 = 정점 하나 (한 번에 그림)
    if (th.snow || th.ash) {
      const N = 320, pos = new Float32Array(N * 3), geo = new THREE.BufferGeometry();
      for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 50; pos[i * 3 + 1] = Math.random() * 16; pos[i * 3 + 2] = (Math.random() - 0.5) * 14 + 1; }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ map: T.dot || T.glow, color: th.snow ? 0xffffff : 0x9a8a88, size: th.snow ? 0.24 : 0.13, transparent: true, opacity: 0.9, depthWrite: false, alphaTest: 0.05 });
      weather.pts = new THREE.Points(geo, mat); weather.pts.frustumCulled = false; weather.kind = th.snow ? 'snow' : 'ash'; weather.pts.renderOrder = 5; scene.add(weather.pts);
      if (th.ash) { // 불씨 몇 개 (가산)
        const n2 = 50, p2 = new Float32Array(n2 * 3); for (let i = 0; i < n2 * 3; i++) p2[i] = pos[i];
        const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(p2, 3));
        const e = new THREE.Points(g2, new THREE.PointsMaterial({ map: T.glow, color: 0xff7a2a, size: 0.28, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); e.frustumCulled = false; weather.pts.add(e); weather.emb = e;
      }
    }
  }
  function tickWeather(dt, cx, t) {
    const T0 = performance.now() / 1000;
    for (let i = 0; i < weather.lava.length; i++) { const k = 0.75 + 0.25 * Math.sin(T0 * 2 + i); weather.lava[i].material.color.setRGB(1, 0.3 + 0.15 * k, 0.06 * k); }
    for (let i = 0; i < weather.glows.length; i++) weather.glows[i].material.opacity = 0.4 + 0.2 * Math.sin(T0 * 1.7 + i * 1.3);
    const P = weather.pts; if (!P) return;
    const a = P.geometry.attributes.position.array, snow = weather.kind === 'snow', n = a.length / 3;
    for (let i = 0; i < n; i++) {
      a[i * 3 + 1] -= dt * (snow ? 1.1 + (i % 5) * 0.15 : 0.45 + (i % 4) * 0.1);
      a[i * 3] += dt * (snow ? Math.sin(t * 0.8 + i) * 0.35 : 0.6);
      if (a[i * 3 + 1] < -0.2) { a[i * 3 + 1] = 15 + Math.random(); a[i * 3] = cx + (Math.random() - 0.5) * 50; }
      if (a[i * 3] < cx - 26) a[i * 3] += 50; else if (a[i * 3] > cx + 26) a[i * 3] -= 50;
    }
    P.geometry.attributes.position.needsUpdate = true;
    if (weather.emb) { const b = weather.emb.geometry.attributes.position.array; for (let i = 0; i < b.length / 3; i++) { b[i * 3 + 1] += dt * 0.9; b[i * 3] = a[i * 3]; if (b[i * 3 + 1] > 14) b[i * 3 + 1] = 0; } weather.emb.geometry.attributes.position.needsUpdate = true; }
  }
  buildTheme(window.MAP);

  // Entity / mesh pools
  const meshMap = new Map(); // entity -> Object3D
  const projMap = new Map();
  const platMeshes = [];
  let envBuilt = false;
  let menuHeroes = null;
  let mode = 'none'; // 'match' | 'menu' | 'select' | 'none'
  let Gref = null;
  let camTarget = new THREE.Vector3();
  let camPos = new THREE.Vector3(0, 8, 18);
  let shakeAmt = 0;
  const clock = { t: 0 };
  const particleGeo = new THREE.SphereGeometry(1, 6, 4);
  const particles = [];
  const partGroup = new THREE.Group();
  world.add(partGroup);
  world.add(fxGroup());
  const dying = []; // 사망/파괴 애니메이션 중인 패널

  // HP bar sprites helper (canvas texture)
  const hpBarCache = new Map();
  function makeHpSprite(team) {
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 10;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(1.4, 0.22, 1);
    spr.userData.cv = cv; spr.userData.tex = tex; spr.userData.team = team;
    return spr;
  }
  // 영웅 머리 위: 레벨 배지 + 체력 + 마나 (값이 바뀔 때만 다시 그림)
  function makeHeroBar(team) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 30;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false }));
    spr.scale.set(2.05, 0.48, 1); spr.renderOrder = 20;
    spr.userData = { cv, tex, team, hero: true, key: '' };
    return spr;
  }
  function updateHeroBar(spr, e) {
    const hp = Math.max(0, e.hp / e.maxHp), mp = Math.max(0, (e.mp || 0) / (e.maxMp || 1));
    const key = `${e.lv}|${Math.round(hp * 60)}|${Math.round(mp * 60)}|${e.team}`;
    if (spr.userData.key === key) return; spr.userData.key = key;
    const c = spr.userData.cv.getContext('2d'); c.clearRect(0, 0, 128, 30);
    const col = e.team === 0 ? '#4fb3ff' : '#ff5a5a';
    c.fillStyle = 'rgba(0,0,0,0.6)'; c.beginPath(); c.roundRect ? c.roundRect(24, 4, 102, 22, 5) : c.rect(24, 4, 102, 22); c.fill();
    c.fillStyle = col; c.fillRect(27, 7, 96 * hp, 10);
    c.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 1; i < 10; i++) c.fillRect(27 + i * 9.6, 7, 1, 10);
    c.fillStyle = '#3f8cff'; c.fillRect(27, 19, 96 * mp, 5);
    c.beginPath(); c.arc(14, 15, 13, 0, 7); c.fillStyle = e.lv >= 15 ? '#ff9a2e' : '#ffd84a'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = col; c.stroke();
    c.fillStyle = '#3a2410'; c.font = 'bold 15px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(e.lv), 14, 16);
    spr.userData.tex.needsUpdate = true;
  }
  function updateHpSprite(spr, p, team) {
    const cv = spr.userData.cv, ctx = cv.getContext('2d'), tex = spr.userData.tex;
    ctx.clearRect(0, 0, 64, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, 64, 10);
    ctx.fillStyle = team === 0 ? '#4fb3ff' : team === 1 ? '#ff5a5a' : '#7be07b';
    ctx.fillRect(1, 1, 62 * Math.max(0, Math.min(1, p)), 8);
    tex.needsUpdate = true;
  }

  function gx(x) { return x * SCALE; }
  function gy(gameY, GROUND) { return (GROUND - gameY) * SCALE; }

  function disposeObj(obj) {
    obj.traverse(c => {
      if (c.geometry && c.geometry !== particleGeo) { /* shared geos from models — skip shared */ }
      if (c.material) {
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach(m => { if (m.map) m.map.dispose(); });
      }
    });
  }

  function clearMeshes() {
    for (const [, m] of meshMap) { world.remove(m); }
    meshMap.clear();
    for (const d of dying) world.remove(d.m);
    dying.length = 0;
    for (const [, m] of projMap) { world.remove(m); }
    projMap.clear();
    for (const p of platMeshes) world.remove(p);
    platMeshes.length = 0;
    envBuilt = false;
  }

  function buildMatchEnv(G, GROUND) {
    clearMeshes(); lairs.length = 0;
    for (const p of G.plats) {
      const m = makePlatform(p.w * SCALE, !!p.center);
      // 윗면(+0.32)이 유닛이 서는 높이와 같도록 내림
      m.position.set(gx(p.x), gy(p.y, GROUND) - PLAT_TOP, 0);
      if (p.center) { const L = makeLair(p.w * SCALE); L.position.y = PLAT_TOP; m.add(L); lairs.push(L); }
      world.add(m);
      platMeshes.push(m);
    }
    // obstacles
    for (const o of G.obst) {
      ensureEntity(o, GROUND);
    }
    envBuilt = true;
  }

  function ensureEntity(e, GROUND) {
    if (meshMap.has(e)) return meshMap.get(e);
    let m = null;
    if (e.kind === 'hero') m = makePuppetHero(e.key, e.team);
    else if (e.kind === 'minion') {
      const elem = window.MAP ? MAP.teamElem[e.team] : (e.team === 0 ? 'water' : 'fire');
      // rock variant unused in spawn but supported
      m = makeMinion(elem, e.mt.img, e.team, e.mt);
    } else if (e.kind === 'dragon') m = makeDragon((window.MAP && MAP.dragon) || 'dragon');
    else if (e.kind === 'base') m = makeBase(0, e.team);
    else if (e.kind === 'tower') m = makeTower(e.lv || 1, e.branch, e.team);
    else if (e.kind === 'obst') m = e.type === 'rock' ? makeRock() : makeCrate();
    else if (e.kind === 'ward') m = makeWard(e.team);
    if (!m) return null;
    // HP bar
    if (e.kind === 'hero' || e.kind === 'minion' || e.kind === 'tower' || e.kind === 'base' || e.kind === 'dragon') {
      const hp = e.kind === 'hero' ? makeHeroBar(e.team) : makeHpSprite(e.team === 2 ? 2 : e.team);
      hp.position.y = e.kind === 'base' ? 4.5 : e.kind === 'dragon' ? 3.9 : e.kind === 'tower' ? 4.2 : e.kind === 'hero' ? 2.9 : (m.userData.minion ? m.userData.minion.h + 0.15 : 2.4);
      m.add(hp);
      m.userData.hpSpr = hp;
    }
    world.add(m);
    meshMap.set(e, m);
    return m;
  }

  function faceDir(m, e, dt) {
    // Hero pivots face +X at rotation.y=0 (right); -PI = left. Turn passes via -PI/2 (towards camera).
    const wantY = e.face < 0 ? -Math.PI : 0;
    m.userData.faceY = m.userData.faceY ?? wantY;
    m.userData.faceY = THREE.MathUtils.lerp(m.userData.faceY, wantY, 1 - Math.pow(0.0005, dt || 0.016));
    m.rotation.y = m.userData.faceY;
  }

  function animCharacter(m, e, dt, t) {
    const moving = e.kind === 'hero' ? Math.abs(e.vx) > 10 && e.ground : !!e.walking;
    const L = m.userData.L;
    if (!L) return;
    const swing = e.swing || 0;
    const bob = moving ? Math.abs(Math.sin(e.anim * 10)) * 0.08 : Math.sin(e.anim * 3) * 0.02;
    if (L.body) L.body.position.y = bob;
    if (L.head) L.head.position.y = (L.head.userData.baseY ?? (L.head.position.y || 1.1)) + bob * 0.5;
    if (!L.head.userData.baseY) L.head.userData.baseY = L.head.position.y;

    if (L.legL && L.legR) {
      const a = moving ? Math.sin(e.anim * 12) * 0.55 : 0;
      L.legL.rotation.x = a;
      L.legR.rotation.x = -a;
    }
    if (L.armL && L.armR) {
      const a = moving ? Math.sin(e.anim * 12) * 0.4 : Math.sin(e.anim * 2) * 0.05;
      L.armL.rotation.x = -a + swing * 0.3;
      L.armR.rotation.x = a - swing * 1.2;
      if (swing > 0) L.armR.rotation.z = -swing * 0.8;
      else L.armR.rotation.z = THREE.MathUtils.lerp(L.armR.rotation.z || 0, 0, 0.2);
    }
    // jump squash
    const sq = e.squash || 0;
    const land = e.land || 0;
    const sy = 1 + bob * 0.3 - land * 0.12 - sq * 0.15 + (!e.ground && e.kind === 'hero' ? 0.06 : 0);
    const sx = (1 + sq * 0.2) / Math.max(0.7, sy);
    m.scale.x = Math.abs(m.userData.baseScaleX || m.scale.x) * sx * Math.sign(m.scale.x || 1);
    // keep uniform-ish from model
    if (!m.userData.baseScale) m.userData.baseScale = m.scale.x;
    const bs = Math.abs(m.userData.baseScale);
    m.scale.set(bs * sx, bs * sy, bs * sx);

    // facing — smooth Y rotation (game face: 1 = right, -1 = left)
    // In side view looking from +Z, facing right means rotation Y = 0 or small, facing left = PI
    if (e.kind === 'hero') faceDir(m, e, dt);
    else {
      const wantY = e.face < 0 ? Math.PI : 0;
      m.userData.faceY = m.userData.faceY ?? wantY;
      m.userData.faceY = THREE.MathUtils.lerp(m.userData.faceY, wantY, 1 - Math.pow(0.001, dt || 0.016));
      m.rotation.y = m.userData.faceY;
    }
    flash(m, e);
    // dragon wings
    if (m.userData.wingL) {
      const flap = Math.sin(e.anim * 6) * 0.4;
      m.userData.wingL.rotation.z = 0.5 + flap;
      m.userData.wingR.rotation.z = -0.5 - flap;
    }
    // cat fish bob
    if (m.userData.L && m.userData.L.weapon && m.userData.L.weapon.userData.fish) {
      m.userData.L.weapon.userData.fish.rotation.y = t * 2;
      m.userData.L.weapon.userData.fish.position.y = 1.15 + Math.sin(t * 3) * 0.05;
    }
  }

  function flash(m, e) {
    // hit flash
    if (e.flash > 0 && m.userData.mats) {
      const f = Math.min(1, e.flash);
      for (const mat of m.userData.mats) {
        if (!mat.userData.origEmissive) mat.userData.origEmissive = mat.emissive.clone();
        mat.emissive.setRGB(
          mat.userData.origEmissive.r + f,
          mat.userData.origEmissive.g + f,
          mat.userData.origEmissive.b + f
        );
      }
    } else if (m.userData.mats) {
      for (const mat of m.userData.mats) {
        if (mat.userData.origEmissive) mat.emissive.copy(mat.userData.origEmissive);
      }
    }

  }

  function syncEntity(e, GROUND, dt, t) {
    if (e.kind === 'hero' && e.respawn > 0) {
      const m = meshMap.get(e);
      if (!m) return;
      // 사망 연출 (넉백 → 굴러 눕기 → 반짝이며 사라짐), 끝나면 숨김
      let D = m.userData.death;
      if (!D) D = m.userData.death = { t: 0, dir: e.deathDir || -(e.face || 1), x0: m.position.x, y0: m.position.y };
      D.t += Math.min(0.05, dt || 0.016);
      if (m.userData.hpSpr) m.userData.hpSpr.visible = false;
      if (D.t < DEATH_LEN && m.userData.puppet) heroDeath(m, e, D, Math.min(0.05, dt || 0.016)); else m.visible = false;
      return;
    }
    if (e.kind === 'hero') { const m = meshMap.get(e); if (m && m.userData.death) { m.userData.death = null; heroDeathReset(m); } }
    // rebuild base/tower if stage/lv changed
    if (e.kind === 'base') {
      const st = (Gref && Gref.teams) ? Gref.teams[e.team].stage : 0;
      let m = meshMap.get(e);
      let m0;
      if (m && m.userData.stage !== st) {
        m0 = m.userData.stage; world.remove(m); meshMap.delete(e); m = null;
      }
      if (!m) {
        const up = m0 !== undefined && m0 < st;
        m = makeBase(st, e.team, up);
        m.userData.stage = st;
        const hp = makeHpSprite(e.team);
        hp.position.y = baseHeight(st) + 0.3;
        m.add(hp); m.userData.hpSpr = hp;
        world.add(m); meshMap.set(e, m);
      }
      m.visible = true;
      m.position.set(gx(e.x), 0, -0.8);
      if (m.userData.hpSpr) {
        updateHpSprite(m.userData.hpSpr, e.hp / e.maxHp, e.team);
        m.userData.hpSpr.visible = true;
      }
      m.userData.update(m, e, dt, t);
      return;
    }
    if (e.kind === 'tower') {
      let m = meshMap.get(e);
      const key = `${e.lv}_${e.branch || ''}`;
      let upg = false;
      if (m && m.userData.tk !== key) {
        world.remove(m); meshMap.delete(e); m = null; upg = true;
      }
      if (!m) {
        m = makeTower(e.lv || 1, e.branch, e.team);
        m.userData.tk = key;
        if (upg) fxBurst(gx(e.x), 2, 0, { n: 24, tex: null, color: [0xffffff, 0xffe066], spd: 3.5, size: .3, life: .9, g: 2, spread: 1.5, spreadY: 3, add: true });
        const hp = makeHpSprite(e.team);
        hp.position.y = 4.3;
        m.add(hp); m.userData.hpSpr = hp;
        world.add(m); meshMap.set(e, m);
      }
      m.visible = true;
      m.position.set(gx(e.x), 0, -0.5);
      if (m.userData.hpSpr) updateHpSprite(m.userData.hpSpr, e.hp / e.maxHp, e.team);
      m.userData.update(m, e, dt, t);
      return;
    }

    const m = ensureEntity(e, GROUND);
    if (!m) return;
    m.visible = true;
    const y = e.kind === 'obst' || e.kind === 'ward' ? 0 : gy(e.y, GROUND);
    // slight Z offset by kind for depth sorting feel
    if (e.zj === undefined) e.zj = Math.random() * 0.12;
    const zOff = e.kind === 'hero' ? 0.7 : e.kind === 'minion' ? (e.team === 0 ? 0.3 : 0.1) + e.zj : e.kind === 'dragon' ? -0.2 : 0;
    m.position.set(gx(e.x), Math.max(0, y), zOff);
    if (e.gooT > 0 && e.root > 0) m.position.x += Math.sin(t * 70) * 0.04;  // 꿀 덫에 묶여 부들부들

    if (m.userData.puppet) updatePuppet(m, e, dt);
    else if (m.userData.update) m.userData.update(m, e, dt, t);
    else if (e.kind === 'hero' || e.kind === 'minion' || e.kind === 'dragon') {
      animCharacter(m, e, dt, t);
    }
    if (m.userData.hpSpr) {
      const show = e.kind === 'hero' || e.kind === 'dragon' || e.kind === 'tower' || e.kind === 'base' || e.hp < e.maxHp;
      m.userData.hpSpr.visible = !!show;
      if (show && m.userData.hpSpr.userData.hero) { updateHeroBar(m.userData.hpSpr, e); m.userData.hpSpr.position.y = 2.95 * (m.userData.heroScale || 1); }
      else if (show) updateHpSprite(m.userData.hpSpr, e.hp / e.maxHp, e.team === 2 ? 2 : e.team);
    }
    // shield bubble for bear
    if (e.kind === 'hero' && e.shield > 0 && !m.userData.puppet) {
      if (!m.userData.shieldMesh) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), new THREE.MeshStandardMaterial({
          color: 0xffcc33, transparent: true, opacity: 0.28, emissive: 0xffaa00, emissiveIntensity: 0.3
        }));
        s.position.y = 1.0;
        m.add(s);
        m.userData.shieldMesh = s;
      }
      m.userData.shieldMesh.visible = true;
      m.userData.shieldMesh.scale.setScalar(1 + Math.sin(t * 8) * 0.05);
    } else if (m.userData.shieldMesh) m.userData.shieldMesh.visible = false;
  }

  function syncProj(p, GROUND) {
    if (p.delay > 0 || p.no3d) return;  // no3d: 2D 오버레이(game.js drawSkillFx)가 그림
    if (p.kind === 'rain') {
      // visual zone marker
      let m = projMap.get(p);
      if (!m) {
        m = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({ color: 0xfff8c0, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
        );
        m.rotation.x = -Math.PI / 2;
        world.add(m); projMap.set(p, m);
      }
      m.position.set(gx(p.x), 0.05, 0);
      m.scale.set(p.w * SCALE, p.w * SCALE * 0.15, 1);
      return;
    }
    if (p.kind === 'star') {
      let m = projMap.get(p);
      if (!m) {
        m = makeProjectile('star');
        world.add(m); projMap.set(p, m);
      }
      if (p.cx != null) {
        m.position.set(gx(p.cx), gy(p.cy, GROUND), 0);
        m.rotation.y = clock.t * 8;
        m.visible = true;
      } else m.visible = false;
      return;
    }
    let m = projMap.get(p);
    if (!m) {
      m = makeProjectile(p.kind, p.elem);
      world.add(m); projMap.set(p, m);
    }
    m.position.set(gx(p.x), Math.max(0.2, gy(p.y, GROUND)), 0);
    if (p.ang != null) {
      m.rotation.z = -p.ang; // canvas ang to three
      m.rotation.y = 0;
    }
    m.visible = true;
  }

  function syncParticles(parts, GROUND, dt) {
    // lightweight: spawn few three.js particles from game parts that are sparks
    while (particles.length < Math.min(80, parts.length)) {
      const mesh = new THREE.Mesh(particleGeo, new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true }));
      mesh.scale.setScalar(0.08);
      partGroup.add(mesh);
      particles.push(mesh);
    }
    let i = 0;
    for (const p of parts) {
      if (p.ring || p.pop || p.arrowfx) continue;
      if (i >= particles.length) break;
      const m = particles[i++];
      m.visible = true;
      m.position.set(gx(p.x), Math.max(0, gy(p.y, GROUND)), 0);
      const a = 1 - p.t / p.life;
      m.material.opacity = a;
      m.material.color.set(p.c || '#fff');
      m.scale.setScalar(0.06 * (0.5 + a) * (p.r || 3) / 3);
    }
    for (; i < particles.length; i++) particles[i].visible = false;
  }

  function pruneMaps(G) {
    for (const [e, m] of [...meshMap]) {
      if (e.dead || (G.ents && !G.ents.includes(e) && e.kind !== 'obst')) {
        // keep obst until dead
        if (e.kind === 'obst' && !e.dead && G.obst && G.obst.includes(e)) continue;
        if (!e.dead && G.ents && G.ents.includes(e)) continue;
        meshMap.delete(e);
        if (e.dead && m.userData.die) { m.visible = true; if (m.userData.hpSpr) m.userData.hpSpr.visible = false; m.userData.die(m, 0, true); dying.push({ m, t: 0, life: e.kind === 'minion' ? 0.35 : e.kind === 'dragon' ? 0.6 : 0.9 }); }
        else world.remove(m);
      }
    }
    for (const [p, m] of [...projMap]) {
      if (p.dead || !G.proj.includes(p)) {
        world.remove(m);
        projMap.delete(p);
      }
    }
  }

  let dragonLift = 0;
  // 드래곤 HP 바가 화면 위(미니맵/버튼 영역)나 옆으로 나가면 화면 안으로 끌어내림
  const _v = new THREE.Vector3();
  function clampDragonBar(G) {
    const dr = G.ents && G.ents.find(e => e.kind === 'dragon' && !e.dead); if (!dr) return;
    const m = meshMap.get(dr), hp = m && m.userData.hpSpr; if (!hp || !hp.visible) return;
    if (hp.userData.y0 === undefined) hp.userData.y0 = hp.position.y;
    camera.updateMatrixWorld(); m.updateMatrixWorld(true);
    const TOP = 0.62, SIDE = 0.86;   // NDC 한계 (위 ~19%는 미니맵/버튼)
    hp.position.set(0, hp.userData.y0, hp.position.z);
    for (let i = 0; i < 12; i++) {
      hp.updateMatrixWorld(); _v.setFromMatrixPosition(hp.matrixWorld).project(camera);
      if (_v.y <= TOP || hp.position.y < 0.9) break;
      hp.position.y -= 0.25;
    }
    hp.updateMatrixWorld(); _v.setFromMatrixPosition(hp.matrixWorld).project(camera);
    if (Math.abs(_v.x) > SIDE && Math.abs(_v.x) < 1.6) {
      const tx = Math.sign(_v.x) * SIDE, w = new THREE.Vector3(tx, _v.y, _v.z).unproject(camera);
      m.worldToLocal(w); hp.position.x = w.x;
    }
  }
  function setCamera(camX, VW, GROUND, hero, shake) {
    // Hero around 32% from left so right buttons don't cover them
    const lookX = gx(camX + VW * 0.38);
    const heroY = hero && hero.respawn <= 0 ? gy(hero.y, GROUND) + 1.2 : 1.5;
    // 드래곤이 화면 근처에 있으면 카메라를 살짝 올리고 뒤로 빼서 높은 발판 위 드래곤이 잘리지 않게
    const dr = Gref && Gref.ents && Gref.ents.find(e => e.kind === 'dragon' && !e.dead);
    const lairX = dr ? dr.x : (typeof WORLD_W !== 'undefined' ? WORLD_W / 2 : null);  // 드래곤이 없어도 둥지 근처면 들어 올림
    const want = lairX !== null && Math.abs(gx(lairX) - lookX) < 10 ? 1 : 0;
    dragonLift += (want - dragonLift) * 0.04;
    // 드래곤 근처: 시선을 드래곤 쪽으로 조금 당기고(오른쪽 위 버튼/미니맵에 가리지 않게) 더 높이·뒤로
    const lx = lairX !== null ? lookX + (gx(lairX) - lookX) * 0.3 * dragonLift : lookX;
    camTarget.set(lx, heroY * 0.5 + 1.0 + dragonLift * 2.9, 0);
    // side view, slightly elevated
    // side view: lower elevation, closer for toy-figure readability
    const ideal = new THREE.Vector3(lx - 0.5, 5.2 + dragonLift * 2.4, 13.5 + dragonLift * 5.5);
    camPos.lerp(ideal, 0.12);
    shakeAmt = shake || 0;
    const sx = shakeAmt ? (Math.random() - 0.5) * shakeAmt * 0.04 : 0;
    const sy = shakeAmt ? (Math.random() - 0.5) * shakeAmt * 0.03 : 0;
    camera.position.set(camPos.x + sx, camPos.y + sy, camPos.z);
    camera.lookAt(camTarget.x + sx, camTarget.y + 0.8 + sy, camTarget.z);
    // shadow camera follows
    sun.position.set(camPos.x + 12, 28, 16);
    sun.target.position.copy(camTarget);
    sun.target.updateMatrixWorld();
  }

  function resize() {
    const w = renderer.domElement.clientWidth || window.innerWidth, h = renderer.domElement.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function showMenuHeroes(keys, selected) {
    mode = 'menu';
    clearMeshes();
    if (menuHeroes) {
      menuHeroes.forEach(h => scene.remove(h));
    }
    // menu ground disc
    if (!scene.getObjectByName('menuGround')) {
      const mg = new THREE.Mesh(
        new THREE.CylinderGeometry(8, 8, 0.35, 32),
        new THREE.MeshStandardMaterial({ color: 0x7ed35f, roughness: 0.9 })
      );
      mg.name = 'menuGround';
      mg.position.y = -0.15;
      mg.receiveShadow = true;
      scene.add(mg);
      const dirt = new THREE.Mesh(
        new THREE.CylinderGeometry(8.1, 8.2, 0.8, 32),
        new THREE.MeshStandardMaterial({ color: 0x8a5e3a, roughness: 0.95 })
      );
      dirt.name = 'menuDirt';
      dirt.position.y = -0.7;
      scene.add(dirt);
    }
    menuHeroes = keys.map((k, i) => {
      const h = makePuppetHero(k, 0);
      h.position.set((i - 1) * 3.5, 0, 0.5);
      scene.add(h);
      return h;
    });
    camera.position.set(0, 4.2, 11);
    camera.lookAt(0, 1.8, 0);
  }

  function hideMenuHeroes() {
    if (menuHeroes) {
      menuHeroes.forEach(h => scene.remove(h));
      menuHeroes = null;
    }
  }

  // 메뉴 배경: 맵 배경(언덕·구름·날씨) 위로 카메라가 천천히 흘러가는 패럴랙스.
  //  title/result: 세 영웅이 라인을 달림 · select: 고른 영웅을 왼쪽에 크게 (opts.act = 시연 동작 이름, opts.actSeq 바뀔 때 재생)
  const menuGlow = glowSprite(0xffe9a0, 4); menuGlow.material.opacity = 0; scene.add(menuGlow);
  const menuRing = glowSprite(0xffffff, 3); menuRing.scale.set(3.4, 0.9, 1); menuRing.material.opacity = 0; scene.add(menuRing);
  let menuT0 = null, menuCx = 30;
  // 선택 화면 영웅을 화면 가로 21% 지점에 (화면 비율이 달라도 같은 자리)
  const showOff = () => (0.5 - 0.21) * 2 * 7.8 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  const MENU_KEYS = ['bear', 'chick', 'cat', 'turtle', 'fox', 'rabbit'];
  function renderMenu(t, sceneName, selHero, opts = {}) {
    mode = sceneName; clock.t = t;
    world.visible = true; hills.visible = true;
    const mg = scene.getObjectByName('menuGround'), md = scene.getObjectByName('menuDirt'); if (mg) mg.visible = false; if (md) md.visible = false;
    if (!menuHeroes) showMenuHeroes(MENU_KEYS, selHero);
    const dt = menuT0 == null ? 0.016 : Math.min(0.05, Math.max(0, t - menuT0)); menuT0 = t;
    const sel = sceneName === 'select', keys = MENU_KEYS;
    menuCx += dt * (sel ? 0.35 : 1.6); if (menuCx > 105) menuCx = 18;   // 천천히 라인을 따라 이동 (배경 패럴랙스)
    const cx = menuCx;
    menuHeroes.forEach((h, i) => {
      const k = keys[i], me = selHero === k;
      const P = h.userData.puppet;
      if (sel) {
        h.visible = me;
        if (!me) return;
        h.position.set(cx - showOff(), 0.05, 1.2); h.scale.setScalar(1.12 + Math.sin(t * 2) * 0.008);
        const e = { face: 1, ground: true, vx: 0 };
        if (opts.act) { e.animSeq = opts.actSeq; e.animAct = opts.act; }
        updatePuppet(h, e, dt);
      } else {
        h.visible = true;
        const off = (i - (keys.length - 1) / 2) * 2.25, bob = Math.abs(Math.sin(t * 7 + i * 2.1)) * 0.06;
        h.position.set(cx + off + Math.sin(t * 0.9 + i * 2) * 0.35, bob, 1.0 - (i % 2) * 0.55); h.scale.setScalar(0.95);
        updatePuppet(h, { face: 1, ground: true, vx: 200 }, dt);
      }
    });
    if (sel) {
      const hc = new THREE.Color(opts.color || '#ffe9a0');
      menuGlow.material.color.copy(hc); menuGlow.material.opacity = 0.42 + 0.12 * Math.sin(t * 3); menuGlow.position.set(cx - showOff(), 1.8, 0.4); menuGlow.scale.setScalar(4.2 + Math.sin(t * 3) * 0.25);
      menuRing.material.color.copy(hc); menuRing.material.opacity = 0.75; menuRing.position.set(cx - showOff(), 0.06, 1.25);
    } else { menuGlow.material.opacity = 0; menuRing.material.opacity = 0; }
    camPos.set(cx, sel ? 2.6 : 3.0, sel ? 9.0 : 10.5);
    camera.position.copy(camPos); camera.lookAt(cx, sel ? 1.75 : 1.7, 0);
    hills.children.forEach(layer => { layer.position.x = camPos.x * (1 - (layer.userData.parallax || 0.3)) * 0.3; });
    clouds.children.forEach((c, i) => { c.position.x = c.userData.baseX + camPos.x * 0.6 + t * c.userData.speed * 2; });
    sunMesh.position.x = camPos.x + 22;
    for (const L of lairs) L.userData.update(dt, t);
    tickWeather(dt, camPos.x, t); tickFx(dt);
    renderer.render(scene, camera);
  }

  function renderMatch(G, camX, VW, GROUND, shake, dt) {
    mode = 'match';
    Gref = G;
    world.visible = true;
    hills.visible = true;
    const mg = scene.getObjectByName('menuGround');
    const md = scene.getObjectByName('menuDirt');
    if (mg) mg.visible = false;
    if (md) md.visible = false;
    hideMenuHeroes(); menuGlow.material.opacity = 0; menuRing.material.opacity = 0;
    clock.t += dt || 0.016;
    if (!envBuilt) buildMatchEnv(G, GROUND);

    // sync entities
    const alive = new Set();
    for (const e of G.ents) {
      if (e.dead) continue;
      syncEntity(e, GROUND, dt, clock.t);
      alive.add(e);
    }
    for (const o of G.obst) {
      if (o.dead) continue;
      syncEntity(o, GROUND, dt, clock.t);
      alive.add(o);
    }
    // hide removed
    for (const [e, m] of meshMap) {
      if (!alive.has(e)) m.visible = false;
    }

    // projectiles
    const aliveP = new Set();
    for (const p of G.proj) {
      syncProj(p, GROUND);
      aliveP.add(p);
    }
    for (const [p, m] of projMap) {
      if (!aliveP.has(p)) { world.remove(m); projMap.delete(p); }
    }

    syncParticles(G.parts || [], GROUND, dt);
    pruneMaps(G);
    for (let i = dying.length - 1; i >= 0; i--) { const d = dying[i]; d.t += dt || 0.016; const k = Math.min(1, d.t / d.life); d.m.userData.die(d.m, k, false); if (k >= 1) { world.remove(d.m); dying.splice(i, 1); } }
    for (const L of lairs) L.userData.update(dt || 0.016, performance.now() / 1000);
    tickFx(dt || 0.016);

    // empty tower slots markers
    // (drawn on 2D HUD overlay instead for clarity)

    setCamera(camX, VW, GROUND, G.hero, shake);
    clampDragonBar(G);

    // parallax hills relative to camera
    hills.children.forEach(layer => {
      const par = layer.userData.parallax || 0.3;
      layer.position.x = camPos.x * (1 - par) * 0.3;
    });
    clouds.children.forEach((c, i) => {
      c.position.x = c.userData.baseX + camPos.x * 0.05 + clock.t * c.userData.speed * 2;
    });
    sunMesh.position.x = camPos.x + 25;
    tickWeather(dt || 0.016, camPos.x, clock.t);

    renderer.render(scene, camera);
  }

  function renderBlank() {
        renderer.render(scene, camera);
  }

  function setVisible(v) {
    renderer.domElement.style.display = v ? 'block' : 'none';
  }

  return {
    renderer, scene, camera, resize,
    renderMatch, renderMenu, renderBlank, setVisible,
    clearMeshes, hideMenuHeroes,
    setMap(map) { buildTheme(map); envBuilt = false; const mg = scene.getObjectByName('menuGround'); if (mg) mg.material.color.set((map.theme && map.theme.ground) ?? 0x7ed35f); },
    get dom() { return renderer.domElement; },
  };
}
