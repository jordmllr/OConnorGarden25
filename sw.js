const CACHE_NAME = 'garden-guide-v1';
const urlsToCache = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'data/Tomatoes.md',
  'data/Cucumbers.md',
  'data/Pumpkins.md',
  'data/Onions.md',
  'data/Romaine.md',
  'data/SweetPotatoes.md',
  'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js'
];

// Install service worker and cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Serve cached content when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.url.indexOf('.html') > -1) {
          return caches.match('index.html');
        }
      })
  );
});