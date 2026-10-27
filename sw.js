/* سيرفس ووركر بوابة المشترك: بيخلّي الصفحة تفتح من غير إنترنت بعد أول فتح.
   ارفعه في نفس فولدر member.html بالظبط (اسمه sw.js). */
var PAGE = 'gm-member-v1', FONTS = 'gm-fonts-v1';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('gm-') === 0 && k !== PAGE && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function pageKey(u) { return new Request(u.origin + u.pathname); }   // نفس الصفحة بأي ?g=

function nav(req, u) {
  return new Promise(function (resolve) {
    var done = false;
    var t = setTimeout(function () {     // النت بطيء: افتح النسخة المحفوظة فوراً
      caches.match(pageKey(u)).then(function (c) { if (c && !done) { done = true; resolve(c); } });
    }, 3500);
    fetch(req).then(function (n) {
      clearTimeout(t);
      if (n && n.ok) { var cp = n.clone(); caches.open(PAGE).then(function (c) { c.put(pageKey(u), cp); }); }
      if (!done) { done = true; resolve(n); }
    }).catch(function () {
      clearTimeout(t); if (done) return;
      caches.match(pageKey(u)).then(function (c) { done = true; resolve(c || new Response('مفيش إنترنت ولسه الصفحة متحفظتش. افتحها مرة واحدة والنت شغال.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })); });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (r.mode === 'navigate') { e.respondWith(nav(r, u)); return; }
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(function (c) {
      return c.match(r).then(function (m) {
        return m || fetch(r).then(function (n) { if (n && (n.ok || n.type === 'opaque')) c.put(r, n.clone()); return n; });
      });
    }));
  }
});
