import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/errors.js';
import { requireUser } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const timezoneSchema = z.string().min(1).max(80).refine((zone) => { try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true; } catch { return false; } }, 'Choose a valid timezone.');
const profileSchema = z.object({ displayName: z.string().trim().min(1).max(60).optional(), timezone: timezoneSchema.optional(), onboardingDone: z.boolean().optional() }).strict();
const settingsSchema = z.object({ wakeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(), sleepTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(), goals: z.array(z.string().max(120)).max(10).optional(), notificationPreferences: z.record(z.string(), z.boolean()).optional(), planningStyle: z.enum(['focused', 'balanced', 'flexible']).optional(), dailyWaterGoalMl: z.number().int().min(100).max(10000).optional(), dailyScreenGoalMinutes: z.number().int().min(15).max(1440).optional(), monthlyFoodBudgetCents: z.number().int().min(0).max(100000000).optional(), browserNotifications: z.boolean().optional(), motionMode: z.enum(['auto', 'full', 'calm', 'off']).optional(), aiCompanionEnabled: z.boolean().optional(), aiMorningBriefingEnabled: z.boolean().optional(), aiQuickAddEnabled: z.boolean().optional(), aiComebackPlanEnabled: z.boolean().optional(), aiWeeklyReflectionEnabled: z.boolean().optional() }).strict();

