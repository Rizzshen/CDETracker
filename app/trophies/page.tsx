"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function TrophiesPage() {
  const [coupleId, setCoupleId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("coupleId");
    setCoupleId(stored);
  }, []);

  return (
    <main className="min-h-dvh bg-night p-4">
      <div className="flex items-center justify-between border-b-4 border-black pb-4">
        <Link
          href="/"
          className="border-2 border-white/30 px-3 py-1 font-pixel text-[8px] text-white/60 hover:text-white hover:border-lime"
        >
          ← BACK
        </Link>
        <h1 className="font-pixel text-base text-coin [text-shadow:0_0_12px_rgba(255,217,61,0.7)]">
          🏆 TROPHY ROOM
        </h1>
        <div className="w-16" />
      </div>
      <div className="mx-auto mt-6 max-w-sm space-y-4">
        <div className="border-4 border-black bg-panel p-4 shadow-[0_4px_0_0_#000]">
          <h2 className="font-pixel text-[9px] text-coin text-center">
            WEEKLY CHAMPIONS
          </h2>
          <div className="mt-4 space-y-2">
            <p className="text-center font-pixel text-[8px] text-white/40">
              History coming soon...
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
