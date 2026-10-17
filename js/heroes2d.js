// 게임 ↔ characters/ 연결 어댑터
// 각 영웅을 오프스크린 캔버스에 2D 퍼펫으로 그리고, Three.js 평면(CanvasTexture)으로 3D 월드에 배치한다.
import * as THREE from '../vendor/three.module.js';
import { groundDecal, glowSprite, burst, T, TEAM_RGB } from './sprites2d.js';
import { HEROES, GAME_KEY, loadHeroes, newChar, setMode, update, renderChar, drawChar, getPose,
  setTarget, setWorld, setShake, tickFX, drawFX, FX, SIMQ, tickSim, TAU } from '../characters/index.js';

import { mpt, BASE } from '../characters/common/index.js';
import { loadFrameSet, loadFxSheets, FrameAnim, makeFrameSprite, makeFx } from '../characters/common/frames.js';
// 프레임 애니메이션 영웅(단단): 아틀라스/이펙트 시트도 함께 로드. 실패하면 퍼펫으로 대체
const FRAMESETS = {}, FXSETS = {};
const framesReady = Promise.all(Object.values(HEROES).filter(h => h.frames).map(h =>
  Promise.all([loadFrameSet(BASE + h.frames.json), h.frames.fx ? loadFxSheets(BASE + h.frames.fx) : null])
    .then(([S, F]) => { FRAMESETS[h.key] = S; FXSETS[h.key] = F; }).catch(err => console.warn('frame hero fallback to puppet:', h.key, err))));
export const heroesReady = Promise.all([loadHeroes(), framesReady]);

const CW = 384, CH = 384;          // 영웅 하나당 텍스처 해상도
const PCS = 1.0, PGY = 640;          // 퍼펫 공간: 720단위 높이, 지면 y=640
export const PLANE = 4.6;            // 월드 단위 평면 크기 (뭉치 키 ≈ 2.4)

