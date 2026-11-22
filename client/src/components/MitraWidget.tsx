import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUp, Check, ChevronRight, X } from 'lucide-react';
import { Button } from './ui';
import { MitraMascot, type MitraPose } from './MitraMascot';
import { getData, sendData } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { greeting } from '../lib/format';
import { isRecord, type AssistantMessage, type MitraPreferences } from '../lib/assistant';

const TOUR = [
  { label: 'My Day', labelKn: 'ನನ್ನ ದಿನ', path: '/app/day', detail: 'Start with a gentle view of today and the space you have.', detailKn: 'ಇಂದಿನ ದಿನ ಮತ್ತು ನಿಮಗಿರುವ ಸಮಯವನ್ನು ಶಾಂತವಾಗಿ ನೋಡಿ.' },
  { label: 'Tasks', labelKn: 'ಕೆಲಸಗಳು', path: '/app/tasks', detail: 'Add, sort, and move tasks as your day changes.', detailKn: 'ದಿನ ಬದಲಾಗುವಂತೆ ಕೆಲಸಗಳನ್ನು ಸೇರಿಸಿ, ಜೋಡಿಸಿ, ಬದಲಾಯಿಸಿ.' },
  { label: 'Planner', labelKn: 'ಯೋಜಕ', path: '/app/calendar', detail: 'Shape open time around the commitments you already have.', detailKn: 'ನಿಮ್ಮ ಬದ್ಧತೆಗಳ ಸುತ್ತ ಖಾಲಿ ಸಮಯವನ್ನು ಹೊಂದಿಸಿ.' },
  { label: 'Habits', labelKn: 'ಅಭ್ಯಾಸಗಳು', path: '/app/habits', detail: 'Build a rhythm that can flex with real life.', detailKn: 'ನಿಜ ಜೀವನಕ್ಕೆ ಹೊಂದಿಕೊಳ್ಳುವ ದಿನಚರಿ ರೂಪಿಸಿ.' },
  { label: 'Wellness', labelKn: 'ಕ್ಷೇಮ', path: '/app/wellness', detail: 'Check in with sleep, movement, mood, or a breathing pause.', detailKn: 'ನಿದ್ರೆ, ಚಲನೆ, ಮನಸ್ಥಿತಿ ಅಥವಾ ಉಸಿರಾಟದಲ್ಲಿ ದಾಖಲಿಸಿ.' },
  { label: 'Insights', labelKn: 'ಒಳನೋಟಗಳು', path: '/app/insights', detail: 'Notice patterns without turning them into a scorecard.', detailKn: 'ಅಂಕಪಟ್ಟಿಯಂತೆ ಮಾಡದೆ ನಿಮ್ಮ ಮಾದರಿಗಳನ್ನು ಗಮನಿಸಿ.' },
];

