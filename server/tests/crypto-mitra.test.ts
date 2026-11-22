import { describe, expect, it } from 'vitest';
import { decryptHealthData, decryptJson, encryptHealthData, encryptJson } from '../src/lib/crypto.js';
import { computeStage, xpForLevel } from '../src/routes/mitra.js';

describe('Health Data Field-Level Encryption (AES-256-GCM)', () => {
  it('encrypts and decrypts sensitive reproductive health data accurately', () => {
    const sensitiveLog = 'Heavy flow on day 2, mild abdominal cramps, felt relaxed in afternoon';
    const ciphertext = encryptHealthData(sensitiveLog);

    expect(ciphertext).not.toBe(sensitiveLog);
    expect(ciphertext.split(':')).toHaveLength(3); // iv:tag:data

    const decrypted = decryptHealthData(ciphertext);
    expect(decrypted).toBe(sensitiveLog);
  });

  it('safely handles empty or missing values', () => {
    expect(encryptHealthData('')).toBe('');
    expect(decryptHealthData('')).toBe('');
    expect(decryptHealthData(null)).toBe('');
    expect(decryptHealthData(undefined)).toBe('');
  });

  it('encrypts and decrypts JSON symptom arrays seamlessly', () => {
    const symptoms = ['Cramps', 'Fatigue', 'Tender breasts', 'Headache'];
    const encrypted = encryptJson(symptoms);
    const restored = decryptJson<string[]>(encrypted, []);

    expect(restored).toEqual(symptoms);
  });

  it('returns fallback on invalid ciphertext without leaking or crashing', () => {
    expect(decryptHealthData('corrupted:tag:data')).toBe('');
    expect(decryptJson('invalid-string', ['fallback'])).toEqual(['fallback']);
  });
});

describe('Mitra Evolving Flame Progression', () => {
  it('calculates proper XP thresholds per level', () => {
    expect(xpForLevel(1)).toBe(50);
    expect(xpForLevel(5)).toBe(250);
    expect(xpForLevel(15)).toBe(750);
    expect(xpForLevel(30)).toBe(1500);
  });

  it('advances evolution stages according to level milestones', () => {
    expect(computeStage(1)).toBe('ember');
    expect(computeStage(4)).toBe('ember');
    expect(computeStage(5)).toBe('flame');
    expect(computeStage(14)).toBe('flame');
    expect(computeStage(15)).toBe('radiance');
    expect(computeStage(29)).toBe('radiance');
    expect(computeStage(30)).toBe('aurora');
    expect(computeStage(50)).toBe('aurora');
  });
});
