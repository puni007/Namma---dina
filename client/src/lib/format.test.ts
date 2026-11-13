import { describe, expect, it } from 'vitest';
import { dateTimeFromLocal, dateTimeLocalInput, money, todayKey } from './format';

describe('localized values', () => {
  it('converts user-local time inputs to instants and back', () => {
    const instant = dateTimeFromLocal('2026-11-11T09:15', 'Asia/Kolkata');
    expect(instant.toISOString()).toBe('2026-11-11T03:45:00.000Z');
    expect(dateTimeLocalInput(instant, 'Asia/Kolkata')).toBe('2026-11-11T09:15');
    expect(todayKey(instant, 'Asia/Kolkata')).toBe('2026-11-11');
  });

  it('formats spending in rupees', () => {
    expect(money(12550)).toMatch(/₹\s?126/);
  });
});
