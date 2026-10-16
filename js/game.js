'use strict';
// ===================== 라인 러쉬 =====================
const Q = new URLSearchParams(location.search);
const SPEED = parseFloat(Q.get('speed') || '1');
const AUTO = Q.has('auto');           // 디버그: 플레이어도 AI가 조종
const cv = document.getElementById('game'), ctx = cv.getContext('2d', { alpha: true });
let VW = 900, SC = 1, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const W = cv.clientWidth || innerWidth, H = cv.clientHeight || innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  SC = cv.height / VIEW_H; VW = cv.width / SC;
}
addEventListener('resize', resize); resize();

// ---------- 이미지 ----------
const IMG = {}, WHITE = {};
const imgNames = Object.keys(ASSET_PATH); // js/assets.js
let loaded = 0;
for (const n of imgNames) {
  const im = new Image(); im.onload = () => { loaded++; WHITE[n] = whiteOf(im); }; im.onerror = () => { loaded++; console.warn('img fail', n); };
  im.src = ASSET_PATH[n]; IMG[n] = im;
}
function whiteOf(im) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d');
  g.drawImage(im,0,0); g.globalCompositeOperation='source-atop'; g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); return c; }

// ---------- 유틸 ----------
const rand = (a,b) => a + Math.random()*(b-a), clamp = (v,a,b) => v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const store = { get(k,d){ try{ const v=localStorage.getItem('lr_'+k); return v==null?d:JSON.parse(v);}catch(e){return d;} }, set(k,v){ try{localStorage.setItem('lr_'+k,JSON.stringify(v));}catch(e){} } };
function accLevelInfo(xp){ let lv=1, need=200; while(xp>=need){ xp-=need; lv++; need=200+lv*60; } return {lv, cur:xp, need}; }

// ---------- 사운드 (WebAudio 합성) ----------
let AC=null, muted = false; try { muted = localStorage.getItem('lr_muted')==='1'; } catch(e){}
const sfxLast = {};
function audioInit(){ if (!AC) { try { AC = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){} } if (AC && AC.state==='suspended') AC.resume(); }
function tone(f0, f1, dur, type, vol, delay=0){ const t=AC.currentTime+delay, o=AC.createOscillator(), gn=AC.createGain(); o.type=type; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur); gn.gain.setValueAtTime(vol,t); gn.gain.exponentialRampToValueAtTime(0.001,t+dur); o.connect(gn).connect(AC.destination); o.start(t); o.stop(t+dur+0.02); }
function noise(dur, vol, freq){ const t=AC.currentTime, n=Math.floor(AC.sampleRate*dur), buf=AC.createBuffer(1,n,AC.sampleRate), d=buf.getChannelData(0); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
  const s=AC.createBufferSource(), f=AC.createBiquadFilter(), gn=AC.createGain(); s.buffer=buf; f.type='lowpass'; f.frequency.value=freq; gn.gain.value=vol; s.connect(f).connect(gn).connect(AC.destination); s.start(t); }
function sfx(kind, strength=1){
  if (muted || !AC || AC.state!=='running') return; const now=performance.now(); if (now-(sfxLast[kind]||0) < ({hit:45,shoot:60,gold:70}[kind]||30)) return; sfxLast[kind]=now;
  try {
    if (kind==='hit') { tone(220*rand(0.9,1.1), 80, 0.09, 'square', 0.05+0.05*strength); noise(0.06, 0.12*strength, 2500); }
    else if (kind==='crit') { tone(520, 140, 0.14, 'sawtooth', 0.09); noise(0.1, 0.2, 4000); }
    else if (kind==='shoot') tone(900*rand(0.9,1.1), 380, 0.07, 'triangle', 0.05);
    else if (kind==='boom') { noise(0.45, 0.45*strength, 700); tone(120, 35, 0.4, 'sine', 0.3*strength); }
    else if (kind==='gold') { tone(1320, 1320, 0.06, 'square', 0.04); tone(1760, 1760, 0.09, 'square', 0.04, 0.06); }
    else if (kind==='pop') tone(600, 1200, 0.08, 'sine', 0.06);
    else if (kind==='click') { tone(2200, 700, 0.035, 'square', 0.08*strength); noise(0.035, 0.18*strength, 6000); tone(320, 110, 0.09, 'triangle', 0.07*strength, 0.03); }  // 덫 닫힘
    else if (kind==='level') { [523,659,784,1046].forEach((f,i)=>tone(f,f,0.12,'triangle',0.06,i*0.07)); }
  } catch(e){}
}
function toggleMute(){ muted=!muted; try{localStorage.setItem('lr_muted',muted?'1':'0');}catch(e){} if(!muted){audioInit(); sfx('gold');} }
function onScreen(e){ return G && Math.abs(e.x - (G.camX+VW/2)) < VW*0.6; }

// ---------- 상태 ----------
let scene = 'title', T = 0, G = null, selHero = 'bear', result = null, sceneT = 0;
const keys = {};
let shake = 0;

// ================= 매치 생성 =================
function newMatch(heroKey) {
  const matches = store.get('matches', 0);
  const diff = matches === 0 ? 'easy' : 'normal';
  const keysH = Object.keys(HEROES); const aiKey = keysH.filter(k=>k!==heroKey)[Math.floor(Math.random()*2)];
  G = { t:0, ents:[], proj:[], parts:[], nums:[], diff, over:false, camX:0, shopOpen:false, popup:null, msg:[], dragonNext:(Q.has('dragon') ? +Q.get('dragon') : DRAGON.first), // 디버그: ?dragon=초
    fx:[], tick:0, teams:[mkTeam(0), mkTeam(1)], stats:{kills:0,deaths:0,cs:0}, plats:[], obst:[], slots:[] };
  G.plats.push(...MAP.plats(WORLD_W, GROUND)); // maps/
  for (const t of [0,1]) {
    const b = ent({kind:'base', team:t, x: t?WORLD_W-MAP.baseX:MAP.baseX, w:150, h:170, hp:BASE.hp[0]}); b.rockT=0; G.teams[t].base=b;
  }
  const tx = MAP.towerSlots;
  for (const t of [0,1]) for (const [x,empty] of tx) {
    const X = t? WORLD_W-x : x; const slot = {team:t, x:X, tower:null}; G.slots.push(slot);
    if (!empty) buildTower(slot);
  }
  for (const [x,type] of MAP.obstacles(WORLD_W)) { const s = MAP.obstStats[type];
    G.obst.push(ent({kind:'obst', team:3, x, w:s.w, h:s.h, hp:s.hp, type})); }
  G.hero = mkHero(heroKey, 0, AUTO ? 'normal' : null);
  G.ai = mkHero(aiKey, 1, diff);
  G.teams[0].hero=G.hero; G.teams[1].hero=G.ai;
  const L0 = +(Q.get('lv')||0); if (L0 > 1) for (const h of [G.hero, G.ai]) giveXp(h, LEVEL_XP[Math.min(MAX_LV,L0)-1] - h.xp); // 디버그: ?lv=15
  G.waveT = [3,3];
  G.camX = 0;
  addMsg(diff==='easy' ? '쉬운 상대와의 첫 대결! 적 기지를 부수세요!' : '적 기지를 부수면 승리!', '#fff');
}
function mkTeam(t){ return { gold:ECON.start, stage:0, weapon:0, skill:[0,0,0], buffT:0, wave:0, wardCd:0 }; }
function ent(o){ const e = Object.assign({ y:GROUND, vx:0, vy:0, maxHp:o.hp, flash:0, dead:false, slow:0, stun:0, born:T, face:1, atkT:0, anim:Math.random()*9 }, o); e.maxHp = o.hp; G.ents.push(e); return e; }
function buildTower(slot){ const t = ent({kind:'tower', team:slot.team, x:slot.x, w:70, h:120, hp:TOWER.hp[0]}); t.lv=1; t.branch=null; t.slot=slot; t.cd=0; slot.tower=t; return t; }
function mkHero(key, team, aiDiff){
  const d = HEROES[key];
  const h = ent({kind:'hero', team, key, d, x: team? WORLD_W-330 : 330, w:44, h:72, hp:d.hp});
  Object.assign(h, { lv:1, xp:0, atk:d.atk, cds:[0,0,0], mp:MANA.base, maxMp:MANA.base, dashCd:0, recall:null, cs:0, goldEarned:0, ground:true, shield:0, respawn:0, ai: aiDiff ? {diff:aiDiff, think:0, mode:'lane', skillT:0, shopT:5, jumpCd:0} : null,
    face: team?-1:1, kills:0, deaths:0, wards:[], dash:null, slam:null, inputX:0 });
  return h;
}
const DN = () => (window.MAP && MAP.dragonName) || '용';  // 맵의 드래곤 이름
// 공격/스킬 발사 시점 = 퍼펫 동작의 '놓는' 프레임 (초). 공격 주기·피해량은 그대로, 발사만 이만큼 늦춤.
// js/heroes2d.js 가 이 값에 맞춰 동작 재생 속도를 조절한다 (모모 지팡이 휘두름 정점 / 삐요 시위 놓기 / 뭉치 망치 타격).
const HERO_RELEASE = { bear:{basic:0.15, basic3:0.2}, chick:{basic:0.24, skill1:0.24, skill2:0.15, ult:0.3}, cat:{basic:0.18, skill1:0.2, skill2:0.2, ult:0.3} };
if (typeof window !== 'undefined') window.HERO_RELEASE = HERO_RELEASE;
function later(h, d, fn) { if (!(d > 0)) { fn(); return; } (h.pend = h.pend || []).push({t:d, fn}); }
const relT = (h, a) => (HERO_RELEASE[h.key] || {})[a] || 0;
function addMsg(text, color){ G.msg.push({text, color, t:3}); if (G.msg.length>3) G.msg.shift(); }

// ================= 엔티티 헬퍼 =================
const isAlive = e => !e.dead && !(e.kind==='hero' && e.respawn>0);
function enemiesOf(team, opt={}) {
  return G.ents.filter(e => isAlive(e) && e.team!==team && e.kind!=='ward' && e.kind!=='obst' && !(e.kind==='dragon' && !opt.dragon));
}
function cy(e){ return e.y - e.h/2; }
const DBUF = () => (window.MAP && MAP.dragonBuff) || { spd:1.25, jump:1.15 }; // 맵별 용 버프 (maps/)
function hasBuff(e){ return e && e.team<2 && G.teams[e.team] && G.teams[e.team].buffT>0; }
function heroAtk(h){ return h.atk * (1 + 0.12*G.teams[h.team].weapon) * (h.ai && h.ai.diff==='easy' ? 0.7 : 1); }
function ultTier(h){ return ULT_UP.filter(l=>h.lv>=l).length; }
function skillMul(h,i){ return (1 + 0.25*G.teams[h.team].skill[i]) * (1 + LV_SKILL*(h.lv-1)) * (i===2 ? 1 + 0.3*ultTier(h) : 1) * (h.ai && h.ai.diff==='easy' ? 0.7 : 1); }

function damage(src, tgt, amt, o={}) {
  if (!isAlive(tgt)) return;
  if (tgt.kind==='hero') { if (tgt.shield>0) amt*=1-SHIELD_DR; if (src && src.kind==='minion') amt *= MINION_VS_HERO; amt *= 1 - (tgt.d.armor||0); if (DBUF().dr && hasBuff(tgt)) amt *= 1 - DBUF().dr; }
  if (tgt.kind==='base' || tgt.kind==='tower') { if (src && src.kind==='minion') { if (src.mt.structMul) amt *= src.mt.structMul; amt *= src.structRush||1; } if (src && src.kind==='hero') amt *= HERO_STRUCT_MUL; if (tgt.kind==='base' && !G.ents.some(t=>t.kind==='tower'&&!t.dead&&t.team===tgt.team)) amt *= EXPOSED_BASE_MUL; }
  if (tgt.kind==='minion' && src) { if (src.kind==='hero') amt *= HERO_MINION_MUL; else if (src.kind==='minion') amt *= MINION_VS_MINION; else if (src.kind==='tower') amt *= TOWER_VS_MINION; }
  if (DBUF().atk && src && src.kind==='hero' && hasBuff(src)) amt *= 1 + DBUF().atk;
  amt = Math.round(amt);
  tgt.hp -= amt; tgt.flash = 1; tgt.lastDmg = G.t; if (tgt.recall && amt > 0) { tgt.recall = null; if (tgt===G.hero && !tgt.ai) addMsg('공격받아 귀환이 취소되었습니다', '#ffb0a0'); } if (tgt.kind==='dragon' && src && src.team<2) (tgt.aggro=tgt.aggro||{})[src.team]=G.t;
  const big = amt >= 100 || o.crit, vis = onScreen(tgt), heroSrc = src && src.kind==='hero';
  tgt.squash = Math.min(1, (tgt.squash||0) + (big?1:0.6));
  G.nums.push({x:tgt.x+rand(-10,10), y:cy(tgt)-tgt.h*0.4, v: o.crit ? amt+'!' : amt, t:0, c: o.crit ? '#ff8a1e' : o.color || (heroSrc ? (src.team===0?'#fff27a':'#ff9a8a') : '#ffffff'), big, crit:o.crit});
  if (vis || heroSrc) {
    const n = big ? 14 : 5, dir = src ? Math.sign(tgt.x-src.x)||1 : 1;
    for (let i=0;i<n;i++) G.parts.push({x:tgt.x, y:cy(tgt), vx:dir*rand(40,320)+rand(-60,60), vy:rand(-260,60), t:0, life:rand(0.25,0.5), c:o.pc||'#fff6c0', r:rand(2,4), spark:true});
    if (big) G.parts.push({ring:true, x:tgt.x, y:cy(tgt), t:0, life:0.22, r:40+amt*0.15, c:'#ffffff'});
    if (heroSrc || tgt===G.hero) { shake = Math.max(shake, Math.min(14, 1 + amt/30)); if (big) G.hitstop = Math.max(G.hitstop||0, o.crit ? 0.06 : Math.min(0.08, 0.04 + amt/6000)); }
    if (vis) sfx(o.crit ? 'crit' : 'hit', big ? 1 : 0.5);
  }
  if (heroSrc && tgt.kind==='minion' && tgt.mt!==MINIONS.boss && !o.kb) tgt.kbv = (tgt.kbv||0) + Math.sign(tgt.x-src.x)*(big?140:60);
  if (o.stun) tgt.stun = Math.max(tgt.stun, o.stun);
  if (o.root) { if (tgt.kind==='hero') tgt.root = Math.max(tgt.root||0, o.root); else if (tgt.kind==='minion') tgt.stun = Math.max(tgt.stun, o.root); }
  if (o.slow) tgt.slow = Math.max(tgt.slow, o.slow);
  if (DBUF().slowHit && src && src.kind==='hero' && hasBuff(src) && tgt.kind!=='base' && tgt.kind!=='tower') tgt.slow = Math.max(tgt.slow, DBUF().slowHit);
  if (o.kb && tgt.kind!=='base' && tgt.kind!=='tower' && tgt.kind!=='dragon' && !(tgt.kind==='minion' && tgt.mt===MINIONS.boss)) { tgt.kbv = o.kb; tgt.vy = Math.min(tgt.vy, -250); }
  if (tgt === G.hero && amt > 40) shake = Math.max(shake, 5);
  if (tgt.hp <= 0) kill(tgt, src);
}
function heroOf(src){ return src && src.kind==='hero' ? src : null; }
function giveXp(h, xp){ if (!h || h.lv>=MAX_LV) return; h.xp += xp;
  while (h.lv<MAX_LV && h.xp >= LEVEL_XP[h.lv]) { h.lv++; h.maxHp += h.d.hpL; h.hp += h.d.hpL; h.atk += h.d.atkL; h.maxMp += MANA.perLv; h.mp += MANA.perLv;
    burst(h.x, cy(h), '#ffe066', 24); if (h===G.hero) sfx('level');
    if (h===G.hero) addMsg(h.lv===SKILL_LV[1] ? `레벨 ${h.lv}! 스킬 2 「${h.d.skills[1].name}」 해제!` : h.lv===ULT_LV ? `레벨 ${h.lv}! 궁극기 해제!` : ULT_UP.includes(h.lv) ? `레벨 ${h.lv}! 궁극기 강화!` : h.lv===15 ? `레벨 15! 영웅의 불꽃이 깨어났다!` : h.lv===MAX_LV ? `최고 레벨 ${MAX_LV}!` : `레벨 업! Lv.${h.lv}`, '#ffe066'); } }
function gold(team, g, x, y){ G.teams[team].gold += g; G.teams[team].earned = (G.teams[team].earned||0) + g; if (team===0 && x!=null) sfx('gold'); if (team===0 && x!=null) G.nums.push({x, y, v:'+'+g+'G', t:0, c:'#ffd23f', gold:true}); }
function kill(e, src) {
  e.hp = 0; const sh = heroOf(src);
  burst(e.x, cy(e), e.kind==='hero' ? '#ffffff' : (e.team===0?'#7fc8ff':'#ff8a6a'), e.kind==='minion'?14:30);
  if (e.kind==='minion') {
    e.dead = true; G.parts.push({pop:true, img:`m_${MAP.teamElem[e.team]}${e.mt.img}`, x:e.x, y:e.y, h:e.mt.h, face:e.face, t:0, life:0.35}); if (onScreen(e)) sfx('pop');
    if (sh && sh.team!==e.team) { gold(sh.team, e.mt.gold, e.x, e.y-e.h-10); sh.cs++; if (sh===G.hero) G.stats.cs++; }
    const foe = G.teams[1-e.team].hero; if (isAlive(foe) && Math.abs(foe.x-e.x) < 750) giveXp(foe, e.mt.xp);
  } else if (e.kind==='hero') {
    G.parts.push({pop:true, img:HEROES[e.key].img+(e.team?'_r':''), x:e.x, y:e.y, h:78, face:e.face, t:0, life:0.5}); G.hitstop = 0.12; sfx('boom',0.8);
    e.respawn = RESPAWN.base + e.lv*RESPAWN.perLv; e.deaths++; e.pend = null; e.recall=null; e.slow=e.stun=0; e.shield=0; e.dash=null; e.slam=null; e.kbv=0; e.root=0; e.atkLock=0;
    const k = G.teams[1-e.team].hero; k.kills++;
    gold(1-e.team, ECON.heroKill, k.x, k.y-90); giveXp(k, 120 + e.lv*25);
    addMsg(e===G.hero ? `처치당했습니다! ${Math.ceil(e.respawn)}초 후 부활` : '적 영웅 처치! +'+ECON.heroKill+'G', e===G.hero?'#ff8a8a':'#ffe066');
    shake = 10;
  } else if (e.kind==='tower') {
    e.dead = true; sfx('boom', 0.9); e.slot.tower = null; e.slot.ruinT = TOWER.ruin; gold(1-e.team, ECON.towerKill, e.x, e.y-130); shake = 12;
    addMsg(e.team===0 ? '아군 타워가 파괴되었습니다!' : '적 타워 파괴! +'+ECON.towerKill+'G', e.team===0?'#ff8a8a':'#9fe3ff');
  } else if (e.kind==='obst') {
    e.dead = true; if (sh) gold(sh.team, ECON.crate, e.x, e.y-60);
    for (let i=0;i<12;i++) G.parts.push({x:e.x, y:cy(e), vx:rand(-200,200), vy:rand(-350,-50), t:0, life:0.8, c:e.type==='rock'?'#9a9aa8':'#b07a42', r:rand(3,6), g:true});
  } else if (e.kind==='dragon') {
    e.dead = true; const team = sh ? sh.team : (src ? src.team : 0);
    if (team<2) { G.teams[team].buffT = DRAGON.buff; gold(team, ECON.dragonGold, e.x, e.y-120);
      addMsg(team===0 ? `${DN()} 처치! ${DBUF().desc||'이동속도 · 점프 강화'}` : `적이 ${DN()}을 처치했습니다!`, team===0?'#a8ffcf':'#ff8a8a'); }
    G.dragonNext = G.t + DRAGON.every; shake = 10;
  } else if (e.kind==='base') {
    e.dead = true; shake = 25; burst(e.x, cy(e), '#ffd23f', 80); G.hitstop = 0.25; sfx('boom', 1.3);
    endMatch(e.team===1);
  } else e.dead = true;
  if (window.ANN) try { ANN.onKill(e, src, G, sfx); } catch (err) { console.error(err); } // 킬 아나운서/사망 연출 (js/announce.js)
}
function burst(x,y,c,n){ for(let i=0;i<n;i++){ const a=rand(0,6.28), s=rand(60,300); G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-80,t:0,life:rand(0.4,0.9),c,r:rand(2,5)}); } }

