"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";

export function NotificationSettings({ uid }: { uid: string }) {
  const { permission, loading, requestPermission } = usePushNotifications(uid);

  return (
    <div className="border-4 border-black bg-panel p-4 shadow-[0_4px_0_0_#000]">
      <h3 className="font-pixel text-[10px] text-coin mb-3">🔔 NOTIFICATIONS</h3>
      
      <div className="space-y-2">
        {permission === 'granted' ? (
          <div className="flex items-center gap-2">
            <span className="text-lime">✓</span>
            <span className="font-pixel text-[8px] text-white/70">Enabled</span>
          </div>
        ) : permission === 'denied' ? (
          <div className="flex items-center gap-2">
            <span className="text-p2">✗</span>
            <span className="font-pixel text-[8px] text-white/70">Blocked</span>
          </div>
        ) : (
          <button
            onClick={requestPermission}
            disabled={loading}
            className="w-full border-4 border-black bg-lime py-2 font-pixel text-[8px] text-black shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            {loading ? 'ENABLING...' : 'ENABLE NOTIFICATIONS'}
          </button>
        )}
      </div>

      <p className="mt-3 font-pixel text-[6px] text-white/40">
        Get notified when poked, jar payments due, and more!
      </p>
    </div>
  );
}