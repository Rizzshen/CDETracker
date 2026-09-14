// components/PushNotificationProvider.tsx
"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/registerServiceWorker";

export function PushNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <>{children}</>;
}