// ================= 업데이트 =================
function update(dt) {
  G.t += dt;
  for (const t of [0,1]) { const tm=G.teams[t]; tm.gold += ECON.passive*dt; tm.passive = (tm.passive||0) + ECON.passive*dt; tm.buffT=Math.max(0,tm.buffT-dt); tm.wardCd=Math.max(0,tm.wardCd-dt);
    G.waveT[t] -= dt; if (G.waveT[t] <= 0) { G.waveT[t] = BASE.wave[tm.stage]; spawnWave(t); } }
  if (G.t >= G.dragonNext) {
    G.dragonNext = Infinity; const p = G.plats.find(p=>p.center);
    const d = ent({kind:'dragon', team:2, x:WORLD_W/2, y:p.y-6, w:110, h:95, hp:Math.round(DRAGON.hp + G.t*4)}); d.cd=2; d.homeY=p.y-6;
    addMsg(`${DN()}이 나타났다! (중앙 위 발판)`, '#a8ffcf');
  }
  G.tick = (G.tick||0)+1; const order = G.tick % 2 ? G.ents : G.ents.slice().reverse(); // 매 프레임 갱신 순서를 뒤집어 진영 편향 제거
  for (const e of order) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt*5); e.anim += dt; if (e.squash) e.squash = Math.max(0, e.squash - dt*7);
    if (e.stun>0) e.stun -= dt; if (e.slow>0) e.slow -= dt;
    if (e.gooT>0) { e.gooT -= dt; if (e.slow<=0 && !(e.root>0)) e.gooT = 0; if (Math.abs(e.x-(e.gooX??e.x)) > 22 && e.ground!==false) { e.gooX = e.x; (G.goo = G.goo||[]).push({kind:'print', x:e.x, y:e.y, t:0, life:2.4, f:(G.goo.length%2)?1:-1}); } }  // 꿀 끈적 상태
    if (e.kind==='hero') updHero(e, dt);
    else if (e.kind==='minion') updMinion(e, dt);
    else if (e.kind==='tower') updTower(e, dt);
    else if (e.kind==='base') updBase(e, dt);
    else if (e.kind==='dragon') updDragon(e, dt);
    else if (e.kind==='ward') { e.life -= dt; if (e.life<=0) e.dead = true; }
  }
  if (!G.rushMsg && G.t >= RUSH_TIME) { G.rushMsg = true; addMsg('라인 러쉬 타임! 미니언이 점점 강해집니다!', '#ffb347'); }
  for (const s of G.slots) if (s.ruinT>0) s.ruinT -= dt;
  updProj(dt);
  for (const f of G.fx) f.t += dt; G.fx = G.fx.filter(f => f.t < f.life);
  for (const p of G.parts) { p.t += dt; if (p.ring) continue; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += (p.g?900:300)*dt; p.vx *= 0.98; }
  G.parts = G.parts.filter(p => p.t < p.life); if (G.parts.length > 600) G.parts.splice(0, G.parts.length-600);
  for (const n of G.nums) n.t += dt; G.nums = G.nums.filter(n => n.t < 0.9);
  if (!(window.ANN && ANN.busy())) { for (const m of G.msg) m.t -= dt; G.msg = G.msg.filter(m=>m.t>0); } // 킬 배너가 떠 있는 동안 안내 문구는 잠시 숨김(겹침 방지)
  G.ents = G.ents.filter(e => !e.dead);
  G.obst = G.obst.filter(e => !e.dead);
  if (G.popup && G.popup.slot.tower && G.popup.slot.tower.dead) G.popup=null;
  if (G.shopOpen && !nearBase(G.hero)) G.shopOpen = false;
  const h = G.hero; const tx = clamp(h.x - VW*0.30 + h.face*40, 0, Math.max(0, WORLD_W - VW));
  G.camX = lerp(G.camX, tx, 1 - Math.pow(0.002, dt));
}

function spawnWave(t) {
  const tm = G.teams[t]; tm.wave++;
  const list = ['melee','melee','melee','ranged','ranged'];
  const rush = G.t >= RUSH_TIME;
  if (tm.stage >= 3 || tm.wave % (rush?2:4) === 0) list.push('siege');
  if (tm.stage >= 4 && tm.wave % 3 === 0) list.push('boss');
  const sc = 1 + 0.045*tm.wave;
  list.forEach((k,i) => {
    const mt = MINIONS[k]; const dir = t?-1:1;
    const m = ent({kind:'minion', team:t, mt, mk:k, x: G.teams[t].base.x + dir*(80 - i*34), w: mt.h*0.7, h:mt.h, hp: Math.round(mt.hp*sc)});
    m.atkMul = (sc*0.85+0.15) * (rush ? 1 + (G.t-RUSH_TIME)/60*0.25 : 1); if (rush) { m.rush = true; m.structRush = 1 + (G.t-RUSH_TIME)/60*RUSH_STRUCT; } m.face = dir; m.cd = rand(0,0.4); m.ofs = rand(0, k==='melee'?26:40);
  });
}

function physics(e, dt) {
  const prevY = e.y;
  e.vy += 1650*dt; e.y += e.vy*dt;
  let landed = false;
  if (e.y >= GROUND) { e.y = GROUND; e.vy = 0; landed = true; }
  else if (e.vy > 0) {
    if (!e.dropT) for (const p of G.plats) if (prevY <= p.y+1 && e.y >= p.y && e.x > p.x-8 && e.x < p.x+p.w+8) { e.y = p.y; e.vy = 0; landed = true; break; }
    if (!landed) for (const o of G.obst) if (!o.dead && prevY <= o.y-o.h+1 && e.y >= o.y-o.h && Math.abs(e.x-o.x) < (o.w+e.w)/2-4) { e.y=o.y-o.h; e.vy=0; landed=true; break; }
  }
  return landed;
}

function updHero(h, dt) {
  const tm = G.teams[h.team];
  if (h.respawn > 0) { h.respawn -= dt; if (h.respawn<=0) { h.respawn=0; h.hp=h.maxHp; h.mp=h.maxMp; h.x=tm.base.x + (h.team?-100:100); h.y=GROUND-200; h.vy=0; h.cds=h.cds.map(c=>Math.min(c,2)); burst(h.x, h.y, '#fff', 20);} return; }
  for (let i=0;i<3;i++) h.cds[i] = Math.max(0, h.cds[i]-dt);
  h.shield = Math.max(0, h.shield-dt); h.root = Math.max(0, (h.root||0)-dt); h.atkLock = Math.max(0, (h.atkLock||0)-dt); h.atkT -= dt;
  if (h.pend && h.pend.length) { for (const q of h.pend) q.t -= dt; const due = h.pend.filter(q => q.t <= 0); h.pend = h.pend.filter(q => q.t > 0); for (const q of due) q.fn(); } if (h.dropT) h.dropT = Math.max(0,h.dropT-dt);
  h.dashCd = Math.max(0, h.dashCd - dt); h.dashFx = Math.max(0, (h.dashFx||0) - dt*4);
  if (nearBase(h)) { h.hp = Math.min(h.maxHp, h.hp + h.maxHp*RECALL.baseHealPct*dt); h.mp = Math.min(h.maxMp, h.mp + h.maxMp*MANA.baseRegenPct*dt); }
  else { h.hp = Math.min(h.maxHp, h.hp + h.maxHp*(G.t-(h.lastDmg||0) > 4 ? 0.02 : 0.005)*dt); h.mp = Math.min(h.maxMp, h.mp + (G.t-(h.lastDmg||0) > 4 ? MANA.regenIdle : MANA.regen)*dt); }
  if (h.ai) aiThink(h, dt); else playerInput(h);
  if (h.recall) { // 귀환 채널링: 이동/기절/공중이면 취소
    if (h.inputX || h.stun>0 || !h.ground) { h.recall = null; if (h===G.hero && !h.ai) addMsg('귀환 취소', '#ffb0a0'); }
    else { h.recall.t -= dt; if (Math.random() < dt*30) G.parts.push({x:h.x+rand(-26,26), y:h.y-rand(0,10), vx:0, vy:-rand(60,140), t:0, life:0.7, c:h.team?'#ffb0a0':'#9fe0ff', r:rand(2,4)});
      if (h.recall.t <= 0) { h.recall = null; burst(h.x, cy(h), '#e8f6ff', 24); h.x = tm.base.x + (h.team?-90:90); h.y = GROUND; h.vy = 0; burst(h.x, cy(h), '#e8f6ff', 30); if (onScreen(h)) sfx('level'); if (h===G.hero) G.camX = clamp(h.x - VW*0.30, 0, Math.max(0, WORLD_W - VW)); } } }
  const buff = tm.buffT>0;
  const spd = h.d.spd * (buff?DBUF().spd:1) * (h.slow>0?0.6:1);
  if (h.stun>0) h.inputX = 0;
  if (h.dash) { if (!h.dash.snd) { h.dash.snd=1; if (onScreen(h)) sfx('boom',0.4); } h.dash.t -= dt; h.vx = h.dash.vx;
    for (const e of enemiesOf(h.team)) if (!h.dash.hit.has(e) && Math.abs(e.x-h.x)<55 && Math.abs(cy(e)-cy(h))<70) { h.dash.hit.add(e); damage(h,e,h.dash.dmg,{kb:h.face*520, stun:h.dash.stun||0.4, pc:'#ffcf6a'}); shake=Math.max(shake,6);}
    if (h.dash.t<=0) h.dash=null; }
  else if (h.kbv) { h.vx = h.kbv; h.kbv *= Math.pow(0.02, dt); if (Math.abs(h.kbv)<20) h.kbv=0; }
  else h.vx = h.inputX * spd * (h.atkLock>0 ? 0.25 : 1);
  if (h.root>0 && !h.kbv) h.vx = 0;
  if (h.inputX && !h.dash && h.atkLock<=0) h.face = Math.sign(h.inputX);
  let nx = clamp(h.x + h.vx*dt, 40, WORLD_W-40);
  for (const o of G.obst) if (!o.dead && h.y > o.y-o.h+2 && Math.abs(nx-o.x) < (o.w+h.w)/2 && Math.abs(nx-o.x) < Math.abs(h.x-o.x)) { nx = h.x; h.blocked = true; }
  h.x = nx;
  const wasGround = h.ground; h.ground = physics(h, dt);
  if (h.ground && !wasGround) { h.land = 1; h.climbAir = false; if (h.slam) doSlam(h); }
  h.land = Math.max(0,(h.land||0)-dt*4);
  if (h.atkT <= 0 && h.stun<=0 && !h.dash && !h.climbAir) {  // AI가 발판 사이를 뛰어넘는 중엔 공격 안 함 (공격 멈칫 때문에 못 닿음)
    // 바라보는 방향의 적만 공격. 뒤쪽 적은 '멈춰 있을 때'만 돌아서서 공격 (뒷걸음질 사격 금지)
    const tgt = pickTarget(h, h.inputX ? h.face : 0);
    if (tgt) { h.atkT = h.d.as; h.atkLock = Math.min(0.3, h.d.as*0.4); h.face = Math.sign(tgt.x-h.x)||h.face; h.swing = 1; h.combo = (h.combo||0)%3 + 1; h.animAct = (h.key==='bear' && h.combo===3) ? 'basic3' : 'basic'; h.animSeq=(h.animSeq||0)+1;
      const crit = Math.random() < 0.15, dmgA = heroAtk(h)*(crit?1.7:1);
      // 발사/타격은 동작의 놓는 프레임에 (주기는 그대로)
      later(h, relT(h, h.animAct), () => { if (h.respawn>0 || h.dead) return;
        let t = tgt; if (t.dead || t.hp<=0 || t.respawn>0) { t = pickTarget(h, h.face); if (!t) return; }
        if (onScreen(h)) sfx(h.d.proj?'shoot':'hit', 0.4);
        if (h.d.proj) G.proj.push({kind:h.d.proj, x:h.x+h.face*20, y:cy(h)-8, team:h.team, owner:h, target:t, dmg:dmgA, crit, spd:h.d.proj==='arrow'?720:520, homing:true, aoe:h.d.proj==='orb'?45:0});
        else { damage(h, t, dmgA, {pc:'#ffe2a0', crit}); if (h.d.lifesteal) h.hp = Math.min(h.maxHp, h.hp + dmgA*h.d.lifesteal); if (t.kind!=='minion') shake=Math.max(shake,2); } });
    }
  }
  h.swing = Math.max(0,(h.swing||0)-dt*4);
}
function pickTarget(h, face) {
  const r = heroRange(h); let best=null, bs=1e9;
  for (const e of enemiesOf(h.team, {dragon:true})) {
    if (face && (e.x-h.x)*face < -e.w/2) continue;
    const dx=Math.abs(e.x-h.x)-(e.w/2); const dy=Math.abs(cy(e)-cy(h));
    if (!(dx <= r && dy < (h.d.proj? r*0.8 : 70+e.h*0.3))) continue;
    const pr = e.kind==='hero'?0 : e.kind==='minion'?1000 : e.kind==='dragon'?2000 : 3000;
    const s = pr + Math.abs(e.x-h.x) + (e.kind==='minion'? e.hp*0.3:0);
    if (s<bs) { bs=s; best=e; }
  }
  if (!best) for (const o of G.obst) if (!o.dead && Math.abs(o.x-h.x) < Math.min(r,90)+o.w/2 && Math.abs(cy(o)-cy(h))<80) return o;
  return best;
}
function canUlt(h){ return h.lv >= ULT_LV; }
function skillOpen(h,i){ return h.lv >= SKILL_LV[i]; }
function lvK(h){ return (h.lv-1)/(MAX_LV-1); }
function rangeMul(h){ return !h.d.proj ? 1 : RANGE_LV.min + (1-RANGE_LV.min)*lvK(h); }
function heroRange(h){ return h.d.range * rangeMul(h); }
function radMul(h){ return Math.min(SKILL_SCALE.radCap, 1 + SKILL_SCALE.rad*lvK(h)); }
function ccDur(h, base){ return Math.min(SKILL_SCALE.ccCap, base*(1 + SKILL_SCALE.cc*lvK(h))); }
function fx(o){ if (G.fx.length < 120) G.fx.push(Object.assign({t:0}, o)); }
function nearBase(h){ return Math.abs(h.x - G.teams[h.team].base.x) < RECALL.baseZone; }
// 공용 대시(점멸): 바라보는 방향으로 짧게 순간 이동
function doDash(h){ if (!h || h.respawn>0 || h.stun>0 || h.root>0 || h.dashCd>0) return false;
  const from = h.x; h.x = clamp(h.x + h.face*DASH.dist, 40, WORLD_W-40); h.dashCd = DASH.cd; h.recall = null; h.dashFx = 1; h.dashFrom = from;
  for (let i=0;i<14;i++) { const k=i/13; G.parts.push({x:lerp(from,h.x,k), y:cy(h)+rand(-25,25), vx:rand(-30,30), vy:rand(-40,10), t:0, life:rand(0.3,0.55), c:h.team?'#ffc8b8':'#d8f2ff', r:rand(2,4)}); }
  burst(h.x, cy(h), '#ffffff', 10); if (onScreen(h)) sfx('shoot'); return true; }
// 공용 귀환: 4초 채널링 후 기지로
function startRecall(h){ if (!h || h.respawn>0 || h.recall || !h.ground || h.stun>0) return false; if (nearBase(h)) { if (h===G.hero && !h.ai) addMsg('이미 기지 근처예요', '#ddd'); return false; }
  h.recall = {t:RECALL.time, t0:RECALL.time}; if (h===G.hero && !h.ai) addMsg('귀환 중... (움직이거나 공격받으면 취소)', '#c8f0ff'); return true; }
