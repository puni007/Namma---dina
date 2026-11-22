import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const calendarFeedRouter = Router();
export const calendarRouter = Router();

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICS(str: string): string {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export async function generateICSFeed(userId: string): Promise<string> {
  const [blocks, tasks, user] = await Promise.all([
    prisma.scheduleBlock.findMany({
      where: { userId, status: { not: 'cancelled' } },
      orderBy: { startsAt: 'asc' },
      take: 200,
    }),
    prisma.task.findMany({
      where: { userId, status: { notIn: ['CANCELLED', 'COMPLETED'] }, scheduledStart: { not: null } },
      take: 200,
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
  ]);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Namma Dina//Namma Dina Calendar Engine 1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Namma Dina - ${escapeICS(user?.displayName ?? 'My Day')}`,
    'X-WR-TIMEZONE:UTC',
  ];

  for (const block of blocks) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:block-${block.id}@nammadina.app`,
      `DTSTAMP:${formatICSDate(block.createdAt)}`,
      `DTSTART:${formatICSDate(block.startsAt)}`,
      `DTEND:${formatICSDate(block.endsAt)}`,
      `SUMMARY:${escapeICS(block.title)}`,
      block.description ? `DESCRIPTION:${escapeICS(block.description)}` : 'DESCRIPTION:Scheduled block in Namma Dina',
      `STATUS:${block.status === 'done' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT'
    );
  }

  for (const task of tasks) {
    if (!task.scheduledStart) continue;
    const end = new Date(task.scheduledStart.getTime() + task.scheduledMinutes * 60000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:task-${task.id}@nammadina.app`,
      `DTSTAMP:${formatICSDate(task.createdAt)}`,
      `DTSTART:${formatICSDate(task.scheduledStart)}`,
      `DTEND:${formatICSDate(end)}`,
      `SUMMARY:[Task] ${escapeICS(task.title)}`,
      task.description ? `DESCRIPTION:${escapeICS(task.description)}` : 'DESCRIPTION:Task scheduled in Namma Dina',
      `PRIORITY:${task.priority === 'URGENT' ? 1 : task.priority === 'HIGH' ? 3 : task.priority === 'MEDIUM' ? 5 : 9}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// Public webcal / iCal subscription feed (unauthenticated, token-protected)
calendarFeedRouter.get('/:token.ics', async (req: Request, res: Response) => {
  const token = typeof req.params.token === 'string' ? req.params.token : Array.isArray(req.params.token) ? req.params.token[0] : '';
  if (!token) {
    res.status(404).send('Calendar feed token is required.');
    return;
  }
  const sync = await prisma.calendarSync.findUnique({ where: { feedToken: token } });
  if (!sync) {
    res.status(404).send('Calendar feed not found or expired.');
    return;
  }

  const icsData = await generateICSFeed(sync.userId);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="namma-dina.ics"');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(icsData);
});

// Authenticated endpoints below:
calendarRouter.get('/sync', async (req, res) => {
  const user = requireUser(req);
  let sync = await prisma.calendarSync.findUnique({ where: { userId: user.id } });
  if (!sync) {
    sync = await prisma.calendarSync.create({
      data: {
        userId: user.id,
        provider: 'ical',
        feedToken: Math.random().toString(36).slice(2) + Date.now().toString(36),
        autoSync: true,
        syncDirection: 'bidirectional',
      },
    });
  }

  const origin = req.get('host') ? `${req.protocol}://${req.get('host')}` : env.CLIENT_ORIGIN;
  const feedUrl = `${origin}/api/calendar/feed/${sync.feedToken}.ics`;
  const webcalUrl = feedUrl.replace(/^https?:/, 'webcal:');

  res.json({
    data: {
      ...sync,
      feedUrl,
      webcalUrl,
    },
  });
});

calendarRouter.post('/sync', async (req, res) => {
  const user = requireUser(req);
  const sync = await prisma.calendarSync.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      feedToken: Math.random().toString(36).slice(2) + Date.now().toString(36),
      lastSyncedAt: new Date(),
    },
    update: {
      lastSyncedAt: new Date(),
    },
  });

  const [blocksCount, tasksCount] = await Promise.all([
    prisma.scheduleBlock.count({ where: { userId: user.id } }),
    prisma.task.count({ where: { userId: user.id, scheduledStart: { not: null } } }),
  ]);

  res.json({
    data: {
      synced: true,
      lastSyncedAt: sync.lastSyncedAt,
      stats: {
        exportedBlocks: blocksCount,
        exportedTasks: tasksCount,
      },
    },
  });
});

calendarRouter.post('/import', async (req, res) => {
  const user = requireUser(req);
  const schema = z.object({
    events: z.array(
      z.object({
        title: z.string().min(1).max(120),
        description: z.string().max(1000).optional(),
        startsAt: z.string().datetime(),
        endsAt: z.string().datetime(),
        isFixed: z.boolean().default(false),
      })
    ),
  });
  const { events } = schema.parse(req.body);

  let imported = 0;
  for (const event of events) {
    const startsAt = new Date(event.startsAt);
    const endsAt = new Date(event.endsAt);
    if (endsAt <= startsAt) continue;

    const conflict = await prisma.scheduleBlock.findFirst({
      where: {
        userId: user.id,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        status: { not: 'cancelled' },
      },
    });

    if (!conflict) {
      await prisma.scheduleBlock.create({
        data: {
          userId: user.id,
          title: event.title,
          description: event.description,
          startsAt,
          endsAt,
          isFixed: event.isFixed,
          status: 'planned',
        },
      });
      imported += 1;
    }
  }

  await prisma.calendarSync.upsert({
    where: { userId: user.id },
    create: { userId: user.id, feedToken: Math.random().toString(36).slice(2) + Date.now().toString(36), lastSyncedAt: new Date() },
    update: { lastSyncedAt: new Date() },
  });

  res.json({ data: { imported, totalSubmitted: events.length } });
});

calendarRouter.get('/export.ics', async (req, res) => {
  const user = requireUser(req);
  const icsData = await generateICSFeed(user.id);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="namma-dina-schedule.ics"');
  res.send(icsData);
});
