// firebase-messaging-sw.js
// Service Worker αποκλειστικά για FCM background push notifications.
// Πρέπει να βρίσκεται στη ΡΙΖΑ του site (ίδιο επίπεδο με το index.html),
// ΟΧΙ μέσα σε υποφάκελο, αλλιώς το scope του δεν θα καλύπτει όλη την εφαρμογή.

// ΣΗΜΑΝΤΙΚΟ: χωρίς αυτό, κάθε νέα έκδοση αυτού του service worker μπαίνει σε
// "αναμονή" (waiting) αντί να ενεργοποιείται αμέσως — και επειδή αυτό το SW δεν
// ελέγχει ποτέ καμία πλοηγήσιμη σελίδα (το scope του είναι αποκλειστικά για push),
// η αναμονή μπορεί να μην λύνεται ποτέ μόνη της, με αποτέλεσμα να μένει "κολλημένη"
// για πάντα η ΠΑΛΙΑ έκδοση ενεργή, ό,τι αλλαγές κι αν ανεβάσουμε στο αρχείο.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Ίδιο config με αυτό μέσα στο index.html
firebase.initializeApp({
  apiKey: "AIzaSyDL9_8GoFn6Sqk946W8v_qhxTAHP8ZK_FY",
  authDomain: "ibeescale-gpt.firebaseapp.com",
  projectId: "ibeescale-gpt",
  storageBucket: "ibeescale-gpt.firebasestorage.app",
  messagingSenderId: "603006359755",
  appId: "1:603006359755:web:d87f503fd468ec38f8a34e"
});

const messaging = firebase.messaging();

// Εμφάνιση ειδοποίησης όταν η εφαρμογή είναι ΚΛΕΙΣΤΗ ή στο background.
// (Όταν η εφαρμογή είναι ανοιχτή/foreground, αναλαμβάνει το onMessage() μέσα στο index.html.)
//
// ΣΗΜΑΝΤΙΚΟ: Ο κώδικας παρακάτω περιμένει το backend (π.χ. Cloud Function) να στέλνει
// στο "data" payload του FCM μηνύματος ένα πεδίο "type" με μία από τις τιμές:
//   "new_data"     -> 📡 νέα μέτρηση
//   "weight_drop"  -> ⚠️ μεγάλη πτώση βάρους (>2.5 kg)
//   "low_battery"  -> 🔋 χαμηλή μπαταρία (<2.9v)
// καθώς και τα πεδία: scaleName, weight, weightDiff, time, battery (ό,τι χρειάζεται
// για κάθε περίπτωση). Αν τα ονόματα των πεδίων στο δικό σου backend είναι διαφορετικά,
// άλλαξέ τα μέσα στη συνάρτηση buildNotification παρακάτω.

function buildNotification(data) {
  data = data || {};

  const scaleName  = data.scaleName  || 'Ζυγαριά';
  const weight     = data.weight     || '-';
  const weightDiff = data.weightDiff || '-';
  const time       = data.time       || new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  const battery    = data.battery    || '-';

  switch (data.type) {
    case 'weight_drop':
      return {
        title: '⚠️ Μεγάλη πτώση βάρους',
        body: `"${scaleName}"\n${weight} kg | ${weightDiff} | ${time}`,
        tag: 'scale-weight-drop'
      };

    case 'low_battery':
      return {
        title: '🔋 Χαμηλή μπαταρία',
        body: `"${scaleName}" - ${battery} V`,
        tag: 'scale-low-battery'
      };

    case 'new_data':
    default:
      return {
        title: `📡 Νέα μέτρηση για "${scaleName}"`,
        body: `${weight} kg | ${weightDiff} | ${time}`,
        tag: (data.channel ? ('scale-new-data-' + data.channel) : 'scale-new-data')
      };
  }
}

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const built = buildNotification(data);

  // Αν το backend στέλνει δικό του "notification" title/body, αυτά έχουν προτεραιότητα.
  const title = (payload.notification && payload.notification.title) || built.title;
  const body  = (payload.notification && payload.notification.body)  || built.body;

  return self.registration.showNotification(title, {
    body: body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: built.tag,
    data: data
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