function useSkill(h, i) {
  if (!h || h.respawn>0 || h.stun>0 || h.cds[i]>0) return false;
  if (!skillOpen(h,i)) { if (h===G.hero && !h.ai) addMsg(`${h.d.skills[i].name}: 레벨 ${SKILL_LV[i]}에 해제됩니다`, '#ddd'); return false; }
  const cost = h.d.mana[i]; if (h.mp < cost) { if (h===G.hero && !h.ai) addMsg('마나가 부족합니다', '#9fc8ff'); return false; }
  const m = skillMul(h,i), f = h.face, k = h.key, rm = radMul(h);
  fx({kind:'charge', ent:h, life:0.32, c:['#ffd27a','#9fe0ff','#ffe066'][i], big:i===2});
  if (k==='bear') {
    if (i===0) { if (!h.ground) return false; h.vy = -560; h.ground=false; h.slam = {dmg:85*m, r:130*rm, stun:ccDur(h,0.6)}; }
    if (i===1) { h.shield = 3 + G.teams[h.team].skill[1]*0.5; burst(h.x, cy(h), '#ffcc33', 20); fx({kind:'bubble', ent:h, life:0.4}); }
    if (i===2) { h.dash = {t:0.38*Math.min(1.3, rm), vx:f*950, dmg:210*m, stun:ccDur(h,0.4), hit:new Set()}; shake=Math.max(shake,4); }
  } else if (k==='chick') {
    if (i===0) later(h, relT(h,'skill1'), () => { if (h.respawn>0) return; for (const a of [-0.18,0,0.18]) G.proj.push({kind:'arrow', x:h.x+f*20, y:cy(h)-6, vx:Math.cos(a)*f*760, vy:Math.sin(a)*760, team:h.team, owner:h, dmg:72*m, life:0.6*rangeMul(h), big:true}); });
    if (i===1) { h.traps = (h.traps||[]).filter(p=>!p.dead); if (h.traps.length>=2) { h.traps[0].dead = true; h.traps.shift(); }
      const tp = {kind:'trap', x:clamp(h.x+f*70, 40, WORLD_W-40), y:h.y, team:h.team, owner:h, dmg:70*m, r:48*rm, slow:ccDur(h,1.0)+0.8, root:ccDur(h,0.3), life:20, arm:0.5}; h.traps.push(tp); later(h, relT(h,'skill2'), () => { if (!tp.dead) G.proj.push(tp); }); }
    if (i===2) { const cx = h.x + f*260; later(h, relT(h,'ult'), () => G.proj.push({kind:'rain', x:cx, y:0, team:h.team, owner:h, dmg:42*m, life:2.2, tick:0, w:320*rm})); }
  } else if (k==='cat') {
    if (i===0) later(h, relT(h,'skill1'), () => { if (h.respawn>0) return; G.proj.push({kind:'ice', x:h.x+f*20, y:cy(h)-6, vx:f*620, vy:0, team:h.team, owner:h, dmg:115*m, life:0.7*rangeMul(h), slow:2}); });
    if (i===1) { let tx = h.x + f*200; const eh = G.teams[1-h.team].hero; if (isAlive(eh) && Math.abs(eh.x-h.x)<380 && Math.sign(eh.x-h.x)===f) tx = eh.x;
      const d2 = relT(h,'skill2'); later(h, d2, () => G.proj.push({kind:'circle', x:clamp(tx,40,WORLD_W-40), y:GROUND, team:h.team, owner:h, dmg:60*m, r:105*rm, root:ccDur(h,0.7), delay0:0.7-d2, life:0.7-d2+0.5})); }
    if (i===2) { let tx = h.x + f*280; const eh = G.teams[1-h.team].hero; if (isAlive(eh) && Math.abs(eh.x-h.x)<520) tx = eh.x;
      const d3 = relT(h,'ult'); fx({kind:'mark', x:tx, life:0.8, r:165*rm, c:'#ffe066'}); later(h, d3, () => G.proj.push({kind:'star', x0:tx-f*260, tx, ty:GROUND, team:h.team, owner:h, dmg:360*m, life:0.8-d3, t0:0.8-d3, r:165*rm, stun:ccDur(h,0.4)})); }
  }
  h.mp -= cost; h.recall = null;
  h.animAct=['skill1','skill2','ult'][i]; h.animSeq=(h.animSeq||0)+1; // characters/ 퍼펫 동작 트리거
  if (onScreen(h)) sfx('shoot');
  h.cds[i] = h.d.skills[i].cd * (1 - 0.1*G.teams[h.team].skill[i]);
  return true;
}
function doSlam(h) {
  const s = h.slam; h.slam = null; shake = Math.max(shake, 10); G.hitstop = 0.07; if (onScreen(h)) sfx('boom', 0.7);
  for (let i=0;i<26;i++) G.parts.push({x:h.x+rand(-s.r,s.r), y:h.y, vx:rand(-80,80), vy:rand(-300,-80), t:0, life:0.6, c:'#c9a46a', r:rand(3,6), g:true});
  G.parts.push({ring:true, x:h.x, y:h.y, t:0, life:0.35, r:s.r, c:'#ffe6a0'});
  fx({kind:'crack', x:h.x, y:h.y, r:s.r, life:0.9, seed:Math.random()*99}); fx({kind:'dust', x:h.x, y:h.y, r:s.r, life:0.7});
  for (const e of enemiesOf(h.team, {dragon:true})) if (Math.abs(e.x-h.x) < s.r+e.w/2 && Math.abs(e.y-h.y) < 90) damage(h, e, s.dmg, {stun:s.stun, pc:'#ffd27a'});
}

function updMinion(m, dt) {
  const mt = m.mt; const dir = m.team?-1:1;
  if (m.kbv) { m.x = clamp(m.x + m.kbv*dt, 30, WORLD_W-30); m.kbv*=Math.pow(0.03,dt); if (Math.abs(m.kbv)<15) m.kbv=0; }
  m.vy += 1650*dt; m.y += m.vy*dt; if (m.y>=GROUND) { m.y=GROUND; m.vy=0; }
  if (m.stun>0) return;
  m.cd -= dt;
  let tgt=null, bd=1e9;
  for (const e of enemiesOf(m.team)) {
    const dx = (e.x - m.x)*dir; if (dx < -40) continue;
    const reach = mt.range + e.w/2 + 6 + (m.ofs||0);
    if (e.kind==='hero' && Math.abs(cy(e)-cy(m)) > (mt.range>100? 200 : 60)) continue;
    const d = Math.abs(e.x-m.x) + (e.kind==='hero' ? 400 : 0); // 영웅보다 미니언/건물 우선
    if (Math.abs(e.x-m.x) <= reach && d < bd) { bd=d; tgt=e; }
  }
  if (tgt) {
    m.walking = false; m.face = Math.sign(tgt.x-m.x)||dir;
    if (m.cd <= 0) { m.cd = mt.as; m.swing = 1;
      const dmg = mt.atk * m.atkMul;
      if (m.mk==='ranged' || m.mk==='siege') G.proj.push({kind: m.mk==='siege'?'ball':'drop', elem:m.team, x:m.x+m.face*15, y:cy(m)-5, team:m.team, owner:m, target:tgt, dmg, spd:420, homing:true, aoe:m.mk==='siege'?50:0});
      else damage(m, tgt, dmg);
    }
  } else {
    m.walking = true; m.x += dir * mt.spd * (m.slow>0?0.55:1) * dt; m.face = dir;
  }
  m.swing = Math.max(0,(m.swing||0)-dt*4);
}
function updTower(t, dt) {
  t.cd -= dt; if (t.cd > 0) return;
  const R = TOWER.range + (t.lv-1)*15;
  const cands = enemiesOf(t.team).filter(e => Math.abs(e.x-t.x) < R && cy(e) > t.y - 360);
  if (!cands.length) return;
  cands.sort((a,b) => (a.kind==='hero')-(b.kind==='hero') || Math.abs(a.x-t.x)-Math.abs(b.x-t.x));
  const top = {x:t.x, y:t.y - t.h + 15};
  t.shotSeq = (t.shotSeq||0)+1; // 렌더러: 발사 반동/섬광
  if (t.branch==='rapid') { t.cd = TOWER.rapid.cd; const e=cands[0]; G.proj.push({kind:'arrow', x:top.x, y:top.y, team:t.team, owner:t, target:e, dmg:TOWER.rapid.dmg*(e.kind==='minion'?TOWER.rapid.minionMul:1), spd:800, homing:true}); return; }
  if (t.branch==='cannon') { t.cd = TOWER.cannon.cd; const e = cands.find(c=>c.kind==='hero') || cands.slice().sort((a,b)=>b.maxHp-a.maxHp)[0];
    G.proj.push({kind:'ball', big:true, x:top.x, y:top.y, team:t.team, owner:t, target:e, dmg:TOWER.cannon.dmg, spd:460, homing:true, aoe:TOWER.cannon.aoe, heroMul:TOWER.cannon.heroMul}); if (Math.abs(t.x-G.hero.x)<500) shake=Math.max(shake,3); return; }
  t.cd = TOWER.cd; const n = Math.min(t.lv, 3);
  for (let i=0;i<n;i++) { const e = cands[Math.min(i, cands.length-1)];
    G.proj.push({kind:'arrow', x:top.x+(i-1)*10, y:top.y, team:t.team, owner:t, target:e, dmg:TOWER.dmg[0]*(1+0.15*(t.lv-1)), spd:700, homing:true, delay:i*0.06}); }
}
function updBase(b, dt) {
  const st = G.teams[b.team].stage;
  if (st >= 2) { b.rockT -= dt; if (b.rockT<=0) { const e = enemiesOf(b.team).filter(e=>Math.abs(e.x-b.x)<BASE.rockRange).sort((a,c)=>Math.abs(a.x-b.x)-Math.abs(c.x-b.x))[0];
    if (e) { b.rockT = BASE.rockCd; b.shotSeq = (b.shotSeq||0)+1; G.proj.push({kind:'rock', x:b.x, y:b.y-b.h+20, team:b.team, owner:b, target:e, dmg:BASE.rockDmg*(1+0.25*(st-2)), spd:480, homing:true, aoe:40}); } } }
}
function updDragon(d, dt) {
  d.y = d.homeY - 10 - Math.sin(d.anim*2)*8;
  d.cd -= dt; if (d.cd>0) return;
  const tgts = G.ents.filter(e => e.kind==='hero' && isAlive(e) && Math.abs(e.x-d.x) < 320 && (G.t-(d.aggro&&d.aggro[e.team]||-99) < 5 || e.y < GROUND-60)); // 공격한 영웅/발판 위 영웅만 공격
  if (tgts.length) { d.cd = 1.6; d.face = Math.sign(tgts[0].x-d.x)||1; for (const t of tgts) G.proj.push({kind:'wind', x:d.x, y:cy(d), team:2, owner:d, target:t, dmg:DRAGON.atk + G.t*0.08, spd:420, homing:true}); }
  else { d.cd = 0.5; d.hp = Math.min(d.maxHp, d.hp + d.maxHp*0.03); }
}

function updProj(dt) {
  for (const p of G.proj) {
    if (p.delay>0) { p.delay -= dt; continue; }
    if (p.kind==='trap') { p.life -= dt; p.arm -= dt; if (p.life<=0 || p.owner.respawn>0 && false) p.dead = true;
      if (p.arm<=0) for (const e of enemiesOf(p.team)) if ((e.kind==='hero'||e.kind==='minion') && Math.abs(e.x-p.x) < p.r+e.w/2 && Math.abs(e.y-p.y) < 40) {
        p.dead = true; for (const e2 of enemiesOf(p.team)) if ((e2.kind==='hero'||e2.kind==='minion') && Math.abs(e2.x-p.x) < p.r*1.6+e2.w/2 && Math.abs(e2.y-p.y) < 60) damage(p.owner, e2, p.dmg, {slow:p.slow, root:p.root, pc:'#ffd84a', color:'#ffe680'});
        fx({kind:'snap', x:p.x, y:p.y, r:p.r*1.6, life:0.5}); burst(p.x, p.y-10, '#ffd84a', 10); if (onScreen(p)) sfx('click', 1);
        // 꿀 덫 연출: 덫이 튀어 오르며 닫히고 꿀이 사방으로 튐 / 걸린 적은 끈적 상태(발밑 웅덩이·떨림·발자국)
        const sp = []; for (let i=0;i<14;i++) sp.push({vx:rand(-170,170), vy:rand(160,360), r:rand(2.5,5.5)});
        (G.goo = G.goo||[]).push({kind:'trap', x:p.x, y:p.y, t:0, life:1.6, sp});
        for (const e2 of enemiesOf(p.team)) if ((e2.kind==='hero'||e2.kind==='minion') && Math.abs(e2.x-p.x) < p.r*1.6+e2.w/2 && Math.abs(e2.y-p.y) < 60) { e2.gooT = Math.max(e2.gooT||0, p.slow); e2.gooX = e2.x; }
        break; }
      continue; }
    if (p.kind==='circle') { p.life -= dt; p.delay0 -= dt;
      if (p.delay0<=0 && !p.fired) { p.fired = true; fx({kind:'bind', x:p.x, y:p.y, r:p.r, life:0.6}); shake = Math.max(shake, 4); if (onScreen(p)) sfx('boom', 0.5);
        for (const e of enemiesOf(p.team, {dragon:true})) if (Math.abs(e.x-p.x) < p.r+e.w/2 && Math.abs(e.y-p.y) < 70) damage(p.owner, e, p.dmg, {root:p.root, pc:'#c9a0ff', color:'#d9b8ff'}); }
      if (p.life<=0) p.dead = true; continue; }
    if (p.kind==='rain') { p.life -= dt; p.tick -= dt; G.parts.push({arrowfx:true, x:p.x+rand(-p.w/2,p.w/2), y:rand(-20,100), vx:-30, vy:900, t:0, life:0.4, c:'#fff'});
      if (Math.random() < dt*14) fx({kind:'shaft', x:p.x+rand(-p.w/2,p.w/2), life:0.35});
      if (p.tick<=0) { p.tick = 0.22; for (const e of enemiesOf(p.team, {dragon:true})) if (Math.abs(e.x-p.x) < p.w/2) { damage(p.owner, e, p.dmg, {pc:'#fff'}); fx({kind:'spark', x:e.x, y:cy(e), life:0.25}); } }
      if (p.life<=0) p.dead=true; continue; }
    if (p.kind==='star') { p.life -= dt; const k = clamp(1 - p.life/p.t0, 0, 1);
      p.cx = lerp(p.x0, p.tx, k); p.cy = lerp(-60, p.ty-20, k*k);
      G.parts.push({x:p.cx, y:p.cy, vx:rand(-40,40), vy:rand(-40,40), t:0, life:0.5, c: Math.random()<0.5?'#fff3a0':'#ffd23f', r:rand(3,7)});
      if (p.life<=0) { p.dead=true; shake=Math.max(shake,14); G.hitstop=0.08; sfx('boom',1); burst(p.tx, GROUND-30, '#ffe066', 60); G.parts.push({ring:true, x:p.tx, y:GROUND-20, t:0, life:0.45, r:170, c:'#fff3a0'});
        fx({kind:'boom', x:p.tx, y:GROUND, r:p.r||165, life:0.7}); if (onScreen({x:p.tx})) fx({kind:'flash', life:0.18});
        for (const e of enemiesOf(p.team, {dragon:true})) if (Math.abs(e.x-p.tx) < (p.r||165)+e.w/2 && cy(e) > GROUND-300) damage(p.owner, e, p.dmg, {stun:p.stun||0.4, color:'#ffe066', pc:'#ffe066'}); }
      continue; }
    if (p.homing) {
      const t = p.target; if (!t || !isAlive(t)) { p.dead = true; continue; }
      const tx = t.x, ty = cy(t); const dx=tx-p.x, dy=ty-p.y, d=Math.hypot(dx,dy);
      const step = p.spd*dt; p.ang = Math.atan2(dy,dx);
      if (d <= step+8) { p.dead = true;
        const mul = p.heroMul && (t.kind==='hero' || t.mk==='siege') ? p.heroMul : 1;
        const pcol = {orb:'#c9b3ff', rock:'#a89f91', ball:'#555', drop: p.elem?'#ff9a4a':'#7fd0ff', wind:'#d8fff0', arrow:'#fff6c0'}[p.kind];
        damage(p.owner, t, p.dmg*mul, {pc:pcol, crit:p.crit});
        if (p.aoe) { for (const e of enemiesOf(p.team, {dragon:p.owner.kind==='hero'})) if (e!==t && Math.abs(e.x-t.x) < p.aoe && Math.abs(cy(e)-ty)<p.aoe+30) damage(p.owner, e, p.dmg*0.6*mul, {pc:pcol});
          if (p.big) { if (onScreen(t)) sfx('boom',0.5); G.parts.push({ring:true, x:t.x, y:ty, t:0, life:0.3, r:p.aoe, c:'#ffb070'}); burst(t.x, ty, '#ffb070', 14); } }
      } else { p.x += dx/d*step; p.y += dy/d*step; }
      continue;
    }
    p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.ang = Math.atan2(p.vy, p.vx);
    if (p.kind==='ice' && Math.random()<0.6) G.parts.push({x:p.x, y:p.y, vx:rand(-30,30), vy:rand(-30,30), t:0, life:0.35, c:'#bfeaff', r:rand(2,4)});
    for (const e of enemiesOf(p.team, {dragon:true})) if (Math.abs(e.x-p.x) < e.w/2+8 && Math.abs(cy(e)-p.y) < e.h/2+10) {
      damage(p.owner, e, p.dmg, {slow:p.slow||0, pc: p.kind==='ice'?'#bfeaff':'#fff6c0', color: p.kind==='ice'?'#bfeaff':undefined}); p.dead = true; break; }
    if (p.life<=0) p.dead = true;
  }
  G.proj = G.proj.filter(p=>!p.dead);
}

// ================= 상점 / 타워 =================
function shopItems(team) {
  const tm = G.teams[team], h = tm.hero, items = [];
  items.push({id:'weapon', name:`무기 강화 Lv.${tm.weapon}→${tm.weapon+1}`, desc:'기본 공격력 +12%', cost: SHOP.weapon[tm.weapon], max: tm.weapon>=5});
  for (let i=0;i<3;i++) items.push({id:'skill'+i, name:`${h.d.skills[i].name} Lv.${tm.skill[i]}→${tm.skill[i]+1}`, desc:'스킬 피해 +25%, 쿨다운 -10%', cost: SHOP.skill[tm.skill[i]], max: tm.skill[i]>=3});
  items.push({id:'base', name: tm.stage>=4 ? '기지: 동물 왕국 성 (최대)' : `기지 강화: ${BASE.names[tm.stage+1]}`, desc:['체력↑, 미니언 생성 빨라짐','돌 던지기 시작!','공성 미니언 생성!','가끔 보스 미니언 출현!'][tm.stage]||'최대 단계', cost: BASE.cost[tm.stage+1], max: tm.stage>=4});
  return items;
}
function buy(team, id) {
  const tm = G.teams[team]; const it = shopItems(team).find(i=>i.id===id); if (!it || it.max || tm.gold < it.cost) return false;
  tm.gold -= it.cost;
  if (id==='weapon') tm.weapon++;
  else if (id.startsWith('skill')) tm.skill[+id[5]]++;
  else if (id==='base') { tm.stage++; const b=tm.base; const add = BASE.hp[tm.stage]-b.maxHp; b.maxHp += add; b.hp += add; burst(b.x, cy(b), '#ffe066', 40);
    G.waveT[team] = Math.min(G.waveT[team], BASE.wave[tm.stage]);
    if (team===1) addMsg(`적 기지가 ${BASE.names[tm.stage]}(으)로 강화되었습니다`, '#ffb0a0'); }
  if (team===0) burst(G.hero.x, cy(G.hero), '#ffd23f', 12);
  return true;
}
function towerOptions(slot) {
  const t = slot.tower;
  if (!t) return slot.ruinT>0 ? [] : [{id:'build', name:'타워 건설', cost:TOWER.cost[0]}];
  if (t.lv===1) return [{id:'up', name:'Lv.2 (화살 2발)', cost:TOWER.cost[1]}];
  if (t.lv===2) return [{id:'up', name:'Lv.3 (부채꼴 3발)', cost:TOWER.cost[2]}];
  if (t.lv===3) return [{id:'rapid', name:'연발 화살 타워', cost:TOWER.cost[3]}, {id:'cannon', name:'대포 타워', cost:TOWER.cost[3]}];
  return [];
}
function towerAct(slot, id) {
  const tm = G.teams[slot.team]; const op = towerOptions(slot).find(o=>o.id===id); if (!op || tm.gold < op.cost) return false;
  tm.gold -= op.cost;
  if (id==='build') buildTower(slot);
  else { const t = slot.tower; t.lv++; if (id==='rapid'||id==='cannon') t.branch=id; const add = TOWER.hp[t.lv-1]-t.maxHp; t.maxHp+=add; t.hp+=add; }
  burst(slot.x, GROUND-60, '#ffe066', 24);
  return true;
}
function anyAffordable(team) { const g = G.teams[team].gold; return shopItems(team).some(i=>!i.max && g>=i.cost); }
function slotAffordable(slot){ const o = towerOptions(slot); return o.length && G.teams[slot.team].gold >= o[0].cost; }

