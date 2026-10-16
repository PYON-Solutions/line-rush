// 킬 아나운서 (LoL 스타일): 화면 위쪽 배너 + 왼쪽 킬 피드 + 내 영웅 사망 시 흑백 화면/부활 카운트다운
// game.js의 kill() 끝에서 ANN.onKill(e, src, G, sfx) 호출. 화면은 DOM 오버레이(게임 캔버스 위, 터치 통과)
const PORT = { bear: 'mungchi', chick: 'piyo', cat: 'momo' };
const portrait = (h) => h && PORT[h.key] ? `characters/${PORT[h.key]}/portrait_${h.team ? 'red' : 'blue'}.png` : null;
const nameOf = h => (h && typeof HEROES !== 'undefined' && HEROES[h.key]) ? HEROES[h.key].name : '영웅';
const MULTI = ['', '처치!', '더블킬!', '트리플킬!', '쿼드라킬!', '펜타킬!'];
const STREAK = { 3: '학살 중!', 4: '압도 중!', 5: '전설!', 6: '막을 수 없음!', 7: '신과 같은!' };
const ICON = {
  swords: '<svg viewBox="0 0 64 64"><g stroke="#3a2a10" stroke-width="3" stroke-linejoin="round"><path d="M10 6l6 0 26 26-4 4-26-26z" fill="#eef4ff"/><path d="M54 6l-6 0-26 26 4 4 26-26z" fill="#eef4ff"/><path d="M16 40l8 8M48 40l-8 8" stroke="#ffcc33" stroke-width="7" stroke-linecap="round"/><path d="M12 52l6-6M52 52l-6-6" stroke="#8a5a2a" stroke-width="6" stroke-linecap="round"/></g></svg>',
  tower: '<svg viewBox="0 0 64 64"><g stroke="#2a1a0a" stroke-width="3" stroke-linejoin="round"><path d="M16 58l4-34h24l4 34z" fill="#b98a55"/><path d="M14 24h36v-10h-6v5h-6v-5h-12v5h-6v-5h-6z" fill="#d8a96a"/><path d="M28 58v-12a4 4 0 018 0v12z" fill="#4a2e18"/></g><path d="M6 10l52 48M58 10L6 58" stroke="#ff3b3b" stroke-width="6" stroke-linecap="round" opacity=".9"/></svg>',
  dragon: '<img src="dragons/dragon.png" alt="">',
  base: '<svg viewBox="0 0 64 64"><path d="M32 4l24 10v16c0 14-10 24-24 30C18 54 8 44 8 30V14z" fill="#ffd23f" stroke="#5a3a00" stroke-width="3"/><path d="M32 18v18M32 44v2" stroke="#5a3a00" stroke-width="7" stroke-linecap="round"/></svg>',
};
const css = `
#ann{position:fixed;left:0;right:0;top:calc(29vh + env(safe-area-inset-top));z-index:5;pointer-events:none;display:flex;justify-content:center;font-family:inherit}
.annB{position:relative;display:flex;flex-direction:column;align-items:center;animation:annIn 2.4s cubic-bezier(.2,.9,.3,1) forwards;filter:drop-shadow(0 4px 8px #0008)}
.annRow{display:flex;align-items:center;gap:1.2vh;padding:.9vh 3.2vh;border-radius:999px;background:linear-gradient(90deg,transparent,var(--tc) 18%,var(--tc) 82%,transparent);position:relative;overflow:hidden}
.annRow::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 35%,rgba(255,255,255,.75) 50%,transparent 65%);transform:translateX(-120%);animation:annShine 1.1s .18s ease-out}
.annP{width:9.5vh;height:9.5vh;min-width:46px;min-height:46px;border-radius:50%;border:.6vh solid #fff;background:#223 center/cover no-repeat;box-shadow:0 0 0 .4vh var(--tc),0 2px 6px #0007;overflow:hidden;display:flex;align-items:center;justify-content:center}
.annP img{width:115%;height:115%;object-fit:contain}
.annP.dead{filter:grayscale(1) brightness(.75)}
.annP.dead::after{content:"";position:absolute}
.annI{width:6.5vh;height:6.5vh;min-width:30px;min-height:30px;animation:annSpin .5s .1s cubic-bezier(.3,1.6,.5,1) both}
.annI svg,.annI img{width:100%;height:100%;object-fit:contain}
.annT{margin-top:.6vh;font-weight:900;font-size:clamp(22px,7.5vh,50px);line-height:1;letter-spacing:.02em;color:#fff;-webkit-text-stroke:.35vh var(--tk);paint-order:stroke fill;text-shadow:0 .5vh 0 var(--tk),0 0 2vh var(--tc);white-space:nowrap;background:linear-gradient(180deg,#fff 30%,var(--tg) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.annS{margin-top:.3vh;font-weight:800;font-size:clamp(12px,3.4vh,20px);color:#fff;text-shadow:0 1px 0 #000,0 0 6px #000a;white-space:nowrap}
.annS b{color:var(--hl)}
@keyframes annIn{0%{transform:scale(2.4);opacity:0}9%{transform:scale(.88);opacity:1}15%{transform:scale(1.07)}21%{transform:scale(1)}84%{transform:scale(1);opacity:1}100%{transform:translateY(-3vh) scale(.92);opacity:0}}
@keyframes annShine{to{transform:translateX(120%)}}
@keyframes annSpin{0%{transform:scale(0) rotate(-120deg)}100%{transform:scale(1) rotate(0)}}
#annFeed{position:fixed;left:calc(10px + env(safe-area-inset-left));top:calc(25vh + env(safe-area-inset-top));z-index:4;pointer-events:none;display:flex;flex-direction:column;gap:4px}
.annF{display:flex;align-items:center;gap:4px;padding:2px 8px 2px 3px;border-radius:14px;background:rgba(10,20,40,.55);border-left:4px solid var(--tc);font-size:clamp(10px,2.6vh,14px);font-weight:800;color:#fff;animation:annFIn .3s ease-out;transition:opacity .5s}
.annF i{width:clamp(18px,5.5vh,28px);height:clamp(18px,5.5vh,28px);border-radius:50%;background:#334 center/cover;display:inline-block;border:2px solid var(--tc)}
.annF i.d{filter:grayscale(1)}.annF .x{width:clamp(14px,4vh,20px);height:clamp(14px,4vh,20px)}.annF .x svg{width:100%;height:100%}
@keyframes annFIn{from{transform:translateX(-30px);opacity:0}}
#annDead{position:fixed;inset:0;z-index:3;pointer-events:none;display:none;align-items:center;justify-content:center;flex-direction:column;background:radial-gradient(ellipse at center,rgba(40,40,50,.05) 30%,rgba(10,10,20,.45) 100%)}
#annDead .c{margin-top:16vh;font-weight:900;font-size:clamp(28px,13vh,84px);color:#fff;-webkit-text-stroke:2px #000;paint-order:stroke fill;text-shadow:0 4px 0 #000}
#annDead .l{font-weight:800;font-size:clamp(13px,4vh,24px);color:#ffd0d0;text-shadow:0 2px 0 #000;margin-top:6px}
#game3d{transition:filter .6s}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
const root = document.createElement('div'); root.id = 'ann'; document.body.appendChild(root);
const feed = document.createElement('div'); feed.id = 'annFeed'; document.body.appendChild(feed);
const dead = document.createElement('div'); dead.id = 'annDead'; dead.innerHTML = ''; document.body.appendChild(dead);
const TEAMC = [{ tc: 'rgba(40,120,255,.82)', tk: '#0a2a6a', tg: '#9fd0ff', hl: '#9fe3ff' }, { tc: 'rgba(230,50,50,.82)', tk: '#5a0a0a', tg: '#ffb0a0', hl: '#ffb0a0' }, { tc: 'rgba(40,160,110,.85)', tk: '#063a28', tg: '#b8ffe8', hl: '#b8ffe8' }];
let S = null, lastG = null, queue = [], showing = 0;
function reset(G) { S = { first: false, streak: new Map(), multi: new Map() }; queue = []; showing = 0; root.innerHTML = ''; feed.innerHTML = ''; lastG = G; }
function pimg(src, cls = '') { return `<div class="annP ${cls}">${src ? `<img src="${src}" alt="">` : ''}</div>`; }
function push(b) { if (queue.length > 3) queue.shift(); queue.push(b); }
function showNext(now) {
  if (showing > now || !queue.length) return;
  const b = queue.shift(), C = TEAMC[b.team] || TEAMC[0];
  const el = document.createElement('div'); el.className = 'annB';
  el.style.cssText = `--tc:${C.tc};--tk:${C.tk};--tg:${C.tg};--hl:${C.hl}`;
  el.innerHTML = `<div class="annRow">${b.left ?? ''}<div class="annI">${ICON[b.icon] || ICON.swords}</div>${b.right ?? ''}</div><div class="annT">${b.text}</div>${b.sub ? `<div class="annS">${b.sub}</div>` : ''}`;
  root.innerHTML = ''; root.appendChild(el); showing = now + (b.dur || 2.0) * 1000;
  setTimeout(() => { if (!window.__annHold) el.remove(); }, 2400);
  if (b.snd) b.snd();
}
function addFeed(team, a, icon, bImg) {
  const C = TEAMC[team] || TEAMC[0], el = document.createElement('div'); el.className = 'annF'; el.style.setProperty('--tc', C.tc);
  el.innerHTML = `${a ? `<i style="background-image:url(${a})"></i>` : ''}<span class="x">${ICON[icon] || ICON.swords}</span>${bImg ? `<i class="d" style="background-image:url(${bImg})"></i>` : ''}`;
  feed.prepend(el); while (feed.children.length > 4) feed.lastChild.remove();
  setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 600); }, 7000);
}
function onKill(e, src, G, sfx) {
  if (G !== lastG || !S) reset(G);
  const snd = (...k) => () => { try { k.forEach(([n, v]) => sfx && sfx(n, v)); } catch (err) {} };
  if (e.kind === 'hero') {
    const k = G.teams[1 - e.team] && G.teams[1 - e.team].hero;
    e.deathDir = Math.sign(e.x - (src ? src.x : k ? k.x : e.x - (e.face || 1))) || -(e.face || 1);
    const now = G.t, km = S.multi.get(k) || { n: 0, t: -99 };
    km.n = now - km.t <= 10 ? km.n + 1 : 1; km.t = now; S.multi.set(k, km);
    const ks = (S.streak.get(k) || 0) + 1; S.streak.set(k, ks);
    const vs = S.streak.get(e) || 0; S.streak.set(e, 0);
    let text = MULTI[Math.min(5, km.n)], sub = '';
    if (km.n < 2) { if (!S.first) text = '퍼스트 블러드!'; else if (vs >= 3) text = '셧다운!'; }
    S.first = true;
    const kn = nameOf(k), vn = nameOf(e);
    sub = `<b>${kn}</b> ▶ ${vn}`;
    if (ks >= 3) sub += ` · ${ks}연속 처치 <b>${STREAK[Math.min(7, ks)]}</b>`;
    else if (text === '셧다운!') sub += ` · ${vs}연속 처치 저지`;
    const mine = k === G.hero, me = e === G.hero;
    push({ team: k ? k.team : 1 - e.team, icon: 'swords', left: pimg(portrait(k)), right: pimg(portrait(e), 'dead'), text, sub,
      snd: snd(['crit', 1], mine ? ['level', 1] : me ? ['boom', .7] : ['hit', 1]) });
    addFeed(k ? k.team : 1 - e.team, portrait(k), 'swords', portrait(e));
    if (mine || me) { G.slowT = Math.max(G.slowT || 0, me ? .9 : .6); G.hitstop = Math.max(G.hitstop || 0, .14); }
  } else if (e.kind === 'tower') {
    const kh = src && src.kind === 'hero' ? src : null, team = 1 - e.team;
    push({ team, icon: 'tower', left: kh ? pimg(portrait(kh)) : '', text: e.team === 0 ? '아군 타워 파괴!' : '타워 파괴!', sub: e.team === 0 ? '타워를 잃었습니다' : '적 타워를 무너뜨렸다!', snd: snd(['boom', .8]) });
    addFeed(team, kh ? portrait(kh) : null, 'tower', null);
    const left = G.ents.filter(t => t.kind === 'tower' && !t.dead && t.team === e.team).length;
    if (!left) push({ team, icon: 'base', text: e.team === 0 ? '아군 기지 노출!' : '적 기지 노출!', sub: e.team === 0 ? '기지를 지키세요!' : '기지를 공격하세요! 피해 증가', snd: snd(['crit', 1]) });
  } else if (e.kind === 'dragon') {
    const kh = src && src.kind === 'hero' ? src : null, team = kh ? kh.team : src && src.team < 2 ? src.team : 2;
    push({ team, icon: 'swords', left: kh ? pimg(portrait(kh)) : '', right: pimg('dragons/dragon.png'), text: '바람 용 처치!', sub: team === 0 ? '아군 이동속도·점프 강화!' : team === 1 ? '적이 바람 용의 힘을 얻었다' : '', snd: snd(['level', 1], ['boom', .6]) });
    addFeed(team, kh ? portrait(kh) : null, 'swords', 'dragons/dragon.png');
  }
}
function tick() { ticks++; requestAnimationFrame(tick); try { tickBody(); } catch (err) { console.error('ANN', err); } }
function tickBody() {
  const L = window.__LR, G = L && L.G, inMatch = L && L.scene === 'match' && G;
  if (inMatch && G !== lastG) reset(G);
  showNext(performance.now());
  const h = inMatch && G.hero, d = h && h.respawn > 0 && !G.over;
  const c3 = document.getElementById('game3d');
  if (c3) { const f = d ? 'grayscale(.9) brightness(.78) contrast(1.05)' : ''; if (c3.style.filter !== f) c3.style.filter = f; }
  dead.style.display = d ? 'flex' : 'none';
  if (!inMatch && root.childNodes.length) { root.innerHTML = ''; feed.innerHTML = ''; }
}
requestAnimationFrame(tick);
let ticks = 0; window.ANN = { onKill, _push: push, _forceNext: () => { showing = 0; showNext(performance.now()); }, _ticks: () => ticks, _dbg: () => ({ q: queue.length, showing, now: performance.now(), same: lastG === (window.__LR && window.__LR.G), kids: root.childNodes.length }) };
