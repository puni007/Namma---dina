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
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  generateSecureOtp,
  hashOtp,
  sendOtpSms,
  getSmsProviderConfig,
} from '../services/sms.js';
import {
  isGoogleOAuthConfigured,
  isFacebookOAuthConfigured,
  getGoogleAuthUrl,
  exchangeGoogleCode,
  verifyGoogleIdToken,
  getFacebookAuthUrl,
  exchangeFacebookCode,
  verifyFacebookAccessToken,
} from '../services/oauth.js';

const attributionSchema = z.object({
  source: z.string().max(200).optional(),
  medium: z.string().max(200).optional(),
  campaign: z.string().max(200).optional(),
  term: z.string().max(200).optional(),
  content: z.string().max(200).optional(),
  capturedAt: z.iso.datetime().optional(),
}).strict();

const registerSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(10).max(100),
  displayName: z.string().trim().min(1).max(60),
  attribution: attributionSchema.optional(),
}).strict();

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(100),
}).strict();

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
}).strict();

const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(10).max(100),
}).strict();

const sendOtpSchema = z.object({
  phoneNumber: z.string().min(8).max(20),
  countryCode: z.string().max(6).optional().default('+91'),
}).strict();

const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(8).max(20),
  countryCode: z.string().max(6).optional().default('+91'),
  otp: z.string().min(4).max(8),
  displayName: z.string().trim().min(1).max(60).optional(),
}).strict();

const googleTokenSchema = z.object({
  idToken: z.string().min(10),
}).strict();

const facebookTokenSchema = z.object({
  accessToken: z.string().min(10),
}).strict();

const cookieBase = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setSession(res: Response, user: { id: string; tokenVersion: number }) {
  const token = jwt.sign({ ver: user.tokenVersion }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '7d',
    issuer: 'namma-dina',
  });
  res.cookie('nd_session', token, cookieBase);
}

export function generateTokens(user: { id: string; tokenVersion: number }) {
  const accessToken = jwt.sign({ ver: user.tokenVersion, type: 'access' }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '15m',
    issuer: 'namma-dina',
  });
  const refreshToken = jwt.sign({ ver: user.tokenVersion, type: 'refresh' }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '30d',
    issuer: 'namma-dina',
  });
  return { accessToken, refreshToken, expiresIn: 15 * 60 };
}

export const authRouter = Router();

authRouter.get('/csrf', issueCsrf);

authRouter.get('/providers', (_req, res) => {
  res.json({
    data: {
      sms: getSmsProviderConfig(),
      google: { configured: isGoogleOAuthConfigured() },
      facebook: { configured: isFacebookOAuthConfigured() },
      email: { configured: emailIsConfigured() },
    },
  });
});

authRouter.post('/register', validateBody(registerSchema), async (req, res) => {
  const { email, password, displayName, attribution } = req.body as z.infer<typeof registerSchema>;
  const passwordHash = await bcrypt.hash(password, 12);
  const attributionData = attribution ? (attribution as Prisma.InputJsonObject) : undefined;
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      attribution: attributionData,
      settings: { create: {} },
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      timezone: true,
      tokenVersion: true,
      settings: true,
    },
  });
  setSession(res, user);
  const tokens = generateTokens(user);
  res.status(201).json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        timezone: user.timezone,
        onboardingDone: false,
      },
      settings: user.settings,
      tokens,
    },
  });
});

authRouter.post('/login', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const user = await prisma.user.findUnique({ where: { email }, include: { settings: true } });
  const isValid = Boolean(user?.passwordHash && (await bcrypt.compare(password, user.passwordHash)));
  if (!user || !isValid) {
    throw new HttpError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
  }
  setSession(res, user);
  const tokens = generateTokens(user);
  res.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        timezone: user.timezone,
        onboardingDone: user.onboardingDone,
      },
      settings: user.settings,
      tokens,
    },
  });
});

authRouter.post('/token', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const user = await prisma.user.findUnique({ where: { email }, include: { settings: true } });
  const isValid = Boolean(user?.passwordHash && (await bcrypt.compare(password, user.passwordHash)));
  if (!user || !isValid) {
    throw new HttpError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
  }
  const tokens = generateTokens(user);
  res.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        timezone: user.timezone,
        onboardingDone: user.onboardingDone,
      },
      settings: user.settings,
      tokens,
    },
  });
});

