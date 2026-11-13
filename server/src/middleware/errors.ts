import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from '../lib/errors.js';

export const notFound: RequestHandler = (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'That page could not be found.' } });

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please check the information and try again.', details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) } });
  if (error instanceof HttpError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return res.status(409).json({ error: { code: 'ALREADY_EXISTS', message: 'That record already exists.' } });
    if (error.code === 'P2025') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'That record could not be found.' } });
  }
  console.error(error);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
};
