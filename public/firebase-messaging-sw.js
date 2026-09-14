// public/firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js",
);

// Config will be injected at build time via a script tag
// This is safe because these are public values (not secrets)
const firebaseConfig = self.__FIREBASE_CONFIG__ || {};

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handle background notifications
  messaging.onBackgroundMessage((payload) => {
    const { title, body, icon, clickAction } = payload.notification;

    self.registration.showNotification(title, {
      body,
      icon: icon || "/favicon.ico",
      data: { url: clickAction || "/" },
      tag: title,
    });
  });

  // Handle notification clicks
  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || "/";
    event.waitUntil(clients.openWindow(urlToOpen));
  });
}
