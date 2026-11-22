import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../middleware/auth.js';
import { localDayBounds, todayInTimezone } from '../lib/dates.js';

export const mitraRouter = Router();

export function xpForLevel(level: number): number {
  return Math.max(50, level * 50);
}

export function computeStage(level: number): 'ember' | 'flame' | 'radiance' | 'aurora' {
  if (level >= 30) return 'aurora';
  if (level >= 15) return 'radiance';
  if (level >= 5) return 'flame';
  return 'ember';
}

export async function getOrCreateMitraState(userId: string) {
  let state = await prisma.mitraState.findUnique({ where: { userId } });
  if (!state) {
    state = await prisma.mitraState.create({
      data: {
        userId,
        level: 1,
        xp: 0,
        totalXp: 0,
        evolutionStage: 'ember',
        mood: 'happy',
        flameColor: 'aurora-mint',
        streakDays: 1,
        tasksCompleted: 0,
      },
    });
  }
  return state;
}

export async function awardMitraXP(userId: string, amount: number, reason: string) {
  const state = await getOrCreateMitraState(userId);
  let newXp = state.xp + amount;
  const newTotal = state.totalXp + amount;
  let newLevel = state.level;
  let leveledUp = false;
  const isTask = reason === 'task_complete';

  while (newXp >= xpForLevel(newLevel)) {
    newXp -= xpForLevel(newLevel);
    newLevel += 1;
    leveledUp = true;
  }

  const newStage = computeStage(newLevel);
  const updated = await prisma.mitraState.update({
    where: { userId },
    data: {
      xp: newXp,
      totalXp: newTotal,
      level: newLevel,
      evolutionStage: newStage,
      tasksCompleted: isTask ? { increment: 1 } : undefined,
      lastLevelUpAt: leveledUp ? new Date() : undefined,
      lastInteractedAt: new Date(),
      mood: leveledUp ? 'celebrating' : state.mood,
    },
  });

  return { state: updated, leveledUp, previousLevel: state.level };
}

mitraRouter.get('/state', async (req, res) => {
  const user = requireUser(req);
  const state = await getOrCreateMitraState(user.id);
  const requiredXp = xpForLevel(state.level);
  const progressPercent = Math.min(100, Math.round((state.xp / requiredXp) * 100));

  res.json({
    data: {
      ...state,
      requiredXp,
      progressPercent,
      stageTitle:
        state.evolutionStage === 'aurora'
          ? 'Aurora Sovereign Flame'
          : state.evolutionStage === 'radiance'
            ? 'Radiant Aurora Flame'
            : state.evolutionStage === 'flame'
              ? 'Tender Dancing Flame'
              : 'Gentle Glowing Ember',
    },
  });
});

mitraRouter.post('/xp', async (req, res) => {
  const user = requireUser(req);
  const schema = z.object({
    amount: z.number().int().min(1).max(500).default(10),
    reason: z.enum(['task_complete', 'habit_check', 'reflection', 'breathing', 'water', 'custom']).default('custom'),
  });
  const { amount, reason } = schema.parse(req.body);
  const result = await awardMitraXP(user.id, amount, reason);
  res.json({ data: result });
});

mitraRouter.post('/mood', async (req, res) => {
  const user = requireUser(req);
  const schema = z.object({
    mood: z.enum(['idle', 'happy', 'thinking', 'listening', 'sleepy', 'celebrating', 'concerned']),
  });
  const { mood } = schema.parse(req.body);
  const updated = await prisma.mitraState.update({
    where: { userId: user.id },
    data: { mood, lastInteractedAt: new Date() },
  });
  res.json({ data: updated });
});