// ================= AI =================
function aiThink(h, dt) {
  const ai = h.ai, tm = G.teams[h.team], dir = h.team?-1:1, easy = ai.diff==='easy';
  ai.think -= dt; ai.skillT -= dt; ai.shopT -= dt; ai.jumpCd -= dt;
  const foe = G.teams[1-h.team].hero;
  if (ai.shopT <= 0 && nearBase(h)) { ai.shopT = easy ? 1.2 : 0.5; aiShop(h); } // 상점은 기지 근처에서만
  if (h.recall) { h.inputX = 0; return; }   // 귀환 채널링 중엔 가만히
  if (ai.think <= 0) {
    ai.think = easy ? 0.45 : 0.25; ai.thinkStep = ai.think; if (!G.ents.some(e=>e.kind==='dragon')) ai.dragonT = 0;
    const hpP = h.hp/h.maxHp;
    const allies = G.ents.filter(e=>e.kind==='minion'&&!e.dead&&e.team===h.team);
    const front = allies.length ? allies.reduce((a,b)=> (b.x*dir > a.x*dir ? b : a)) : null;
    const dragon = G.ents.find(e=>e.kind==='dragon'&&!e.dead);
    const mpP = h.mp/h.maxMp, farHome = Math.abs(h.x-tm.base.x) > 900;
    // 쇼핑 귀환: 골드가 충분히 쌓였고(큰 구매 가능) 라인이 안전할 때만. 기지 근처를 지나가면 그냥 산다.
    const laneSafe = !(isAlive(foe) && Math.abs(foe.x-h.x) < 900) && !G.ents.some(e=>e.kind==='minion'&&!e.dead&&e.team!==h.team&&Math.abs(e.x-tm.base.x)<1300);
    const wantShop = anyAffordable(h.team) && tm.gold >= (easy ? 1100 : 800) && laneSafe && farHome;
    const foeNear = isAlive(foe) && Math.abs(foe.x-h.x) < 650;
    const threat = foeNear || enemiesOf(h.team).some(e=>e.kind!=='base' && Math.abs(e.x-h.x) < 320);
    if (hpP < (easy?0.22:0.3)) ai.mode = 'retreat';
    else if (ai.mode==='retreat' && (hpP < 0.75 || G.t-(h.lastDmg||0) < 2) && !(nearBase(h) && hpP > 0.9)) ai.mode = 'retreat';
    else if (ai.mode==='home' && nearBase(h) && (hpP < 0.9 || mpP < 0.75)) ai.mode = 'home';   // 기지에서 회복·쇼핑
    else if (!nearBase(h) && (wantShop || (mpP < 0.12 && hpP < 0.6)) && !(foeNear && hpP > foe.hp/foe.maxHp + 0.2)) ai.mode = 'home';
    else if (dragon && !easy && h.lv>=ULT_LV && (ai.mode==='dragon' ? hpP>0.45 : hpP>0.75) && (ai.dragonT||0) < 25 && (!isAlive(foe) || Math.abs(foe.x-dragon.x)>900 || (ai.mode==='dragon' && hpP > foe.hp/foe.maxHp) || dragon.hp < dragon.maxHp*0.35)) { ai.mode='dragon'; ai.dragonT=(ai.dragonT||0)+ai.thinkStep; }
    else ai.mode = 'lane';
    let gx;
    if (ai.mode==='retreat' || ai.mode==='home') { gx = tm.base.x;
      if (!nearBase(h) && Math.abs(h.x-tm.base.x) > 600 && !threat && G.t-(h.lastDmg||0) > 1.5 && h.ground) { startRecall(h); h.inputX = 0; ai.gx = h.x; return; } }
    else if (ai.mode==='dragon') gx = dragon.x;
    else {
      const enemyT = G.ents.filter(e=>(e.kind==='tower')&&!e.dead&&e.team!==h.team).map(e=>e.x);
      // 미니언 웨이브와 함께 밀기. 웨이브가 없으면 아군 마지막 타워 근처에서 대기(후반엔 웨이브를 기다렸다 같이 진격)
      const myT = G.ents.filter(e=>e.kind==='tower'&&!e.dead&&e.team===h.team).map(e=>e.x).sort((a,b)=>(b-a)*dir);
      const hold = myT.length ? myT[0] - dir*60 : tm.base.x + dir*500;
      gx = front && (front.x - hold)*dir > -200 ? front.x - dir*(h.d.proj? 110 : 30) : hold;
      const eStruct = G.ents.filter(e=>(e.kind==='tower'||e.kind==='base')&&!e.dead&&e.team!==h.team).sort((a,b)=>(a.x-b.x)*dir)[0];
      if (eStruct && front && Math.abs(front.x-eStruct.x) < TOWER.range && hpP > 0.4) gx = eStruct.x - dir*(heroRange(h)*0.8 + eStruct.w/2); // 미니언이 탱킹 중이면 건물 공격
      if (isAlive(foe) && Math.abs(foe.x-h.x) < 420 && (hpP > foe.hp/foe.maxHp - 0.15)) gx = foe.x - dir*(h.d.proj? heroRange(h)*0.8 : 30);
      if (!isAlive(foe) && front) gx = front.x + dir*20; // 적 영웅이 없으면 밀어붙이기
      const eb = G.teams[1-h.team].base;
      if (!enemyT.length && hpP > 0.5 && (!isAlive(foe) || Math.abs(foe.x-eb.x) > 500 || hpP > foe.hp/foe.maxHp)) gx = eb.x - dir*(heroRange(h)*0.7 + 60); // 타워가 없으면 기지 공격
      for (const tx of enemyT) { const safe = tx - dir*(TOWER.range+30); const minionsAtTower = allies.some(a=>Math.abs(a.x-tx)<TOWER.range+40); if (!minionsAtTower && (gx-safe)*dir > 0) gx = safe; }
    }
    ai.gx = clamp(gx, 60, WORLD_W-60); ai.gy = ai.mode==='dragon' ? ((G.plats.find(p=>p.center)||{}).y ?? dragon.y) : GROUND;
    // 라인 발판 활용: 원거리 영웅은 싸우는 곳 근처 발판(높은 곳)에 올라가 쏘고, 근접은 적 영웅이 발판 위에 있으면 따라 올라감
    if (ai.mode==='lane') {
      const fUp = isAlive(foe) && foe.ground && foe.y < GROUND-40 && Math.abs(foe.x-h.x) < 500 ? G.plats.find(p=>Math.abs(foe.y-p.y)<2 && foe.x>p.x-8 && foe.x<p.x+p.w+8) : null;
      const lp = fUp && !h.d.proj ? fUp : h.d.proj && (hpP > 0.45) ? G.plats.filter(p=>!p.center && Math.abs(p.x+p.w/2-ai.gx) < p.w/2+60).sort((a,b)=>Math.abs(a.x+a.w/2-ai.gx)-Math.abs(b.x+b.w/2-ai.gx))[0] : null;
      if (lp) { ai.gx = clamp(fUp && !h.d.proj ? foe.x : ai.gx, lp.x+24, lp.x+lp.w-24); ai.gy = lp.y; }
    }
  }
  const dx = ai.gx - h.x;
  h.inputX = Math.abs(dx) > 25 ? Math.sign(dx) : 0;
  if (h.ground) {
    if (h.blocked && ai.jumpCd<=0) aiJump(h);
    else if (h.y > ai.gy + 30) aiClimb(h, ai, ai.jumpCd<=0);  // 이동은 항상 경로대로, 점프는 쿨이 끝났을 때만
  }
  h.blocked = false;
  if (ai.skillT <= 0) {
    ai.skillT = easy ? 0.9 : 0.4;
    if (easy && Math.random() < 0.5) return;
    const near = enemiesOf(h.team, {dragon:true}).filter(e => Math.abs(e.x-h.x) < 380 && Math.abs(cy(e)-cy(h))<150 && e.kind!=='base' && e.kind!=='tower');
    const fh = near.find(e=>e.kind==='hero'); const fd = fh ? Math.abs(fh.x-h.x) : 1e9;
    const k = h.key, of = h.face;
    if (fh) h.face = Math.sign(fh.x-h.x)||h.face; else if (near.length) h.face = Math.sign(near[0].x-h.x)||h.face;
    let used = false;
    if (k==='bear') {
      if (fd < 140 || near.filter(e=>Math.abs(e.x-h.x)<130).length>=3) used = useSkill(h,0) || used;
      if (h.hp/h.maxHp<0.6 && near.length) used = useSkill(h,1) || used;
      if (fh && fd < 300) used = useSkill(h,2) || used;
    } else if (k==='chick') {
      if ((fh && fd < 330) || near.length>=3) used = useSkill(h,0) || used;
      if (fh && fd < 220 && Math.sign(fh.x-h.x)===h.face) used = useSkill(h,1) || used;   // 다가오는 적 앞에 덫
      if ((fh && fd < 360) || near.length>=4) used = useSkill(h,2) || used;
    } else {
      if ((fh && fd < 330) || near.length>=3) used = useSkill(h,0) || used;
      if (fh && fd < 360) used = useSkill(h,1) || used;   // 속박 마법진: 적 영웅 발밑
      if ((fh && fd < 450) || near.length>=4) used = useSkill(h,2) || used;
    }
    // 공용 대시: 도망치거나 빈사 상태 적 추격
    if (fh && h.dashCd<=0 && !easy) {
      if (ai.mode==='retreat' && fd < 220) { h.face = h.team?1:-1; used = doDash(h) || used; }
      else if (fh.hp/fh.maxHp < 0.25 && fd > 160 && fd < 360 && h.hp/h.maxHp > 0.4) { h.face = Math.sign(fh.x-h.x)||h.face; used = doDash(h) || used; }
    }
    if (!used) h.face = of;
    if (!easy && tm.wardCd<=0 && Math.random()<0.2) placeWard(h);
  }
}
// 발판 오르기: 목표 발판(ai.gx, ai.gy)까지 한 번에 닿지 않으면 중간 발판을 거침.
// 발판 아래면 제자리 점프, 옆이면 가장자리까지 걸어가 달리며 점프 (점프 최고 ≈124px, 공중 이동 ≈ 속도×0.5초)
const JUMP_UP = 115;
function platAt(x, y){ return G.plats.find(p => Math.abs(y-p.y) < 3 && x > p.x-8 && x < p.x+p.w+8); }
function aiClimb(h, ai, canJump) {
  const tgt = platAt(ai.gx, ai.gy) || G.plats.filter(p=>Math.abs(p.y-ai.gy)<3).sort((a,b)=>Math.abs(a.x+a.w/2-ai.gx)-Math.abs(b.x+b.w/2-ai.gx))[0];
  if (!tgt) return;
  let next = tgt;
  if (h.y - tgt.y > JUMP_UP) { // 중간 발판: 지금 닿고, 거기서 목표에 닿는 것 중 가까운 것
    const mids = G.plats.filter(p => p !== tgt && p.y < h.y-20 && h.y-p.y <= JUMP_UP && p.y-tgt.y <= JUMP_UP && p.y > tgt.y);
    next = mids.sort((a,b)=>Math.abs(a.x+a.w/2-h.x)+Math.abs(a.x+a.w/2-ai.gx)*0.5-Math.abs(b.x+b.w/2-h.x)-Math.abs(b.x+b.w/2-ai.gx)*0.5)[0];
    if (!next) return;
  }
  const cur = h.y < GROUND-1 ? platAt(h.x, h.y) : null;   // 지금 서 있는 발판 (땅이면 null)
  const lo = cur ? Math.max(cur.x, next.x) : next.x, hi = cur ? Math.min(cur.x+cur.w, next.x+next.w) : next.x+next.w;
  if (hi - lo > 40) { // 아래에서 올라갈 수 있음 (발판은 아래에서 통과): 겹치는 곳 밑으로 가서 제자리 점프
    const px = clamp(h.x, lo+18, hi-18);
    if (Math.abs(px-h.x) < 14) { if (canJump) aiJump(h); h.inputX = 0; } else h.inputX = Math.sign(px-h.x);
    return;
  }
  // 겹치지 않음 (발판 → 옆 발판): 내 발판 끝까지 달려가 끝에서 점프
  const d = Math.sign(next.x+next.w/2-h.x); h.inputX = d;
  const myEdge = d > 0 ? cur.x+cur.w : cur.x;
  if (Math.abs(myEdge-h.x) < 10) { if (canJump && !(h.atkLock>0)) { aiJump(h); h.climbAir = true; } else h.inputX = 0; } // 쿨 중이면 끝에서 기다림 (떨어지지 않게)
}
function aiJump(h){ if (h.root>0) return; h.vy = -640*(G.teams[h.team].buffT>0?DBUF().jump:1); h.ground=false; h.ai.jumpCd=0.5; }
function aiShop(h) {
  const tm = G.teams[h.team], easy = h.ai.diff==='easy';
  const order = [];
  if (tm.stage < 1) order.push(()=>buy(h.team,'base'));
  order.push(()=>buy(h.team,'weapon'));
  const empty = G.slots.filter(s=>s.team===h.team && !s.tower).sort((a,b)=>Math.abs(a.x-tm.base.x)-Math.abs(b.x-tm.base.x));
  if (empty.length && !easy) order.push(()=>towerAct(empty[empty.length-1], 'build'));
  if (h.lv>=ULT_LV) order.push(()=>buy(h.team,'skill2'));
  order.push(()=>buy(h.team,'skill0'));
  order.push(()=>buy(h.team,'base'));
  const tws = G.slots.filter(s=>s.team===h.team && s.tower && s.tower.lv<4);
  if (tws.length) { const s = tws[0]; order.push(()=>towerAct(s, s.tower.lv===3 ? (Math.random()<0.5?'rapid':'cannon') : 'up')); }
  order.push(()=>buy(h.team,'skill1'));
  if (empty.length) order.push(()=>towerAct(empty[0], 'build'));
  if (easy && tm.gold < 600) return; // 쉬움: 골드를 모아두다 늦게 씀
  for (const f of order) if (f()) break;
}
function placeWard(h) {
  const tm = G.teams[h.team]; if (tm.wardCd>0 || h.respawn>0) return;
  tm.wardCd = 25; h.wards = h.wards.filter(w=>!w.dead); if (h.wards.length>=2) { h.wards[0].dead=true; h.wards.shift(); }
  const w = ent({kind:'ward', team:h.team, x:h.x, y:h.y, w:16, h:28, hp:1}); w.life = 90; h.wards.push(w);
  if (h===G.hero) addMsg('와드 설치! 주변 적이 미니맵에 표시됩니다', '#c8f7ff');
}

// ================= 입력 =================
let joy = {active:false, id:null, x0:0, y0:0, x:0};
function toLogical(e){ const r = cv.getBoundingClientRect(); return { x:(e.clientX-r.left)/r.width*VW, y:(e.clientY-r.top)/r.height*VIEW_H }; }
function btnLayout() {
  // 가로 모드 엄지 영역: 오른쪽 아래 부채꼴 (점프 > 스킬 > 대시/와드/귀환), 겹치지 않게 배치
  return { jump:{x:VW-60, y:386, r:34}, s0:{x:VW-144, y:410, r:27}, s1:{x:VW-140, y:333, r:27}, s2:{x:VW-68, y:298, r:29},
    dash:{x:VW-222, y:398, r:24}, ward:{x:VW-214, y:322, r:20}, recall:{x:VW-292, y:418, r:21}, build:{x:VW-300, y:342, r:24},
    shop:{x:VW-48, y:32, r:22}, score:{x:VW-280, y:34, r:15} };
}
// 터치 입력: 조이스틱 영역(왼쪽 아래)에서 시작한 터치는 끝날 때까지 조이스틱 전용. 월드 탭(타워 자리)은 짧은 탭(<220ms, <10px)일 때만 손을 뗄 때 처리
let downTS = 0; const TAP_MS = Q.has('tapms') ? +Q.get('tapms') : 220;  // 디버그: ?tapms= (느린 헤드리스 테스트용)  // 입력 이벤트 시각(e.timeStamp) 기준으로 탭 길이 측정
const touches = new Map();   // pointerId → {x0,y0,t0,moved,kind:'joy'|'tap'|'ui'}
function inJoyZone(p, type){ return type==='mouse' ? (p.x < 240 && p.y > VIEW_H-200) : (p.x < VW*0.45 && p.y > VIEW_H*0.38); }
cv.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); try { cv.setPointerCapture(e.pointerId); } catch(_){} downTS = e.timeStamp; onDown(toLogical(e), e.pointerId, e.pointerType); }, {passive:false});
cv.addEventListener('pointermove', e => { const p = toLogical(e), t = touches.get(e.pointerId);
  if (t && Math.hypot(p.x-t.x0, p.y-t.y0) > 10) t.moved = true;
  if (joy.active && joy.id===e.pointerId) joy.x = p.x; });
const upH = e => { const t = touches.get(e.pointerId); touches.delete(e.pointerId);
  if (joy.id===e.pointerId) { joy.active=false; joy.id=null; }
  if (e.type==='pointerup' && t && t.kind==='tap' && !t.moved && e.timeStamp-t.t0 < TAP_MS) worldTap(toLogical(e));
  if (e.type==='pointerup' && t && t.kind==='ui' && !t.moved && e.timeStamp-t.t0 < 600) t.fn(); };
