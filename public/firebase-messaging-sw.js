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

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
