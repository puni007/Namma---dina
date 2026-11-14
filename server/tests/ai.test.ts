import { afterEach, describe, expect, it, vi } from 'vitest';
import { looksLikeDistress, parseAIJson, validateQuickAddResponse } from '../src/routes/ai.js';
import { requestAI, setAIProviderForTests } from '../src/services/ai/provider.js';

afterEach(() => setAIProviderForTests(null));

describe('AI companion safeguards', () => {
  it('uses an injected provider in tests without making a network request', async () => {
    const fakeProvider = vi.fn(async () => ({ text: 'A calm note.', usage: { inputTokens: 12, outputTokens: 4 } }));
    setAIProviderForTests(fakeProvider);
    await expect(requestAI('system rules', 'untrusted text', 100)).resolves.toEqual({
      text: 'A calm note.', usage: { inputTokens: 12, outputTokens: 4 },
    });
    expect(fakeProvider).toHaveBeenCalledWith('system rules', 'untrusted text', 100);
  });

  it('parses a JSON response in a fenced code block', () => {
    expect(parseAIJson('```json\n{"kind":"task","data":{"title":"Call Amma"}}\n```')).toEqual({
      kind: 'task', data: { title: 'Call Amma' },
    });
  });

  it('accepts task and habit previews only when they match existing schemas', () => {
    expect(validateQuickAddResponse({ kind: 'task', data: { title: 'Call Amma', priority: 'MEDIUM' } }))
      .toEqual({ kind: 'task', data: { title: 'Call Amma', priority: 'MEDIUM' } });
    expect(validateQuickAddResponse({ kind: 'habit', data: { name: 'Stretch', frequency: 'DAILY' } }))
      .toEqual({ kind: 'habit', data: { name: 'Stretch', frequency: 'DAILY' } });
    expect(validateQuickAddResponse({ kind: 'task', data: { title: 'Call Amma', runSql: true } })).toBeNull();
    expect(validateQuickAddResponse({ kind: 'task', data: { title: 'Call Amma', priority: 'NOW' } })).toBeNull();
  });

  it('recognizes English and Kannada distress signals before analysis', () => {
    expect(looksLikeDistress(['I want to die'])).toBe(true);
    expect(looksLikeDistress(['ನನಗೆ ಆತ್ಮಹತ್ಯೆ ಆಲೋಚನೆ ಬರುತ್ತಿದೆ'])).toBe(true);
    expect(looksLikeDistress(['I had a difficult week but called a friend'])).toBe(false);
  });
});
