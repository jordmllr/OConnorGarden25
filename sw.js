/**
 * Service Worker for O'Connor Garden Guide
 * Implements different caching strategies for different types of content
 * Handles background sync for offline data
 */

// Cache names for different types of content
const CACHE_NAMES = {
  APP_SHELL: 'garden-guide-app-shell-v1',
  STATIC_ASSETS: 'garden-guide-static-assets-v1',
  PLANT_DATA: 'garden-guide-plant-data-v1',
  API_DATA: 'garden-guide-api-data-v1'
};

// Resources to cache immediately when the service worker is installed
const APP_SHELL_RESOURCES = [
  './',
  'index.html',
  'shell.css',
  'shell.js',
  'manifest.json',
  'icons/favicon.svg',
  'icons/icon-192.svg',
  'icons/icon-512.svg'
];

const STATIC_ASSETS = [
  'styles.css',
  'app.js',
  'auth.js',
  'plot-manager.js',
  'task-manager.js',

  // Services
  'services/auth-service.js',
  'services/data-service.js',
  'services/indexed-db-service.js',
  'services/sync-service.js',
  'services/notification-service.js',

  // Plant module
  'modules/plants/plant-model.js',
  'modules/plants/plant-service.js',
  'modules/plants/plant-list.js',
  'modules/plants/plant-detail.js',

  // Plot module
  'modules/plot/plot-model.js',
  'modules/plot/plot-service.js',
  'modules/plot/planting-service.js',
  'modules/plot/plot-manager.js',

  // Task module
  'modules/tasks/task-model.js',
  'modules/tasks/task-service.js',
  'modules/tasks/task-scheduler.js',
  'modules/tasks/task-manager.js',

  // External libraries
  'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',

  // Icons
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/favicon.svg'
];

const PLANT_DATA_RESOURCES = [
  'data/Tomatoes.md',
  'data/Cucumbers.md',
  'data/Pumpkins.md',
  'data/Onions.md',
  'data/Romaine.md',
  'data/SweetPotatoes.md'
];

// Install service worker and cache app shell resources
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    Promise.all([
      // Cache app shell (cache-first strategy)
      caches.open(CACHE_NAMES.APP_SHELL)
        .then(cache => {
          console.log('[Service Worker] Caching app shell');
          return cache.addAll(APP_SHELL_RESOURCES);
        }),

      // Cache static assets (cache-first with network fallback)
      caches.open(CACHE_NAMES.STATIC_ASSETS)
        .then(cache => {
          console.log('[Service Worker] Caching static assets');
          return cache.addAll(STATIC_ASSETS);
        }),

      // Cache plant data (stale-while-revalidate)
      caches.open(CACHE_NAMES.PLANT_DATA)
        .then(cache => {
          console.log('[Service Worker] Caching plant data');
          return cache.addAll(PLANT_DATA_RESOURCES);
        })
    ])
    .then(() => {
      console.log('[Service Worker] Skip waiting on install');
      return self.skipWaiting();
    })
  );
});

