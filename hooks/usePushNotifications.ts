// hooks/usePushNotifications.ts
import { useEffect, useState } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";

export function usePushNotifications(uid: string | null) {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!uid) return;
    setLoading(true);

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === "granted") {
        const messaging = getMessaging(app);
        const registration = await navigator.serviceWorker.getRegistration();

        const fcmToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration || undefined,
        });

        setToken(fcmToken);

        await setDoc(
          doc(db, "users", uid),
          { fcmToken, notificationsEnabled: true },
          { merge: true },
        );

        console.log("✅ Push token saved:", fcmToken);
      }
    } catch (error) {
      console.error("❌ Failed to setup push:", error);
    } finally {
      setLoading(false);
    }
  };

  // Foreground messages (when app is open)
  useEffect(() => {
    if (!uid || permission !== "granted") return;

    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, (payload) => {
      const notification = payload.notification;

      if (!notification) return; // ✅ Safety check

      const { title, body, image } = notification;

      if (
        "Notification" in window &&
        Notification.permission === "granted" &&
        title
      ) {
        new Notification(title, {
          body: body || "",
          icon: image || "/favicon.ico",
          tag: title,
        });
      }
    });

    return () => unsubscribe();
  }, [uid, permission]);

  return { permission, token, loading, requestPermission };
}
