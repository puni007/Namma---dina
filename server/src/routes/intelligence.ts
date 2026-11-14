import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { localDayBounds, parseDateOnly, todayInTimezone } from '../lib/dates.js';
import { HttpError } from '../lib/errors.js';
import { requireUser } from '../middleware/auth.js';
import { comebackScore, scoreExplanation } from '../services/score.js';
import { hasScheduleConflict, suggestSlots, type WorkItem } from '../services/scheduling.js';
import { completionPercent, habitTargetMet, isHabitDue, weekStartDate } from '../services/habits.js';

export const overviewRouter = Router();
overviewRouter.get('/', async (req, res) => {
  const user = requireUser(req);
  const day = typeof req.query.date === 'string' && /^\d{4}-\d\d-\d\d$/.test(req.query.date) ? req.query.date : todayInTimezone(user.timezone);
  const bounds = localDayBounds(day, user.timezone);
  const dateOnly = parseDateOnly(day);
  const [tasks, habits, habitLogs, blocks, water, screen, settings, reflections] = await Promise.all([
    prisma.task.findMany({ where: { userId: user.id, OR: [{ dueAt: { gte: bounds.start, lt: bounds.end } }, { scheduledStart: { gte: bounds.start, lt: bounds.end } }] }, include: { category: true }, orderBy: [{ priority: 'desc' }, { scheduledStart: 'asc' }] }),
    prisma.habit.findMany({ where: { userId: user.id, isActive: true }, orderBy: { createdAt: 'asc' } }),
    prisma.habitLog.findMany({ where: { userId: user.id, date: { gte: weekStartDate(dateOnly), lte: dateOnly } } }),
    prisma.scheduleBlock.findMany({ where: { userId: user.id, startsAt: { gte: bounds.start, lt: bounds.end } }, orderBy: { startsAt: 'asc' } }),
    prisma.waterLog.findMany({ where: { userId: user.id, date: dateOnly } }),
    prisma.screenTimeLog.findMany({ where: { userId: user.id, date: dateOnly } }),
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
    prisma.dailyReflection.findUnique({ where: { userId_date: { userId: user.id, date: dateOnly } } }),
  ]);
  const completed = tasks.filter((task) => task.status === 'COMPLETED').length;
  const todayLogs = new Map(habitLogs.filter((log) => log.date.getTime() === dateOnly.getTime()).map((log) => [log.habitId, log.value]));
  const weekLogs = new Map<string, number>();
  for (const log of habitLogs) weekLogs.set(log.habitId, (weekLogs.get(log.habitId) ?? 0) + log.value);
  const habitRows = habits.map((habit) => {
    const weekly = habit.frequency === 'WEEKLY';
    const value = weekly ? (weekLogs.get(habit.id) ?? 0) : (todayLogs.get(habit.id) ?? 0);
    return { ...habit, value, todayValue: todayLogs.get(habit.id) ?? 0, dueToday: isHabitDue(habit, dateOnly), done: habitTargetMet(value, habit.targetValue) };
  });
  const dueHabits = habitRows.filter((habit) => habit.dueToday);
  const doneHabits = dueHabits.filter((habit) => habit.done).length;
  const waterMl = water.reduce((sum, row) => sum + row.amountMl, 0);
  const screenMinutes = screen.reduce((sum, row) => sum + row.minutes, 0);
  const count = tasks.length + dueHabits.length;
  res.json({ data: { date: day, timezone: user.timezone, tasks, habits: habitRows, blocks, reflection: reflections, progress: completionPercent(completed + doneHabits, count), taskProgress: completionPercent(completed, tasks.length), habitProgress: completionPercent(doneHabits, dueHabits.length), waterMl, waterGoalMl: settings?.dailyWaterGoalMl ?? 2000, screenMinutes, screenGoalMinutes: settings?.dailyScreenGoalMinutes ?? 180 } });
});

