"use client";

import { useState } from "react";

// 🍔 Hamburger Menu Component
export function HamburgerMenu({
  isOpen,
  onClose,
  myName,
  herName,
  myPrevPoints,
  herPrevPoints,
}: {
  isOpen: boolean;
  onClose: () => void;
  myName: string;
  herName: string | null;
  myPrevPoints: number;
  herPrevPoints: number;
}) {
  const [activeTab, setActiveTab] = useState<'menu' | 'trophies'>('menu');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className="relative z-10 w-64 border-r-4 border-black bg-panel shadow-[8px_0_0_0_rgba(0,0,0,0.5)] animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="border-b-4 border-black bg-[#1a0f2e] p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-pixel text-[10px] text-coin [text-shadow:0_0_8px_rgba(255,217,61,0.6)]">
              MENU
            </h2>
            <button
              onClick={onClose}
              className="font-pixel text-[8px] text-white/50 hover:text-white"
            >
              [X]
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b-4 border-black">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 border-r-2 border-black px-3 py-2 font-pixel text-[8px] ${
              activeTab === 'menu'
                ? 'bg-[#2a1020] text-lime'
                : 'bg-panel text-white/50 hover:text-white'
            }`}
          >
            MENU
          </button>
          <button
            onClick={() => setActiveTab('trophies')}
            className={`flex-1 px-3 py-2 font-pixel text-[8px] ${
              activeTab === 'trophies'
                ? 'bg-[#2a1020] text-coin'
                : 'bg-panel text-white/50 hover:text-white'
            }`}
          >
            TROPHIES
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'menu' ? (
            <div className="space-y-2">
              <MenuItem icon="🏆" label="TROPHY ROOM" onClick={() => setActiveTab('trophies')} />
              <MenuItem icon="️" label="SETTINGS" onClick={() => {}} disabled />
              <MenuItem icon="📊" label="STATS" onClick={() => {}} disabled />
              <div className="mt-6 border-t-2 border-white/10 pt-4">
                <p className="font-pixel text-[7px] text-white/40">
                  COMING SOON...
                </p>
              </div>
            </div>
          ) : (
            <TrophyRoom 
              myName={myName}
              herName={herName}
              myPoints={myPrevPoints}
              herPoints={herPrevPoints}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({ 
  icon, 
  label, 
  onClick, 
  disabled = false 
}: { 
  icon: string; 
  label: string; 
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 border-2 border-black p-3 font-pixel text-[8px] shadow-[0_2px_0_0_#000] transition active:translate-y-0.5 active:shadow-none ${
        disabled
          ? 'bg-[#1a0f2e] text-white/20 cursor-not-allowed'
          : 'bg-panel text-white hover:bg-[#2a1020] hover:text-lime'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// 🏆 Trophy Room Component
function TrophyRoom({
  myName,
  herName,
  myPoints,
  herPoints,
}: {
  myName: string;
  herName: string | null;
  myPoints: number;
  herPoints: number;
}) {
  const winner = myPoints > herPoints ? 'me' : herPoints > myPoints ? 'her' : 'tie';
  
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-pixel text-[9px] text-coin [text-shadow:0_0_8px_rgba(255,217,61,0.6)]">
          LAST WEEK'S CHAMPION
        </h3>
      </div>

      {/* Trophy Display */}
      <div className="border-4 border-black bg-[#1a0f2e] p-4 text-center shadow-[0_4px_0_0_#000]">
        {winner === 'tie' ? (
          <div className="space-y-2">
            <div className="flex justify-center gap-4">
              <span className="text-4xl">🏆</span>
              <span className="text-4xl">🏆</span>
            </div>
            <p className="font-pixel text-[8px] text-lime">IT'S A TIE!</p>
            <p className="font-pixel text-[7px] text-white/50">
              Both scored {myPoints} pts
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="text-5xl">🏆</span>
            <p className="font-pixel text-[9px]" style={{ 
              color: winner === 'me' ? '#4de3ff' : '#ff5da2',
              textShadow: `0 0 8px ${winner === 'me' ? '#4de3ff' : '#ff5da2'}`
            }}>
              {winner === 'me' ? myName : herName}
            </p>
            <p className="font-pixel text-[7px] text-white/50">
              {winner === 'me' ? myPoints : herPoints} points
            </p>
          </div>
        )}
      </div>

      {/* Score Breakdown */}
      <div className="space-y-2 border-4 border-black bg-panel p-3 shadow-[0_4px_0_0_#000]">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[8px] text-white/60">{myName}</span>
          <span className="font-pixel text-[8px] text-[#4de3ff]">{myPoints} pts</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[8px] text-white/60">{herName}</span>
          <span className="font-pixel text-[8px] text-[#ff5da2]">{herPoints} pts</span>
        </div>
      </div>

      <p className="text-center font-pixel text-[7px] text-white/40">
        More history coming soon...
      </p>
    </div>
  );
}