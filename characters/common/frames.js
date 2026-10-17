// 프레임(스프라이트) 애니메이션 공용 엔진 — AI 영상에서 뽑은 프레임 아틀라스(WebP+JSON)를 Three.js 평면으로 재생
//  · loadFrameSet(url): JSON + 아틀라스 텍스처 로드 (캐시)
//  · FrameAnim: 동작 재생기 (fps, loop, pingpong, loopFrom, key 프레임 콜백, 재생 속도)
//  · makeFrameSprite(set, worldH): 아틀라스 UV 를 바꿔 끼우는 평면 메쉬 (좌우 반전, 피격 번쩍임, 투명도)
//  · loadFxSheet / FxPlayer: 검은 배경 영상 이펙트(휘도 알파) 시트를 가산 블렌딩 평면으로 재생
// JSON 형식(characters/<hero>/frames/<hero>.json): {box:[w,h], anchor:[ax,ay], atlases:[{file,w,h}], actions:{name:{fps,loop,key?,loopFrom?,pingpong?,loopFps?,air?,land?,frames:[{r:[atlas,x,y,w,h], o:[ox,oy], hand?:[hx,hy]}]}}}
//  o = 공통 크롭 박스 안에서 잘린 프레임의 위치, anchor = 발 기준선/몸 중심 (모든 동작 공통이라 동작이 바뀌어도 캐릭터가 튀지 않음)
//  hand = 앵커 기준 손 위치(px, 오른쪽을 볼 때) — 올가미 줄을 코드로 그릴 때 시작점
import * as THREE from '../../vendor/three.module.js';
const CACHE = {};
const texLoader = () => new THREE.TextureLoader();
function loadTex(url) {
  return new Promise(res => texLoader().load(url, t => { t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.flipY = false; res(t); }, undefined, () => res(null)));
}
export function loadFrameSet(url) {
  if (CACHE[url]) return CACHE[url];
  const base = url.slice(0, url.lastIndexOf('/') + 1);
  return CACHE[url] = fetch(url).then(r => r.json()).then(async J => {
    J.tex = await Promise.all(J.atlases.map(a => loadTex(base + a.file)));
    if (J.tex.some(t => !t)) throw new Error('frame atlas load failed: ' + url);
    return J;
  });
}
// ---- 재생기 ----
// 루프: frames[loopFrom..] 반복 (pingpong 이면 왕복). key: 이 프레임에 들어서는 순간 onKey 호출 (타격/발사 동기화)
export class FrameAnim {
  constructor(set) { this.set = set; this.name = null; this.t = 0; this.rate = 1; this.idx = 0; this.done = false; this.keyFired = false; this.onKey = null; this.hold = 0; }
  play(name, o = {}) {
    const A = this.set.actions[name]; if (!A) return false;
    this.name = name; this.A = A; this.t = o.t0 || 0; this.rate = o.rate || 1; this.done = false; this.keyFired = false;
    this.onKey = o.onKey || null; this.onEnd = o.onEnd || null; this.hold = o.hold || 0; this.fpsMul = 1; this.idx = 0; this.frameAt(); return true;
  }
  is(name) { return this.name === name; }
  // 지금 동작에서 key 프레임까지 걸리는 시간(초, rate=1 기준)
  keyTime(name) { const A = this.set.actions[name]; return A && A.key != null ? A.key / A.fps : 0; }
  dur(name) { const A = this.set.actions[name || this.name]; return A ? A.frames.length / A.fps : 0; }
  frameAt() {
    const A = this.A, n = A.frames.length; let f = Math.floor(this.t * A.fps);
    if (A.loop) {
      const L0 = A.loopFrom || 0;
      // loopFps: 루프 구간만 다른 속도로 (예: 귀환 인트로는 빠르게, 숨쉬기 루프는 느리게)
      if (f >= L0) { const m = n - L0, d = A.loopFps ? Math.floor((this.t - L0 / A.fps) * A.loopFps) : f - L0; if (A.pingpong && m > 1) { const p = 2 * m - 2, q = d % p; f = L0 + (q < m ? q : p - q); } else f = L0 + d % m; }
    } else if (f >= n) f = n - 1;
    this.idx = f; return f;
  }
  update(dt) {
    if (!this.A) return;
    const A = this.A; this.t += dt * this.rate * (this.fpsMul || 1);
    const f = this.frameAt();
    if (!this.keyFired && A.key != null && f >= A.key) { this.keyFired = true; if (this.onKey) this.onKey(this); }
    if (!A.loop && !this.done && this.t >= A.frames.length / A.fps + this.hold) { this.done = true; if (this.onEnd) this.onEnd(this); }
  }
  get frame() { return this.A ? this.A.frames[this.idx] : null; }
}
// ---- 스프라이트 메쉬 ----
const VS = `varying vec2 vUv; uniform vec4 uvRect; void main(){ vUv = uvRect.xy + uv * uvRect.zw; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const FS = `varying vec2 vUv; uniform sampler2D map; uniform float flash; uniform float opacity; uniform vec3 tint; uniform float tintK;
void main(){ vec4 c = texture2D(map, vUv); if (c.a < 0.02) discard; vec3 col = mix(c.rgb, tint, tintK); col = mix(col, vec3(1.0), flash); gl_FragColor = vec4(col, c.a * opacity); }`;
export function makeFrameSprite(set, worldH) {
  // worldH: 크롭 박스 높이 → 월드 높이 비율로 px→월드 변환 (k)
  const k = worldH / set.box[1];
  const mats = set.tex.map(t => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { map: { value: t }, uvRect: { value: new THREE.Vector4(0, 0, 1, 1) }, flash: { value: 0 }, opacity: { value: 1 }, tint: { value: new THREE.Color(1, 1, 1) }, tintK: { value: 0 } } }));
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0.5, 0.5, 0);   // 왼쪽 아래 기준
  // three 의 uv(0,0)=왼쪽 아래. 텍스처 flipY=false 이므로 v=0 이 이미지 위쪽 → uv.y 뒤집어 사용
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const mesh = new THREE.Mesh(geo, mats[0]); mesh.renderOrder = 5;
  const S = { mesh, mats, set, k, face: 1 };
  S.show = (fr, mirror) => {
    if (!fr) return; const [ai, x, y, w, h] = fr.r, A = set.atlases[ai], m = mats[ai];
    if (mesh.material !== m) { m.uniforms.flash.value = mesh.material.uniforms.flash.value; m.uniforms.opacity.value = mesh.material.uniforms.opacity.value; m.uniforms.tintK.value = mesh.material.uniforms.tintK.value; mesh.material = m; }
    m.uniforms.uvRect.value.set(x / A.w, y / A.h, w / A.w, h / A.h);
    // 화면 위치: 앵커(발 기준선 · 몸 중심)가 메쉬 원점
    const ax = set.anchor[0], ay = set.anchor[1], left = (fr.o[0] - ax) * k, bottom = (ay - fr.o[1] - h) * k;
    if (!mirror) { mesh.position.x = left; mesh.scale.x = w * k; } else { mesh.position.x = -left; mesh.scale.x = -w * k; }
    mesh.position.y = bottom; mesh.scale.y = h * k;
  };
  S.setFlash = v => { mesh.material.uniforms.flash.value = v; };
  S.setOpacity = v => { mats.forEach(m => m.uniforms.opacity.value = v); };
  S.setTint = (c, a) => { mats.forEach(m => { m.uniforms.tint.value.set(c); m.uniforms.tintK.value = a; }); };
  // 손 위치(월드, 메쉬 원점 기준)
  S.hand = (fr, mirror) => fr && fr.hand ? [fr.hand[0] * k * (mirror ? -1 : 1), -fr.hand[1] * k] : null;
  return S;
}
// ---- 영상 이펙트 시트 ----
// fx.json: {name:{file,w,h,cols,n,fps,loop,loopN?}} — 검은 배경 영상을 휘도 알파(RGB=색/밝기, A=밝기)로 저장한 시트
const FXC = {};
export function loadFxSheets(url) {
  if (FXC[url]) return FXC[url];
  const base = url.slice(0, url.lastIndexOf('/') + 1);
  return FXC[url] = fetch(url).then(r => r.json()).then(async J => { for (const k in J) { J[k].tex = await loadTex(base + J[k].file); if (!J[k].tex) throw new Error('fx load failed ' + k); } return J; });
}
const FXFS = `varying vec2 vUv; uniform sampler2D map; uniform float opacity; uniform vec3 tint; void main(){ vec4 c = texture2D(map, vUv); gl_FragColor = vec4(c.rgb * tint * c.a * opacity, 1.0); }`;
// 가산 블렌딩 이펙트 하나: play(sheet,{w:월드너비, x,y, loop, frames:[a,b], fps, life}) → 매 프레임 update(dt) (끝나면 false)
export function makeFx(sheet, o = {}) {
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FXFS, transparent: true, depthWrite: false, depthTest: o.depthTest !== false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { map: { value: sheet.tex }, uvRect: { value: new THREE.Vector4(0, 0, 1, 1) }, opacity: { value: 1 }, tint: { value: new THREE.Color(o.tint || 0xffffff) } } });
  if (o.gain) mat.uniforms.tint.value.multiplyScalar(o.gain);   // 밝기 증폭 (가산이라 1보다 크면 더 환하게)
  const geo = new THREE.PlaneGeometry(1, 1); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const w = o.w || 2, h = w * sheet.h / sheet.w;
  geo.translate(0, o.bottom ? 0.5 : 0, 0);
  const mesh = new THREE.Mesh(geo, mat); mesh.scale.set(w * (o.mirror ? -1 : 1), h, 1); mesh.renderOrder = o.renderOrder || 7;
  const W = sheet.cols * sheet.w, H = Math.ceil(sheet.n / sheet.cols) * sheet.h;
  const F = { mesh, t: 0, fps: o.fps || sheet.fps, from: o.from || 0, to: o.to != null ? o.to : sheet.n, loop: !!o.loop, life: o.life || 0, fadeIn: o.fadeIn || 0, fadeOut: o.fadeOut != null ? o.fadeOut : 0.25, alpha: o.alpha != null ? o.alpha : 1, dead: false, stopT: null };
  const setF = i => { const cx = i % sheet.cols, cyy = Math.floor(i / sheet.cols); mat.uniforms.uvRect.value.set(cx * sheet.w / W, cyy * sheet.h / H, sheet.w / W, sheet.h / H); };
  setF(F.from);
  F.stop = () => { if (F.stopT == null) F.stopT = F.t; };
  F.update = dt => {
    F.t += dt; const n = F.to - F.from; let i = Math.floor(F.t * F.fps), a = F.alpha;
    if (F.loop) { i = F.from + i % n; if (F.life && F.t > F.life) F.stop(); }
    else { if (i >= n) { F.dead = true; } i = F.from + Math.min(n - 1, i); const end = n / F.fps; if (F.fadeOut) a *= Math.min(1, Math.max(0, (end - F.t) / F.fadeOut)); }
    if (F.fadeIn) a *= Math.min(1, F.t / F.fadeIn);
    if (F.stopT != null) { const q = (F.t - F.stopT) / 0.3; a *= Math.max(0, 1 - q); if (q >= 1) F.dead = true; }
    setF(i); mat.uniforms.opacity.value = a; mesh.visible = !F.dead;
    if (F.dead) { mesh.parent && mesh.parent.remove(mesh); geo.dispose(); mat.dispose(); }
    return !F.dead;
  };
  return F;
}