const HELP = [
  { terms: /task|to.do|ಕೆಲಸ/, label: 'Tasks', path: '/app/tasks', en: 'Open Tasks to add, sort, complete, or reschedule what you have planned.', kn: 'ಯೋಜಿಸಿರುವ ಕೆಲಸಗಳನ್ನು ಸೇರಿಸಲು, ಜೋಡಿಸಲು ಅಥವಾ ಪೂರ್ಣಗೊಳಿಸಲು ಕೆಲಸಗಳ ಪುಟ ತೆರೆಯಿರಿ.' },
  { terms: /habit|routine|ಅಭ್ಯಾಸ/, label: 'Habits', path: '/app/habits', en: 'Open Habits to make a flexible routine and check in for today.', kn: 'ಹೊಂದಿಕೊಳ್ಳುವ ದಿನಚರಿ ಮತ್ತು ಇಂದಿನ ಅಭ್ಯಾಸದ ದಾಖಲೆಗೆ ಅಭ್ಯಾಸಗಳ ಪುಟ ತೆರೆಯಿರಿ.' },
  { terms: /calendar|planner|schedule|ಯೋಜನೆ/, label: 'Planner', path: '/app/calendar', en: 'Open Planner to see your schedule and available time.', kn: 'ನಿಮ್ಮ ವೇಳಾಪಟ್ಟಿ ಮತ್ತು ಖಾಲಿ ಸಮಯ ನೋಡಲು ಯೋಜಕ ತೆರೆಯಿರಿ.' },
  { terms: /water|hydration|ನೀರು/, label: 'Water', path: '/app/wellness', en: 'Open Wellness to log water and review your other check-ins.', kn: 'ನೀರು ದಾಖಲಿಸಲು ಮತ್ತು ಇತರ ಪರಿಶೀಲನೆಗಳನ್ನು ನೋಡಲು ಕ್ಷೇಮ ಪುಟ ತೆರೆಯಿರಿ.' },
  { terms: /sleep|workout|wellness|ಆರೋಗ್ಯ|ನಿದ್ರೆ/, label: 'Wellness', path: '/app/wellness', en: 'Open Wellness to track sleep, movement, mood, or energy.', kn: 'ನಿದ್ರೆ, ಚಲನೆ, ಮನಸ್ಥಿತಿ ಅಥವಾ ಶಕ್ತಿಯನ್ನು ದಾಖಲಿಸಲು ಕ್ಷೇಮ ಪುಟ ತೆರೆಯಿರಿ.' },
  { terms: /breathe|breathing|ಉಸಿರಾಟ/, label: 'Breathe', path: '/app/wellness/breathe', en: 'Open Breathe for a short guided breathing pause.', kn: 'ಚಿಕ್ಕ ಉಸಿರಾಟ ವಿರಾಮಕ್ಕೆ ಉಸಿರಾಟ ಪುಟ ತೆರೆಯಿರಿ.' },
  { terms: /insight|progress|score|ಒಳನೋಟ/, label: 'Insights', path: '/app/insights', en: 'Open Insights to review patterns from the information you have logged.', kn: 'ನೀವು ದಾಖಲಿಸಿದ ಮಾಹಿತಿಯ ಮಾದರಿಗಳನ್ನು ನೋಡಲು ಒಳನೋಟ ತೆರೆಯಿರಿ.' },
  { terms: /setting|privacy|history|ಸೆಟ್ಟಿಂಗ್ಸ್/, label: 'Settings', path: '/app/settings', en: 'Open Settings to change Mitra, privacy, motion, or account preferences.', kn: 'ಮಿತ್ರ, ಗೌಪ್ಯತೆ, ಚಲನೆ ಅಥವಾ ಖಾತೆ ಆಯ್ಕೆಗಳನ್ನು ಬದಲಾಯಿಸಲು ಸೆಟ್ಟಿಂಗ್ಸ್ ತೆರೆಯಿರಿ.' },
];

function offlineReply(text: string, language: 'en' | 'kn') {
  const lower = text.toLocaleLowerCase();
  const item = HELP.find((entry) => entry.terms.test(lower));
  if (item) {
    const minutes = Number(lower.match(/\b([135])\s*(?:minutes?|mins?)\b/)?.[1] ?? 1);
    const path = item.label === 'Breathe' && /take|start|begin|ಉಸಿರಾಟ/i.test(lower) ? `${item.path}?start=1&minutes=${minutes}` : item.path;
    return { text: language === 'kn' ? item.kn : item.en, path };
  }
  return { text: language === 'kn' ? 'ನಾನು ಕೆಲಸಗಳು, ಅಭ್ಯಾಸಗಳು, ಯೋಜಕ, ಕ್ಷೇಮ, ಉಸಿರಾಟ ಅಥವಾ ಸೆಟ್ಟಿಂಗ್ಸ್ ಬಗ್ಗೆ ಸಹಾಯ ಮಾಡಬಹುದು. ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ; ಸಂದೇಶವನ್ನು ಉಳಿಸಿಲ್ಲ.' : 'I can guide you through Tasks, Habits, Planner, Wellness, Breathe, Insights, or Settings. You’re offline, so I haven’t saved or queued this message.' };
}

