import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { verifyCsrf } from './middleware/csrf.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { prisma } from './lib/prisma.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { categoryRouter, foodRouter, habitLogRouter, habitRouter, notificationRouter, reflectionRouter, reminderRouter, scheduleRouter, screenTimeRouter, sleepRouter, taskRouter, waterRouter, wellnessRouter, workoutRouter } from './routes/resources.js';
import { insightsRouter, overviewRouter, rescheduleRouter } from './routes/intelligence.js';
import { pushRouter } from './routes/push.js';
import { breathingRouter } from './routes/breathing.js';
import { aiRouter } from './routes/ai.js';
import { assistantRouter } from './routes/assistant.js';
import { mitraRouter } from './routes/mitra.js';
import { reproductiveRouter } from './routes/reproductive.js';
import { calendarRouter, calendarFeedRouter } from './routes/calendar.js';

export const app = express();
app.disable('x-powered-by');

// Trust reverse proxies (Render, Railway, Nginx) so client IP and rate-limit counters work properly
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], baseUri: ["'self'"], fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], imgSrc: ["'self'", 'data:', 'blob:'], connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"] } } }));

const privateLanOrigin = /^http:\/\/(?:(?:10(?:\.\d{1,3}){3})|(?:192\.168(?:\.\d{1,3}){2})|(?:172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}))(?::\d{1,5})?$/;
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (origin === env.CLIENT_ORIGIN) return true;
  if (origin === 'http://localhost' || origin === 'https://localhost' || origin === 'capacitor://localhost') return true;
  if (origin.endsWith('.vercel.app')) return true;
  if (env.NODE_ENV !== 'production' && privateLanOrigin.test(origin)) return true;
  return false;
};
app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization', 'X-Client-Type']
}));

// Request logging for production observability
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.originalUrl !== '/api/health') {
      const duration = Date.now() - start;
      console.info(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

app.get('/api/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ data: { status: 'ok', database: 'connected' } });
});

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api', verifyCsrf);
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a little and try again.' } } });
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/ai', rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'AI_RATE_LIMITED', message: 'Please take a short pause before asking your AI companion again.' } } }));
app.use('/api/assistant', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use('/api/assistant', rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'ASSISTANT_RATE_LIMITED', message: 'Mitra needs a small pause. Please try again shortly.' } } }));

// Public calendar subscription feed (token authenticated, safe for external calendar apps)
app.use('/api/calendar/feed', calendarFeedRouter);

// The auth endpoints above remain public; all personal data routes require a valid session or Bearer token.
app.use('/api', authenticate);
app.use('/api/mitra', mitraRouter);
app.use('/api/reproductive', reproductiveRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/ai', aiRouter);
app.use('/api/assistant', assistantRouter);
app.use('/api/users', usersRouter);
app.use('/api/overview', overviewRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/habits', habitRouter);
app.use('/api/habit-logs', habitLogRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/reminders', reminderRouter);
app.use('/api/reflections', reflectionRouter);
app.use('/api/wellness', wellnessRouter);
app.use('/api/water', waterRouter);
app.use('/api/sleep', sleepRouter);
app.use('/api/workouts', workoutRouter);
app.use('/api/screen-time', screenTimeRouter);
app.use('/api/food', foodRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/reschedule', rescheduleRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/push', pushRouter);
app.use('/api/breathing-sessions', breathingRouter);

app.use(notFound);
app.use(errorHandler);
