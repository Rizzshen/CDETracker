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

export function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(todayKey(d));
  }
  return days;
}

export function doneCount(
  day: DayDoc | null | undefined,
  habits: Habit[] = DEFAULT_HABITS
): number {
  return habits.filter((h) => !!day?.[h.id]).length;
}

export function isPerfect(
  day: DayDoc | null | undefined,
  habits: Habit[] = DEFAULT_HABITS
): boolean {
  return !!day && doneCount(day, habits) === habits.length;
}

export function calcStreak(
  hist: Record<string, DayDoc>,
  habits: Habit[] = DEFAULT_HABITS
): number {
  const keys = lastNDays(365).reverse();
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
  habits: Habit[] = DEFAULT_HABITS
): number {
  const keys = lastNDays(365).reverse();
  const both = (k: string) => isPerfect(a[k], habits) && isPerfect(b[k], habits);
  let i = 0;
  if (!both(keys[0])) i = 1;
  let streak = 0;
  for (; i < keys.length; i++) {
    if (both(keys[i])) streak++;
    else break;
  }
  return streak;
}