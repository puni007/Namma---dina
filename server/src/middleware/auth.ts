import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { HttpError } from '../lib/errors.js';

declare global {
  namespace Express {
    interface Request { user?: { id: string; email: string; displayName: string; timezone: string } }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.cookies?.nd_session) {
      token = req.cookies.nd_session;
    }

    if (!token) throw new HttpError(401, 'Please sign in to continue.', 'UNAUTHENTICATED');
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & { sub: string; ver: number; type?: string };
    if (payload.type === 'refresh') throw new HttpError(401, 'Invalid token type for authorization.', 'UNAUTHENTICATED');

    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, displayName: true, timezone: true, tokenVersion: true } });
    if (!user || user.tokenVersion !== payload.ver) throw new HttpError(401, 'Your session has expired. Please sign in again.', 'UNAUTHENTICATED');
    req.user = { id: user.id, email: user.email, displayName: user.displayName, timezone: user.timezone };
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Please sign in to continue.', 'UNAUTHENTICATED'));
  }
}

export function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'Please sign in to continue.', 'UNAUTHENTICATED');
  return req.user;
}
