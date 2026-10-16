// Three.js 2.5D renderer for Line Rush
import * as THREE from '../vendor/three.module.js';
import { makeCrate, makeRock, makeWard, makePlatform, makeProjectile } from './models.js';
import { loadSprites, fxGroup, tickFx, burst as fxBurst } from './sprites2d.js';
import { makeMinion, minionPaths } from '../minions/sprite.js';
import { makeDragon, dragonPaths } from '../dragons/sprite.js';
import { makeBase, basePaths, baseHeight } from '../bases/sprite.js';
import { makeTower, towerPaths } from '../towers/sprite.js';
import { heroesReady, makePuppetHero, updatePuppet } from './heroes2d.js';
// 영웅은 characters/ 의 2D 퍼펫, 미니언·타워·기지·드래곤은 각 폴더의 2D 페인팅 패널
export const assetsReady = Promise.all([heroesReady, loadSprites([...minionPaths(), ...towerPaths(), ...basePaths(), ...dragonPaths()])]);

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
  scene.background = new THREE.Color((window.MAP && MAP.sky) || 0x7ec8f0);
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

  // Ground strip with thickness
  const groundLen = 4400 * SCALE + 20;
  const groundCenterX = (4400 * SCALE) / 2;
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x6cbb63, roughness: 0.9, metalness: 0 });
  const groundTop = new THREE.Mesh(new THREE.BoxGeometry(groundLen, 0.4, 8), groundMat);
  groundTop.position.set(groundCenterX, -0.2, 0);
  groundTop.receiveShadow = true;
  world.add(groundTop);
  const dirt = new THREE.Mesh(new THREE.BoxGeometry(groundLen, 1.5, 8.2), new THREE.MeshStandardMaterial({ color: 0x8a5e3a, roughness: 0.95 }));
  dirt.position.set(groundCenterX, -1.15, 0);
  dirt.receiveShadow = true;
  world.add(dirt);
  const grassEdge = new THREE.Mesh(new THREE.BoxGeometry(groundLen, 0.08, 8.1), new THREE.MeshStandardMaterial({ color: 0x8fe06a }));
  grassEdge.position.set(groundCenterX, 0.02, 0);
  world.add(grassEdge);
  const path = new THREE.Mesh(new THREE.BoxGeometry(groundLen, 0.05, 2.2), new THREE.MeshStandardMaterial({ color: 0x7ed35f, roughness: 0.85 }));
  path.position.set(groundCenterX, 0.04, 0);
  path.receiveShadow = true;
  world.add(path);
  // decorative grass tufts & flowers along lane
  const grassTufts = new THREE.Group();
  world.add(grassTufts);
  for (let i = 0; i < 60; i++) {
    const gx = (i * 3.7 + 1.2) % (4400 * SCALE);
    const gz = ((i * 17) % 7) - 3.2;
    if (Math.abs(gz) < 0.9) continue;
    const tuft = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.25, 5),
      new THREE.MeshStandardMaterial({ color: i % 5 === 0 ? 0xff88bb : (i % 3 === 0 ? 0xfff066 : 0x5db84a), roughness: 0.9 })
    );
    tuft.position.set(gx, 0.12, gz);
    tuft.rotation.z = (i % 5) * 0.1 - 0.2;
    grassTufts.add(tuft);
  }

  // Parallax hills (multiple layers of low-poly hills behind)
  const hills = new THREE.Group();
  world.add(hills);
  function makeHillLayer(z, color, amp, seg, yBase, parallax) {
    const g = new THREE.Group();
    g.userData.parallax = parallax;
    const shape = new THREE.Shape();
    const W = groundLen + 60;
    shape.moveTo(-30, -5);
    for (let i = 0; i <= seg; i++) {
      const x = -30 + (W * i) / seg;
      const y = yBase + Math.sin(i * 0.7 + parallax) * amp + Math.sin(i * 1.3) * amp * 0.4;
      shape.lineTo(x, y);
    }
    shape.lineTo(W - 30, -5);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true }));
    mesh.position.z = z;
    mesh.receiveShadow = true;
    g.add(mesh);
    // trees
    for (let i = 0; i < 18; i++) {
      const tx = (i * 7.3 + parallax * 10) % (W - 10) - 20;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x7a5a3a }));
      trunk.position.y = 0.3;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), new THREE.MeshStandardMaterial({ color: 0x4fa552 }));
      leaf.position.y = 0.85;
      tree.add(trunk); tree.add(leaf);
      const hy = yBase + Math.sin((tx + 30) / W * seg * 0.7 + parallax) * amp;
      tree.position.set(tx, hy, z + 0.5);
      tree.scale.setScalar(0.7 + (i % 3) * 0.2);
      g.add(tree);
    }
    hills.add(g);
    return g;
  }
  makeHillLayer(-8, 0x85c97a, 1.2, 40, 1.5, 0.45);
  makeHillLayer(-14, 0xa6d8a0, 2.0, 30, 2.5, 0.25);
  makeHillLayer(-22, 0xb8e0b0, 2.8, 24, 3.5, 0.12);

  // Sky clouds (simple spheres)
  const clouds = new THREE.Group();
  scene.add(clouds);
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9 });
    for (const [dx, dy, r] of [[0, 0, 0.8], [0.7, 0.2, 0.9], [1.4, 0, 0.7], [0.7, -0.15, 0.7]]) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat);
      s.position.set(dx, dy, 0);
      c.add(s);
    }
    c.position.set(i * 12 - 20, 10 + (i % 4) * 1.5, -28 - (i % 3) * 3);
    c.userData.speed = 0.15 + (i % 5) * 0.05;
    c.userData.baseX = c.position.x;
    clouds.add(c);
  }

  // Sun disc
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff8d0 }));
  sunMesh.position.set(30, 16, -40);
  scene.add(sunMesh);

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
    clearMeshes();
    for (const p of G.plats) {
      const m = makePlatform(p.w * SCALE, !!p.center);
      m.position.set(gx(p.x), gy(p.y, GROUND), 0);
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
      const hp = makeHpSprite(e.team === 2 ? 2 : e.team);
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
      if (m) m.visible = false;
      return;
    }
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

    if (m.userData.puppet) updatePuppet(m, e, dt);
    else if (m.userData.update) m.userData.update(m, e, dt, t);
    else if (e.kind === 'hero' || e.kind === 'minion' || e.kind === 'dragon') {
      animCharacter(m, e, dt, t);
    }
    if (m.userData.hpSpr) {
      const show = e.kind === 'hero' || e.kind === 'dragon' || e.kind === 'tower' || e.kind === 'base' || e.hp < e.maxHp;
      m.userData.hpSpr.visible = !!show;
      if (show) updateHpSprite(m.userData.hpSpr, e.hp / e.maxHp, e.team === 2 ? 2 : e.team);
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
    if (p.delay > 0) return;
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

  function setCamera(camX, VW, GROUND, hero, shake) {
    // Hero around 32% from left so right buttons don't cover them
    const lookX = gx(camX + VW * 0.38);
    const heroY = hero && hero.respawn <= 0 ? gy(hero.y, GROUND) + 1.2 : 1.5;
    camTarget.set(lookX, heroY * 0.5 + 1.0, 0);
    // side view, slightly elevated
    // side view: lower elevation, closer for toy-figure readability
    const ideal = new THREE.Vector3(lookX - 0.5, 5.2, 13.5);
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

  function renderMenu(t, sceneName, selHero) {
    mode = sceneName;
    clock.t = t;
    world.visible = false;
    hills.visible = false;
    const mg = scene.getObjectByName('menuGround');
    const md = scene.getObjectByName('menuDirt');
    if (mg) mg.visible = true;
    if (md) md.visible = true;
    scene.background = new THREE.Color((window.MAP && MAP.sky) || 0x7ec8f0);
    if (!menuHeroes) {
      showMenuHeroes(['bear', 'chick', 'cat'], selHero);
    }
    menuHeroes.forEach((h, i) => {
      const k = ['bear', 'chick', 'cat'][i];
      const sel = selHero === k;
      h.position.y = Math.abs(Math.sin(t * 3 + i)) * (sel ? 0.25 : 0.1) + (sceneName === 'select' ? 1.75 : 0); // 선택 화면: 카드 위로
      h.position.x = (i - 1) * (sceneName === 'select' ? 3.7 : 3.5) - (sceneName === 'select' ? 1.5 : 0);
      // face camera slightly, gentle turn
      { const P = h.userData.puppet; const dtm = Math.min(0.05, Math.max(0, t - (P.lastT ?? t))); P.lastT = t; updatePuppet(h, { face: 1, ground: true, vx: 0 }, dtm); }
      const s = sceneName === 'select' ? (sel ? 0.95 : 0.8) : (sel ? 1.25 : 1.05);
      h.scale.setScalar(s);
      const L = h.userData.L;
      if (L && L.armL) {
        L.armL.rotation.x = Math.sin(t * 2 + i) * 0.15;
        L.armR.rotation.x = -Math.sin(t * 2 + i) * 0.15;
      }
    });
    clouds.children.forEach((c, i) => {
      c.position.x = c.userData.baseX + Math.sin(t * c.userData.speed + i) * 3;
    });
    const focus = sceneName === 'select' ? ['bear', 'chick', 'cat'].indexOf(selHero) : 1;
    const tx = (focus - 1) * 3.5;
    if (sceneName === 'select') {
      // pull camera closer for cute 3D preview
      camera.position.lerp(new THREE.Vector3(tx * 0.25, 3.6, 9.5), 0.1);
      camera.lookAt(tx * 0.4, 1.9, 0);
    } else {
      camera.position.lerp(new THREE.Vector3(0, 4.0, 11), 0.08);
      camera.lookAt(0, 1.8, 0);
    }
    sun.position.set(8, 20, 12);
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
    hideMenuHeroes();
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
    tickFx(dt || 0.016);

    // empty tower slots markers
    // (drawn on 2D HUD overlay instead for clarity)

    setCamera(camX, VW, GROUND, G.hero, shake);

    // parallax hills relative to camera
    hills.children.forEach(layer => {
      const par = layer.userData.parallax || 0.3;
      layer.position.x = camPos.x * (1 - par) * 0.3;
    });
    clouds.children.forEach((c, i) => {
      c.position.x = c.userData.baseX + camPos.x * 0.05 + clock.t * c.userData.speed * 2;
    });
    sunMesh.position.x = camPos.x + 25;

    renderer.render(scene, camera);
  }

  function renderBlank() {
    scene.background = new THREE.Color((window.MAP && MAP.sky) || 0x7ec8f0);
    renderer.render(scene, camera);
  }

  function setVisible(v) {
    renderer.domElement.style.display = v ? 'block' : 'none';
  }

  return {
    renderer, scene, camera, resize,
    renderMatch, renderMenu, renderBlank, setVisible,
    clearMeshes, hideMenuHeroes,
    get dom() { return renderer.domElement; },
  };
}
