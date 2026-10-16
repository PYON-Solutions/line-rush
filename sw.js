// 서비스 워커: 네트워크 우선, 실패 시 캐시 (오프라인 대비). 에셋을 옮기면 PRECACHE 목록도 갱신.
const CACHE = 'line-rush-v3';
const PRECACHE = [
  './', 'index.html', 'manifest.json', 'css/style.css',
  'js/fullscreen.js', 'js/data.js', 'js/assets.js', 'js/bootstrap.js', 'js/render3d.js', 'js/models.js', 'js/heroes2d.js', 'js/game.js',
  'vendor/three.module.js', 'maps/meadow.js',
  'js/sprites2d.js', 'minions/sprite.js', 'towers/sprite.js', 'bases/sprite.js', 'dragons/sprite.js',
  'characters/index.js', 'characters/common/index.js', 'characters/common/core.js', 'characters/common/ik.js', 'characters/common/effects.js', 'characters/common/puppet.js',
  'characters/mungchi/rig.js', 'characters/piyo/rig.js', 'characters/momo/rig.js',
  'ui/icons/icon-192.png', 'ui/icons/icon-512.png',
];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request)));
});
