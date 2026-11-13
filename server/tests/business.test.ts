import { describe, expect, it } from 'vitest';
import { localDayBounds, nextLocalReminderDate, todayInTimezone } from '../src/lib/dates.js';
import { completionPercent, habitTargetMet, isHabitDue, weekStartDate } from '../src/services/habits.js';
import { hasScheduleConflict, suggestSlots, type WorkItem } from '../src/services/scheduling.js';
import { comebackScore } from '../src/services/score.js';

describe('daily planning rules', () => {
  it('calculates the transparent comeback score and clamps inputs', () => {
    expect(comebackScore({ completionRate: 1, habitRate: 1, recoveryEvents: 2, activeDays: 7 })).toBe(100);
    expect(comebackScore({ completionRate: 0, habitRate: 0, recoveryEvents: 0, activeDays: 0 })).toBe(0);
    expect(comebackScore({ completionRate: 2, habitRate: -1, recoveryEvents: 9, activeDays: 9 })).toBe(70);
  });

  it('treats touching schedule edges as available and finds a shortened slot when needed', () => {
    const busy = [{ start: new Date('2026-11-11T10:00:00Z'), end: new Date('2026-11-11T11:00:00Z') }];
    expect(hasScheduleConflict(new Date('2026-11-11T09:00:00Z'), new Date('2026-11-11T10:00:00Z'), busy)).toBe(false);
    expect(hasScheduleConflict(new Date('2026-11-11T09:30:00Z'), new Date('2026-11-11T10:30:00Z'), busy)).toBe(true);
    const items: WorkItem[] = [
      { id: 'low', title: 'Later task', minutes: 20, priority: 'LOW' },
      { id: 'urgent', title: 'Urgent task', minutes: 45, priority: 'URGENT' },
    ];
    const result = suggestSlots(items, busy, new Date('2026-11-11T09:00:00Z'), new Date('2026-11-11T11:15:00Z'));
    expect(result.map((row) => row.item.id)).toEqual(['urgent', 'low']);
    expect(result[0]?.start.toISOString()).toBe('2026-11-11T09:00:00.000Z');
    expect(result[1]?.start.toISOString()).toBe('2026-11-11T09:45:00.000Z');
    expect(result[1]?.minutes).toBe(15);
    expect(result[1]?.reason).toContain('15-minute version');
  });

  it('backfills earlier openings when a high-priority task skips a smaller gap', () => {
    // 09:00 - 09:20 is free (20 mins)
    // 09:20 - 10:00 is busy
    // 10:00 - 12:00 is free (120 mins)
    const busy = [{ start: new Date('2026-11-11T09:20:00Z'), end: new Date('2026-11-11T10:00:00Z') }];
    const items: WorkItem[] = [
      { id: 'short-low', title: 'Quick check', minutes: 15, priority: 'LOW' },
      { id: 'long-urgent', title: 'Deep work', minutes: 60, priority: 'URGENT' },
    ];
    const result = suggestSlots(items, busy, new Date('2026-11-11T09:00:00Z'), new Date('2026-11-11T12:00:00Z'));
    // Urgent gets placed first: 09:00-09:20 is too small for 60 min, so it takes 10:00-11:00
    // Low is 15 min: can backfill the 09:00-09:20 opening!
    const urgentSlot = result.find((r) => r.item.id === 'long-urgent');
    const lowSlot = result.find((r) => r.item.id === 'short-low');
    expect(urgentSlot?.start.toISOString()).toBe('2026-11-11T10:00:00.000Z');
    expect(lowSlot?.start.toISOString()).toBe('2026-11-11T09:00:00.000Z');
  });

  it('tracks habit targets and Monday-based weeks', () => {
    expect(habitTargetMet(3, 3)).toBe(true);
    expect(habitTargetMet(2, 3)).toBe(false);
    expect(habitTargetMet(5, 0)).toBe(false);
    expect(completionPercent(2, 3)).toBe(67);
    expect(completionPercent(5, 2)).toBe(100);
    expect(completionPercent(0, 0)).toBe(0);
    const sunday = new Date('2024-06-02T00:00:00Z');
    expect(isHabitDue({ frequency: 'CUSTOM', daysOfWeek: [0, 3] }, sunday)).toBe(true);
    expect(isHabitDue({ frequency: 'CUSTOM', daysOfWeek: [1, 3] }, sunday)).toBe(false);
    expect(isHabitDue({ frequency: 'WEEKLY', daysOfWeek: [] }, sunday)).toBe(true);
    expect(weekStartDate(sunday).toISOString()).toBe('2024-05-27T00:00:00.000Z');
  });
});

describe('timezone calendar rules', () => {
  it('keeps a local calendar day at midnight boundaries', () => {
    const bounds = localDayBounds('2026-11-11', 'Asia/Kolkata');
    expect(bounds.start.toISOString()).toBe('2026-11-10T18:30:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-11-11T18:30:00.000Z');
    expect(todayInTimezone('Asia/Kolkata', bounds.start)).toBe('2026-11-11');
  });

  it('handles 23-hour DST days and preserves local reminder time', () => {
    const bounds = localDayBounds('2024-03-10', 'America/New_York');
    expect((bounds.end.getTime() - bounds.start.getTime()) / 3_600_000).toBe(23);
    const next = nextLocalReminderDate(new Date('2024-03-09T14:30:00.000Z'), 'America/New_York', 'DAILY');
    expect(next?.toISOString()).toBe('2024-03-10T13:30:00.000Z');
    expect(todayInTimezone('America/New_York', next ?? undefined)).toBe('2024-03-10');
  });
});
