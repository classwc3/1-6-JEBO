/* 1-6.웹.한국 서비스 워커 — '홈 화면에 추가'(앱 설치)·아이콘 숫자(알림) 에 필요하다.
   바깥 화면은 네트워크에서 새로 받되, 2.5초 안에 오지 않으면 저장해 둔 것으로 바로 연다(느린 데이터망에서 기다리지 않게).
   늦게 온 새 화면은 저장만 해 두고 다음에 쓴다. 아이콘·매니페스트는 저장본을 먼저 쓴다. */
var CACHE = 'c16-v4';
var SHELL = ['./', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-48.png'];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); })); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (url.origin !== self.location.origin || req.method !== 'GET') return;     /* 앱(구글 서버) 요청은 건드리지 않는다 */
  if (req.mode === 'navigate') {
    var net = fetch(req).then(function (r) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put('./', copy); }).catch(function () {}); return r; });
    e.respondWith(new Promise(function (resolve) {
      var done = false;
      var t = setTimeout(function () { caches.match('./').then(function (hit) { if (!done && hit) { done = true; resolve(hit); } }); }, 2500);
      net.then(function (r) { if (!done) { done = true; clearTimeout(t); resolve(r); } })
         .catch(function () { caches.match('./').then(function (hit) { if (!done) { done = true; clearTimeout(t); resolve(hit || Response.error()); } }); });
    }));
    e.waitUntil(net.catch(function () {}));
    return;
  }
  if (/\/(icon-[\w-]+|apple-touch-icon|favicon-48)\.png$|\/manifest\.json$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req).then(function (r) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return r; }); }));
  }
});
/* 아이콘 숫자용 알림을 누르면 앱을 연다 */
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) if ('focus' in cs[i]) return cs[i].focus();
    return self.clients.openWindow('/');
  }));
});
