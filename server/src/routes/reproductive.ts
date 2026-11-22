import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../middleware/auth.js';
import { HttpError } from '../lib/errors.js';
import { decryptHealthData, decryptJson, encryptHealthData, encryptJson } from '../lib/crypto.js';

export const reproductiveRouter = Router();

function calculateCyclePhase(dayOfCycle: number, cycleLength: number, periodLength: number): string {
  if (dayOfCycle <= periodLength) return 'menstrual';
  const ovulationDay = Math.round(cycleLength - 14);
  if (dayOfCycle < ovulationDay - 4) return 'follicular';
  if (dayOfCycle <= ovulationDay + 1) return 'ovulatory';
  return 'luteal';
}

function calculatePregnancyWeeks(pregnantSince: Date, targetDate: Date = new Date()) {
  const diffDays = Math.max(0, Math.floor((targetDate.getTime() - pregnantSince.getTime()) / (1000 * 60 * 60 * 24)));
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;
  const trimester = weeks < 13 ? 1 : weeks < 27 ? 2 : 3;
  return { weeks, days, trimester, totalDays: diffDays };
}

reproductiveRouter.get('/profile', async (req, res) => {
  const user = requireUser(req);
  const profile = await prisma.reproductiveProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile || !profile.consentGiven) {
    return res.json({
      data: {
        consentGiven: false,
        mode: profile?.mode ?? 'cycle',
      },
    });
  }

  // Calculate dynamic cycle stats
  let cycleStats = null;
  if (profile.mode === 'cycle' && profile.lastPeriodStart) {
    const today = new Date();
    const periodStart = new Date(profile.lastPeriodStart);
    const dayDiff = Math.floor((today.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const currentDayOfCycle = (dayDiff % profile.cycleLengthDays) + 1;
    const currentPhase = calculateCyclePhase(currentDayOfCycle, profile.cycleLengthDays, profile.periodLengthDays);
    const nextPeriodDate = new Date(periodStart.getTime() + (Math.floor(dayDiff / profile.cycleLengthDays) + 1) * profile.cycleLengthDays * 86400000);

    cycleStats = {
      currentDayOfCycle,
      currentPhase,
      nextPeriodDate: nextPeriodDate.toISOString().slice(0, 10),
      daysUntilNextPeriod: Math.max(0, Math.ceil((nextPeriodDate.getTime() - today.getTime()) / 86400000)),
    };
  } else if (profile.mode === 'pregnancy' && profile.pregnantSince) {
    const stats = calculatePregnancyWeeks(profile.pregnantSince);
    cycleStats = {
      gestationalWeeks: stats.weeks,
      gestationalDays: stats.days,
      trimester: stats.trimester,
      estimatedDueDate: profile.estimatedDueDate?.toISOString().slice(0, 10),
    };
  }

  res.json({
    data: {
      id: profile.id,
      mode: profile.mode,
      consentGiven: profile.consentGiven,
      cycleLengthDays: profile.cycleLengthDays,
      periodLengthDays: profile.periodLengthDays,
      lastPeriodStart: profile.lastPeriodStart?.toISOString().slice(0, 10) ?? null,
      pregnantSince: profile.pregnantSince?.toISOString().slice(0, 10) ?? null,
      estimatedDueDate: profile.estimatedDueDate?.toISOString().slice(0, 10) ?? null,
      notes: decryptHealthData(profile.encryptedNotes),
      cycleStats,
    },
  });
});

reproductiveRouter.post('/consent', async (req, res) => {
  const user = requireUser(req);
  const schema = z.object({ consent: z.boolean() });
  const { consent } = schema.parse(req.body);

  if (!consent) {
    // Right to be forgotten: immediately wipe all health logs
    const existing = await prisma.reproductiveProfile.findUnique({ where: { userId: user.id } });
    if (existing) {
      await prisma.cycleEntry.deleteMany({ where: { profileId: existing.id } });
      await prisma.reproductiveProfile.delete({ where: { userId: user.id } });
    }
    return res.json({ data: { consentGiven: false, message: 'All reproductive and health data has been permanently deleted.' } });
  }

  const profile = await prisma.reproductiveProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      consentGiven: true,
      consentGivenAt: new Date(),
    },
    update: {
      consentGiven: true,
      consentGivenAt: new Date(),
    },
  });

  res.json({ data: { consentGiven: profile.consentGiven, mode: profile.mode } });
});

