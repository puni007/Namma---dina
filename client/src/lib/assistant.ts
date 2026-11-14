export type MitraPreferences = {
  launcherVisible: boolean;
  language: 'auto' | 'en' | 'kn';
  proactiveNudgesEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  voiceEnabled: boolean;
  tourCompletedAt: string | null;
  aiConsentGiven: boolean;
  aiEnabled: boolean;
  providerAvailable: boolean;
};

export type AssistantMessage = {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  kind: string;
  status: string | null;
  toolCall: Record<string, unknown> | null;
  createdAt: string;
  expiresAt: string;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
