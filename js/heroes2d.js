// 게임 ↔ characters/ 연결 어댑터
// 각 영웅을 오프스크린 캔버스에 2D 퍼펫으로 그리고, Three.js 평면(CanvasTexture)으로 3D 월드에 배치한다.
import * as THREE from '../vendor/three.module.js';
import { HEROES, GAME_KEY, loadHeroes, newChar, setMode, update, renderChar, drawChar, getPose,
  setTarget, setWorld, setShake, tickFX, drawFX, FX, SIMQ, tickSim, TAU } from '../characters/index.js';

export const heroesReady = loadHeroes();

const CW = 384, CH = 384;          // 영웅 하나당 텍스처 해상도
const PCS = 1.0, PGY = 640;          // 퍼펫 공간: 720단위 높이, 지면 y=640
export const PLANE = 4.6;            // 월드 단위 평면 크기 (뭉치 키 ≈ 2.4)
const TEAM_COL = ['79,179,255', '255,90,90'];

export function makePuppetHero(gameKey, team) {
  const hero = HEROES[GAME_KEY[gameKey] || gameKey];
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, alphaTest: 0.02, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(PLANE, PLANE), mat);
  plane.position.y = PLANE * (0.5 - (720 - PGY) / 720); // 퍼펫 지면 = 그룹 원점
  plane.renderOrder = 5;
  const grp = new THREE.Group(); grp.add(plane);
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
  // 팀 색 표시: 발밑 링
  g.save(); g.translate(CW / 2, PGY * U);
  g.fillStyle = `rgba(${TEAM_COL[P.team] || TEAM_COL[0]},.28)`; g.strokeStyle = `rgba(${TEAM_COL[P.team] || TEAM_COL[0]},.95)`;
  g.lineWidth = 5 * U; g.beginPath(); g.ellipse(0, 0, 95 * U, 24 * U, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
  drawFX('back'); renderChar(ch); drawFX('front');
  // 피격 플래시
  if (e.flash > 0) { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(255,255,255,${Math.min(.8, e.flash * .8)})`; g.fillRect(0, 0, CW, CH); g.restore(); }
  if (e.stun > 0) { g.save(); g.translate(CW / 2, (PGY - 400) * U); for (let i = 0; i < 3; i++) { const a = performance.now() / 200 + i * 2.1; g.fillStyle = '#ffe066'; g.beginPath(); g.arc(Math.cos(a) * 40 * U, Math.sin(a) * 10 * U, 9 * U, 0, TAU); g.fill(); } g.restore(); }
  swap(FX, P.fx); swap(SIMQ, P.simq);
  setShake(0);
  P.tex.needsUpdate = true;
}
function swap(a, b) { const t = a.splice(0); a.push(...b); b.length = 0; b.push(...t); }
