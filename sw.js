// Service Worker — بيخلي البرنامج يفتح من غير نت (بعد أول فتح بنت)
const V = 'gym-offline-v1';
const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.allSettled([c.add(new Request(LIB, { mode: 'cors' })), c.add('./'), c.add('./index.html')]);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.hostname.endsWith('supabase.co')) return; // الداتا بتروح لسوبابيس مباشرة

  // الصفحة نفسها: نت أولاً (٣ ثواني) وبعدها النسخة المحفوظة
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(V), key = new Request(url.origin + url.pathname);
      try {
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 3000);
        const r = await fetch(req, { signal: ctl.signal }); clearTimeout(t);
        if (r.ok) c.put(key, r.clone());
        return r;
      } catch (_) {
        return (await c.match(key)) || (await c.match('./index.html')) || (await c.match('./')) || Response.error();
      }
    })());
    return;
  }

  // باقي ملفات موقعك (أيقونة، manifest، لوجو...): نت أولاً وبعدها النسخة المحفوظة
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const cp = r.clone(); caches.open(V).then((c) => c.put(req, cp)).catch(() => {}); }
      return r;
    }).catch(() => caches.match(req)));
    return;
  }

  // المكتبة والخطوط: من الكاش، وبتتحدّث في الخلفية
  if (url.href === LIB || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(V), hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
  }
});

// ضغطة على الإشعار: افتح البرنامج (أو ارجع له لو مفتوح)
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  })());
});

// جاهز لإشعارات Web Push (لما البرنامج يكون مقفول) لو فعّلناها بعدين
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || 'Active Gym', {
    body: d.body || '', dir: 'rtl', lang: 'ar', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag, vibrate: [200, 100, 200]
  }));
});
