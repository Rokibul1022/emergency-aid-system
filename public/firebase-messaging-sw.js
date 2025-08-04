// Firebase Cloud Messaging Service Worker
// This file must be in the public folder for Firebase Cloud Messaging to work

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDcqFSjBBoiaOPRuvJgGKaL87-FSUIG9c8",
  authDomain: "emergency-aid327.firebaseapp.com",
  projectId: "emergency-aid327",
  storageBucket: "emergency-aid327.firebasestorage.app",
  messagingSenderId: "322610676604",
  appId: "1:322610676604:web:bf963ba1ea145de1c85af9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Emergency Aid Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: payload.data?.tag || 'emergency-aid',
    requireInteraction: payload.data?.requireInteraction || false,
    data: payload.data || {}
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  // Handle notification click based on data
  if (event.notification.data) {
    const data = event.notification.data;
    
    // Open the app or specific page based on notification type
    if (data.type === 'panic-alert') {
      event.waitUntil(
        clients.openWindow('/admin?tab=panic')
      );
    } else if (data.type === 'request-received') {
      event.waitUntil(
        clients.openWindow('/dashboard')
      );
    } else if (data.type === 'volunteer-assigned') {
      event.waitUntil(
        clients.openWindow('/dashboard')
      );
    } else {
      // Default: open the main app
      event.waitUntil(
        clients.openWindow('/')
      );
    }
  } else {
    // Default: open the main app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
}); 