import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { localDayBounds, nextLocalReminderDate, parseDateOnly, todayInTimezone } from '../lib/dates.js';
import { HttpError } from '../lib/errors.js';
import { requireUser } from '../middleware/auth.js';
import { crudRouter } from './crud.js';

const day = z.string().regex(/^\d{4}-\d\d-\d\d$/).transform(parseDateOnly);
const dateTime = z.coerce.date();
const nullableText = z.string().trim().max(2000).nullable().optional();
export const taskSchema = z.object({ title: z.string().trim().min(1).max(160), description: nullableText, status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED', 'CANCELLED']).optional(), priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(), categoryId: z.string().nullable().optional(), dueAt: dateTime.nullable().optional(), scheduledStart: dateTime.nullable().optional(), scheduledMinutes: z.number().int().min(5).max(720).optional(), actualMinutes: z.number().int().min(1).max(1440).nullable().optional(), recurrenceRule: z.string().max(120).nullable().optional(), completedAt: dateTime.nullable().optional() }).strict();
export const habitSchema = z.object({ name: z.string().trim().min(1).max(100), description: nullableText, frequency: z.enum(['DAILY', 'WEEKLY', 'CUSTOM']).optional(), daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(), targetValue: z.number().positive().max(100000).optional(), targetUnit: z.string().trim().min(1).max(30).optional(), flexible: z.boolean().optional(), isActive: z.boolean().optional(), startDate: day.optional() }).strict();
export const habitLogSchema = z.object({ habitId: z.string().min(1), date: day, value: z.number().min(0).max(100000).default(1), note: nullableText }).strict();
const blockSchema = z.object({ taskId: z.string().nullable().optional(), title: z.string().trim().min(1).max(160), description: nullableText, startsAt: dateTime, endsAt: dateTime, isFixed: z.boolean().optional(), status: z.enum(['planned', 'done', 'missed', 'cancelled']).optional() }).strict();
const reminderSchema = z.object({ title: z.string().trim().min(1).max(160), body: nullableText, entityType: z.string().max(40).nullable().optional(), entityId: z.string().max(80).nullable().optional(), dueAt: dateTime, recurrence: z.string().max(120).nullable().optional(), state: z.enum(['ACTIVE', 'DISMISSED', 'DONE']).optional(), notifiedAt: dateTime.nullable().optional() }).strict();
export const reflectionSchema = z.object({ date: day, wentWell: nullableText, offPlan: nullableText, distractions: nullableText, gratitude: nullableText, improve: nullableText, mood: z.number().int().min(1).max(5).nullable().optional() }).strict();
const wellnessSchema = z.object({ date: day, mood: z.number().int().min(1).max(5).nullable().optional(), energy: z.number().int().min(1).max(5).nullable().optional(), notes: nullableText }).strict();
export const waterSchema = z.object({ date: day, amountMl: z.number().int().min(1).max(5000) }).strict();
export const sleepSchema = z.object({ date: day, bedtime: dateTime, wakeTime: dateTime, durationMins: z.number().int().min(1).max(1440), notes: nullableText }).strict();
export const workoutSchema = z.object({ activityType: z.string().trim().min(1).max(80), durationMins: z.number().int().min(1).max(1440), loggedAt: dateTime.optional(), notes: nullableText }).strict();
const screenSchema = z.object({ date: day, category: z.string().trim().min(1).max(60), appName: z.string().max(100).nullable().optional(), minutes: z.number().int().min(0).max(1440), distractionCount: z.number().int().min(0).max(1000).optional(), notes: nullableText }).strict();
export const foodSchema = z.object({ name: z.string().trim().min(1).max(120), kind: z.enum(['HOME', 'COOKED_OUTSIDE', 'DELIVERY']), spendCents: z.number().int().min(0).max(100000000), loggedAt: dateTime.optional(), notes: nullableText }).strict();
const categorySchema = z.object({ name: z.string().trim().min(1).max(60), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() }).strict();
const notificationSchema = z.object({ title: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(1000), kind: z.string().max(40).optional(), readAt: dateTime.nullable().optional() }).strict();

const checkOwner = async (userId: string, data: Record<string, unknown>, key: string, model: 'taskCategory' | 'habit' | 'task') => {
  const id = data[key];
  if (id == null) return;
  const row = await (prisma[model] as any).findFirst({ where: { id, userId }, select: { id: true } });
  if (!row) throw new HttpError(400, `Selected ${key.replace('Id', '')} is unavailable.`, 'RELATED_RECORD_INVALID');
};

export const taskRouter = crudRouter({
  delegate: 'task',
  create: taskSchema as any,
  update: taskSchema.partial() as any,
  searchFields: ['title', 'description'],
  onCreate: (u, d) => checkOwner(u, d, 'categoryId', 'taskCategory'),
  onUpdate: (u, _id, d) => checkOwner(u, d, 'categoryId', 'taskCategory'),
  afterCreate: async (userId, row) => {
    await prisma.taskEvent.create({ data: { userId, taskId: row.id, kind: 'created' } });
  },
  afterUpdate: async (userId, before, data, row) => {
    const changes = Object.keys(data).filter((key) => before[key] !== data[key]);
    if (changes.length) {
      await prisma.taskEvent.create({
        data: {
          userId,
          taskId: row.id,
          kind: data.status === 'COMPLETED' ? 'completed' : data.status === 'POSTPONED' ? 'postponed' : 'updated',
          detail: { fields: changes },
        },
      });
    }
    // When a task is marked COMPLETED, update any linked planned calendar blocks to 'done'
    if (data.status === 'COMPLETED' && before.status !== 'COMPLETED') {
      await prisma.scheduleBlock.updateMany({
        where: { taskId: row.id, userId, status: 'planned' },
        data: { status: 'done' },
      });
    }
    if (data.status === 'COMPLETED' && before.status !== 'COMPLETED' && before.recurrenceRule) {
      const rule = String(before.recurrenceRule).toUpperCase();
      const owner = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
      const next = owner ? nextLocalReminderDate(before.dueAt ?? new Date(), owner.timezone, rule) : null;
      if (next) {
        const recurring = await prisma.task.create({
          data: {
            userId,
            title: before.title,
            description: before.description,
            priority: before.priority,
            categoryId: before.categoryId,
            scheduledMinutes: before.scheduledMinutes,
            recurrenceRule: before.recurrenceRule,
            dueAt: next,
          },
        });
        await prisma.taskEvent.create({
          data: { userId, taskId: recurring.id, kind: 'created', detail: { recurrenceFrom: row.id } },
        });
      }
    }
  },
  history: true,
});

export const categoryRouter = crudRouter({ delegate: 'taskCategory', create: categorySchema as any, searchFields: ['name'] });
export const habitRouter = crudRouter({ delegate: 'habit', create: habitSchema as any, update: habitSchema.partial() as any, searchFields: ['name', 'description'] });
export const habitLogRouter = crudRouter({ delegate: 'habitLog', create: habitLogSchema as any, update: habitLogSchema.partial() as any, upsertKeys: ['habitId', 'date'], onCreate: (u, d) => checkOwner(u, d, 'habitId', 'habit') });
export const reminderRouter = crudRouter({ delegate: 'reminder', create: reminderSchema as any, update: reminderSchema.partial() as any, searchFields: ['title', 'body'] });
export const reflectionRouter = crudRouter({ delegate: 'dailyReflection', create: reflectionSchema as any, update: reflectionSchema.partial() as any, upsertKeys: ['date'] });
export const wellnessRouter = crudRouter({ delegate: 'wellnessLog', create: wellnessSchema as any, update: wellnessSchema.partial() as any });
export const waterRouter = crudRouter({ delegate: 'waterLog', create: waterSchema as any, update: waterSchema.partial() as any });
export const sleepRouter = crudRouter({ delegate: 'sleepLog', create: sleepSchema as any, update: sleepSchema.partial() as any, upsertKeys: ['date'] });
export const workoutRouter = crudRouter({ delegate: 'workoutLog', create: workoutSchema as any, update: workoutSchema.partial() as any, searchFields: ['activityType', 'notes'] });
export const screenTimeRouter = crudRouter({ delegate: 'screenTimeLog', create: screenSchema as any, update: screenSchema.partial() as any, searchFields: ['category', 'appName'] });
export const foodRouter = crudRouter({ delegate: 'foodLog', create: foodSchema as any, update: foodSchema.partial() as any, searchFields: ['name', 'notes'] });
export const notificationRouter = crudRouter({ delegate: 'notification', create: notificationSchema as any, update: notificationSchema.partial() as any, searchFields: ['title', 'body'] });

export const scheduleRouter = Router();
const validateBlock = async (userId: string, input: z.infer<typeof blockSchema>, excludeId?: string) => {
  if (input.endsAt <= input.startsAt) throw new HttpError(400, 'An activity must end after it starts.', 'SCHEDULE_INVALID');
  if (input.taskId) await checkOwner(userId, input as any, 'taskId', 'task');
  const conflict = await prisma.scheduleBlock.findFirst({ where: { userId, ...(excludeId ? { id: { not: excludeId } } : {}), startsAt: { lt: input.endsAt }, endsAt: { gt: input.startsAt }, status: { not: 'cancelled' } }, select: { id: true, title: true } });
  if (conflict) throw new HttpError(409, `That time overlaps “${conflict.title}”.`, 'SCHEDULE_CONFLICT');
  const tasks = await prisma.task.findMany({ where: { userId, status: { notIn: ['CANCELLED', 'COMPLETED'] }, scheduledStart: { lt: input.endsAt }, ...(input.taskId ? { id: { not: input.taskId } } : {}) }, select: { title: true, scheduledStart: true, scheduledMinutes: true } });
  const taskConflict = tasks.find((task) => task.scheduledStart && new Date(task.scheduledStart.getTime() + task.scheduledMinutes * 60000) > input.startsAt);
  if (taskConflict) throw new HttpError(409, `That time overlaps the planned task “${taskConflict.title}”.`, 'SCHEDULE_CONFLICT');
};
scheduleRouter.get('/', async (req, res) => {
  const user = requireUser(req);
  const fromDay = typeof req.query.fromDay === 'string' && /^\d{4}-\d\d-\d\d$/.test(req.query.fromDay) ? req.query.fromDay : undefined;
  const toDay = typeof req.query.toDay === 'string' && /^\d{4}-\d\d-\d\d$/.test(req.query.toDay) ? req.query.toDay : undefined;
  const today = todayInTimezone(user.timezone);
  const defaultFrom = localDayBounds(today, user.timezone).start;
  const defaultTo = new Date(defaultFrom.getTime() + 7 * 86400000);
  const from = fromDay ? localDayBounds(fromDay, user.timezone).start : typeof req.query.from === 'string' ? new Date(req.query.from) : defaultFrom;
  const to = toDay ? localDayBounds(toDay, user.timezone).start : typeof req.query.to === 'string' ? new Date(req.query.to) : defaultTo;
  const data = await prisma.scheduleBlock.findMany({ where: { userId: user.id, startsAt: { gte: from, lt: to } }, orderBy: { startsAt: 'asc' } });
  res.json({ data });
});
scheduleRouter.post('/', async (req, res) => {
  const user = requireUser(req); const input = blockSchema.parse(req.body); await validateBlock(user.id, input);
  const data = await prisma.scheduleBlock.create({ data: { ...input, userId: user.id } }); res.status(201).json({ data });
});
scheduleRouter.patch('/:id', async (req, res) => {
  const user = requireUser(req);
  const id = String(req.params.id);
  const old = await prisma.scheduleBlock.findFirst({ where: { id, userId: user.id } });
  if (!old) throw new HttpError(404, 'That schedule block could not be found.', 'NOT_FOUND');
  const input = blockSchema.partial().parse(req.body);
  const merged = { ...old, ...input } as z.infer<typeof blockSchema>;
  await validateBlock(user.id, merged, id);
  const updated = await prisma.scheduleBlock.update({ where: { id }, data: input });

  // When a block is marked 'done', automatically mark the linked task 'COMPLETED'
  if (input.status === 'done' && updated.taskId) {
    await prisma.task.updateMany({
      where: { id: updated.taskId, userId: user.id, status: { not: 'COMPLETED' } },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  res.json({ data: updated });
});
scheduleRouter.delete('/:id', async (req, res) => { const user = requireUser(req); const result = await prisma.scheduleBlock.deleteMany({ where: { id: req.params.id, userId: user.id } }); if (!result.count) throw new HttpError(404, 'That schedule block could not be found.', 'NOT_FOUND'); res.status(204).end(); });
