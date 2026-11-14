import { Preferences } from '@capacitor/preferences';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
};

let csrfToken = '';
let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;
let tokensLoaded = false;
let refreshPromise: Promise<boolean> | null = null;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function initAuthTokens(): Promise<void> {
  if (tokensLoaded) return;
  try {
    const { value: at } = await Preferences.get({ key: 'nd_access_token' });
    const { value: rt } = await Preferences.get({ key: 'nd_refresh_token' });
    cachedAccessToken = at || (typeof localStorage !== 'undefined' ? localStorage.getItem('nd_access_token') : null);
    cachedRefreshToken = rt || (typeof localStorage !== 'undefined' ? localStorage.getItem('nd_refresh_token') : null);
  } catch {
    if (typeof localStorage !== 'undefined') {
      cachedAccessToken = localStorage.getItem('nd_access_token');
      cachedRefreshToken = localStorage.getItem('nd_refresh_token');
    }
  }
  tokensLoaded = true;
}

export async function setAuthTokens(tokens: AuthTokens | null): Promise<void> {
  if (tokens) {
    cachedAccessToken = tokens.accessToken;
    cachedRefreshToken = tokens.refreshToken;
    try {
      await Preferences.set({ key: 'nd_access_token', value: tokens.accessToken });
      await Preferences.set({ key: 'nd_refresh_token', value: tokens.refreshToken });
    } catch (_err) {
      void _err;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nd_access_token', tokens.accessToken);
      localStorage.setItem('nd_refresh_token', tokens.refreshToken);
    }
  } else {
    cachedAccessToken = null;
    cachedRefreshToken = null;
    try {
      await Preferences.remove({ key: 'nd_access_token' });
      await Preferences.remove({ key: 'nd_refresh_token' });
    } catch (_err) {
      void _err;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('nd_access_token');
      localStorage.removeItem('nd_refresh_token');
    }
  }
  tokensLoaded = true;
}

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

export async function warmSecurityToken() {
  const response = await fetch(`${apiBaseUrl}/auth/csrf`, { credentials: 'include' });
  if (!response.ok) throw new ApiError('Could not start a secure session.', response.status);
  csrfToken = (await response.json()).csrfToken as string;
}

async function attemptTokenRefresh(): Promise<boolean> {
  if (!cachedRefreshToken) return false;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'native',
        },
        body: JSON.stringify({ refreshToken: cachedRefreshToken }),
        credentials: 'include',
      });
      if (!res.ok) {
        await setAuthTokens(null);
        return false;
      }
      const data = await res.json();
      if (data?.data?.tokens) {
        await setAuthTokens(data.data.tokens as AuthTokens);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

type ApiResponse<T> = { data: T; meta?: Record<string, unknown> };

export async function api<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  if (!tokensLoaded) await initAuthTokens();

  const method = (init.method ?? 'GET').toUpperCase();
  const isBearer = Boolean(cachedAccessToken);

  // If using cookie auth for mutating requests, warm CSRF token if not already present
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !csrfToken && !isBearer) {
    await warmSecurityToken();
  }

  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (cachedAccessToken) {
    headers.set('Authorization', `Bearer ${cachedAccessToken}`);
    headers.set('X-Client-Type', 'native');
  } else if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, method, headers, credentials: 'include' });
  if (response.status === 204) return { data: undefined as T };

  // Handle token refresh on 401 when a refresh token exists
  if (response.status === 401 && cachedRefreshToken && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshed = await attemptTokenRefresh();
    if (refreshed && cachedAccessToken) {
      const retryHeaders = new Headers(init.headers);
      if (init.body && !(init.body instanceof FormData)) retryHeaders.set('Content-Type', 'application/json');
      retryHeaders.set('Authorization', `Bearer ${cachedAccessToken}`);
      retryHeaders.set('X-Client-Type', 'native');
      const retryResponse = await fetch(`${apiBaseUrl}${path}`, { ...init, method, headers: retryHeaders, credentials: 'include' });
      if (retryResponse.status === 204) return { data: undefined as T };
      const retryResult = await retryResponse.json().catch(() => ({}));
      if (!retryResponse.ok) {
        const error = (retryResult as { error?: { message?: string; code?: string } }).error;
        throw new ApiError(error?.message ?? 'The request could not be completed.', retryResponse.status, error?.code);
      }
      return retryResult as ApiResponse<T>;
    }
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403 && (result as { error?: { code?: string } }).error?.code === 'CSRF_INVALID') {
      await warmSecurityToken();
      return api<T>(path, init);
    }
    const error = (result as { error?: { message?: string; code?: string } }).error;
    throw new ApiError(error?.message ?? 'The request could not be completed.', response.status, error?.code);
  }
  return result as ApiResponse<T>;
}

export const getData = async <T>(path: string) => (await api<T>(path)).data;
export const sendData = async <T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) => (await api<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })).data;

export type User = { id: string; email: string; displayName: string; timezone: string; onboardingDone: boolean; settings?: Settings | null };
export type Settings = { wakeTime: string; sleepTime: string; goals: string[]; planningStyle: string; dailyWaterGoalMl: number; dailyScreenGoalMinutes: number; monthlyFoodBudgetCents: number; browserNotifications: boolean; notificationPreferences: Record<string, boolean>; motionMode: 'auto' | 'full' | 'calm' | 'off' };
export type Task = { id: string; title: string; description?: string | null; status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED'; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; dueAt?: string | null; scheduledStart?: string | null; scheduledMinutes: number; recurrenceRule?: string | null; completedAt?: string | null; categoryId?: string | null; category?: { name: string; color: string } | null };
export type Habit = { id: string; name: string; description?: string | null; targetValue: number; targetUnit: string; flexible: boolean; frequency?: 'DAILY' | 'WEEKLY' | 'CUSTOM'; daysOfWeek?: number[]; isActive?: boolean; value?: number; todayValue?: number; dueToday?: boolean; done?: boolean };
export type Overview = { date: string; timezone: string; tasks: Task[]; habits: Habit[]; blocks: Array<{ id: string; title: string; startsAt: string; endsAt: string; isFixed: boolean }>; reflection?: { id: string } | null; progress: number; taskProgress: number; habitProgress: number; waterMl: number; waterGoalMl: number; screenMinutes: number; screenGoalMinutes: number };
