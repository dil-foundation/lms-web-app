// Service Worker for DIL LMS - App Asset Caching
// Version 1.0.0

const CACHE_NAME = 'dil-lms-v1';
const OFFLINE_URL = '/dashboard/offline-learning';

// Assets to cache immediately when service worker installs
const CRITICAL_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/offline-learning',
  '/manifest.json',
  '/favicon.ico'
];

// Assets to cache on first request (runtime caching)
const RUNTIME_CACHE_PATTERNS = [
  // JavaScript chunks
  /\/_app\/immutable\/chunks\/.+\.js$/,
  /\/assets\/.+\.js$/,
  /\/static\/js\/.+\.js$/,
  
  // CSS files
  /\/_app\/immutable\/assets\/.+\.css$/,
  /\/assets\/.+\.css$/,
  /\/static\/css\/.+\.css$/,
  
  // Images (UI assets, not course content)
  /\/assets\/.+\.(png|jpg|jpeg|gif|svg|webp)$/,
  /\/images\/.+\.(png|jpg|jpeg|gif|svg|webp)$/,
  
  // Fonts
  /\/_app\/immutable\/assets\/.+\.(woff|woff2|ttf|eot)$/,
  /\/fonts\/.+\.(woff|woff2|ttf|eot)$/
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching critical assets');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Critical assets cached');
        // Don't automatically skipWaiting - let the user decide when to update
        // This prevents infinite reload loops during development
      })
      .catch((error) => {
        console.error('❌ Service Worker: Failed to cache critical assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated and old caches cleaned');
        // Don't automatically claim clients - this prevents reload loops
        // The ServiceWorkerUpdater component will handle controlled updates
      })
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (like Supabase API calls)
  if (url.origin !== location.origin) {
    return;
  }
  
  // Skip if URL contains specific patterns we don't want to cache
  const skipPatterns = [
    '/api/',
    '/auth/',
    '/_next/webpack-hmr',
    '/__nextjs_original-stack-frame'
  ];
  
  if (skipPatterns.some(pattern => url.pathname.includes(pattern))) {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

// Main fetch handling logic
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: Network First for HTML pages (to get latest content when online)
    if (request.destination === 'document' || url.pathname.endsWith('/')) {
      return await networkFirstStrategy(request);
    }
    
    // Strategy 2: Cache First for static assets (JS, CSS, images, fonts)
    if (shouldCacheAsset(url)) {
      return await cacheFirstStrategy(request);
    }
    
    // Strategy 3: Network Only for everything else
    return await fetch(request);
    
  } catch (error) {
    console.log('🔴 Service Worker: Fetch failed for:', url.pathname, error.message);
    
    // If it's a navigation request and we're offline, serve the offline page
    if (request.destination === 'document') {
      const cache = await caches.open(CACHE_NAME);
      const offlineResponse = await cache.match(OFFLINE_URL);
      if (offlineResponse) {
        console.log('📱 Service Worker: Serving offline page');
        return offlineResponse;
      }
    }
    
    // For other requests, just let them fail
    throw error;
  }
}

// Network First Strategy (for HTML pages)
async function networkFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // If successful, cache the response and return it
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('🔄 Service Worker: Network failed, trying cache for:', request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache First Strategy (for static assets)
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    console.log('💾 Service Worker: Serving from cache:', request.url);
    return cachedResponse;
  }
  
  // Cache miss, try network
  try {
    const networkResponse = await fetch(request);
    
    // If successful, cache the response
    if (networkResponse.ok) {
      console.log('📦 Service Worker: Caching new asset:', request.url);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('❌ Service Worker: Failed to fetch asset:', request.url);
    throw error;
  }
}

// Check if asset should be cached based on URL patterns
function shouldCacheAsset(url) {
  return RUNTIME_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('📨 Service Worker: Received SKIP_WAITING message - updating now');
    // When user explicitly requests update, skip waiting and claim clients
    self.skipWaiting().then(() => {
      return self.clients.claim();
    });
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('🎯 Service Worker: Loaded and ready!');
