// 전체 화면 / 방향 잠금 / iPhone 안내
(function(){
  const d = document, el = d.documentElement;
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPod/.test(ua) || (/iPad/.test(ua));
  const standalone = window.navigator.standalone === true || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
  function isFS(){ return !!(d.fullscreenElement || d.webkitFullscreenElement); }
  function canFS(){ return !!(el.requestFullscreen || el.webkitRequestFullscreen); }
  async function lock(){ try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch(e){} }
  async function enter(){
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch(e){}
    lock();
  }
  async function exit(){ try { if (d.exitFullscreen) await d.exitFullscreen(); else if (d.webkitExitFullscreen) d.webkitExitFullscreen(); } catch(e){} }
  function toggle(){ if (isFS()) exit(); else if (canFS()) enter(); else showTip(true); }
  let tried = false;
  function firstTap(){ if (tried) return; tried = true; if (!standalone && canFS() && !isFS()) enter(); else lock(); }
  function showTip(force){
    if (!isIOS || standalone) return;
    try { if (!force && localStorage.getItem('lr_iostip')) return; localStorage.setItem('lr_iostip','1'); } catch(e){}
    const t = d.createElement('div'); t.id = 'iostip';
    t.textContent = '공유 버튼 → 홈 화면에 추가하면 전체 화면으로 즐길 수 있어요';
    t.addEventListener('pointerdown', e => { e.stopPropagation(); t.remove(); });
    d.body.appendChild(t); setTimeout(() => t.remove(), 6000);
  }
  // 리사이즈 이벤트를 방향 전환/전체화면 전환 시에도 발생시키기
  function kick(){ window.dispatchEvent(new Event('resize')); setTimeout(() => window.dispatchEvent(new Event('resize')), 300); }
  addEventListener('orientationchange', kick);
  d.addEventListener('fullscreenchange', kick); d.addEventListener('webkitfullscreenchange', kick);
  if (window.visualViewport) visualViewport.addEventListener('resize', () => window.dispatchEvent(new Event('resize')));
  // 길게 누르기 메뉴/선택 방지
  d.addEventListener('contextmenu', e => e.preventDefault());
  d.addEventListener('touchmove', e => { if (e.touches.length > 1 || e.target.tagName === 'CANVAS') e.preventDefault(); }, { passive: false });
  // Android Chrome: 어느 화면이든 첫 터치에서 전체 화면 + 가로 고정
  d.addEventListener('pointerup', firstTap, { once: true, capture: true });
  addEventListener('load', () => setTimeout(() => showTip(false), 1200));
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
  window.LRFS = { enter, exit, toggle, firstTap, isFS, canFS: () => canFS() || isIOS };
})();
