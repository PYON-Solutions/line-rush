// 뭉치 (bear hero) — Blender-authored GLB with skeletal animations.
// FORWARD AXIS CONVENTION: the GLB faces +X (three.js) at rotation.y = 0.
// All hero pivots built by makeHeroPivot() follow the same convention:
//   rotation.y = 0   -> faces right (+X, game face = 1)
//   rotation.y = -PI -> faces left  (-X, game face = -1); turning passes through -PI/2 (faces camera).
import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from '../vendor/addons/utils/SkeletonUtils.js';
import { makeHero } from './heroes3d.js';

let tmpl = null, clips = null, fitScale = 1;

export function loadMungchi(url = 'legacy/models/mungchi.glb') {
  return new Promise((res) => {
    new GLTFLoader().load(url, (gltf) => {
      tmpl = gltf.scene; clips = gltf.animations;
      tmpl.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      // match procedural bear height
      const ref = makeHero('bear', 0);
      const h0 = new THREE.Box3().setFromObject(ref).getSize(new THREE.Vector3()).y;
      const h1 = new THREE.Box3().setFromObject(tmpl).getSize(new THREE.Vector3()).y;
      fitScale = h1 > 0 ? h0 / h1 : 1;
      res(true);
    }, undefined, (err) => { console.warn('mungchi.glb failed, using procedural bear', err); res(false); });
  });
}

function buildMungchi(team) {
  const inner = SkeletonUtils.clone(tmpl);
  inner.scale.setScalar(fitScale);
  const mats = [];
  inner.traverse(o => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    const n = o.material.name;
    // scene has no env map: full-metal PBR renders near-black, so soften metals
    if (o.material.metalness > 0.4) { o.material.metalness = 0.35; o.material.roughness = Math.max(0.3, o.material.roughness); }
    if (n === 'pot') o.material.color.setHex(0xd4d9e0);
    if (team === 1 && (n === 'blue' || n === 'bluedark')) o.material.color.setHex(n === 'blue' ? 0xc8323a : 0x8a1f26);
    if (o.material.emissive) mats.push(o.material);
  });
  const mixer = new THREE.AnimationMixer(inner);
  const actions = {};
  for (const c of clips) actions[c.name] = mixer.clipAction(c);
  for (const k of ['attack', 'jump']) if (actions[k]) { actions[k].setLoop(THREE.LoopOnce, 1); actions[k].clampWhenFinished = true; }
  if (actions.attack) actions.attack.timeScale = 2.0;
  if (actions.run) actions.run.timeScale = 1.4;
  actions.idle && actions.idle.play();
  return { inner, mats, M: { mixer, actions, cur: 'idle', prevSwing: 0, lockT: 0 } };
}

export function makeHeroPivot(key, team) {
  const pivot = new THREE.Group();
  if (key === 'bear' && tmpl) {
    const { inner, mats, M } = buildMungchi(team);
    pivot.add(inner);
    pivot.userData.mungchi = M;
    pivot.userData.mats = mats;
  } else {
    const inner = makeHero(key, team);
    inner.rotation.y = Math.PI / 2; // procedural models face +Z; rotate so they face +X like the GLB
    pivot.add(inner);
    pivot.userData.L = inner.userData.L;
    pivot.userData.mats = inner.userData.mats;
    pivot.userData.inner = inner;
  }
  return pivot;
}

function play(M, name, fade = 0.15, from = 0) {
  if (M.cur === name) return;
  const a = M.actions[name], b = M.actions[M.cur];
  if (!a) return;
  a.reset(); a.time = from; a.enabled = true; a.setEffectiveWeight(1); a.play();
  if (b) a.crossFadeFrom(b, fade, false);
  M.cur = name;
}

// state: {moving, ground, swing}
export function updateMungchi(M, st, dt) {
  const swing = st.swing || 0;
  if (swing > M.prevSwing + 0.3) { M.cur = '_'; play(M, 'attack', 0.08); M.cur = 'attack'; M.lockT = 0.6; }
  M.prevSwing = swing;
  M.lockT -= dt;
  if (M.lockT <= 0) {
    if (!st.ground) play(M, 'jump', 0.1, 0.25);
    else if (st.moving) play(M, 'run');
    else play(M, 'idle', 0.25);
  }
  M.mixer.update(dt);
}
