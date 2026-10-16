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
  G = { t:0, ents:[], proj:[], parts:[], nums:[], diff, over:false, camX:0, shopOpen:false, popup:null, msg:[], dragonNext:DRAGON.first,
    teams:[mkTeam(0), mkTeam(1)], stats:{kills:0,deaths:0,cs:0}, plats:[], obst:[], slots:[] };
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
  Object.assign(h, { lv:1, xp:0, atk:d.atk, cds:[0,0,0], ground:true, shield:0, respawn:0, ai: aiDiff ? {diff:aiDiff, think:0, mode:'lane', skillT:0, shopT:5, jumpCd:0} : null,
    face: team?-1:1, kills:0, deaths:0, wards:[], dash:null, slam:null, inputX:0 });
  return h;
}
function addMsg(text, color){ G.msg.push({text, color, t:3}); if (G.msg.length>3) G.msg.shift(); }

// ================= 엔티티 헬퍼 =================
const isAlive = e => !e.dead && !(e.kind==='hero' && e.respawn>0);
function enemiesOf(team, opt={}) {
  return G.ents.filter(e => isAlive(e) && e.team!==team && e.kind!=='ward' && e.kind!=='obst' && !(e.kind==='dragon' && !opt.dragon));
}
function cy(e){ return e.y - e.h/2; }
function heroAtk(h){ return h.atk * (1 + 0.12*G.teams[h.team].weapon) * (h.ai && h.ai.diff==='easy' ? 0.7 : 1); }
function skillMul(h,i){ return (1 + 0.25*G.teams[h.team].skill[i]) * (1 + 0.07*(h.lv-1)) * (h.ai && h.ai.diff==='easy' ? 0.7 : 1); }

function damage(src, tgt, amt, o={}) {
  if (!isAlive(tgt)) return;
  if (tgt.kind==='hero') { if (tgt.shield>0) amt*=0.5; if (src && src.kind==='minion') amt *= MINION_VS_HERO; amt *= 1 - (tgt.d.armor||0); }
  if (tgt.kind==='base' || tgt.kind==='tower') { if (src && src.kind==='minion') { if (src.mt.structMul) amt *= src.mt.structMul; amt *= src.structRush||1; } if (src && src.kind==='hero') amt *= HERO_STRUCT_MUL; if (tgt.kind==='base' && !G.ents.some(t=>t.kind==='tower'&&!t.dead&&t.team===tgt.team)) amt *= EXPOSED_BASE_MUL; }
  if (tgt.kind==='minion' && src) { if (src.kind==='hero') amt *= HERO_MINION_MUL; else if (src.kind==='minion') amt *= MINION_VS_MINION; else if (src.kind==='tower') amt *= TOWER_VS_MINION; }
  amt = Math.round(amt);
  tgt.hp -= amt; tgt.flash = 1; tgt.lastDmg = G.t; if (tgt.kind==='dragon' && src && src.team<2) (tgt.aggro=tgt.aggro||{})[src.team]=G.t;
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
  if (o.slow) tgt.slow = Math.max(tgt.slow, o.slow);
  if (o.kb && tgt.kind!=='base' && tgt.kind!=='tower' && tgt.kind!=='dragon' && !(tgt.kind==='minion' && tgt.mt===MINIONS.boss)) { tgt.kbv = o.kb; tgt.vy = Math.min(tgt.vy, -250); }
  if (tgt === G.hero && amt > 40) shake = Math.max(shake, 5);
  if (tgt.hp <= 0) kill(tgt, src);
}
function heroOf(src){ return src && src.kind==='hero' ? src : null; }
function giveXp(h, xp){ if (!h || h.lv>=10) return; h.xp += xp;
  while (h.lv<10 && h.xp >= LEVEL_XP[h.lv]) { h.lv++; h.maxHp += h.d.hpL; h.hp += h.d.hpL; h.atk += h.d.atkL;
    burst(h.x, cy(h), '#ffe066', 24); if (h===G.hero) sfx('level'); if (h===G.hero) addMsg(h.lv===5 ? `레벨 ${h.lv}! 궁극기 해제!` : `레벨 업! Lv.${h.lv}`, '#ffe066'); } }
