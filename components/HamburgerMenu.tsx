"use client";

import Link from "next/link";

export function HamburgerMenu({
  isOpen,
  onClose,

}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Menu Panel */}
      <div className="relative z-10 w-64 border-r-4 border-black bg-panel shadow-[8px_0_0_0_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="border-b-4 border-black bg-[#1a0f2e] p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-pixel text-[10px] text-coin">MENU</h2>
            <button
              onClick={onClose}
              className="font-pixel text-[8px] text-white/50 hover:text-white"
            >
              [X]
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="p-4 space-y-2">
          <Link
            href="/trophies"
            onClick={onClose}
            className="flex w-full items-center gap-3 border-2 border-black bg-panel p-3 font-pixel text-[8px] text-white shadow-[0_2px_0_0_#000] transition active:translate-y-0.5 active:shadow-none hover:bg-[#2a1020] hover:text-lime"
          >
            <span className="text-lg">🏆</span>
            <span>TROPHY ROOM</span>
          </Link>

          <Link
            href="/jar"
            onClick={onClose}
            className="flex w-full items-center gap-3 border-2 border-black bg-panel p-3 font-pixel text-[8px] text-white shadow-[0_2px_0_0_#000] transition active:translate-y-0.5 active:shadow-none hover:bg-[#2a1020] hover:text-lime"
          >
            <span className="text-lg">🏦</span>
            <span>DATE JAR</span>
          </Link>

          <Link
            href="/monthly"
            onClick={onClose}
            className="flex w-full items-center gap-3 border-2 border-black bg-panel p-3 font-pixel text-[8px] text-white shadow-[0_2px_0_0_#000] transition active:translate-y-0.5 active:shadow-none hover:bg-[#2a1020] hover:text-lime"
          >
            <span className="text-lg">📅</span>
            <span>MONTHLY TRACK</span>
          </Link>

          <div className="mt-6 border-t-2 border-white/10 pt-4">
            <p className="font-pixel text-[7px] text-white/40">
              COMING SOON...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