reproductiveRouter.patch('/profile', async (req, res) => {
  const user = requireUser(req);
  const schema = z.object({
    mode: z.enum(['cycle', 'pregnancy', 'postpartum', 'pause']).optional(),
    cycleLengthDays: z.number().int().min(20).max(45).optional(),
    periodLengthDays: z.number().int().min(2).max(10).optional(),
    lastPeriodStart: z.string().regex(/^\d{4}-\d\d-\d\d$/).nullable().optional(),
    pregnantSince: z.string().regex(/^\d{4}-\d\d-\d\d$/).nullable().optional(),
    estimatedDueDate: z.string().regex(/^\d{4}-\d\d-\d\d$/).nullable().optional(),
    notes: z.string().max(2000).optional(),
  });
  const data = schema.parse(req.body);

  const existing = await prisma.reproductiveProfile.findUnique({ where: { userId: user.id } });
  if (!existing || !existing.consentGiven) {
    throw new HttpError(403, 'Consent is required before configuring reproductive tracking.', 'CONSENT_REQUIRED');
  }

  const updated = await prisma.reproductiveProfile.update({
    where: { userId: user.id },
    data: {
      ...(data.mode ? { mode: data.mode } : {}),
      ...(data.cycleLengthDays !== undefined ? { cycleLengthDays: data.cycleLengthDays } : {}),
      ...(data.periodLengthDays !== undefined ? { periodLengthDays: data.periodLengthDays } : {}),
      ...(data.lastPeriodStart !== undefined ? { lastPeriodStart: data.lastPeriodStart ? new Date(data.lastPeriodStart) : null } : {}),
      ...(data.pregnantSince !== undefined ? { pregnantSince: data.pregnantSince ? new Date(data.pregnantSince) : null } : {}),
      ...(data.estimatedDueDate !== undefined ? { estimatedDueDate: data.estimatedDueDate ? new Date(data.estimatedDueDate) : null } : {}),
      ...(data.notes !== undefined ? { encryptedNotes: encryptHealthData(data.notes) } : {}),
    },
  });

  res.json({
    data: {
      ...updated,
      notes: data.notes ?? decryptHealthData(updated.encryptedNotes),
    },
  });
});

reproductiveRouter.get('/entries', async (req, res) => {
  const user = requireUser(req);
  const profile = await prisma.reproductiveProfile.findUnique({ where: { userId: user.id } });
  if (!profile || !profile.consentGiven) {
    return res.json({ data: [] });
  }

  const from = typeof req.query.from === 'string' && /^\d{4}-\d\d-\d\d$/.test(req.query.from) ? new Date(req.query.from) : undefined;
  const to = typeof req.query.to === 'string' && /^\d{4}-\d\d-\d\d$/.test(req.query.to) ? new Date(req.query.to) : undefined;

  const entries = await prisma.cycleEntry.findMany({
    where: {
      profileId: profile.id,
      date: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    },
    orderBy: { date: 'desc' },
    take: 60,
  });

  const decryptedEntries = entries.map((entry) => ({
    id: entry.id,
    date: entry.date.toISOString().slice(0, 10),
    phase: entry.phase,
    flowIntensity: entry.flowIntensity,
    symptoms: decryptJson<string[]>(entry.encryptedSymptoms, []),
    mood: decryptHealthData(entry.encryptedMood),
    notes: decryptHealthData(entry.notesEncrypted),
    temperatureCelsius: entry.temperatureCelsius,
    fetalMovementCount: entry.fetalMovementCount,
  }));

  res.json({ data: decryptedEntries });
});

reproductiveRouter.post('/entry', async (req, res) => {
  const user = requireUser(req);
  const profile = await prisma.reproductiveProfile.findUnique({ where: { userId: user.id } });
  if (!profile || !profile.consentGiven) {
    throw new HttpError(403, 'Consent is required before saving reproductive log entries.', 'CONSENT_REQUIRED');
  }

  const entrySchema = z.object({
    date: z.string().regex(/^\d{4}-\d\d-\d\d$/),
    phase: z.string().optional(),
    flowIntensity: z.enum(['none', 'spotting', 'light', 'medium', 'heavy']).optional(),
    symptoms: z.array(z.string().max(50)).optional(),
    mood: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
    temperatureCelsius: z.number().min(34).max(42).optional(),
    fetalMovementCount: z.number().int().min(0).max(100).optional(),
  });
  const input = entrySchema.parse(req.body);

  const entryDate = new Date(input.date);
  const entry = await prisma.cycleEntry.upsert({
    where: {
      profileId_date: {
        profileId: profile.id,
        date: entryDate,
      },
    },
    create: {
      profileId: profile.id,
      date: entryDate,
      phase: input.phase,
      flowIntensity: input.flowIntensity,
      encryptedSymptoms: input.symptoms ? encryptJson(input.symptoms) : null,
      encryptedMood: input.mood ? encryptHealthData(input.mood) : null,
      notesEncrypted: input.notes ? encryptHealthData(input.notes) : null,
      temperatureCelsius: input.temperatureCelsius,
      fetalMovementCount: input.fetalMovementCount,
    },
    update: {
      phase: input.phase,
      flowIntensity: input.flowIntensity,
      encryptedSymptoms: input.symptoms ? encryptJson(input.symptoms) : undefined,
      encryptedMood: input.mood ? encryptHealthData(input.mood) : undefined,
      notesEncrypted: input.notes ? encryptHealthData(input.notes) : undefined,
      temperatureCelsius: input.temperatureCelsius,
      fetalMovementCount: input.fetalMovementCount,
    },
  });

  res.json({
    data: {
      id: entry.id,
      date: input.date,
      phase: entry.phase,
      flowIntensity: entry.flowIntensity,
      symptoms: input.symptoms ?? [],
      mood: input.mood ?? '',
      notes: input.notes ?? '',
      temperatureCelsius: entry.temperatureCelsius,
      fetalMovementCount: entry.fetalMovementCount,
    },
  });
});

reproductiveRouter.delete('/data', async (req, res) => {
  const user = requireUser(req);
  const existing = await prisma.reproductiveProfile.findUnique({ where: { userId: user.id } });
  if (existing) {
    await prisma.cycleEntry.deleteMany({ where: { profileId: existing.id } });
    await prisma.reproductiveProfile.delete({ where: { userId: user.id } });
  }
  res.status(204).end();
});