function actionSummary(message: AssistantMessage, language: 'en' | 'kn' = 'en') {
  const payload = message.toolCall;
  const fallback = language === 'kn' ? 'ಸೂಚಿಸಿದ ಬದಲಾವಣೆಯನ್ನು ಪರಿಶೀಲಿಸಿ.' : 'Review the proposed change.';
  if (!isRecord(payload) || !isRecord(payload.action)) return fallback;
  const action = payload.action;
  if (action.kind === 'create_task' && isRecord(action.data)) return language === 'kn' ? `ಕೆಲಸ: ${String(action.data.title ?? '')}` : `Task: ${String(action.data.title ?? '')}${action.data.dueAt ? ` · ${new Date(String(action.data.dueAt)).toLocaleString()}` : ''}`;
  if (action.kind === 'create_habit' && isRecord(action.data)) return language === 'kn' ? `ಅಭ್ಯಾಸ: ${String(action.data.name ?? '')}` : `Habit: ${String(action.data.name ?? '')}`;
  if (action.kind === 'complete_task' || action.kind === 'cancel_task') return language === 'kn' ? 'ನಿಮ್ಮ ಕೆಲಸದಲ್ಲಿ ಬದಲಾವಣೆ.' : 'Update one of your tasks.';
  if (action.kind === 'delete_task') return language === 'kn' ? 'ಆಯ್ದ ಕೆಲಸ ಅಳಿಸಿ.' : 'Delete the selected task.';
  if (action.kind === 'accept_reschedule') return language === 'kn' ? 'ಯೋಜಕ ಸೂಚಿಸಿದ ಸಮಯಕ್ಕೆ ಸರಿಸಿ.' : 'Move it to the planner’s suggested time.';
  if (action.kind === 'log_water' && isRecord(action.data)) return language === 'kn' ? `ನೀರು: ${String(action.data.amountMl ?? '')} ಮಿ.ಲೀ.` : `Water: ${String(action.data.amountMl ?? '')} ml`;
  if (action.kind === 'check_habit') return language === 'kn' ? 'ಅಭ್ಯಾಸಕ್ಕೆ ದಾಖಲಿಸಿ.' : 'Check in one of your habits.';
  if (action.kind === 'log_sleep') return language === 'kn' ? 'ನಿದ್ರೆಯ ದಾಖಲೆಯನ್ನು ಉಳಿಸಿ.' : 'Save a sleep entry.';
  if (action.kind === 'log_workout') return language === 'kn' ? 'ವ್ಯಾಯಾಮದ ದಾಖಲೆಯನ್ನು ಉಳಿಸಿ.' : 'Save a workout entry.';
  if (action.kind === 'log_food' && isRecord(action.data)) return language === 'kn' ? `ಆಹಾರ: ${String(action.data.name ?? '')}` : `Food: ${String(action.data.name ?? '')}`;
  if (action.kind === 'save_reflection') return language === 'kn' ? 'ಇಂದಿನ ಪ್ರತಿಬಿಂಬ ಉಳಿಸಿ.' : 'Save today’s reflection.';
  return fallback;
}

