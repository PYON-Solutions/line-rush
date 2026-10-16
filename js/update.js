// 업데이트 확인 / 강제 새로고침 (타이틀 화면의 '새로고침' 버튼)
// 최신 js/version.js 를 캐시 무시로 받아 현재 실행 중인 버전과 비교. 새로고침 = 서비스 워커 해제 + 모든 캐시 삭제 + 다시 불러오기
window.LRUpdate = (() => {
  const U = { state: 'checking', remote: null, busy: false };
  U.check = async () => {
    U.state = 'checking';
    try {
      const r = await fetch('js/version.js?_=' + Date.now(), { cache: 'no-store' });
      const m = (await r.text()).match(/LR_VERSION\s*=\s*['"]([^'"]+)['"]/);
      U.remote = m ? m[1] : null;
      U.state = !U.remote ? 'error' : U.remote === self.LR_VERSION ? 'latest' : 'update';
    } catch (e) { U.state = 'offline'; }
    return U.state;
  };
  U.hardReload = async () => {
    if (U.busy) return; U.busy = true; U.state = 'reloading';
    try { if (navigator.serviceWorker) for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister(); } catch (e) {}
    try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) {}
    const q = new URLSearchParams(location.search); q.set('v', Date.now().toString(36));
    location.replace(location.pathname + '?' + q.toString() + location.hash);
  };
  U.label = () => ({ checking: '확인 중…', latest: '최신 버전', update: `업데이트 있음 (v${U.remote})`, offline: '오프라인', error: '확인 실패', reloading: '새로고침 중…' })[U.state] || '';
  U.check();
  return U;
})();
