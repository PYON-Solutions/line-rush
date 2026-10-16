// 최소 서비스 워커 (Android Chrome 설치 조건 충족용, 네트워크 우선)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
