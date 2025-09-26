// Service Worker for DIL LMS - Offline Learning Support
// Version 1.0.0

const CACHE_NAME = 'dil-lms-v4';
const OFFLINE_CACHE_NAME = 'dil-lms-offline-v4';
const CONTENT_CACHE_NAME = 'dil-lms-content-v4';

// Essential app shell files that actually exist
const APP_SHELL_FILES = [
  '/',
  '/manifest.json'
  // Note: We'll cache other files dynamically as they're requested
  // This prevents installation failures from missing files
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v4...');
  
  event.waitUntil(
    Promise.all([
      // Cache essential app shell files
      caches.open(CACHE_NAME).then(async (cache) => {
        console.log('[SW] Caching app shell files');
        
        // Cache files individually to see which ones fail
        const cachePromises = APP_SHELL_FILES.map(async (url) => {
          try {
            const request = new Request(url, { cache: 'reload' });
            await cache.add(request);
            console.log('[SW] Cached:', url);
          } catch (error) {
            console.warn('[SW] Failed to cache:', url, error.message);
            // Don't let individual failures stop the whole process
          }
        });
        
        await Promise.all(cachePromises);
        console.log('[SW] App shell caching completed');
      }),
      
      // Initialize other caches
      caches.open(OFFLINE_CACHE_NAME),
      caches.open(CONTENT_CACHE_NAME)
    ])
    .then(() => {
      console.log('[SW] Service worker installed successfully');
      return self.skipWaiting();
    })
    .catch((error) => {
      console.error('[SW] Service worker installation failed:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== OFFLINE_CACHE_NAME && 
                cacheName !== CONTENT_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (isNavigationRequest(request)) {
    // Navigation requests (SPA routes): Always serve index.html for offline SPA routing
    event.respondWith(handleNavigation(request));
  } else if (isAppShellRequest(request)) {
    // App shell: Cache First
    event.respondWith(cacheFirst(request, CACHE_NAME));
  } else if (isAPIRequest(request)) {
    // API requests: Network First with Cache Fallback
    event.respondWith(networkFirstWithCache(request, OFFLINE_CACHE_NAME));
  } else if (isContentRequest(request)) {
    // Content (videos, PDFs): Cache First with Network Fallback
    event.respondWith(cacheFirstWithNetwork(request, CONTENT_CACHE_NAME));
  } else if (isStaticAsset(request)) {
    // Static assets: Cache First
    event.respondWith(cacheFirst(request, CACHE_NAME));
  } else {
    // Default: Network First with Cache Fallback
    event.respondWith(networkFirstWithFallback(request));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'offline-sync') {
    event.waitUntil(syncOfflineData());
  } else if (event.tag === 'progress-sync') {
    event.waitUntil(syncProgressData());
  } else if (event.tag === 'quiz-sync') {
    event.waitUntil(syncQuizSubmissions());
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    case 'CACHE_CONTENT':
      event.waitUntil(cacheContent(payload.url, payload.contentId));
      break;
    case 'DELETE_CONTENT':
      event.waitUntil(deleteContent(payload.contentId));
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(payload.cacheName));
      break;
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Helper functions for request classification
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

function isAppShellRequest(request) {
  const url = new URL(request.url);
  return url.pathname === '/' || 
         url.pathname === '/index.html' ||
         url.pathname.startsWith('/static/') ||
         url.pathname === '/manifest.json' ||
         url.pathname === '/favicon.ico' ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.svg');
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.hostname.includes('supabase.co') ||
         url.pathname.startsWith('/api/');
}

function isContentRequest(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/storage/') ||
         request.url.includes('dil-lms') ||
         url.pathname.endsWith('.mp4') ||
         url.pathname.endsWith('.pdf') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg');
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.woff') ||
         url.pathname.endsWith('.woff2');
}

// Caching strategies
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    return new Response('Offline - Content not available', { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(JSON.stringify({ 
      error: 'Offline - Data not available',
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirstWithNetwork(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Content request failed:', error);
    return new Response('Content not available offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response('Network error', { status: 503 });
  }
}

// Enhanced navigation handler for SPA routing
async function handleNavigation(request) {
  const url = new URL(request.url);
  console.log('[SW] Handling navigation request:', url.pathname);
  
  // For dashboard routes, always try to serve the React app
  if (url.pathname.startsWith('/dashboard')) {
    console.log('[SW] Dashboard route detected, serving React app');
    return await serveReactApp(request);
  }
  
  // For root route, try network first, then serve React app
  if (url.pathname === '/' || url.pathname === '/index.html') {
    console.log('[SW] Root route detected');
    
    if (!navigator.onLine) {
      console.log('[SW] Offline - serving React app for root route');
      return await serveReactApp(request);
    }
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
        console.log('[SW] Served root from network and cached');
        return networkResponse;
      }
    } catch (error) {
      console.log('[SW] Network failed for root, serving React app:', error.message);
    }
    
    return await serveReactApp(request);
  }
  
  // For other routes, try network first with fallback
  return await networkFirstWithFallback(request);
}

// Helper function to serve the React app
async function serveReactApp(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    
    // First, try to get the cached root document
    let cachedResponse = await cache.match('/');
    if (cachedResponse) {
      console.log('[SW] Serving React app from cached root');
      return cachedResponse;
    }
    
    // If no cached root, try to fetch and cache it
    if (navigator.onLine) {
      try {
        console.log('[SW] No cached app, fetching from network...');
        const networkResponse = await fetch('/');
        if (networkResponse && networkResponse.ok) {
          await cache.put('/', networkResponse.clone());
          console.log('[SW] Fetched and cached React app from network');
          return networkResponse;
        }
      } catch (error) {
        console.log('[SW] Failed to fetch React app from network:', error.message);
      }
    }
    
    // Last resort - create a minimal HTML page that loads the React app
    console.log('[SW] Creating minimal React app loader');
    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <link rel="icon" href="/favicon.ico" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#000000" />
          <meta name="description" content="DIL LMS - Digital Inspiration Learning Management System" />
          <title>DIL LMS</title>
          <style>
            body {
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            #root {
              min-height: 100vh;
            }
            .loading {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              flex-direction: column;
              gap: 1rem;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #007bff;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <noscript>You need to enable JavaScript to run this app.</noscript>
          <div id="root">
            <div class="loading">
              <div class="spinner"></div>
              <p>Loading DIL LMS...</p>
            </div>
          </div>
          <script>
            // This will be replaced by the actual React app when it loads
            console.log('DIL LMS loading from service worker fallback');
          </script>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('[SW] Failed to serve React app:', error);
    return createOfflinePage();
  }
}

// Create a basic offline page
function createOfflinePage() {
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>DIL LMS - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: system-ui, sans-serif; 
            text-align: center; 
            padding: 2rem;
            background: #f5f5f5;
            margin: 0;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-top: 10vh;
          }
          .offline-icon { font-size: 3rem; margin-bottom: 1rem; }
          h1 { color: #333; margin-bottom: 1rem; }
          p { color: #666; line-height: 1.5; margin-bottom: 1.5rem; }
          .retry-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            margin: 0.5rem;
            font-size: 1rem;
          }
          .retry-btn:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="offline-icon">📡</div>
          <h1>You're Offline</h1>
          <p>This page isn't available offline yet. The app shell couldn't be loaded from cache.</p>
          <p><strong>Tip:</strong> Visit the page while online first to cache it for offline use.</p>
          <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
          <button class="retry-btn" onclick="window.location.href='/dashboard/offline-learning'">Offline Learning</button>
        </div>
        <script>
          // Auto-retry when online
          window.addEventListener('online', () => {
            console.log('Back online, reloading...');
            window.location.reload();
          });
        </script>
      </body>
    </html>
  `, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}

// Enhanced network first with better fallback
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache successful responses for future offline use
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for:', request.url);
    
    // Try to serve from cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }
    
    // Return appropriate offline response
    return new Response('This content is not available offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Content management functions
async function cacheContent(url, contentId) {
  try {
    const cache = await caches.open(CONTENT_CACHE_NAME);
    const response = await fetch(url);
    
    if (response.ok) {
      await cache.put(new Request(url, { headers: { 'X-Content-ID': contentId } }), response);
      console.log('[SW] Content cached:', contentId);
    }
  } catch (error) {
    console.error('[SW] Failed to cache content:', error);
  }
}

async function deleteContent(contentId) {
  try {
    const cache = await caches.open(CONTENT_CACHE_NAME);
    const requests = await cache.keys();
    
    for (const request of requests) {
      if (request.headers.get('X-Content-ID') === contentId) {
        await cache.delete(request);
        console.log('[SW] Content deleted:', contentId);
      }
    }
  } catch (error) {
    console.error('[SW] Failed to delete content:', error);
  }
}

async function clearCache(cacheName) {
  try {
    await caches.delete(cacheName);
    console.log('[SW] Cache cleared:', cacheName);
  } catch (error) {
    console.error('[SW] Failed to clear cache:', error);
  }
}

// Sync functions (will be enhanced in later phases)
async function syncOfflineData() {
  console.log('[SW] Syncing offline data...');
  // Implementation will be added in Phase 4
  return Promise.resolve();
}

async function syncProgressData() {
  console.log('[SW] Syncing progress data...');
  // Implementation will be added in Phase 4
  return Promise.resolve();
}

async function syncQuizSubmissions() {
  console.log('[SW] Syncing quiz submissions...');
  // Implementation will be added in Phase 4
  return Promise.resolve();
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service worker script loaded');
