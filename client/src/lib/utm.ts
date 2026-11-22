export type UtmAttribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  capturedAt: string;
};

const STORAGE_KEY = 'nd_utm_attribution';
const UTM_FIELDS = [
  ['utm_source', 'source'],
  ['utm_medium', 'medium'],
  ['utm_campaign', 'campaign'],
  ['utm_term', 'term'],
  ['utm_content', 'content'],
] as const;

export function readUtmFromUrl(search: string): UtmAttribution | null {
  const params = new URLSearchParams(search);
  const values: Omit<UtmAttribution, 'capturedAt'> = {};
  for (const [queryKey, field] of UTM_FIELDS) {
    const value = params.get(queryKey)?.trim();
    if (value) values[field] = value.slice(0, 200);
  }
  return Object.keys(values).length ? { ...values, capturedAt: new Date().toISOString() } : null;
}

export function saveUtmForSession(attribution: UtmAttribution): void {
  try {
    if (!sessionStorage.getItem(STORAGE_KEY)) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch { /* Attribution is optional when browser storage is unavailable. */ }
}

export function getUtmForRegistration(): UtmAttribution | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || typeof (value as UtmAttribution).capturedAt !== 'string') return undefined;
    return value as UtmAttribution;
  } catch {
    return undefined;
  }
}

export function clearUtmForSession(): void {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Ignore storage errors. */ }
}
