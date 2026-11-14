import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Clock3, Heart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AuroraParticles } from '../components/AuroraParticles';
import { Button, Card, Field, PageHeading } from '../components/ui';
import { getData, sendData } from '../lib/api';
import { todayKey } from '../lib/format';

type Session = {
  id: string;
  date: string;
  durationMinutes: number;
  inhaleSeconds: number;
  holdSeconds: number;
  exhaleSeconds: number;
  completedAt: string;
};
type Phase = 'ready' | 'inhale' | 'hold' | 'exhale' | 'complete';
type SessionInput = {
  durationMinutes: 1 | 3 | 5;
  inhaleSeconds: number;
  holdSeconds: number;
  exhaleSeconds: number;
  startedAt: string;
};

const durations = [1, 3, 5] as const;
const phaseWords: Record<Phase, { en: string; kn: string }> = {
  ready: { en: 'Take a moment to settle.', kn: 'ಒಂದು ಕ್ಷಣ ನೆಮ್ಮದಿಯಿಂದಿರಿ.' },
  inhale: { en: 'Breathe in…', kn: 'ಉಸಿರೆಳೆದುಕೊಳ್ಳಿ…' },
  hold: { en: 'Hold softly…', kn: 'ಮೃದುವಾಗಿ ತಡೆದುಕೊಳ್ಳಿ…' },
  exhale: { en: 'Breathe out…', kn: 'ನಿಧಾನವಾಗಿ ಉಸಿರು ಬಿಡಿ…' },
  complete: { en: 'You made a little space for yourself.', kn: 'ನಿಮಗಾಗಿ ಸ್ವಲ್ಪ ಸಮಯ ಮಾಡಿಕೊಂಡಿರಿ.' },
};

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function getPhase(elapsedSeconds: number, inhale: number, hold: number, exhale: number): Exclude<Phase, 'ready' | 'complete'> {
  const cycle = Math.max(1, inhale + hold + exhale);
  const position = elapsedSeconds % cycle;
  if (position < inhale) return 'inhale';
  if (position < inhale + hold) return 'hold';
  return 'exhale';
}

