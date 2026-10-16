// 부위 리그 2D 패널 (미니언·드래곤): 그림 한 장을 몇 개 부위로 잘라(atlas.png + rig.json, minions/rig_cut.py)
// 메시 하나에 부위별 사각 격자를 넣고 매 프레임 꼭짓점만 다시 계산 → 텍스처 재업로드 없음, 그리기 1회(+피격 시 흰 실루엣 1회)
// 좌표: 원본 그림 픽셀(x 오른쪽, y 아래) → 내부 계산은 y 위쪽, 발 중앙(W/2, H)이 원점
import { THREE, loadSprites, texOf, groundDecal, T } from './sprites2d.js';

const RIGS = {};
const NORIG = typeof location !== 'undefined' && new URLSearchParams(location.search).get('rig') === '0';
export const rigOf = dir => NORIG ? null : RIGS[dir];
export function loadRigs(dirs) {
  if (NORIG) return Promise.resolve();
  return Promise.all(dirs.map(d => RIGS[d] ? null : fetch(d + '/rig.json').then(r => { if (!r.ok) throw 0; return r.json(); })
    .then(j => loadSprites([d + '/atlas.png']).then(() => { if (texOf(d + '/atlas.png')) { j.dir = d; RIGS[d] = j; } }))
    .catch(() => console.warn('rig fail (그림 한 장으로 표시)', d))));
}

export function makeRigPanel(rig, height, opts = {}) {
  const s = height / rig.h, W = rig.w, H = rig.h, sink = (opts.sink || 0) * height;
  const root = new THREE.Group(), pivot = new THREE.Group(); root.add(pivot);
  const parts = [], byName = {};
  let nv = 0, ni = 0;
  for (const p of rig.parts) { const [c, r] = p.grid; nv += (c + 1) * (r + 1); ni += c * r * 6; }
  const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
  const src = new Float32Array(nv * 2), gv = new Float32Array(nv); // 원본 좌표(y 위), 격자 세로 위치(0=위,1=아래)
  let v = 0, ii = 0;
  for (const p of rig.parts) {
    const [c, r] = p.grid, [ax, ay, aw, ah] = p.rect, [ox, oy] = p.at, v0 = v;
    for (let j = 0; j <= r; j++) for (let i = 0; i <= c; i++) {
      const fx = i / c, fy = j / r;
      src[v * 2] = ox + fx * aw - W / 2; src[v * 2 + 1] = H - (oy + fy * ah); gv[v] = fy;
      uv[v * 2] = (ax + fx * aw) / rig.aw; uv[v * 2 + 1] = 1 - (ay + fy * ah) / rig.ah; v++;
    }
    for (let j = 0; j < r; j++) for (let i = 0; i < c; i++) {
      const a = v0 + j * (c + 1) + i, b = a + 1, d = a + c + 1, e = d + 1;
      idx[ii++] = a; idx[ii++] = d; idx[ii++] = b; idx[ii++] = b; idx[ii++] = d; idx[ii++] = e;
    }
    const P = { def: p, v0, v1: v, px: p.pivot[0] - W / 2, py: H - p.pivot[1], tip: p.tip && [p.tip[0] - W / 2, H - p.tip[1]], seed: Math.random() * 6,
      top: H - p.at[1], bot: H - p.at[1] - p.rect[3], left: p.at[0] - W / 2, right: p.at[0] + p.rect[2] - W / 2 };
    parts.push(P); byName[p.name] = P;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, height / 2, 0), Math.max(W, H) * s * 0.9);
  const tp = rig.dir + '/atlas.png';
  const mat = new THREE.MeshBasicMaterial({ toneMapped: false, map: texOf(tp), transparent: true, depthWrite: false, alphaTest: 0.03 });
  const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = opts.order || 2; pivot.add(mesh);
  // 피격 번쩍임: 따로 흰 메시를 겹치지 않고 같은 메시 셰이더에서 흰색으로 섞음 (재질은 개체마다 따로, 프로그램은 공유)
  const uFlash = { value: 0 };
  mat.onBeforeCompile = sh => { sh.uniforms.uFlash = uFlash; sh.fragmentShader = 'uniform float uFlash;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight = mix(outgoingLight, vec3(1.0), uFlash);\n#include <opaque_fragment>'); };
  mat.customProgramCacheKey = () => 'rig2dflash';
  const fl = null, fmat = null;
  const w = W * s;
  if (opts.shadow !== false) { const sh = groundDecal(T.shadow, w * (opts.shadowW || .8), 0.6); sh.material.opacity = .8; root.add(sh); root.userData.shadow = sh; }
  const R = { rig, parts, byName, pos, src, gv, s, sink, W, H, geo, M: {} };
  root.userData.panel = { pivot, mesh, fl, mat, fmat, w, h: height, R, uFlash };
  poseRig(root, {});
  return root;
}