mitraRouter.get('/wellness-recommendations', async (req, res) => {
  const user = requireUser(req);
  const bounds = localDayBounds(todayInTimezone(user.timezone), user.timezone);

  const [water, sleep, workout, reflection, tasks, habits, reproductive] = await Promise.all([
    prisma.waterLog.aggregate({
      where: { userId: user.id, date: bounds.start },
      _sum: { amountMl: true },
    }),
    prisma.sleepLog.findFirst({
      where: { userId: user.id, date: bounds.start },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.workoutLog.findMany({
      where: { userId: user.id, loggedAt: { gte: bounds.start, lt: bounds.end } },
    }),
    prisma.dailyReflection.findFirst({
      where: { userId: user.id, date: bounds.start },
    }),
    prisma.task.count({
      where: { userId: user.id, status: 'PENDING' },
    }),
    prisma.habitLog.count({
      where: { userId: user.id, date: bounds.start },
    }),
    prisma.reproductiveProfile.findUnique({
      where: { userId: user.id },
      include: {
        entries: {
          where: { date: bounds.start },
          take: 1,
        },
      },
    }),
  ]);

  const waterTotal = water._sum.amountMl ?? 0;
  const recommendations: Array<{ id: string; category: string; message: string; messageKn: string; actionUrl?: string }> = [];

  // Hydration recommendation
  if (waterTotal < 1000) {
    recommendations.push({
      id: 'water-low',
      category: 'hydration',
      message: 'A quiet sip of water can refresh your pace right now.',
      messageKn: 'ಒಂದು ಗುಟುಕು ನೀರು ನಿಮ್ಮ ದಿನಕ್ಕೆ ಚೈತನ್ಯ ನೀಡಬಲ್ಲದು.',
      actionUrl: '/app/wellness',
    });
  } else if (waterTotal >= 2000) {
    recommendations.push({
      id: 'water-good',
      category: 'hydration',
      message: 'You have stayed well hydrated today. Wonderful care for your body.',
      messageKn: 'ನೀವು ಇಂದು ಸಾಕಷ್ಟು ನೀರು ಕುಡಿದಿದ್ದೀರಿ. ನಿಮ್ಮ ದೇಹದ ಮೇಲಿನ ಉತ್ತಮ ಕಾಳಜಿ.',
    });
  }

  // Sleep recommendation
  if (sleep && sleep.durationMins < 360) {
    recommendations.push({
      id: 'sleep-short',
      category: 'rest',
      message: 'You rested under 6 hours last night. Be gentle with your task load today.',
      messageKn: 'ಕಳೆದ ರಾತ್ರಿ ನಿಮಗೆ 6 ಗಂಟೆಗಿಂತ ಕಡಿಮೆ ನಿದ್ರೆ ಸಿಕ್ಕಿದೆ. ಇಂದು ನಿಧಾನವಾಗಿ ಕೆಲಸ ಮಾಡಿ.',
      actionUrl: '/app/wellness/breathe',
    });
  }

  // Task balance
  if (tasks > 7) {
    recommendations.push({
      id: 'tasks-high',
      category: 'pacing',
      message: `You have ${tasks} pending tasks. Remember: picking just one small priority is enough progress.`,
      messageKn: `${tasks} ಬಾಕಿ ಕೆಲಸಗಳಿವೆ. ಕೇವಲ ಒಂದು ಮುಖ್ಯ ಕೆಲಸ ಆರಿಸಿಕೊಳ್ಳುವುದು ಸಾಕು.`,
      actionUrl: '/app/tasks',
    });
  }

  // Specialized Reproductive / Pregnancy Mode Recommendations
  if (reproductive && reproductive.consentGiven) {
    if (reproductive.mode === 'pregnancy') {
      recommendations.push({
        id: 'pregnancy-rest',
        category: 'maternal-care',
        message: 'Pregnancy journey: rest your feet, keep hydrated, and take small pauses throughout your day.',
        messageKn: 'ಗರ್ಭಾವಸ್ಥೆಯ ಕ್ಷಣಗಳು: ಸಾಕಷ್ಟು ನೀರು ಕುಡಿಯಿರಿ, ಕಾಲುಗಳಿಗೆ ವಿಶ್ರಾಂತಿ ನೀಡಿ ಮತ್ತು ಸಣ್ಣ ವಿರಾಮ ತೆಗೆದುಕೊಳ್ಳಿ.',
        actionUrl: '/app/cycle',
      });
    } else if (reproductive.mode === 'cycle') {
      const entry = reproductive.entries[0];
      if (entry?.phase === 'menstrual') {
        recommendations.push({
          id: 'cycle-menstrual',
          category: 'cycle-care',
          message: 'Menstrual phase: warmth, gentle stretches, and warm herbal tea support your body best today.',
          messageKn: 'ಮುಟ್ಟಿನ ಹಂತ: ಬೆಚ್ಚಗಿನ ವಾತಾವರಣ, ನಿಧಾನ ಚಲನೆ ಮತ್ತು ವಿಶ್ರಾಂತಿ ನಿಮ್ಮ ದೇಹಕ್ಕೆ ಒಳ್ಳೆಯದು.',
          actionUrl: '/app/cycle',
        });
      } else if (entry?.phase === 'luteal') {
        recommendations.push({
          id: 'cycle-luteal',
          category: 'cycle-care',
          message: 'Luteal phase: energy naturally turns inward. Allow yourself extra grace and early rest.',
          messageKn: 'ಲ್ಯೂಟಿಯಲ್ ಹಂತ: ಶಕ್ತಿ ಸಹಜವಾಗಿ ಕಡಿಮೆಯಾಗಬಹುದು. ಬೇಗ ನಿದ್ರಿಸಲು ಪ್ರಯತ್ನಿಸಿ.',
          actionUrl: '/app/cycle',
        });
      }
    }
  }

  // Fallback if doing great
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'flow-good',
      category: 'presence',
      message: 'Your day has a balanced rhythm. Enjoy this moment and take each step with ease.',
      messageKn: 'ನಿಮ್ಮ ದಿನ ಸುಂದರ ಲಯದಲ್ಲಿದೆ. ಈ ಕ್ಷಣವನ್ನು ಆನಂದಿಸಿ ಮತ್ತು ಶಾಂತವಾಗಿ ಮುನ್ನಡೆಯಿರಿ.',
    });
  }

  res.json({
    data: {
      recommendations,
      stats: {
        waterTotal,
        sleepHours: sleep ? +(sleep.durationMins / 60).toFixed(1) : null,
        workoutsLogged: workout.length,
        habitsChecked: habits,
        pendingTasks: tasks,
        hasReflection: Boolean(reflection),
      },
    },
  });
});
