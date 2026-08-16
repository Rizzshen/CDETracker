"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Px, SPRITES, SPRITE_PALETTES } from "./sprites";

export default function AuthForm() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(
        err.code
          ? err.code.replace("auth/", "").replace(/-/g, " ")
          : err.message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-night font-retro text-white">
      {/* arcade grid */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      {/* CRT scanlines */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.22)_0px,rgba(0,0,0,0.22)_1px,transparent_1px,transparent_3px)]" />
      {/* vignette */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
        {/* couple hearts */}
        <div className="flex items-center justify-center gap-3">
          <Px
            rows={SPRITES.heart}
            palette={{ P: "#4de3ff" }}
            className="h-7 w-7"
            glow="#4de3ff"
          />
          <Px
            rows={SPRITES.heart}
            palette={{ P: "#ff5da2" }}
            className="h-7 w-7"
            glow="#ff5da2"
          />
        </div>

        {/* logo */}
        <h1 className="mt-5 text-center font-pixel text-2xl text-coin [text-shadow:0_0_16px_rgba(255,217,61,0.7)]">
          CDE QUEST
        </h1>
        <p className="mt-3 text-center text-xl leading-none text-white/60">
          a co-op habit quest for two players
        </p>

        {/* habit sprites marquee */}
        <div className="mt-7 flex justify-center gap-6">
          <Px
            rows={SPRITES.code}
            palette={SPRITE_PALETTES.code}
            className="h-8 w-8"
          />
          <Px
            rows={SPRITES.drive}
            palette={SPRITE_PALETTES.drive}
            className="h-8 w-8"
          />
          <Px
            rows={SPRITES.train}
            palette={SPRITE_PALETTES.train}
            className="h-8 w-8"
          />
        </div>

        {/* card */}
        <div className="mt-8 border-4 border-black bg-panel p-5 shadow-[0_6px_0_0_#000]">
          {/* NEW GAME / CONTINUE */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`border-4 border-black py-3 font-pixel text-[9px] transition ${
                mode === "signup"
                  ? "bg-lime text-black [box-shadow:0_0_12px_rgba(141,255,91,0.5)]"
                  : "bg-night text-white/50 hover:text-white"
              }`}
            >
              NEW GAME
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`border-4 border-black py-3 font-pixel text-[9px] transition ${
                mode === "login"
                  ? "bg-lime text-black [box-shadow:0_0_12px_rgba(141,255,91,0.5)]"
                  : "bg-night text-white/50 hover:text-white"
              }`}
            >
              CONTINUE
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block font-pixel text-[8px] text-white/60"
              >
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="player1@love.quest"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-4 border-black bg-night px-4 py-3 font-retro text-xl text-white outline-none placeholder:text-white/25 focus:[box-shadow:0_0_0_2px_#4de3ff,0_0_12px_rgba(77,227,255,0.5)]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block font-pixel text-[8px] text-white/60"
              >
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-4 border-black bg-night px-4 py-3 font-retro text-xl text-white outline-none placeholder:text-white/25 focus:[box-shadow:0_0_0_2px_#4de3ff,0_0_12px_rgba(77,227,255,0.5)]"
              />
            </div>

            {error && (
              <p className="border-4 border-black bg-[#3a1020] px-4 py-2 font-retro text-lg leading-none text-p2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full border-4 border-black bg-coin py-4 font-pixel text-[10px] text-black shadow-[0_5px_0_0_#000] transition hover:[box-shadow:0_0_16px_rgba(255,217,61,0.5)] active:translate-y-1 active:shadow-none disabled:opacity-50"
            >
              {busy
                ? "LOADING…"
                : mode === "signup"
                  ? "PRESS START ♥"
                  : "CONTINUE ♥"}
            </button>
          </form>
        </div>

        <p className="mt-8 animate-pulse text-center font-pixel text-[8px] text-white/40">
          INSERT LOVE TO CONTINUE
        </p>
      </div>
    </main>
  );
}