// Activate the service worker and clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');

  const currentCaches = Object.values(CACHE_NAMES);

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!currentCaches.includes(cacheName)) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Handle background sync events
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync event:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Handle push notification events
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);

  const data = event.data.json();
  const title = data.title || 'Garden Guide';
  const options = {
    body: data.body || 'You have garden tasks to attend to!',
    icon: 'icons/icon-192.png',
    badge: 'icons/favicon.svg',
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click:', event);

  event.notification.close();

  // Open the app and navigate to the relevant page
  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(windowClients => {
        // Check if there is already a window open
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Sync data with the server
 * This is called when a background sync event is triggered
 */
async function syncData() {
  console.log('[Service Worker] Syncing data...');

  try {
    // Get all clients
    const clients = await self.clients.matchAll();

    // Send a message to the client to trigger sync
    clients.forEach(client => {
      client.postMessage({
        type: 'sync-trigger',
        timestamp: Date.now()
      });
    });

    return true;
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    return false;
  }
}

// Fetch event handler with different strategies for different resources
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // App Shell - Cache First Strategy
  if (APP_SHELL_RESOURCES.some(resource => event.request.url.endsWith(resource)) ||
      event.request.url.endsWith('/')) {
    event.respondWith(cacheFirstStrategy(event.request, CACHE_NAMES.APP_SHELL));
    return;
  }

  // Static Assets - Cache First with Network Fallback
  if (STATIC_ASSETS.some(resource => event.request.url.endsWith(resource)) ||
      event.request.url.includes('unpkg.com') ||
      event.request.url.includes('cdn.jsdelivr.net')) {
    event.respondWith(cacheFirstWithNetworkFallbackStrategy(event.request, CACHE_NAMES.STATIC_ASSETS));
    return;
  }

  // Plant Data - Stale While Revalidate
  if (event.request.url.includes('/data/') && event.request.url.endsWith('.md')) {
    event.respondWith(staleWhileRevalidateStrategy(event.request, CACHE_NAMES.PLANT_DATA));
    return;
  }

  // API Requests - Network First with Cached Fallback
  if (event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebase')) {
    event.respondWith(networkFirstWithCachedFallbackStrategy(event.request, CACHE_NAMES.API_DATA));
    return;
  }

  // Default strategy - Network with cache fallback
  event.respondWith(networkWithCacheFallbackStrategy(event.request));
});

/**
 * Cache First Strategy
 * Try the cache first, then the network
 */
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache first strategy failed:', error);
    return new Response('Network error occurred', { status: 408, headers: { 'Content-Type': 'text/plain' } });
  }
}

/**
 * Cache First with Network Fallback Strategy
 * Try the cache first, then the network, and update the cache
 */
async function cacheFirstWithNetworkFallbackStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Return cached response immediately
    // Then update the cache in the background
    fetch(request)
      .then(networkResponse => {
        if (networkResponse.ok) {
          caches.open(cacheName)
            .then(cache => cache.put(request, networkResponse));
        }
      })
      .catch(error => console.error('[Service Worker] Background fetch failed:', error));

    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Network request failed:', error);
    return new Response('Network error occurred', { status: 408, headers: { 'Content-Type': 'text/plain' } });
  }
}

/**
 * Stale While Revalidate Strategy
 * Return cached response immediately, then update cache in background
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);

  // Clone the request because it's a stream that can only be consumed once
  const fetchPromise = fetch(request.clone())
    .then(networkResponse => {
      if (networkResponse.ok) {
        // Update the cache with the new response
        caches.open(cacheName)
          .then(cache => cache.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(error => {
      console.error('[Service Worker] Stale while revalidate fetch failed:', error);
      // If both cache and network fail for markdown, return offline content
      if (request.url.endsWith('.md')) {
        return new Response('# Offline Content\n\nThis content is not available offline. Please reconnect to the internet.',
          { headers: { 'Content-Type': 'text/markdown' } });
      }
    });

  // Return the cached response immediately or wait for the network
  return cachedResponse || fetchPromise;
}

/**
 * Network First with Cached Fallback Strategy
 * Try the network first, fall back to cache if network fails
 */
async function networkFirstWithCachedFallbackStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    // Cache the response for future offline use
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network request failed, falling back to cache:', error);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If no cached response, return a generic offline response
    return new Response(JSON.stringify({ error: 'You are offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

/**
 * Network with Cache Fallback Strategy
 * Try the network, fall back to cache, with appropriate offline responses
 */
async function networkWithCacheFallbackStrategy(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('[Service Worker] Network request failed, falling back to cache:', error);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If both network and cache fail, provide appropriate fallback
    if (request.url.endsWith('.html')) {
      return caches.match('index.html');
    } else if (request.url.endsWith('.md')) {
      return new Response('# Offline Content\n\nThis content is not available offline. Please reconnect to the internet.',
        { headers: { 'Content-Type': 'text/markdown' } });
    } else if (request.headers.get('Accept').includes('application/json')) {
      return new Response(JSON.stringify({ error: 'You are offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } });
    } else {
      return new Response('You are offline',
        { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  }
}