"use client";

import { useState, useEffect } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type JarData = {
  totalBalance: number;
  pendingDebt: number;
  debtorUid?: string;
  debtorName?: string;
  monthlyBet: number;
  history: JarHistoryItem[];
};

type JarHistoryItem = {
  id: string;
  type: "payment" | "spending";
  amount: number;
  note?: string;
  date: string;
  addedBy?: string;
};

export function DateJar({
  coupleId,
  uid,
  myName,
  herName,
  partnerUid,
}: {
  coupleId: string;
  uid: string;
  myName: string;
  herName: string | null;
  partnerUid: string | null;
}) {
  const [jarData, setJarData] = useState<JarData | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [logAmount, setLogAmount] = useState("");
  const [logNote, setLogNote] = useState("");

  // Listen to jar data in real-time
  useEffect(() => {
    if (!coupleId) return;
    return onSnapshot(doc(db, "couples", coupleId, "jar", "main"), (snap) => {
      const data = snap.data() as JarData | undefined;
      setJarData(
        data ?? {
          totalBalance: 0,
          pendingDebt: 0,
          monthlyBet: 0,
          history: [],
        },
      );
    });
  }, [coupleId]);

  // Mark as paid (loser clicks this)
  async function markAsPaid() {
    if (!coupleId || !jarData) return;
    await setDoc(
      doc(db, "couples", coupleId, "jar", "main"),
      {
        pendingDebt: 0,
        debtorUid: deleteField(),
        debtorName: deleteField(),
        totalBalance: jarData.totalBalance + jarData.pendingDebt,
        history: [
          {
            id: crypto.randomUUID(),
            type: "payment",
            amount: jarData.pendingDebt,
            note: `${myName} added to jar`,
            date: new Date().toISOString(),
            addedBy: uid,
          },
          ...jarData.history,
        ],
      },
      { merge: true },
    );
    setShowPayModal(false);
  }

  // Log a date expense
  async function logDateExpense() {
    if (!coupleId || !jarData || !logAmount) return;
    const amount = parseInt(logAmount);
    if (amount > jarData.totalBalance) {
      alert("Not enough in the jar!");
      return;
    }
    await setDoc(
      doc(db, "couples", coupleId, "jar", "main"),
      {
        totalBalance: jarData.totalBalance - amount,
        history: [
          {
            id: crypto.randomUUID(),
            type: "spending",
            amount: amount,
            note: logNote || "Date night",
            date: new Date().toISOString(),
            addedBy: uid,
          },
          ...jarData.history,
        ],
      },
      { merge: true },
    );
    setLogAmount("");
    setLogNote("");
    setShowLogModal(false);
  }

  const isDebtor = jarData?.debtorUid === uid;
  const jarHeight = Math.min(jarData?.totalBalance ?? 0, 5000) / 50; // Max 5000 = full jar

  return (
    <div className="space-y-4">
      {/* Jar Visual */}
      <div className="border-4 border-black bg-[#1a0f2e] p-6 text-center shadow-[0_4px_0_0_#000]">
        <h3 className="font-pixel text-[10px] text-coin [text-shadow:0_0_8px_rgba(255,217,61,0.6)]">
          🏦 DATE NIGHT JAR
        </h3>

        {/* Pixel Jar */}
        <div className="mx-auto mt-4 h-32 w-48 border-4 border-black bg-[#0a0515] relative overflow-hidden">
          {/* Money filling the jar */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-lime transition-all duration-500"
            style={{
              height: `${jarHeight}%`,
              boxShadow: "0 0 12px rgba(141,255,91,0.4)",
            }}
          />
          {/* Jar label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-pixel text-[12px] text-white/80 [text-shadow:0_0_4px_#000]">
              {jarData?.totalBalance ?? 0}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 space-y-1">
          <p className="font-pixel text-[8px] text-white/60">
            ✅ Available:{" "}
            <span className="text-lime">₱{jarData?.totalBalance ?? 0}</span>
          </p>
          {jarData?.pendingDebt && jarData.pendingDebt > 0 ? (
            <p className="font-pixel text-[8px] text-white/60">
              Pending: <span className="text-p2">₱{jarData.pendingDebt}</span> (
              {jarData.debtorName})
            </p>
          ) : (
            <p className="font-pixel text-[8px] text-white/40">
              No pending debt ✅
            </p>
          )}
          <p className="font-pixel text-[8px] text-white/60">
            📅 Monthly Bet:{" "}
            <span className="text-coin">₱{jarData?.monthlyBet ?? 0}</span>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {isDebtor ? (
          <button
            onClick={() => setShowPayModal(true)}
            className="border-4 border-black bg-lime py-3 font-pixel text-[9px] text-black shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none"
          >
            💰 I PAID
          </button>
        ) : (
          <button
            disabled
            className="border-4 border-black bg-[#1a0f2e] py-3 font-pixel text-[9px] text-white/30 shadow-[0_4px_0_0_#000] cursor-not-allowed"
          >
            💰 I PAID
          </button>
        )}
        <button
          onClick={() => setShowLogModal(true)}
          className="border-4 border-black bg-panel py-3 font-pixel text-[9px] text-white shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none hover:bg-[#2a1020]"
        >
          📝 LOG DATE
        </button>
      </div>

      <button
        onClick={() => setShowHistory(true)}
        className="w-full border-2 border-white/30 py-2 font-pixel text-[8px] text-white/60 hover:text-white"
      >
        📜 VIEW HISTORY
      </button>

      {/* 💰 Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xs border-4 border-black bg-panel p-6 text-center shadow-[0_8px_0_0_#000]">
            <h3 className="font-pixel text-[11px] text-lime">
              CONFIRM PAYMENT?
            </h3>
            <p className="mt-2 font-retro text-sm text-white/80">
              You're adding{" "}
              <span className="text-coin">₱{jarData?.pendingDebt}</span> to the
              Date Jar
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={markAsPaid}
                className="border-4 border-black bg-lime py-3 font-pixel text-[10px] text-black shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none"
              >
                YES
              </button>
              <button
                onClick={() => setShowPayModal(false)}
                className="border-4 border-black bg-night py-3 font-pixel text-[10px] text-white/60 shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📝 Log Date Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xs border-4 border-black bg-panel p-6 shadow-[0_8px_0_0_#000]">
            <h3 className="font-pixel text-[11px] text-coin text-center">
              LOG DATE EXPENSE
            </h3>

            <div className="mt-4 space-y-3">
              <div>
                <label className="font-pixel text-[8px] text-white/60">
                  Amount (₱)
                </label>
                <input
                  type="number"
                  value={logAmount}
                  onChange={(e) => setLogAmount(e.target.value)}
                  className="mt-1 w-full border-4 border-black bg-night px-3 py-2 font-pixel text-[9px] text-white outline-none focus:[box-shadow:0_0_0_2px_#8dff5b]"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="font-pixel text-[8px] text-white/60">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  className="mt-1 w-full border-4 border-black bg-night px-3 py-2 font-pixel text-[9px] text-white outline-none focus:[box-shadow:0_0_0_2px_#8dff5b]"
                  placeholder="Dinner at Mario's 🍝"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={logDateExpense}
                className="border-4 border-black bg-lime py-3 font-pixel text-[10px] text-black shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none"
              >
                LOG IT
              </button>
              <button
                onClick={() => {
                  setShowLogModal(false);
                  setLogAmount("");
                  setLogNote("");
                }}
                className="border-4 border-black bg-night py-3 font-pixel text-[10px] text-white/60 shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/*  History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xs border-4 border-black bg-panel p-4 shadow-[0_8px_0_0_#000]">
            <div className="flex items-center justify-between">
              <h3 className="font-pixel text-[10px] text-coin">JAR HISTORY</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="font-pixel text-[8px] text-white/50 hover:text-white"
              >
                [X]
              </button>
            </div>

            <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
              {jarData?.history?.length === 0 ? (
                <p className="text-center font-pixel text-[8px] text-white/40">
                  No history yet
                </p>
              ) : (
                jarData?.history.map((item) => (
                  <div
                    key={item.id}
                    className={`border-2 border-black p-2 ${
                      item.type === "payment" ? "bg-[#1a2f1a]" : "bg-[#2a1020]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-[7px] text-white/60">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                      <span
                        className={`font-pixel text-[8px] ${
                          item.type === "payment" ? "text-lime" : "text-p2"
                        }`}
                      >
                        {item.type === "payment" ? "+" : "-"}₱{item.amount}
                      </span>
                    </div>
                    {item.note && (
                      <p className="mt-1 font-retro text-[9px] text-white/70">
                        {item.note}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