export const insightsRouter = Router();
insightsRouter.get('/', async (req, res) => {
  const user = requireUser(req);
  const today = todayInTimezone(user.timezone);
  const [year, month, date] = today.split('-').map(Number);
  const nowDay = new Date(Date.UTC(year!, month! - 1, date!));
  const dates = Array.from({ length: 14 }, (_, index) => new Date(nowDay.getTime() - (13 - index) * 86400000).toISOString().slice(0, 10));
  const start = localDayBounds(dates[0]!, user.timezone).start;
  const monthStart = localDayBounds(`${today.slice(0, 7)}-01`, user.timezone).start;
  const end = localDayBounds(today, user.timezone).end;
  const [tasks, habitLogs, habits, screens, foods, events, blocks, settings, sleeps, breathingSessions] = await Promise.all([
    prisma.task.findMany({ where: { userId: user.id, OR: [{ dueAt: { gte: start, lt: end } }, { completedAt: { gte: start, lt: end } }] }, select: { id: true, title: true, status: true, dueAt: true, scheduledStart: true, scheduledMinutes: true, actualMinutes: true, completedAt: true, priority: true } }),
    prisma.habitLog.findMany({ where: { userId: user.id, date: { gte: parseDateOnly(dates[0]!), lte: parseDateOnly(today) } } }),
    prisma.habit.findMany({ where: { userId: user.id }, select: { id: true, targetValue: true, name: true, frequency: true, daysOfWeek: true } }),
    prisma.screenTimeLog.findMany({ where: { userId: user.id, date: { gte: parseDateOnly(dates[0]!), lte: parseDateOnly(today) } } }),
    prisma.foodLog.findMany({ where: { userId: user.id, loggedAt: { gte: monthStart, lt: end } } }),
    prisma.taskEvent.findMany({ where: { userId: user.id, createdAt: { gte: start, lt: end }, kind: 'postponed' }, include: { task: { select: { title: true } } } }),
    prisma.scheduleBlock.findMany({ where: { userId: user.id, startsAt: { gte: start, lt: end }, status: 'missed' } }),
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
    prisma.sleepLog.findMany({ where: { userId: user.id, date: { gte: parseDateOnly(dates[7]!), lte: parseDateOnly(today) } }, select: { durationMins: true } }),
    prisma.breathingSession.findMany({ where: { userId: user.id, date: { gte: parseDateOnly(dates[7]!), lte: parseDateOnly(today) } }, select: { durationMinutes: true } }),
  ]);
  const trend = dates.slice(-7).map((day) => {
    const dayTasks = tasks.filter((task) => task.dueAt && task.dueAt.toISOString().slice(0, 10) === day);
    const logs = habitLogs.filter((log) => log.date.toISOString().slice(0, 10) === day);
    const dayScreen = screens.filter((log) => log.date.toISOString().slice(0, 10) === day).reduce((sum, log) => sum + log.minutes, 0);
    return { date: day, label: new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`)), tasksDone: dayTasks.filter((t) => t.status === 'COMPLETED').length, tasksPlanned: dayTasks.length, habitLogs: logs.length, screenMinutes: dayScreen };
  });
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
  const recoveryEvents = Math.min(2, blocks.filter((block) => block.taskId && tasks.some((task) => task.id === block.taskId && task.status === 'COMPLETED' && task.completedAt && task.completedAt > block.endsAt && task.completedAt.getTime() - block.endsAt.getTime() <= 14 * 86400000)).length);
  const activeDays = new Set([
    ...tasks.filter((t) => t.status === 'COMPLETED' && t.completedAt && t.completedAt >= start && t.completedAt < end && todayInTimezone(user.timezone, t.completedAt) >= last7[0]!).map((t) => todayInTimezone(user.timezone, t.completedAt!)),
    ...last7Logs.filter((l) => l.value > 0).map((l) => l.date.toISOString().slice(0, 10)),
  ]).size;
  const hasData = tasks.length > 0 || habitLogs.length > 0;
  const score = hasData ? comebackScore({ completionRate: planned ? completed / planned : 0, habitRate: scheduledHabitOpportunities ? Math.min(1, loggedHabits / scheduledHabitOpportunities) : 0, recoveryEvents, activeDays: Math.min(7, activeDays) }) : null;
  const postponedCounts = new Map<string, number>();
  for (const event of events) { const title = event.task.title; postponedCounts.set(title, (postponedCounts.get(title) ?? 0) + 1); }
  const mostPostponed = [...postponedCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const totalScreen = screens.filter((row) => row.date >= parseDateOnly(dates[7]!) && row.date <= parseDateOnly(today)).reduce((sum, row) => sum + row.minutes, 0);
  const totalFood = foods.reduce((sum, row) => sum + row.spendCents, 0);
  const deliveryCount = foods.filter((row) => row.kind === 'DELIVERY').length;
  const orderNames = new Map<string, number>();
  for (const food of foods) orderNames.set(food.name.trim().toLowerCase(), (orderNames.get(food.name.trim().toLowerCase()) ?? 0) + 1);
  const repeatedFood = [...orderNames.entries()].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1])[0] ?? null;
  const completedWithTime = tasks.filter((task) => task.status === 'COMPLETED' && task.completedAt && task.scheduledStart);
  let productiveHour: number | null = null;
  if (completedWithTime.length >= 3) {
    const hours = new Map<number, number>();
    for (const task of completedWithTime) {
      const part = new Intl.DateTimeFormat('en', { timeZone: user.timezone, hour: '2-digit', hourCycle: 'h23' }).formatToParts(task.scheduledStart!).find((item) => item.type === 'hour')?.value;
      if (part) hours.set(Number(part), (hours.get(Number(part)) ?? 0) + 1);
    }
    productiveHour = [...hours.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }
  const totalPlannedMinutes = dueTasks.reduce((sum, task) => sum + task.scheduledMinutes, 0);
  const totalActualMinutes = dueTasks.reduce((sum, task) => sum + (task.actualMinutes ?? 0), 0);
  const averageSleepMinutes = sleeps.length ? Math.round(sleeps.reduce((sum, log) => sum + log.durationMins, 0) / sleeps.length) : null;
  res.json({ data: { score: { value: score, explanation: scoreExplanation, recoveryEvents, activeDays: Math.min(7, activeDays) }, trend, summary: { tasksCompleted: completed, tasksPlanned: planned, totalPlannedMinutes, totalActualMinutes, habitCompletions: loggedHabits, screenMinutesLast7Days: totalScreen, breathingSessionsLast7Days: breathingSessions.length, breathingMinutesLast7Days: breathingSessions.reduce((total, session) => total + session.durationMinutes, 0), screenGoalMinutes: settings?.dailyScreenGoalMinutes ?? 180, foodSpendCents: totalFood, deliveryCount, repeatedFood: repeatedFood ? { name: repeatedFood[0], times: repeatedFood[1] } : null, monthlyFoodBudgetCents: settings?.monthlyFoodBudgetCents ?? 0, averageSleepMinutes, mostPostponed: mostPostponed ? { title: mostPostponed[0], times: mostPostponed[1] } : null, productiveHour, productiveHourExplanation: productiveHour === null ? 'Not enough completed tasks with scheduled times to calculate a reliable pattern. Three or more are required.' : 'The local scheduled hour with the most completed tasks in the last 14 days.' } } });
});

export const rescheduleRouter = Router();
const planSchema = z.object({ date: z.string().regex(/^\d{4}-\d\d-\d\d$/) }).strict();
rescheduleRouter.post('/suggestions', async (req, res) => {
  const user = requireUser(req); const { date } = planSchema.parse(req.body); const bounds = localDayBounds(date, user.timezone); const now = new Date();
  const [tasks, blocks] = await Promise.all([
    prisma.task.findMany({ where: { userId: user.id, status: { in: ['PENDING', 'POSTPONED', 'IN_PROGRESS'] }, OR: [{ dueAt: { gte: bounds.start, lt: bounds.end } }, { scheduledStart: { gte: bounds.start, lt: bounds.end } }] }, orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }] }),
    prisma.scheduleBlock.findMany({ where: { userId: user.id, startsAt: { gte: bounds.start, lt: bounds.end }, status: { not: 'cancelled' } }, orderBy: { startsAt: 'asc' } }),
  ]);
  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  const occupied = blocks.map((b) => ({ start: b.startsAt, end: b.endsAt }));
  const scheduledIds = new Set(blocks.map((b) => b.taskId).filter(Boolean));
  for (const task of tasks) if (task.scheduledStart && !scheduledIds.has(task.id)) occupied.push({ start: task.scheduledStart, end: new Date(task.scheduledStart.getTime() + task.scheduledMinutes * 60000) });
  const candidates: WorkItem[] = tasks.filter((task) => task.scheduledStart && task.scheduledStart < now || task.dueAt && task.dueAt < now || !task.scheduledStart).map((task) => ({ id: task.id, title: task.title, minutes: task.scheduledMinutes, priority: task.priority, dueAt: task.dueAt }));
  const planned = suggestSlots(candidates, occupied.filter((slot) => slot.end > now), now > bounds.start ? now : bounds.start, bounds.end);
  const output = [];
  for (const item of planned) {
    const existing = await prisma.rescheduleEvent.findFirst({ where: { userId: user.id, taskId: item.item.id, state: 'SUGGESTED', createdAt: { gte: bounds.start } } });
    const reason = item.reason;
    const row = existing ?? await prisma.rescheduleEvent.create({ data: { userId: user.id, taskId: item.item.id, title: item.item.title, reason, suggestedStart: item.start, suggestedMinutes: item.minutes } });
    output.push({ ...row, isShortVersion: item.minutes < item.item.minutes });
  }
  res.json({ data: output, meta: { date, timezone: user.timezone, considered: tasksById.size } });
});
rescheduleRouter.post('/:id/action', async (req, res) => {
  const user = requireUser(req); const body = z.object({ action: z.enum(['accept', 'reject']) }).strict().parse(req.body); const id = String(req.params.id);
  const event = await prisma.rescheduleEvent.findFirst({ where: { id, userId: user.id } });
  if (!event) throw new HttpError(404, 'That recommendation could not be found.', 'NOT_FOUND');
  if (event.state !== 'SUGGESTED') throw new HttpError(409, 'This recommendation has already been answered.', 'ALREADY_ACTIONED');
  if (body.action === 'reject') {
    const data = await prisma.rescheduleEvent.update({ where: { id }, data: { state: 'REJECTED', actionedAt: new Date() } });
    return res.json({ data });
  }
  if (!event.taskId || !event.suggestedStart || !event.suggestedMinutes) throw new HttpError(400, 'This suggestion is missing a schedule time.', 'SUGGESTION_INVALID');
  const suggestedStart = event.suggestedStart;
  const suggestedMinutes = event.suggestedMinutes;
  const task = await prisma.task.findFirst({ where: { id: event.taskId, userId: user.id } });
  if (!task) throw new HttpError(404, 'That task could not be found.', 'NOT_FOUND');
  const end = new Date(suggestedStart.getTime() + suggestedMinutes * 60000);
  const [conflict, taskConflict] = await Promise.all([
    prisma.scheduleBlock.findFirst({ where: { userId: user.id, taskId: { not: task.id }, startsAt: { lt: end }, endsAt: { gt: suggestedStart }, status: { not: 'cancelled' } } }),
    prisma.task.findMany({ where: { userId: user.id, id: { not: task.id }, status: { notIn: ['CANCELLED', 'COMPLETED'] }, scheduledStart: { lt: end } }, select: { scheduledStart: true, scheduledMinutes: true } }),
  ]);
  if (conflict || taskConflict.some((other) => other.scheduledStart && new Date(other.scheduledStart.getTime() + other.scheduledMinutes * 60000) > suggestedStart) || hasScheduleConflict(suggestedStart, end, [])) throw new HttpError(409, 'That opening is no longer available. Create a fresh plan.', 'SCHEDULE_CONFLICT');
  const [, , data] = await prisma.$transaction([
    prisma.scheduleBlock.create({ data: { userId: user.id, taskId: task.id, title: task.title, startsAt: suggestedStart, endsAt: end } }),
    prisma.task.update({ where: { id: task.id }, data: { scheduledStart: suggestedStart, scheduledMinutes: suggestedMinutes } }),
    prisma.rescheduleEvent.update({ where: { id }, data: { state: 'ACCEPTED', actionedAt: new Date() } }),
  ]);
  await prisma.taskEvent.create({ data: { userId: user.id, taskId: task.id, kind: 'rescheduled', detail: { minutes: suggestedMinutes } } });
  res.json({ data });
});
