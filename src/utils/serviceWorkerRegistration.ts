// Service Worker Registration for DIL LMS
// Handles registration, updates, and communication with service worker

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onNeedRefresh?: () => void;
};

export function register(config?: Config) {
  if ('serviceWorker' in navigator) {
    const publicUrl = import.meta.env.BASE_URL || '/';
    
    window.addEventListener('load', () => {
      const swUrl = `${publicUrl}sw.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log(
            '[SW] This web app is being served cache-first by a service worker.'
          );
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[SW] Service worker registered successfully');
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('[SW] New content is available and will be used when all tabs are closed');
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
              if (config && config.onNeedRefresh) {
                config.onNeedRefresh();
              }
            } else {
              console.log('[SW] Content is cached for offline use');
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
              if (config && config.onOfflineReady) {
                config.onOfflineReady();
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('[SW] Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('[SW] No internet connection found. App is running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Service Worker Communication API
export class ServiceWorkerAPI {
  private static instance: ServiceWorkerAPI;
  private registration: ServiceWorkerRegistration | null = null;

  static getInstance(): ServiceWorkerAPI {
    if (!ServiceWorkerAPI.instance) {
      ServiceWorkerAPI.instance = new ServiceWorkerAPI();
    }
    return ServiceWorkerAPI.instance;
  }

  setRegistration(registration: ServiceWorkerRegistration) {
    this.registration = registration;
  }

  // Send message to service worker
  async sendMessage(type: string, payload?: any): Promise<any> {
    if (!this.registration || !this.registration.active) {
      throw new Error('Service worker not available');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      this.registration.active!.postMessage(
        { type, payload },
        [messageChannel.port2]
      );

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Service worker message timeout'));
      }, 10000);
    });
  }

  // Skip waiting for new service worker
  async skipWaiting(): Promise<void> {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  // Cache content in service worker
  async cacheContent(url: string, contentId: string): Promise<void> {
    return this.sendMessage('CACHE_CONTENT', { url, contentId });
  }

  // Delete cached content
  async deleteContent(contentId: string): Promise<void> {
    return this.sendMessage('DELETE_CONTENT', { contentId });
  }

  // Clear specific cache
  async clearCache(cacheName: string): Promise<void> {
    return this.sendMessage('CLEAR_CACHE', { cacheName });
  }

  // Get service worker version
  async getVersion(): Promise<string> {
    const result = await this.sendMessage('GET_VERSION');
    return result.version;
  }

  // Register for background sync
  async registerBackgroundSync(tag: string): Promise<void> {
    if (this.registration && 'sync' in this.registration) {
      await this.registration.sync.register(tag);
    }
  }
}

// Export singleton instance
export const swAPI = ServiceWorkerAPI.getInstance();
