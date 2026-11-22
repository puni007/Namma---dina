import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  generateSecureOtp,
  hashOtp,
  getSmsProviderConfig,
} from '../src/services/sms.js';

describe('Phone OTP & SMS Engine', () => {
  it('normalizes standard 10-digit Indian numbers to E.164 +91', () => {
    expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
    expect(normalizePhoneNumber(' 98765 43210 ')).toBe('+919876543210');
    expect(normalizePhoneNumber('+919876543210')).toBe('+919876543210');
    expect(normalizePhoneNumber('09876543210')).toBe('+919876543210');
  });

  it('validates E.164 compliant phone numbers', () => {
    expect(isValidPhoneNumber('+919876543210')).toBe(true);
    expect(isValidPhoneNumber('+14155552671')).toBe(true);
    expect(isValidPhoneNumber('12345')).toBe(false);
    expect(isValidPhoneNumber('not-a-number')).toBe(false);
  });

  it('generates 6-digit numeric OTP and verifies SHA-256 hash', () => {
    const otp = generateSecureOtp();
    expect(otp).toMatch(/^\d{6}$/);

    const hash1 = hashOtp(otp);
    const hash2 = hashOtp(otp);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashOtp('000000'));
  });

  it('reports provider status without exposing secrets', () => {
    const config = getSmsProviderConfig();
    expect(typeof config.provider).toBe('string');
    expect(typeof config.configured).toBe('boolean');
  });
});

describe('API Versioning & Documentation', () => {
  it('serves OpenAPI 3.0 specification at /api/docs/openapi.json', async () => {
    const res = await request(app).get('/api/docs/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toContain('Namma Dina');
    expect(res.body.paths['/auth/phone/send-otp']).toBeDefined();
    expect(res.body.paths['/mitra/state']).toBeDefined();
    expect(res.body.paths['/calendar/feed/{token}.ics']).toBeDefined();
  });

  it('supports /api/v1 version alias seamlessly', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('provides public provider capability status at /api/auth/providers', async () => {
    const res = await request(app).get('/api/auth/providers');
    expect(res.status).toBe(200);
    expect(res.body.data.sms).toBeDefined();
    expect(res.body.data.google).toBeDefined();
    expect(res.body.data.facebook).toBeDefined();
  });
});
