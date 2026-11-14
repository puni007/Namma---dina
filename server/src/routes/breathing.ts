import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { parseDateOnly, todayInTimezone } from '../lib/dates.js';
import { HttpError } from '../lib/errors.js';
import { requireUser } from '../middleware/auth.js';

const sessionSchema = z.object({
  durationMinutes: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  inhaleSeconds: z.number().int().min(2).max(10),
  holdSeconds: z.number().int().min(0).max(10),
  exhaleSeconds: z.number().int().min(2).max(10),
  startedAt: z.coerce.date(),
}).strict();

export const breathingRouter = Router();

breathingRouter.get('/', async (req, res) => {
  const user = requireUser(req);
  const today = todayInTimezone(user.timezone);
  const from = typeof req.query.from === 'string' && /^\d{4}-\d\d-\d\d$/.test(req.query.from)
    ? req.query.from
    : new Date(parseDateOnly(today).getTime() - 6 * 86400000).toISOString().slice(0, 10);
  const to = typeof req.query.to === 'string' && /^\d{4}-\d\d-\d\d$/.test(req.query.to)
    ? req.query.to
    : today;
  const rows = await prisma.breathingSession.findMany({
    where: { userId: user.id, date: { gte: parseDateOnly(from), lte: parseDateOnly(to) } },
    orderBy: { completedAt: 'desc' },
    take: Math.min(100, Math.max(1, Number(req.query.limit) || 50)),
  });
  res.json({ data: rows });
});

breathingRouter.post('/', async (req, res) => {
  const user = requireUser(req);
  const input = sessionSchema.parse(req.body);
  const completedAt = new Date();
  const elapsedMs = completedAt.getTime() - input.startedAt.getTime();
  if (input.startedAt.getTime() > completedAt.getTime() + 2000 || elapsedMs < input.durationMinutes * 60_000 - 5000) {
    throw new HttpError(400, 'A session can be saved after its timer finishes.', 'SESSION_NOT_COMPLETE');
  }

  const row = await prisma.breathingSession.create({
    data: {
      userId: user.id,
      date: parseDateOnly(todayInTimezone(user.timezone, completedAt)),
      durationMinutes: input.durationMinutes,
      inhaleSeconds: input.inhaleSeconds,
      holdSeconds: input.holdSeconds,
      exhaleSeconds: input.exhaleSeconds,
      startedAt: input.startedAt,
      completedAt,
    },
  });
  res.status(201).json({ data: row });
});