export const usersRouter = Router();
usersRouter.get('/profile', async (req, res) => {
  const user = requireUser(req);
  const data = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, displayName: true, timezone: true, onboardingDone: true, createdAt: true, settings: true } });
  res.json({ data });
});
usersRouter.patch('/profile', validateBody(profileSchema), async (req, res) => {
  const user = requireUser(req);
  const data = await prisma.user.update({ where: { id: user.id }, data: req.body });
  res.json({ data: { id: data.id, email: data.email, displayName: data.displayName, timezone: data.timezone, onboardingDone: data.onboardingDone } });
});
usersRouter.get('/settings', async (req, res) => {
  const user = requireUser(req);
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  res.json({ data: settings });
});
usersRouter.patch('/settings', validateBody(settingsSchema), async (req, res) => {
  const user = requireUser(req);
  const data = await prisma.userSettings.upsert({ where: { userId: user.id }, create: { userId: user.id, ...req.body }, update: req.body });
  res.json({ data });
});
usersRouter.get('/export', async (req, res) => {
  const user = requireUser(req);
  const [profile, tasks, habits, habitLogs, schedule, reminders, reflections, wellness, water, sleep, workouts, screenTime, food, reschedules, notifications, insights, pushSubscriptions, breathingSessions, aiUsage, assistantSettings, assistantMessages] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, displayName: true, timezone: true, createdAt: true, settings: true, categories: true } }),
    prisma.task.findMany({ where: { userId: user.id }, include: { events: true } }), prisma.habit.findMany({ where: { userId: user.id }, include: { logs: true } }), prisma.habitLog.findMany({ where: { userId: user.id } }), prisma.scheduleBlock.findMany({ where: { userId: user.id } }), prisma.reminder.findMany({ where: { userId: user.id } }), prisma.dailyReflection.findMany({ where: { userId: user.id } }), prisma.wellnessLog.findMany({ where: { userId: user.id } }), prisma.waterLog.findMany({ where: { userId: user.id } }), prisma.sleepLog.findMany({ where: { userId: user.id } }), prisma.workoutLog.findMany({ where: { userId: user.id } }), prisma.screenTimeLog.findMany({ where: { userId: user.id } }), prisma.foodLog.findMany({ where: { userId: user.id } }), prisma.rescheduleEvent.findMany({ where: { userId: user.id } }), prisma.notification.findMany({ where: { userId: user.id } }), prisma.dailyInsight.findMany({ where: { userId: user.id } }), prisma.pushSubscription.findMany({ where: { userId: user.id }, select: { endpoint: true, createdAt: true } }), prisma.breathingSession.findMany({ where: { userId: user.id } }), prisma.aIUsage.findMany({ where: { userId: user.id }, select: { feature: true, inputTokens: true, outputTokens: true, createdAt: true } }), prisma.assistantSettings.findUnique({ where: { userId: user.id } }), prisma.assistantMessage.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'asc' } }),
  ]);
  res.setHeader('Content-Disposition', 'attachment; filename="namma-dina-export.json"');
  res.json({ exportedAt: new Date().toISOString(), profile, tasks, habits, habitLogs, schedule, reminders, reflections, wellness, water, sleep, workouts, screenTime, food, reschedules, notifications, insights, pushSubscriptions, breathingSessions, aiUsage, assistant: { settings: assistantSettings, messages: assistantMessages } });
});
usersRouter.post('/import', async (req, res) => {
  const user = requireUser(req);
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'Invalid backup format.', 'INVALID_BACKUP');
  }

  const categoryMap = new Map<string, string>();
  if (Array.isArray(payload.profile?.categories)) {
    for (const cat of payload.profile.categories) {
      if (typeof cat.name === 'string' && cat.name.trim()) {
        const existing = await prisma.taskCategory.findUnique({
          where: { userId_name: { userId: user.id, name: cat.name.trim() } },
        });
        const saved = existing ?? await prisma.taskCategory.create({
          data: { userId: user.id, name: cat.name.trim(), color: typeof cat.color === 'string' ? cat.color : '#67E8D0' },
        });
        if (cat.id) categoryMap.set(cat.id, saved.id);
      }
    }
  }

  let importedTasks = 0;
  if (Array.isArray(payload.tasks)) {
    for (const t of payload.tasks) {
      if (typeof t.title === 'string' && t.title.trim()) {
        const catId = t.categoryId ? categoryMap.get(t.categoryId) ?? null : null;
        await prisma.task.create({
          data: {
            userId: user.id,
            title: t.title.trim(),
            description: typeof t.description === 'string' ? t.description : null,
            status: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED', 'CANCELLED'].includes(t.status) ? t.status : 'PENDING',
            priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(t.priority) ? t.priority : 'MEDIUM',
            dueAt: t.dueAt ? new Date(t.dueAt) : null,
            scheduledStart: t.scheduledStart ? new Date(t.scheduledStart) : null,
            scheduledMinutes: Number(t.scheduledMinutes) || 30,
            actualMinutes: t.actualMinutes ? Number(t.actualMinutes) : null,
            recurrenceRule: typeof t.recurrenceRule === 'string' ? t.recurrenceRule : null,
            completedAt: t.completedAt ? new Date(t.completedAt) : null,
            categoryId: catId,
          },
        });
        importedTasks += 1;
      }
    }
  }

  let importedHabits = 0;
  if (Array.isArray(payload.habits)) {
    for (const h of payload.habits) {
      if (typeof h.name === 'string' && h.name.trim()) {
        await prisma.habit.create({
          data: {
            userId: user.id,
            name: h.name.trim(),
            description: typeof h.description === 'string' ? h.description : null,
            frequency: ['DAILY', 'WEEKLY', 'CUSTOM'].includes(h.frequency) ? h.frequency : 'DAILY',
            daysOfWeek: Array.isArray(h.daysOfWeek) ? h.daysOfWeek.filter((d: unknown) => typeof d === 'number') : [],
            targetValue: Number(h.targetValue) || 1,
            targetUnit: typeof h.targetUnit === 'string' ? h.targetUnit : 'times',
            flexible: h.flexible !== false,
            isActive: h.isActive !== false,
          },
        });
        importedHabits += 1;
      }
    }
  }

  let importedReminders = 0;
  if (Array.isArray(payload.reminders)) {
    for (const r of payload.reminders) {
      if (typeof r.title === 'string' && r.title.trim() && r.dueAt) {
        await prisma.reminder.create({
          data: {
            userId: user.id,
            title: r.title.trim(),
            body: typeof r.body === 'string' ? r.body : null,
            dueAt: new Date(r.dueAt),
            recurrence: typeof r.recurrence === 'string' ? r.recurrence : null,
            state: ['ACTIVE', 'DISMISSED', 'DONE'].includes(r.state) ? r.state : 'ACTIVE',
          },
        });
        importedReminders += 1;
      }
    }
  }

  res.json({
    data: {
      success: true,
      importedTasks,
      importedHabits,
      importedReminders,
    },
  });
});
usersRouter.delete('/account', validateBody(z.object({ password: z.string().min(1) }).strict()), async (req, res) => {
  const user = requireUser(req);
  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record || !(await bcrypt.compare((req.body as { password: string }).password, record.passwordHash))) throw new HttpError(401, 'Password is incorrect.', 'INVALID_CREDENTIALS');
  await prisma.user.delete({ where: { id: user.id } });
  res.clearCookie('nd_session');
  res.status(204).end();
});
