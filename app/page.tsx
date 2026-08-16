"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import AuthForm from "@/components/AuthForm";
import TeamGate from "@/components/TeamGate";
import Tracker from "@/components/Tracker";

type Profile = { uid: string; email?: string; coupleId?: string | null };

export default function Home() {
  const [authUser, setAuthUser] = useState<{
    uid: string;
    email: string | null;
  } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setAuthUser(u ? { uid: u.uid, email: u.email } : null);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!authUser) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    // make sure my profile exists
    setDoc(
      doc(db, "users", authUser.uid),
      {
        uid: authUser.uid,
        email: authUser.email,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
    return onSnapshot(doc(db, "users", authUser.uid), (s) => {
      setProfile((s.data() as Profile) ?? null);
      setProfileLoading(false);
    });
  }, [authUser]);

  if (authLoading || (authUser && profileLoading)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-night">
        <p className="animate-pulse font-pixel text-xs text-coin">LOADING…</p>
      </main>
    );
  }

  if (!authUser) return <AuthForm />;
  if (!profile?.coupleId) return <TeamGate uid={authUser.uid} />;

  return (
    <Tracker
      uid={authUser.uid}
      email={authUser.email}
      coupleId={profile.coupleId}
    />
  );
}
