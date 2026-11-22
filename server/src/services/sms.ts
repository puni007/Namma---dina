import { randomInt, createHash } from 'node:crypto';
import { isProduction } from '../config/env.js';

export interface SmsProviderConfig {
  provider: 'mock' | 'firebase' | 'twilio' | 'msg91';
  configured: boolean;
}

export function getSmsProviderConfig(): SmsProviderConfig {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    return { provider: 'firebase', configured: true };
  }
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    return { provider: 'twilio', configured: true };
  }
  if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) {
    return { provider: 'msg91', configured: true };
  }
  return { provider: 'mock', configured: false };
}

export function normalizePhoneNumber(raw: string, defaultCountryCode = '+91'): string {
  const cleaned = raw.trim().replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
    return `${defaultCountryCode}${cleaned}`;
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `${defaultCountryCode}${cleaned.slice(1)}`;
  }
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

export function isValidPhoneNumber(phone: string): boolean {
  return /^\+[1-9]\d{9,14}$/.test(phone);
}

export function generateSecureOtp(): string {
  return randomInt(100000, 999999).toString();
}

export function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

export async function sendOtpSms(phoneNumber: string, otp: string): Promise<{ success: boolean; simulated: boolean }> {
  const config = getSmsProviderConfig();
  const message = `Your Namma Dina verification code is ${otp}. Valid for 10 minutes. Do not share this code.`;

  if (config.provider === 'twilio') {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const body = new URLSearchParams({
        To: phoneNumber,
        From: process.env.TWILIO_PHONE_NUMBER!,
        Body: message,
      });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        console.error('Twilio SMS delivery failed:', await res.text());
        return { success: false, simulated: false };
      }
      return { success: true, simulated: false };
    } catch (err) {
      console.error('Error delivering SMS via Twilio:', err);
      return { success: false, simulated: false };
    }
  }

  if (config.provider === 'msg91') {
    try {
      const res = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          authkey: process.env.MSG91_AUTH_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: process.env.MSG91_TEMPLATE_ID,
          mobile: phoneNumber.replace('+', ''),
          otp,
        }),
      });

      return { success: res.ok, simulated: false };
    } catch (err) {
      console.error('Error delivering SMS via MSG91:', err);
      return { success: false, simulated: false };
    }
  }

  // Fallback for development / mock mode:
  console.info(`[NAMMA DINA SMS ${isProduction ? 'PROD NOTICE' : 'DEV'}] OTP for ${phoneNumber} is ${otp}`);
  return { success: true, simulated: true };
}