// Phone Number OTP Flow
authRouter.post('/phone/send-otp', validateBody(sendOtpSchema), async (req, res) => {
  const { phoneNumber, countryCode } = req.body as z.infer<typeof sendOtpSchema>;
  const normalized = normalizePhoneNumber(phoneNumber, countryCode);

  if (!isValidPhoneNumber(normalized)) {
    throw new HttpError(400, 'Please provide a valid phone number (e.g. +91 9876543210).', 'INVALID_PHONE');
  }

  // Check 60-second cooldown
  const recent = await prisma.phoneOtp.findFirst({
    where: {
      phoneNumber: normalized,
      createdAt: { gt: new Date(Date.now() - 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recent) {
    const remainingSeconds = Math.max(1, Math.ceil((recent.createdAt.getTime() + 60000 - Date.now()) / 1000));
    throw new HttpError(429, `Please wait ${remainingSeconds} seconds before requesting a new code.`, 'OTP_COOLDOWN');
  }

  const otp = generateSecureOtp();
  const otpHash = hashOtp(otp);

  await prisma.phoneOtp.create({
    data: {
      phoneNumber: normalized,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  const smsResult = await sendOtpSms(normalized, otp);

  res.json({
    data: {
      message: 'Verification code sent.',
      phoneNumber: normalized,
      cooldownSeconds: 60,
      simulated: smsResult.simulated,
      // In development or when using mock provider, include OTP for instant verification:
      ...(smsResult.simulated && !isProduction ? { debugOtp: otp } : {}),
    },
  });
});

authRouter.post('/phone/verify-otp', validateBody(verifyOtpSchema), async (req, res) => {
  const { phoneNumber, countryCode, otp, displayName } = req.body as z.infer<typeof verifyOtpSchema>;
  const normalized = normalizePhoneNumber(phoneNumber, countryCode);

  const record = await prisma.phoneOtp.findFirst({
    where: {
      phoneNumber: normalized,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw new HttpError(400, 'Verification code has expired or is invalid. Please request a new one.', 'OTP_EXPIRED');
  }

  if (record.attempts >= 3) {
    throw new HttpError(400, 'Too many failed attempts. Please request a new verification code.', 'OTP_MAX_ATTEMPTS');
  }

  const inputHash = hashOtp(otp);
  if (record.otpHash !== inputHash) {
    await prisma.phoneOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = 2 - record.attempts;
    throw new HttpError(400, `Incorrect verification code. ${remaining} attempt(s) remaining.`, 'OTP_INVALID');
  }

  // Mark OTP as verified
  await prisma.phoneOtp.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  });

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { phoneNumber: normalized },
    include: { settings: true },
  });

  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    user = await prisma.user.create({
      data: {
        phoneNumber: normalized,
        displayName: displayName || `User ${normalized.slice(-4)}`,
        authProvider: 'phone',
        settings: { create: {} },
      },
      include: { settings: true },
    });
  }

  setSession(res, user);
  const tokens = generateTokens(user);

  res.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
        timezone: user.timezone,
        onboardingDone: user.onboardingDone,
        isNewUser,
      },
      settings: user.settings,
      tokens,
    },
  });
});

// Google OAuth
authRouter.get('/google', (req, res) => {
  if (!isGoogleOAuthConfigured()) {
    throw new HttpError(503, 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.', 'OAUTH_NOT_CONFIGURED');
  }
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
  const state = randomBytes(16).toString('hex');
  const url = getGoogleAuthUrl(redirectUri, state);
  res.redirect(url);
});

authRouter.get('/google/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) {
    res.redirect(`${env.CLIENT_ORIGIN}/login?error=oauth_failed`);
    return;
  }

  try {
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
    const profile = await exchangeGoogleCode(code, redirectUri);

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.id }, { email: profile.email }] },
      include: { settings: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          googleId: profile.id,
          displayName: profile.displayName,
          authProvider: 'google',
          settings: { create: {} },
        },
        include: { settings: true },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.id },
        include: { settings: true },
      });
    }

    setSession(res, user);
    res.redirect(`${env.CLIENT_ORIGIN}/app/day`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.redirect(`${env.CLIENT_ORIGIN}/login?error=google_auth_failed`);
  }
});

