/* 1-6.웹.한국 서비스 워커 — '홈 화면에 추가'(앱 설치)·아이콘 숫자(알림) 에 필요하다.
   바깥 화면은 네트워크에서 새로 받되, 2.5초 안에 오지 않으면 저장해 둔 것으로 바로 연다(느린 데이터망에서 기다리지 않게).
   늦게 온 새 화면은 저장만 해 두고 다음에 쓴다. 아이콘·매니페스트는 저장본을 먼저 쓴다. */
var CACHE = 'c16-v5';
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
/* ── 앱이 닫혀 있어도: 몇 시간마다 '오늘 챙길 것' 을 확인해 아이콘 숫자를 갱신하고, 하루 한 번 알림 ──
   (안드로이드·PC 크롬의 '주기적 백그라운드 동기화'. 바깥 페이지가 알림 허용 뒤 등록한다. 메일을 안 써도 된다) */
var CFG_URL = '/__c16cfg';
function cfgGet() { return caches.open('c16-cfg').then(function (c) { return c.match(CFG_URL); }).then(function (r) { return r ? r.json() : {}; }).catch(function () { return {}; }); }
function cfgPut(o) { return caches.open('c16-cfg').then(function (c) { return c.put(CFG_URL, new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json' } })); }); }
self.addEventListener('message', function (e) {
  var d = e.data || {};
  if (d.c16cfg) e.waitUntil(cfgGet().then(function (o) { Object.keys(d.c16cfg).forEach(function (k) { o[k] = d.c16cfg[k]; }); return cfgPut(o); }));
});
function dailyCheck() {
  return cfgGet().then(function (cfg) {
    if (!cfg.api) return;
    return fetch(cfg.api, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (t) {
      if (!t || !t.ok) return;
      var n = Math.max(0, Math.min(99, Number(t.n) || 0));
      try { if (self.navigator && self.navigator.setAppBadge) { if (n) self.navigator.setAppBadge(n); else self.navigator.clearAppBadge(); } } catch (eB) {}
      var h = new Date().getHours();
      if (!n || !t.title || cfg.shown === t.date || h < 6 || h >= 21) return;           /* 하루 한 번 · 아침 6시~밤 9시 */
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      cfg.shown = t.date;
      return cfgPut(cfg).then(function () { return self.registration.showNotification(t.title, { tag: 'c16-today', body: t.body || '', icon: cfg.icon || 'icon-192.png', badge: 'icon-192.png', data: { url: '/' } }); });
    });
  }).catch(function () {});
}
self.addEventListener('periodicsync', function (e) { if (e.tag === 'c16-today') e.waitUntil(dailyCheck()); });
/* 아이콘 숫자용 알림을 누르면 앱을 연다 */
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) if ('focus' in cs[i]) return cs[i].focus();
    return self.clients.openWindow('/');
  }));
});
