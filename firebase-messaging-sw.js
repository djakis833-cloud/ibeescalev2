// firebase-messaging-sw.js
// Service Worker αποκλειστικά για FCM background push notifications.
// Πρέπει να βρίσκεται στη ΡΙΖΑ του site (ίδιο επίπεδο με το index.html),
// ΟΧΙ μέσα σε υποφάκελο, αλλιώς το scope του δεν θα καλύπτει όλη την εφαρμογή.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Ίδιο config με αυτό μέσα στο index.html
firebase.initializeApp({
  apiKey: "AIzaSyDGMWEOc3TUVco2WR1j8bABLZux-DmnWVo",
  authDomain: "ibeescale.firebaseapp.com",
  projectId: "ibeescale",
  storageBucket: "ibeescale.firebasestorage.app",
  messagingSenderId: "590028727937",
  appId: "1:590028727937:web:a2cf6808cd0c72f896cf80"
});

const messaging = firebase.messaging();

// Εμφάνιση ειδοποίησης όταν η εφαρμογή είναι ΚΛΕΙΣΤΗ ή στο background.
// (Όταν η εφαρμογή είναι ανοιχτή/foreground, αναλαμβάνει το onMessage() μέσα στο index.html.)
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'Ζυγαριά Κυψέλης';
  const body  = (payload.notification && payload.notification.body)  || 'Νέα μέτρηση';

  self.registration.showNotification(title, {
    body: body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: (payload.data && payload.data.channel) ? ('scale-' + payload.data.channel) : 'scale-update',
    data: payload.data || {}
  });
});

// Όταν ο χρήστης πατήσει πάνω στην ειδοποίηση, άνοιξε/φέρε μπροστά την εφαρμογή.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