function gold(team, g, x, y){ G.teams[team].gold += g; if (team===0 && x!=null) sfx('gold'); if (team===0 && x!=null) G.nums.push({x, y, v:'+'+g+'G', t:0, c:'#ffd23f', gold:true}); }
function kill(e, src) {
  e.hp = 0; const sh = heroOf(src);
  burst(e.x, cy(e), e.kind==='hero' ? '#ffffff' : (e.team===0?'#7fc8ff':'#ff8a6a'), e.kind==='minion'?14:30);
  if (e.kind==='minion') {
    e.dead = true; G.parts.push({pop:true, img:`m_${MAP.teamElem[e.team]}${e.mt.img}`, x:e.x, y:e.y, h:e.mt.h, face:e.face, t:0, life:0.35}); if (onScreen(e)) sfx('pop');
    if (sh && sh.team!==e.team) { gold(sh.team, e.mt.gold, e.x, e.y-e.h-10); if (sh===G.hero) G.stats.cs++; }
    const foe = G.teams[1-e.team].hero; if (isAlive(foe) && Math.abs(foe.x-e.x) < 750) giveXp(foe, e.mt.xp);
  } else if (e.kind==='hero') {
    G.parts.push({pop:true, img:HEROES[e.key].img+(e.team?'_r':''), x:e.x, y:e.y, h:78, face:e.face, t:0, life:0.5}); G.hitstop = 0.12; sfx('boom',0.8);
    e.respawn = 4 + e.lv*1.6; e.deaths++; e.slow=e.stun=0; e.shield=0; e.dash=null; e.slam=null; e.kbv=0;
    const k = G.teams[1-e.team].hero; k.kills++;
    gold(1-e.team, ECON.heroKill, k.x, k.y-90); giveXp(k, 120 + e.lv*25);
    addMsg(e===G.hero ? `처치당했습니다! ${Math.ceil(e.respawn)}초 후 부활` : '적 영웅 처치! +'+ECON.heroKill+'G', e===G.hero?'#ff8a8a':'#ffe066');
    shake = 10;
  } else if (e.kind==='tower') {
    e.dead = true; sfx('boom', 0.9); e.slot.tower = null; e.slot.ruinT = 75; gold(1-e.team, ECON.towerKill, e.x, e.y-130); shake = 12;
    addMsg(e.team===0 ? '아군 타워가 파괴되었습니다!' : '적 타워 파괴! +'+ECON.towerKill+'G', e.team===0?'#ff8a8a':'#9fe3ff');
  } else if (e.kind==='obst') {
    e.dead = true; if (sh) gold(sh.team, ECON.crate, e.x, e.y-60);
    for (let i=0;i<12;i++) G.parts.push({x:e.x, y:cy(e), vx:rand(-200,200), vy:rand(-350,-50), t:0, life:0.8, c:e.type==='rock'?'#9a9aa8':'#b07a42', r:rand(3,6), g:true});
  } else if (e.kind==='dragon') {
    e.dead = true; const team = sh ? sh.team : (src ? src.team : 0);
    if (team<2) { G.teams[team].buffT = DRAGON.buff; gold(team, ECON.dragonGold, e.x, e.y-120);
      addMsg(team===0 ? '바람 용 처치! 이동속도·점프 강화!' : '적이 바람 용을 처치했습니다!', team===0?'#a8ffcf':'#ff8a8a'); }
    G.dragonNext = G.t + DRAGON.every; shake = 10;
  } else if (e.kind==='base') {
    e.dead = true; shake = 25; burst(e.x, cy(e), '#ffd23f', 80); G.hitstop = 0.25; sfx('boom', 1.3);
    endMatch(e.team===1);
  } else e.dead = true;
}
function burst(x,y,c,n){ for(let i=0;i<n;i++){ const a=rand(0,6.28), s=rand(60,300); G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-80,t:0,life:rand(0.4,0.9),c,r:rand(2,5)}); } }

