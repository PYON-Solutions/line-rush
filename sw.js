// 서비스 워커: 네트워크 우선, 실패 시 캐시 (오프라인 대비). 에셋을 옮기면 PRECACHE 목록도 갱신.
importScripts('js/version.js');                 // 캐시 이름 = 빌드 버전 (js/version.js)
const CACHE = 'line-rush-v' + self.LR_VERSION;
const PRECACHE = [
  './', 'index.html', 'manifest.json', 'css/style.css',
  'js/version.js', 'js/update.js', 'js/fullscreen.js', 'js/data.js', 'js/assets.js', 'js/bootstrap.js', 'js/render3d.js', 'js/models.js', 'js/heroes2d.js', 'js/game.js',
  'vendor/three.module.js', 'maps/meadow.js', 'maps/canyon.js', 'maps/volcano.js', 'maps/snow.js', 'maps/select.js', 'js/lobby.js',
  'js/sprites2d.js', 'js/rig2d.js', 'js/announce.js', 'minions/sprite.js', 'towers/sprite.js', 'bases/sprite.js', 'dragons/sprite.js', 'dragons/lair.js',
  'dragons/dragon.png', 'dragons/forest.png', 'dragons/sand.png', 'dragons/ice.png',
  'dragons/dragon_rig/atlas.png', 'dragons/dragon_rig/rig.json', 'dragons/forest_rig/atlas.png', 'dragons/forest_rig/rig.json', 'dragons/sand_rig/atlas.png', 'dragons/sand_rig/rig.json', 'dragons/ice_rig/atlas.png', 'dragons/ice_rig/rig.json',
  'characters/index.js', 'characters/common/index.js', 'characters/common/core.js', 'characters/common/ik.js', 'characters/common/effects.js', 'characters/common/puppet.js',
  'characters/mungchi/rig.js', 'characters/piyo/rig.js', 'characters/momo/rig.js', 'characters/dandan/rig.js', 'characters/salang/rig.js', 'characters/toto/rig.js', 'characters/common/cutout.js', 'characters/common/keypose.js',
  'ui/icons/icon-192.png', 'ui/icons/icon-512.png',
];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin || new URL(e.request.url).searchParams.has('_')) return;  // 업데이트 확인용(?_=)은 캐시하지 않음
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request)));
});
