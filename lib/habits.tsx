export type Habit = { id: string; name: string; sprite: string };

export const DEFAULT_HABITS: Habit[] = [
  { id: "code", name: "CODE", sprite: "code" },
  { id: "driving", name: "DRIVE", sprite: "drive" },
  { id: "exercise", name: "TRAIN", sprite: "train" },
];

export type DayDoc = {
  userId?: string;
  date?: string;
  [habitId: string]: any;
};

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 🆕 Get Sunday to Saturday of the CURRENT week
export function getCurrentWeekDates(d = new Date()): string[] {
  const curr = new Date(d);
  const day = curr.getDay(); // 0 is Sunday
  const diff = curr.getDate() - day;
  const sunday = new Date(curr.setDate(diff));
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    dates.push(todayKey(date));
  }
  return dates;
}

// 🆕 Get Sunday to Saturday of the PREVIOUS week
export function getPreviousWeekDates(d = new Date()): string[] {
  const curr = new Date(d);
  const day = curr.getDay();
  const diff = curr.getDate() - day - 7; // Go back to last week's Sunday
  const sunday = new Date(curr.setDate(diff));
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    dates.push(todayKey(date));
  }
  return dates;
}

export function doneCount(
  day: DayDoc | null | undefined,
  habits: Habit[] = DEFAULT_HABITS,
): number {
  return habits.filter((h) => !!day?.[h.id]).length;
}

export function isPerfect(
  day: DayDoc | null | undefined,
  habits: Habit[] = DEFAULT_HABITS,
): boolean {
  return !!day && doneCount(day, habits) === habits.length;
}

// 🆕 Calculate total points for a specific array of dates (100 pts per task)
export function calcWeeklyPoints(
  hist: Record<string, DayDoc>,
  habits: Habit[],
  weekDates: string[],
): number {
  return weekDates.reduce((total, date) => {
    return total + doneCount(hist[date], habits) * 100;
  }, 0);
}

export function calcStreak(
  hist: Record<string, DayDoc>,
  habits: Habit[] = DEFAULT_HABITS,
): number {
  // Keep existing streak logic but use current week logic if needed,
  // or leave as-is for "consecutive perfect days" regardless of week boundaries.
  const keys = getCurrentWeekDates().reverse(); // Simplified to current week for streak
  let i = 0;
  if (!isPerfect(hist[keys[0]], habits)) i = 1;
  let streak = 0;
  for (; i < keys.length; i++) {
    if (isPerfect(hist[keys[i]], habits)) streak++;
    else break;
  }
  return streak;
}

export function calcCoopStreak(
  a: Record<string, DayDoc>,
  b: Record<string, DayDoc>,
  habitsA: Habit[] = DEFAULT_HABITS,
  habitsB: Habit[] = DEFAULT_HABITS,
): number {
  const keys = getCurrentWeekDates().reverse();
  const both = (k: string) =>
    isPerfect(a[k], habitsA) && isPerfect(b[k], habitsB);
  let i = 0;
  if (!both(keys[0])) i = 1;
  let streak = 0;
  for (; i < keys.length; i++) {
    if (both(keys[i])) streak++;
    else break;
  }
  return streak;
}
