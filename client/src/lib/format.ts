let preferredTimezone = 'Asia/Kolkata';

export function setPreferredTimezone(timezone: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }); preferredTimezone = timezone; } catch { preferredTimezone = 'Asia/Kolkata'; }
}

export function formatTime(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: preferredTimezone }).format(new Date(value));
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: preferredTimezone }).format(new Date(value));
}

export function todayKey(date = new Date(), timezone = preferredTimezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timezone }).formatToParts(date);
  const read = (key: string) => parts.find((part) => part.type === key)?.value ?? '00';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

export function dateTimeLocalInput(value: string | Date, timezone = preferredTimezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
  const read = (key: string) => parts.find((part) => part.type === key)?.value ?? '00';
  return `${read('year')}-${read('month')}-${read('day')}T${read('hour')}:${read('minute')}`;
}

export function dateTimeFromLocal(value: string, timezone = preferredTimezone) {
  const match = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(value);
  if (!match) return new Date(value);
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  let guess = target;
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(guess));
    const read = (key: string) => Number(parts.find((part) => part.type === key)?.value ?? 0);
    const represented = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), read('second'));
    guess = target - (represented - guess);
  }
  return new Date(guess);
}

export function money(cents: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(cents / 100);
}

export function greeting(hour = new Date().getHours(), lang: 'en' | 'kn' = 'en') {
  if (lang === 'kn') {
    if (hour < 12) return 'ಶುಭೋದಯ';
    if (hour < 17) return 'ಶುಭ ಮಧ್ಯಾಹ್ನ';
    return 'ಶುಭ ಸಂಜೆ';
  }
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