// ================= 업데이트 =================
function update(dt) {
  G.t += dt;
  for (const t of [0,1]) { const tm=G.teams[t]; tm.gold += ECON.passive*dt; tm.buffT=Math.max(0,tm.buffT-dt); tm.wardCd=Math.max(0,tm.wardCd-dt);
    G.waveT[t] -= dt; if (G.waveT[t] <= 0) { G.waveT[t] = BASE.wave[tm.stage]; spawnWave(t); } }
  if (G.t >= G.dragonNext) {
    G.dragonNext = Infinity; const p = G.plats.find(p=>p.center);
    const d = ent({kind:'dragon', team:2, x:WORLD_W/2, y:p.y-6, w:110, h:95, hp:Math.round(DRAGON.hp + G.t*4)}); d.cd=2; d.homeY=p.y-6;
    addMsg('바람 용이 나타났다! (중앙 위 발판)', '#a8ffcf');
  }
  for (const e of G.ents) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt*5); e.anim += dt; if (e.squash) e.squash = Math.max(0, e.squash - dt*7);
    if (e.stun>0) e.stun -= dt; if (e.slow>0) e.slow -= dt;
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
  for (const p of G.parts) { p.t += dt; if (p.ring) continue; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += (p.g?900:300)*dt; p.vx *= 0.98; }
  G.parts = G.parts.filter(p => p.t < p.life); if (G.parts.length > 600) G.parts.splice(0, G.parts.length-600);
  for (const n of G.nums) n.t += dt; G.nums = G.nums.filter(n => n.t < 0.9);
  for (const m of G.msg) m.t -= dt; G.msg = G.msg.filter(m=>m.t>0);
  G.ents = G.ents.filter(e => !e.dead);
  G.obst = G.obst.filter(e => !e.dead);
  if (G.popup && G.popup.slot.tower && G.popup.slot.tower.dead) G.popup=null;
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
    m.atkMul = (sc*0.85+0.15) * (rush ? 1 + (G.t-RUSH_TIME)/60*0.25 : 1); if (rush) { m.rush = true; m.structRush = 1 + (G.t-RUSH_TIME)/60*0.8; } m.face = dir; m.cd = rand(0,0.4); m.ofs = rand(0, k==='melee'?26:40);
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
  if (h.respawn > 0) { h.respawn -= dt; if (h.respawn<=0) { h.respawn=0; h.hp=h.maxHp; h.x=tm.base.x + (h.team?-100:100); h.y=GROUND-200; h.vy=0; h.cds=h.cds.map(c=>Math.min(c,2)); burst(h.x, h.y, '#fff', 20);} return; }
  for (let i=0;i<3;i++) h.cds[i] = Math.max(0, h.cds[i]-dt);
  h.shield = Math.max(0, h.shield-dt); h.atkT -= dt; if (h.dropT) h.dropT = Math.max(0,h.dropT-dt);
  if (Math.abs(h.x - tm.base.x) < 260) h.hp = Math.min(h.maxHp, h.hp + h.maxHp*0.10*dt);
  else h.hp = Math.min(h.maxHp, h.hp + h.maxHp*(G.t-(h.lastDmg||0) > 4 ? 0.025 : 0.006)*dt);
  if (h.ai) aiThink(h, dt); else playerInput(h);
  const buff = tm.buffT>0;
  const spd = h.d.spd * (buff?1.25:1) * (h.slow>0?0.6:1);
  if (h.stun>0) h.inputX = 0;
  if (h.dash) { if (!h.dash.snd) { h.dash.snd=1; if (onScreen(h)) sfx('boom',0.4); } h.dash.t -= dt; h.vx = h.dash.vx;
    for (const e of enemiesOf(h.team)) if (!h.dash.hit.has(e) && Math.abs(e.x-h.x)<55 && Math.abs(cy(e)-cy(h))<70) { h.dash.hit.add(e); damage(h,e,h.dash.dmg,{kb:h.face*520, stun:0.5, pc:'#ffcf6a'}); shake=Math.max(shake,6);}
    if (h.dash.t<=0) h.dash=null; }
  else if (h.kbv) { h.vx = h.kbv; h.kbv *= Math.pow(0.02, dt); if (Math.abs(h.kbv)<20) h.kbv=0; }
  else h.vx = h.inputX * spd;
  if (h.inputX && !h.dash) h.face = Math.sign(h.inputX);
  let nx = clamp(h.x + h.vx*dt, 40, WORLD_W-40);
  for (const o of G.obst) if (!o.dead && h.y > o.y-o.h+2 && Math.abs(nx-o.x) < (o.w+h.w)/2 && Math.abs(nx-o.x) < Math.abs(h.x-o.x)) { nx = h.x; h.blocked = true; }
  h.x = nx;
  const wasGround = h.ground; h.ground = physics(h, dt);
  if (h.ground && !wasGround) { h.land = 1; if (h.slam) doSlam(h); }
  h.land = Math.max(0,(h.land||0)-dt*4);
  if (h.atkT <= 0 && h.stun<=0 && !h.dash) {
    const tgt = pickTarget(h);
    if (tgt) { h.atkT = h.d.as; h.face = Math.sign(tgt.x-h.x)||h.face; h.swing = 1; h.animAct='basic'; h.animSeq=(h.animSeq||0)+1;
      const crit = Math.random() < 0.15, dmgA = heroAtk(h)*(crit?1.7:1); if (onScreen(h)) sfx(h.d.proj?'shoot':'hit', 0.4);
      if (h.d.proj) G.proj.push({kind:h.d.proj, x:h.x+h.face*20, y:cy(h)-8, team:h.team, owner:h, target:tgt, dmg:dmgA, crit, spd:h.d.proj==='arrow'?720:520, homing:true, aoe:h.d.proj==='orb'?45:0});
      else { damage(h, tgt, dmgA, {pc:'#ffe2a0', crit}); if (h.d.lifesteal) h.hp = Math.min(h.maxHp, h.hp + dmgA*h.d.lifesteal); if (tgt.kind!=='minion') shake=Math.max(shake,2); }
    }
  }
  h.swing = Math.max(0,(h.swing||0)-dt*4);
}
function pickTarget(h) {
  const r = h.d.range; let best=null, bs=1e9;
  for (const e of enemiesOf(h.team, {dragon:true})) {
    const dx=Math.abs(e.x-h.x)-(e.w/2); const dy=Math.abs(cy(e)-cy(h));
    if (!(dx <= r && dy < (h.d.proj? r*0.8 : 70+e.h*0.3))) continue;
    const pr = e.kind==='hero'?0 : e.kind==='minion'?1000 : e.kind==='dragon'?2000 : 3000;
    const s = pr + Math.abs(e.x-h.x) + (e.kind==='minion'? e.hp*0.3:0);
    if (s<bs) { bs=s; best=e; }
  }
  if (!best) for (const o of G.obst) if (!o.dead && Math.abs(o.x-h.x) < Math.min(r,90)+o.w/2 && Math.abs(cy(o)-cy(h))<80) return o;
  return best;
}
function canUlt(h){ return h.lv >= 5; }
function useSkill(h, i) {
  if (!h || h.respawn>0 || h.stun>0 || h.cds[i]>0) return false;
  if (i===2 && !canUlt(h)) { if (h===G.hero && !h.ai) addMsg('궁극기는 레벨 5에 해제됩니다', '#ddd'); return false; }
  const m = skillMul(h,i), f = h.face, k = h.key;
  if (k==='bear') {
    if (i===0) { if (!h.ground) return false; h.vy = -560; h.ground=false; h.slam = {dmg:85*m}; }
    if (i===1) { h.shield = 3 + G.teams[h.team].skill[1]*0.5; burst(h.x, cy(h), '#ffcc33', 20); }
    if (i===2) { h.dash = {t:0.38, vx:f*950, dmg:210*m, hit:new Set()}; shake=Math.max(shake,4); }
  } else if (k==='chick') {
    if (i===0) for (const a of [-0.18,0,0.18]) G.proj.push({kind:'arrow', x:h.x+f*20, y:cy(h)-6, vx:Math.cos(a)*f*760, vy:Math.sin(a)*760, team:h.team, owner:h, dmg:72*m, life:0.6, big:true});
    if (i===1) { h.vy = -520; h.ground=false; h.kbv = -f*600; burst(h.x, h.y, '#fff8c0', 12); }
    if (i===2) { const cx = h.x + f*260; G.proj.push({kind:'rain', x:cx, y:0, team:h.team, owner:h, dmg:42*m, life:2.2, tick:0, w:320}); }
  } else if (k==='cat') {
    if (i===0) G.proj.push({kind:'ice', x:h.x+f*20, y:cy(h)-6, vx:f*620, vy:0, team:h.team, owner:h, dmg:115*m, life:0.7, slow:2});
    if (i===1) { burst(h.x, cy(h), '#c9b3ff', 18); h.x = clamp(h.x + f*230, 40, WORLD_W-40); h.y -= 90; h.vy = -100; h.ground=false; burst(h.x, cy(h), '#c9b3ff', 18); }
    if (i===2) { let tx = h.x + f*280; const eh = G.teams[1-h.team].hero; if (isAlive(eh) && Math.abs(eh.x-h.x)<520) tx = eh.x;
      G.proj.push({kind:'star', x0:tx-f*260, tx, ty:GROUND, team:h.team, owner:h, dmg:360*m, life:0.8, t0:0.8}); }
  }
  h.animAct=['skill1','skill2','ult'][i]; h.animSeq=(h.animSeq||0)+1; // characters/ 퍼펫 동작 트리거
  if (onScreen(h)) sfx('shoot');
  h.cds[i] = h.d.skills[i].cd * (1 - 0.1*G.teams[h.team].skill[i]);
  return true;
}
function doSlam(h) {
  const s = h.slam; h.slam = null; shake = Math.max(shake, 10); G.hitstop = 0.07; if (onScreen(h)) sfx('boom', 0.7);
  for (let i=0;i<26;i++) G.parts.push({x:h.x+rand(-120,120), y:h.y, vx:rand(-80,80), vy:rand(-300,-80), t:0, life:0.6, c:'#c9a46a', r:rand(3,6), g:true});
  G.parts.push({ring:true, x:h.x, y:h.y, t:0, life:0.35, r:130, c:'#ffe6a0'});
  for (const e of enemiesOf(h.team, {dragon:true})) if (Math.abs(e.x-h.x) < 130+e.w/2 && Math.abs(e.y-h.y) < 90) damage(h, e, s.dmg, {stun:1.1, pc:'#ffd27a'});
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
    if (p.kind==='rain') { p.life -= dt; p.tick -= dt; G.parts.push({arrowfx:true, x:p.x+rand(-p.w/2,p.w/2), y:rand(-20,100), vx:-30, vy:900, t:0, life:0.4, c:'#fff'});
      if (p.tick<=0) { p.tick = 0.22; for (const e of enemiesOf(p.team, {dragon:true})) if (Math.abs(e.x-p.x) < p.w/2) damage(p.owner, e, p.dmg, {pc:'#fff'}); }
      if (p.life<=0) p.dead=true; continue; }
    if (p.kind==='star') { p.life -= dt; const k = clamp(1 - p.life/p.t0, 0, 1);
      p.cx = lerp(p.x0, p.tx, k); p.cy = lerp(-60, p.ty-20, k*k);
      G.parts.push({x:p.cx, y:p.cy, vx:rand(-40,40), vy:rand(-40,40), t:0, life:0.5, c: Math.random()<0.5?'#fff3a0':'#ffd23f', r:rand(3,7)});
      if (p.life<=0) { p.dead=true; shake=Math.max(shake,14); G.hitstop=0.08; sfx('boom',1); burst(p.tx, GROUND-30, '#ffe066', 60); G.parts.push({ring:true, x:p.tx, y:GROUND-20, t:0, life:0.45, r:170, c:'#fff3a0'});
        for (const e of enemiesOf(p.team, {dragon:true})) if (Math.abs(e.x-p.tx) < 165+e.w/2 && cy(e) > GROUND-300) damage(p.owner, e, p.dmg, {stun:0.4, color:'#ffe066', pc:'#ffe066'}); }
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
  if (ai.shopT <= 0) { ai.shopT = easy ? 9 : 4; aiShop(h); }
  if (ai.think <= 0) {
    ai.think = easy ? 0.45 : 0.25; ai.thinkStep = ai.think; if (!G.ents.some(e=>e.kind==='dragon')) ai.dragonT = 0;
    const hpP = h.hp/h.maxHp;
    const allies = G.ents.filter(e=>e.kind==='minion'&&!e.dead&&e.team===h.team);
    const front = allies.length ? allies.reduce((a,b)=> (b.x*dir > a.x*dir ? b : a)) : null;
    const dragon = G.ents.find(e=>e.kind==='dragon'&&!e.dead);
    if (hpP < (easy?0.22:0.3)) ai.mode = 'retreat';
    else if (ai.mode==='retreat' && (hpP < 0.75 || G.t-(h.lastDmg||0) < 2)) ai.mode = 'retreat';
    else if (dragon && !easy && h.lv>=5 && (ai.mode==='dragon' ? hpP>0.45 : hpP>0.8) && (ai.dragonT||0) < 25 && (!isAlive(foe) || Math.abs(foe.x-dragon.x)>900)) { ai.mode='dragon'; ai.dragonT=(ai.dragonT||0)+ai.thinkStep; }
    else ai.mode = 'lane';
    let gx;
    if (ai.mode==='retreat') gx = G.t-(h.lastDmg||0) > 3 && Math.abs(h.x-tm.base.x) > 300 ? h.x : tm.base.x; // 안전하면 제자리 회복
    else if (ai.mode==='dragon') gx = dragon.x;
    else {
      const enemyT = G.ents.filter(e=>(e.kind==='tower')&&!e.dead&&e.team!==h.team).map(e=>e.x);
      gx = front ? front.x - dir*(h.d.proj? 120 : 40) : tm.base.x + dir*500;
      if (isAlive(foe) && Math.abs(foe.x-h.x) < 420 && (hpP > foe.hp/foe.maxHp - 0.15)) gx = foe.x - dir*(h.d.proj? h.d.range*0.8 : 30);
      if (!isAlive(foe) && front) gx = front.x + dir*20; // 적 영웅이 없으면 밀어붙이기
      const eb = G.teams[1-h.team].base;
      if (!enemyT.length && hpP > 0.5 && (!isAlive(foe) || Math.abs(foe.x-eb.x) > 500 || hpP > foe.hp/foe.maxHp)) gx = eb.x - dir*(h.d.range*0.7 + 60); // 타워가 없으면 기지 공격
      for (const tx of enemyT) { const safe = tx - dir*(TOWER.range+30); const minionsAtTower = allies.some(a=>Math.abs(a.x-tx)<TOWER.range+40); if (!minionsAtTower && (gx-safe)*dir > 0) gx = safe; }
    }
    ai.gx = clamp(gx, 60, WORLD_W-60); ai.gy = ai.mode==='dragon' ? dragon.y : GROUND;
  }
  const dx = ai.gx - h.x;
  h.inputX = Math.abs(dx) > 25 ? Math.sign(dx) : 0;
  if (h.ground && ai.jumpCd<=0) {
    if (h.blocked) aiJump(h);
    else if (ai.mode==='dragon' && h.y > ai.gy + 40) {
      const reach = G.plats.filter(p => p.y < h.y-20 && h.y - p.y < 125);
      const p = reach.sort((a,b)=>Math.abs(a.x+a.w/2-ai.gx)-Math.abs(b.x+b.w/2-ai.gx))[0];
      if (p) { const px = clamp(h.x, p.x+20, p.x+p.w-20); if (Math.abs(px-h.x) < 30) aiJump(h); else h.inputX = Math.sign(px-h.x); }
    }
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
      if (fh && fd < 130) used = useSkill(h,1) || used;
      if ((fh && fd < 360) || near.length>=4) used = useSkill(h,2) || used;
    } else {
      if ((fh && fd < 330) || near.length>=3) used = useSkill(h,0) || used;
      if (ai.mode==='retreat' && fh && fd<250) { h.face = h.team?1:-1; used = useSkill(h,1) || used; }
      if ((fh && fd < 450) || near.length>=4) used = useSkill(h,2) || used;
    }
    if (!used) h.face = of;
    if (!easy && tm.wardCd<=0 && Math.random()<0.2) placeWard(h);
  }
}
function aiJump(h){ h.vy = -640*(G.teams[h.team].buffT>0?1.15:1); h.ground=false; h.ai.jumpCd=0.5; }
function aiShop(h) {
  const tm = G.teams[h.team], easy = h.ai.diff==='easy';
  const order = [];
  if (tm.stage < 1) order.push(()=>buy(h.team,'base'));
  order.push(()=>buy(h.team,'weapon'));
  const empty = G.slots.filter(s=>s.team===h.team && !s.tower).sort((a,b)=>Math.abs(a.x-tm.base.x)-Math.abs(b.x-tm.base.x));
  if (empty.length && !easy) order.push(()=>towerAct(empty[empty.length-1], 'build'));
  if (h.lv>=5) order.push(()=>buy(h.team,'skill2'));
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
  return { jump:{x:VW-58, y:388, r:34}, s0:{x:VW-138, y:408, r:26}, s1:{x:VW-132, y:338, r:26}, s2:{x:VW-68, y:300, r:28},
    ward:{x:VW-200, y:418, r:20}, shop:{x:VW-48, y:32, r:22} };
}
cv.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); try { cv.setPointerCapture(e.pointerId); } catch(_){} onDown(toLogical(e), e.pointerId); }, {passive:false});
cv.addEventListener('pointermove', e => { if (joy.active && joy.id===e.pointerId) joy.x = toLogical(e).x; });
const upH = e => { if (joy.id===e.pointerId) { joy.active=false; joy.id=null; } };
cv.addEventListener('pointerup', upH); cv.addEventListener('pointercancel', upH);
addEventListener('contextmenu', e=>e.preventDefault());
addEventListener('keydown', e => { audioInit(); keys[e.code]=true; if (e.code==='KeyM') toggleMute(); if (!e.repeat) onKey(e.code); if (['Space','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault(); });
addEventListener('keyup', e => { keys[e.code]=false; });
function inC(p, b, extra=0){ return Math.hypot(p.x-b.x, p.y-b.y) <= b.r+extra; }
function inRect(p, r){ return p.x>=r.x && p.x<=r.x+r.w && p.y>=r.y && p.y<=r.y+r.h; }
let uiRects = [];
function onDown(p, id) {
  for (const u of uiRects) if (inRect(p, u.r)) { u.fn(); return; }
  if (scene==='title') { if (window.LRFS) LRFS.firstTap(); if (sceneT>0.3) { scene='select'; sceneT=0; } return; }
  if (scene!=='match' || G.over) return;
  if (G.shopOpen) { G.shopOpen=false; return; }
  const B = btnLayout();
  if (inC(p,B.shop,6)) { G.shopOpen = true; G.popup=null; return; }
  if (inC(p,B.jump,10)) { doJump(); return; }
  if (inC(p,B.s0,6)) { useSkill(G.hero,0); return; }
  if (inC(p,B.s1,6)) { useSkill(G.hero,1); return; }
  if (inC(p,B.s2,6)) { useSkill(G.hero,2); return; }
  if (inC(p,B.ward,6)) { placeWard(G.hero); return; }
  const wx = p.x + G.camX;
  if (!(p.x < 180 && p.y > 300)) for (const s of G.slots) if (s.team===0 && Math.abs(wx - s.x) < 50 && p.y > GROUND-150 && p.y < GROUND+10 && towerOptions(s).length) { G.popup = {slot:s}; return; }
  G.popup = null;
  if (p.x < VW*0.5) joy = {active:true, id, x0:p.x, y0:p.y, x:p.x};
}
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
  if (c==='KeyB') { G.shopOpen = !G.shopOpen; G.popup=null; }
  if (c==='ArrowDown'||c==='KeyS') G.hero.dropT = 0.25;
  if (c==='Escape') { G.shopOpen=false; G.popup=null; }
}
function doJump(){ const h = G.hero; if (h.respawn>0 || h.stun>0 || h.ai) return; if (h.ground) { h.vy = -640*(G.teams[0].buffT>0?1.15:1); h.ground=false; for(let i=0;i<6;i++) G.parts.push({x:h.x, y:h.y, vx:rand(-90,90), vy:rand(-60,0), t:0, life:0.35, c:'#e8ffe0', r:3}); } }
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
    hpBar(x, e.y-125, 100, e.hp/e.maxHp, 2, 7); txt('바람 용', x, e.y-137, 12, '#d8fff0');
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
  ctx.fillStyle='rgba(20,30,60,0.55)'; rr(8,8,210,58,14); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(38,37,24,0,6.28); ctx.fillStyle=HEROES[h.key].color; ctx.fill(); ctx.clip(); drawSprite(HEROES[h.key].img, 38, 72, 66, false); ctx.restore();
  ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(38,37,24,0,6.28); ctx.stroke();
  txt(`${h.d.name}  Lv.${h.lv}`, 70, 20, 13, '#fff', 'left');
  ctx.fillStyle='rgba(0,0,0,0.5)'; rr(70,30,140,12,6); ctx.fill(); ctx.fillStyle='#53d36a'; rr(70,30,140*clamp(h.hp/h.maxHp,0,1),12,6); ctx.fill();
  txt(`${Math.max(0,Math.ceil(h.hp))}/${h.maxHp}`, 140, 36, 10, '#fff');
  const xp0 = LEVEL_XP[h.lv-1], xp1 = LEVEL_XP[h.lv] || xp0+1; ctx.fillStyle='rgba(0,0,0,0.5)'; rr(70,47,140,7,4); ctx.fill(); ctx.fillStyle='#b48cff'; rr(70,47,140*(h.lv>=10?1:clamp((h.xp-xp0)/(xp1-xp0),0,1)),7,4); ctx.fill();
  txt(`처치 ${h.kills}  죽음 ${h.deaths}  막타 ${G.stats.cs}`, 12, 76, 11, '#fff', 'left');
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
  if (isFinite(G.dragonNext) && G.dragonNext-G.t < 20) txt(`바람 용 등장까지 ${Math.ceil(G.dragonNext-G.t)}초`, VW/2, my+mh+27, 11, '#a8ffcf');
  // 골드 + 상점
  const aff = anyAffordable(0);
  ctx.fillStyle='rgba(20,30,60,0.55)'; rr(VW-172, 16, 96, 36, 12); ctx.fill();
  coin(VW-156, 34); txt(`${Math.floor(tm.gold)}`, VW-142, 34, 15, '#ffd23f', 'left');
  if (aff) { ctx.fillStyle=`rgba(255,220,80,${0.35+0.3*Math.sin(T*6)})`; ctx.beginPath(); ctx.arc(B.shop.x,B.shop.y,B.shop.r+8+2*Math.sin(T*6),0,6.28); ctx.fill(); }
  ctx.fillStyle = aff ? '#ffb92e' : '#5a6b8a'; ctx.beginPath(); ctx.arc(B.shop.x,B.shop.y,B.shop.r,0,6.28); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.stroke();
  coin(B.shop.x, B.shop.y-7, 8); txt('상점', B.shop.x, B.shop.y+12, 11);
  { const mb={x:VW-200, y:34, r:15}; ctx.fillStyle='rgba(20,30,60,0.55)'; ctx.beginPath(); ctx.arc(mb.x,mb.y,mb.r,0,6.28); ctx.fill(); txt(muted?'음소거':'소리', mb.x, mb.y, 9, muted?'#aaa':'#fff'); uiRects.push({r:{x:mb.x-18,y:mb.y-18,w:36,h:36}, fn:toggleMute}); }
  if (window.LRFS && LRFS.canFS()) { const fb={x:VW-240, y:34, r:15}; ctx.fillStyle='rgba(20,30,60,0.55)'; ctx.beginPath(); ctx.arc(fb.x,fb.y,fb.r,0,6.28); ctx.fill(); txt(LRFS.isFS()?'⤡':'⛶', fb.x, fb.y, 14, '#fff'); uiRects.push({r:{x:fb.x-18,y:fb.y-18,w:36,h:36}, fn:()=>LRFS.toggle()}); }
  if (tm.buffT>0) txt(`바람 용 버프 ${Math.ceil(tm.buffT)}초`, 12, 94, 12, '#a8ffcf', 'left');
  if (G.teams[1].buffT>0) txt(`적 바람 버프 ${Math.ceil(G.teams[1].buffT)}초`, VW-12, 70, 11, '#ff9a9a', 'right');
  G.msg.forEach((m,i) => { ctx.globalAlpha = clamp(m.t,0,1); txt(m.text, VW/2, 84 + i*20, 15, m.color); }); ctx.globalAlpha=1;
  if (h.respawn>0) { ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(0,0,VW,VIEW_H); txt(`부활까지 ${Math.ceil(h.respawn)}초`, VW/2, VIEW_H/2-20, 28, '#fff'); }
  // 조이스틱
  const jx = joy.active? joy.x0 : 105, jy = joy.active? joy.y0 : 370;
  ctx.globalAlpha = joy.active? 0.75 : 0.45;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(jx,jy,52,0,6.28); ctx.fill(); ctx.stroke();
  txt('◀', jx-34, jy, 16, '#fff'); txt('▶', jx+34, jy, 16, '#fff');
  const kx = joy.active? clamp(joy.x-joy.x0,-40,40) : 0; ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(jx+kx,jy,22,0,6.28); ctx.fill();
  ctx.globalAlpha = 1;
  const skBtn = (b, i) => { const sk = h.d.skills[i], cd = h.cds[i], locked = i===2 && !canUlt(h);
    ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(b.x+2,b.y+4,b.r,0,6.28); ctx.fill();
    ctx.globalAlpha = 0.82; ctx.fillStyle = locked ? 'rgba(60,60,80,0.75)' : ['#ff9a3c','#4fb3ff','#c06bff'][i]; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,6.28); ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=2.5; ctx.stroke(); ctx.globalAlpha = 1;
    if (cd>0 && !locked) { ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.arc(b.x,b.y,b.r,-Math.PI/2,-Math.PI/2+6.283*cd/(sk.cd*(1-0.1*tm.skill[i]))); ctx.fill(); txt(String(Math.ceil(cd)), b.x, b.y-4, 18); }
    else txt(locked? 'Lv.5' : ['1','2','궁'][i], b.x, b.y-6, locked?13:16, '#fff');
    txt(sk.name, b.x, b.y + b.r*0.45, 9);
    for (let k=0;k<tm.skill[i];k++) { ctx.fillStyle='#ffe066'; ctx.beginPath(); ctx.arc(b.x-8+k*8, b.y-b.r-5, 3, 0, 6.28); ctx.fill(); } };
  skBtn(B.s0,0); skBtn(B.s1,1); skBtn(B.s2,2);
  ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(B.jump.x+2,B.jump.y+4,B.jump.r,0,6.28); ctx.fill();
  ctx.globalAlpha=0.8; ctx.fillStyle='rgba(110,215,110,0.9)'; ctx.beginPath(); ctx.arc(B.jump.x,B.jump.y,B.jump.r,0,6.28); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2.5; ctx.stroke(); ctx.globalAlpha=1; txt('▲', B.jump.x, B.jump.y-6, 16); txt('점프', B.jump.x, B.jump.y+12, 10);
  ctx.globalAlpha=0.8; ctx.fillStyle= tm.wardCd>0 ? 'rgba(80,80,90,0.75)' : 'rgba(255,205,70,0.9)'; ctx.beginPath(); ctx.arc(B.ward.x,B.ward.y,B.ward.r,0,6.28); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(); ctx.globalAlpha=1;
  txt(tm.wardCd>0? String(Math.ceil(tm.wardCd)) : '◉', B.ward.x, B.ward.y-4, 13, '#fff'); txt('와드', B.ward.x, B.ward.y+11, 9);
  if (G.popup) {
    const s = G.popup.slot, ops = towerOptions(s); const px = clamp(s.x - G.camX, 90, VW-90);
    const w = 180, hgt = 28 + ops.length*36; const top = GROUND - 150 - hgt;
    ctx.fillStyle='rgba(20,30,60,0.9)'; rr(px-w/2, top, w, hgt, 12); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
    txt(s.tower ? `타워 Lv.${s.tower.lv}` : '빈 타워 자리', px, top+14, 12);
    ops.forEach((o,i) => { const r = {x:px-w/2+8, y:top+26+i*36, w:w-16, h:30}; const ok = tm.gold>=o.cost;
      ctx.fillStyle = ok ? '#43b85c' : '#555c70'; rr(r.x,r.y,r.w,r.h,8); ctx.fill(); txt(`${o.name}  ${o.cost}G`, px, r.y+15, 11.5, ok?'#fff':'#bbb');
      uiRects.push({r, fn:()=>{ if (towerAct(s,o.id)) G.popup = towerOptions(s).length? {slot:s} : null; else addMsg('골드가 부족합니다', '#ffb0a0'); }}); });
    uiRects.push({r:{x:px-w/2, y:top, w, h:hgt}, fn:()=>{}});
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
  if (SPEED!==1 || AUTO) txt(`디버그 x${SPEED}${AUTO?' 자동':''}`, 10, VIEW_H-10, 10, '#ff0', 'left');
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
      else if (!G.over) { let total = dt*SPEED; while (total > 1e-6) { const s = Math.min(total, 1/60); update(s); total -= s; } }
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