export function MitraWidget() {
  const { lang } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tourSeen = useRef(false);
  const [open, setOpen] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [tourRect, setTourRect] = useState<DOMRect | null>(null);
  const [draft, setDraft] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);
  const [ephemeral, setEphemeral] = useState<AssistantMessage[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const openFromNavigation = () => { setOpen(true); setTourStep(null); };
    window.addEventListener('namma-dina:open-mitra', openFromNavigation);
    return () => window.removeEventListener('namma-dina:open-mitra', openFromNavigation);
  }, []);
  const settings = useQuery({ queryKey: ['assistant-settings'], queryFn: () => getData<MitraPreferences>('/assistant/settings'), staleTime: 30_000 });
  const mitraState = useQuery({
    queryKey: ['mitra-state'],
    queryFn: () => getData<{
      level: number;
      xp: number;
      totalXp: number;
      evolutionStage: 'ember' | 'flame' | 'radiance' | 'aurora';
      mood: 'idle' | 'happy' | 'thinking' | 'listening' | 'sleepy' | 'celebrating' | 'concerned';
      requiredXp: number;
      progressPercent: number;
      stageTitle: string;
    }>('/mitra/state'),
    refetchInterval: 15_000,
  });
  const history = useQuery({ queryKey: ['assistant-history'], queryFn: () => getData<AssistantMessage[]>('/assistant/history'), enabled: open && navigator.onLine, retry: false });
  const nudgeLanguage = settings.data?.language === 'kn' || (settings.data?.language !== 'en' && lang === 'kn') ? 'kn' : 'en';
  const nudges = useQuery({ queryKey: ['assistant-nudges', nudgeLanguage], queryFn: () => getData<AssistantMessage[]>(`/assistant/nudges?language=${nudgeLanguage}`), enabled: open && navigator.onLine && document.visibilityState === 'visible' && Boolean(settings.data?.proactiveNudgesEnabled), retry: false });
  const sendMessage = useMutation({ mutationFn: (text: string) => sendData<{ message: AssistantMessage }>('/assistant/message', 'POST', { text, language: settings.data?.language === 'auto' || !settings.data?.language ? lang : settings.data.language }), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['assistant-history'] }); } });
  const actionMutation = useMutation({ mutationFn: (body: { confirmActionId: string; decision: 'confirm' | 'cancel' } | { undoActionId: string }) => sendData<{ message: AssistantMessage }>('/assistant/message', 'POST', body), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['assistant-history'] }); void queryClient.invalidateQueries({ queryKey: ['overview'] }); void queryClient.invalidateQueries({ queryKey: ['tasks'] }); void queryClient.invalidateQueries({ queryKey: ['habits'] }); void queryClient.invalidateQueries({ queryKey: ['habit-logs'] }); void queryClient.invalidateQueries({ queryKey: ['water'] }); void queryClient.invalidateQueries({ queryKey: ['sleep'] }); void queryClient.invalidateQueries({ queryKey: ['workouts'] }); void queryClient.invalidateQueries({ queryKey: ['food'] }); void queryClient.invalidateQueries({ queryKey: ['reflections'] }); void queryClient.invalidateQueries({ queryKey: ['insights'] }); } });
  const dismissNudge = useMutation({ mutationFn: (id: string) => sendData(`/assistant/nudges/${encodeURIComponent(id)}/dismiss`, 'POST', {}), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['assistant-history'] }); void queryClient.invalidateQueries({ queryKey: ['assistant-nudges'] }); } });
  const messages = useMemo(() => [...new Map([...ephemeral, ...(history.data ?? []), ...(nudges.data ?? [])].map((message) => [message.id, message])).values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [ephemeral, history.data, nudges.data]);
  const chosenLanguage = settings.data?.language === 'auto' || !settings.data?.language ? lang : settings.data.language;
  const copy = chosenLanguage === 'kn'
    ? { guide: 'ಮಾರ್ಗದರ್ಶಿ · AI ಸರ್ವರ್‌ನಲ್ಲಿ ಹೊಂದಿಸಲಾಗಿಲ್ಲ', aiOff: 'ಮಾರ್ಗದರ್ಶಿ · ಐಚ್ಛಿಕ AI ಆಫ್ ಇದೆ', aiOn: 'ಐಚ್ಛಿಕ AI ಆನ್ ಇದೆ', offline: 'ಆಫ್‌ಲೈನ್ ಮಾರ್ಗದರ್ಶಿ · ಸಂದೇಶಗಳನ್ನು ಸಾಲಿನಲ್ಲಿ ಇಟ್ಟಿಲ್ಲ', loading: 'ನಿಮ್ಮ ಮಾತುಕತೆಯನ್ನು ತೆರೆಯುತ್ತಿದೆ…', review: 'ಉಳಿಸುವ ಮೊದಲು ಪರಿಶೀಲಿಸಿ', cancel: 'ರದ್ದುಮಾಡಿ', confirm: 'ದೃಢೀಕರಿಸಿ', undo: 'ಈ ಬದಲಾವಣೆಯನ್ನು ಮರಳಿ ಮಾಡಿ', dismiss: 'ಮುಚ್ಚಿ', open: 'ಪುಟ ತೆರೆಯಿರಿ', water: 'ಇಂದಿನ ನೀರು', week: 'ನನ್ನ ವಾರ', tour: 'ಸುತ್ತು ತೋರಿಸಿ', typing: 'ಮಿತ್ರ ಯೋಚಿಸುತ್ತಿದ್ದಾರೆ', footer: 'ಚಾಟ್ 30 ದಿನಗಳವರೆಗೆ ಉಳಿಯುತ್ತದೆ. ಮಿತ್ರ ತಪ್ಪು ಮಾಡಬಹುದು; ಬದಲಾವಣೆಯನ್ನು ಉಳಿಸುವ ಮೊದಲು ನೀವು ದೃಢೀಕರಿಸುತ್ತೀರಿ.', close: 'ಮಿತ್ರನನ್ನು ಮುಚ್ಚಿ' }
    : { guide: 'Guide mode · AI is not configured', aiOff: 'Guide mode · optional AI is off', aiOn: 'Optional AI is enabled', offline: 'Offline guide · no messages are queued', loading: 'Opening your conversation…', review: 'Review before saving', cancel: 'Cancel', confirm: 'Confirm', undo: 'Undo this change', dismiss: 'Dismiss', open: 'Open page', water: 'Water today', week: 'My week', tour: 'Show me around', typing: 'Mitra is thinking', footer: 'Chat is saved for up to 30 days. Mitra can make mistakes; you approve every change before it is saved.', close: 'Close Mitra' };
  const guideStatus = !settings.data?.providerAvailable ? copy.guide : settings.data.aiEnabled && settings.data.aiConsentGiven ? copy.aiOn : copy.aiOff;
  const contextualHelp = [...HELP].sort((a, b) => b.path.length - a.path.length).find((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));
  const pose: MitraPose = tourStep !== null ? 'happy' : sendMessage.isPending || actionMutation.isPending ? 'thinking' : open ? 'listening' : 'idle';

  function insertEphemeral(role: 'user' | 'assistant', text: string, kind = 'text', path?: string) {
    const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const message: AssistantMessage = { id, userId: '', role, content: text, kind: path ? 'navigation' : kind, status: null, toolCall: path ? { path } : null, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString() };
    setEphemeral((rows) => [...rows, message].slice(-20));
  }

  function submit(text = draft) {
    const value = text.trim();
    if (!value || sendMessage.isPending) return;
    setDraft('');
    if (!navigator.onLine) {
      const answer = offlineReply(value, chosenLanguage);
      insertEphemeral('user', value);
      insertEphemeral('assistant', answer.text, 'text', answer.path);
      if (answer.path) navigate(answer.path);
      return;
    }
    sendMessage.mutate(value);
  }

  function onSubmit(event: FormEvent) { event.preventDefault(); submit(); }

  const beginTour = useCallback((index = 0) => {
    setTourStep(index);
    setOpen(false);
    navigate(TOUR[index]!.path);
  }, [navigate]);

  function finishTour() {
    setTourStep(null);
    setTourRect(null);
    tourSeen.current = true;
    void sendData('/assistant/settings', 'PATCH', { tourCompleted: true }).then(() => queryClient.invalidateQueries({ queryKey: ['assistant-settings'] }));
  }

  function keyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    if (event.key !== 'Tab') return;
    const items = panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),a[href],[tabindex="0"]');
    if (!items?.length) return;
    const first = items[0]!; const last = items[items.length - 1]!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  useEffect(() => {
    const online = () => setOffline(false); const offlineHandler = () => setOffline(true);
    window.addEventListener('online', online); window.addEventListener('offline', offlineHandler);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offlineHandler); };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    const setViewport = () => document.documentElement.style.setProperty('--mitra-vh', `${viewport?.height ?? window.innerHeight}px`);
    setViewport(); viewport?.addEventListener('resize', setViewport);
    let showHandle: { remove: () => Promise<void> } | undefined; let hideHandle: { remove: () => Promise<void> } | undefined;
    void import('@capacitor/keyboard').then(async ({ Keyboard }) => {
      showHandle = await Keyboard.addListener('keyboardDidShow', (event) => setKeyboardHeight(event.keyboardHeight));
      hideHandle = await Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    }).catch(() => undefined);
    return () => { viewport?.removeEventListener('resize', setViewport); if (showHandle) void showHandle.remove(); if (hideHandle) void hideHandle.remove(); };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.mitraOpen = String(open);
    return () => { delete document.documentElement.dataset.mitraOpen; };
  }, [open]);

  useEffect(() => {
    const updateActive = () => { document.documentElement.dataset.mitraActive = String(document.visibilityState === 'visible'); };
    updateActive();
    document.addEventListener('visibilitychange', updateActive);
    let appHandle: { remove: () => Promise<void> } | undefined;
    void import('@capacitor/app').then(async ({ App }) => {
      appHandle = await App.addListener('appStateChange', ({ isActive }) => { document.documentElement.dataset.mitraActive = String(isActive && document.visibilityState === 'visible'); });
    }).catch(() => undefined);
    return () => { document.removeEventListener('visibilitychange', updateActive); if (appHandle) void appHandle.remove(); delete document.documentElement.dataset.mitraActive; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    const close = () => { if (open) setOpen(false); };
    window.addEventListener('mitra:back', close);
    return () => window.removeEventListener('mitra:back', close);
  }, [open]);

  useEffect(() => {
    const clearLocalHistory = () => setEphemeral([]);
    window.addEventListener('mitra:history-cleared', clearLocalHistory);
    return () => window.removeEventListener('mitra:history-cleared', clearLocalHistory);
  }, []);

  useEffect(() => {
    if (open) { window.setTimeout(() => inputRef.current?.focus(), 60); }
    else if (document.documentElement.dataset.mitraOpen === 'false') { launcherRef.current?.focus(); }
  }, [open]);

  useEffect(() => {
    if (!settings.isLoading && settings.data && !settings.data.tourCompletedAt && !tourSeen.current) {
      tourSeen.current = true;
      window.setTimeout(() => beginTour(0), 500);
    } else if (settings.data?.tourCompletedAt) tourSeen.current = false;
  }, [beginTour, settings.data, settings.isLoading]);

  useEffect(() => {
    if (tourStep === null) return;
    const step = TOUR[tourStep]!;
    if (location.pathname !== step.path) navigate(step.path);
    const timer = window.setTimeout(() => {
      const targets = [...document.querySelectorAll<HTMLElement>(`a[href="${step.path}"]`)].filter((element) => element.getClientRects().length);
      const target = targets[0] ?? document.querySelector<HTMLElement>('.page-heading h1, .dashboard-heading h1, h1');
      setTourRect(target?.getBoundingClientRect() ?? null);
    }, 140);
    return () => window.clearTimeout(timer);
  }, [tourStep, location.pathname, navigate]);

  useEffect(() => {
    if (!open || !settings.data?.voiceEnabled || !('speechSynthesis' in window)) return;
    const latest = history.data?.filter((message) => message.role === 'assistant').at(-1);
    if (!latest || latest.id.startsWith('offline-')) return;
    const lastSpoken = window.sessionStorage.getItem('mitra-last-spoken');
    if (lastSpoken === latest.id) return;
    const speech = new SpeechSynthesisUtterance(latest.content);
    speech.lang = chosenLanguage === 'kn' ? 'kn-IN' : 'en-IN';
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(speech);
    window.sessionStorage.setItem('mitra-last-spoken', latest.id);
  }, [history.data, open, settings.data?.voiceEnabled, chosenLanguage]);

  if (!settings.data?.launcherVisible) return <>
    {tourStep !== null && <TourOverlay step={tourStep} rect={tourRect} language={chosenLanguage} onNext={() => tourStep < TOUR.length - 1 ? beginTour(tourStep + 1) : finishTour()} onSkip={finishTour}/>}
  </>;

  return <>
    {!open && <button ref={launcherRef} className="mitra-launcher" onClick={() => { setOpen(true); setTourStep(null); }} aria-label={chosenLanguage === 'kn' ? 'ಮಿತ್ರ ಸಹಾಯಕ ತೆರೆಯಿರಿ' : 'Open Mitra assistant'} title="Mitra"><MitraMascot pose={pose} stage={mitraState.data?.evolutionStage ?? 'flame'} level={mitraState.data?.level ?? 1}/></button>}
    {open && <>
      <button className="mitra-sheet-scrim" aria-label="Close Mitra" onClick={() => setOpen(false)}/>
      <section ref={panelRef} className="mitra-panel" role="dialog" aria-modal="true" aria-labelledby="mitra-title" aria-describedby="mitra-description" onKeyDown={keyDown} style={{ '--mitra-keyboard-height': `${keyboardHeight}px` } as CSSProperties}>
        <header className="mitra-header">
          <MitraMascot pose={pose} stage={mitraState.data?.evolutionStage ?? 'flame'} level={mitraState.data?.level ?? 1}/>
          <div>
            <h2 id="mitra-title">Mitra <small>ಮಿತ್ರ</small></h2>
            {mitraState.data && (
              <div className="mitra-level-bar" title={`${mitraState.data.xp} / ${mitraState.data.requiredXp} XP`}>
                <span><strong>Lvl {mitraState.data.level}</strong> · {mitraState.data.stageTitle}</span>
                <div className="mitra-xp-track">
                  <div className="mitra-xp-fill" style={{ width: `${mitraState.data.progressPercent}%` }} />
                </div>
                <span>{mitraState.data.progressPercent}%</span>
              </div>
            )}
            <p id="mitra-description">{offline ? copy.offline : guideStatus}</p>
          </div>
          <button className="icon-button" aria-label={copy.close} onClick={() => setOpen(false)}><X size={18}/></button>
        </header>
        <div className="mitra-messages" aria-live="polite" aria-relevant="additions text">
          {history.isLoading && <p className="mitra-loading">{copy.loading}</p>}
          {nudges.isError && <p className="mitra-error">{chosenLanguage === 'kn' ? 'ಈಗ ಚಿಕ್ಕ ನೆನಪನ್ನು ಪರಿಶೀಲಿಸಲಾಗಲಿಲ್ಲ.' : 'I couldn’t check for a gentle nudge right now.'}</p>}
          {messages.length === 0 && <div className="mitra-welcome"><MitraMascot pose="happy"/><p>{chosenLanguage === 'kn' ? `${greeting(new Date().getHours(), 'kn')}! ನಾನು ಮಿತ್ರ. ನಿಮಗೆ ಯಾವುದು ಸಹಾಯ ಮಾಡುತ್ತದೆ?` : `${greeting(new Date().getHours(), 'en')}! I’m Mitra. What would help right now?`}</p>{contextualHelp && <small className="muted">{chosenLanguage === 'kn' ? contextualHelp.kn : contextualHelp.en}</small>}<div className="mitra-chips"><button onClick={() => submit(chosenLanguage === 'kn' ? 'ಇಂದು ನನ್ನ ದಿನ ಹೇಗಿದೆ?' : 'How’s my day?')}>{chosenLanguage === 'kn' ? 'ಇಂದು ಹೇಗಿದೆ?' : 'How’s my day?'}</button><button onClick={() => setDraft(chosenLanguage === 'kn' ? 'ಕೆಲಸ ಸೇರಿಸಿ ' : 'Add a task to ')}>{chosenLanguage === 'kn' ? 'ಕೆಲಸ ಸೇರಿಸಿ' : 'Add a task'}</button><button onClick={() => submit(chosenLanguage === 'kn' ? 'ನೀರು 250 ml ದಾಖಲಿಸಿ' : 'Log water 250 ml')}>{chosenLanguage === 'kn' ? 'ನೀರು ದಾಖಲಿಸಿ' : 'Log water'}</button><button onClick={() => submit(chosenLanguage === 'kn' ? 'ಒಂದು ನಿಮಿಷ ಉಸಿರಾಟ' : 'Take a 1-minute breath')}>{chosenLanguage === 'kn' ? 'ಒಂದು ನಿಮಿಷ ಉಸಿರಾಟ' : 'Take a 1-minute breath'}</button></div></div>}
          {messages.map((message) => <article key={message.id} className={`mitra-message ${message.role === 'user' ? 'from-user' : 'from-mitra'}`}><p>{message.content}</p>{message.kind === 'nudge' && message.status === 'active' && <button className="mitra-undo" onClick={() => dismissNudge.mutate(message.id)} disabled={dismissNudge.isPending}>{copy.dismiss}</button>}{message.kind === 'action_preview' && message.status === 'pending' && <div className="mitra-action-card"><small>{copy.review}</small><strong>{actionSummary(message, chosenLanguage)}</strong><div><Button variant="quiet" onClick={() => actionMutation.mutate({ confirmActionId: message.id, decision: 'cancel' })} disabled={actionMutation.isPending}>{copy.cancel}</Button><Button onClick={() => actionMutation.mutate({ confirmActionId: message.id, decision: 'confirm' })} disabled={actionMutation.isPending}><Check size={14}/> {copy.confirm}</Button></div></div>}{message.kind === 'action_result' && message.status === 'applied' && <button className="mitra-undo" onClick={() => actionMutation.mutate({ undoActionId: message.id })} disabled={actionMutation.isPending}>{copy.undo}</button>}{message.kind === 'navigation' && isRecord(message.toolCall) && typeof message.toolCall.path === 'string' && <Link className="mitra-open-link" to={message.toolCall.path} onClick={() => setOpen(false)}>{copy.open} <ArrowRight size={13}/></Link>}</article>)}
          {(sendMessage.isPending || actionMutation.isPending) && <div className="mitra-typing" role="status"><MitraMascot pose="thinking"/><span>{copy.typing}</span><i/><i/><i/></div>}
          {(sendMessage.isError || actionMutation.isError) && <p className="mitra-error">{sendMessage.error instanceof Error ? sendMessage.error.message : actionMutation.error instanceof Error ? actionMutation.error.message : 'I couldn’t reach the app. Nothing has been queued.'}</p>}
        </div>
        <div className="mitra-chip-row"><button onClick={() => submit(chosenLanguage === 'kn' ? 'ಇಂದು ಎಷ್ಟು ನೀರು ಕುಡಿದಿದ್ದೇನೆ?' : 'How much water have I had?')}>{copy.water}</button><button onClick={() => submit(chosenLanguage === 'kn' ? 'ನನ್ನ ವಾರದ ಸಾರಾಂಶ' : 'Summarise my week')}>{copy.week}</button><button onClick={() => beginTour(0)}>{copy.tour}</button></div>
        <form className="mitra-composer" onSubmit={onSubmit}><input ref={inputRef} className="input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={chosenLanguage === 'kn' ? 'ಮಿತ್ರನನ್ನು ಏನು ಕೇಳಬೇಕು?' : 'Ask Mitra or type a short request'} aria-label="Message Mitra" maxLength={2000}/><button type="submit" aria-label="Send message" disabled={!draft.trim() || sendMessage.isPending}><ArrowUp size={17}/></button></form>
        <small className="mitra-footer">{copy.footer}</small>
      </section>
    </>}
    {tourStep !== null && <TourOverlay step={tourStep} rect={tourRect} language={chosenLanguage} onNext={() => tourStep < TOUR.length - 1 ? beginTour(tourStep + 1) : finishTour()} onSkip={finishTour}/>}
  </>;
}