cv.addEventListener('pointerup', upH); cv.addEventListener('pointercancel', upH);
addEventListener('contextmenu', e=>e.preventDefault());
addEventListener('keydown', e => { audioInit(); keys[e.code]=true; if (e.code==='KeyM') toggleMute(); if (!e.repeat) onKey(e.code); if (['Space','ArrowUp','ArrowDown','Tab'].includes(e.code)) e.preventDefault(); });
addEventListener('keyup', e => { keys[e.code]=false; });
function inC(p, b, extra=0){ return Math.hypot(p.x-b.x, p.y-b.y) <= b.r+extra; }
function inRect(p, r){ return p.x>=r.x && p.x<=r.x+r.w && p.y>=r.y && p.y<=r.y+r.h; }
let uiRects = [];
function onDown(p, id, type='touch') {
  if (joy.active && joy.id===id) return;
  for (const u of uiRects) if (inRect(p, u.r)) { if (u.tap) touches.set(id, {x0:p.x, y0:p.y, t0:downTS, kind:'ui', fn:u.fn}); else u.fn(); return; }
  if (scene==='title') { if (window.LRFS) LRFS.firstTap(); if (sceneT>0.3) { scene='select'; sceneT=0; } return; }
  if (scene!=='match' || G.over) return;
  if (G.shopOpen) { G.shopOpen=false; return; }
  if (G.scoreOpen) { G.scoreOpen=false; return; }
  const B = btnLayout();
  if (inC(p,B.shop,6)) { openShop(); return; }
  if (inC(p,B.score,8)) { G.scoreOpen = true; G.popup=null; return; }
  if (inC(p,B.dash,6)) { if (!G.hero.ai) doDash(G.hero); return; }
  if (inC(p,B.recall,6)) { if (!G.hero.ai) startRecall(G.hero); return; }
  if (inC(p,B.jump,10)) { doJump(); return; }
  if (inC(p,B.s0,6)) { useSkill(G.hero,0); return; }
  if (inC(p,B.s1,6)) { useSkill(G.hero,1); return; }
  if (inC(p,B.s2,6)) { useSkill(G.hero,2); return; }
  if (inC(p,B.ward,6)) { placeWard(G.hero); return; }
  if (inC(p,B.build,6) && buildSlot()) { toggleBuild(); return; }
  if (inJoyZone(p, type)) { if (!joy.active) joy = {active:true, id, x0:p.x, y0:p.y, x:p.x}; touches.set(id, {x0:p.x, y0:p.y, t0:downTS, kind:'joy'}); return; }
  touches.set(id, {x0:p.x, y0:p.y, t0:downTS, kind:'tap'});
}
// 짧은 탭으로만 타워 자리 선택 (드래그 끝/조이스틱 터치는 무시)
function worldTap(p) {
  if (scene!=='match' || !G || G.over || G.shopOpen || G.scoreOpen) return;
  const wx = p.x + G.camX;
  for (const s of G.slots) if (s.team===0 && Math.abs(wx - s.x) < 50 && p.y > GROUND-150 && p.y < GROUND+10 && towerOptions(s).length) { G.popup = {slot:s}; return; }
  G.popup = null;
}
// 영웅 근처(아군) 타워 자리 → '건설/강화' 버튼
function buildSlot() { const h = G && G.hero; if (!h || h.respawn>0) return null; let best=null, bd=90;
  for (const s of G.slots) if (s.team===0 && towerOptions(s).length) { const d = Math.abs(s.x-h.x); if (d<bd) { bd=d; best=s; } } return best; }
function toggleBuild() { const s = buildSlot(); if (!s) return; G.popup = (G.popup && G.popup.slot===s) ? null : {slot:s}; }
function onKey(c) {
  if (scene==='title' && (c==='Space'||c==='Enter')) { scene='select'; sceneT=0; return; }
  if (scene==='select') { const ks=Object.keys(HEROES); const i=ks.indexOf(selHero);
    if (c==='Space'||c==='Enter') startMatch();
    if (c==='ArrowLeft'||c==='KeyA') selHero=ks[(i+2)%3]; if (c==='ArrowRight'||c==='KeyD') selHero=ks[(i+1)%3]; return; }
  if (scene==='result' && (c==='Space'||c==='Enter')) { scene='title'; sceneT=0; return; }
  if (scene!=='match' || G.over) return;
  if (c==='Space'||c==='KeyW'||c==='ArrowUp'||c==='KeyK') doJump();
  if (c==='KeyQ'||c==='KeyJ'||c==='Digit1') useSkill(G.hero,0);
  if (c==='KeyE'||c==='KeyL'||c==='Digit2') useSkill(G.hero,1);
  if (c==='KeyR'||c==='KeyI'||c==='Digit3') useSkill(G.hero,2);
  if (c==='KeyF') placeWard(G.hero);
  if (c==='KeyT') toggleBuild();
  if (c==='KeyP') { if (G.shopOpen) G.shopOpen=false; else openShop(); }
  if (c==='KeyB' && !G.hero.ai) startRecall(G.hero);
  if ((c==='ShiftLeft'||c==='ShiftRight'||c==='KeyG') && !G.hero.ai) doDash(G.hero);
  if (c==='Tab') { G.scoreOpen = !G.scoreOpen; G.popup=null; }
  if (c==='ArrowDown'||c==='KeyS') G.hero.dropT = 0.25;
  if (c==='Escape') { G.shopOpen=false; G.scoreOpen=false; G.popup=null; }
}
function openShop(){ if (!nearBase(G.hero)) { addMsg('상점은 기지 근처에서만! 귀환(B)하거나 기지로 걸어가세요', '#ffd9a0'); return; } G.shopOpen = true; G.popup = null; }
function doJump(){ const h = G.hero; if (h.respawn>0 || h.stun>0 || h.root>0 || h.ai) return; if (h.ground) { h.vy = -640*(G.teams[0].buffT>0?DBUF().jump:1); h.ground=false; for(let i=0;i<6;i++) G.parts.push({x:h.x, y:h.y, vx:rand(-90,90), vy:rand(-60,0), t:0, life:0.35, c:'#e8ffe0', r:3}); } }
function playerInput(h) {
  let ix = 0;
  if (keys.ArrowLeft||keys.KeyA) ix -= 1; if (keys.ArrowRight||keys.KeyD) ix += 1;
  if (joy.active) { const d = joy.x - joy.x0; if (Math.abs(d) > 10) ix = Math.sign(d); }
  h.inputX = ix;
}

// ================= 씬 전환 =================
function startMatch(){ if (window.R3D) { R3D.hideMenuHeroes(); R3D.clearMeshes(); } newMatch(selHero); scene='match'; sceneT=0; uiRects=[]; }
function endMatch(win) {
  if (G.over) return; G.over = true;
  const matches = store.get('matches',0)+1; store.set('matches', matches);
  const gain = (win?150:60) + G.hero.kills*15 + Math.floor(G.stats.cs*1.5) + Math.floor(G.t/10);
  const before = store.get('accxp',0); store.set('accxp', before+gain);
  const lb = accLevelInfo(before).lv, la = accLevelInfo(before+gain).lv;
  if (win) store.set('wins', store.get('wins',0)+1);
  store.set('coins', store.get('coins',0) + Math.round(gain*0.6)); // 계정 골드 (로비 표시)
  result = { win, gain, lvUp: la>lb, lv:la, time:G.t, kills:G.hero.kills, deaths:G.hero.deaths, cs:G.stats.cs, diff:G.diff };
  addMsg(win ? '적 기지 파괴! 승리!' : '아군 기지가 무너졌습니다...', win?'#ffe066':'#ff8a8a');
  setTimeout(()=>{ scene='result'; sceneT=0; uiRects=[]; }, 2000);
}

