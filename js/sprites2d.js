// 2D 페인팅 스프라이트 패널 키트 (미니언·타워·기지·드래곤 공용)
// - 이미지는 한 번만 텍스처로 올리고(캐시), 움직임은 메시 변환(위치/크기/회전)으로만 → 매 프레임 다시 그리지 않음
// - 피격 플래시: 미리 만든 흰색 실루엣 텍스처를 겹쳐 투명도만 조절
import * as THREE from '../vendor/three.module.js';

const TEX = {}, WHITE = {}, SIZE = {};
const loader = new THREE.TextureLoader();
function prep(t) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2; return t; }
function whiteOf(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  return prep(new THREE.CanvasTexture(c));
}
export function loadSprites(paths) {
  return Promise.all(paths.map(p => TEX[p] ? null : loader.loadAsync(p).then(t => { TEX[p] = prep(t); SIZE[p] = [t.image.width, t.image.height]; })
    .catch(() => console.warn('sprite fail', p))));
}
export const aspect = p => SIZE[p] ? SIZE[p][0] / SIZE[p][1] : 1;

// 둥근 그라디언트/별 등 작은 공용 텍스처
function canvasTex(sz, draw) { const c = document.createElement('canvas'); c.width = c.height = sz; draw(c.getContext('2d'), sz); return prep(new THREE.CanvasTexture(c)); }
export const T = {
  get glow() { return this._g || (this._g = canvasTex(64, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); })); },
  get shadow() { return this._s || (this._s = canvasTex(64, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(20,40,10,.55)'); r.addColorStop(.6, 'rgba(20,40,10,.3)'); r.addColorStop(1, 'rgba(20,40,10,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); })); },
  get star() { return this._st || (this._st = canvasTex(64, (g, s) => { g.translate(s / 2, s / 2); g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * .1 : s * .48; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); })); },
  get dot() { return this._d || (this._d = canvasTex(32, (g, s) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(s / 2, s / 2, s * .45, 0, 7); g.fill(); })); },
  ring(col) { const k = 'r' + col; return this[k] || (this[k] = canvasTex(128, (g, s) => { g.translate(s / 2, s / 2); g.fillStyle = `rgba(${col},.35)`; g.strokeStyle = `rgba(${col},1)`; g.lineWidth = s * .09; g.beginPath(); g.arc(0, 0, s * .4, 0, 7); g.fill(); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = s * .025; g.beginPath(); g.arc(0, 0, s * .4, 0, 7); g.stroke(); })); },
};
export const TEAM_RGB = ['60,150,255', '255,70,70'];
export const TEAM_HEX = [0x3c96ff, 0xff4646];

// 패널: root(지면 위치) > pivot(발 기준, 스쿼시/회전) > [그림, 흰 실루엣]
export function makePanel(path, height, opts = {}) {
  const w = height * aspect(path);
  const root = new THREE.Group(), pivot = new THREE.Group(); root.add(pivot);
  const geo = new THREE.PlaneGeometry(w, height); geo.translate(0, height / 2 - (opts.sink || 0) * height, 0);
  const mat = new THREE.MeshBasicMaterial({ toneMapped: false, map: TEX[path], transparent: true, depthWrite: false, alphaTest: 0.03 });
  const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = opts.order || 2; pivot.add(mesh);
  if (!WHITE[path] && TEX[path]) WHITE[path] = whiteOf(TEX[path].image);
  const fmat = new THREE.MeshBasicMaterial({ toneMapped: false, map: WHITE[path], transparent: true, depthWrite: false, opacity: 0 });
  const fl = new THREE.Mesh(geo, fmat); fl.renderOrder = (opts.order || 2) + 0.1; fl.visible = false; pivot.add(fl);
  if (opts.shadow !== false) { const s = groundDecal(T.shadow, w * (opts.shadowW || .8), 0.6); s.material.opacity = .8; root.add(s); root.userData.shadow = s; }
  root.userData.panel = { pivot, mesh, fl, mat, fmat, path, w, h: height };
  return root;
}
export function setPanelImage(root, path) {
  const P = root.userData.panel; if (P.path === path) return; P.path = path;
  P.mat.map = TEX[path]; if (!WHITE[path]) WHITE[path] = whiteOf(TEX[path].image); P.fmat.map = WHITE[path]; P.mat.needsUpdate = P.fmat.needsUpdate = true;
}
export function groundDecal(tex, w, d, color) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false, map: tex, transparent: true, depthWrite: false, depthTest: false, color: color ?? 0xffffff }));
  m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.position.y = 0.06; m.renderOrder = 1; return m;
}
export function setFlash(root, f, alpha = 1) {
  const P = root.userData.panel; f = Math.max(0, Math.min(1, f));
  P.fl.visible = f > 0.01; P.fmat.opacity = f * 0.85 * alpha; P.mat.opacity = alpha;
}
export function glowSprite(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ toneMapped: false, map: T.glow, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1); s.renderOrder = 1.5; return s;
}

// ---------- 가벼운 파티클 (풀링) ----------
const FXG = new THREE.Group(); const POOL = []; const LIVE = [];
export function fxGroup() { return FXG; }
export function burst(x, y, z, o = {}) {
  const n = o.n || 10;
  for (let i = 0; i < n; i++) {
    let s = POOL.pop();
    if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ toneMapped: false, transparent: true, depthWrite: false })); s.renderOrder = 8; }
    const m = s.material; m.map = o.tex || T.dot; m.color.set(Array.isArray(o.color) ? o.color[i % o.color.length] : (o.color ?? 0xffffff));
    m.blending = o.add ? THREE.AdditiveBlending : THREE.NormalBlending; m.needsUpdate = true;
    const a = Math.random() * Math.PI * 2, sp = (o.spd || 3) * (.4 + Math.random() * .6);
    s.userData = { vx: Math.cos(a) * sp * (o.sx ?? 1), vy: Math.abs(Math.sin(a)) * sp * (o.up ?? 1) + (o.vy0 || 0), vz: (Math.random() - .5) * .5,
      g: o.g ?? 9, t: 0, life: (o.life || .6) * (.7 + Math.random() * .5), sz: (o.size || .18) * (.6 + Math.random() * .7), rot: (Math.random() - .5) * 8 };
    s.position.set(x + (Math.random() - .5) * (o.spread || 0), y + Math.random() * (o.spreadY || 0), z);
    FXG.add(s); LIVE.push(s);
  }
}
export function tickFx(dt) {
  for (let i = LIVE.length - 1; i >= 0; i--) {
    const s = LIVE[i], u = s.userData; u.t += dt;
    if (u.t >= u.life) { FXG.remove(s); LIVE.splice(i, 1); POOL.push(s); continue; }
    u.vy -= u.g * dt; s.position.x += u.vx * dt; s.position.y = Math.max(0.02, s.position.y + u.vy * dt); s.position.z += u.vz * dt;
    const k = u.t / u.life; s.material.opacity = 1 - k * k; s.material.rotation += u.rot * dt; s.scale.setScalar(u.sz * (1 - k * .5));
  }
}
export { THREE };
