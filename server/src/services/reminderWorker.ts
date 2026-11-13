import webpush from 'web-push';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { nextLocalReminderDate } from '../lib/dates.js';

let running = false;
let configured = false;

function configurePush() {
  if (configured) return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  configured = true;
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

async function pushToUser(userId: string, payload: { title: string; body: string; id: string }) {
  if (!configurePush()) return;
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload));
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await prisma.pushSubscription.deleteMany({ where: { id: subscription.id, userId } });
      else console.warn('Web Push delivery failed for one subscription.', status ?? 'unknown');
    }
  }));
}

export async function processDueReminders(now = new Date()) {
  if (running) return;
  running = true;
  try {
    const reminders = await prisma.reminder.findMany({ where: { state: 'ACTIVE', dueAt: { lte: now } }, orderBy: { dueAt: 'asc' }, take: 100, include: { user: { select: { timezone: true, settings: { select: { notificationPreferences: true } } } } } });
    for (const reminder of reminders) {
      const nextDate = reminder.recurrence ? nextLocalReminderDate(reminder.dueAt, reminder.user.timezone, reminder.recurrence) : null;
      let next = nextDate;
      while (next && next <= now) next = nextLocalReminderDate(next, reminder.user.timezone, reminder.recurrence!);
      try {
        const notification = await prisma.$transaction(async (tx) => {
          const updated = await tx.reminder.updateMany({ where: { id: reminder.id, userId: reminder.userId, state: 'ACTIVE', dueAt: reminder.dueAt }, data: { state: next ? 'ACTIVE' : 'DONE', dueAt: next ?? reminder.dueAt, notifiedAt: now } });
          if (!updated.count) return null;
          return tx.notification.create({ data: { userId: reminder.userId, title: reminder.title, body: reminder.body ?? 'A gentle nudge for the day.', kind: 'reminder' } });
        });
        const preferences = reminder.user.settings?.notificationPreferences as Record<string, unknown> | undefined;
        if (notification && preferences?.reminders !== false) await pushToUser(reminder.userId, { id: notification.id, title: notification.title, body: notification.body });
      } catch (error) {
        console.error('A due reminder could not be delivered.', error);
      }
    }
  } finally { running = false; }
}

export function startReminderWorker() {
  void processDueReminders();
  const timer = setInterval(() => void processDueReminders(), 30_000);
  timer.unref();
  return () => clearInterval(timer);
}
