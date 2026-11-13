import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Agent } from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

type UserAgent = { agent: Agent; csrf: string; email: string; password: string };
const users: UserAgent[] = [];

async function register(name: string): Promise<UserAgent> {
  const email = `${name}-${randomUUID()}@test.namma-dina.local`;
  const password = 'SafeTestPass!2026';
  const agent = request.agent(app);
  const csrf = await agent.get('/api/auth/csrf').expect(200).then((res) => res.body.csrfToken as string);
  await agent.post('/api/auth/register').set('X-CSRF-Token', csrf).send({ email, password, displayName: name }).expect(201);
  const user = { agent, csrf, email, password };
  users.push(user);
  return user;
}

function mutate(agent: Agent, csrf: string) {
  return {
    post: (url: string) => agent.post(url).set('X-CSRF-Token', csrf),
    patch: (url: string) => agent.patch(url).set('X-CSRF-Token', csrf),
    delete: (url: string) => agent.delete(url).set('X-CSRF-Token', csrf),
  };
}

describe('authenticated API and ownership', () => {
  let alice: UserAgent;
  let bob: UserAgent;

  beforeAll(async () => {
    await prisma.$connect();
    alice = await register('Alice');
    bob = await register('Bob');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@test.namma-dina.local' } } });
    await prisma.$disconnect();
  });

  it('hashes passwords and returns the current authenticated profile', async () => {
    const me = await alice.agent.get('/api/auth/me').expect(200);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: me.body.data.id as string } });
    expect(row.passwordHash).not.toBe(alice.password);
    expect(row.passwordHash.startsWith('$2')).toBe(true);
    expect(await bcrypt.compare(alice.password, row.passwordHash)).toBe(true);
    expect(me.body.data.email).toBe(alice.email.toLowerCase());
  });

  it('rejects CSRF-less writes and validates task input', async () => {
    await request(app).post('/api/tasks').send({ title: 'No token' }).expect(403);
    await mutate(alice.agent, alice.csrf).post('/api/tasks').send({ title: '' }).expect(400);
  });

  it('provides task CRUD and history while isolating another account', async () => {
    const mutation = mutate(alice.agent, alice.csrf);
    const created = await mutation.post('/api/tasks').send({ title: 'Read a chapter', priority: 'HIGH', scheduledMinutes: 25 }).expect(201);
    const taskId = created.body.data.id as string;
    expect(created.body.data.userId).toBeDefined();
    const list = await alice.agent.get('/api/tasks').expect(200);
    expect(list.body.data.some((row: { id: string }) => row.id === taskId)).toBe(true);
    await bob.agent.get(`/api/tasks/${taskId}`).expect(404);
    expect((await bob.agent.get('/api/tasks').expect(200)).body.data).toHaveLength(0);
    const completed = await mutation.patch(`/api/tasks/${taskId}`).send({ status: 'COMPLETED' }).expect(200);
    expect(completed.body.data.completedAt).toBeTruthy();
    const history = await alice.agent.get(`/api/tasks/${taskId}/history`).expect(200);
    expect(history.body.data.map((event: { kind: string }) => event.kind)).toContain('completed');
    await mutation.delete(`/api/tasks/${taskId}`).expect(204);
    await alice.agent.get(`/api/tasks/${taskId}`).expect(404);
  });

  it('rejects overlapping schedule blocks and upserts a daily habit log', async () => {
    const mutation = mutate(alice.agent, alice.csrf);
    const start = new Date(Date.now() + 2 * 86400000);
    start.setMinutes(0, 0, 0);
    const block = { title: 'Focus time', startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 60 * 60000).toISOString() };
    await mutation.post('/api/schedule').send(block).expect(201);
    await mutation.post('/api/schedule').send({ ...block, title: 'Overlap', startsAt: new Date(start.getTime() + 15 * 60000).toISOString(), endsAt: new Date(start.getTime() + 45 * 60000).toISOString() }).expect(409);

    const habit = await mutation.post('/api/habits').send({ name: 'Stretch', frequency: 'DAILY', targetValue: 10, targetUnit: 'minutes' }).expect(201);
    const date = new Date().toISOString().slice(0, 10);
    const first = await mutation.post('/api/habit-logs').send({ habitId: habit.body.data.id, date, value: 5 }).expect(201);
    const second = await mutation.post('/api/habit-logs').send({ habitId: habit.body.data.id, date, value: 10 }).expect(200);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(second.body.data.value).toBe(10);
  });

  it('synchronizes completion status bidirectionally between tasks and schedule blocks', async () => {
    const mutation = mutate(alice.agent, alice.csrf);
    // 1. Task completed -> updates linked planned block to 'done'
    const taskRes = await mutation.post('/api/tasks').send({ title: 'Task with block', priority: 'MEDIUM' }).expect(201);
    const taskId = taskRes.body.data.id as string;
    const start = new Date(Date.now() + 5 * 86400000);
    start.setHours(12, 0, 0, 0);
    const blockRes = await mutation.post('/api/schedule').send({
      taskId,
      title: 'Task block',
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 30 * 60000).toISOString(),
    }).expect(201);
    const blockId = blockRes.body.data.id as string;
    expect(blockRes.body.data.status).toBe('planned');

    await mutation.patch(`/api/tasks/${taskId}`).send({ status: 'COMPLETED' }).expect(200);
    const updatedBlock = await alice.agent.get(`/api/schedule?fromDay=${start.toISOString().slice(0, 10)}&toDay=${new Date(start.getTime() + 2 * 86400000).toISOString().slice(0, 10)}`).expect(200);
    const matchingBlock = updatedBlock.body.data.find((b: { id: string }) => b.id === blockId);
    expect(matchingBlock?.status).toBe('done');

    // 2. Schedule block completed -> updates linked task to 'COMPLETED'
    const taskRes2 = await mutation.post('/api/tasks').send({ title: 'Task 2 with block', priority: 'LOW' }).expect(201);
    const taskId2 = taskRes2.body.data.id as string;
    const start2 = new Date(Date.now() + 6 * 86400000);
    start2.setHours(12, 0, 0, 0);
    const blockRes2 = await mutation.post('/api/schedule').send({
      taskId: taskId2,
      title: 'Task 2 block',
      startsAt: start2.toISOString(),
      endsAt: new Date(start2.getTime() + 30 * 60000).toISOString(),
    }).expect(201);
    const blockId2 = blockRes2.body.data.id as string;

    await mutation.patch(`/api/schedule/${blockId2}`).send({ status: 'done' }).expect(200);
    const updatedTask2 = await alice.agent.get(`/api/tasks/${taskId2}`).expect(200);
    expect(updatedTask2.body.data.status).toBe('COMPLETED');
    expect(updatedTask2.body.data.completedAt).toBeTruthy();
  });

  it('exports user data and imports backup records', async () => {
    const mutation = mutate(alice.agent, alice.csrf);
    const exportRes = await alice.agent.get('/api/users/export').expect(200);
    expect(exportRes.body.profile).toBeDefined();
    expect(Array.isArray(exportRes.body.tasks)).toBe(true);

    const backupPayload = {
      profile: { categories: [{ name: 'Reading', color: '#67E8D0' }] },
      tasks: [{ title: 'Imported task test', priority: 'HIGH', scheduledMinutes: 45 }],
      habits: [{ name: 'Daily Water', targetValue: 8, targetUnit: 'glasses', frequency: 'DAILY' }],
      reminders: [{ title: 'Evening check-in', dueAt: new Date().toISOString() }],
    };

    const importRes = await mutation.post('/api/users/import').send(backupPayload).expect(200);
    expect(importRes.body.data.success).toBe(true);
    expect(importRes.body.data.importedTasks).toBe(1);
    expect(importRes.body.data.importedHabits).toBe(1);
    expect(importRes.body.data.importedReminders).toBe(1);

    const taskList = await alice.agent.get('/api/tasks?q=Imported').expect(200);
    expect(taskList.body.data.some((t: { title: string }) => t.title === 'Imported task test')).toBe(true);
  });

  it('revokes the session on logout', async () => {
    await mutate(bob.agent, bob.csrf).post('/api/auth/logout').expect(204);
    await bob.agent.get('/api/auth/me').expect(401);
  });

  it('supports native Bearer token auth, token endpoint, refresh, and CSRF-free calls', async () => {
    // 1. Authenticate via POST /api/auth/token
    const tokenRes = await request(app)
      .post('/api/auth/token')
      .set('X-Client-Type', 'native')
      .send({ email: alice.email, password: alice.password })
      .expect(200);

    const { tokens, user } = tokenRes.body.data;
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(user.email).toBe(alice.email.toLowerCase());

    // 2. Make authenticated API call with Bearer token (no cookies, no CSRF token)
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);
    expect(meRes.body.data.id).toBe(user.id);

    // 3. Make mutating request with Bearer token (no CSRF token required)
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ title: 'Bearer Task', priority: 'LOW' })
      .expect(201);
    expect(taskRes.body.data.title).toBe('Bearer Task');

    // 4. Refresh token flow
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('X-Client-Type', 'native')
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);
    const newTokens = refreshRes.body.data.tokens;
    expect(newTokens.accessToken).toBeDefined();
    expect(newTokens.refreshToken).toBeDefined();

    // 5. Use new access token
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${newTokens.accessToken}`)
      .expect(200);

    // 6. Refresh tokens cannot be used as access tokens
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${newTokens.refreshToken}`)
      .expect(401);
  });
});
