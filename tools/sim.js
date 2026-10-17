#!/usr/bin/env node
// 라인 러쉬 헤드리스 밸런스 시뮬레이터 (측정 전용 — 게임 로직/수치는 건드리지 않음)
// 실제 js/data.js + maps/meadow.js + js/assets.js + js/game.js 를 Node vm 안에서 그대로 실행하고
// 렌더/입력/오디오만 빈 스텁으로 바꾼다. 양쪽 모두 게임 내장 AI('normal')가 조종, 고정 1/60초 스텝.
// 사용: node tools/sim.js [경기수/매치업=200] [출력.json] [--cap=1800] [--jobs=8] [--map=meadow|canyon|volcano|snow]
const fs = require('fs'), path = require('path'), vm = require('vm'), { fork } = require('child_process');
const ROOT = path.join(__dirname, '..');
const HEROES = (process.env.LR_HEROES || 'bear,chick,cat,turtle,fox,rabbit').split(',');

function makeContext() {
  const noop = () => {};
  const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => (t[k] = v, true) });
  const canvas = { getContext: () => ctx2d, addEventListener: noop, getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 450 }), setPointerCapture: noop, style: {}, width: 0, height: 0 };
  const ls = { lr_matches: '5' };
  const sb = {
    console, Math, JSON, Date, Object, Array, Number, String, Boolean, Infinity, NaN, isFinite, parseFloat, parseInt, Proxy, Map, Set, Symbol, Error,
    location: { search: '?auto' + (process.env.LR_MAP ? '&map=' + process.env.LR_MAP : '') }, URLSearchParams,
    document: { getElementById: () => canvas, createElement: () => canvas, body: { appendChild: noop } },
    localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } },
    Image: function () { return {}; }, innerWidth: 900, innerHeight: 450, devicePixelRatio: 1,
    addEventListener: noop, requestAnimationFrame: noop, setTimeout: noop, performance: { now: () => 0 },
  };
  sb.window = sb; sb.self = sb;
  const c = vm.createContext(sb);
  for (const f of ['js/data.js', 'maps/meadow.js', 'maps/canyon.js', 'maps/volcano.js', 'maps/snow.js', 'maps/select.js', 'js/assets.js', 'js/game.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), c, { filename: f });
  // 계측 훅: 같은 전역 스코프의 스크립트로 함수 래핑(동작은 그대로 위임)
  vm.runInContext(`
  var __S = null;
  (function(){
    const _use = useSkill, _dash = doDash, _rec = startRecall, _kill = kill, _buy = buy, _tact = towerAct, _end = endMatch, _ward = placeWard;
    const hs = h => __S && h && h.kind==='hero' ? __S.h[h.team] : null;
    useSkill = function(h,i){ const r = _use(h,i); const s = hs(h); if (r && s) s.skill[i]++; return r; };
    doDash = function(h){ const r = _dash(h); const s = hs(h); if (r && s) s.dash++; return r; };
    startRecall = function(h){ const r = _rec(h); const s = hs(h); if (r && s) s.recallStart++; return r; };
    placeWard = function(h){ const c0 = G.teams[h.team].wardCd; _ward(h); const s = hs(h); if (s && c0<=0 && G.teams[h.team].wardCd>0) s.wards++; };
    buy = function(team,id){ const r = _buy(team,id); if (r && __S) { const b = __S.h[team].buys; b[id] = (b[id]||0)+1; } return r; };
    towerAct = function(slot,id){ const r = _tact(slot,id); if (r && __S) { const b = __S.h[slot.team].buys; b['tower_'+id] = (b['tower_'+id]||0)+1; } return r; };
    kill = function(e, src){
      if (__S && !e.dead) {
        if (e.kind==='tower') __S.h[1-e.team].towers++;
        if (e.kind==='dragon') { const sh = src && src.kind==='hero' ? src : null; const team = sh ? sh.team : (src ? src.team : 0); if (team<2) __S.h[team].dragons++; }
      }
      return _kill(e, src);
    };
    endMatch = function(win){ if (__S && __S.winner==null) __S.winner = win ? 0 : 1; return _end(win); };
  })();
  function __runMatch(k0, k1, cap){
    newMatch(k0);
    G.ents = G.ents.filter(e => e !== G.ai);
    G.ai = mkHero(k1, 1, 'normal'); G.teams[1].hero = G.ai;
    G.hero.ai.diff = 'normal';
    const mk = k => ({ key:k, skill:[0,0,0], dash:0, recallStart:0, recallDone:0, wards:0, buys:{}, towers:0, dragons:0, starved:0, lv20:null, lvAt:{}, minMpFrac:1 });
    __S = { winner:null, h:[mk(k0), mk(k1)] };
    const dt = 1/60; const prevRec = [null,null];
    while (!G.over && G.t < cap) {
      update(dt);
      for (const h of [G.hero, G.ai]) { const s = __S.h[h.team];
        if (prevRec[h.team] && !h.recall && nearBase(h) && h.respawn<=0) s.recallDone++;
        prevRec[h.team] = h.recall;
        if (h.respawn<=0) { let st = false; for (let i=0;i<3;i++) { if (!skillOpen(h,i)) continue; if (h.cds[i]<=0 && h.mp < h.d.mana[i]) st = true; } if (st) s.starved += dt; }
        if (!s.lvAt[h.lv]) s.lvAt[h.lv] = G.t;
        if (h.lv>=MAX_LV && s.lv20==null) s.lv20 = G.t;
      }
    }
    const out = { k0, k1, winner: __S.winner, t: G.t, capped: !G.over, h: [] };
    for (const h of [G.hero, G.ai]) { const s = __S.h[h.team], tm = G.teams[h.team];
      out.h.push(Object.assign(s, { lv:h.lv, kills:h.kills, deaths:h.deaths, cs:h.cs, earned:Math.round(tm.earned||0), weapon:tm.weapon, stage:tm.stage, skillLv:tm.skill.slice(),
        baseHpFrac: Math.max(0, tm.base.hp)/tm.base.maxHp })); }
    __S = null;
    return out;
  }`, c);
  return c;
}

if (process.argv[2] === '--worker') {
  const c = makeContext();
  process.on('message', job => {
    const r = c.__runMatch(job.k0, job.k1, job.cap);
    process.send(JSON.parse(JSON.stringify(r)));
  });
  process.send({ ready: true });
} else if (require.main === module) {
  const N = +(process.argv[2] || 200), OUT = process.argv[3] || 'sim-results.json';
  const opt = Object.fromEntries(process.argv.slice(4).map(a => a.replace(/^--/, '').split('=')));
  const cap = +(opt.cap || 1800), jobs = +(opt.jobs || require('os').cpus().length);
  if (opt.map) process.env.LR_MAP = opt.map; // --map=canyon|volcano|snow (기본 meadow), 워커에 환경변수로 전달
  const queue = [];
  for (let n = 0; n < N; n++) for (const a of HEROES) for (const b of HEROES) queue.push({ k0: a, k1: b, cap });
  const total = queue.length, results = []; const t0 = Date.now();
  let live = 0;
  for (let w = 0; w < Math.min(jobs, total); w++) {
    const p = fork(__filename, ['--worker']); live++;
    const next = () => { const j = queue.shift(); if (j) p.send(j); else { p.kill(); if (--live === 0) done(); } };
    p.on('message', m => { if (!m.ready) { results.push(m); if (results.length % 9 === 0) { const el = (Date.now() - t0) / 1000; const line = `${results.length}/${total}  ${el.toFixed(0)}s  (남은 예상 ${((total - results.length) * el / results.length / 60).toFixed(1)}분)`; console.error(line); if (opt.log) fs.appendFileSync(opt.log, line + '\n'); fs.writeFileSync(OUT + '.partial', JSON.stringify(results)); } } next(); });
  }
  function done() { fs.writeFileSync(OUT, JSON.stringify(results)); console.error(`완료 ${results.length}경기 → ${OUT} (${((Date.now() - t0) / 1000).toFixed(0)}s)`); }
}
module.exports = { makeContext };
