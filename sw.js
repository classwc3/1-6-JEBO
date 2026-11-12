/* 1-6.웹.한국 서비스 워커 — '홈 화면에 추가'(앱 설치)·아이콘 숫자(알림) 에 필요하다.
   늘 네트워크에서 새로 받는다(옛 화면을 보여주지 않게). 인터넷이 끊겼을 때만 마지막 첫 화면을 쓴다. */
var CACHE = 'c16-v3';
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(['./', 'manifest.json']).catch(function () {}); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.mode !== 'navigate') return;          /* 앱(구글 서버) 요청은 건드리지 않는다 */
  e.respondWith(fetch(e.request).then(function (r) {
    var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put('./', copy); }).catch(function () {});
    return r;
  }).catch(function () { return caches.match('./'); }));
});
/* 아이콘 숫자용 알림을 누르면 앱을 연다 */
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) if ('focus' in cs[i]) return cs[i].focus();
    return self.clients.openWindow('/');
  }));
});
