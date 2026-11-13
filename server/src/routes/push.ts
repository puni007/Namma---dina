import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { HttpError } from '../lib/errors.js';
import { requireUser } from '../middleware/auth.js';

const subscriptionSchema = z.object({ endpoint: z.url().refine((value) => value.startsWith('https://'), 'Push endpoints must use HTTPS.'), keys: z.object({ p256dh: z.string().min(20).max(300), auth: z.string().min(10).max(200) }).strict() }).strict();

export const pushRouter = Router();
pushRouter.get('/key', async (_req, res) => res.json({ data: { publicKey: env.VAPID_PUBLIC_KEY ?? null } }));
pushRouter.get('/status', async (req, res) => {
  const user = requireUser(req);
  const count = await prisma.pushSubscription.count({ where: { userId: user.id } });
  res.json({ data: { configured: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY), subscriptions: count } });
});
pushRouter.post('/subscriptions', async (req, res) => {
  const user = requireUser(req);
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) throw new HttpError(409, 'Web Push is not configured on this server. Browser reminders can still work while Namma Dina is open.', 'PUSH_NOT_CONFIGURED');
  const parsed = subscriptionSchema.parse(req.body);
  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint: parsed.endpoint } });
  if (existing && existing.userId !== user.id) throw new HttpError(409, 'That browser subscription is already linked to another account.', 'PUSH_SUBSCRIPTION_EXISTS');
  const data = await prisma.pushSubscription.upsert({ where: { endpoint: parsed.endpoint }, create: { userId: user.id, endpoint: parsed.endpoint, p256dh: parsed.keys.p256dh, auth: parsed.keys.auth }, update: { p256dh: parsed.keys.p256dh, auth: parsed.keys.auth } });
  res.status(existing ? 200 : 201).json({ data: { id: data.id } });
});
pushRouter.delete('/subscriptions', async (req, res) => {
  const user = requireUser(req);
  const { endpoint } = z.object({ endpoint: z.url() }).strict().parse(req.body);
  const result = await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
  if (!result.count) throw new HttpError(404, 'That browser subscription could not be found.', 'NOT_FOUND');
  res.status(204).end();
});
