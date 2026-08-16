import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("../serviceAccount.json", import.meta.url))
);

initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();
const db = getFirestore();

// unique emails every run -> never duplicates
const ts = Date.now();
const EMAIL_A = `kai.${ts}@cdetest.com`;
const EMAIL_B = `nova.${ts}@cdetest.com`;
const PASSWORD = "test1234";

function dayStr(offset) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function seedDay(uid, offset, done) {
  const date = dayStr(offset);
  await db.collection("completions").doc(`${uid}_${date}`).set({
    userId: uid,
    date,
    code: !!done.code,
    driving: !!done.driving,
    exercise: !!done.exercise,
    updatedAt: Date.now(),
  });
}

const run = async () => {
  const a = await auth.createUser({ email: EMAIL_A, password: PASSWORD });
  const b = await auth.createUser({ email: EMAIL_B, password: PASSWORD });

  const coupleId = `seed_${ts}`;
  await db
    .collection("couples")
    .doc(coupleId)
    .set({
      code: "SEED",
      members: [a.uid, b.uid],
      createdAt: Date.now(),
    });

  await db.collection("users").doc(a.uid).set({
    uid: a.uid,
    email: EMAIL_A,
    color: "gold",
    coupleId,
    createdAt: Date.now(),
  });

  await db
    .collection("users")
    .doc(b.uid)
    .set({
      uid: b.uid,
      email: EMAIL_B,
      color: "violet",
      coupleId,
      habits: [
        { id: "code", name: "CODE", sprite: "code" },
        { id: "driving", name: "READ", sprite: "book" },
        { id: "exercise", name: "YOGA", sprite: "water" },
      ],
      createdAt: Date.now(),
    });

  // KAI: perfect -7, partial -6, perfect -5..-1  -> live 5-day streak
  await seedDay(a.uid, 7, { code: 1, driving: 1, exercise: 1 });
  await seedDay(a.uid, 6, { code: 1, driving: 1 });
  for (let i = 5; i >= 1; i--) {
    await seedDay(a.uid, i, { code: 1, driving: 1, exercise: 1 });
  }

  // NOVA: perfect -8..-2, missed yesterday -> dead 7-day streak = funeral
  for (let i = 8; i >= 2; i--) {
    await seedDay(b.uid, i, { code: 1, driving: 1, exercise: 1 });
  }

  console.log("SEEDED ✔");
  console.log("LOGIN AS:", EMAIL_A);
  console.log("PASSWORD:", PASSWORD);
  console.log("(Nova has the same password if you want her POV too)");
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
