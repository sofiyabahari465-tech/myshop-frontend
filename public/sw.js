// Service Worker for PWA
// کش کردن فایل‌های اصلی برای حالت آفلاین

const CACHE_NAME = 'myshop-v1';
const urlsToCache = [
  '/',
  '/login',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// نصب Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.log('[SW] Cache failed:', err))
  );
});

// فعال‌سازی Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// استراتژی Cache First برای فایل‌های استاتیک، Network First برای API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // برای API ها - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // اگه موفق بود، یه کپی توی cache نمی‌ذاریم (چون API هست)
          return response;
        })
        .catch(() => {
          // اگه شبکه قطع بود، پیام خطا
          return new Response(
            JSON.stringify({
              success: false,
              error: 'اتصال اینترنت برقرار نیست',
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // برای فایل‌های استاتیک - Cache First
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          // فقط فایل‌های معتبر رو کش کن
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            });
          return response;
        });
      })
      .catch(() => {
        // اگه شبکه قطع بود و فایل توی کش نبود
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// گوش دادن به پیام‌های نصب از صفحه
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
