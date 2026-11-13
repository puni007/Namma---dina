export type HabitSchedule = { frequency: 'DAILY' | 'WEEKLY' | 'CUSTOM'; daysOfWeek: number[] };

export function isHabitDue(habit: HabitSchedule, date: Date): boolean {
  if (habit.frequency === 'WEEKLY' || habit.frequency === 'DAILY') return true;
  return habit.daysOfWeek.includes(date.getUTCDay());
}

export function weekStartDate(date: Date): Date {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - offset);
  return start;
}

export function habitTargetMet(value: number, target: number): boolean {
  return Number.isFinite(value) && Number.isFinite(target) && target > 0 && value >= target;
}

export function completionPercent(done: number, planned: number): number {
  if (planned <= 0) return 0;
  return Math.round(Math.max(0, Math.min(planned, done)) / planned * 100);
}
