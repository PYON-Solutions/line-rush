'use strict';
// ===== 로비(타이틀) · 영웅 선택 화면 =====
// game.js 다음에 불러와서 drawTitle / drawSelect 를 바꿔 끼운다 (게임 로직은 그대로).
// 화면 좌표는 game.js 와 같은 논리 단위 (높이 450, 가로 VW ≈ 800~1000).
// 오른쪽 아래 (VW-230 ~ VW, 높이 390~450) 는 버전 표시·새로고침 버튼 자리 — 다른 UI를 두지 않는다.
(function () {
  const F = (s, w = 800) => `${w} ${s}px "Apple SD Gothic Neo","Noto Sans KR","Noto Sans CJK KR","Malgun Gothic",sans-serif`;
  const L = { press: null, last: null, fade: 0, settings: false, act: 0, actT: 0, bars: {}, mapSlide: 0 };
  window.LOBBY = L;
  const ACTS = ['basic', 'skill1', 'skill2', 'ult'];
  const HKEYS = () => Object.keys(HEROES);

  // ---------- 효과음 / 눌림 ----------
  function uiSfx(kind = 'tap') {
    if (muted) return; audioInit(); if (!AC || AC.state !== 'running') return;
    try {
      if (kind === 'tap') { tone(880, 1320, 0.06, 'triangle', 0.06); tone(1760, 1760, 0.04, 'sine', 0.03, 0.04); }
      else if (kind === 'play') { [523, 784, 1046].forEach((f, i) => tone(f, f * 1.01, 0.14, 'triangle', 0.07, i * 0.06)); noise(0.25, 0.08, 3000); }
      else if (kind === 'swap') { tone(520, 780, 0.08, 'sine', 0.06); }
    } catch (e) {}
  }
  function pressed(id) { return L.press && L.press.id === id && T - L.press.t < 0.16; }
  function hit(id, r, fn, kind) { uiRects.push({ r, fn: () => { if (L.press && T - L.press.t < 0.12) return; L.press = { id, t: T }; uiSfx(kind); setTimeout(fn, 110); } }); }

  // ---------- 그리기 도구 ----------
  function text(s, x, y, size, color = '#fff', align = 'center', o = {}) {
    ctx.font = F(size, o.w || 800); ctx.textAlign = align; ctx.textBaseline = 'middle';
    if (o.stroke !== false) { ctx.lineWidth = o.lw || Math.max(2, size / 6); ctx.strokeStyle = o.sc || 'rgba(20,24,50,0.8)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }
  function panel(x, y, w, h, r = 14, a = 0.55) {
    ctx.save(); ctx.fillStyle = `rgba(16,22,48,${a})`; rr(x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
  }
  function fitText(s, size, maxW, w = 800) { ctx.font = F(size, w); let z = size; while (z > 8 && ctx.measureText(s).width > maxW) { z -= 0.5; ctx.font = F(z, w); } return z; }
  // 반짝이는 큰 버튼 (그라데이션 + 위쪽 광택 + 지나가는 빛)
  function glossy(id, label, cx, cy, w, h, c1, c2, fn, o = {}) {
    const p = pressed(id), pul = o.pulse ? 1 + Math.sin(T * 3.2) * 0.025 : 1, sc = (p ? 0.92 : 1) * pul;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 22 + Math.sin(T * 3) * 6; }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(-w / 2 + 2, -h / 2 + 6, w, h, h * 0.42); ctx.fill(); ctx.shadowBlur = 0;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; rr(-w / 2, -h / 2, w, h, h * 0.42); ctx.fill();
    ctx.save(); rr(-w / 2, -h / 2, w, h, h * 0.42); ctx.clip();
    const hg = ctx.createLinearGradient(0, -h / 2, 0, 0); hg.addColorStop(0, 'rgba(255,255,255,0.55)'); hg.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = hg; rr(-w / 2 + 6, -h / 2 + 3, w - 12, h * 0.46, h * 0.3); ctx.fill();
    if (o.shine !== false) { const sx = ((T * 0.6) % 2.2 - 0.6) * w; ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(sx - w / 2, -h / 2); ctx.lineTo(sx - w / 2 + 26, -h / 2); ctx.lineTo(sx - w / 2 - 4, h / 2); ctx.lineTo(sx - w / 2 - 30, h / 2); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; rr(-w / 2, -h / 2, w, h, h * 0.42); ctx.stroke();
    const fs = fitText(label, o.size || 28, w - 24, 900);
    text(label, 0, 1, fs, '#fff', 'center', { w: 900, sc: o.sc || 'rgba(20,60,20,0.8)', lw: Math.max(3, fs / 5) });
    ctx.restore();
    hit(id, { x: cx - w / 2, y: cy - h / 2, w, h }, fn, o.sfx || 'tap');
  }
  function roundBtn(id, cx, cy, r, drawIcon, fn) {
    const p = pressed(id); ctx.save(); ctx.translate(cx, cy); if (p) ctx.scale(0.9, 0.9);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(1, 3, r, 0, 6.283); ctx.fill();
    const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#6aa0ff'); g.addColorStop(1, '#3456c8');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
    drawIcon(r); ctx.restore(); hit(id, { x: cx - r, y: cy - r, w: r * 2, h: r * 2 }, fn);
  }
  function gear(r) { ctx.fillStyle = '#fff'; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, rr2 = i % 2 ? r * 0.42 : r * 0.58; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.fill(); ctx.fillStyle = '#3f62d0'; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, 6.283); ctx.fill(); }
  function speaker(r) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.18); ctx.lineTo(-r * 0.2, -r * 0.18); ctx.lineTo(r * 0.12, -r * 0.45); ctx.lineTo(r * 0.12, r * 0.45); ctx.lineTo(-r * 0.2, r * 0.18); ctx.lineTo(-r * 0.45, r * 0.18); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; if (muted) { ctx.beginPath(); ctx.moveTo(r * 0.25, -r * 0.25); ctx.lineTo(r * 0.55, r * 0.25); ctx.moveTo(r * 0.55, -r * 0.25); ctx.lineTo(r * 0.25, r * 0.25); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(r * 0.15, 0, r * 0.35, -0.8, 0.8); ctx.stroke(); } }
  function coinIcon(x, y, r) { const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); g.addColorStop(0, '#fff6b0'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#d08a00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#a06800'; ctx.lineWidth = 1.5; ctx.stroke(); text('G', x, y + 0.5, r * 1.1, '#a06800', 'center', { stroke: false, w: 900 }); }

  // ---------- 애니메이션 로고 ----------
  function logo(cx, cy, s) {
    const word = '라인 러쉬', chars = [...word];
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.font = F(64, 900); const widths = chars.map(c => ctx.measureText(c).width), tw = widths.reduce((a, b) => a + b, 0);
    // 뒤쪽 빛
    const rg = ctx.createRadialGradient(0, 0, 10, 0, 0, tw * 0.75); rg.addColorStop(0, 'rgba(255,230,140,0.45)'); rg.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(0, 0, tw * 0.75, 70, 0, 0, 6.283); ctx.fill();
    let x = -tw / 2;
    chars.forEach((c, i) => {
      const k = Math.min(1, Math.max(0, (L.logoT - i * 0.08) * 3)), e = 1 - Math.pow(1 - k, 3), bounce = Math.sin(T * 3 + i * 0.7) * 3;
      const cxx = x + widths[i] / 2; x += widths[i]; if (c === ' ') return;
      ctx.save(); ctx.translate(cxx, (1 - e) * -60 + bounce); ctx.rotate(Math.sin(T * 2 + i) * 0.03); ctx.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e); ctx.globalAlpha = k;
      ctx.font = F(64, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = 14; ctx.strokeStyle = '#3a1a5a'; ctx.strokeText(c, 0, 4);
      ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.strokeText(c, 0, 0);
      const g = ctx.createLinearGradient(0, -30, 0, 30); g.addColorStop(0, '#fff6a0'); g.addColorStop(0.45, '#ffc93a'); g.addColorStop(0.55, '#ff9a1e'); g.addColorStop(1, '#ff5a3a');
      ctx.fillStyle = g; ctx.fillText(c, 0, 0);
      ctx.restore();
    });
    // 지나가는 반짝임
    const sx = ((T * 0.45) % 1.6 - 0.3) * tw * 1.4 - tw / 2;
    ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(sx, -40); ctx.lineTo(sx + 20, -40); ctx.lineTo(sx - 5, 40); ctx.lineTo(sx - 25, 40); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // 리본 부제
    const rw = 250; ctx.fillStyle = '#4f6cff'; rr(-rw / 2, 40, rw, 26, 13); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    text('LINE RUSH · 동물 영웅 라인전', 0, 53.5, 13, '#fff', 'center', { stroke: false, w: 800 });
    for (let i = 0; i < 4; i++) { const a = T * 1.5 + i * 1.57, px = Math.cos(a) * tw * 0.58, py = Math.sin(a * 1.3) * 34; star(px, py, 4 + 2 * Math.sin(T * 5 + i), 'rgba(255,255,220,0.9)'); }
    ctx.restore();
  }

  // ---------- 공통 ----------
  function begin() {
    if (L.last !== scene) { L.last = scene; L.fade = 1; L.logoT = 0; L.press = null; L.settings = false; }
    const now = performance.now() / 1000, dt = Math.min(0.1, now - (L.now || now)); L.now = now; L.fade = Math.max(0, L.fade - dt * 3.2); L.logoT = (L.logoT || 0) + dt;
  }
  function endFade() { if (L.fade > 0) { ctx.fillStyle = `rgba(12,16,40,${L.fade})`; ctx.fillRect(0, 0, VW, VIEW_H); } }
  function slideIn(d = 0) { const k = Math.min(1, Math.max(0, sceneT * 3 - d)); return 1 - Math.pow(1 - k, 3); }
  function versionArea() {
    // 버전 표시·새로고침은 다른 작업(js/version.js · js/update.js)이 담당. 그쪽 그리기 함수가 있으면 그대로 부름
    if (typeof window.drawVersionUI === 'function') { try { window.drawVersionUI(ctx, VW, VIEW_H, uiRects); } catch (e) { console.error(e); } return; }
    if (!self.LR_VERSION) return;
    const U = window.LRUpdate, x = VW - 12, y = VIEW_H - 16;
    text(`v${self.LR_VERSION}` + (U ? `  ·  ${U.label()}` : ''), x - (U ? 72 : 0), y, 11, 'rgba(255,255,255,0.85)', 'right', { w: 700, lw: 3 });
    if (U) { const bx = x - 64, by = y - 12; ctx.fillStyle = U.state === 'update' ? '#ff9a2e' : 'rgba(40,60,120,0.75)'; rr(bx, by, 64, 24, 12); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      text('새로고침', bx + 32, by + 12.5, 11, '#fff', 'center', { stroke: false }); uiRects.push({ r: { x: bx, y: by, w: 64, h: 24 }, fn: () => U.hardReload() }); }
  }
  function settingsPanel() {
    if (!L.settings) return;
    ctx.fillStyle = 'rgba(8,10,30,0.55)'; ctx.fillRect(0, 0, VW, VIEW_H);
    const w = 320, h = 210, x = VW / 2 - w / 2, y = VIEW_H / 2 - h / 2;
    panel(x, y, w, h, 18, 0.9); text('설정', VW / 2, y + 28, 22, '#ffe066');
    const fsOn = !!(document.fullscreenElement || document.webkitFullscreenElement);
    glossy('set_snd', muted ? '소리: 꺼짐' : '소리: 켜짐', VW / 2, y + 80, 220, 44, muted ? '#9aa0b8' : '#6ad0ff', muted ? '#5a6078' : '#2a7fd8', () => toggleMute(), { size: 18, shine: false, sc: 'rgba(10,30,70,0.8)' });
    glossy('set_fs', fsOn ? '전체 화면: 켜짐' : '전체 화면: 꺼짐', VW / 2, y + 132, 220, 44, '#b48cff', '#6a3fd0', () => { if (window.LRFS && LRFS.toggle) LRFS.toggle(); }, { size: 18, shine: false, sc: 'rgba(40,10,70,0.8)' });
    glossy('set_x', '닫기', VW / 2, y + 182, 120, 34, '#ffb35a', '#e0702a', () => { L.settings = false; }, { size: 15, shine: false, sc: 'rgba(80,30,0,0.8)' });
    uiRects.push({ r: { x: 0, y: 0, w: VW, h: VIEW_H }, fn: () => {} });
  }
  function accountPanel(a) {
    const acc = accLevelInfo(store.get('accxp', 0)), x = 12 - (1 - a) * 220, y = 12;
    panel(x, y, 206, 56, 16);
    // 레벨 배지
    ctx.save(); ctx.translate(x + 28, y + 28); const g = ctx.createLinearGradient(0, -20, 0, 20); g.addColorStop(0, '#ffe680'); g.addColorStop(1, '#ff9a1e');
    ctx.fillStyle = g; ctx.beginPath(); for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283 - Math.PI / 2; ctx.lineTo(Math.cos(an) * 21, Math.sin(an) * 21); } ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
    text(String(acc.lv), 0, 1, 17, '#fff', 'center', { sc: '#a05a00', w: 900 }); ctx.restore();
    text('계정 레벨', x + 56, y + 17, 11, '#cfd8ff', 'left', { stroke: false, w: 700 });
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; rr(x + 56, y + 27, 138, 9, 4.5); ctx.fill();
    const xg = ctx.createLinearGradient(x + 56, 0, x + 194, 0); xg.addColorStop(0, '#b48cff'); xg.addColorStop(1, '#ff8ce0'); ctx.fillStyle = xg; rr(x + 56, y + 27, Math.max(9, 138 * acc.cur / acc.need), 9, 4.5); ctx.fill();
    text(`${acc.cur} / ${acc.need}`, x + 194, y + 45, 9.5, '#cfd8ff', 'right', { stroke: false, w: 700 });
    // 골드
    const gx = x + 216; panel(gx, y + 8, 118, 40, 20); coinIcon(gx + 20, y + 28, 12);
    text(store.get('coins', 0).toLocaleString(), gx + 38, y + 29, 17, '#ffe066', 'left', { w: 900 });
  }

  // ---------- 타이틀 / 로비 ----------
  window.drawTitle = function drawTitle() {
    begin();
    if (window.R3D) R3D.renderMenu(T, 'title', selHero);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(SC, 0, 0, SC, 0, 0);
    uiRects = [];
    // 아래쪽 어둡게 (버튼 가독성)
    const vg = ctx.createLinearGradient(0, VIEW_H * 0.55, 0, VIEW_H); vg.addColorStop(0, 'rgba(10,14,40,0)'); vg.addColorStop(1, 'rgba(10,14,40,0.55)'); ctx.fillStyle = vg; ctx.fillRect(0, VIEW_H * 0.55, VW, VIEW_H * 0.45);
    const tg = ctx.createLinearGradient(0, 0, 0, 90); tg.addColorStop(0, 'rgba(10,14,40,0.4)'); tg.addColorStop(1, 'rgba(10,14,40,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 0, VW, 90);
    logo(VW / 2, 92, Math.min(1, VW / 900) * (1 + Math.sin(T * 2.2) * 0.012));
    const a = slideIn(0.3);
    accountPanel(a);
    // 오른쪽 위: 전적 · 소리 · 설정
    const rx = VW - 12 + (1 - a) * 200;
    roundBtn('gear', rx - 22, 34, 20, gear, () => { L.settings = true; });
    roundBtn('snd', rx - 70, 34, 20, speaker, () => toggleMute());
    panel(rx - 210, 18, 112, 32, 16); text(`승리 ${store.get('wins', 0)} / ${store.get('matches', 0)}전`, rx - 154, 34.5, 12, '#fff', 'center', { stroke: false, w: 700 });
    // 가운데 아래: PLAY
    const py = VIEW_H - 78 + (1 - slideIn(0.5)) * 140;
    glossy('play', 'PLAY', VW / 2, py, 250, 72, '#7cf06a', '#22a63c', () => { if (window.LRFS) LRFS.firstTap(); scene = 'select'; sceneT = 0; }, { size: 40, pulse: true, glow: 'rgba(140,255,120,0.9)', sfx: 'play' });
    // 왼쪽 아래: 현재 맵
    const M = window.MAP, mx = 14 - (1 - a) * 260, my = VIEW_H - 64;
    panel(mx, my, 214, 50, 14);
    mapThumb(window.MAP_KEY, mx + 6, my + 6, 64, 38, 8);
    text('맵', mx + 80, my + 16, 10, '#cfd8ff', 'left', { stroke: false, w: 700 }); text(M.name, mx + 80, my + 34, 16, '#fff', 'left', { w: 900 });
    hit('mapchip', { x: mx, y: my, w: 214, h: 50 }, () => { scene = 'select'; sceneT = 0; });
    versionArea();
    settingsPanel();
    uiRects.push({ r: { x: 0, y: 0, w: VW, h: VIEW_H }, fn: () => {} });
    endFade();
  };

  // ---------- 맵 썸네일 ----------
  const hex = c => '#' + (c ?? 0).toString(16).padStart(6, '0');
  function mapThumb(k, x, y, w, h, r) {
    const M = MAPS[k], th = M.theme || {}; ctx.save(); rr(x, y, w, h, r); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, hex(th.skyTop ?? 0x5aa8e8)); g.addColorStop(1, hex(th.fog ?? 0xbfe6ff)); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const hc = th.hills || [0x85c97a, 0xa6d8a0, 0xb8e0b0], sh = th.hillShape;
    [2, 1, 0].forEach((li, n) => { ctx.fillStyle = hex(hc[li]); ctx.beginPath(); ctx.moveTo(x, y + h);
      for (let i = 0; i <= 20; i++) { const u = i / 20; let v;
        if (sh === 'mesa') v = Math.sin(u * 9 + li * 3) > 0.2 ? 0.45 : 0.7; else if (sh === 'peaks') v = 0.35 + Math.abs(((u * 4 + li) % 2) - 1) * 0.4; else if (sh === 'volcano') v = 0.3 + Math.pow(Math.abs(((u * 2.4 + li * 0.5) % 2) - 1), 0.7) * 0.5; else v = 0.5 + 0.12 * Math.sin(u * 7 + li * 2);
        ctx.lineTo(x + u * w, y + h * (v + li * -0.06 + n * 0.1)); }
      ctx.lineTo(x + w, y + h); ctx.fill(); });
    if (th.lava) { ctx.fillStyle = '#ff6a1a'; ctx.fillRect(x, y + h * 0.84, w, h * 0.05); }
    ctx.fillStyle = hex(th.ground ?? 0x6cbb63); ctx.fillRect(x, y + h * 0.86, w, h * 0.14);
    if (th.snow) { ctx.fillStyle = '#fff'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(x + ((i * 37 + T * 8) % w), y + ((i * 23 + T * 14) % h), 1.2, 0, 6.283); ctx.fill(); } }
    ctx.restore(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; rr(x, y, w, h, r); ctx.stroke();
  }

  // ---------- 영웅 선택 ----------
  // 스킬 아이콘: ui/skills/<영웅>_<0|1|2>.png (금테 아이콘 그림). 그림이 없으면 예전 도형
  function skillIcon(x, y, r, j, color, locked, key) {
    const im = key && IMG['sk_' + key + '_' + j];
    if (im && im.complete && im.naturalWidth) {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; ctx.drawImage(im, x - r * 1.12, y - r * 1.12, r * 2.24, r * 2.24); ctx.restore();
      if (locked) { ctx.fillStyle = 'rgba(10,14,30,0.55)'; rr(x - r, y - r, r * 2, r * 2, r * 0.35); ctx.fill(); }
      text(['1', '2', '궁'][j], x + r - 2, y + r - 3, 10, '#fff', 'center', { lw: 3, w: 900 }); return;
    }
    const cols = [['#ffb35a', '#e0601a'], ['#6ad0ff', '#2a6fd8'], ['#d08cff', '#7a2fd0']][j];
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    ctx.fillStyle = g; rr(-r, -r, r * 2, r * 2, r * 0.35); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(-r + 3, -r + 3, r * 2 - 6, r * 0.8, r * 0.25); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    if (j === 0) { ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.6); ctx.lineTo(r * 0.45, -r * 0.05); ctx.lineTo(r * 0.05, -r * 0.05); ctx.lineTo(r * 0.2, r * 0.6); ctx.lineTo(-r * 0.45, -r * 0.0); ctx.lineTo(-r * 0.05, 0); ctx.closePath(); ctx.fill(); }
    else if (j === 1) { ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.5, -r * 0.35); ctx.lineTo(r * 0.42, r * 0.2); ctx.lineTo(0, r * 0.6); ctx.lineTo(-r * 0.42, r * 0.2); ctx.lineTo(-r * 0.5, -r * 0.35); ctx.closePath(); ctx.fill(); }
    else star(0, 0, r * 0.62, '#fff');
    ctx.restore();
    text(['1', '2', '궁'][j], x + r - 2, y + r - 3, 10, '#fff', 'center', { lw: 3, w: 900 });
  }
  function statBar(label, x, y, w, k, col, key) {
    const cur = L.bars[key] = (L.bars[key] ?? 0) + (k - (L.bars[key] ?? 0)) * 0.15;
    text(label, x, y, 12, '#dfe6ff', 'left', { stroke: false, w: 700 });
    const bx = x + 58, bw = w - 58; ctx.fillStyle = 'rgba(0,0,0,0.45)'; rr(bx, y - 5, bw, 10, 5); ctx.fill();
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]); ctx.fillStyle = g; rr(bx, y - 5, Math.max(10, bw * cur), 10, 5); ctx.fill();
    for (let i = 1; i < 5; i++) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(bx + bw * i / 5, y - 5, 1.5, 10); }
  }
  function wrap(s, maxW, size) { ctx.font = F(size, 600); const out = []; let line = ''; for (const wd of s.split(' ')) { const t = line ? line + ' ' + wd : wd; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = wd; } else line = t; } if (line) out.push(line); return out; }
  function changeMap(dir) { const O = window.MAP_ORDER, i = O.indexOf(window.MAP_KEY); setMap(O[(i + dir + O.length) % O.length]); L.mapSlide = dir; L.mapSlideT = T; }
  function changeHero(k) { if (selHero === k) return; selHero = k; L.act = 0; L.actT = T - 1.2; L.selT = T; }

  window.drawSelect = function drawSelect() {
    begin();
    const ks = HKEYS(), d = HEROES[selHero];
    if (L.actT == null || T - L.actT > 2.4) { L.actT = T; L.act++; }
    if (window.R3D) R3D.renderMenu(T, 'select', selHero, { act: ACTS[L.act % ACTS.length], actSeq: L.act, color: d.color });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(SC, 0, 0, SC, 0, 0);
    uiRects = [];
    // 왼쪽 영웅 무대 / 오른쪽 정보 패널 사이 그라데이션
    const px = Math.round(VW * 0.43), pw = VW - px - 14;
    const sg = ctx.createLinearGradient(px - 120, 0, px + 40, 0); sg.addColorStop(0, 'rgba(10,14,40,0)'); sg.addColorStop(1, 'rgba(10,14,40,0.45)'); ctx.fillStyle = sg; ctx.fillRect(px - 120, 0, VW - px + 120, VIEW_H);
    // 위: 뒤로 + 제목
    roundBtn('back', 34, 32, 20, r => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(r * 0.25, -r * 0.4); ctx.lineTo(-r * 0.25, 0); ctx.lineTo(r * 0.25, r * 0.4); ctx.stroke(); }, () => { scene = 'title'; sceneT = 0; });
    text('영웅 선택', 66, 32, 24, '#ffe066', 'left', { w: 900 });
    text(store.get('matches', 0) === 0 ? '상대: 쉬움' : '상대: 보통', px - 24, 32, 12, '#fff', 'right', { w: 700, lw: 3 });
    // 영웅 이름 + 역할 태그 (무대 위쪽)
    const selK = Math.min(1, (T - (L.selT ?? -9)) * 4), ns = 0.85 + 0.15 * (1 - Math.pow(1 - selK, 3));
    ctx.save(); ctx.translate(VW * 0.21, 78); ctx.scale(ns, ns); text(d.name, 0, 0, 34, '#fff', 'center', { w: 900, sc: d.color, lw: 7 }); ctx.restore();
    const tags = d.role.split('·').map(s => s.trim()); ctx.font = F(11, 800);
    const tw = tags.map(t => ctx.measureText(t).width + 18), ttot = tw.reduce((a, b) => a + b + 6, -6); let tx = VW * 0.21 - ttot / 2;
    tags.forEach((t, i) => { ctx.fillStyle = i ? 'rgba(80,110,220,0.9)' : d.color; rr(tx, 100, tw[i], 20, 10); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2; ctx.stroke(); text(t, tx + tw[i] / 2, 110.5, 11, '#fff', 'center', { stroke: false }); tx += tw[i] + 6; });
    // 아래 왼쪽: 영웅 탭 (초상화)
    const tabY = VIEW_H - 42, tabSp = Math.min(74, (px - 34) / ks.length), tabR = Math.min(28, tabSp * 0.42);
    panel(VW * 0.21 - ks.length * tabSp / 2 - 6, tabY - tabR - 9, ks.length * tabSp + 12, tabR * 2 + 26, 16, 0.38);
    ks.forEach((k, i) => { const x = VW * 0.21 + (i - (ks.length - 1) / 2) * tabSp, sel = selHero === k, H = HEROES[k];
      ctx.save(); ctx.translate(x, tabY); const s = (pressed('h_' + k) ? 0.9 : 1) * (sel ? 1.12 : 0.92); ctx.scale(s, s);
      if (sel) { ctx.shadowColor = H.color; ctx.shadowBlur = 18 + Math.sin(T * 5) * 6; }
      ctx.fillStyle = sel ? H.color : 'rgba(30,36,70,0.85)'; ctx.beginPath(); ctx.arc(0, 0, tabR, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, tabR - 3, 0, 6.283); ctx.clip(); const im = IMG[H.img];
      if (im && im.complete && im.naturalWidth) { const ih = tabR * 2.3, iw = ih * im.naturalWidth / im.naturalHeight; ctx.drawImage(im, -iw / 2, -tabR * 0.95, iw, ih); }
      ctx.restore(); ctx.strokeStyle = sel ? '#fff6c0' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = sel ? 3.5 : 2; ctx.beginPath(); ctx.arc(0, 0, tabR, 0, 6.283); ctx.stroke();
      if (sel) { ctx.strokeStyle = `rgba(255,240,170,${0.5 + 0.5 * Math.sin(T * 6)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, tabR + 5 + Math.sin(T * 6) * 1.5, 0, 6.283); ctx.stroke(); }
      ctx.restore();
      text(H.name, x, tabY + tabR + 4, 10, sel ? '#ffe066' : '#dfe6ff', 'center', { lw: 3 });
      hit('h_' + k, { x: x - tabSp / 2, y: tabY - 34, w: tabSp, h: 76 }, () => changeHero(k), 'swap');
    });
    // 무대(영웅 3D) 영역 탭 → 다음 영웅
    uiRects.push({ r: { x: 0, y: 130, w: px - 30, h: VIEW_H - 130 - 76 }, fn: () => { const i = ks.indexOf(selHero); changeHero(ks[(i + 1) % ks.length]); uiSfx('swap'); } });
    // 오른쪽 패널: 능력치
    const a = slideIn(0.2), ox = (1 - a) * 260;
    const sx = px + ox, sy = 56;
    panel(sx, sy, pw, 112, 14);
    const sw = (pw - 36) / 2;
    const stats = [['체력', Math.min(1, d.hp / 1100), ['#7cf06a', '#22a63c'], 'hp'], ['공격력', Math.min(1, d.atk / 80), ['#ffb35a', '#e0601a'], 'atk'], ['사거리', Math.min(1, d.range / 320), ['#6ad0ff', '#2a6fd8'], 'rng'],
      ['이동속도', Math.min(1, (d.spd - 150) / 80), ['#ffe680', '#e0a020'], 'spd'], ['공격속도', Math.min(1, 0.55 / d.as), ['#ff8ce0', '#c040a0'], 'as'], ['방어력', Math.min(1, 0.25 + (d.armor || 0) * 5), ['#c8d0e8', '#7080a8'], 'arm']];
    stats.forEach(([lb, k, col, key], i) => statBar(lb, sx + 12 + (i % 2) * (sw + 12), sy + 22 + Math.floor(i / 2) * 32, sw, k, col, key));
    // 스킬
    const ky = sy + 120; panel(sx, ky, pw, 150, 14);
    d.skills.forEach((s, j) => { const y = ky + 26 + j * 46, lv = SKILL_LV[j];
      skillIcon(sx + 30, y, 19, j, d.color, false, selHero);
      text(s.name, sx + 56, y - 9, 14, '#fff', 'left', { lw: 3 });
      ctx.font = F(14, 800); const nw = ctx.measureText(s.name).width;
      text(`Lv.${lv} 해제 · 쿨 ${s.cd}초 · 마나 ${d.mana[j]}`, sx + 62 + nw, y - 8, 9.5, '#aab8e8', 'left', { stroke: false, w: 700 });
      const lines = wrap(s.desc, pw - 70, 10.5); text(lines[0], sx + 56, y + 9, 10.5, '#dfe6ff', 'left', { stroke: false, w: 600 });
      if (lines.length > 1) text(lines[1] + (lines.length > 2 ? '…' : ''), sx + 56, y + 22, 10.5, '#dfe6ff', 'left', { stroke: false, w: 600 });
    });
    // 맵 캐러셀 + 출전 버튼
    const my = ky + 158, mh = VIEW_H - my - 10, bw2 = Math.min(190, pw * 0.36), mw = pw - bw2 - 12;
    panel(sx, my, mw, mh, 14);
    const O = window.MAP_ORDER, mi = O.indexOf(window.MAP_KEY), M = window.MAP;
    const slide = L.mapSlideT != null ? Math.max(0, 1 - (T - L.mapSlideT) * 5) * L.mapSlide : 0;
    ctx.save(); rr(sx, my, mw, mh, 14); ctx.clip();
    const thW = Math.min(118, mw * 0.38), thH = mh - 18, thX = sx + 32 + slide * 40;
    ctx.globalAlpha = 1 - Math.abs(slide); mapThumb(window.MAP_KEY, thX, my + 9, thW, thH, 10); ctx.globalAlpha = 1;
    const tx2 = sx + 40 + thW;
    text(M.name, tx2, my + 18, 16, '#fff', 'left', { w: 900, lw: 3 });
    text(M.desc || '', tx2, my + 37, 10, '#cfd8ff', 'left', { stroke: false, w: 600 });
    const dn = M.dragonName || '용', bd = (M.dragonBuff && M.dragonBuff.desc) || '';
    text(`용: ${dn}`, tx2, my + 55, 11, (M.dragonFx && M.dragonFx.color) || '#ffd9a0', 'left', { stroke: false, w: 800 });
    text(bd, tx2, my + 71, fitText(bd, 9.5, sx + mw - 34 - tx2, 600), '#cfd8ff', 'left', { stroke: false, w: 600 });
    ctx.restore();
    // 점 표시 + 화살표
    O.forEach((k, i) => { ctx.fillStyle = i === mi ? '#ffe066' : 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(sx + mw / 2 - (O.length - 1) * 6 + i * 12, my + mh - 6, i === mi ? 3 : 2.2, 0, 6.283); ctx.fill(); });
    const arrow = (id, x, dir) => { const p = pressed(id); ctx.save(); ctx.translate(x, my + mh / 2); if (p) ctx.scale(0.85, 0.85); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-dir * 4, -6); ctx.lineTo(dir * 4, 0); ctx.lineTo(-dir * 4, 6); ctx.stroke(); ctx.restore();
      hit(id, { x: x - 16, y: my, w: 32, h: mh }, () => changeMap(dir), 'swap'); };
    arrow('m_prev', sx + 16, -1); arrow('m_next', sx + mw - 16, 1);
    hit('m_card', { x: sx + 32, y: my, w: mw - 64, h: mh }, () => changeMap(1), 'swap');
    glossy('go', '출전!', sx + pw - bw2 / 2, my + mh / 2, bw2, Math.min(64, mh - 6), '#7cf06a', '#22a63c', () => startMatch(), { size: 28, pulse: true, glow: 'rgba(140,255,120,0.8)', sfx: 'play' });
    endFade();
  };
})();
