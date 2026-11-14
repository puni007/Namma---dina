import { env } from '../../config/env.js';
import { localDayBounds, todayInTimezone } from '../../lib/dates.js';
import { HttpError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

export const AI_DAILY_QUOTA = 20;
export const AI_REQUEST_TIMEOUT_MS = 15_000;
export type AIUsage = { inputTokens: number; outputTokens: number };
export type AIResponse = { text: string; usage: AIUsage };
export type AIProvider = (system: string, message: string, maxTokens: number) => Promise<AIResponse>;

let providerAvailableForTests: boolean | null = null;
export function hasAIProvider() {
  return providerAvailableForTests ?? Boolean(env.ANTHROPIC_API_KEY && env.AI_MODEL);
}

const wait = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

const anthropicProvider: AIProvider = async (system, message, maxTokens) => {
  if (!env.ANTHROPIC_API_KEY || !env.AI_MODEL) throw new HttpError(503, 'AI features are not configured.', 'AI_UNAVAILABLE');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: env.AI_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: message }] }),
        signal: controller.signal,
      });
      if ((response.status === 429 || response.status >= 500) && attempt === 0) {
        await wait(400);
        continue;
      }
      if (!response.ok) throw new HttpError(503, 'Your AI companion is taking a pause. Please try again later.', 'AI_PROVIDER_UNAVAILABLE');
      const result = await response.json() as {
        content?: Array<{ type?: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const text = result.content?.find((part) => part.type === 'text')?.text?.trim();
      if (!text) throw new HttpError(503, 'Your AI companion could not prepare a response. Please try again.', 'AI_INVALID_RESPONSE');
      return {
        text,
        usage: {
          inputTokens: Math.max(0, Math.trunc(result.usage?.input_tokens ?? 0)),
          outputTokens: Math.max(0, Math.trunc(result.usage?.output_tokens ?? 0)),
        },
      };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (attempt === 0) {
        await wait(400);
        continue;
      }
      throw new HttpError(503, 'Your AI companion is taking a pause. Please try again later.', 'AI_PROVIDER_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new HttpError(503, 'Your AI companion is taking a pause. Please try again later.', 'AI_PROVIDER_UNAVAILABLE');
};

let provider: AIProvider = anthropicProvider;
export function setAIProviderForTests(next: AIProvider | null) {
  provider = next ?? anthropicProvider;
  providerAvailableForTests = next ? true : null;
}

export async function requestAI(system: string, message: string, maxTokens: number) {
  return provider(system, message, maxTokens);
}

export async function runAIRequest(userId: string, timezone: string, feature: string, system: string, message: string, maxTokens: number) {
  if (!hasAIProvider()) throw new HttpError(503, 'AI features are not configured.', 'AI_UNAVAILABLE');
  const bounds = localDayBounds(todayInTimezone(timezone), timezone);
  const usageRow = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const count = await tx.aIUsage.count({ where: { userId, createdAt: { gte: bounds.start, lt: bounds.end } } });
    if (count >= AI_DAILY_QUOTA) throw new HttpError(429, 'Mitra is resting. Your daily assistant limit is used; try again tomorrow.', 'AI_DAILY_QUOTA');
    return tx.aIUsage.create({ data: { userId, feature } });
  }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 15_000 });
  try {
    const response = await requestAI(system, message, maxTokens);
    await prisma.aIUsage.update({ where: { id: usageRow.id }, data: response.usage });
    return response;
  } catch (error) {
    await prisma.aIUsage.delete({ where: { id: usageRow.id } }).catch(() => undefined);
    throw error;
  }
}
