"use client";

import { useState, useEffect } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  deleteField,
  FieldValue,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

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
  type: "payment" | "spending" | "month_end";
  amount: number;
  note?: string;
  date: string;
  addedBy?: string;
  pointsA?: number;
  pointsB?: number;
};

type MonthEndResult = {
  pointsA: number;
  pointsB: number;
  loserName: string | null;
  isTie: boolean;
};

export default function JarPage() {
  const [jarData, setJarData] = useState<JarData | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEndMonthModal, setShowEndMonthModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [monthEndResult, setMonthEndResult] = useState<MonthEndResult | null>(
    null,
  );

  const [logAmount, setLogAmount] = useState("");
  const [logNote, setLogNote] = useState("");
  const [uid, setUid] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Partner info state
  const [partnerUid, setPartnerUid] = useState<string | null>(null);
  const [myName, setMyName] = useState<string>("Me");
  const [herName, setHerName] = useState<string>("Partner");

  // ✅ Helper to safely display numbers (prevents NaN errors)
  const safeNum = (val: any): number => {
    if (typeof val === "number" && !isNaN(val)) return val;
    return 0;
  };

  // Load uid/coupleId from localStorage
  useEffect(() => {
    const storedUid = localStorage.getItem("uid");
    const storedCoupleId = localStorage.getItem("coupleId");

    if (!storedUid || !storedCoupleId) {
      setError("Not logged in or no couple found. Please log in first.");
      return;
    }

    setUid(storedUid);
    setCoupleId(storedCoupleId);
  }, []);

  // Listen to jar data in real-time
  useEffect(() => {
    if (!coupleId) return;

    const jarRef = doc(db, "couples", coupleId, "jar", "main");
    const unsubscribe = onSnapshot(
      jarRef,
      (snap) => {
        const data = snap.data() as JarData | undefined;
        setJarData(
          data ?? {
            totalBalance: 0,
            pendingDebt: 0,
            monthlyBet: 0,
            history: [],
          },
        );
      },
      (err) => {
        console.error("❌ Jar listener error:", err);
        setError("Failed to load jar: " + err.message);
      },
    );

    return () => unsubscribe();
  }, [coupleId]);

  // Fetch couple & partner info
  useEffect(() => {
    if (!coupleId || !uid) return;

    const unsubscribeCouple = onSnapshot(
      doc(db, "couples", coupleId),
      (snap) => {
        const data = snap.data() as { members: string[] } | undefined;
        if (data?.members) {
          const pUid = data.members.find((m) => m !== uid) ?? null;
          setPartnerUid(pUid);
        }
      },
    );

    const unsubscribeMy = onSnapshot(doc(db, "users", uid), (snap) => {
      const data = snap.data() as { email?: string } | undefined;
      setMyName(data?.email?.split("@")[0] || "Me");
    });

    let unsubscribePartner: (() => void) | undefined;
    if (partnerUid) {
      unsubscribePartner = onSnapshot(doc(db, "users", partnerUid), (snap) => {
        const data = snap.data() as { email?: string } | undefined;
        setHerName(data?.email?.split("@")[0] || "Partner");
      });
    }

    return () => {
      unsubscribeCouple();
      unsubscribeMy();
      unsubscribePartner?.();
    };
  }, [coupleId, uid, partnerUid]);

  async function markAsPaid() {
    if (!coupleId || !jarData || !uid) return;
    await setDoc(
      doc(db, "couples", coupleId, "jar", "main"),
      {
        pendingDebt: 0,
        debtorUid: deleteField(),
        debtorName: deleteField(),
        totalBalance:
          safeNum(jarData.totalBalance) + safeNum(jarData.pendingDebt),
        history: [
          {
            id: crypto.randomUUID(),
            type: "payment",
            amount: safeNum(jarData.pendingDebt),
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

  async function logDateExpense() {
    if (!coupleId || !jarData || !logAmount || !uid) return;
    const amount = parseInt(logAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount!");
      return;
    }
    if (amount > safeNum(jarData.totalBalance)) {
      alert("Not enough in the jar!");
      return;
    }
    await setDoc(
      doc(db, "couples", coupleId, "jar", "main"),
      {
        totalBalance: safeNum(jarData.totalBalance) - amount,
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

  async function handleEndMonth() {
    if (!coupleId || !uid || !partnerUid || !jarData) return;

    setIsCalculating(true);

    try {
      const { calculateMonthlyPoints, endMonthCalculation } =
        await import("@/lib/monthlyCalculator");

      const result = await endMonthCalculation(
        coupleId,
        uid,
        partnerUid,
        myName,
        herName,
        safeNum(jarData.monthlyBet) || 500,
      );

      setMonthEndResult(result);
      setShowEndMonthModal(true);
    } catch (error) {
      console.error("Month end calculation failed:", error);
      alert("Failed to calculate month end. Check console.");
    } finally {
      setIsCalculating(false);
    }
  }

  const isDebtor = jarData?.debtorUid === uid;
  // ✅ Jar height based on balance (max 2000 = full)
  const jarHeight = Math.min(safeNum(jarData?.totalBalance), 2000) / 20;
  const fillPercentage = Math.min(
    (safeNum(jarData?.totalBalance) / 2000) * 100,
    100,
  );

  // Show error if any
  if (error) {
    return (
      <main className="min-h-dvh bg-night p-4">
        <div className="flex items-center justify-between border-b-4 border-black pb-4">
          <Link
            href="/"
            className="border-2 border-white/30 px-3 py-1 font-pixel text-[8px] text-white/60 hover:text-white"
          >
            ← BACK
          </Link>
          <h1 className="font-pixel text-base text-coin">🏦 DATE JAR</h1>
          <div className="w-16" />
        </div>
        <div className="mx-auto mt-8 max-w-sm border-4 border-black bg-[#2a1020] p-6 text-center shadow-[0_4px_0_0_#000]">
          <p className="font-pixel text-[9px] text-p2">⚠️ ERROR</p>
          <p className="mt-2 font-retro text-sm text-white/80">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-block border-4 border-black bg-lime px-4 py-2 font-pixel text-[9px] text-black shadow-[0_4px_0_0_#000]"
          >
            GO HOME
          </Link>
        </div>
      </main>
    );
  }

  // Show loading
  if (!jarData) {
    return (
      <main className="min-h-dvh bg-night p-4">
        <div className="flex items-center justify-between border-b-4 border-black pb-4">
          <Link
            href="/"
            className="border-2 border-white/30 px-3 py-1 font-pixel text-[8px] text-white/60 hover:text-white"
          >
            ← BACK
          </Link>
          <h1 className="font-pixel text-base text-coin">🏦 DATE JAR</h1>
          <div className="w-16" />
        </div>
        <div className="mx-auto mt-8 max-w-sm text-center">
          <p className="font-pixel text-[9px] text-coin animate-pulse">
            LOADING JAR...
          </p>
          <p className="mt-2 font-pixel text-[7px] text-white/40">
            coupleId: {coupleId || "null"}
          </p>
          <p className="font-pixel text-[7px] text-white/40">
            uid: {uid || "null"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-night p-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-black pb-4">
        <Link
          href="/"
          className="border-2 border-white/30 px-3 py-1 font-pixel text-[8px] text-white/60 hover:text-white hover:border-lime"
        >
          ← BACK
        </Link>
        <h1 className="font-pixel text-lg text-coin [text-shadow:0_0_12px_rgba(255,217,61,0.7)]">
          DATE JAR
        </h1>
        <div className="w-16" />
      </div>

      {/* Jar Visual */}
      <div className="mx-auto mt-6 max-w-sm border-4 border-black bg-[#1a0f2e] p-6 text-center shadow-[0_4px_0_0_#000]">
        <h3 className="font-pixel text-[10px] text-coin">DATE NIGHT FUND</h3>

        {/* Jar Container */}
        <div className="mx-auto mt-4 h-40 w-48 border-4 border-black bg-[#0a0515] relative overflow-hidden">
          {/* Grid pattern overlay (retro feel) */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent)`,
              backgroundSize: "20px 20px",
            }}
          />

          {/* Money filling the jar with gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out"
            style={{
              height: `${Math.max(jarHeight, 2)}%`,
              background:
                "linear-gradient(180deg, #a3f9a3 0%, #4ade80 50%, #22c55e 100%)",
              boxShadow:
                "0 0 20px rgba(74, 222, 128, 0.6), inset 0 0 10px rgba(255,255,255,0.3)",
            }}
          >
            {/* Subtle coin pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='3' fill='%23000'/%3E%3C/svg%3E")`,
                animation: "coinFloat 3s ease-in-out infinite",
              }}
            />
          </div>

          {/* Goal line at 2000 */}
          <div
            className="absolute left-0 right-0 h-px bg-yellow-400/60"
            style={{ top: "0%" }}
          >
            <span className="absolute right-1 -top-4 font-pixel text-[6px] text-yellow-400">
              GOAL
            </span>
          </div>

          {/* Amount label inside jar */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-pixel text-[16px] text-white [text-shadow:0_0_6px_#000,0_0_10px_rgba(74,222,128,0.8)] z-10">
              {safeNum(jarData.totalBalance)}
            </span>
            <span className="font-pixel text-[7px] text-white/70 mt-1">
              of 2000
            </span>
          </div>

          {/* Percentage badge */}
          <div className="absolute bottom-2 right-2 font-pixel text-[7px] text-black bg-lime px-2 py-0.5 rounded-sm shadow-[0_2px_0_0_#000]">
            {Math.round(fillPercentage)}%
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 space-y-2">
          <p className="font-pixel text-[8px] text-white/70">
            <span className="text-lime">✓</span> Available:{" "}
            <span className="text-lime text-[10px]">
              P{safeNum(jarData.totalBalance)}
            </span>
          </p>
          {safeNum(jarData.pendingDebt) > 0 ? (
            <p className="font-pixel text-[8px] text-white/70">
              <span className="text-p2"></span> Pending:{" "}
              <span className="text-p2 text-[10px]">
                P{safeNum(jarData.pendingDebt)}
              </span>{" "}
              ({jarData.debtorName})
            </p>
          ) : (
            <p className="font-pixel text-[8px] text-white/50">
              <span className="text-lime">✓</span> No pending debt
            </p>
          )}
          <p className="font-pixel text-[8px] text-white/70">
            <span className="text-coin"></span> Monthly Bet:{" "}
            <span className="text-coin text-[10px]">
              P{safeNum(jarData.monthlyBet) || 500}
            </span>
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 w-full bg-[#0a0515] border-2 border-black">
          <div
            className="h-full bg-gradient-to-r from-lime to-emerald-400 transition-all duration-500"
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mx-auto mt-4 max-w-sm grid grid-cols-2 gap-2">
        {isDebtor ? (
          <button
            onClick={() => setShowPayModal(true)}
            className="border-4 border-black bg-lime py-3 font-pixel text-[9px] text-black shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none hover:brightness-110"
          >
            💰 I PAID
          </button>
        ) : (
          <button
            disabled
            className="border-4 border-black bg-[#1a0f2e] py-3 font-pixel text-[9px] text-white/30 cursor-not-allowed"
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

      {/* End Month Button */}
      <div className="mx-auto mt-4 max-w-sm">
        <button
          onClick={handleEndMonth}
          disabled={isCalculating || !partnerUid}
          className="w-full border-4 border-black bg-coin py-3 font-pixel text-[9px] text-black shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
        >
          {isCalculating ? "🔄 CALCULATING..." : "📅 END MONTH"}
        </button>
        <p className="mt-2 text-center font-pixel text-[6px] text-white/40">
          Run on last day of month to determine loser
        </p>
      </div>

      {/* View History Button */}
      <div className="mx-auto mt-2 max-w-sm">
        <button
          onClick={() => setShowHistory(true)}
          className="w-full border-2 border-white/30 py-2 font-pixel text-[8px] text-white/60 hover:text-white hover:border-lime"
        >
          📜 VIEW HISTORY
        </button>
      </div>

      {/* 💰 Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xs border-4 border-black bg-panel p-6 text-center shadow-[0_8px_0_0_#000]">
            <h3 className="font-pixel text-[11px] text-lime">
              CONFIRM PAYMENT?
            </h3>
            <p className="mt-2 font-retro text-sm text-white/80">
              Adding{" "}
              <span className="text-coin">P{safeNum(jarData.pendingDebt)}</span>{" "}
              to the jar
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={markAsPaid}
                className="border-4 border-black bg-lime py-3 font-pixel text-[10px] text-black shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none hover:brightness-110"
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
                  Amount (P)
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
                  placeholder="Dinner at Mario's"
                  maxLength={50}
                />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={logDateExpense}
                className="border-4 border-black bg-lime py-3 font-pixel text-[10px] text-black shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none hover:brightness-110"
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

      {/* 📜 History Modal */}
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
              {jarData.history.length === 0 ? (
                <p className="text-center font-pixel text-[8px] text-white/40">
                  No history yet
                </p>
              ) : (
                jarData.history.map((item) => (
                  <div
                    key={item.id}
                    className={`border-2 border-black p-2 ${item.type === "payment" ? "bg-[#1a2f1a]" : item.type === "month_end" ? "bg-[#2a1a2f]" : "bg-[#2a1020]"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-[7px] text-white/60">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                      <span
                        className={`font-pixel text-[8px] ${item.type === "payment" ? "text-lime" : item.type === "month_end" ? "text-coin" : "text-p2"}`}
                      >
                        {item.type === "payment" ? "+" : "-"}P
                        {safeNum(item.amount)}
                      </span>
                    </div>
                    {item.note && (
                      <p className="mt-1 font-retro text-[9px] text-white/70">
                        {item.note}
                      </p>
                    )}
                    {item.pointsA !== undefined &&
                      item.pointsB !== undefined && (
                        <p className="mt-1 font-pixel text-[7px] text-white/40">
                          Scores: {myName} {safeNum(item.pointsA)} | {herName}{" "}
                          {safeNum(item.pointsB)}
                        </p>
                      )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📅 Month End Result Modal */}
      {showEndMonthModal && monthEndResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xs border-4 border-black bg-panel p-6 text-center shadow-[0_8px_0_0_#000]">
            <h3 className="font-pixel text-[11px] text-coin">
              MONTH END RESULTS
            </h3>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between font-pixel text-[8px] text-white/60">
                <span>{myName}</span>
                <span className="text-lime">
                  {safeNum(monthEndResult.pointsA)} pts
                </span>
              </div>
              <div className="flex justify-between font-pixel text-[8px] text-white/60">
                <span>{herName}</span>
                <span className="text-p2">
                  {safeNum(monthEndResult.pointsB)} pts
                </span>
              </div>
            </div>

            <div className="mt-6 border-4 border-black bg-[#1a0f2e] p-4">
              {monthEndResult.isTie ? (
                <>
                  <p className="text-3xl">🤝</p>
                  <p className="font-pixel text-[9px] text-lime mt-2">
                    IT'S A TIE!
                  </p>
                  <p className="font-pixel text-[7px] text-white/50">
                    Both pay P{safeNum(jarData.monthlyBet) * 2}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl">🏆</p>
                  <p className="font-pixel text-[9px] text-coin mt-2">
                    {monthEndResult.loserName} LOSES!
                  </p>
                  <p className="font-pixel text-[7px] text-white/50">
                    Owes P{safeNum(jarData.monthlyBet)} to jar
                  </p>
                </>
              )}
            </div>

            <button
              onClick={() => {
                setShowEndMonthModal(false);
                setMonthEndResult(null);
              }}
              className="mt-6 w-full border-4 border-black bg-lime py-3 font-pixel text-[10px] text-black shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none hover:brightness-110"
            >
              GOT IT!
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
