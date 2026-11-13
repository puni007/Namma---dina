import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { startReminderWorker } from './services/reminderWorker.js';

startReminderWorker();
const server = app.listen(env.PORT, '0.0.0.0', () => console.info(`Namma Dina API listening on http://0.0.0.0:${env.PORT}`));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
