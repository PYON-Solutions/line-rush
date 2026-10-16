// 게임 ↔ characters/ 연결 어댑터
// 각 영웅을 오프스크린 캔버스에 2D 퍼펫으로 그리고, Three.js 평면(CanvasTexture)으로 3D 월드에 배치한다.
import * as THREE from '../vendor/three.module.js';
import { groundDecal, glowSprite, burst, T, TEAM_RGB } from './sprites2d.js';
import { HEROES, GAME_KEY, loadHeroes, newChar, setMode, update, renderChar, drawChar, getPose,
  setTarget, setWorld, setShake, tickFX, drawFX, FX, SIMQ, tickSim, TAU } from '../characters/index.js';

export const heroesReady = loadHeroes();

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
  const grp = new THREE.Group(); const body = new THREE.Group(); body.add(plane); grp.add(body); grp.userData.body = body;
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
  // 영웅마다 독립된 이펙트 리스트
  grp.userData.puppet = { ch, cv, g, tex, team, fx: [], simq: [], seq: 0, gameKey };
  return grp;
}

// 게임 엔티티 상태 → 퍼펫 상태 (e: 게임 hero 엔티티, 또는 메뉴용 가짜 상태)
export function updatePuppet(m, e, dt) {
  const P = m.userData.puppet; if (!P) return;
  const ch = P.ch; dt = Math.min(0.05, dt || 0.016);
  ch.face = e.face < 0 ? -1 : 1;
  // 실제 공격/스킬 이벤트
  if ((e.animSeq || 0) !== P.seq) {
    P.seq = e.animSeq || 0;
    let a = e.animAct;
    if (a === 'basic' && ch.hero.acts.basic3) { ch.combo = (ch.combo || 0) % 3 + 1; if (ch.combo === 3) a = 'basic3'; }
    if (ch.hero.acts[a]) setMode(ch, a);
  }
  const moving = Math.abs(e.vx || 0) > 10 && e.ground !== false;
  const want = e.ground === false ? 'jump' : moving ? 'run' : 'idle';
  if (!ch.act && ch.mode !== want) setMode(ch, want);
  if (ch.mode === 'jump') { ch.jumpT = 1; ch.landT = -1; ch.vy = (e.vy || 0) * 1.6; }
  // 이펙트/시뮬레이션 큐를 이 영웅 것으로 교체
  swap(FX, P.fx); swap(SIMQ, P.simq);
  setTarget(P.g, CW, CH); setWorld({ CS: PCS, GY: PGY, camX: 0, GAME: true });
  tickFX(dt); update(ch, dt);
  ch.x = 0; ch.y = 0; ch.trail.length = 0;
  if (P.gameKey === 'bear' || ch.hero.key === 'mungchi') { if (e.shield > 0) { ch.shield = Math.min(1, e.shield * 3); ch.glow = null; } else if (!ch.act || ch.actName !== 'skill2') ch.shield = 0; }
  // 그리기
  const g = P.g, U = CH / 720;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, CW, CH);
  if (e.flash > 0.6) g.translate((Math.random() - .5) * 6, 0);
  drawFX('back'); renderChar(ch); drawFX('front');
  // 피격 플래시
  if (e.flash > 0) { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(255,255,255,${Math.min(.8, e.flash * .8)})`; g.fillRect(0, 0, CW, CH); g.restore(); }
  if (e.stun > 0) { g.save(); g.translate(CW / 2, (PGY - 400) * U); for (let i = 0; i < 3; i++) { const a = performance.now() / 200 + i * 2.1; g.fillStyle = '#ffe066'; g.beginPath(); g.arc(Math.cos(a) * 40 * U, Math.sin(a) * 10 * U, 9 * U, 0, TAU); g.fill(); } g.restore(); }
  swap(FX, P.fx); swap(SIMQ, P.simq);
  setShake(0);
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
  P.tex.needsUpdate = true;
}
function swap(a, b) { const t = a.splice(0); a.push(...b); b.length = 0; b.push(...t); }
