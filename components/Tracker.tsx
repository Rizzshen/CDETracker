"use client";
import { HamburgerMenu } from "@/components/HamburgerMenu";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  deleteField,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  DEFAULT_HABITS,
  calcCoopStreak,
  calcStreak,
  calcWeeklyPoints,
  doneCount,
  getCurrentWeekDates,
  getPreviousWeekDates,
  isPerfect,
  todayKey,
  type DayDoc,
  type Habit,
} from "@/lib/habits";
import { colorHex } from "@/lib/colors";
import { getNews } from "@/lib/roasts";
import { playPerfectDayChime } from "@/lib/sound";
import { Px, SPRITES, SPRITE_PALETTES, SPRITE_OPTIONS } from "./sprites";

type Profile = {
  uid: string;
  email?: string;
  habits?: Habit[];
  color?: string;
};
type Couple = { code: string; members: string[] };

function sanitizeHabits(raw: any): Habit[] {
  return DEFAULT_HABITS.map((d, i) => {
    const h = raw?.[i];
    return h?.id
      ? {
          id: d.id,
          name: String(h.name || d.name).slice(0, 10),
          sprite: String(h.sprite || d.sprite),
        }
      : d;
  });
}

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
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [myDay, setMyDay] = useState<DayDoc>({});
  const [myHist, setMyHist] = useState<Record<string, DayDoc>>({});
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [partnerDay, setPartnerDay] = useState<DayDoc>({});
  const [partnerHist, setPartnerHist] = useState<Record<string, DayDoc>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Habit[]>(DEFAULT_HABITS);
  const [peek, setPeek] = useState(false);
  const [deny, setDeny] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const denyTimer = useRef<number | null>(null);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [pokeMessage, setPokeMessage] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(doc(db, "users", uid), (s) => {
      const data =
        (s.data() as Profile & { pokedBy?: string; pokeTime?: any }) ?? null;
      setMyProfile(data);

      // 🆕 Detect incoming poke on MY profile
      if (data?.pokedBy && data?.pokeTime) {
        setPokeMessage(`${data.pokedBy} poked you! 🥊`);

        // Clear the poke from the database immediately so it doesn't trigger again
        setDoc(
          doc(db, "users", uid),
          { pokedBy: deleteField(), pokeTime: deleteField() },
          { merge: true },
        );

        // Auto-dismiss the message after 4 seconds
        setTimeout(() => setPokeMessage(null), 4000);
      }
    });
  }, [uid]);

  useEffect(() => {
    return onSnapshot(doc(db, "couples", coupleId), (s) => {
      setCouple((s.data() as Couple) ?? null);
    });
  }, [coupleId]);

  const partnerUid = couple?.members.find((m) => m !== uid) ?? null;

  useEffect(() => {
    if (!partnerUid) {
      setPartner(null);
      setPeek(false);
      return;
    }
    return onSnapshot(doc(db, "users", partnerUid), (s) => {
      setPartner((s.data() as Profile) ?? null); // Keep it simple, no poke logic here
    });
  }, [partnerUid]);

  const myHabits = useMemo(
    () => sanitizeHabits(myProfile?.habits),
    [myProfile],
  );
  const herHabits = useMemo(() => sanitizeHabits(partner?.habits), [partner]);

  const myPerfectToday = isPerfect(myDay, myHabits);
  const wasPerfectRef = useRef(myPerfectToday);

  useEffect(() => {
    if (myPerfectToday && !wasPerfectRef.current) {
      playPerfectDayChime();
    }
    wasPerfectRef.current = myPerfectToday;
  }, [myPerfectToday]);

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

  async function toggle(habitId: string) {
    const isCheckingOn = !myDay[habitId];

    await setDoc(
      doc(db, "completions", `${uid}_${today}`),
      {
        userId: uid,
        date: today,
        [habitId]: isCheckingOn,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    // 🆕 If we just checked a box ON, and it makes the day perfect, show the modal
    if (isCheckingOn) {
      const newDayData = { ...myDay, [habitId]: true };
      if (doneCount(newDayData, myHabits) === myHabits.length) {
        setShowFinishModal(true);
      }
    }
  }
  async function pokePartner() {
    if (!partnerUid) return;

    // Update partner's user doc with the poke data
    await setDoc(
      doc(db, "users", partnerUid),
      {
        pokedBy: myName,
        pokeTime: serverTimestamp(),
      },
      { merge: true },
    );

    setShowFinishModal(false);
  }

  function openEditor() {
    setDraft(myHabits.map((h) => ({ ...h })));
    setEditing(true);
  }

  async function saveEditor() {
    await setDoc(doc(db, "users", uid), { habits: draft }, { merge: true });
    setEditing(false);
  }

  function denyClick() {
    setDeny(true);
    if (denyTimer.current) window.clearTimeout(denyTimer.current);
    denyTimer.current = window.setTimeout(() => setDeny(false), 1500);
  }

  const myStreak = useMemo(
    () => calcStreak(myHist, myHabits),
    [myHist, myHabits],
  );
  const herStreak = useMemo(
    () => calcStreak(partnerHist, herHabits),
    [partnerHist, herHabits],
  );
  const coopStreak = useMemo(
    () => calcCoopStreak(myHist, partnerHist, myHabits, herHabits),
    [myHist, partnerHist, myHabits, herHabits],
  );

  // 🆕 Weekly Logic
  const currentWeek = useMemo(() => getCurrentWeekDates(), []);
  const previousWeek = useMemo(() => getPreviousWeekDates(), []);

  const myCurrPoints = useMemo(
    () => calcWeeklyPoints(myHist, myHabits, currentWeek),
    [myHist, myHabits, currentWeek],
  );
  const herCurrPoints = useMemo(
    () => calcWeeklyPoints(partnerHist, herHabits, currentWeek),
    [partnerHist, herHabits, currentWeek],
  );

  const myPrevPoints = useMemo(
    () => calcWeeklyPoints(myHist, myHabits, previousWeek),
    [myHist, myHabits, previousWeek],
  );
  const herPrevPoints = useMemo(
    () => calcWeeklyPoints(partnerHist, herHabits, previousWeek),
    [partnerHist, herHabits, previousWeek],
  );

  // Determine previous week winner (gets trophy all week)
  const prevWinner =
    myPrevPoints > herPrevPoints
      ? "me"
      : herPrevPoints > myPrevPoints
        ? "her"
        : myPrevPoints > 0
          ? "tie"
          : "none";

  // Determine current week leader
  const currLeader =
    myCurrPoints > herCurrPoints
      ? "me"
      : herCurrPoints > myCurrPoints
        ? "her"
        : "tie";

  const week = currentWeek; // Keep variable name for WeekRow compatibility
  const myCount = doneCount(myDay, myHabits);
  const herCount = doneCount(partnerDay, herHabits);
  const myName = (email ?? "P1").split("@")[0];
  const herName = partner ? (partner.email ?? "P2").split("@")[0] : null;
  const myHex = colorHex(myProfile?.color, "#4de3ff");
  const herHex = colorHex(partner?.color, "#ff5da2");

  const myNews = useMemo(
    () => getNews(myHist, myHabits, "me"),
    [myHist, myHabits],
  );
  const herNews = useMemo(
    () => getNews(partnerHist, herHabits, "them"),
    [partnerHist, herHabits],
  );

  return (
    <main
      className={`relative min-h-dvh overflow-hidden bg-night font-retro text-white ${pokeMessage ? "animate-shake" : ""}`}
    >
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="pointer-events-none fixed inset-0 z-50 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.22)_0px,rgba(0,0,0,0.22)_1px,transparent_1px,transparent_3px)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />

      <div className="relative z-10 mx-auto w-full max-w-sm px-4 pb-12 pt-6">
        <header className="flex items-center justify-between">
          {/* 🍔 Hamburger Button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="border-2 border-white/30 px-2 py-1 font-pixel text-[8px] text-white/60 hover:text-white hover:border-lime"
          >
            ☰ MENU
          </button>

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
            hex={myHex}
            count={myCount}
            streak={myStreak}
            weeklyPoints={myCurrPoints}
            isPrevWinner={prevWinner === "me" || prevWinner === "tie"}
            isCurrLeader={currLeader === "me"}
            news={myNews}
          />
          <div
            className="animate-pulse self-center font-pixel text-xs"
            style={{ color: herHex, textShadow: `0 0 12px ${herHex}` }}
          >
            VS
          </div>
          <PlayerCard
            name={herName ?? "ADD P2"}
            hex={herHex}
            count={herCount}
            streak={herStreak}
            weeklyPoints={herCurrPoints}
            isPrevWinner={prevWinner === "her" || prevWinner === "tie"}
            isCurrLeader={currLeader === "her"}
            waiting={!partnerUid}
            peekOpen={peek}
            onPeek={() => setPeek((p) => !p)}
            news={partner ? herNews : undefined}
          />
        </section>

        {/* ... [Keep the peek, couple code, co-op streak, and overnight news sections exactly as they were] ... */}
        {peek && partner && (
          <div
            className="mt-3 border-4 border-black bg-panel p-3 shadow-[0_4px_0_0_#000]"
            style={{ boxShadow: `0 0 18px ${herHex}40` }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="font-pixel text-[9px]"
                style={{ color: herHex, textShadow: `0 0 8px ${herHex}` }}
              >
                ► {herName}'S QUESTS
              </h3>
              <button
                onClick={() => setPeek(false)}
                className="font-pixel text-[8px] text-white/50 hover:text-white"
              >
                [X]
              </button>
              {partner && herNews.funeral && (
                <p className="mt-3 text-center font-pixel text-[8px] text-p2 animate-pulse">
                  💀 SHE LOST A {herNews.funeral.length} DAY STREAK
                </p>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {herHabits.map((h) => {
                const done = !!partnerDay[h.id];
                return (
                  <button
                    key={h.id}
                    onClick={denyClick}
                    className={`w-full border-4 border-black p-3 text-left shadow-[0_3px_0_0_#000] transition active:translate-y-1 active:shadow-none ${done ? "bg-[#3a1020]" : "bg-night"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-3">
                        <Px
                          rows={SPRITES[h.sprite] ?? SPRITES.code}
                          palette={
                            SPRITE_PALETTES[h.sprite] ?? SPRITE_PALETTES.code
                          }
                          className="h-6 w-6"
                        />
                        <span className="font-pixel text-[9px]">{h.name}</span>
                      </span>
                      <span
                        className="font-pixel text-[10px]"
                        style={{
                          color: done ? herHex : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {done ? "[✓]" : "[ ]"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p
              className={`mt-3 text-center font-pixel text-[8px] transition-opacity ${deny ? "opacity-100" : "opacity-0"}`}
              style={{ color: herHex }}
            >
              YOU CAN'T CHECK {herName?.toUpperCase()}'S QUESTS ♥
            </p>
          </div>
        )}

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
          className={`mt-3 flex items-center justify-center gap-2 border-4 border-black bg-panel p-3 shadow-[0_4px_0_0_#000] ${coopStreak > 0 ? "[box-shadow:0_0_18px_rgba(255,93,162,0.35)]" : ""}`}
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

        {(myNews.missed || (partner && herNews.missed)) && (
          <div className="mt-6 space-y-2">
            <h2 className="font-pixel text-[10px] text-coin [text-shadow:0_0_8px_rgba(255,217,61,0.6)]">
              ► OVERNIGHT NEWS
            </h2>
            {myNews.missed && (
              <NewsCard
                title="YOU SKIPPED YESTERDAY"
                roast={myNews.roast}
                funeral={myNews.funeral}
              />
            )}
            {partner && herNews.missed && (
              <NewsCard
                title={`${(herName ?? "P2").toUpperCase()} SKIPPED YESTERDAY`}
                roast={herNews.roast}
                funeral={herNews.funeral}
              />
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-pixel text-[10px] text-lime [text-shadow:0_0_8px_rgba(141,255,91,0.6)]">
            ► MY QUESTS
          </h2>
          {!editing && (
            <button
              onClick={openEditor}
              className="border-2 border-white/30 px-2 py-1 font-pixel text-[8px] text-white/60 hover:text-white"
            >
              EDIT
            </button>
          )}
        </div>

        {editing ? (
          <div className="mt-3 space-y-4 border-4 border-black bg-panel p-4 shadow-[0_4px_0_0_#000]">
            <p className="text-center font-pixel text-[8px] text-white/50">
              ONLY YOUR QUESTS CHANGE · HERS STAY HERS
            </p>
            {draft.map((h, i) => (
              <div key={h.id} className="space-y-2">
                <input
                  value={h.name}
                  maxLength={10}
                  onChange={(e) =>
                    setDraft((d) =>
                      d.map((x, j) =>
                        j === i
                          ? { ...x, name: e.target.value.toUpperCase() }
                          : x,
                      ),
                    )
                  }
                  className="w-full border-4 border-black bg-night px-3 py-2 font-pixel text-[9px] text-white outline-none focus:[box-shadow:0_0_0_2px_#8dff5b]"
                />
                <div className="flex flex-wrap gap-2">
                  {SPRITE_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setDraft((d) =>
                          d.map((x, j) => (j === i ? { ...x, sprite: s } : x)),
                        )
                      }
                      className={`border-2 bg-night p-1 ${h.sprite === s ? "border-lime [box-shadow:0_0_8px_rgba(141,255,91,0.6)]" : "border-black"}`}
                    >
                      <Px
                        rows={SPRITES[s]}
                        palette={SPRITE_PALETTES[s]}
                        className="h-5 w-5"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={saveEditor}
                className="border-4 border-black bg-lime py-3 font-pixel text-[9px] text-black shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none"
              >
                SAVE
              </button>
              <button
                onClick={() => setEditing(false)}
                className="border-4 border-black bg-night py-3 font-pixel text-[9px] text-white/60 shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none"
              >
                CANCEL
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {myHabits.map((h) => {
              const done = !!myDay[h.id];
              return (
                <button
                  key={h.id}
                  onClick={() => toggle(h.id)}
                  className={`w-full border-4 border-black p-3 text-left shadow-[0_4px_0_0_#000] transition active:translate-y-1 active:shadow-none ${done ? "bg-lime text-black [box-shadow:0_0_18px_rgba(141,255,91,0.45)]" : "bg-panel hover:bg-[#2f1c42]"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-3">
                      <Px
                        rows={SPRITES[h.sprite] ?? SPRITES.code}
                        palette={
                          SPRITE_PALETTES[h.sprite] ?? SPRITE_PALETTES.code
                        }
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
        )}

        {myPerfectToday && (
          <p className="mt-5 animate-pulse text-center font-pixel text-[10px] text-coin [text-shadow:0_0_10px_rgba(255,217,61,0.8)]">
            ★ PERFECT DAY! +100 PTS ★
          </p>
        )}

        {/* 🆕 UPDATED WEEKLY VIEW */}
        <h2 className="mt-8 font-pixel text-[10px] text-white/70">
          ► THIS WEEK (SUN - SAT)
        </h2>
        <div className="mt-3 space-y-3 border-4 border-black bg-panel p-3 shadow-[0_4px_0_0_#000]">
          <WeekRow
            label={myName}
            hex={myHex}
            week={week}
            hist={myHist}
            habits={myHabits}
          />
          <WeekRow
            label={herName ?? "P2"}
            hex={herHex}
            week={week}
            hist={partnerHist}
            habits={herHabits}
          />
        </div>
        <p className="mt-2 text-center font-pixel text-[7px] text-white/40">
          bright = perfect (3/3) · medium = partial (2/3) · dim = started (1/3)
        </p>

        <p className="mt-8 text-center font-pixel text-[8px] leading-relaxed text-white/40">
          MADE WITH <span className="text-p2">♥</span> FOR US
          <br />
          Bibuji♥
        </p>
      </div>
      {/* 🍔 Hamburger Menu */}
      <HamburgerMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        myName={myName}
        herName={herName}
        myPrevPoints={myPrevPoints}
        herPrevPoints={herPrevPoints}
      />
      {/* 🥊 "All Quests Done" Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xs border-4 border-black bg-panel p-6 text-center shadow-[0_8px_0_0_#000] animate-pop-in">
            <h2 className="font-pixel text-[12px] text-lime [text-shadow:0_0_8px_rgba(141,255,91,0.6)]">
              QUESTS COMPLETE!
            </h2>
            <p className="mt-3 font-retro text-sm text-white/80">
              You crushed it today. Want to show off?
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={pokePartner}
                className="border-4 border-black bg-p2 py-3 font-pixel text-[10px] text-white shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none hover:brightness-110"
              >
                POKE!
              </button>
              <button
                onClick={() => setShowFinishModal(false)}
                className="border-4 border-black bg-night py-3 font-pixel text-[10px] text-white/60 shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none"
              >
                NAH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💥 Incoming Poke Message */}
      {pokeMessage && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
          <div className="border-4 border-black bg-[#2a1020] p-4 shadow-[0_8px_0_0_#000] animate-pop-in">
            <p className="font-pixel text-[12px] text-coin [text-shadow:0_0_8px_rgba(255,217,61,0.8)]">
              {pokeMessage}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

// 🆕 Updated PlayerCard with Trophy and Leader indicators
// 🆕 Updated PlayerCard with Trophy and Leader indicators
function PlayerCard({
  name,
  hex,
  count,
  streak,
  weeklyPoints,
  isPrevWinner,
  isCurrLeader,
  waiting,
  peekOpen,
  onPeek,
  news,
}: {
  name: string;
  hex: string;
  count: number;
  streak: number;
  weeklyPoints: number;
  isPrevWinner: boolean;
  isCurrLeader: boolean;
  waiting?: boolean;
  peekOpen?: boolean;
  onPeek?: () => void;
  news?: any;
}) {
  return (
    <div className="relative border-4 border-black bg-panel p-3 shadow-[0_4px_0_0_#000]">
      {/* Trophy Badge for Previous Week Winner */}
      {isPrevWinner && (
        <div
          className="absolute -top-3 -right-3 animate-bounce font-pixel text-xl [text-shadow:0_0_8px_rgba(255,217,61,0.8)]"
          title="Last Week's Champion"
        >
          🏆
        </div>
      )}

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
            className="h-3 flex-1 border-2 border-black transition"
            style={
              i < count
                ? { backgroundColor: hex, boxShadow: `0 0 8px ${hex}` }
                : { backgroundColor: "rgba(0,0,0,0.4)" }
            }
          />
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1">
          {news?.funeral ? (
            <>
              <Px
                rows={SPRITES.grave}
                palette={SPRITE_PALETTES.grave}
                className="h-4 w-4"
              />
              <span className="font-pixel text-[8px] text-white/50 line-through">
                {streak}
              </span>
            </>
          ) : (
            <>
              <Px
                rows={SPRITES.flame}
                palette={SPRITE_PALETTES.flame}
                className="h-4 w-4"
              />
              <span className="font-pixel text-[8px] text-coin">{streak}</span>
            </>
          )}
        </span>
        <div className="flex flex-col items-end">
          <span className="font-pixel text-[8px] text-coin">
            {weeklyPoints} PTS
          </span>
          {isCurrLeader && !waiting && (
            <span className="font-pixel text-[6px] text-lime animate-pulse">
              ⚡ LEADING
            </span>
          )}
        </div>
      </div>

      {onPeek && !waiting && (
        <button
          onClick={onPeek}
          className="mt-2 w-full border-2 border-black bg-night py-1.5 font-pixel text-[7px] transition active:translate-y-0.5"
          style={{ color: hex }}
        >
          {peekOpen ? "HIDE QUESTS" : "VIEW QUESTS"}
        </button>
      )}
    </div>
  );
}

function NewsCard({
  title,
  roast,
  funeral,
}: {
  title: string;
  roast: string;
  funeral: { length: number; cause: string } | null;
}) {
  return (
    <div className="border-4 border-black bg-[#2a1020] p-3 shadow-[0_4px_0_0_#000]">
      <div className="flex items-center gap-3">
        <Px
          rows={SPRITES.grave}
          palette={SPRITE_PALETTES.grave}
          className="h-8 w-8 shrink-0"
        />
        <div className="min-w-0">
          <p className="font-pixel text-[8px] text-coin">{title}</p>
          <p className="mt-1 font-retro text-lg leading-none text-white/70">
            {roast}
          </p>
          {funeral && (
            <p className="mt-2 font-pixel text-[8px] leading-relaxed text-white/50">
              HERE LIES A {funeral.length} DAY STREAK
              <br />
              CAUSE: {funeral.cause}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function WeekRow({
  label,
  hex,
  week,
  hist,
  habits,
}: {
  label: string;
  hex: string;
  week: string[];
  hist: Record<string, DayDoc>;
  habits: Habit[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 truncate font-pixel text-[8px] text-white/60">
        {label}
      </span>
      <div className="flex flex-1 gap-1">
        {week.map((d) => {
          const c = doneCount(hist[d], habits);

          // Calculate fill width (33% for 1/3, 66% for 2/3, 100% for 3/3)
          // If you prefer your exact 25/60/100 request, change these to "25%", "60%", "100%"
          let width = "0%";
          if (c === 1) width = "33%";
          if (c === 2) width = "66%";
          if (c === 3) width = "100%";

          return (
            <div
              key={d}
              className="relative h-4 flex-1 border-2 border-black bg-[rgba(0,0,0,0.4)] overflow-hidden"
              title={`${c}/3 tasks completed`}
            >
              {/* The colored fill bar */}
              <div
                className="absolute left-0 top-0 h-full transition-all duration-300"
                style={{
                  width: width,
                  backgroundColor: hex,
                  // Only add the glow when it's 100% full (perfect day)
                  boxShadow: c === 3 ? `0 0 6px ${hex}` : "none",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
