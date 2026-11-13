import dotenv from 'dotenv';
import path from 'node:path';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

async function main() {
  const email = process.env.SEED_DEMO_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!email || !password || password.length < 10) throw new Error('Set SEED_DEMO_EMAIL and a SEED_DEMO_PASSWORD of at least 10 characters before seeding.');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({ where: { email }, create: { email, passwordHash, displayName: 'Namma Dina', settings: { create: { goals: ['Make space for what matters'], dailyWaterGoalMl: 2000 } } }, update: { passwordHash } });
  await prisma.taskCategory.createMany({ data: [{ userId: user.id, name: 'Focus', color: '#67E8D0' }, { userId: user.id, name: 'Personal', color: '#A78BFA' }, { userId: user.id, name: 'Wellbeing', color: '#34D399' }], skipDuplicates: true });
  if (await prisma.task.count({ where: { userId: user.id } }) === 0) {
    const categories = await prisma.taskCategory.findMany({ where: { userId: user.id } });
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    const taskRows = await Promise.all([
      prisma.task.create({ data: { userId: user.id, title: 'Choose your three priorities', description: 'Give the day a gentle direction.', categoryId: categories.find((c) => c.name === 'Focus')?.id, priority: 'HIGH', status: 'COMPLETED', completedAt: now, dueAt: now, actualMinutes: 10 } }),
      prisma.task.create({ data: { userId: user.id, title: 'Take a short walk', description: 'A small reset counts.', categoryId: categories.find((c) => c.name === 'Wellbeing')?.id, priority: 'MEDIUM', scheduledStart: new Date(now.getTime() + 2 * 3600000), scheduledMinutes: 20 } }),
      prisma.task.create({ data: { userId: user.id, title: 'Prepare for tomorrow', categoryId: categories.find((c) => c.name === 'Personal')?.id, priority: 'LOW', dueAt: tomorrow } }),
    ]);
    await Promise.all(taskRows.map((task) => prisma.taskEvent.create({ data: { userId: user.id, taskId: task.id, kind: task.status === 'COMPLETED' ? 'completed' : 'created' } })));
    const habitRows = await Promise.all([
      prisma.habit.create({ data: { userId: user.id, name: 'Move a little', targetValue: 1, targetUnit: 'session', flexible: true } }),
      prisma.habit.create({ data: { userId: user.id, name: 'Read', targetValue: 10, targetUnit: 'minutes', flexible: true } }),
      prisma.habit.create({ data: { userId: user.id, name: 'Drink water', targetValue: 6, targetUnit: 'glasses', flexible: true } }),
    ]);
    await prisma.habitLog.createMany({ data: [{ userId: user.id, habitId: habitRows[1]!.id, date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), value: 10 }] });
    await prisma.waterLog.create({ data: { userId: user.id, date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), amountMl: 350 } });
    await prisma.screenTimeLog.create({ data: { userId: user.id, date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), category: 'Social', minutes: 25, distractionCount: 2 } });
    await prisma.foodLog.create({ data: { userId: user.id, name: 'Lunch', kind: 'HOME', spendCents: 0 } });
  }
  console.info(`Seeded Namma Dina data for ${email}.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