// ================= 렌더 =================
function drawSprite(name, x, y, h, flip, o={}) {
  const im = IMG[name]; if (!im || !im.complete || !im.naturalWidth) return;
  const w = im.width * h / im.height; const sx = o.sx||1, sy = o.sy||1;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale((flip?-1:1)*sx, sy);
  if (o.alpha!=null) ctx.globalAlpha = o.alpha;
  ctx.drawImage(im, -w/2, -h, w, h);
  if (o.flash>0 && WHITE[name]) { ctx.globalAlpha = Math.min(1,o.flash)*0.8; ctx.drawImage(WHITE[name], -w/2, -h, w, h); }
  ctx.restore();
}
function shadow(x, y, w){ ctx.fillStyle='rgba(30,60,20,0.25)'; ctx.beginPath(); ctx.ellipse(x, y+2, w/2, w/8, 0, 0, 6.283); ctx.fill(); }
function rr(x,y,w,h,r){ ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x,y,Math.max(0,w),h,Math.min(r, Math.max(0,w)/2, h/2)); else ctx.rect(x,y,w,h); }
function hpBar(x, y, w, p, team, h=5) {
  ctx.fillStyle='rgba(0,0,0,0.55)'; rr(x-w/2-1, y-1, w+2, h+2, 3); ctx.fill();
  ctx.fillStyle = team===0 ? '#4fb3ff' : team===1 ? '#ff5a5a' : '#7be07b'; rr(x-w/2, y, w*clamp(p,0,1), h, 2); ctx.fill();
}
function txt(s, x, y, size, color='#fff', align='center', stroke=true, weight=800) {
  ctx.font = `${weight} ${size}px "Apple SD Gothic Neo","Noto Sans KR","Noto Sans CJK KR","Malgun Gothic",sans-serif`; ctx.textAlign=align; ctx.textBaseline='middle';
  if (stroke) { ctx.lineWidth = Math.max(2,size/6); ctx.strokeStyle='rgba(20,30,60,0.75)'; ctx.lineJoin='round'; ctx.strokeText(s,x,y); }
  ctx.fillStyle=color; ctx.fillText(s,x,y);
}
function hillY(seed, x, amp, base){ return base - amp*(0.5+0.3*Math.sin(x*0.0021+seed)+0.2*Math.sin(x*0.0057+seed*2.3)); }
function drawBackground(camX) {
  const g = ctx.createLinearGradient(0,0,0,VIEW_H); g.addColorStop(0,'#5fb6f2'); g.addColorStop(0.55,'#bfe6ff'); g.addColorStop(1,'#fdf3d8');
  ctx.fillStyle=g; ctx.fillRect(0,0,VW,VIEW_H);
  const sx = VW*0.8 - camX*0.02;
  ctx.fillStyle='rgba(255,250,210,0.25)'; ctx.beginPath(); ctx.arc(sx, 70, 56, 0, 6.28); ctx.fill();
  ctx.fillStyle='rgba(255,250,210,0.9)'; ctx.beginPath(); ctx.arc(sx, 70, 34, 0, 6.28); ctx.fill();
  for (let i=0;i<9;i++) { const x = ((i*530 - camX*0.12 + T*6) % (VW+600) + VW+600) % (VW+600) - 300, y = 40 + (i*37)%90;
    ctx.fillStyle='rgba(255,255,255,0.85)'; for (const [dx,dy,r] of [[0,0,26],[24,-10,30],[52,0,24],[26,8,24]]) { ctx.beginPath(); ctx.arc(x+dx,y+dy,r,0,6.28); ctx.fill(); } }
  const layers = [[0.2,'#a6d8a0',120,GROUND-60,1.3],[0.45,'#85c97a',80,GROUND-25,4.1],[0.7,'#6cbb63',50,GROUND-5,7.7]];
  for (const [par,col,amp,base,seed] of layers) { ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(0,VIEW_H);
    for (let x=0; x<=VW+20; x+=20) ctx.lineTo(x, hillY(seed, x+camX*par, amp, base)); ctx.lineTo(VW,VIEW_H); ctx.fill();
    if (par===0.45) for (let i=0;i<40;i++){ const wx=i*260+80; const tx=wx-camX*par; if (tx<-40||tx>VW+40) continue; const y=hillY(seed,wx,amp,base)+6;
      ctx.fillStyle='#7a5a3a'; ctx.fillRect(tx-3,y-22,6,22); ctx.fillStyle='#4fa552'; ctx.beginPath(); ctx.arc(tx,y-30,16,0,6.28); ctx.arc(tx-10,y-22,11,0,6.28); ctx.arc(tx+10,y-22,11,0,6.28); ctx.fill(); } }
}
function drawGround(camX) {
  const g = ctx.createLinearGradient(0,GROUND,0,VIEW_H); g.addColorStop(0,'#7ccf5e'); g.addColorStop(0.18,'#5fb04a'); g.addColorStop(0.2,'#a4774a'); g.addColorStop(1,'#7a5434');
  ctx.fillStyle=g; ctx.fillRect(0,GROUND,VW,VIEW_H-GROUND);
  ctx.fillStyle='#8fe06a'; ctx.fillRect(0,GROUND,VW,4);
  for (let wx = Math.floor(camX/36)*36; wx < camX+VW+36; wx+=36) { const sx = wx-camX, k = Math.abs(Math.round(wx*7919))%97;
    ctx.fillStyle='#6cc251'; ctx.beginPath(); ctx.moveTo(sx,GROUND+2); ctx.lineTo(sx+4,GROUND-6-(k%5)); ctx.lineTo(sx+8,GROUND+2); ctx.fill();
    if (k%7===0) { ctx.fillStyle=['#fff','#ffd6f0','#fff59a'][k%3]; ctx.beginPath(); ctx.arc(sx+18,GROUND+12+(k%10),3,0,6.28); ctx.fill(); }
    if (k%11===0) { ctx.fillStyle='rgba(90,60,30,0.35)'; ctx.beginPath(); ctx.ellipse(sx+10,GROUND+45+(k%20),6,3,0,0,6.28); ctx.fill(); } }
}
function drawPlatform(p, camX) {
  const x = p.x - camX; if (x > VW || x+p.w < 0) return;
  ctx.fillStyle='rgba(0,0,0,0.12)'; rr(x+6, p.y+8, p.w-6, 22, 10); ctx.fill();
  ctx.fillStyle='#a7764c'; ctx.beginPath(); ctx.moveTo(x+12,p.y+20); ctx.lineTo(x+p.w/2,p.y+48); ctx.lineTo(x+p.w-12,p.y+20); ctx.fill();
  ctx.fillStyle='#8a5e3a'; rr(x, p.y+6, p.w, 20, 10); ctx.fill();
  ctx.fillStyle='#7ed35f'; rr(x-4, p.y-4, p.w+8, 14, 7); ctx.fill(); ctx.fillStyle='#a6ec7e'; rr(x, p.y-4, p.w, 5, 3); ctx.fill();
  if (p.center) { ctx.fillStyle='rgba(180,255,220,0.35)'; ctx.beginPath(); ctx.ellipse(x+p.w/2, p.y-2, p.w/2, 8, 0, 0, 6.28); ctx.fill(); }
}
function drawEntity(e, camX) {
  const x = e.x - camX; if (x < -200 || x > VW+200) return;
  if (e.kind==='base') {
    const st = G.teams[e.team].stage; const name = `base${st+1}${e.team?'_r':''}`;
    const hh = [150,165,170,190,215][st]; shadow(x, GROUND, 170);
    if (e.team===0) { const g=ctx.createRadialGradient(x,GROUND,10,x,GROUND,260); g.addColorStop(0,'rgba(140,255,170,0.25)'); g.addColorStop(1,'rgba(140,255,170,0)'); ctx.fillStyle=g; ctx.fillRect(x-260,GROUND-120,520,130); }
    drawSprite(name, x, GROUND+6, hh, e.team===1, {flash:e.flash, sx:1+(e.squash||0)*0.04, sy:1-(e.squash||0)*0.04});
    hpBar(x, GROUND-hh-18, 120, e.hp/e.maxHp, e.team, 8);
    txt(BASE.names[st], x, GROUND-hh-30, 12, e.team?'#ffd0d0':'#d6efff');
  } else if (e.kind==='tower') {
    const img = e.branch==='rapid'?4 : e.branch==='cannon'?5 : e.lv; const name = `tower${img}${e.team?'_r':''}`;
    const hh = [0,105,110,115,120,125][img]; shadow(x, GROUND, 80);
    drawSprite(name, x, GROUND+4, hh, e.team===1, {flash:e.flash, sx:1+(e.squash||0)*0.06, sy:1-(e.squash||0)*0.05});
    hpBar(x, GROUND-hh-10, 64, e.hp/e.maxHp, e.team, 5);
    if (e.team===0 && e.lv<4 && slotAffordable(e.slot)) { ctx.globalAlpha = 0.6+0.4*Math.sin(T*6); txt('▲', x+34, GROUND-hh+8, 18, '#ffe066'); ctx.globalAlpha=1; }
  } else if (e.kind==='minion') {
    const elem = MAP.teamElem[e.team]; const name = `m_${elem}${e.mt.img}`;
    const hop = e.walking ? Math.abs(Math.sin(e.anim*9))*5 : 0; const sq = 1 + (e.walking? Math.sin(e.anim*18)*0.05 : 0) + (e.swing||0)*0.12;
    shadow(x, GROUND, e.mt.h*0.8);
    const isq = e.squash||0; drawSprite(name, x + (e.flash>0.6? rand(-2,2):0), e.y - hop, e.mt.h, e.face<0, {sx:(1+isq*0.25)/sq, sy:sq*(1-isq*0.22), flash:e.flash, rot:(e.swing||0)*0.15*e.face});
    if (e.mk==='boss') txt('BOSS', x, e.y-e.h-24, 11, '#ffd23f');
    if (e.hp < e.maxHp) hpBar(x, e.y-e.h-10, Math.max(26, e.mt.h*0.6), e.hp/e.maxHp, e.team, 3);
    if (e.stun>0) txt('★', x+Math.sin(T*10)*8, e.y-e.h-18, 12, '#ffe066');
  } else if (e.kind==='hero') {
    if (e.respawn>0) return;
    const name = HEROES[e.key].img + (e.team?'_r':'');
    const moving = Math.abs(e.vx)>10 && e.ground;
    const sy = 1 + (moving? Math.sin(e.anim*16)*0.04 : Math.sin(e.anim*4)*0.015) - (e.land||0)*0.15 + (!e.ground? 0.06:0) + (e.swing||0)*0.05;
    const hop = moving ? Math.abs(Math.sin(e.anim*8))*4 : 0;
    shadow(x, e.ground? e.y : GROUND, 48);
    if (e.team===0 && e===G.hero) { ctx.fillStyle='rgba(80,180,255,0.35)'; ctx.beginPath(); ctx.ellipse(x, e.y+2, 30, 7, 0, 0, 6.28); ctx.fill(); }
    if (e.team===1) { ctx.fillStyle='rgba(255,80,80,0.35)'; ctx.beginPath(); ctx.ellipse(x, e.y+2, 30, 7, 0, 0, 6.28); ctx.fill(); }
    if (e.shield>0) { ctx.fillStyle='rgba(255,200,40,0.28)'; ctx.strokeStyle='rgba(255,210,60,0.9)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(x, e.y-38, 46+Math.sin(T*8)*2, 0, 6.28); ctx.fill(); ctx.stroke(); }
    if (G.teams[e.team].buffT>0 && Math.random()<0.3) G.parts.push({x:e.x+rand(-20,20), y:e.y-rand(0,60), vx:-e.face*60, vy:-20, t:0, life:0.4, c:'#c8ffe4', r:2});
    const isq = e.squash||0; drawSprite(name, x, e.y - hop, 78, e.face<0, {sx:(1+isq*0.18)/sy, sy:sy*(1-isq*0.15), flash:e.flash, rot: (e.swing||0)*0.18*e.face + (e.dash?0.2*e.face:0)});
    hpBar(x, e.y-96, 60, e.hp/e.maxHp, e.team, 6);
    txt(`${e.lv}`, x-38, e.y-93, 11, '#ffe066');
    if (e===G.hero) { ctx.fillStyle='#ffe066'; ctx.beginPath(); ctx.moveTo(x-6,e.y-114); ctx.lineTo(x+6,e.y-114); ctx.lineTo(x,e.y-105); ctx.fill(); }
    if (e.stun>0) txt('★ ★', x+Math.sin(T*10)*6, e.y-110, 13, '#ffe066');
    if (e.slow>0) txt('❄', x+30, e.y-80, 14, '#bfeaff', 'center', false);
  } else if (e.kind==='dragon') {
    shadow(x, e.homeY+6, 100);
    drawSprite('dragon', x, e.y, 110 + Math.sin(e.anim*4)*3, e.face<0, {flash:e.flash, rot:Math.sin(e.anim*2)*0.05});
    hpBar(x, e.y-125, 100, e.hp/e.maxHp, 2, 7); txt(DN(), x, e.y-137, 12, '#ffe2c8');
  } else if (e.kind==='obst') {
    shadow(x, GROUND, e.w+6); ctx.save(); ctx.translate(x + (e.flash>0? rand(-2,2):0), GROUND);
    if (e.type==='crate') { ctx.fillStyle='#b5824e'; rr(-25,-50,50,50,5); ctx.fill(); ctx.strokeStyle='#7a5230'; ctx.lineWidth=4; ctx.strokeRect(-21,-46,42,42); ctx.beginPath(); ctx.moveTo(-21,-46); ctx.lineTo(21,-4); ctx.moveTo(21,-46); ctx.lineTo(-21,-4); ctx.stroke(); }
    else { ctx.fillStyle='#9a9aac'; ctx.beginPath(); ctx.ellipse(0,-22,31,26,0,0,6.28); ctx.fill(); ctx.fillStyle='#b9b9c9'; ctx.beginPath(); ctx.ellipse(-8,-30,14,10,0,0,6.28); ctx.fill(); ctx.fillStyle='#7ecb5e'; ctx.beginPath(); ctx.ellipse(6,-44,14,6,0,0,6.28); ctx.fill(); }
    if (e.flash>0) { ctx.globalAlpha=e.flash*0.6; ctx.fillStyle='#fff'; ctx.fillRect(-e.w/2,-e.h,e.w,e.h); }
    ctx.restore(); if (e.hp<e.maxHp) hpBar(x, GROUND-e.h-10, 40, e.hp/e.maxHp, 3, 4);
  } else if (e.kind==='ward') {
    if (e.team!==0) return;
    ctx.save(); ctx.translate(x, e.y - 4 - Math.abs(Math.sin(e.anim*3))*3);
    ctx.globalAlpha=0.15+0.1*Math.sin(T*3); ctx.fillStyle='#fff6b0'; ctx.beginPath(); ctx.arc(0,-14,24,0,6.28); ctx.fill(); ctx.globalAlpha=1;
    ctx.strokeStyle='#8a5e3a'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(0,4); ctx.stroke();
    ctx.fillStyle='#ffe9a8'; ctx.beginPath(); ctx.arc(0,-14,8,0,6.28); ctx.fill(); ctx.fillStyle='#ffcf3a'; ctx.beginPath(); ctx.arc(0,-14,4,0,6.28); ctx.fill();
    ctx.restore();
  }
}
function drawSlots(camX) {
  for (const s of G.slots) { if (s.tower) continue; const x = s.x - camX; if (x<-60||x>VW+60) continue;
    if (s.team===1) { ctx.globalAlpha=0.25; ctx.fillStyle='#8a5e3a'; rr(x-30, GROUND-8, 60, 10, 4); ctx.fill(); ctx.globalAlpha=1; continue; }
    if (s.ruinT>0) { ctx.globalAlpha=0.5; ctx.fillStyle='#7a6a5a'; rr(x-30, GROUND-14, 60, 16, 5); ctx.fill(); ctx.globalAlpha=1; txt(`재건축 ${Math.ceil(s.ruinT)}초`, x, GROUND-30, 11, '#fff'); continue; }
    const aff = G.teams[0].gold >= TOWER.cost[0];
    ctx.save(); ctx.globalAlpha = aff ? 0.6+0.25*Math.sin(T*5) : 0.35;
    ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.setLineDash([6,5]); rr(x-32, GROUND-90, 64, 86, 12); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    txt('+', x, GROUND-52, 40, aff?'#ffe066':'#fff'); txt(TOWER.cost[0]+'G', x, GROUND-16, 11, '#fff'); ctx.restore(); }
}
function glow(x,y,r,c){ const g=ctx.createRadialGradient(x,y,0,x,y,r*1.8); g.addColorStop(0,'#fff'); g.addColorStop(0.4,c); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r*1.8,0,6.28); ctx.fill(); }
function star(x,y,r,c){ ctx.fillStyle=c; ctx.beginPath(); for(let i=0;i<10;i++){ const a=i*Math.PI/5-Math.PI/2, r2=i%2?r*0.45:r; ctx.lineTo(x+Math.cos(a)*r2, y+Math.sin(a)*r2);} ctx.fill(); }
function drawProj(p, camX) {
  if (p.delay>0) return;
  if (p.kind==='rain') { const x=p.x-camX; ctx.fillStyle='rgba(255,255,220,0.12)'; ctx.fillRect(x-p.w/2, 0, p.w, GROUND); ctx.fillStyle='rgba(255,240,150,0.4)'; ctx.fillRect(x-p.w/2, GROUND-4, p.w, 6); return; }
  if (p.kind==='star') { const x = p.tx-camX; ctx.strokeStyle='rgba(255,230,100,0.7)'; ctx.lineWidth=3; ctx.setLineDash([8,6]); ctx.beginPath(); ctx.ellipse(x, GROUND-4, 165, 16, 0, 0, 6.28); ctx.stroke(); ctx.setLineDash([]);
    if (p.cx!=null) { ctx.save(); ctx.translate(p.cx-camX, p.cy); ctx.rotate(T*8); star(0,0,30,'#ffe066'); star(0,0,16,'#fffbe0'); ctx.restore(); } return; }
  ctx.save(); ctx.translate(p.x-camX, p.y); ctx.rotate(p.ang||0);
  if (p.kind==='arrow') { ctx.strokeStyle='#7a5230'; ctx.lineWidth=p.big?3:2; ctx.beginPath(); ctx.moveTo(-14,0); ctx.lineTo(10,0); ctx.stroke(); ctx.fillStyle=p.big?'#7fe3ff':'#ddd'; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(8,-4); ctx.lineTo(8,4); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillRect(-15,-3,5,6); }
  else if (p.kind==='orb') glow(0,0,10,'#b89cff');
  else if (p.kind==='ice') { glow(0,0,14,'#9fe0ff'); star(0,0,7,'#ffffff'); }
  else if (p.kind==='drop') glow(0,0,6, p.elem?'#ff8a3a':'#5fc4ff');
  else if (p.kind==='wind') glow(0,0,9,'#c8fff0');
  else if (p.kind==='rock') { ctx.fillStyle='#8f8a80'; ctx.beginPath(); ctx.arc(0,0,8,0,6.28); ctx.fill(); }
  else if (p.kind==='ball') { ctx.fillStyle='#333'; ctx.beginPath(); ctx.arc(0,0,p.big?10:7,0,6.28); ctx.fill(); ctx.fillStyle='#888'; ctx.beginPath(); ctx.arc(-2,-2,3,0,6.28); ctx.fill(); }
  ctx.restore();
}
function coin(x,y,r=7){ ctx.fillStyle='#e0a000'; ctx.beginPath(); ctx.arc(x,y+1,r,0,6.28); ctx.fill(); ctx.fillStyle='#ffd23f'; ctx.beginPath(); ctx.arc(x,y,r,0,6.28); ctx.fill(); ctx.fillStyle='#fff3b0'; ctx.fillRect(x-1.5,y-r*0.55,3,r*1.1); }
function drawMatch() {
  const camX = G.camX;
  // 3D world
  if (window.R3D) {
    const dtFrame = Math.min(0.05, 1/60);
    R3D.renderMatch(G, camX, VW, GROUND, shake, dtFrame);
  }
  // Clear HUD canvas (transparent overlay)
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,cv.width,cv.height);
  ctx.setTransform(SC,0,0,SC,0,0);
  // 2D overlays in world space: slots, damage nums, rings, pops
  ctx.save();
  drawSlots(camX);
  drawSkillFx(camX);
  for (const p of G.parts) { const a = 1 - p.t/p.life; ctx.globalAlpha = Math.max(0,a);
    if (p.ring) { const k = 0.3+0.7*p.t/p.life; ctx.strokeStyle=p.c; ctx.lineWidth=5*a; ctx.beginPath(); ctx.ellipse(p.x-camX, p.y, p.r*k, p.r*0.25*k, 0, 0, 6.28); ctx.stroke(); }
    else if (p.pop) { const k = p.t/p.life; drawSprite(p.img, p.x-camX, p.y - k*10, p.h*(1+k*0.6), p.face<0, {alpha:1-k, flash:1, sx:1+k*0.3, sy:1-k*0.2}); }
    else if (p.spark) { ctx.strokeStyle=p.c; ctx.lineWidth=p.r*0.9; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(p.x-camX, p.y); ctx.lineTo(p.x-camX-p.vx*0.04, p.y-p.vy*0.04); ctx.stroke(); }
    else if (p.arrowfx) { ctx.strokeStyle='#fff8d0'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(p.x-camX, p.y); ctx.lineTo(p.x-camX+2, p.y-16); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
  for (const n of G.nums) { const k = n.t/0.9; ctx.globalAlpha = 1-k*k; const s = n.crit ? 28 : n.big ? 22 : n.gold ? 13 : 15;
    txt(String(n.v), n.x-camX, n.y - k*40, s*(1+(k<0.15? (0.15-k)*3:0)), n.c); }
  ctx.globalAlpha = 1; ctx.restore();
  drawHUD();
}
function drawHUD() {
  const h = G.hero, tm = G.teams[0], B = btnLayout();
  uiRects = [];
  ctx.fillStyle='rgba(20,30,60,0.55)'; rr(8,8,210,64,14); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(38,37,24,0,6.28); ctx.fillStyle=HEROES[h.key].color; ctx.fill(); ctx.clip(); drawSprite(HEROES[h.key].img, 38, 72, 66, false); ctx.restore();
  ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(38,37,24,0,6.28); ctx.stroke();
  txt(`${h.d.name}  Lv.${h.lv}`, 70, 20, 13, '#fff', 'left');
  ctx.fillStyle='rgba(0,0,0,0.5)'; rr(70,29,140,12,6); ctx.fill(); ctx.fillStyle='#53d36a'; rr(70,29,140*clamp(h.hp/h.maxHp,0,1),12,6); ctx.fill();
  txt(`${Math.max(0,Math.ceil(h.hp))}/${Math.round(h.maxHp)}`, 140, 35, 10, '#fff');
  ctx.fillStyle='rgba(0,0,0,0.5)'; rr(70,44,140,10,5); ctx.fill(); ctx.fillStyle='#3f8cff'; rr(70,44,140*clamp(h.mp/h.maxMp,0,1),10,5); ctx.fill();
  txt(`${Math.floor(h.mp)}/${Math.round(h.maxMp)}`, 140, 49, 8.5, '#fff');
  const xp0 = LEVEL_XP[h.lv-1], xp1 = LEVEL_XP[h.lv] || xp0+1; ctx.fillStyle='rgba(0,0,0,0.5)'; rr(70,58,140,6,3); ctx.fill(); ctx.fillStyle='#b48cff'; rr(70,58,140*(h.lv>=MAX_LV?1:clamp((h.xp-xp0)/(xp1-xp0),0,1)),6,3); ctx.fill();
  txt(`처치 ${h.kills}  죽음 ${h.deaths}  막타 ${G.stats.cs}`, 12, 82, 11, '#fff', 'left');
  // 미니맵
  const mw = Math.min(330, VW*0.36), mx = VW/2 - mw/2, my = 8, mh = 30;
  ctx.fillStyle='rgba(20,40,30,0.6)'; rr(mx-4,my-2,mw+8,mh+4,10); ctx.fill();
  ctx.fillStyle='rgba(120,200,110,0.6)'; rr(mx,my+mh-8,mw,6,3); ctx.fill();
  const MX = x => mx + x/WORLD_W*mw;
  ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=1.5; ctx.strokeRect(MX(G.camX), my, VW/WORLD_W*mw, mh);
  const vision = G.ents.filter(e=>!e.dead && e.team===0 && (e.kind!=='hero'||e.respawn<=0)).map(e=>({x:e.x, r: e.kind==='ward'?450 : e.kind==='hero'?500 : e.kind==='tower'||e.kind==='base'?420:300}));
  const seen = e => e.team===0 || vision.some(v=>Math.abs(v.x-e.x)<v.r);
  for (const e of G.ents) { if (e.dead || e.kind==='obst') continue; if (e.kind==='hero' && e.respawn>0) continue; if (e.kind!=='tower' && e.kind!=='base' && !seen(e)) continue;
    const X = MX(e.x); const col = e.team===0?'#5fc0ff':e.team===1?'#ff6060':'#a8ffcf';
    if (e.kind==='base') { ctx.fillStyle=col; rr(X-5,my+mh-20,10,14,2); ctx.fill(); }
    else if (e.kind==='tower') { ctx.fillStyle=col; ctx.fillRect(X-2,my+mh-16,4,9); }
    else if (e.kind==='minion') { ctx.fillStyle=col; ctx.fillRect(X-1.5,my+mh-9,3,3); }
    else if (e.kind==='ward') { ctx.fillStyle='#ffe066'; ctx.beginPath(); ctx.arc(X,my+mh-12,2.5,0,6.28); ctx.fill(); }
    else if (e.kind==='dragon') { ctx.fillStyle=col; ctx.beginPath(); ctx.arc(X,my+8,4,0,6.28); ctx.fill(); }
    else if (e.kind==='hero') { ctx.fillStyle=col; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(X, my+mh-16 - (GROUND-e.y)*0.05, 5, 0, 6.28); ctx.fill(); ctx.stroke(); } }
  const mm = Math.floor(G.t/60), ss = Math.floor(G.t%60); txt(`${mm}:${String(ss).padStart(2,'0')}`, VW/2, my+mh+12, 12);
  if (isFinite(G.dragonNext) && G.dragonNext-G.t < 20) txt(`${DN()} 등장까지 ${Math.ceil(G.dragonNext-G.t)}초`, VW/2, my+mh+27, 11, '#a8ffcf');
  // 골드 + 상점
  const atBase = nearBase(h), aff = anyAffordable(0) && atBase;
  ctx.fillStyle='rgba(20,30,60,0.55)'; rr(VW-172, 16, 96, 36, 12); ctx.fill();
  coin(VW-156, 34); txt(`${Math.floor(tm.gold)}`, VW-142, 34, 15, '#ffd23f', 'left');
  if (aff) { ctx.fillStyle=`rgba(255,220,80,${0.35+0.3*Math.sin(T*6)})`; ctx.beginPath(); ctx.arc(B.shop.x,B.shop.y,B.shop.r+8+2*Math.sin(T*6),0,6.28); ctx.fill(); }
  ctx.globalAlpha = atBase ? 1 : 0.55; ctx.fillStyle = aff ? '#ffb92e' : atBase ? '#5a6b8a' : '#4a4f5c'; ctx.beginPath(); ctx.arc(B.shop.x,B.shop.y,B.shop.r,0,6.28); ctx.fill(); ctx.strokeStyle= atBase ? '#fff' : '#aaa'; ctx.lineWidth=3; ctx.stroke();
  coin(B.shop.x, B.shop.y-7, 8); txt('상점', B.shop.x, B.shop.y+12, 11, atBase ? '#fff' : '#ccc'); ctx.globalAlpha = 1;
  if (!atBase) txt('기지에서만', B.shop.x, B.shop.y+31, 9, '#ffd9a0');
  { const sb = B.score; ctx.fillStyle='rgba(20,30,60,0.55)'; ctx.beginPath(); ctx.arc(sb.x,sb.y,sb.r,0,6.28); ctx.fill(); txt('점수', sb.x, sb.y, 9, '#fff'); }
  { const mb={x:VW-200, y:34, r:15}; ctx.fillStyle='rgba(20,30,60,0.55)'; ctx.beginPath(); ctx.arc(mb.x,mb.y,mb.r,0,6.28); ctx.fill(); txt(muted?'음소거':'소리', mb.x, mb.y, 9, muted?'#aaa':'#fff'); uiRects.push({r:{x:mb.x-18,y:mb.y-18,w:36,h:36}, fn:toggleMute}); }
  if (window.LRFS && LRFS.canFS()) { const fb={x:VW-240, y:34, r:15}; ctx.fillStyle='rgba(20,30,60,0.55)'; ctx.beginPath(); ctx.arc(fb.x,fb.y,fb.r,0,6.28); ctx.fill(); txt(LRFS.isFS()?'⤡':'⛶', fb.x, fb.y, 14, '#fff'); uiRects.push({r:{x:fb.x-18,y:fb.y-18,w:36,h:36}, fn:()=>LRFS.toggle()}); }
  if (tm.buffT>0) txt(`${DN()} 버프 ${Math.ceil(tm.buffT)}초`, 12, 100, 12, '#a8ffcf', 'left');
  if (G.teams[1].buffT>0) txt(`적 ${DN()} 버프 ${Math.ceil(G.teams[1].buffT)}초`, VW-12, 70, 11, '#ff9a9a', 'right');
  if (!(window.ANN && ANN.busy())) G.msg.forEach((m,i) => { ctx.globalAlpha = clamp(m.t,0,1); txt(m.text, VW/2, 84 + i*20, 15, m.color); }); ctx.globalAlpha=1;
  if (h.respawn>0) { ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(0,0,VW,VIEW_H); txt(`부활까지 ${Math.ceil(h.respawn)}초`, VW/2, VIEW_H*0.7, 30, '#fff'); }
  // 조이스틱
  const jx = joy.active? joy.x0 : 105, jy = joy.active? joy.y0 : 370;
  ctx.globalAlpha = joy.active? 0.75 : 0.45;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(jx,jy,52,0,6.28); ctx.fill(); ctx.stroke();
  txt('◀', jx-34, jy, 16, '#fff'); txt('▶', jx+34, jy, 16, '#fff');
  const kx = joy.active? clamp(joy.x-joy.x0,-40,40) : 0; ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(jx+kx,jy,22,0,6.28); ctx.fill();
  ctx.globalAlpha = 1;
  const skBtn = (b, i) => { const sk = h.d.skills[i], cd = h.cds[i], locked = !skillOpen(h,i);
    ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(b.x+2,b.y+4,b.r,0,6.28); ctx.fill();
    const noMp = h.mp < h.d.mana[i];
    ctx.globalAlpha = 0.82; ctx.fillStyle = locked ? 'rgba(60,60,80,0.75)' : noMp ? 'rgba(70,90,140,0.8)' : ['#ff9a3c','#4fb3ff','#c06bff'][i]; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,6.28); ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=2.5; ctx.stroke(); ctx.globalAlpha = 1;
    if (cd>0 && !locked) { ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.arc(b.x,b.y,b.r,-Math.PI/2,-Math.PI/2+6.283*cd/(sk.cd*(1-0.1*tm.skill[i]))); ctx.fill(); txt(String(Math.ceil(cd)), b.x, b.y-4, 18); }
    else txt(locked? `Lv.${SKILL_LV[i]}` : ['1','2','궁'][i], b.x, b.y-6, locked?13:16, '#fff');
    txt(sk.name, b.x, b.y + b.r*0.45, 9);
    if (!locked) { ctx.fillStyle = noMp ? '#ff6b6b' : '#2f6fe0'; rr(b.x+b.r*0.35, b.y+b.r*0.55, 22, 12, 6); ctx.fill(); txt(String(h.d.mana[i]), b.x+b.r*0.35+11, b.y+b.r*0.55+6, 8.5, '#fff'); }
    if (i===2 && !locked && ultTier(h)>0) txt('★'.repeat(ultTier(h)), b.x, b.y-b.r-14, 10, '#ffe066');
    for (let k=0;k<tm.skill[i];k++) { ctx.fillStyle='#ffe066'; ctx.beginPath(); ctx.arc(b.x-8+k*8, b.y-b.r-5, 3, 0, 6.28); ctx.fill(); } };
  skBtn(B.s0,0); skBtn(B.s1,1); skBtn(B.s2,2);
  ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(B.jump.x+2,B.jump.y+4,B.jump.r,0,6.28); ctx.fill();
  ctx.globalAlpha=0.8; ctx.fillStyle='rgba(110,215,110,0.9)'; ctx.beginPath(); ctx.arc(B.jump.x,B.jump.y,B.jump.r,0,6.28); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2.5; ctx.stroke(); ctx.globalAlpha=1; txt('▲', B.jump.x, B.jump.y-6, 16); txt('점프', B.jump.x, B.jump.y+12, 10);
  ctx.globalAlpha=0.8; ctx.fillStyle= tm.wardCd>0 ? 'rgba(80,80,90,0.75)' : 'rgba(255,205,70,0.9)'; ctx.beginPath(); ctx.arc(B.ward.x,B.ward.y,B.ward.r,0,6.28); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(); ctx.globalAlpha=1;
  txt(tm.wardCd>0? String(Math.ceil(tm.wardCd)) : '◉', B.ward.x, B.ward.y-4, 13, '#fff'); txt('와드', B.ward.x, B.ward.y+11, 9);
  // 공용: 대시 / 귀환
  { const b = B.dash, cd = h.dashCd; ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(b.x+2,b.y+4,b.r,0,6.28); ctx.fill();
    ctx.globalAlpha=0.85; ctx.fillStyle = cd>0 ? 'rgba(80,80,95,0.8)' : '#ffd84a'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,6.28); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2.5; ctx.stroke(); ctx.globalAlpha=1;
    if (cd>0) { ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.arc(b.x,b.y,b.r,-Math.PI/2,-Math.PI/2+6.283*cd/DASH.cd); ctx.fill(); txt(String(Math.ceil(cd)), b.x, b.y-4, 15); }
    else txt('»', b.x, b.y-5, 18, '#6b3f12', 'center', false);
    txt('대시', b.x, b.y+12, 9); }
  { const b = B.recall, rc = h.recall; ctx.globalAlpha=0.85; ctx.fillStyle = atBase ? 'rgba(80,80,95,0.7)' : '#7fd3ff'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,6.28); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(); ctx.globalAlpha=1;
    if (rc) { ctx.strokeStyle='#ffffff'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(b.x,b.y,b.r+5,-Math.PI/2,-Math.PI/2+6.283*(1-rc.t/rc.t0)); ctx.stroke(); }
    txt('⌂', b.x, b.y-5, 15, '#fff'); txt('귀환', b.x, b.y+11, 9); }
  { const bs = buildSlot(); if (bs) { const b = B.build, ops = towerOptions(bs), up = !!bs.tower, ok = ops.some(o=>tm.gold>=o.cost), on = G.popup && G.popup.slot===bs;
    const pul = ok && !on ? 1+0.06*Math.sin(G.t*6) : 1;
    ctx.globalAlpha=0.9; ctx.fillStyle = on ? '#2e8a46' : ok ? '#43b85c' : 'rgba(80,80,95,0.8)'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r*pul,0,6.28); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2.5; ctx.stroke(); ctx.globalAlpha=1;
    txt(up ? '▲' : '+', b.x, b.y-6, 15, '#fff'); txt(up ? '강화' : '건설', b.x, b.y+10, 9.5); } }
  if (h.recall) { const k = 1-h.recall.t/h.recall.t0; ctx.fillStyle='rgba(20,30,60,0.6)'; rr(VW/2-90, VIEW_H-120, 180, 22, 11); ctx.fill(); ctx.fillStyle='#7fd3ff'; rr(VW/2-86, VIEW_H-116, 172*k, 14, 7); ctx.fill(); txt(`귀환 중 ${h.recall.t.toFixed(1)}초`, VW/2, VIEW_H-109, 11); }
  if (G.popup) {
    const s = G.popup.slot, ops = towerOptions(s); const px = clamp(s.x - G.camX, 90, VW-90);
    const w = 180, hgt = 28 + ops.length*36; const top = GROUND - 150 - hgt;
    ctx.fillStyle='rgba(20,30,60,0.9)'; rr(px-w/2, top, w, hgt, 12); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
    txt(s.tower ? `타워 Lv.${s.tower.lv}` : '빈 타워 자리', px, top+14, 12);
    ops.forEach((o,i) => { const r = {x:px-w/2+8, y:top+26+i*36, w:w-16, h:30}; const ok = tm.gold>=o.cost;
      ctx.fillStyle = ok ? '#43b85c' : '#555c70'; rr(r.x,r.y,r.w,r.h,8); ctx.fill(); txt(`${o.name}  ${o.cost}G`, px, r.y+15, 11.5, ok?'#fff':'#bbb');
      uiRects.push({r, fn:()=>{ if (towerAct(s,o.id)) G.popup = towerOptions(s).length? {slot:s} : null; else addMsg('골드가 부족합니다', '#ffb0a0'); }, tap:true}); });
    uiRects.push({r:{x:px-w/2, y:top, w, h:hgt}, fn:()=>{}, tap:true});
  }
  if (G.shopOpen) {
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,VW,VIEW_H);
    const w = Math.min(560, VW-40), x0 = VW/2-w/2, y0 = 30, hh = 385;
    ctx.fillStyle='#fff7e6'; rr(x0,y0,w,hh,18); ctx.fill(); ctx.strokeStyle='#ffb92e'; ctx.lineWidth=4; ctx.stroke();
    txt('상점', x0+20, y0+24, 20, '#6b3f12', 'left', false); coin(x0+w-110, y0+24, 9); txt(`${Math.floor(tm.gold)}`, x0+w-95, y0+24, 18, '#d48a00', 'left', false);
    shopItems(0).forEach((it,i) => { const r = {x:x0+16, y:y0+48+i*54, w:w-32, h:48}; const ok = !it.max && tm.gold>=it.cost;
      ctx.fillStyle = it.max ? '#e8e2d6' : ok ? '#fff1c2' : '#f1ebe0'; rr(r.x,r.y,r.w,r.h,10); ctx.fill(); ctx.strokeStyle = ok? '#ffb92e':'#d8cfc0'; ctx.lineWidth=2; ctx.stroke();
      txt(it.name, r.x+14, r.y+16, 14, '#4a2e10', 'left', false); txt(it.desc, r.x+14, r.y+35, 11, '#8a6a4a', 'left', false, 500);
      const br = {x:r.x+r.w-92, y:r.y+9, w:82, h:30}; ctx.fillStyle = it.max ? '#aaa' : ok ? '#43b85c' : '#b9b0a0'; rr(br.x,br.y,br.w,br.h,8); ctx.fill();
      txt(it.max ? '최대' : `${it.cost}G`, br.x+41, br.y+15, 13);
      uiRects.push({r, fn:()=>{ if (!buy(0,it.id) && !it.max) addMsg('골드가 부족합니다','#ffb0a0'); }}); });
    txt('타워는 맵의 + 자리나 아군 타워를 터치해서 건설/강화!', x0+16, y0+hh-22, 11, '#8a6a4a', 'left', false, 600);
    const cr = {x:x0+w-46, y:y0+hh-44, w:36, h:36}; ctx.fillStyle='#ff7a6a'; rr(cr.x,cr.y,cr.w,cr.h,10); ctx.fill(); txt('X', cr.x+18, cr.y+18, 18);
    uiRects.push({r:cr, fn:()=>{G.shopOpen=false;}});
    uiRects.push({r:{x:x0,y:y0,w,h:hh}, fn:()=>{}});
  }
  if (G.scoreOpen) drawScoreboard();
  if (SPEED!==1 || AUTO) txt(`디버그 x${SPEED}${AUTO?' 자동':''}`, 10, VIEW_H-10, 10, '#ff0', 'left');
}