authRouter.post('/google/token', validateBody(googleTokenSchema), async (req, res) => {
  const { idToken } = req.body as z.infer<typeof googleTokenSchema>;
  try {
    const profile = await verifyGoogleIdToken(idToken);

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.id }, { email: profile.email }] },
      include: { settings: true },
    });

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email: profile.email,
          googleId: profile.id,
          displayName: profile.displayName,
          authProvider: 'google',
          settings: { create: {} },
        },
        include: { settings: true },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.id },
        include: { settings: true },
      });
    }

    setSession(res, user);
    const tokens = generateTokens(user);
    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          timezone: user.timezone,
          onboardingDone: user.onboardingDone,
          isNewUser,
        },
        settings: user.settings,
        tokens,
      },
    });
  } catch (err) {
    throw new HttpError(401, err instanceof Error ? err.message : 'Invalid Google token', 'INVALID_GOOGLE_TOKEN');
  }
});

// Facebook OAuth
authRouter.get('/facebook', (req, res) => {
  if (!isFacebookOAuthConfigured()) {
    throw new HttpError(503, 'Facebook sign-in is not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.', 'OAUTH_NOT_CONFIGURED');
  }
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`;
  const state = randomBytes(16).toString('hex');
  const url = getFacebookAuthUrl(redirectUri, state);
  res.redirect(url);
});

authRouter.get('/facebook/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) {
    res.redirect(`${env.CLIENT_ORIGIN}/login?error=oauth_failed`);
    return;
  }

  try {
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`;
    const profile = await exchangeFacebookCode(code, redirectUri);

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { facebookId: profile.id },
          ...(profile.email ? [{ email: profile.email }] : []),
        ],
      },
      include: { settings: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email || null,
          facebookId: profile.id,
          displayName: profile.displayName,
          authProvider: 'facebook',
          settings: { create: {} },
        },
        include: { settings: true },
      });
    } else if (!user.facebookId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { facebookId: profile.id },
        include: { settings: true },
      });
    }

    setSession(res, user);
    res.redirect(`${env.CLIENT_ORIGIN}/app/day`);
  } catch (err) {
    console.error('Facebook OAuth callback error:', err);
    res.redirect(`${env.CLIENT_ORIGIN}/login?error=facebook_auth_failed`);
  }
});

authRouter.post('/facebook/token', validateBody(facebookTokenSchema), async (req, res) => {
  const { accessToken } = req.body as z.infer<typeof facebookTokenSchema>;
  try {
    const profile = await verifyFacebookAccessToken(accessToken);

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { facebookId: profile.id },
          ...(profile.email ? [{ email: profile.email }] : []),
        ],
      },
      include: { settings: true },
    });

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email: profile.email || null,
          facebookId: profile.id,
          displayName: profile.displayName,
          authProvider: 'facebook',
          settings: { create: {} },
        },
        include: { settings: true },
      });
    } else if (!user.facebookId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { facebookId: profile.id },
        include: { settings: true },
      });
    }

    setSession(res, user);
    const tokens = generateTokens(user);
    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          timezone: user.timezone,
          onboardingDone: user.onboardingDone,
          isNewUser,
        },
        settings: user.settings,
        tokens,
      },
    });
  } catch (err) {
    throw new HttpError(401, err instanceof Error ? err.message : 'Invalid Facebook token', 'INVALID_FACEBOOK_TOKEN');
  }
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
  const data = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, phoneNumber: true, displayName: true, timezone: true, onboardingDone: true, settings: true } });
  res.json({ data });
});

authRouter.post('/logout', authenticate, async (req, res) => {
  const user = requireUser(req);
  await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });
  res.clearCookie('nd_session', { ...cookieBase, maxAge: undefined });
  res.status(204).end();
});

authRouter.post('/forgot-password', validateBody(z.object({ email: z.string().email().transform((v) => v.toLowerCase()) }).strict()), async (req, res) => {
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
