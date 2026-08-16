import {
  isPerfect,
  lastNDays,
  todayKey,
  type DayDoc,
  type Habit,
} from "./habits";

export const CAUSES = [
  "NETFLIX",
  "SLEEP",
  "ONE MORE EPISODE",
  "DOOMSCROLLING",
  "EXCUSES",
  "PURE CHAOS",
];

const ROASTS_ME = [
  "THE QUESTS WAITED FOR YOU. IN VAIN.",
  "YOUR STREAK FILED A COMPLAINT.",
  "CTRL+Z WON'T FIX THIS.",
  "THE FLAME DIED OF LONELINESS.",
];

const ROASTS_THEM = [
  "A CERTAIN PLAYER SKIPPED. JUST SAYING.",
  "SUS. VERY SUS.",
  "THEIR HP BAR CRIED ALL NIGHT.",
  "SOMEONE OWES YOU A MASSAGE NOW.",
];

export function hashIndex(str: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % mod;
}

export type News = {
  missed: boolean;
  roast: string;
  funeral: { length: number; cause: string } | null;
};

export function getNews(
  hist: Record<string, DayDoc>,
  habits: Habit[],
  who: "me" | "them"
): News {
  const yesterday = lastNDays(3)[1];
  const hasHistory = Object.keys(hist).length > 0;
  const missed = hasHistory && !isPerfect(hist[yesterday], habits);

  let funeral: News["funeral"] = null;
  if (missed) {
    // how long was the streak that just died?
    let len = 0;
    const d = new Date();
    d.setDate(d.getDate() - 2);
    while (isPerfect(hist[todayKey(d)], habits)) {
      len++;
      d.setDate(d.getDate() - 1);
    }
    if (len >= 2) {
      funeral = {
        length: len,
        cause: CAUSES[hashIndex(yesterday, CAUSES.length)],
      };
    }
  }

  const list = who === "me" ? ROASTS_ME : ROASTS_THEM;
  return {
    missed,
    roast: list[hashIndex(yesterday, list.length)],
    funeral,
  };
}