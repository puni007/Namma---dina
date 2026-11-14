import { localDayBounds, parseDateOnly, todayInTimezone } from '../lib/dates.js';
import { habitTargetMet } from './habits.js';

export type ScoreInputs = { completionRate: number; habitRate: number; recoveryEvents: number; activeDays: number };

export function comebackScore(input: ScoreInputs): number {
  const completion = Math.max(0, Math.min(1, input.completionRate));
  const habits = Math.max(0, Math.min(1, input.habitRate));
  const recovery = Math.max(0, Math.min(2, input.recoveryEvents)) / 2;
  const active = Math.max(0, Math.min(7, input.activeDays)) / 7;
  return Math.round(completion * 35 + habits * 30 + recovery * 20 + active * 15);
}

export const scoreExplanation = 'A weekly reflection score: 35% planned task follow-through, 30% habit targets, 20% returning to an activity after a missed day (up to two returns), and 15% days with any meaningful activity. It rewards restarting; it is not a health or scientific measure.';

type ScoreTask = { id: string; status: string; dueAt: Date | null; completedAt: Date | null };
type ScoreHabit = { id: string; targetValue: number; frequency: string; daysOfWeek: number[] };
type ScoreHabitLog = { habitId: string; date: Date; value: number };
type ScoreMissedBlock = { taskId: string | null; endsAt: Date };

export function comebackScoreFromRecords(input: {
  tasks: ScoreTask[];
  habits: ScoreHabit[];
  habitLogs: ScoreHabitLog[];
  missedBlocks: ScoreMissedBlock[];
  today: string;
  timezone: string;
}) {
  const { tasks, habits, habitLogs, missedBlocks, today, timezone } = input;
  const [year, month, date] = today.split('-').map(Number);
  const nowDay = new Date(Date.UTC(year!, month! - 1, date!));
  const dates = Array.from({ length: 14 }, (_, index) => new Date(nowDay.getTime() - (13 - index) * 86400000).toISOString().slice(0, 10));
  const startDay = dates[0]!;
  const start = localDayBounds(startDay, timezone).start;
  const end = localDayBounds(today, timezone).end;
  const dueTasks = tasks.filter((task) => task.dueAt);
  const completed = dueTasks.filter((task) => task.status === 'COMPLETED').length;
  const planned = dueTasks.length;
  const last7 = dates.slice(-7);
  const last7Logs = habitLogs.filter((log) => log.date >= parseDateOnly(last7[0]!) && log.date <= parseDateOnly(today));
  let loggedHabits = 0;
  let scheduledHabitOpportunities = 0;
  for (const habit of habits) {
    if (habit.frequency === 'WEEKLY') {
      scheduledHabitOpportunities += 1;
      if (last7Logs.filter((log) => log.habitId === habit.id).reduce((sum, log) => sum + log.value, 0) >= habit.targetValue) loggedHabits += 1;
      continue;
    }
    for (const day of last7) {
      if (habit.frequency === 'CUSTOM' && !habit.daysOfWeek.includes(parseDateOnly(day).getUTCDay())) continue;
      scheduledHabitOpportunities += 1;
      if (last7Logs.some((log) => log.habitId === habit.id && log.date.getTime() === parseDateOnly(day).getTime() && habitTargetMet(log.value, habit.targetValue))) loggedHabits += 1;
    }
  }
  const recoveryEvents = Math.min(2, missedBlocks.filter((block) => block.taskId && tasks.some((task) => task.id === block.taskId && task.status === 'COMPLETED' && task.completedAt && task.completedAt > block.endsAt && task.completedAt.getTime() - block.endsAt.getTime() <= 14 * 86400000)).length);
  const activeDays = new Set([
    ...tasks.filter((task) => task.status === 'COMPLETED' && task.completedAt && task.completedAt >= start && task.completedAt < end && todayInTimezone(timezone, task.completedAt) >= last7[0]!).map((task) => todayInTimezone(timezone, task.completedAt!)),
    ...last7Logs.filter((log) => log.value > 0).map((log) => log.date.toISOString().slice(0, 10)),
  ]).size;
  const hasData = tasks.length > 0 || habitLogs.length > 0;
  const value = hasData ? comebackScore({ completionRate: planned ? completed / planned : 0, habitRate: scheduledHabitOpportunities ? Math.min(1, loggedHabits / scheduledHabitOpportunities) : 0, recoveryEvents, activeDays: Math.min(7, activeDays) }) : null;
  return { value, recoveryEvents, activeDays: Math.min(7, activeDays), loggedHabits, explanation: scoreExplanation };
}
