importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBEmY5vau6HucxG-N0c3J4FeRg44fT1GMU",
  authDomain: "parkqr-e2f59.firebaseapp.com",
  projectId: "parkqr-e2f59",
  storageBucket: "parkqr-e2f59.firebasestorage.app",
  messagingSenderId: "646166365025",
  appId: "1:646166365025:web:dbe0924b6c6ab632e6bb20"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'ParkQR Bildirimi';
  const notificationOptions = {
    body: payload.notification?.body || 'Aracınızın başında biri var.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [500, 200, 500]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
