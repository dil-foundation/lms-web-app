// Minimal Firebase service worker - required by Firebase but doesn't interfere with notifications
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyBS9S8FtBTsHTX0VEsn-BoX6yulSJv5CeA",
  authDomain: "dil-lms.firebaseapp.com",
  projectId: "dil-lms",
  storageBucket: "dil-lms.appspot.com",
  messagingSenderId: "1042360571713",
  appId: "1:1042360571713:web:563d18a148749cce0533c0",
  measurementId: "G-SP86QD577T"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages and show notifications
messaging.onBackgroundMessage(function(payload) {
  console.log('Background message received:', payload);
  
  // Show notification manually since we're using data-only messages
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.image || '/logo.png',
    badge: payload.data.image || '/logo.png',
    requireInteraction: true,
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  let urlToOpen = 'https://dil-dev.lms-staging.com/'; // Default URL
  
  // Check if there's a specific URL in the notification data
  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url;
  }
  
  // Open the URL in a new tab/window
  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});
