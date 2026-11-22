import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

// Derive a deterministic 32-byte key specifically for health data encryption
const HEALTH_KEY = createHash('sha256')
  .update(`namma-dina:health:${env.JWT_SECRET}:${env.COOKIE_SECRET}`)
  .digest();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export function encryptHealthData(plainText: string): string {
  if (!plainText) return '';
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, HEALTH_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptHealthData(cipherText: string | null | undefined): string {
  if (!cipherText) return '';
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return cipherText; // Return raw if unencrypted legacy
    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex!, 'hex');
    const tag = Buffer.from(tagHex!, 'hex');
    const encrypted = Buffer.from(encryptedHex!, 'hex');
    const decipher = createDecipheriv(ALGORITHM, HEALTH_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    // If decryption fails, return a safe fallback without exposing corrupted bits
    return '';
  }
}

export function encryptJson(data: unknown): string {
  return encryptHealthData(JSON.stringify(data ?? {}));
}

export function decryptJson<T = unknown>(cipherText: string | null | undefined, fallback: T): T {
  if (!cipherText) return fallback;
  const decrypted = decryptHealthData(cipherText);
  if (!decrypted) return fallback;
  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return fallback;
  }
}