export function makePuppetHero(gameKey, team) {
  const hero = HEROES[GAME_KEY[gameKey] || gameKey];
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const mat = new THREE.MeshBasicMaterial({ toneMapped: false, map: tex, transparent: true, depthWrite: false, alphaTest: 0.02, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(PLANE, PLANE), mat);
  plane.position.y = PLANE * (0.5 - (720 - PGY) / 720); // 퍼펫 지면 = 그룹 원점
  plane.renderOrder = 5;
  const grp = new THREE.Group(); const body = new THREE.Group(); body.add(plane); grp.add(body); grp.userData.body = body; grp.userData.plane = plane; plane.userData.py0 = plane.position.y;
  // 부드러운 접지 그림자
  const sh = groundDecal(T.shadow, 1.7, 0.6); sh.renderOrder = 1.1; sh.position.y = 0.05; body.add(sh);
  // Lv15+ 팀 색 불꽃 오라
  const tc = team ? 0xff4a2a : 0x3c96ff;
  const aura = new THREE.Group(); aura.visible = false; body.add(aura);
  const af = glowSprite(tc, 2.2); af.scale.set(2.4, 0.9, 1); af.position.y = 0.25; aura.add(af);
  const ab = glowSprite(tc, 2.6); ab.scale.set(2.0, 3.0, 1); ab.position.set(0, 1.2, -0.05); ab.renderOrder = 4.5; aura.add(ab);
  const flames = []; for (let i = 0; i < 10; i++) { const f = glowSprite(tc, 0.6); f.renderOrder = i % 2 ? 6 : 4; aura.add(f); flames.push(f); }
  grp.userData.aura = { g: aura, af, ab, flames, tc, emb: 0 };
  // 팀 색 표시: 발밑 바닥 링(3D) — 진한 파랑/빨강
  const ring = groundDecal(T.ring(TEAM_RGB[team] || TEAM_RGB[0]), 1.9, 0.75); ring.renderOrder = 1.2; body.add(ring); grp.userData.ring = ring;
  const ch = newChar(hero, 0, team ? -1 : 1);
  setMode(ch, 'idle');
  // 프레임 애니메이션 영웅: 아틀라스 평면을 몸(body)에 붙이고, 캔버스 평면은 기절 별 같은 덧그림 전용으로 남김
  const FS = hero.frames && FRAMESETS[hero.key];
  if (FS) {
    const S = makeFrameSprite(FS, hero.frames.worldH); body.add(S.mesh); S.mesh.position.z = 0.01;
    const A = new FrameAnim(FS); A.play('idle');
    grp.userData.frames = { S, A, FS, FX: FXSETS[hero.key], hero, face: team ? -1 : 1, one: null, base: 'idle', seq: 0, pdash: 0, pstun: 0, php: null, hitCd: 0, fx: [], rec: null, recT: 0, air: false, canvasDirty: true };
    plane.visible = false;
    if (typeof window !== 'undefined') (window.__FRH = window.__FRH || []).push(grp.userData.frames);   // 디버그/미리보기 캡처용
  }
  // 영웅마다 독립된 이펙트 리스트
  grp.userData.puppet = { ch, cv, g, tex, team, fx: [], simq: [], seq: 0, gameKey };
  return grp;
}

// 게임 엔티티 상태 → 퍼펫 상태 (e: 게임 hero 엔티티, 또는 메뉴용 가짜 상태)
// 각 동작에서 무기를 '놓는' 시점 (동작 진행률 k): characters/*/rig.js 의 tick 기준
const REL_K = { mungchi:{basic:.42, basic3:.42}, piyo:{basic:.62, skill1:.62, skill2:.45, ult:.62}, momo:{basic:.4, skill1:.4, skill2:.3, ult:.22},
  dandan:{basic:.42, bash:.45, skill1:.42, ult:.62}, salang:{basic:.4, skill1:.4, skill2:.42, ult:.35}, toto:{basic:.4, skill1:.35, skill2:.42, ult:.45} };
export function updatePuppet(m, e, dt) {
  const P = m.userData.puppet; if (!P) return;
  if (m.userData.frames) return updateFrameHero(m, e, dt);
  const ch = P.ch; dt = Math.min(0.05, dt || 0.016);
  ch.face = e.face < 0 ? -1 : 1;
  // 실제 공격/스킬 이벤트
  if ((e.animSeq || 0) !== P.seq) {
    P.seq = e.animSeq || 0;
    let a = e.animAct;
    // 3타(basic3)는 game.js가 정함. 동작 재생 속도는 게임의 발사 시점(HERO_RELEASE)에 놓는 프레임이 오도록 맞춤
    if (ch.hero.acts[a]) { setMode(ch, a); const k = (REL_K[ch.hero.key] || {})[a], rt = ((window.HERO_RELEASE || {})[P.gameKey] || {})[a];
      ch.actRate = k && rt ? Math.max(0.6, Math.min(3, k * ch.hero.acts[a].dur / rt)) : 1; }
  }
  const moving = Math.abs(e.vx || 0) > 10 && e.ground !== false;
  const want = e.ground === false ? 'jump' : moving ? 'run' : 'idle';
  if (!ch.act && ch.mode !== want) setMode(ch, want);
  if (ch.mode === 'jump') { ch.jumpT = 1; ch.landT = -1; ch.vy = (e.vy || 0) * 1.6; }
  // 이펙트/시뮬레이션 큐를 이 영웅 것으로 교체
  swap(FX, P.fx); swap(SIMQ, P.simq);
  setTarget(P.g, CW, CH); setWorld({ CS: PCS, GY: PGY, camX: 0, GAME: true });
  tickFX(dt); update(ch, ch.act ? dt * (ch.actRate || 1) : dt);
  ch.x = 0; ch.y = 0; ch.trail.length = 0;
  if (P.gameKey === 'bear' || ch.hero.key === 'mungchi') { if (e.shield > 0) { ch.shield = Math.min(1, e.shield * 3); ch.glow = null; } else if (!ch.act || ch.actName !== 'skill2') ch.shield = 0; }
  // 그리기
  const g = P.g, U = CH / 720;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, CW, CH);
  if (e.flash > 0.6) g.translate((Math.random() - .5) * 6, 0);
  drawFX('back');
  // 살랑 그림자 분신: 영웅 뒤에 반투명 보라색 복제 퍼펫 (공격할 때 같이 벰)
  if (e.clone) { if (!P.ch2) { P.ch2 = newChar(ch.hero, 0, ch.face); setMode(P.ch2, 'idle'); P.cseq = 0; P.cT = 0; }
    const c2 = P.ch2; c2.face = ch.face; P.cT = Math.min(1, P.cT + dt * 3);
    if ((e.clone.seq || 0) !== P.cseq) { P.cseq = e.clone.seq || 0; setMode(c2, Math.random() < 0.5 ? 'basic' : 'skill1'); c2.actRate = 1.5; }
    const want2 = moving ? 'run' : 'idle'; if (!c2.act && c2.mode !== want2) setMode(c2, want2);
    update(c2, c2.act ? dt * (c2.actRate || 1) : dt); c2.x = -ch.face * 170 * P.cT; c2.y = -18 * Math.sin(performance.now() / 300); c2.trail.length = 0;
    if (!P.cv2) { P.cv2 = document.createElement('canvas'); P.cv2.width = CW; P.cv2.height = CH; }
    const g2 = P.cv2.getContext('2d'); g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, CW, CH); setTarget(g2, CW, CH); renderChar(c2);
    g2.globalCompositeOperation = 'source-atop'; g2.fillStyle = 'rgba(120,50,200,0.55)'; g2.fillRect(0, 0, CW, CH); g2.globalCompositeOperation = 'source-over';
    setTarget(P.g, CW, CH); P.g.save(); P.g.globalAlpha = 0.62 * P.cT; P.g.shadowColor = '#b070ff'; P.g.shadowBlur = 16; P.g.drawImage(P.cv2, 0, 0); P.g.restore();
  } else if (P.ch2) { P.ch2 = null; }
  renderChar(ch); drawFX('front');
  // 토토: 지팡이 수정 끝 위치를 게임 좌표로 알려줌 (씨앗/폭탄이 실제 지팡이 끝에서 나가도록)
  if (ch.mats && ch.mats.staff && P.gameKey === 'rabbit') { const [tx, ty] = mpt(ch.mats.staff, 0, -88), K = PLANE / 0.028 / 720 * (m.userData.heroScale || 1), L = window.__LR;
    e.tipG = [tx * K, ty * K]; e.tipT = L && L.G ? L.G.t : 0; }
  // 피격 플래시
  if (e.flash > 0) { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(255,255,255,${Math.min(.8, e.flash * .8)})`; g.fillRect(0, 0, CW, CH); g.restore(); }
  if (e.stun > 0) { g.save(); g.translate(CW / 2, (PGY - 400) * U); for (let i = 0; i < 3; i++) { const a = performance.now() / 200 + i * 2.1; g.fillStyle = '#ffe066'; g.beginPath(); g.arc(Math.cos(a) * 40 * U, Math.sin(a) * 10 * U, 9 * U, 0, TAU); g.fill(); } g.restore(); }
  swap(FX, P.fx); swap(SIMQ, P.simq);
  setShake(0);
  levelScaleAura(m, e, dt);
  P.tex.needsUpdate = true;
}
function levelScaleAura(m, e, dt) {
  // 레벨 성장(1→20: +15%) — 부드럽게
  const lv = e.lv || 1, wantS = 1 + 0.15 * (lv - 1) / 19;
  const cur = m.userData.heroScale || wantS; m.userData.heroScale = cur + (wantS - cur) * Math.min(1, dt * 3);
  m.userData.body && m.userData.body.scale.setScalar(m.userData.heroScale);
  const A = m.userData.aura;
  if (A) { A.g.visible = lv >= 15 && e.hp > 0;
    if (A.g.visible) { const s = 0.7 + 0.3 * (lv - 15) / 5, t = performance.now() / 1000;
      A.af.material.opacity = Math.min(1, (0.75 + 0.15 * Math.sin(t * 13) + 0.1 * Math.random()) * s);
      A.ab.material.opacity = (0.4 + 0.12 * Math.sin(t * 9.3)) * s; A.ab.scale.set(1.9 + 0.15 * Math.sin(t * 7), 2.8 + 0.3 * s + 0.2 * Math.sin(t * 11), 1);
      A.flames.forEach((f, i) => { const ph = (t * (1.1 + i * 0.13) + i / 6) % 1; f.position.set((i % 2 ? 1 : -1) * (0.5 + 0.15 * Math.sin(i * 2.4 + t * 3)), 0.1 + ph * (1.4 + s), i % 2 ? 0.08 : -0.08);
        const k = Math.sin(ph * Math.PI); f.material.opacity = Math.min(0.85, k * 0.9 * s); f.scale.setScalar((0.9 - ph * 0.5) * (0.8 + 0.5 * s)); });
      A.emb += dt; if (A.emb > 0.18 / s) { A.emb = 0; const p = new THREE.Vector3((Math.random() - .5) * 0.9, 0.2, 0.1); m.localToWorld(p);
        burst(p.x, p.y, p.z, { n: 1, tex: T.glow, color: [A.tc, 0xffffff], spd: 0.3, size: 0.2, life: 0.9, g: -2.5, vy0: 1, add: true }); } } }
}
function swap(a, b) { const t = a.splice(0); a.push(...b); b.length = 0; b.push(...t); }

// ---------- 영웅 사망 연출 ----------
// 맞은 방향으로 튕겨 나가며 움찔 → 공중에서 넘어지며 굴러 바닥에 쿵(살짝 튕김) → 잠깐 누워 있다가 → 팀 색 반짝이로 펑 사라짐
// D: { t, dir(+1=오른쪽으로 날아감), x0, y0 }  m.position은 호출 쪽에서 매 프레임 x0/y0 기준으로 다시 잡음
export const DEATH_LEN = 2.3;
const DEATH_ACT = { dur: 1e9, base: 'idle', pose(o, k, ch) {
  const t = ch.deathT || 0, R = ch.hero.rest, f = Math.min(1, t / .12), lim = Math.min(1, Math.max(0, (t - .2) / .35));
  // 움찔(팔 번쩍, 고개 젖힘) → 축 늘어짐
  o.lean = -.35 * f + .1 * lim; o.head = -.35 * f + .15 * lim;
  o.shF = lerp(lerp(R.shF, -2.5, f), -1.7, lim); o.elF = lerp(-.5, -.15, lim);
  o.shB = lerp(lerp(R.shB, -2.1, f), -2.7, lim); o.elB = lerp(-.6, -.2, lim);
  o.fF = [R.fF[0] + 30 * f, -10 * f * (1 - lim)]; o.fB = [R.fB[0] - 10, 0]; o.hy = R.hy + 8 * f; o.breath = 0;
} };
const lerp = (a, b, k) => a + (b - a) * k;
export function heroDeath(m, e, D, dt) {
  const P = m.userData.puppet, plane = m.userData.plane; if (!P || !plane) return;
  if (m.userData.frames) return frameDeath(m, e, D, dt);
  const ch = P.ch, t = D.t, dir = D.dir, sc = m.userData.heroScale || 1;
  if (!D.started) { D.started = true; ch.act = DEATH_ACT; ch.actName = 'death'; ch.at = 0; ch.shield = 0; ch.glow = null; }
  ch.deathT = t;
  // 튕겨 나감: 감속하는 이동 + 포물선
  const air = .62, ta = Math.min(t, air), kx = 1 - Math.pow(1 - ta / air, 2);
  let x = dir * 1.9 * kx, y = t < air ? 1.25 * Math.sin(Math.PI * ta / air) * (1 - ta / air * .3) : 0;
  // 회전: 넘어가며 한 바퀴 굴러 등으로 눕기(1.45rad). 착지 후 작은 튕김
  const lieA = 1.45, spin = Math.PI * 2;
  let a;
  if (t < .1) a = -.12 * (t / .1);
  else if (t < air) { const k = (t - .1) / (air - .1); a = -.12 + (lieA + spin + .12) * (1 - Math.pow(1 - k, 2.2)); }
  else { const b = t - air; a = lieA + spin + .22 * Math.exp(-b * 9) * Math.sin(b * 22); y = Math.max(0, .28 * Math.exp(-b * 10) * Math.sin(Math.min(Math.PI, b * 14))); x += dir * .25 * (1 - Math.exp(-b * 8)); }
  const ang = -dir * a;
  // 평면을 발밑(원점) 기준으로 회전. 누우면 몸 두께만큼 띄움
  const lie = Math.min(1, Math.max(0, (t - air + .15) / .2));
  const py0 = plane.userData.py0, c = Math.cos(ang), s = Math.sin(ang);
  plane.position.set(-s * py0, c * py0 + .42 * lie, 0); plane.rotation.z = ang;
  m.position.x = D.x0 + x * sc; m.position.y = D.y0 + y;
  // 퍼펫 그리기 (흰 번쩍 → 0)
  updatePuppet(m, { face: ch.face, vx: 0, ground: true, flash: t < .18 ? 1 - t / .18 : 0, lv: e.lv, hp: 0, animSeq: P.seq }, dt);
  // 사라짐: 1.55초부터 반짝이며 흐려짐
  const fadeS = 1.55, k = Math.max(0, (t - fadeS) / .5);
  plane.material.opacity = 1 - k;
  if (m.userData.ring) m.userData.ring.material.opacity = Math.max(0, 1 - t * 2);
  if (t >= fadeS && !D.poof) {
    D.poof = true; const p = new THREE.Vector3(); plane.getWorldPosition(p); const tc = P.team ? [0xff5a3a, 0xffd0c0, 0xffffff] : [0x4aa8ff, 0xc8e8ff, 0xffffff];
    burst(p.x, p.y - .3, p.z + .3, { n: 26, tex: T.star, color: tc, spd: 3.2, size: .42, life: .8, g: -1.5, spread: 1.6, spreadY: .4, add: true });
    burst(p.x, p.y - .3, p.z + .3, { n: 18, tex: T.glow, color: tc, spd: 1.8, size: .55, life: .7, g: -2, spread: 1.4, add: true });
  }
  m.visible = t < DEATH_LEN;
}
export function heroDeathReset(m) {
  const P = m.userData.puppet, plane = m.userData.plane; if (!P || !plane) return;
  const F = m.userData.frames; if (F) { F.one = null; F.base = null; F.S.setOpacity(1); F.S.mesh.position.x = 0; if (m.userData.ring) m.userData.ring.material.opacity = 1; F.php = null; return; }
  plane.position.set(0, plane.userData.py0, 0); plane.rotation.z = 0; plane.material.opacity = 1;
  if (m.userData.ring) m.userData.ring.material.opacity = 1;
  P.ch.act = null; P.ch.deathT = 0; setMode(P.ch, 'idle');
}

// ================= 프레임 애니메이션 영웅 (단단) =================
// 게임 상태 → 동작: 공격/스킬(animSeq) > 대시 > 피격/기절 > 귀환 > 방향 전환(turn) > 점프/착지 > 걷기 > 대기
// 한 번 재생 동작은 key 프레임이 게임의 발사/타격 시점(HERO_RELEASE)에 오도록 재생 속도를 맞춤
const GSCALE = 0.028;                       // 게임 px → 월드 (render3d.js SCALE)
const LOOPS = { idle: 1, walk: 1, recall: 1 };
function fxAdd(F, m, sheet, o, world) {
  if (!F.FX || !F.FX[sheet]) return null; const fx = makeFx(F.FX[sheet], o);
  const par = world && m.parent ? m.parent : m; par.add(fx.mesh);
  fx.mesh.position.set((world && m.parent ? m.position.x : 0) + (o.x || 0), (world && m.parent ? m.position.y : 0) + (o.y || 0), (world && m.parent ? m.position.z : 0) + (o.z != null ? o.z : 0.3));
  F.fx.push(fx); return fx;
}
function frameKeyFx(F, m, name, e) {
  const f = F.face, sc = m.userData.heroScale || 1;
  if (F.hero.key === 'mungchi') return mungKeyFx(F, m, name, e, f, sc);
  if (name === 'attack') fxAdd(F, m, 'impact', { w: 1.1 * sc, x: f * 1.55 * sc, y: 1.15 * sc, fps: 36, to: 8, alpha: 0.75 }, true);
  else if (name === 'bash') { fxAdd(F, m, 'impact', { w: 2.6 * sc, x: f * 1.05 * sc, y: 1.0 * sc, fps: 30 }, true); fxAdd(F, m, 'impact', { w: 1.4 * sc, x: f * 1.0 * sc, y: 1.0 * sc, fps: 40, to: 6, tint: 0xffe08a }, true); }
  else if (name === 'ult') {
    const T = typeof TURTLE !== 'undefined' ? TURTLE.quake : { r: 185 }, lv = e.lv || 1;
    const r = T.r * Math.min(1.5, 1 + 0.025 * (lv - 1)), w = 2 * r * GSCALE * 0.8;
    fxAdd(F, m, 'quake', { w, bottom: true, y: -0.5, z: 0.45, fps: 13, fadeOut: 0.35, alpha: 0.9, renderOrder: 4.6 }, true);
    fxAdd(F, m, 'impact', { w: 2.6, y: 0.5, z: 0.5, fps: 30, to: 9, tint: 0xffe6a0, alpha: 0.8 }, true);
    // 여진(TURTLE.quake.after 초 뒤 작은 진동)
    F.after = { t: T.after || 0.42, w: w * 0.85 };
  }
}
// 뭉치: 망치 머리 위치(앵커 기준 월드, 오른쪽 볼 때) — 타격 프레임에서 잰 값
const MUNG_HAM = { attack: [1.41, 0.42], skill1: [1.33, 0.39], ultfin: [1.47, 0.5] };
function mungKeyFx(F, m, name, e, f, sc) {
  const H = MUNG_HAM[name], hx = H ? f * H[0] * sc : 0, hy = H ? H[1] * sc : 0, lv = e.lv || 1, rk = Math.min(1.5, 1 + 0.025 * (lv - 1));
  const wpos = () => { const p = new THREE.Vector3(); m.getWorldPosition(p); return p; };
  if (name === 'attack') {
    const big = F.lastAct === 'basic3';
    fxAdd(F, m, 'impact', { w: (big ? 2.1 : 1.35) * sc, x: hx, y: hy + 0.15, fps: big ? 30 : 38, to: big ? 12 : 8, tint: 0xfff0c8, alpha: big ? 1 : 0.85 }, true);
    if (big) fxAdd(F, m, 'quake', { w: 2.6 * sc, x: hx, bottom: true, y: -0.45, z: 0.45, fps: 18, from: 1, alpha: 0.7, fadeOut: 0.25, renderOrder: 4.6 }, true);
    const p = wpos(); burst(p.x + hx, p.y + hy, p.z + .4, { n: big ? 14 : 7, tex: T.star, color: [0xffe9a0, 0xffffff], spd: big ? 3 : 2, size: big ? .3 : .22, life: .35, g: 6, spread: .4, add: true });
  } else if (name === 'skill1') {   // 쿵 내려찍기 착지: 땅 갈라짐(영상) + 큰 충격파 + 먼지/돌 파편 (게임: 기절·흔들림·히트스톱)
    const r = 130 * rk, w = 2 * r * GSCALE * 1.05;
    fxAdd(F, m, 'quake', { w, bottom: true, y: -0.5, z: 0.45, fps: 15, fadeOut: 0.35, alpha: 0.95, tint: 0xffe0a0, gain: 1.1, renderOrder: 4.6 }, true);
    fxAdd(F, m, 'impact', { w: 2.6 * sc, x: hx, y: hy + 0.1, z: 0.5, fps: 30, tint: 0xffe6a0, gain: 1.2 }, true);
    F.after = { t: 0.3, w: w * 0.8 };
    const p = wpos(); burst(p.x + hx, p.y + 0.2, p.z + .4, { n: 16, tex: T.glow, color: [0xd9b77a, 0xfff0c0], spd: 3.2, size: .45, life: .55, g: -1, spread: 1.2, add: true });
    burst(p.x + hx, p.y + 0.3, p.z + .4, { n: 14, tex: T.star, color: [0xffe066, 0xffffff], spd: 4, size: .3, life: .45, g: 8, spread: .6, add: true });
  } else if (name === 'skill2') {   // 꿀 방패 발동: 몸에서 금빛 폭발 + 꿀방울
    fxAdd(F, m, 'impact', { w: 3.0 * sc, y: 1.2 * sc, z: 0.4, fps: 28, tint: 0xffc840, gain: 1.3 }, true);
    const p = wpos(); burst(p.x, p.y + 1.2 * sc, p.z + .4, { n: 18, tex: T.glow, color: [0xffb820, 0xffe27a, 0xffffff], spd: 2.6, size: .35, life: .6, g: -3, spread: .8, spreadY: .8, add: true });
  } else if (name === 'ultfin') {   // 곰 돌진 마무리 내려찍기: 큰 충격파 2겹 + 섬광 + 여진
    fxAdd(F, m, 'quake', { w: 6.2 * sc * rk, x: hx * 0.6, bottom: true, y: -0.55, z: 0.45, fps: 14, fadeOut: 0.4, alpha: 1, gain: 1.15, tint: 0xffe2a8, renderOrder: 4.6 }, true);
    fxAdd(F, m, 'impact', { w: 3.6 * sc, x: hx, y: hy + 0.2, z: 0.5, fps: 28, tint: 0xffe08a, gain: 1.5 }, true);
    fxAdd(F, m, 'impact', { w: 1.8 * sc, x: hx, y: hy + 0.2, z: 0.55, fps: 40, to: 7, tint: 0xffffff, gain: 1.2 }, true);
    const fl = glowSprite(0xffe6a0, 1); fl.renderOrder = 7.5; fl.position.set(hx, hy + 0.3, 0.5); m.add(fl); F.flash = { s: fl, t: 0 };
    F.after = { t: 0.32, w: 5.2 * sc * rk };
    const p = wpos(); burst(p.x + hx, p.y + 0.3, p.z + .4, { n: 26, tex: T.star, color: [0xffe066, 0xffd0a0, 0xffffff], spd: 5, size: .38, life: .6, g: 8, spread: 1, add: true });
    burst(p.x + hx, p.y + 0.1, p.z + .4, { n: 20, tex: T.glow, color: [0xc9a46a, 0xfff0c0], spd: 3.5, size: .55, life: .6, g: -1, spread: 1.8, add: true });
  }
}
function mungUpdate(F, A, e, m, face, play) {
  const L = window.__LR, G = L && L.G, moving = Math.abs(e.vx || 0) > 10 && e.ground !== false;
  // 쿵 내려찍기: 게임 코드가 높이(vy=-560 포물선)를 주므로 영상의 점프 높이는 빌드에서 제거, 공중 동안 vy에 따라 0..key-1 프레임 → 착지하면 key(내려찍기)부터
  if (F.one === 'skill1' && F.slamT) {
    const K = A.A.key;
    if (e.slam && e.ground === false) { const q = Math.max(0, Math.min(1, ((e.vy || 0) + 560) / 1120)); A.rate = 0; A.t = (Math.min(K - 1, Math.round(q * (K - 1))) + 0.5) / A.A.fps; A.frameAt(); }
    else if (!e.slam) { F.slamT = false; A.rate = 1; A.t = K / A.A.fps; }
  }
  // 곰 돌진: 돌진(h.dash) 동안 달리기 루프, 끝나면 마무리 — 타격 프레임이 game.js ultSmash 시점(h.ultSmash)에 오도록 속도 조절
  if (F.one === 'ultrun' && !e.dash) {
    const left = G && e.ultSmash ? e.ultSmash - G.t : 0.16, kt = A.keyTime('ultfin');
    F.face = face; play('ultfin', { rate: Math.max(1, Math.min(4, kt / Math.max(0.04, left))), hold: 0.04, onKey: () => { A.rate = 1; frameKeyFx(F, m, 'ultfin', e); } });
  }
  // 움직이면 끊어도 되는 동작: 꿀 방패 시전(0.35초 뒤), 마무리 내려찍기의 회복 부분
  if (moving && ((F.one === 'skill2' && A.t > 0.35) || (F.one === 'ultfin' && A.keyFired && A.idx >= A.A.key + 3))) F.one = null;
  // 꿀 방패 지속(3초+): 몸이 금빛으로 맥동 + 뒤쪽 꿀빛 후광 + 떨어지는 꿀방울/반짝이 (둥근 방패막은 game.js 오버레이가 그림)
  const sh = e.shield > 0 && !(e.respawn > 0);
  if (sh) {
    if (!F.honey) { const g = glowSprite(0xffb020, 3.2); g.renderOrder = 4.4; g.position.set(0, 1.15, -0.06); g.scale.set(2.6, 3.2, 1); m.userData.body.add(g); F.honey = { g, t: 0, d: 0 }; }
    const Hn = F.honey; Hn.t += 1 / 60; const pu = 0.5 + 0.5 * Math.sin(Hn.t * 7);
    F.S.setTint(0xffc030, 0.05 + 0.06 * pu); Hn.g.material.opacity = Math.min(1, Hn.t * 4) * (0.45 + 0.2 * pu); Hn.g.scale.set(2.5 + 0.2 * pu, 3.1 + 0.2 * pu, 1);
    Hn.d += 1 / 60; if (Hn.d > 0.09) { Hn.d = 0; const p = new THREE.Vector3((Math.random() - .5) * 1.6, 0.4 + Math.random() * 1.8, 0.2); m.userData.body.localToWorld(p);
      burst(p.x, p.y, p.z, { n: 1, tex: Math.random() < .5 ? T.star : T.glow, color: [0xffb820, 0xffe27a, 0xffffff], spd: 0.4, size: 0.16 + Math.random() * 0.12, life: 0.7, g: 2.5, add: true }); }
  } else if (F.honey) { F.S.setTint(0xffffff, 0); F.honey.g.parent && F.honey.g.parent.remove(F.honey.g); F.honey.g.material.dispose(); F.honey = null; }
  // 귀환: 단단과 같은 영상 빛 기둥(금빛) 위에 넓은 금빛 기둥 + 위로 솟는 반짝이 (채널 진행만큼 굵고 밝아짐)
  if (e.recall && !(e.respawn > 0)) {
    if (!F.pil) { const g = glowSprite(0xffd060, 1); g.renderOrder = 4.6; g.position.set(0, 2.7, -0.04); m.userData.body.add(g); F.pil = { g, t: 0, d: 0 }; }
    const Pl = F.pil, k = F.recK || 0; Pl.t += 1 / 60; Pl.fade = null;
    Pl.g.scale.set(1.2 + 1.3 * k + 0.12 * Math.sin(Pl.t * 11), 6.8, 1); Pl.g.material.opacity = Math.min(1, Pl.t * 2) * (0.3 + 0.45 * k);
    Pl.d += 1 / 60; if (Pl.d > 0.11 - 0.07 * k) { Pl.d = 0; const p = new THREE.Vector3((Math.random() - .5) * (1 + k), 0.15, 0.2); m.userData.body.localToWorld(p);
      burst(p.x, p.y, p.z, { n: 1, tex: Math.random() < .6 ? T.star : T.glow, color: [0xffe27a, 0xffffff, 0xffc44a], spd: 0.3, size: 0.14 + 0.14 * k, life: 1.0, g: -2.2, vy0: 1.6 + 1.5 * k, add: true }); }
  } else if (F.pil) { const Pl = F.pil; Pl.fade = (Pl.fade == null ? 1 : Pl.fade) - 1 / 60 * 4; Pl.g.material.opacity *= 0.85;
    if (Pl.fade <= 0) { Pl.g.parent && Pl.g.parent.remove(Pl.g); Pl.g.material.dispose(); F.pil = null; } }
}
function setBase(F, name, o) { if (F.base === name && F.A.is(name)) return; F.base = name; F.A.play(name, o); }
function updateFrameHero(m, e, dt) {
  const F = m.userData.frames, A = F.A, S = F.S, P = m.userData.puppet; dt = Math.min(0.05, dt || 0.016);
  const face = e.face < 0 ? -1 : 1, ground = e.ground !== false, L = window.__LR, G = L && L.scene === 'match' ? L.G : null;
  // 경기 중엔 게임 시간(G.t) 기준으로 재생: 렌더 dt(고정 1/60)와 달리 실제 경과·배속·히트스톱을 그대로 따라가서 key 프레임이 타격 시점과 맞음
  if (G && e.kind === 'hero') { const d = G.t - (F.gt == null ? G.t - dt : F.gt); F.gt = G.t; dt = d >= 0 && d < 0.25 ? d : dt; }
  const play = (name, o = {}) => { if (!A.play(name, o)) return false; F.one = name; F.base = null; F.mirror = o.mirror != null ? o.mirror : face < 0; return true; };
  // 1) 공격·스킬 (game.js: h.animAct / h.animSeq)
  if ((e.animSeq || 0) !== F.seq) {
    F.seq = e.animSeq || 0;
    const a = e.animAct, name = F.hero.frames.act[a] || a;
    if (F.FS.actions[name]) {
      const kt = A.keyTime(name), rt = ((window.HERO_RELEASE || {})[P.gameKey] || {})[a];
      const rate = kt && rt ? Math.max(0.6, Math.min(3, kt / rt)) : 1;
      F.face = face; F.lastAct = a; const pr = (F.hero.frames.postRate || {})[name];
      play(name, { rate, hold: F.hero.key === 'mungchi' ? 0.04 : name === 'skill1' ? 0.28 : name === 'pull' ? 0.15 : 0.04, onKey: () => { if (pr) A.rate = pr; frameKeyFx(F, m, name, e); } });
      if (F.hero.key === 'mungchi' && name === 'skill1') { F.slamT = true; A.rate = 0; }   // 공중 프레임은 아래에서 vy로 선택
      if (name === 'pull' && G) { const t = G.ents.find(x => x.yank && x.yank.owner === e); if (t) { const sc = 1; fxAdd(F, m, 'impact', { w: 2.2 * sc, x: (t.x - e.x) * GSCALE, y: (e.y - (t.y - t.h / 2)) * GSCALE, fps: 30, tint: 0xd8ffb0 }, true); } }
    }
  }
  // 2) 대시
  const noInt = F.hero.frames.noInt || ['ult'], locked = noInt.includes(F.one);
  const dfx = e.dashFx || 0; if (dfx > F.pdash + 0.5 && !locked) play('dash'); F.pdash = dfx;
  // 3) 피격: 기절 시작 / 큰 피해(최대 체력 4%+)일 때만, 스킬 동작은 끊지 않음
  F.hitCd = Math.max(0, F.hitCd - dt);
  const hpDrop = F.php == null ? 0 : F.php - (e.hp || 0); F.php = e.hp;
  const stunStart = e.stun > 0 && !(F.pstun > 0); F.pstun = e.stun || 0;
  const softOne = !F.one || F.one === 'turn' || F.one === 'land' || F.one === 'hit';
  if ((stunStart && !locked) || (e.maxHp && hpDrop > e.maxHp * 0.04 && F.hitCd <= 0 && softOne && F.one !== 'hit')) { play('hit', { hold: e.stun > 0 ? Math.min(1.5, e.stun) : 0.05 }); F.hitCd = 1.0; }
  // 4) 방향 전환: turn 영상은 오른쪽→왼쪽. 왼쪽으로 돌 땐 그대로, 오른쪽으로 돌 땐 좌우 반전 (끝 프레임 = 반대쪽 대기 자세)
  if (face !== F.face) {
    F.face = face;
    if ((!F.one || F.one === 'land') && ground && !e.recall && !(e.respawn > 0)) play('turn', { mirror: face > 0 });
    else if (F.one && F.one !== 'turn') F.mirror = face < 0;   // 공격 중 몸을 돌리면 바로 반전 (조작 반응성 우선)
  }
  if (F.one === 'turn' && !ground) F.one = null;
  // 5) 점프 / 착지
  if (!ground) F.air = true;
  else if (F.air) { F.air = false; if (!F.one) { const J = F.FS.actions.jump; play('jump', { t0: (J.land != null ? J.land : 5) / J.fps }); F.one = 'land'; } }
  // 뭉치 전용: 쿵 내려찍기(공중 = 게임 점프 vy로 프레임 선택 → 착지(doSlam) 순간 타격 프레임), 곰 돌진(달리기 루프 → 돌진 끝 마무리 내려찍기), 꿀 방패(움직이면 시전 동작 끊김)
  if (F.hero.key === 'mungchi') mungUpdate(F, A, e, m, face, play);
  // 지속 동작
  A.update(dt);
  if (F.one && A.done) F.one = null;
  if (!F.one) {
    F.mirror = face < 0;
    if (!ground) { setBase(F, 'jump'); A.rate = 0; const vy = e.vy || 0, J = A.A;
      const i = J.air ? J.air[0] + Math.round(Math.max(0, Math.min(1, (vy + 600) / 1200)) * (J.air[1] - J.air[0])) : (vy < -380 ? 1 : vy < -120 ? 2 : vy < 160 ? 3 : 4);
      A.t = (i + 0.5) / J.fps; A.frameAt(); }
    else if (e.recall) setBase(F, 'recall');
    else if (Math.abs(e.vx || 0) > 10) { setBase(F, 'walk'); A.fpsMul = Math.max(0.6, Math.min(1.5, Math.abs(e.vx) / ((e.d && e.d.spd) || 205))); }
    else setBase(F, 'idle');
  }
  // 귀환 이펙트: 채널 중 빛 기둥(뒤: 넓고 밝게 + 앞: 얇게) + 바닥 광륜 + 두 손 사이 에너지 구슬(채널 진행만큼 커짐),
  // 완료(남은 시간≈0)면 도착 지점에서 큰 섬광 + 마무리 기둥 + 반짝이 폭발. 취소되면 빠르게 사라짐
  const RF = F.FX && F.FX.recall;
  if (e.recall) {
    F.recT = e.recall.t; F.recK = Math.max(0, Math.min(1, 1 - e.recall.t / (e.recall.t0 || 4)));
    if (!F.rec && RF) {
      const RT = F.hero.frames.recallTint;
      F.rec = [fxAdd(F, m, 'recall', { w: 3.0, bottom: true, y: -0.15, z: -0.05, loop: true, to: RF.loopN, fadeIn: 0.35, gain: 2.2, renderOrder: 4.7, tint: RT }),
        fxAdd(F, m, 'recall', { w: 2.1, bottom: true, y: -0.1, z: 0.25, loop: true, to: RF.loopN, fadeIn: 0.5, gain: 1.3, alpha: 0.55, fps: 15, tint: RT })];
      const tc = F.hero.frames.orbTint || 0xc8ff8a;
      F.orb = { core: glowSprite(0xffffff, 0.3), halo: glowSprite(tc, 0.8), ring: glowSprite(tc, 2.4), t: 0 };
      F.orb.core.renderOrder = 6.6; F.orb.halo.renderOrder = 6.5; F.orb.ring.renderOrder = 1.6; F.orb.ring.scale.set(2.6, 0.55, 1);
      m.userData.body.add(F.orb.core, F.orb.halo, F.orb.ring);
    }
  } else if (F.rec) {
    F.rec.forEach(x => x && x.stop()); F.rec = null;
    if (F.recT < 0.15 && RF) {   // 도착!
      const AT = F.hero.frames.arriveTint;
      fxAdd(F, m, 'recall', { w: 3.6, bottom: true, y: -0.15, z: 0.3, from: RF.loopN, fps: 10, fadeOut: 0.25, gain: 2.4, tint: F.hero.frames.recallTint });
      fxAdd(F, m, 'impact', { w: 4.2, y: 1.2, z: 0.4, fps: 26, tint: AT || 0xe8ffc0, gain: 1.6 });
      const fl = glowSprite(AT || 0xf4ffd8, 1); fl.renderOrder = 7.5; fl.position.set(0, 1.2, 0.5); m.add(fl); F.flash = { s: fl, t: 0 };
      const p = new THREE.Vector3(); m.getWorldPosition(p);
      burst(p.x, p.y + 1.1, p.z + .4, { n: 28, tex: T.star, color: F.hero.frames.partC || [0xd8ff9a, 0xffffff, 0xfff2a0], spd: 3.6, size: .4, life: .8, g: -1.2, spread: 1.4, spreadY: .8, add: true });
      burst(p.x, p.y + 0.2, p.z + .4, { n: 16, tex: T.glow, color: F.hero.frames.partC2 || [0xb8ff70, 0xffffff], spd: 2.2, size: .6, life: .6, g: -3, spread: 1.6, add: true });
    }
    if (F.orb) F.orb.fade = 1;
  }
  if (F.orb) {   // 구슬: 손 위치(프레임별 hand)에 붙고, 채널할수록 커지고 밝아짐 + 떨림/맥동
    const O = F.orb; O.t += dt; const hw = S.hand(A.frame, F.mirror) || [F.mirror ? -0.9 : 0.9, 1.2];
    if (O.fade != null) O.fade -= dt * 5;
    const k = F.recK || 0, a = Math.min(1, O.t / 0.4) * (O.fade != null ? Math.max(0, O.fade) : 1), pul = 1 + 0.12 * Math.sin(O.t * 22) + 0.06 * Math.random();
    const r = (0.3 + 0.95 * k) * pul;
    O.core.position.set(hw[0], hw[1], 0.12); O.halo.position.set(hw[0], hw[1], 0.1);
    O.core.scale.setScalar(r * 0.55); O.halo.scale.setScalar(r * 1.2); O.ring.position.set(0, 0.06, 0.05); O.ring.scale.set(2.2 + 1.4 * k, 0.45 + 0.25 * k, 1);
    O.core.material.opacity = a; O.halo.material.opacity = a * (0.6 + 0.4 * k); O.ring.material.opacity = a * (0.35 + 0.55 * k) * (0.85 + 0.15 * Math.sin(O.t * 9));
    if (Math.random() < dt * (6 + 30 * k) && a > 0.5) { const p = new THREE.Vector3(hw[0], hw[1], 0.15); m.userData.body.localToWorld(p);
      burst(p.x, p.y, p.z, { n: 1, tex: T.glow, color: F.hero.frames.partC2 || [0xd8ff9a, 0xffffff], spd: 0.6 + k, size: 0.12 + 0.12 * k, life: 0.5, g: -1.5, spread: 0.5, add: true }); }
    if (O.fade != null && O.fade <= 0) { [O.core, O.halo, O.ring].forEach(x => { x.parent && x.parent.remove(x); x.material.dispose(); }); F.orb = null; }
  }
  if (F.flash) { const L2 = F.flash; L2.t += dt; const q = L2.t / 0.45; L2.s.scale.setScalar(1.5 + 7 * Math.sqrt(q)); L2.s.material.opacity = Math.max(0, 1 - q) * 1.2;
    if (q >= 1) { L2.s.parent && L2.s.parent.remove(L2.s); L2.s.material.dispose(); F.flash = null; } }
  if (F.after) { F.after.t -= dt; if (F.after.t <= 0) { fxAdd(F, m, 'quake', { w: F.after.w, bottom: true, y: -0.4, z: 0.45, from: 3, fps: 16, alpha: 0.55, renderOrder: 4.6 }, true); F.after = null; } }
  for (let i = F.fx.length - 1; i >= 0; i--) if (!F.fx[i].update(dt)) F.fx.splice(i, 1);
  // 그리기
  const fr = A.frame; S.show(fr, F.mirror);
  S.setFlash(e.flash > 0 ? Math.min(.75, e.flash * .8) : 0);
  if (e.flash > 0.6) S.mesh.position.x += (Math.random() - .5) * 0.05;
  // 손 위치 → 게임 좌표 (올가미 줄 시작점, game.js handPos)
  const sc = m.userData.heroScale || 1, hw = S.hand(fr, F.mirror);
  if (hw) { e.handG = [hw[0] * sc / GSCALE, -hw[1] * sc / GSCALE]; e.handT = G ? G.t : 0; }
  // 캔버스 평면: 기절 별만 (필요할 때만 갱신)
  if (e.stun > 0 || F.canvasDirty) {
    const g = P.g, U = CH / 720; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, CW, CH); F.canvasDirty = false;
    if (e.stun > 0) { F.canvasDirty = true; g.save(); g.translate(CW / 2, (PGY - 400) * U); for (let i = 0; i < 3; i++) { const a = performance.now() / 200 + i * 2.1; g.fillStyle = '#ffe066'; g.beginPath(); g.arc(Math.cos(a) * 40 * U, Math.sin(a) * 10 * U, 9 * U, 0, TAU); g.fill(); } g.restore(); }
    P.tex.needsUpdate = true; m.userData.plane.visible = e.stun > 0;
  }
  levelScaleAura(m, e, dt);
}
function frameDeath(m, e, D, dt) {
  const F = m.userData.frames, S = F.S, t = D.t, dir = D.dir, sc = m.userData.heroScale || 1;
  if (!D.started) { D.started = true; [F.honey, F.pil].forEach(x => { if (x) { x.g.parent && x.g.parent.remove(x.g); x.g.material.dispose(); } }); F.honey = F.pil = null; S.setTint(0xffffff, 0); F.A.play('death'); F.one = 'death'; F.mirror = (e.face || F.face) < 0; F.rec && F.rec.forEach(x => x && x.stop()); F.rec = null; if (F.orb) { [F.orb.core, F.orb.halo, F.orb.ring].forEach(x => { x.parent && x.parent.remove(x); x.material.dispose(); }); F.orb = null; } }
  F.A.update(dt); S.show(F.A.frame, F.mirror);
  // 맞은 방향으로 살짝 밀려남 + 작은 튀어오름 (프레임이 넘어지는 동작을 보여줌)
  const air = .45, ta = Math.min(t, air), kx = 1 - Math.pow(1 - ta / air, 2);
  m.position.x = D.x0 + dir * 0.7 * kx * sc; m.position.y = D.y0 + (t < air ? 0.35 * Math.sin(Math.PI * ta / air) : 0);
  S.setFlash(t < .18 ? 1 - t / .18 : 0);
  for (let i = F.fx.length - 1; i >= 0; i--) if (!F.fx[i].update(dt)) F.fx.splice(i, 1);
  const fadeS = 1.55, k = Math.max(0, (t - fadeS) / .5);
  S.setOpacity(1 - k); m.userData.plane.visible = false;
  if (m.userData.ring) m.userData.ring.material.opacity = Math.max(0, 1 - t * 2);
  if (t >= fadeS && !D.poof) {
    D.poof = true; const p = new THREE.Vector3(); S.mesh.getWorldPosition(p); p.x = m.position.x; p.y = m.position.y + 1.1; const tc = F.hero && m.userData.puppet.team ? [0xff5a3a, 0xffd0c0, 0xffffff] : [0x4aa8ff, 0xc8e8ff, 0xffffff];
    burst(p.x, p.y - .3, p.z + .3, { n: 26, tex: T.star, color: tc, spd: 3.2, size: .42, life: .8, g: -1.5, spread: 1.6, spreadY: .4, add: true });
    burst(p.x, p.y - .3, p.z + .3, { n: 18, tex: T.glow, color: tc, spd: 1.8, size: .55, life: .7, g: -2, spread: 1.4, add: true });
  }
  m.visible = t < DEATH_LEN;
}
