export function todayInTimezone(timezone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const read = (name: string) => parts.find((part) => part.type === name)?.value ?? '00';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function zonedMidnight(day: string, timezone: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  const target = Date.UTC(year!, month! - 1, date!);
  let guess = target;
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(guess));
    const read = (name: string) => Number(parts.find((part) => part.type === name)?.value ?? 0);
    const represented = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), read('second'));
    guess = target - (represented - guess);
  }
  return new Date(guess);
}

function zonedDateTime(day: string, hour: number, minute: number, timezone: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  const target = Date.UTC(year!, month! - 1, date!, hour, minute, 0);
  let guess = target;
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(guess));
    const read = (name: string) => Number(parts.find((part) => part.type === name)?.value ?? 0);
    const represented = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), read('second'));
    guess = target - (represented - guess);
  }
  return new Date(guess);
}

export function localDayBounds(day: string, timezone: string) {
  const start = zonedMidnight(day, timezone);
  const [year, month, date] = day.split('-').map(Number);
  const nextDay = new Date(Date.UTC(year!, month! - 1, date! + 1)).toISOString().slice(0, 10);
  return { start, end: zonedMidnight(nextDay, timezone) };
}

export function parseDateOnly(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function nextLocalReminderDate(current: Date, timezone: string, recurrence: string): Date | null {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = formatter.formatToParts(current);
  const read = (name: string) => Number(parts.find((part) => part.type === name)?.value ?? 0);
  const year = read('year'); const month = read('month'); const date = read('day');
  const hour = read('hour'); const minute = read('minute');
  const calendarDay = new Date(Date.UTC(year, month - 1, date));
  const rule = recurrence.toUpperCase();
  if (rule === 'DAILY') calendarDay.setUTCDate(calendarDay.getUTCDate() + 1);
  else if (rule === 'WEEKLY') calendarDay.setUTCDate(calendarDay.getUTCDate() + 7);
  else if (rule === 'MONTHLY') {
    const targetMonth = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
    targetMonth.setUTCDate(Math.min(date, lastDay));
    return zonedDateTime(targetMonth.toISOString().slice(0, 10), hour, minute, timezone);
  } else return null;
  return zonedDateTime(calendarDay.toISOString().slice(0, 10), hour, minute, timezone);
}
