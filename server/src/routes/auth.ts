import { Router, type Response } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { env, isProduction } from '../config/env.js';
import { HttpError } from '../lib/errors.js';
import { authenticate, requireUser } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { issueCsrf } from '../middleware/csrf.js';
import { emailIsConfigured, sendPasswordReset } from '../services/mailer.js';

const attributionSchema = z.object({ source: z.string().max(200).optional(), medium: z.string().max(200).optional(), campaign: z.string().max(200).optional(), term: z.string().max(200).optional(), content: z.string().max(200).optional(), capturedAt: z.iso.datetime().optional() }).strict();
const registerSchema = z.object({ email: z.email().transform((v) => v.toLowerCase()), password: z.string().min(10).max(100), displayName: z.string().trim().min(1).max(60), attribution: attributionSchema.optional() }).strict();
const loginSchema = z.object({ email: z.email().transform((v) => v.toLowerCase()), password: z.string().min(1).max(100) }).strict();
const refreshSchema = z.object({ refreshToken: z.string().min(10) }).strict();
const resetSchema = z.object({ token: z.string().min(20), password: z.string().min(10).max(100) }).strict();
const cookieBase = { httpOnly: true, secure: isProduction, sameSite: 'lax' as const, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 };

function setSession(res: Response, user: { id: string; tokenVersion: number }) {
  const token = jwt.sign({ ver: user.tokenVersion }, env.JWT_SECRET, { subject: user.id, expiresIn: '7d', issuer: 'namma-dina' });
  res.cookie('nd_session', token, cookieBase);
}

export function generateTokens(user: { id: string; tokenVersion: number }) {
  const accessToken = jwt.sign({ ver: user.tokenVersion, type: 'access' }, env.JWT_SECRET, { subject: user.id, expiresIn: '15m', issuer: 'namma-dina' });
  const refreshToken = jwt.sign({ ver: user.tokenVersion, type: 'refresh' }, env.JWT_SECRET, { subject: user.id, expiresIn: '30d', issuer: 'namma-dina' });
  return { accessToken, refreshToken, expiresIn: 15 * 60 };
}

export const authRouter = Router();
authRouter.get('/csrf', issueCsrf);

authRouter.post('/register', validateBody(registerSchema), async (req, res) => {
  const { email, password, displayName, attribution } = req.body as z.infer<typeof registerSchema>;
  const passwordHash = await bcrypt.hash(password, 12);
  const attributionData = attribution ? attribution as Prisma.InputJsonObject : undefined;
  const user = await prisma.user.create({ data: { email, passwordHash, displayName, attribution: attributionData, settings: { create: {} } }, select: { id: true, email: true, displayName: true, timezone: true, tokenVersion: true, settings: true } });
  setSession(res, user);
  const tokens = generateTokens(user);
  res.status(201).json({ data: { user: { id: user.id, email: user.email, displayName: user.displayName, timezone: user.timezone, onboardingDone: false }, settings: user.settings, tokens } });
});

authRouter.post('/login', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const user = await prisma.user.findUnique({ where: { email }, include: { settings: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
  setSession(res, user);
  const tokens = generateTokens(user);
  res.json({ data: { user: { id: user.id, email: user.email, displayName: user.displayName, timezone: user.timezone, onboardingDone: user.onboardingDone }, settings: user.settings, tokens } });
});

authRouter.post('/token', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const user = await prisma.user.findUnique({ where: { email }, include: { settings: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
  const tokens = generateTokens(user);
  res.json({ data: { user: { id: user.id, email: user.email, displayName: user.displayName, timezone: user.timezone, onboardingDone: user.onboardingDone }, settings: user.settings, tokens } });
});

authRouter.post('/refresh', validateBody(refreshSchema), async (req, res) => {
  const { refreshToken } = req.body as z.infer<typeof refreshSchema>;
  try {
    const payload = jwt.verify(refreshToken, env.JWT_SECRET) as jwt.JwtPayload & { sub: string; ver: number; type?: string };
    if (payload.type !== 'refresh') throw new HttpError(401, 'Invalid refresh token type.', 'UNAUTHENTICATED');
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { settings: true } });
    if (!user || user.tokenVersion !== payload.ver) throw new HttpError(401, 'Session has expired or was revoked. Please sign in again.', 'UNAUTHENTICATED');
    const tokens = generateTokens(user);
    setSession(res, user);
    res.json({ data: { user: { id: user.id, email: user.email, displayName: user.displayName, timezone: user.timezone, onboardingDone: user.onboardingDone }, settings: user.settings, tokens } });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'Invalid or expired refresh token. Please sign in again.', 'UNAUTHENTICATED');
  }
});

authRouter.get('/me', authenticate, async (req, res) => {
  const user = requireUser(req);
  const data = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, displayName: true, timezone: true, onboardingDone: true, settings: true } });
  res.json({ data });
});

authRouter.post('/logout', authenticate, async (req, res) => {
  const user = requireUser(req);
  await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });
  res.clearCookie('nd_session', { ...cookieBase, maxAge: undefined });
  res.status(204).end();
});

authRouter.post('/forgot-password', validateBody(z.object({ email: z.email().transform((v) => v.toLowerCase()) }).strict()), async (req, res) => {
  const { email } = req.body as { email: string };
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const response: { message: string; resetToken?: string } = { message: 'If that email is registered, password reset instructions are ready.' };
  if (user) {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    const resetUrl = `${env.CLIENT_ORIGIN}/reset-password?token=${encodeURIComponent(rawToken)}`;
    if (emailIsConfigured()) await sendPasswordReset(email, resetUrl);
    else if (!isProduction) response.resetToken = rawToken;
    else console.warn(`Password reset requested for ${email}, but SMTP_HOST is not configured.`);
  }
  res.json({ data: response });
});

authRouter.post('/reset-password', validateBody(resetSchema), async (req, res) => {
  const { token, password } = req.body as z.infer<typeof resetSchema>;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) throw new HttpError(400, 'This reset link is expired or has already been used.', 'RESET_INVALID');
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([prisma.user.update({ where: { id: reset.userId }, data: { passwordHash, tokenVersion: { increment: 1 } } }), prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } })]);
  res.json({ data: { message: 'Password updated. Please sign in again.' } });
});
