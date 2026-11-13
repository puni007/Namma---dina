import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/errors.js';
import { requireUser } from '../middleware/auth.js';

type Delegate = { findMany(args: any): Promise<any[]>; findFirst(args: any): Promise<any>; create(args: any): Promise<any>; updateMany(args: any): Promise<any>; deleteMany(args: any): Promise<any>; update(args: any): Promise<any> };
type Resource = keyof typeof prisma;

function parseDay(req: Request) {
  const day = typeof req.query.date === 'string' ? req.query.date : undefined;
  if (!day || !/^\d{4}-\d\d-\d\d$/.test(day)) return undefined;
  return new Date(`${day}T00:00:00.000Z`);
}

export function crudRouter(options: {
  delegate: Resource;
  create: z.ZodObject<any>;
  update?: z.ZodType<Record<string, unknown>>;
  searchFields?: string[];
  onCreate?: (userId: string, data: Record<string, unknown>) => Promise<void>;
  onUpdate?: (userId: string, id: string, data: Record<string, unknown>) => Promise<void>;
  afterCreate?: (userId: string, row: any) => Promise<void>;
  afterUpdate?: (userId: string, before: any, data: Record<string, unknown>, row: any) => Promise<void>;
  history?: boolean;
  upsertKeys?: string[];
}) {
  const router = Router();
  const delegate = prisma[options.delegate] as unknown as Delegate;
  const updateSchema = options.update ?? options.create.partial();
  router.get('/', async (req, res) => {
    const user = requireUser(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const where: Record<string, unknown> = { userId: user.id };
    const day = parseDay(req);
    if (day) where.date = day;
    const from = typeof req.query.from === 'string' && /^\d{4}-\d\d-\d\d$/.test(req.query.from) ? new Date(`${req.query.from}T00:00:00.000Z`) : undefined;
    const to = typeof req.query.to === 'string' && /^\d{4}-\d\d-\d\d$/.test(req.query.to) ? new Date(`${req.query.to}T00:00:00.000Z`) : undefined;
    if (from || to) where.date = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    if (typeof req.query.status === 'string') where.status = req.query.status.toUpperCase();
    if (typeof req.query.state === 'string') where.state = req.query.state.toUpperCase();
    if (typeof req.query.q === 'string' && options.searchFields?.length) where.OR = options.searchFields.map((field) => ({ [field]: { contains: req.query.q, mode: 'insensitive' } }));
    const rows = await delegate.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit });
    res.json({ data: rows, meta: { page, limit } });
  });
  router.post('/', async (req, res) => {
    const user = requireUser(req);
    const data = options.create.parse(req.body) as Record<string, unknown>;
    await options.onCreate?.(user.id, data);
    const existing = options.upsertKeys?.length ? await delegate.findFirst({ where: { userId: user.id, ...Object.fromEntries(options.upsertKeys.map((key) => [key, data[key]])) } }) : null;
    if (existing) {
      const row = await delegate.update({ where: { id: existing.id }, data });
      await options.afterUpdate?.(user.id, existing, data, row);
      return res.json({ data: row });
    }
    const row = await delegate.create({ data: { ...data, userId: user.id } });
    await options.afterCreate?.(user.id, row);
    res.status(201).json({ data: row });
  });
  router.get('/:id', async (req, res) => {
    const user = requireUser(req);
    const row = await delegate.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!row) throw new HttpError(404, 'That record could not be found.', 'NOT_FOUND');
    res.json({ data: row });
  });
  if (options.history) router.get('/:id/history', async (req, res) => {
    const user = requireUser(req);
    const task = await prisma.task.findFirst({ where: { id: req.params.id, userId: user.id }, select: { id: true } });
    if (!task) throw new HttpError(404, 'That task could not be found.', 'NOT_FOUND');
    const data = await prisma.taskEvent.findMany({ where: { userId: user.id, taskId: task.id }, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({ data });
  });
  router.patch('/:id', async (req, res) => {
    const user = requireUser(req);
    const id = String(req.params.id);
    const data = updateSchema.parse(req.body) as Record<string, unknown>;
    const before = await delegate.findFirst({ where: { id, userId: user.id } });
    if (!before) throw new HttpError(404, 'That record could not be found.', 'NOT_FOUND');
    await options.onUpdate?.(user.id, id, data);
    const updateData = options.delegate === 'task' && data.status === 'COMPLETED' && data.completedAt === undefined ? { ...data, completedAt: new Date() } : data;
    const row = await delegate.update({ where: { id }, data: updateData });
    await options.afterUpdate?.(user.id, before, updateData, row);
    res.json({ data: row });
  });
  router.delete('/:id', async (req, res) => {
    const user = requireUser(req);
    const result = await delegate.deleteMany({ where: { id: req.params.id, userId: user.id } });
    if (!result.count) throw new HttpError(404, 'That record could not be found.', 'NOT_FOUND');
    res.status(204).end();
  });
  return router;
}
