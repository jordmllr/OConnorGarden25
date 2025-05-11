const CACHE_NAME = 'garden-guide-v3';
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
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'icons/favicon.svg',
  'icons/icon-192.svg',
  'icons/icon-512.svg',
  'icons/icon-32.png',
  'icons/icon-64.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
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

        // Clone the request - a request is a stream and can only be consumed once
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response - a response is a stream and can only be consumed once
            const responseToCache = response.clone();

            // Add the new response to cache for future offline use
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.url.indexOf('.html') > -1) {
          return caches.match('index.html');
        } else if (event.request.url.indexOf('.md') > -1) {
          // For markdown files, return a simple offline message
          return new Response('# Offline Content\n\nThis content is not available offline. Please reconnect to the internet.',
            { headers: { 'Content-Type': 'text/markdown' } });
        }
      })
  );
});

// Clean up old caches when a new service worker is activated
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete old caches
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});