function TourOverlay({ step, rect, language, onNext, onSkip }: { step: number; rect: DOMRect | null; language: 'en' | 'kn'; onNext: () => void; onSkip: () => void }) {
  const item = TOUR[step]!;
  const label = language === 'kn' ? item.labelKn : item.label;
  return <div className="mitra-tour-layer"><div className="mitra-tour-highlight" style={rect ? { top: Math.max(4, rect.top - 7), left: Math.max(4, rect.left - 7), width: Math.max(24, rect.width + 14), height: Math.max(24, rect.height + 14) } : { top: '35%', left: '8%', width: '84%', height: 60 }}/><section className="mitra-tour-card" role="dialog" aria-modal="true" aria-label={language === 'kn' ? `ಮಾರ್ಗದರ್ಶಿ ಸುತ್ತು: ${label}` : `Guided tour: ${label}`}><div className="mitra-tour-step"><MitraMascot pose="happy"/><span>{language === 'kn' ? `${TOUR.length}ರಲ್ಲಿ ಹಂತ ${step + 1}` : `STEP ${step + 1} OF ${TOUR.length}`}</span></div><h2>{label}</h2><p>{language === 'kn' ? item.detailKn : item.detail}</p><div className="mitra-tour-actions"><button onClick={onSkip}>{language === 'kn' ? 'ಸುತ್ತು ಬಿಡಿ' : 'Skip tour'}</button><Button onClick={onNext}>{step === TOUR.length - 1 ? (language === 'kn' ? 'ಮುಗಿಸಿ' : 'Finish') : (language === 'kn' ? 'ಮುಂದೆ' : 'Next')} {step === TOUR.length - 1 ? <Check size={14}/> : <ChevronRight size={14}/>}</Button></div></section></div>;
}
