// lib/registerServiceWorker.ts
export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      // Register without manual scope - let Service-Worker-Allowed header handle it
      const registration = await navigator.serviceWorker.register("/api/sw");
      console.log("✅ Service worker registered:", registration);
      return registration;
    } catch (error) {
      console.error("❌ Failed to register service worker:", error);
    }
  }
  return null;
}
