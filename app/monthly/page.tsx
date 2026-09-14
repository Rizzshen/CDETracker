"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import {
  DEFAULT_HABITS,
  doneCount,
  type DayDoc,
  type Habit,
} from "@/lib/habits";
import { colorHex } from "@/lib/colors";
type Profile = {
  uid: string;
  email?: string;
  color?: string;
};

export default function MonthlyPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [partnerUid, setPartnerUid] = useState<string | null>(null);
  const [myHist, setMyHist] = useState<Record<string, DayDoc>>({});
  const [partnerHist, setPartnerHist] = useState<Record<string, DayDoc>>({});
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const storedUid = localStorage.getItem("uid");
    const storedCoupleId = localStorage.getItem("coupleId");
    setUid(storedUid);
    setCoupleId(storedCoupleId);
  }, []);

  useEffect(() => {
    if (!coupleId) return;
    return onSnapshot(doc(db, "couples", coupleId), (s) => {
      const data = s.data() as { members: string[] } | undefined;
      if (data && uid) {
        const pUid = data.members.find((m) => m !== uid) ?? null;
        setPartnerUid(pUid);
      }
    });
  }, [coupleId, uid]);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, "users", uid), (s) => {
      setMyProfile((s.data() as Profile) ?? null);
    });
  }, [uid]);

  useEffect(() => {
    if (!partnerUid) return;
    return onSnapshot(doc(db, "users", partnerUid), (s) => {
      setPartnerProfile((s.data() as Profile) ?? null);
    });
  }, [partnerUid]);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "completions"), where("userId", "==", uid)),
      (snap) => {
        const map: Record<string, DayDoc> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as DayDoc;
          if (data.date) map[data.date] = data;
        });
        setMyHist(map);
      },
    );
  }, [uid]);

  useEffect(() => {
    if (!partnerUid) return;
    return onSnapshot(
      query(collection(db, "completions"), where("userId", "==", partnerUid)),
      (snap) => {
        const map: Record<string, DayDoc> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as DayDoc;
          if (data.date) map[data.date] = data;
        });
        setPartnerHist(map);
      },
    );
  }, [partnerUid]);

  // Calculate current month dates
  const currentMonthDates = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const dates: string[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${dd}`);
    }
    return dates;
  }, []);

  const myMonthlyPoints = useMemo(() => {
    return currentMonthDates.reduce((total, date) => {
      return total + doneCount(myHist[date], DEFAULT_HABITS) * 100;
    }, 0);
  }, [myHist, currentMonthDates]);

  const partnerMonthlyPoints = useMemo(() => {
    return currentMonthDates.reduce((total, date) => {
      return total + doneCount(partnerHist[date], DEFAULT_HABITS) * 100;
    }, 0);
  }, [partnerHist, currentMonthDates]);

  const myName = (myProfile?.email ?? "P1").split("@")[0];
  const partnerName = partnerProfile
    ? (partnerProfile.email ?? "P2").split("@")[0]
    : "P2";
  const myHex = colorHex(myProfile?.color, "#4de3ff");
  const partnerHex = colorHex(partnerProfile?.color, "#ff5da2");

  const currentMonthLabel = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

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
        <h1 className="font-pixel text-base text-coin [text-shadow:0_0_12px_rgba(255,217,61,0.7)]">
          📅 MONTHLY TRACK
        </h1>
        <div className="w-16" />
      </div>

      {/* Month Label */}
      <div className="mx-auto mt-6 max-w-sm text-center">
        <p className="font-pixel text-[9px] text-white/60">
          {currentMonthLabel}
        </p>
      </div>

      {/* Score Cards */}
      <div className="mx-auto mt-4 max-w-sm grid grid-cols-2 gap-3">
        <div className="border-4 border-black bg-panel p-3 shadow-[0_4px_0_0_#000]">
          <p className="font-pixel text-[8px] text-white/60">{myName}</p>
          <p className="mt-2 font-pixel text-[12px] text-coin [text-shadow:0_0_8px_rgba(255,217,61,0.6)]">
            {myMonthlyPoints} PTS
          </p>
        </div>
        <div className="border-4 border-black bg-panel p-3 shadow-[0_4px_0_0_#000]">
          <p className="font-pixel text-[8px] text-white/60">{partnerName}</p>
          <p className="mt-2 font-pixel text-[12px] text-coin [text-shadow:0_0_8px_rgba(255,217,61,0.6)]">
            {partnerMonthlyPoints} PTS
          </p>
        </div>
      </div>

      {/* Leader Indicator */}
      <div className="mx-auto mt-3 max-w-sm text-center">
        {myMonthlyPoints > partnerMonthlyPoints ? (
          <p className="font-pixel text-[8px] text-lime">⚡ YOU'RE LEADING</p>
        ) : partnerMonthlyPoints > myMonthlyPoints ? (
          <p className="font-pixel text-[8px] text-p2">
            ⚡ {partnerName} IS LEADING
          </p>
        ) : (
          <p className="font-pixel text-[8px] text-coin">🤝 IT'S A TIE</p>
        )}
      </div>

      {/* Calendar Grid */}
      {/* Calendar Grid */}
      <div className="mx-auto mt-6 max-w-2xl border-4 border-black bg-panel p-6 shadow-[0_4px_0_0_#000]">
        <h3 className="font-pixel text-[10px] text-white/70 text-center mb-6">
          COMPLETION CALENDAR
        </h3>

        <div className="space-y-4">
          {/* My Row */}
          <div className="flex items-center gap-3">
            <span className="w-24 font-pixel text-[8px] text-white/60 truncate">
              {myName}
            </span>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {currentMonthDates.map((d) => {
                const c = doneCount(myHist[d], DEFAULT_HABITS);
                return (
                  <div
                    key={d}
                    className="h-5 w-5 border-2 border-black transition-all"
                    style={
                      c === 3
                        ? {
                            backgroundColor: myHex,
                            boxShadow: `0 0 6px ${myHex}`,
                          }
                        : c === 2
                          ? { backgroundColor: myHex, opacity: 0.7 }
                          : c === 1
                            ? { backgroundColor: myHex, opacity: 0.35 }
                            : { backgroundColor: "rgba(0,0,0,0.5)" }
                    }
                    title={`${c}/3 tasks on ${d}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Partner Row */}
          <div className="flex items-center gap-3">
            <span className="w-24 font-pixel text-[8px] text-white/60 truncate">
              {partnerName}
            </span>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {currentMonthDates.map((d) => {
                const c = doneCount(partnerHist[d], DEFAULT_HABITS);
                return (
                  <div
                    key={d}
                    className="h-5 w-5 border-2 border-black transition-all"
                    style={
                      c === 3
                        ? {
                            backgroundColor: partnerHex,
                            boxShadow: `0 0 6px ${partnerHex}`,
                          }
                        : c === 2
                          ? { backgroundColor: partnerHex, opacity: 0.7 }
                          : c === 1
                            ? { backgroundColor: partnerHex, opacity: 0.35 }
                            : { backgroundColor: "rgba(0,0,0,0.5)" }
                    }
                    title={`${c}/3 tasks on ${d}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center font-pixel text-[7px] text-white/50">
          bright = 3/3 · medium = 2/3 · dim = 1/3 · dark = 0
        </p>
      </div>
    </main>
  );
}
