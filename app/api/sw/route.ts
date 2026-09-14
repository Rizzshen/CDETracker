// app/api/sw/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const swCode = `
    importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

    firebase.initializeApp(${JSON.stringify(config)});
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const { title, body, icon, clickAction } = payload.notification;
      self.registration.showNotification(title, {
        body,
        icon: icon || '/favicon.ico',
        data: { url: clickAction || '/' },
        tag: title,
      });
    });

    self.addEventListener('notificationclick', (event) => {
      event.notification.close();
      const url = event.notification.data?.url || '/';
      event.waitUntil(clients.openWindow(url));
    });
  `;

  return new NextResponse(swCode, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/", // ✅ Allow root scope
    },
  });
}