// 부위 변환: 피벗 기준 회전 r(반시계 +), 크기 sx/sy, 이동 dx/dy(원본 px). 몸통(body)은 발 중앙 기준 + 모든 부위에 적용
function mk(P, q, out) {
  const r = q.r || 0, c = Math.cos(r), sn = Math.sin(r), sx = q.sx ?? 1, sy = q.sy ?? 1;
  const px = q.px ?? P.px, py = q.py ?? P.py;
  // v' = p + R*S*(v-p) + d  → [a b; c d] , e f
  out.a = c * sx; out.b = -sn * sy; out.c = sn * sx; out.d = c * sy;
  out.e = px - out.a * px - out.b * py + (q.dx || 0); out.f = py - out.c * px - out.d * py + (q.dy || 0);
  return out;
}
function mul(A, B, o) { // A∘B
  const a = A.a * B.a + A.b * B.c, b = A.a * B.b + A.b * B.d, c = A.c * B.a + A.d * B.c, d = A.c * B.b + A.d * B.d;
  o.e = A.a * B.e + A.b * B.f + A.e; o.f = A.c * B.e + A.d * B.f + A.f; o.a = a; o.b = b; o.c = c; o.d = d; return o;
}
const I0 = {};
// pose: { body:{r,dx,dy,sx,sy}, <부위이름>:{...,bend,wob}, t }
export function poseRig(root, pose) {
  const R = root.userData.panel.R, { parts, pos, src, gv, s, sink, M } = R, t = pose.t || 0;
  const bodyQ = pose.body || I0, B = mk({ px: 0, py: 0 }, bodyQ, M.__B || (M.__B = {}));
  for (const P of parts) {
    const n = P.def.name, q = n === 'body' ? I0 : (pose[n] || I0);
    let A = mk(P, q, M[n] || (M[n] = {}));
    if (P.def.parent) { const pp = parts.find(x => x.def.name === P.def.parent); const Q = mk(pp, pose[P.def.parent] || I0, M._p || (M._p = {})); A = mul(Q, A, M[n + '_'] || (M[n + '_'] = {})); }
    A = n === 'body' ? B : mul(B, A, M[n + '_b'] || (M[n + '_b'] = {}));
    P.M = A;
    const wob = q.wob || (n === 'body' ? pose.bodyWob : 0) || 0, jig = q.jig || (n === 'body' ? pose.bodyJig : 0) || 0, bend = q.bend || 0;
    const hgt = Math.max(1, P.top - P.bot), wid = Math.max(1, P.right - P.left);
    for (let k = P.v0; k < P.v1; k++) {
      let x = src[k * 2], y = src[k * 2 + 1];
      if (wob) { const w = (1 - gv[k]) * (1 - gv[k]); x += wob * w * Math.sin(t * 9 + y * 0.045 + P.seed) + wob * .4 * w * Math.sin(t * 15.3 + y * .11); }
      if (jig) { const w = 1 - gv[k]; x += (x - (P.left + P.right) / 2) * jig * w; y += (y - P.bot) * -jig * 0.6 * w; }
      if (bend) { // 꼬리: 피벗에서 멀수록 더 많이 굽음
        const d = Math.max(0, (P.px - x) / wid), a = bend * d * d, c = Math.cos(a), sn = Math.sin(a), rx = x - P.px, ry = y - P.py;
        x = P.px + c * rx - sn * ry; y = P.py + sn * rx + c * ry;
      }
      const X = A.a * x + A.b * y + A.e, Y = A.c * x + A.d * y + A.f;
      pos[k * 3] = X * s; pos[k * 3 + 1] = Y * s - sink; pos[k * 3 + 2] = 0;
    }
  }
  R.geo.attributes.position.needsUpdate = true;
}
// 부위의 끝점(tip) 위치 → 패널(pivot 그룹) 좌표
export function rigTip(root, name, out) {
  const R = root.userData.panel.R, P = R.byName[name]; if (!P || !P.tip || !P.M) return null;
  const [x, y] = P.tip, A = P.M; out.set((A.a * x + A.b * y + A.e) * R.s, (A.c * x + A.d * y + A.f) * R.s - R.sink, 0.01); return out;
}