// ---------- 스킬 이펙트 (2D 오버레이, 가벼운 도형만) ----------
// 3D 카메라 투영 → 오버레이 좌표 (지면 근처 평면을 아핀 근사). R3D가 없으면 단순 카메라 이동만.
function w2s(x, y, z=0.7) { const C = window.R3D && R3D.camera; if (!C) return [x - G.camX, y];
  const S = 0.028, X = x*S, Y = (GROUND - y)*S, m = C.matrixWorldInverse.elements, p = C.projectionMatrix.elements;
  const vx = m[0]*X+m[4]*Y+m[8]*z+m[12], vy = m[1]*X+m[5]*Y+m[9]*z+m[13], vz = m[2]*X+m[6]*Y+m[10]*z+m[14];
  const cx = p[0]*vx+p[4]*vy+p[8]*vz+p[12], cyy = p[1]*vx+p[5]*vy+p[9]*vz+p[13], cw = p[3]*vx+p[7]*vy+p[11]*vz+p[15];
  return [(cx/cw+1)/2*VW, (1-cyy/cw)/2*VIEW_H]; }
function drawSkillFx(camX0) {
  const tt = G.t;
  // 화면 중앙 지면 기준 아핀 변환: 게임 좌표(x, y)를 그대로 쓰면 3D 위치와 맞음
  const ax = G.camX + VW*0.4, a0 = w2s(ax, GROUND), a1 = w2s(ax+200, GROUND), a2 = w2s(ax, GROUND-200);
  const sx = (a1[0]-a0[0])/200, sy = (a0[1]-a2[1])/200;
  ctx.save(); ctx.transform(sx, 0, 0, sy, a0[0]-ax*sx, a0[1]-GROUND*sy);
  const camX = 0, VWL = G.camX, VWR = G.camX + VW;
  // 덫 / 마법진 (지속형)
  for (const p of G.proj) {
    const x = p.x; if (x < VWL-300 || x > VWR+300) continue;
    if (p.kind==='trap') { const armed = p.arm<=0, col = p.team ? '255,120,90' : '255,215,70', vis = p.team===0 ? 1 : 0.3;  // 적의 덫은 흐릿하게만 보임
      ctx.save(); ctx.globalAlpha = vis; ctx.translate(x, p.y); ctx.scale(1, 0.32);
      ctx.fillStyle = `rgba(${col},${armed?0.22:0.1})`; ctx.beginPath(); ctx.arc(0,0,p.r,0,6.28); ctx.fill();
      ctx.strokeStyle = `rgba(${col},0.9)`; ctx.lineWidth = 4; ctx.setLineDash([10,7]); ctx.lineDashOffset = -tt*20; ctx.beginPath(); ctx.arc(0,0,p.r,0,6.28); ctx.stroke(); ctx.setLineDash([]);
      for (let i=0;i<8;i++){ const a=i*0.785+tt*0.5; ctx.beginPath(); ctx.moveTo(Math.cos(a)*p.r*0.35, Math.sin(a)*p.r*0.35); ctx.lineTo(Math.cos(a)*p.r*0.9, Math.sin(a)*p.r*0.9); ctx.stroke(); }
      ctx.restore(); ctx.save(); ctx.globalAlpha = vis;
      ctx.fillStyle = '#7a4a1a'; ctx.beginPath(); ctx.ellipse(x, p.y-3, 13, 6, 0, 0, 6.28); ctx.fill(); ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(x, p.y-5, 9, 4, 0, 0, 6.28); ctx.fill();
      if (armed) { const gp = (tt*0.6 + x*0.001) % 1; if (gp < 0.18) { const k = gp/0.18, gx2 = x-10+20*k, ga = Math.sin(k*Math.PI)*vis;  // 은은한 반짝임
          ctx.globalAlpha = ga; ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx2-5, p.y-6); ctx.lineTo(gx2+5, p.y-6); ctx.moveTo(gx2, p.y-11); ctx.lineTo(gx2, p.y-1); ctx.stroke(); } }
      ctx.restore(); }
    else if (p.kind==='circle') { const k = clamp(1 - p.delay0/0.7, 0, 1), a = p.fired ? Math.max(0, p.life/0.5) : 1;
      ctx.save(); ctx.translate(x, p.y); ctx.scale(1, 0.3); ctx.globalAlpha = a;
      ctx.fillStyle = `rgba(170,110,255,${0.12+0.2*k})`; ctx.beginPath(); ctx.arc(0,0,p.r*k,0,6.28); ctx.fill();
      ctx.strokeStyle = '#d9b8ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0,0,p.r,0,6.28*k); ctx.stroke();
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0,0,p.r*0.72,0,6.28); ctx.stroke();
      ctx.rotate(tt*1.5); ctx.beginPath(); for (let i=0;i<=5;i++){ const an=i*2.513; ctx.lineTo(Math.cos(an)*p.r*0.72, Math.sin(an)*p.r*0.72); } ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
      if (!p.fired) for (let i=0;i<3;i++){ const an = tt*4+i*2.1; ctx.fillStyle='#f0e0ff'; ctx.beginPath(); ctx.arc(x+Math.cos(an)*p.r*0.8, p.y+Math.sin(an)*p.r*0.24-k*30, 3, 0, 6.28); ctx.fill(); } }
  }
  // 꿀 덫: 튀어 오르며 닫히는 덫 + 꿀 튀김 / 끈적 발자국 / 걸린 적 발밑 웅덩이·느려짐 아이콘
  if (G.goo) { G.goo = G.goo.filter(g => tt - (g.t0 ??= tt) < g.life);
    for (const g of G.goo) { const t = tt - g.t0, k = t/g.life;
      if (g.kind==='print') { ctx.globalAlpha = 0.55*(1-k); ctx.fillStyle = '#e0a020'; ctx.beginPath(); ctx.ellipse(g.x, g.y+2+g.f*3, 7, 3, 0, 0, 6.28); ctx.fill(); continue; }
      // 덫 몸체: 0~0.3초 튀어 오르며 턱이 닫힘
      if (t < 0.45) { const j = Math.min(1, t/0.12), up = Math.sin(Math.min(1, t/0.45)*Math.PI)*26, cl = (1-j)*0.9;
        ctx.save(); ctx.translate(g.x, g.y-6-up); ctx.strokeStyle = '#5a3612'; ctx.fillStyle = '#ffd84a'; ctx.lineWidth = 3;
        for (const sd of [-1,1]) { ctx.save(); ctx.rotate(sd*cl); ctx.beginPath(); ctx.ellipse(0, sd*-4, 16, 6, 0, sd>0?Math.PI:0, sd>0?6.28:Math.PI); ctx.fill(); ctx.stroke();
          for (let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(i*6, sd*-4); ctx.lineTo(i*6+2, sd*-4+sd*5); ctx.stroke(); } ctx.restore(); }
        ctx.restore(); }
      // 꿀 방울: 포물선 → 바닥에 떨어지면 얼룩
      for (const d of g.sp) { const tf = Math.min(t, 0.9), dx = d.vx*tf, dy = d.vy*tf - 0.5*900*tf*tf, land = dy < 0;
        ctx.globalAlpha = 1 - Math.max(0, (k-0.6)/0.4); ctx.fillStyle = land ? '#d99a18' : '#ffc533';
        if (land) { ctx.beginPath(); ctx.ellipse(g.x + d.vx*(2*d.vy/900), g.y, d.r*1.6, d.r*0.6, 0, 0, 6.28); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(g.x+dx, g.y-10-dy, d.r, 0, 6.28); ctx.fill(); ctx.fillStyle = 'rgba(255,250,210,0.8)'; ctx.beginPath(); ctx.arc(g.x+dx-d.r*0.3, g.y-10-dy-d.r*0.3, d.r*0.35, 0, 6.28); ctx.fill(); } }
      ctx.globalAlpha = 1; } }
  for (const e of G.ents) if (e.gooT>0 && !e.dead && (e.kind==='hero'||e.kind==='minion') && !(e.respawn>0) && e.x > VWL-100 && e.x < VWR+100) {
    const a = Math.min(1, e.gooT*2), wob = Math.sin(tt*5+e.x)*2, R = (e.w||40)*0.75;
    ctx.globalAlpha = 0.7*a; ctx.fillStyle = '#e6a51c'; ctx.beginPath(); ctx.ellipse(e.x, e.y+1, R+wob, 7, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(255,236,150,0.8)'; ctx.beginPath(); ctx.ellipse(e.x-R*0.3, e.y-1, R*0.3, 2.2, 0, 0, 6.28); ctx.fill();
    if (e.slow>0) { const hy = e.y - (e.kind==='hero' ? 118 : 78) + Math.sin(tt*4)*2;  // 느려짐: 꿀 방울 아이콘
      ctx.globalAlpha = a; ctx.fillStyle = '#ffb81c'; ctx.strokeStyle = '#6a3e08'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(e.x, hy-11); ctx.bezierCurveTo(e.x+8, hy-2, e.x+8, hy+7, e.x, hy+7); ctx.bezierCurveTo(e.x-8, hy+7, e.x-8, hy-2, e.x, hy-11); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(e.x-2.5, hy+1, 1.8, 0, 6.28); ctx.fill(); }
    ctx.globalAlpha = 1; }
  // 방패 버블 (꿀 방패 지속 중)
  for (const h of [G.hero, G.ai]) if (h && h.shield>0 && isAlive(h)) { const x = h.x-camX, y = h.y-44*(h.key==='bear'?1.15:1), R = 54+Math.sin(tt*8)*2;
    const g = ctx.createRadialGradient(x-R*0.3, y-R*0.35, R*0.1, x, y, R); g.addColorStop(0,'rgba(255,250,210,0.35)'); g.addColorStop(0.75,'rgba(255,200,60,0.16)'); g.addColorStop(1,'rgba(255,190,40,0.5)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.28); ctx.fill(); ctx.strokeStyle = `rgba(255,215,80,${0.6+0.3*Math.sin(tt*10)})`; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle='rgba(255,240,180,0.35)'; ctx.lineWidth=1.5; for (let i=-2;i<=2;i++){ ctx.beginPath(); ctx.ellipse(x, y, R*Math.abs(Math.cos(i*0.6+tt)), R, 0, 0, 6.28); ctx.stroke(); } }
  // 순간 이펙트
  let flash = 0;
  for (const f of G.fx) { const k = f.t/f.life, a = 1-k;
    if (f.kind==='flash') { flash = Math.max(flash, 0.55*a); continue; }
    const x = (f.ent ? f.ent.x : f.x); if (x < VWL-400 || x > VWR+400) continue;
    if (f.kind==='charge') { const e = f.ent, y = cy(e), R = (f.big?70:46)*(1-k*0.6);
      const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, 'rgba(255,255,255,'+(0.7*a)+')'); g.addColorStop(0.5, f.c); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 0.7*Math.sin(Math.PI*Math.min(1,k*1.4)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.28); ctx.fill();
      ctx.strokeStyle = f.c; ctx.lineWidth = 2; for (let i=0;i<6;i++){ const an=i*1.047+k*3, r0=R*1.4*(1-k), r1=r0+12; ctx.beginPath(); ctx.moveTo(x+Math.cos(an)*r0, y+Math.sin(an)*r0); ctx.lineTo(x+Math.cos(an)*r1, y+Math.sin(an)*r1); ctx.stroke(); } }
    else if (f.kind==='crack') { ctx.globalAlpha = Math.min(1, a*1.6); ctx.strokeStyle = '#4a3016'; ctx.lineWidth = 3.5; ctx.lineCap='round';
      for (let i=0;i<9;i++){ let px=x, py=f.y; const an = (i/9)*6.283 + f.seed; ctx.beginPath(); ctx.moveTo(px,py);
        for (let j=1;j<=3;j++){ const rr = f.r*0.33*j*Math.min(1,k*5); px = x+Math.cos(an+Math.sin(f.seed+i*j)*0.35)*rr; py = f.y+Math.sin(an+Math.sin(f.seed*2+i*j)*0.35)*rr*0.22; ctx.lineTo(px,py); } ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,220,140,0.6)'; ctx.lineWidth = 1.2; ctx.stroke(); }
    else if (f.kind==='dust') { ctx.globalAlpha = 0.55*a; ctx.fillStyle = '#d9c29a';
      for (let i=0;i<10;i++){ const s=i%2?1:-1, d=f.r*(0.2+0.9*k)*(0.5+(i%5)*0.12); ctx.beginPath(); ctx.arc(x+s*d, f.y-8-k*20-(i%3)*6, 14+k*18-(i%4)*2, 0, 6.28); ctx.fill(); } }
    else if (f.kind==='shaft') { const g = ctx.createLinearGradient(x, 0, x, GROUND); g.addColorStop(0,'rgba(255,250,210,0)'); g.addColorStop(0.7,'rgba(255,250,210,'+(0.45*a)+')'); g.addColorStop(1,'rgba(255,255,255,'+(0.8*a)+')');
      ctx.fillStyle = g; ctx.fillRect(x-7, 0, 14, GROUND); ctx.globalAlpha = a; ctx.fillStyle='#fffbe0'; ctx.beginPath(); ctx.ellipse(x, GROUND, 18*(1+k), 5, 0, 0, 6.28); ctx.fill(); }
    else if (f.kind==='spark') { ctx.globalAlpha = a; ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 2.5; for (let i=0;i<6;i++){ const an=i*1.047+f.x, r0=6+k*14, r1=r0+10*a; ctx.beginPath(); ctx.moveTo(x+Math.cos(an)*r0, f.y+Math.sin(an)*r0); ctx.lineTo(x+Math.cos(an)*r1, f.y+Math.sin(an)*r1); ctx.stroke(); } }
    else if (f.kind==='mark') { ctx.globalAlpha = 0.4+0.4*k; ctx.strokeStyle = f.c; ctx.lineWidth = 3; ctx.setLineDash([12,8]); ctx.beginPath(); ctx.ellipse(x, GROUND, f.r*(1.3-0.3*k), f.r*0.25*(1.3-0.3*k), 0, 0, 6.28); ctx.stroke(); ctx.setLineDash([]); }
    else if (f.kind==='boom') { const R = f.r*(0.4+0.9*Math.sqrt(k));
      const g = ctx.createRadialGradient(x, f.y-30, 0, x, f.y-30, R); g.addColorStop(0, 'rgba(255,255,240,'+a+')'); g.addColorStop(0.35, 'rgba(255,220,90,'+(0.85*a)+')'); g.addColorStop(0.7, 'rgba(255,120,40,'+(0.5*a)+')'); g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, f.y-30, R, 0, 6.28); ctx.fill();
      ctx.globalAlpha = a; ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 6*a; ctx.beginPath(); ctx.ellipse(x, f.y, R*1.3, R*0.3, 0, 0, 6.28); ctx.stroke(); }
    else if (f.kind==='snap') { ctx.globalAlpha = a; ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 5*a; ctx.beginPath(); ctx.ellipse(x, f.y, f.r*(0.5+0.6*k), f.r*0.3*(0.5+0.6*k), 0, 0, 6.28); ctx.stroke();
      ctx.fillStyle = 'rgba(255,230,120,'+(0.35*a)+')'; ctx.fill(); }
    else if (f.kind==='bind') { ctx.globalAlpha = a; for (let i=0;i<7;i++){ const px = x + (i-3)/3*f.r*0.8; const g = ctx.createLinearGradient(px, f.y-120*a, px, f.y); g.addColorStop(0,'rgba(200,150,255,0)'); g.addColorStop(1,'rgba(220,180,255,0.9)'); ctx.fillStyle = g; ctx.fillRect(px-4, f.y-130, 8, 130); }
      ctx.strokeStyle = '#e8d0ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, f.y, f.r, f.r*0.3, 0, 0, 6.28); ctx.stroke(); }
    else if (f.kind==='bubble') { ctx.globalAlpha = a; ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 6*a; ctx.beginPath(); ctx.arc(x, cy(f.ent), 30+50*k, 0, 6.28); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // 묶인 영웅 표시 (사슬 고리)
  for (const h of [G.hero, G.ai]) if (h && h.root>0 && isAlive(h)) { const x = h.x-camX; ctx.strokeStyle = '#c9a0ff'; ctx.lineWidth = 3; for (let i=0;i<3;i++){ ctx.beginPath(); ctx.ellipse(x, h.y-8-i*12, 26-i*3, 7, 0, 0, 6.28); ctx.stroke(); } }
  ctx.restore();
  if (flash > 0) { ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle = `rgba(255,248,220,${flash})`; ctx.fillRect(0,0,cv.width,cv.height); ctx.restore(); }
}

// ---------- 점수판 (Tab) ----------
function drawScoreboard() {
  ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,VW,VIEW_H);
  const w = Math.min(700, VW-30), x0 = VW/2-w/2, y0 = 44, rowH = 92, hh = 70 + rowH*2 + 26;
  ctx.fillStyle='rgba(18,26,48,0.94)'; rr(x0,y0,w,hh,16); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=2; ctx.stroke();
  const tk = t => G.ents.filter(e=>e.kind==='tower' && !e.dead && e.team===t).length;
  txt('점수판', x0+18, y0+20, 16, '#ffe066', 'left');
  const k0 = G.teams[0].hero.kills, k1 = G.teams[1].hero.kills;
  txt(`${k0}`, VW/2-30, y0+20, 20, '#7fc8ff'); txt('vs', VW/2, y0+20, 12, '#ddd'); txt(`${k1}`, VW/2+30, y0+20, 20, '#ff8a8a');
  const mm = Math.floor(G.t/60), ss = Math.floor(G.t%60); txt(`${mm}:${String(ss).padStart(2,'0')}`, x0+w-18, y0+20, 13, '#fff', 'right');
  const cols = [['영웅',x0+92],['레벨',x0+w*0.30],['K / D',x0+w*0.40],['CS',x0+w*0.49],['골드',x0+w*0.59],['구매한 강화',x0+w*0.70]];
  cols.forEach(([n,x],i)=>txt(n, x, y0+48, 10.5, '#aab4d0', i===0||i===5?'left':'center', false, 700));
  [0,1].forEach((t,ri) => { const tm = G.teams[t], h = tm.hero, y = y0+62+ri*rowH, col = t?'#ff6b6b':'#4fb3ff';
    ctx.fillStyle = t ? 'rgba(255,90,90,0.13)' : 'rgba(80,170,255,0.13)'; rr(x0+10, y, w-20, rowH-8, 12); ctx.fill();
    ctx.fillStyle=col; rr(x0+10, y, 6, rowH-8, 3); ctx.fill();
    const px = x0+50, py = y+(rowH-8)/2;
    ctx.save(); ctx.beginPath(); ctx.arc(px,py,28,0,6.28); ctx.fillStyle=HEROES[h.key].color; ctx.fill(); ctx.clip(); drawSprite(HEROES[h.key].img+(t?'_r':''), px, py+38, 76, false); ctx.restore();
    ctx.strokeStyle=col; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(px,py,28,0,6.28); ctx.stroke();
    if (h.respawn>0) { ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(px,py,28,0,6.28); ctx.fill(); txt(String(Math.ceil(h.respawn)), px, py, 16, '#fff'); }
    txt(h.d.name + (t===0?' (나)':' (적)'), x0+92, py-12, 14, '#fff', 'left'); txt(h.d.role, x0+92, py+10, 9.5, '#c8d0e8', 'left', false, 600);
    txt(`Lv.${h.lv}`, x0+w*0.30, py, 15, h.lv>=15 ? '#ffb347' : '#ffe066');
    txt(`${h.kills} / ${h.deaths}`, x0+w*0.40, py, 15, '#fff'); txt(String(h.cs||0), x0+w*0.49, py, 15, '#fff');
    txt(t===0 ? `${Math.floor(tm.gold)}` : '?', x0+w*0.59, py-8, 14, '#ffd23f'); txt(`총 ${Math.floor(ECON.start + (tm.earned||0) + (tm.passive||0))}`, x0+w*0.59, py+11, 9.5, '#e8d8a0', 'center', false, 600);
    const ux = x0+w*0.70; txt(`무기 ${tm.weapon ? '+'+tm.weapon : '기본'} (${tm.weapon}/5)   스킬 강화 ${tm.skill.join('/')}`, ux, py-14, 11, '#fff', 'left', false, 700);
    txt(`기지 ${BASE.names[tm.stage]}   타워 ${tk(t)}개`, ux, py+4, 11, '#fff', 'left', false, 700);
    txt(tm.buffT>0 ? `${DN()} 버프 ${Math.ceil(tm.buffT)}초` : '', ux, py+21, 10, '#a8ffcf', 'left', false, 700); });
  txt('Tab 또는 화면을 터치하면 닫힘', VW/2, y0+hh-14, 10, '#aab4d0', 'center', false, 600);
  uiRects.push({r:{x:0,y:0,w:VW,h:VIEW_H}, fn:()=>{ G.scoreOpen=false; }});
}

// ---------- 타이틀 / 선택 / 결과 ----------
function drawMenuBg() {
  if (window.R3D) R3D.renderMenu(T, scene, selHero);
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height); ctx.setTransform(SC,0,0,SC,0,0);
}
function button(label, x, y, w, h, color, fn, size=20) {
  const pulse = 1 + Math.sin(T*4)*0.02; ctx.save(); ctx.translate(x,y); ctx.scale(pulse,pulse);
  ctx.fillStyle='rgba(0,0,0,0.25)'; rr(-w/2+3,-h/2+5,w,h,h/2); ctx.fill();
  ctx.fillStyle=color; rr(-w/2,-h/2,w,h,h/2); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.stroke();
  txt(label, 0, 1, size); ctx.restore(); uiRects.push({r:{x:x-w/2,y:y-h/2,w,h}, fn});
}
// 버전 표시 (js/version.js) + 타이틀에서는 업데이트 상태와 '새로고침' 버튼 (js/update.js)
// js/lobby.js 가 타이틀(로비) 오른쪽 아래에서 부름
if (typeof window !== 'undefined') window.drawVersionUI = (c, vw, vh, rects) => drawVersion(true, rects);
function drawVersion(withBtn, rects = uiRects) {
  const U = window.LRUpdate, upd = U && U.state==='update';
  const label = `v${self.LR_VERSION||'?'} · ${self.LR_BUILD||''}` + (U ? `  ·  ${U.label()}` : '');
  if (!withBtn || !U) { txt(label, VW-10, VIEW_H-10, 10, 'rgba(255,255,255,0.8)', 'right'); return; }
  const bw = upd ? 150 : 86, bh = 28, bx = VW-10-bw, by = VIEW_H-12-bh-16, pul = upd ? 0.75+0.25*Math.sin(T*5) : 0.85;
  ctx.globalAlpha = pul; ctx.fillStyle = upd ? '#ff8a2a' : 'rgba(20,30,60,0.7)'; rr(bx, by, bw, bh, 14); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(); ctx.globalAlpha=1;
  txt(upd ? '⟳ 업데이트 받기' : '⟳ 새로고침', bx+bw/2, by+bh/2, 12, '#fff');
  txt(label, VW-10, VIEW_H-10, 10, upd ? '#ffd0a0' : 'rgba(255,255,255,0.85)', 'right');
  rects.push({r:{x:bx-6, y:by-6, w:bw+12, h:bh+12}, fn:()=>U.hardReload()});
}
function drawTitle() {
  drawMenuBg(); uiRects = [];
  // 3D heroes rendered by R3D.renderMenu
  ctx.save(); ctx.translate(VW/2, 70); const s = 1+Math.sin(T*2.5)*0.03; ctx.scale(s,s);
  txt('라인 러쉬', 0, 0, 56, '#ffe066'); ctx.restore();
  txt('LINE RUSH · 동물 영웅 라인전', VW/2, 138, 16, '#fff');
  const acc = accLevelInfo(store.get('accxp',0));
  ctx.fillStyle='rgba(20,30,60,0.5)'; rr(12,12,170,44,12); ctx.fill();
  txt(`계정 Lv.${acc.lv}`, 24, 26, 14, '#ffe066', 'left'); ctx.fillStyle='rgba(0,0,0,0.4)'; rr(24,38,146,8,4); ctx.fill(); ctx.fillStyle='#b48cff'; rr(24,38,146*acc.cur/acc.need,8,4); ctx.fill();
  txt(`승리 ${store.get('wins',0)} / 경기 ${store.get('matches',0)}`, VW-14, 26, 12, '#fff', 'right');
  button(muted?'소리 꺼짐':'소리 켜짐', VW-60, 60, 90, 30, muted?'#777':'#4f8cff', toggleMute, 12);
  ctx.globalAlpha = 0.6+0.4*Math.sin(T*4); txt('화면을 터치하여 시작', VW/2, 184, 20, '#fff'); ctx.globalAlpha=1;
}
function drawSelect() {
  drawMenuBg(); uiRects = [];
  ctx.fillStyle='rgba(20,30,60,0.15)'; ctx.fillRect(0,0,VW,VIEW_H);
  txt('영웅 선택', VW/2, 28, 26, '#ffe066');
  const ks = Object.keys(HEROES), cw = Math.min(230, (VW-50)/3);
  // 3D hero previews in upper area; compact cards at bottom
  const ch2 = 130;
  ks.forEach((k,i) => { const d = HEROES[k], x = VW/2 + (i-1)*(cw+10), y = 248, sel = selHero===k;
    ctx.save(); if (sel) { ctx.translate(x, y+ch2/2); ctx.scale(1.03,1.03); ctx.translate(-x, -(y+ch2/2)); }
    ctx.fillStyle = sel ? 'rgba(255,248,224,0.72)' : 'rgba(255,255,255,0.55)'; rr(x-cw/2, y, cw, ch2, 16); ctx.fill();
    ctx.strokeStyle = sel ? '#ffb92e' : 'rgba(255,255,255,0.9)'; ctx.lineWidth = sel?4:2; ctx.stroke();
    txt(d.name, x, y+18, 18, '#4a2e10', 'center', false); txt(d.role, x, y+36, 11, '#8a6a4a', 'center', false, 600);
    d.skills.forEach((s,j) => { txt(`${['1','2','궁'][j]} ${s.name}`, x-cw/2+10, y+55+j*22, 11, ['#d0661a','#2a7fc8','#8a3fd0'][j], 'left', false, 800); });
    ctx.restore();
    // tap zone includes upper 3D area for this column
    uiRects.push({r:{x:x-cw/2, y:20, w:cw, h:y+ch2-20}, fn:()=>{ if (selHero===k) startMatch(); else selHero=k; }});
  });
  button('출전!', VW/2, 412, 180, 42, '#43b85c', startMatch, 20);
  txt(store.get('matches',0)===0 ? '상대: 쉬움' : '상대: 보통', VW-16, 28, 13, '#fff', 'right');
}
function drawResult() {
  drawMenuBg(); uiRects = [];
  ctx.fillStyle='rgba(20,30,60,0.45)'; ctx.fillRect(0,0,VW,VIEW_H);
  const r = result, k = Math.min(1, sceneT*2);
  ctx.save(); ctx.translate(VW/2, 70); ctx.scale(0.5+k*0.5, 0.5+k*0.5); txt(r.win ? '승리!' : '패배...', 0, 0, 60, r.win ? '#ffe066' : '#b8c4ff'); ctx.restore();
  drawSprite(HEROES[selHero].img, VW/2 - 200, 340 - (r.win? Math.abs(Math.sin(T*5))*20 : 0), 180, false, {rot: r.win?0:0.15});
  const x0 = VW/2 - 60; ctx.fillStyle='rgba(255,255,255,0.92)'; rr(x0, 115, 300, 220, 16); ctx.fill();
  const t = r.time; const lines = [`경기 시간   ${Math.floor(t/60)}분 ${Math.floor(t%60)}초`, `처치 / 죽음   ${r.kills} / ${r.deaths}`, `미니언 막타   ${r.cs}`, `계정 경험치   +${Math.floor(r.gain*k)}`];
  lines.forEach((l,i)=>txt(l, x0+20, 145+i*32, 16, '#4a2e10', 'left', false));
  const acc = accLevelInfo(store.get('accxp',0));
  txt(`계정 Lv.${acc.lv}` + (r.lvUp?'  레벨 업!':''), x0+20, 280, 17, r.lvUp?'#e07b00':'#6b3f12', 'left', false);
  ctx.fillStyle='#ddd'; rr(x0+20, 300, 260, 10, 5); ctx.fill(); ctx.fillStyle='#b48cff'; rr(x0+20, 300, 260*acc.cur/acc.need, 10, 5); ctx.fill();
  button('로비로', VW/2, 392, 190, 48, '#4f8cff', ()=>{ scene='title'; sceneT=0; }, 20);
}
function drawLoading(){ if (window.R3D) R3D.renderBlank(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height); ctx.setTransform(SC,0,0,SC,0,0); txt(`불러오는 중... ${Math.floor(loaded/imgNames.length*100)}%`, VW/2, VIEW_H/2, 22); }

// ================= 메인 루프 =================
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0,(now-last)/1000)); last = now; T += dt; sceneT += dt;
  ctx.setTransform(SC,0,0,SC,0,0);
  try {
    if (loaded < imgNames.length) drawLoading();
    else if (scene==='title') drawTitle();
    else if (scene==='select') drawSelect();
    else if (scene==='result') drawResult();
    else if (scene==='match') {
      if (G.hitstop > 0) { G.hitstop -= dt; }
      else if (!G.over) { let total = dt*SPEED; if (G.slowT > 0) { G.slowT -= dt; total *= 0.35; /* 처치 슬로모션 */ } while (total > 1e-6) { const s = Math.min(total, 1/60); update(s); total -= s; } }
      else { for (const p of G.parts){ p.t+=dt; if(!p.ring){p.x+=p.vx*dt;p.y+=p.vy*dt;} } G.parts=G.parts.filter(p=>p.t<p.life); for (const m of G.msg) m.t -= dt*0.3; }
      shake = Math.max(0, shake - dt*30);
      drawMatch();
    }
  } catch(err) { console.error(err); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// 테스트/디버그 훅
window.__LR = { get G(){return G;}, get scene(){return scene;}, get result(){return result;}, startMatch, setHero:k=>{selHero=k;}, useSkill:i=>useSkill(G.hero,i), buy, towerAct,
  sim(sec){ let t=sec; while (t>0 && !G.over) { update(1/60); t-=1/60; } return G.t; } };