export function BreathePage() {
  const queryClient = useQueryClient();
  const [durationMinutes, setDurationMinutes] = useState<1 | 3 | 5>(1);
  const [inhaleSeconds, setInhaleSeconds] = useState(4);
  const [holdSeconds, setHoldSeconds] = useState(4);
  const [exhaleSeconds, setExhaleSeconds] = useState(6);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('ready');
  const [remaining, setRemaining] = useState(60);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const finishedSession = useRef<string | null>(null);
  const sessions = useQuery({ queryKey: ['breathing-sessions'], queryFn: () => getData<Session[]>('/breathing-sessions') });
  const recordSession = useMutation({
    mutationFn: (input: SessionInput) => sendData<Session>('/breathing-sessions', 'POST', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['breathing-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['insights'] });
      if (hapticsEnabled && Capacitor.getPlatform() === 'android') {
        void import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light })).catch(() => {});
      }
    },
  });
  const saveSession = recordSession.mutate;

  const sessionInput = useMemo(() => startedAt ? {
    durationMinutes,
    inhaleSeconds,
    holdSeconds,
    exhaleSeconds,
    startedAt,
  } satisfies SessionInput : null, [durationMinutes, exhaleSeconds, holdSeconds, inhaleSeconds, startedAt]);

  useEffect(() => {
    if (!running || !startedAt) return;
    const startedAtMs = new Date(startedAt).getTime();
    const tick = () => {
      const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
      const nextRemaining = Math.max(0, durationMinutes * 60 - elapsedSeconds);
      setRemaining(nextRemaining);
      if (nextRemaining === 0) {
        setRunning(false);
        setPhase('complete');
        if (finishedSession.current !== startedAt) {
          finishedSession.current = startedAt;
          saveSession({ durationMinutes, inhaleSeconds, holdSeconds, exhaleSeconds, startedAt });
        }
        return;
      }
      setPhase(getPhase(elapsedSeconds, inhaleSeconds, holdSeconds, exhaleSeconds));
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [durationMinutes, exhaleSeconds, holdSeconds, inhaleSeconds, running, saveSession, startedAt]);

  const chooseDuration = (minutes: 1 | 3 | 5) => {
    if (running) return;
    setDurationMinutes(minutes);
    setRemaining(minutes * 60);
    setPhase('ready');
  };

  const start = () => {
    const nextStartedAt = new Date().toISOString();
    finishedSession.current = null;
    setStartedAt(nextStartedAt);
    setRemaining(durationMinutes * 60);
    setPhase('inhale');
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setPhase('ready');
    setStartedAt(null);
    setRemaining(durationMinutes * 60);
  };

  const cue = phaseWords[phase];
  const todaySessions = (sessions.data ?? []).filter((session) => session.date.slice(0, 10) === todayKey());

  return <div className="breathe-page">
    <AuroraParticles className="breathe-particles" active breathing={running} inhaleSeconds={inhaleSeconds} holdSeconds={holdSeconds} exhaleSeconds={exhaleSeconds} intensity="focus" />
    <PageHeading eyebrow="A GENTLE PAUSE" title="Breathe" subtitle="A few quiet minutes can make room to begin again." action={<Link className="button button-quiet breathe-back" to="/app/wellness"><ArrowLeft size={15}/> Wellness</Link>} />
    <div className="breathe-layout">
      <Card className={`breath-session-card ${phase === 'complete' ? 'breath-complete' : ''}`}>
        <span className="breath-icon"><Heart size={18}/></span>
        <p className="eyebrow">AT YOUR OWN PACE</p>
        <div className={`breath-orbit phase-${phase}`} aria-hidden="true"><span/><i/><b/></div>
        <div className="breath-cue" role="status" aria-live="polite">
          <h2>{phase === 'complete' ? <><Check size={19}/> All done, gently.</> : cue.en}</h2>
          <p lang="kn">{cue.kn}</p>
        </div>
        <div className="breath-timer" aria-label={`${formatRemaining(remaining)} remaining`}>{formatRemaining(remaining)}</div>
        <p className="breath-session-note">{phase === 'complete' ? 'Your pause has been recorded.' : 'Nothing to get right. Follow the gentle cue if it feels comfortable.'}</p>
        {recordSession.isError && <p className="inline-error" role="alert">The session ended, but its log could not be saved. Please try saving again.</p>}
        <div className="breath-actions">
          {!running && phase !== 'complete' && <Button onClick={start} disabled={recordSession.isPending}>Begin {durationMinutes} minute{durationMinutes === 1 ? '' : 's'}</Button>}
          {running && <Button variant="outline" onClick={reset}>End session</Button>}
          {phase === 'complete' && recordSession.isError && sessionInput && <Button onClick={() => saveSession(sessionInput)} disabled={recordSession.isPending}>{recordSession.isPending ? 'Saving…' : 'Save session'}</Button>}
          {phase === 'complete' && !recordSession.isError && !recordSession.isPending && <Button variant="outline" onClick={start}>Take another pause</Button>}
        </div>
        {phase === 'complete' && <div className="breath-completion-note"><Sparkles size={15}/><span>This time belongs to you, with no streak or score attached.</span></div>}
      </Card>

      <div className="breath-settings-column">
        <Card className="breath-options-card">
          <div className="section-head"><div><p className="eyebrow">MAKE IT COMFORTABLE</p><h2>Choose a rhythm</h2></div></div>
          <div className="breath-duration-options" aria-label="Session length">
            {durations.map((minutes) => <button type="button" key={minutes} className={durationMinutes === minutes ? 'selected' : ''} aria-pressed={durationMinutes === minutes} disabled={running} onClick={() => chooseDuration(minutes)}><strong>{minutes}</strong><small>min</small></button>)}
          </div>
          <div className="breath-rhythm-fields">
            <Field label="Breathe in (seconds)"><input className="input" type="number" min="2" max="10" step="1" value={inhaleSeconds} disabled={running} onChange={(event) => setInhaleSeconds(Math.max(2, Math.min(10, Number(event.target.value) || 2)))} /></Field>
            <Field label="Hold (seconds)"><input className="input" type="number" min="0" max="10" step="1" value={holdSeconds} disabled={running} onChange={(event) => setHoldSeconds(Math.max(0, Math.min(10, Number(event.target.value) || 0)))} /></Field>
            <Field label="Breathe out (seconds)"><input className="input" type="number" min="2" max="10" step="1" value={exhaleSeconds} disabled={running} onChange={(event) => setExhaleSeconds(Math.max(2, Math.min(10, Number(event.target.value) || 2)))} /></Field>
          </div>
          <p className="breath-rhythm-caption">Default: 4 seconds in · 4 hold · 6 out</p>
          <label className="check-row breath-haptics"><input type="checkbox" checked={hapticsEnabled} onChange={(event) => setHapticsEnabled(event.target.checked)}/><span><strong>Gentle haptic at the end on Android</strong><small>This is optional. The app only sends a light pulse after a completed session.</small></span></label>
        </Card>

        <Card className="breath-history-card">
          <div className="section-head"><div><p className="eyebrow">NO STREAKS, JUST PAUSES</p><h2>Today’s breathing</h2></div><Clock3 size={17}/></div>
          {sessions.isLoading ? <p className="muted">Loading your saved pauses…</p> : todaySessions.length ? <ul className="breath-session-list">{todaySessions.map((session) => <li key={session.id}><span className="breath-history-check"><Check size={13}/></span><span><strong>{session.durationMinutes} minute pause</strong><small>Completed {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(session.completedAt))}</small></span></li>)}</ul> : <p className="muted">Completed sessions you choose to save will appear here.</p>}
          {sessions.isError && <p className="inline-error">Your breathing history couldn’t load right now.</p>}
          <p className="breath-today-total">{todaySessions.reduce((total, session) => total + session.durationMinutes, 0)} minutes recorded today</p>
        </Card>
      </div>
    </div>
  </div>;
}
