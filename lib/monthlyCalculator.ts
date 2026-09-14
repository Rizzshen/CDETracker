import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_HABITS, doneCount, type DayDoc, type Habit } from "./habits";

export async function calculateMonthlyPoints(
  uid: string,
  year: number,
  month: number, // 0-11 (Jan-Dec)
): Promise<number> {
  const completionsSnap = await getDocs(
    query(collection(db, "completions"), where("userId", "==", uid)),
  );

  let totalPoints = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  completionsSnap.forEach((docSnap) => {
    const data = docSnap.data() as DayDoc;
    if (data.date) {
      const [dYear, dMonth, dDay] = data.date.split("-").map(Number);
      // Check if this completion is within the target month
      if (dYear === year && dMonth === month + 1 && dDay <= daysInMonth) {
        totalPoints += doneCount(data, DEFAULT_HABITS) * 100;
      }
    }
  });

  return totalPoints;
}

export async function endMonthCalculation(
  coupleId: string,
  uidA: string,
  uidB: string,
  nameA: string,
  nameB: string,
  monthlyBet: number,
) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  // Calculate points for both users
  const pointsA = await calculateMonthlyPoints(uidA, year, month);
  const pointsB = await calculateMonthlyPoints(uidB, year, month);

  // Determine loser
  let loserUid: string | null = null;
  let loserName: string | null = null;
  let isTie = false;

  if (pointsA > pointsB) {
    loserUid = uidB;
    loserName = nameB;
  } else if (pointsB > pointsA) {
    loserUid = uidA;
    loserName = nameA;
  } else {
    isTie = true; // Tie = both pay!
  }

  const jarRef = doc(db, "couples", coupleId, "jar", "main");

  // Update jar with pending debt
  if (isTie) {
    // Both pay double!
    await setDoc(
      jarRef,
      {
        pendingDebt: monthlyBet * 2,
        debtorUid: "TIE",
        debtorName: "BOTH",
        history: arrayUnion({
          id: crypto.randomUUID(),
          type: "month_end",
          amount: monthlyBet * 2,
          note: `Month End: TIE! Both pay ${monthlyBet * 2}`,
          date: new Date().toISOString(),
          pointsA,
          pointsB,
        }),
      },
      { merge: true },
    );
  } else {
    await setDoc(
      jarRef,
      {
        pendingDebt: monthlyBet,
        debtorUid: loserUid,
        debtorName: loserName,
        history: arrayUnion({
          id: crypto.randomUUID(),
          type: "month_end",
          amount: monthlyBet,
          note: `Month End: ${loserName} lost (${pointsA} vs ${pointsB})`,
          date: new Date().toISOString(),
          pointsA,
          pointsB,
        }),
      },
      { merge: true },
    );
  }

  return { pointsA, pointsB, loserUid, loserName, isTie };
}
