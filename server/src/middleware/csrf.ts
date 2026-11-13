import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/errors.js';
import { isProduction } from '../config/env.js';

export function issueCsrf(req: Request, res: Response) {
  const value = randomBytes(24).toString('base64url');
  res.cookie('nd_csrf', value, { httpOnly: false, secure: isProduction, sameSite: 'lax', signed: false, path: '/', maxAge: 8 * 60 * 60 * 1000 });
  res.json({ csrfToken: value });
}

export function verifyCsrf(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  // Requests authenticated via Bearer tokens or native app clients do not use ambient cookie credentials
  // and are immune to standard cross-site request forgery attacks.
  const authHeader = req.headers.authorization;
  if ((authHeader && authHeader.startsWith('Bearer ')) || req.get('x-client-type') === 'native') {
    return next();
  }

  const cookie = req.cookies?.nd_csrf;
  const header = req.get('x-csrf-token');
  if (typeof cookie !== 'string' || typeof header !== 'string') return next(new HttpError(403, 'Security token missing. Refresh the page and try again.', 'CSRF_INVALID'));
  const left = Buffer.from(cookie);
  const right = Buffer.from(header);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return next(new HttpError(403, 'Security token expired. Refresh the page and try again.', 'CSRF_INVALID'));
  next();
}
