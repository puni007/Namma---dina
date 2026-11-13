import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export function emailIsConfigured() {
  return Boolean(env.SMTP_HOST);
}

export async function sendPasswordReset(email: string, url: string) {
  if (!emailIsConfigured()) return false;
  const transport = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465, auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined });
  await transport.sendMail({ from: env.SMTP_FROM, to: email, subject: 'Reset your Namma Dina password', text: `Choose a new password for your Namma Dina account: ${url}\n\nThis link expires in 30 minutes. If you did not request it, you can ignore this email.`, html: `<p>Choose a new password for your Namma Dina account.</p><p><a href="${url}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>` });
  return true;
}
