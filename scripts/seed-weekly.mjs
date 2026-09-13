import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("../serviceAccount.json", import.meta.url)),
);

initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();
const db = getFirestore();

// Unique emails every run -> never duplicates
const ts = Date.now();
const EMAIL_A = `kai.${ts}@cdetest.com`;
const EMAIL_B = `nova.${ts}@cdetest.com`;
const PASSWORD = "test1234";

// 🆕 Helper to get exact YYYY-MM-DD for a specific day of the week
// dayIndex: 0 (Sunday) to 6 (Saturday)
// weekOffset: 0 (this week), -1 (last week)
function getDateForWeekDay(dayIndex, weekOffset = 0) {
  const now = new Date();
  const currentDay = now.getDay(); // 0 (Sun) to 6 (Sat)

  // Calculate days to subtract to get to Sunday of the target week
  const daysToSunday = currentDay + Math.abs(weekOffset) * 7;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - daysToSunday);

  const target = new Date(sunday);
  target.setDate(sunday.getDate() + dayIndex);

  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// 🆕 Seed a specific date string directly
async function seedDay(uid, dateStr, done) {
  await db.collection("completions").doc(`${uid}_${dateStr}`).set({
    userId: uid,
    date: dateStr,
    code: !!done.code,
    driving: !!done.driving,
    exercise: !!done.exercise,
    updatedAt: Date.now(),
  });
}

const run = async () => {
  console.log("🌱 Creating users and couple...");
  const a = await auth.createUser({ email: EMAIL_A, password: PASSWORD });
  const b = await auth.createUser({ email: EMAIL_B, password: PASSWORD });

  const coupleId = `seed_weekly_${ts}`;
  await db
    .collection("couples")
    .doc(coupleId)
    .set({
      code: "WEEK",
      members: [a.uid, b.uid],
      createdAt: Date.now(),
    });

  await db.collection("users").doc(a.uid).set({
    uid: a.uid,
    email: EMAIL_A,
    color: "gold", // Kai = Gold/Blue
    coupleId,
    createdAt: Date.now(),
  });

  await db
    .collection("users")
    .doc(b.uid)
    .set({
      uid: b.uid,
      email: EMAIL_B,
      color: "violet", // Nova = Violet/Pink
      coupleId,
      habits: [
        { id: "code", name: "CODE", sprite: "code" },
        { id: "driving", name: "READ", sprite: "book" },
        { id: "exercise", name: "YOGA", sprite: "water" },
      ],
      createdAt: Date.now(),
    });

  console.log("📅 Seeding LAST WEEK (Sun-Sat)...");
  // Scenario: KAI dominates last week (gets the 🏆 trophy)
  // NOVA only does 1 task per day (tests partial completion opacity)
  for (let day = 0; day < 7; day++) {
    const dateStr = getDateForWeekDay(day, -1);

    // Kai: Perfect 3/3 every day last week (2100 pts total)
    await seedDay(a.uid, dateStr, { code: 1, driving: 1, exercise: 1 });

    // Nova: Partial 1/3 every day last week (700 pts total)
    await seedDay(b.uid, dateStr, { code: 1, driving: 0, exercise: 0 });
  }

  console.log("📅 Seeding THIS WEEK (Sun-Sat)...");
// Only seed days that have already passed in the current week
const today = new Date();
const currentDayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)

for (let day = 0; day <= currentDayOfWeek; day++) { 
  const dateStr = getDateForWeekDay(day, 0);
  
  // Kai: Partial 1/3 this week (300 pts total)
  await seedDay(a.uid, dateStr, { code: 1, driving: 0, exercise: 0 });
  
  // Nova: Perfect 3/3 this week (900 pts total)
  await seedDay(b.uid, dateStr, { code: 1, driving: 1, exercise: 1 });
}

console.log(`   Seeded ${currentDayOfWeek + 1} day(s) of this week (Sun-${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][currentDayOfWeek]})`);
  console.log("\n✅ SEEDING COMPLETE! ✔\n");
  console.log("🎮 WHAT TO LOOK FOR IN THE UI:");
  console.log(
    "1. 🏆 TROPHY: Should appear next to KAI (Last week's winner: 2100 vs 700 pts)",
  );
  console.log(
    "2. ⚡ LEADING: Should appear under NOVA's points (Currently leading this week: 900 vs 300 pts)",
  );
  console.log(
    "3. 🎨 PARTIAL COLORS: Look at the weekly grid. Nova's boxes last week should be dim (1/3). Kai's boxes this week should be dim (1/3).",
  );
  console.log("\n🔑 LOGIN CREDENTIALS:");
  console.log("Email:", EMAIL_A);
  console.log("Password:", PASSWORD);
  console.log("(Nova has the same password if you want to check her POV)");
};

run().catch((e) => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
