import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Button, Card, TextArea } from './ui';
import { sendData } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { useAIStatus } from '../lib/useAIStatus';

export function MorningBriefingCard() {
  const { lang } = useLanguage();
  const status = useAIStatus();
  const briefing = useMutation({ mutationFn: () => sendData<{ text: string; cached: boolean }>('/ai/morning-briefing', 'POST', { language: lang }) });
  if (!status.data?.features.morningBriefing) return null;
  return <Card className="ai-card"><div className="ai-card-heading"><span className="setting-icon"><Sparkles size={17}/></span><div><p className="eyebrow">A GENTLE START</p><h2>Morning briefing</h2></div></div><p className="muted">A short view of today’s plan, habits, water and latest sleep log.</p>{briefing.data && <p className="ai-result" lang={lang}>{briefing.data.text}</p>}{briefing.isError && <p className="inline-error">{briefing.error instanceof Error ? briefing.error.message : 'The briefing is unavailable right now.'}</p>}<Button variant="outline" onClick={() => briefing.mutate()} disabled={briefing.isPending}>{briefing.isPending ? 'Preparing…' : briefing.data ? 'Refresh briefing' : 'Prepare briefing'}</Button></Card>;
}

type QuickAddResult = { kind: 'task' | 'habit'; data: Record<string, unknown> };
export function AIQuickAddCard({ onSaved }: { onSaved: () => void }) {
  const { lang } = useLanguage();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<QuickAddResult | null>(null);
  const status = useAIStatus();
  const generate = useMutation({ mutationFn: () => sendData<QuickAddResult>('/ai/quick-add', 'POST', { text, language: lang }), onSuccess: (result) => setPreview(result) });
  const save = useMutation({ mutationFn: () => sendData(preview?.kind === 'task' ? '/tasks' : '/habits', 'POST', preview?.data), onSuccess: () => { setPreview(null); setText(''); onSaved(); } });
  if (!status.data?.features.quickAdd) return null;
  const label = String(preview?.data.title ?? preview?.data.name ?? 'New item');
  const dueAt = typeof preview?.data.dueAt === 'string' ? preview.data.dueAt : null;
  const frequency = typeof preview?.data.frequency === 'string' ? preview.data.frequency : null;
  return <Card className="ai-card"><div className="ai-card-heading"><span className="setting-icon"><Sparkles size={17}/></span><div><p className="eyebrow">OPTIONAL AI ASSIST</p><h2>Quick add from a thought</h2></div></div><p className="muted">Describe a task or habit in your own words. Nothing is saved until you review and confirm it.</p><TextArea rows={2} value={text} onChange={(event) => { setText(event.target.value); setPreview(null); }} maxLength={800} placeholder={lang === 'kn' ? 'ಉದಾ: ನಾಳೆ ಅಮ್ಮನಿಗೆ ಕರೆ ಮಾಡಬೇಕು' : 'e.g. Remind me to call Amma tomorrow at 6'} aria-label="Describe a task or habit" />{generate.isError && <p className="inline-error">{generate.error instanceof Error ? generate.error.message : 'Could not prepare a preview.'}</p>}{preview ? <div className="ai-preview" aria-live="polite"><p><strong>{preview.kind === 'task' ? 'Task preview' : 'Habit preview'}</strong></p><p>{label}</p>{preview.kind === 'task' && dueAt && <small>Due {new Date(dueAt).toLocaleString()}</small>}{preview.kind === 'habit' && frequency && <small>{frequency.toLowerCase()}</small>}<div className="modal-actions"><Button variant="quiet" onClick={() => setPreview(null)}>Edit request</Button><Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Confirm and save'}</Button></div>{save.isError && <p className="inline-error">{save.error instanceof Error ? save.error.message : 'Could not save this item.'}</p>}</div> : <Button variant="outline" onClick={() => generate.mutate()} disabled={!text.trim() || generate.isPending}>{generate.isPending ? 'Preparing preview…' : 'Create preview'}</Button>}</Card>;
}

export function WeeklyReflectionCard() {
  const { lang } = useLanguage();
  const status = useAIStatus();
  const reflection = useMutation({ mutationFn: () => sendData<{ title: string; patterns: string[]; gentleNextStep: string; safetyPause?: boolean; text?: string }>('/ai/weekly-reflection', 'POST', { language: lang }) });
  if (!status.data?.features.weeklyReflection) return null;
  return <Card className="ai-card"><div className="ai-card-heading"><span className="setting-icon"><Sparkles size={17}/></span><div><p className="eyebrow">LAST SEVEN DAYS</p><h2>Weekly reflection</h2></div></div><p className="muted">A supportive summary of reflection notes, moods and sleep you recorded.</p>{reflection.data && <div className="ai-result" lang={lang}>{reflection.data.safetyPause ? <p>{reflection.data.text}</p> : <><h3>{reflection.data.title}</h3><ul>{reflection.data.patterns.map((pattern) => <li key={pattern}>{pattern}</li>)}</ul><p>{reflection.data.gentleNextStep}</p></>}</div>}{reflection.isError && <p className="inline-error">{reflection.error instanceof Error ? reflection.error.message : 'Your summary is unavailable right now.'}</p>}<Button variant="outline" onClick={() => reflection.mutate()} disabled={reflection.isPending}>{reflection.isPending ? 'Reflecting…' : reflection.data ? 'Refresh reflection' : 'Create reflection'}</Button></Card>;
}

export function AIRecoveryNote({ ids, onExplanations }: { ids: string[]; onExplanations: (rows: Array<{ id: string; explanation: string }>) => void }) {
  const { lang } = useLanguage();
  const status = useAIStatus();
  const plan = useMutation({ mutationFn: () => sendData<{ steps: Array<{ id: string; explanation: string }> }>('/ai/comeback-plan', 'POST', { ids, language: lang }), onSuccess: (result) => onExplanations(result.steps) });
  if (!status.data?.features.comebackPlan || !ids.length) return null;
  return <><Button variant="quiet" onClick={() => plan.mutate()} disabled={plan.isPending}>{plan.isPending ? 'Finding kind words…' : 'I’m behind — help me begin'}</Button>{plan.isError && <p className="inline-error">{plan.error instanceof Error ? plan.error.message : 'The original suggestions are still here.'}</p>}</>;
}
