"use client";

import { useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLOR_OPTIONS } from "@/lib/colors";
import { Px, SPRITES } from "./sprites";

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function TeamGate({ uid }: { uid: string }) {
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [color, setColor] = useState("cyan");

  async function startTeam() {
    setBusy(true);
    setError(null);
    try {
      const ref = doc(collection(db, "couples"));
      await setDoc(ref, {
        code: makeCode(),
        members: [uid],
        createdAt: serverTimestamp(),
      });
      await setDoc(
        doc(db, "users", uid),
        { coupleId: ref.id, color },
        { merge: true },
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function joinTeam() {
    setBusy(true);
    setError(null);
    try {
      const snap = await getDocs(
        query(
          collection(db, "couples"),
          where("code", "==", codeInput.trim().toUpperCase()),
        ),
      );
      if (snap.empty) {
        setError("TEAM NOT FOUND");
        return;
      }
      const coupleDoc = snap.docs[0];
      const members: string[] = coupleDoc.data().members ?? [];
      if (members.includes(uid)) {
        await setDoc(
          doc(db, "users", uid),
          { coupleId: coupleDoc.id, color },
          { merge: true },
        );
        return;
      }
      if (members.length >= 2) {
        setError("TEAM FULL ♥");
        return;
      }
      await setDoc(
        doc(db, "couples", coupleDoc.id),
        { members: [...members, uid] },
        { merge: true },
      );
      await setDoc(
        doc(db, "users", uid),
        { coupleId: coupleDoc.id, color },
        { merge: true },
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-night font-retro text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="pointer-events-none fixed inset-0 z-50 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.22)_0px,rgba(0,0,0,0.22)_1px,transparent_1px,transparent_3px)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4">
        <div className="flex justify-center gap-3">
          <Px
            rows={SPRITES.heart}
            palette={{ P: "#4de3ff" }}
            className="h-6 w-6"
            glow="#4de3ff"
          />
          <Px
            rows={SPRITES.heart}
            palette={{ P: "#ff5da2" }}
            className="h-6 w-6"
            glow="#ff5da2"
          />
        </div>
        <h1 className="mt-4 text-center font-pixel text-lg text-coin [text-shadow:0_0_12px_rgba(255,217,61,0.7)]">
          EVERY QUEST NEEDS A DUO
        </h1>

        {/* character creation */}
        <div className="mt-6 border-4 border-black bg-panel p-4 shadow-[0_4px_0_0_#000]">
          <p className="text-center font-pixel text-[8px] text-white/60">
            PICK YOUR PLAYER COLOR
          </p>
          <div className="mt-3 flex justify-center gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                aria-label={c.name}
                className={`h-8 w-8 border-2 border-black transition ${
                  color === c.id ? "scale-110" : "opacity-60 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: c.hex,
                  boxShadow: color === c.id ? `0 0 10px ${c.hex}` : undefined,
                }}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-4 border-4 border-black bg-panel p-5 shadow-[0_6px_0_0_#000]">
          <button
            onClick={startTeam}
            disabled={busy}
            className="w-full border-4 border-black bg-coin py-4 font-pixel text-[10px] text-black shadow-[0_5px_0_0_#000] transition active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            ♥ START OUR TEAM
          </button>

          <p className="text-center font-pixel text-[8px] text-white/40">
            — OR —
          </p>

          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="TEAM CODE"
            maxLength={4}
            className="w-full border-4 border-black bg-night px-4 py-3 text-center font-pixel text-sm uppercase tracking-widest text-white outline-none placeholder:text-white/25 focus:[box-shadow:0_0_0_2px_#ff5da2,0_0_12px_rgba(255,93,162,0.5)]"
          />
          <button
            onClick={joinTeam}
            disabled={busy || codeInput.trim().length < 4}
            className="w-full border-4 border-black bg-lime py-4 font-pixel text-[10px] text-black shadow-[0_5px_0_0_#000] transition active:translate-y-1 active:shadow-none disabled:opacity-40"
          >
            JOIN MY DUO
          </button>

          {error && (
            <p className="border-4 border-black bg-[#3a1020] px-4 py-2 text-center font-retro text-lg leading-none text-p2">
              {error}
            </p>
          )}
        </div>

        <p className="mt-8 animate-pulse text-center font-pixel text-[8px] text-white/40">
          2 PLAYERS MAX · NO STRAY PLAYERS ALLOWED
        </p>
      </div>
    </main>
  );
}
