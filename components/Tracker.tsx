"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  HABITS,
  calcCoopStreak,
  calcStreak,
  doneCount,
  isPerfect,
  lastNDays,
  todayKey,
  type DayDoc,
  type HabitId,
} from "@/lib/habits";
import { Px, SPRITES, SPRITE_PALETTES } from "./sprites";

type Profile = { uid: string; email?: string };

const HABIT_SPRITE: Record<HabitId, keyof typeof SPRITES> = {
  code: "code",
  driving: "drive",
  exercise: "train",
};

export default function Tracker({
  uid,
  email,
  coupleId,
}: {
  uid: string;
  email: string | null;
  coupleId: string;
}) {
  const today = todayKey();
  const [myDay, setMyDay] = useState<DayDoc>({});
  const [myHist, setMyHist] = useState<Record<string, DayDoc>>({});
  const [couple, setCouple] = useState<{
    code: string;
    members: string[];
  } | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [partnerDay, setPartnerDay] = useState<DayDoc>({});
  const [partnerHist, setPartnerHist] = useState<Record<string, DayDoc>>({});

  // my team
  useEffect(() => {
    return onSnapshot(doc(db, "couples", coupleId), (s) => {
      setCouple((s.data() as { code: string; members: string[] }) ?? null);
    });
  }, [coupleId]);

  const partnerUid = couple?.members.find((m) => m !== uid) ?? null;

  // my player 2's profile
  useEffect(() => {
    if (!partnerUid) {
      setPartner(null);
      return;
    }
    return onSnapshot(doc(db, "users", partnerUid), (s) => {
      setPartner((s.data() as Profile) ?? null);
    });
  }, [partnerUid]);

  // my data
  useEffect(() => {
    const u1 = onSnapshot(doc(db, "completions", `${uid}_${today}`), (s) =>
      setMyDay((s.data() as DayDoc) ?? {}),
    );
    const u2 = onSnapshot(
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
    return () => {
      u1();
      u2();
    };
  }, [uid, today]);

  // partner data (live)
  useEffect(() => {
    if (!partnerUid) return;
    const u1 = onSnapshot(
      doc(db, "completions", `${partnerUid}_${today}`),
      (s) => setPartnerDay((s.data() as DayDoc) ?? {}),
    );
    const u2 = onSnapshot(
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
    return () => {
      u1();
      u2();
    };
  }, [partnerUid, today]);

  async function toggle(habitId: HabitId) {
    await setDoc(
      doc(db, "completions", `${uid}_${today}`),
      {
        userId: uid,
        date: today,
        [habitId]: !myDay[habitId],
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  const myStreak = useMemo(() => calcStreak(myHist), [myHist]);
  const herStreak = useMemo(() => calcStreak(partnerHist), [partnerHist]);
  const coopStreak = useMemo(
    () => calcCoopStreak(myHist, partnerHist),
    [myHist, partnerHist],
  );

  const week = lastNDays(7);
  const myCount = doneCount(myDay);
  const herCount = doneCount(partnerDay);
  const myName = (email ?? "P1").split("@")[0];
  const herName = partner ? (partner.email ?? "P2").split("@")[0] : null;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-night font-retro text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="pointer-events-none fixed inset-0 z-50 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.22)_0px,rgba(0,0,0,0.22)_1px,transparent_1px,transparent_3px)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />

      <div className="relative z-10 mx-auto w-full max-w-sm px-4 pb-12 pt-6">
        <header className="flex items-center justify-between">
          <h1 className="font-pixel text-base text-coin [text-shadow:0_0_12px_rgba(255,217,61,0.7)]">
            CDE QUEST
          </h1>
          <button
            onClick={() => signOut(auth)}
            className="border-2 border-white/30 px-2 py-1 font-pixel text-[8px] text-white/60 hover:text-white"
          >
            EXIT
          </button>
        </header>

        <section className="mt-6 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <PlayerCard
            name={myName}
            hex="#4de3ff"
            barClass="bg-p1 [box-shadow:0_0_8px_#4de3ff]"
            count={myCount}
            streak={myStreak}
          />
          <div className="animate-pulse self-center font-pixel text-xs text-p2 [text-shadow:0_0_12px_#ff5da2]">
            VS
          </div>
          <PlayerCard
            name={herName ?? "ADD P2"}
            hex="#ff5da2"
            barClass="bg-p2 [box-shadow:0_0_8px_#ff5da2]"
            count={herCount}
            streak={herStreak}
            waiting={!partnerUid}
          />
        </section>

        {/* share code while solo */}
        {couple && !partnerUid && (
          <div className="mt-3 border-4 border-black bg-panel p-3 text-center shadow-[0_4px_0_0_#000]">
            <p className="font-pixel text-[8px] text-white/60">
              SEND THIS CODE TO YOUR PLAYER 2:
            </p>
            <p className="mt-2 font-pixel text-lg tracking-widest text-coin [text-shadow:0_0_12px_rgba(255,217,61,0.8)]">
              {couple.code}
            </p>
          </div>
        )}

        <div
          className={`mt-3 flex items-center justify-center gap-2 border-4 border-black bg-panel p-3 shadow-[0_4px_0_0_#000] ${
            coopStreak > 0 ? "[box-shadow:0_0_18px_rgba(255,93,162,0.35)]" : ""
          }`}
        >
          <Px
            rows={SPRITES.heart}
            palette={{ P: "#ff5da2" }}
            className="h-4 w-4"
            glow="#ff5da2"
          />
          <span className="font-pixel text-[9px] text-p2 [text-shadow:0_0_8px_rgba(255,93,162,0.8)]">
            CO-OP STREAK: {coopStreak}
          </span>
          <Px
            rows={SPRITES.heart}
            palette={{ P: "#ff5da2" }}
            className="h-4 w-4"
            glow="#ff5da2"
          />
        </div>

        <h2 className="mt-8 font-pixel text-[10px] text-lime [text-shadow:0_0_8px_rgba(141,255,91,0.6)]">
          ► TODAY'S QUESTS
        </h2>
        <div className="mt-3 space-y-3">
          {HABITS.map((h) => {
            const done = !!myDay[h.id];
            const sprite = SPRITES[HABIT_SPRITE[h.id]];
            return (
              <button
                key={h.id}
                onClick={() => toggle(h.id)}
                className={`w-full border-4 border-black p-3 text-left shadow-[0_4px_0_0_#000] transition active:translate-y-1 active:shadow-none ${
                  done
                    ? "bg-lime text-black [box-shadow:0_0_18px_rgba(141,255,91,0.45)]"
                    : "bg-panel hover:bg-[#2f1c42]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <Px
                      rows={sprite}
                      palette={SPRITE_PALETTES[HABIT_SPRITE[h.id]]}
                      className="h-7 w-7"
                    />
                    <span className="font-pixel text-[10px]">{h.name}</span>
                  </span>
                  <span
                    className={`font-pixel text-[10px] ${done ? "text-black" : "text-white/50"}`}
                  >
                    {done ? "[✓]" : "[ ]"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {isPerfect(myDay) && (
          <p className="mt-5 animate-pulse text-center font-pixel text-[10px] text-coin [text-shadow:0_0_10px_rgba(255,217,61,0.8)]">
            ★ PERFECT DAY! +1 STREAK ★
          </p>
        )}

        <h2 className="mt-8 font-pixel text-[10px] text-white/70">
          ► LAST 7 DAYS
        </h2>
        <div className="mt-3 space-y-1 border-4 border-black bg-panel p-3 shadow-[0_4px_0_0_#000]">
          <WeekRow
            label={myName}
            barClass="bg-p1 [box-shadow:0_0_6px_#4de3ff]"
            week={week}
            hist={myHist}
          />
          <WeekRow
            label={herName ?? "P2"}
            barClass="bg-p2 [box-shadow:0_0_6px_#ff5da2]"
            week={week}
            hist={partnerHist}
          />
        </div>
        <p className="mt-2 text-center text-xl text-white/50">
          bright = perfect · dim = partial
        </p>

        <p className="mt-8 text-center font-pixel text-[8px] leading-relaxed text-white/40">
          MADE WITH <span className="text-p2">♥</span> FOR US
          <br />
          SEASON 1 · INSERT LOVE TO CONTINUE
        </p>
      </div>
    </main>
  );
}

function PlayerCard({
  name,
  hex,
  barClass,
  count,
  streak,
  waiting,
}: {
  name: string;
  hex: string;
  barClass: string;
  count: number;
  streak: number;
  waiting?: boolean;
}) {
  return (
    <div className="border-4 border-black bg-panel p-3 shadow-[0_4px_0_0_#000]">
      <div className="flex items-center gap-2">
        <Px
          rows={SPRITES.heart}
          palette={{ P: hex }}
          className="h-5 w-5 shrink-0"
          glow={hex}
        />
        <p
          className="truncate font-pixel text-[9px]"
          style={{ color: hex, textShadow: `0 0 8px ${hex}` }}
        >
          {waiting ? "ADD P2" : name}
        </p>
      </div>

      <div className="mt-2 flex items-center gap-1">
        <span className="font-pixel text-[7px] text-white/50">HP</span>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-3 flex-1 border-2 border-black transition ${
              i < count ? barClass : "bg-black/40"
            }`}
          />
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Px
            rows={SPRITES.flame}
            palette={SPRITE_PALETTES.flame}
            className="h-4 w-4"
          />
          <span className="font-pixel text-[8px] text-coin">{streak}</span>
        </span>
        <span className="font-pixel text-[8px] text-white/50">
          {count * 100} PTS
        </span>
      </div>
    </div>
  );
}

function WeekRow({
  label,
  barClass,
  week,
  hist,
}: {
  label: string;
  barClass: string;
  week: string[];
  hist: Record<string, DayDoc>;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 truncate font-pixel text-[8px] text-white/60">
        {label}
      </span>
      <div className="flex flex-1 gap-1">
        {week.map((d) => {
          const c = doneCount(hist[d]);
          return (
            <div
              key={d}
              className={`h-4 flex-1 border-2 border-black ${
                c === 3 ? barClass : c > 0 ? "bg-white/40" : "bg-black/40"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
