import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Baby,
  Check,
  Flower2,
  Heart,
  Lock,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { getData, sendData } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { Button, Loading, TextInput } from '../components/ui';

type ReproductiveProfile = {
  id?: string;
  mode: 'cycle' | 'pregnancy' | 'postpartum' | 'pause';
  consentGiven: boolean;
  cycleLengthDays?: number;
  periodLengthDays?: number;
  lastPeriodStart?: string | null;
  pregnantSince?: string | null;
  estimatedDueDate?: string | null;
  notes?: string;
  cycleStats?: {
    currentDayOfCycle?: number;
    currentPhase?: string;
    nextPeriodDate?: string;
    daysUntilNextPeriod?: number;
    gestationalWeeks?: number;
    gestationalDays?: number;
    trimester?: number;
  } | null;
};

type CycleEntry = {
  id: string;
  date: string;
  phase?: string;
  flowIntensity?: 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
  symptoms: string[];
  mood: string;
  notes: string;
  temperatureCelsius?: number | null;
  fetalMovementCount?: number | null;
};

const SYMPTOMS_LIST = [
  'Cramps',
  'Fatigue',
  'Tender breasts',
  'Headache',
  'Bloating',
  'Glowing',
  'Calm',
  'Anxious',
  'Energetic',
  'Backache',
  'Nausea',
];

const PREGNANCY_MILESTONES: Record<number, { size: string; tip: string }> = {
  1: { size: 'Poppy seed', tip: 'Rest plenty and gently nourish your body.' },
  2: { size: 'Sweet pea', tip: 'Morning sickness may fluctuate; sip warm ginger or mint tea.' },
  3: { size: 'Raspberry', tip: 'Your circulatory system is growing. Stay comfortably hydrated.' },
  4: { size: 'Avocado', tip: 'Second trimester energy is blooming. Enjoy gentle walks.' },
  5: { size: 'Banana', tip: 'Movement sensations can begin. Rest your feet whenever you need.' },
  6: { size: 'Eggplant', tip: 'Gentle pelvic tilts and stretching can ease lower back comfort.' },
  7: { size: 'Coconut', tip: 'Third trimester: prioritize quiet evenings and pillows for support.' },
  8: { size: 'Pineapple', tip: 'Practice calm breathing cycles. Your body knows how to pace itself.' },
  9: { size: 'Watermelon', tip: 'Every day is a milestone. Rest, breathe, and trust your rhythm.' },
};

export function ReproductivePage() {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [flow, setFlow] = useState<'none' | 'spotting' | 'light' | 'medium' | 'heavy'>('medium');
  const [temp, setTemp] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [fetalKicks, setFetalKicks] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [configPeriodStart, setConfigPeriodStart] = useState('');
  const [configCycleLength, setConfigCycleLength] = useState(28);
  const [configPregnantSince, setConfigPregnantSince] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['reproductive-profile'],
    queryFn: () => getData<ReproductiveProfile>('/reproductive/profile'),
  });

  const entriesQuery = useQuery({
    queryKey: ['reproductive-entries'],
    queryFn: () => getData<CycleEntry[]>('/reproductive/entries'),
    enabled: Boolean(profileQuery.data?.consentGiven),
  });

  const consentMutation = useMutation({
    mutationFn: (consent: boolean) => sendData('/reproductive/consent', 'POST', { consent }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reproductive-profile'] });
      void queryClient.invalidateQueries({ queryKey: ['reproductive-entries'] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (body: Partial<ReproductiveProfile>) => sendData('/reproductive/profile', 'PATCH', body),
    onSuccess: () => {
      setShowConfig(false);
      void queryClient.invalidateQueries({ queryKey: ['reproductive-profile'] });
    },
  });

  const logEntryMutation = useMutation({
    mutationFn: () => {
      const today = new Date().toISOString().slice(0, 10);
      return sendData('/reproductive/entry', 'POST', {
        date: today,
        flowIntensity: profileQuery.data?.mode === 'pregnancy' ? 'none' : flow,
        symptoms: selectedSymptoms,
        notes: logNotes,
        temperatureCelsius: temp ? parseFloat(temp) : undefined,
        fetalMovementCount: profileQuery.data?.mode === 'pregnancy' ? fetalKicks : undefined,
      });
    },
    onSuccess: () => {
      setSelectedSymptoms([]);
      setLogNotes('');
      setTemp('');
      void queryClient.invalidateQueries({ queryKey: ['reproductive-entries'] });
      void queryClient.invalidateQueries({ queryKey: ['reproductive-profile'] });
    },
  });

  const wipeMutation = useMutation({
    mutationFn: () => sendData('/reproductive/data', 'DELETE'),
    onSuccess: () => {
      setDeleteConfirmOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['reproductive-profile'] });
      void queryClient.invalidateQueries({ queryKey: ['reproductive-entries'] });
    },
  });

  if (profileQuery.isLoading) {
    return <div className="page-center"><Loading label="Opening your private space…" /></div>;
  }

  const profile = profileQuery.data;

  // 1. Consent Gate: Strict Data Privacy
  if (!profile || !profile.consentGiven) {
    return (
      <div className="page-wrap max-w-2xl mx-auto px-4 py-8">
        <div className="glass-card p-6 md:p-8 rounded-2xl border border-line backdrop-blur-xl bg-surface/80">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-mint/10 border border-mint/30 flex items-center justify-center text-mint">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">
                {lang === 'kn' ? 'ಖಾಸಗಿ ಆರೋಗ್ಯ ಮತ್ತು ನೈಸರ್ಗಿಕ ಚಕ್ರ' : 'Private Cycle & Health Space'}
              </h1>
              <p className="text-xs text-muted">
                {lang === 'kn' ? 'ಗೌಪ್ಯತೆ-ಕೇಂದ್ರಿತ, ಎನ್‌ಕ್ರಿಪ್ಟ್ ಆದ ವೈಯಕ್ತಿಕ ಜಾಗ' : 'End-to-end encrypted, zero-third-party tracking'}
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-muted leading-relaxed my-6">
            <p>
              {lang === 'kn'
                ? 'ನಮ್ಮ ದಿನದಲ್ಲಿ ನಿಮ್ಮ ಆರೋಗ್ಯ ಮಾಹಿತಿ ಅತ್ಯುನ್ನತ ಭದ್ರತೆಯಿಂದ ಕೂಡಿರುತ್ತದೆ. ನಿಮ್ಮ ಚಕ್ರ, ಲಕ್ಷಣಗಳು ಮತ್ತು ಗರ್ಭಾವಸ್ಥೆಯ ದಾಖಲೆಗಳು AES-256-GCM ಮೂಲಕ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಆಗಿ ಉಳಿಯುತ್ತವೆ.'
                : 'In Namma Dina, your reproductive health data belongs solely to you. All symptoms, cycle dates, and notes are encrypted with field-level AES-256-GCM before saving.'}
            </p>
            <ul className="list-disc list-inside space-y-2 text-text/80 pl-2">
              <li>{lang === 'kn' ? 'ಯಾವುದೇ ಜಾಹೀರಾತುದಾರರಿಗೆ ಅಥವಾ ಮೂರನೇ ವ್ಯಕ್ತಿಗೆ ಹಂಚಿಕೊಳ್ಳುವುದಿಲ್ಲ.' : 'Never shared with third parties, brokers, or advertisers.'}</li>
              <li>{lang === 'kn' ? 'ಮಿತ್ರ AI ಕೇವಲ ಸಹಾನುಭೂತಿಯ ಕ್ಷೇಮ ಸಲಹೆಗಳಿಗೆ ಮಾತ್ರ ಬೆಂಬಲ ನೀಡುತ್ತದೆ.' : 'Mitra delivers gentle, empathetic wellness advice with your opt-in.'}</li>
              <li>{lang === 'kn' ? 'ಯಾವಾಗ ಬೇಕಾದರೂ ಸಂಪೂರ್ಣ ಮಾಹಿತಿಯನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಬಹುದು.' : 'You can permanently purge all data at any moment with one click.'}</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-line flex flex-col sm:flex-row gap-3 items-center justify-between">
            <span className="text-[11px] text-faint flex items-center gap-1.5">
              <Lock size={13} />
              {lang === 'kn' ? 'AES-256 ಗೂಢಲಿಪೀಕರಣ ಸಕ್ರಿಯ' : 'Field-level AES-256 encryption'}
            </span>
            <Button
              onClick={() => consentMutation.mutate(true)}
              disabled={consentMutation.isPending}
            >
              <Sparkles size={16} />
              {lang === 'kn' ? 'ಖಾಸಗಿ ಜಾಗವನ್ನು ಪ್ರಾರಂಭಿಸಿ' : 'Enable Private Health Space'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const cycleStats = profile.cycleStats;
  const isPregnancy = profile.mode === 'pregnancy';

  return (
    <div className="page-wrap max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header & Mode Switcher */}
      <div className="glass-card p-5 rounded-2xl border border-line backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-text">
              {isPregnancy
                ? (lang === 'kn' ? 'ಗರ್ಭಾವಸ್ಥೆಯ ಸುಂದರ ಪಯಣ' : 'Pregnancy Journey')
                : (lang === 'kn' ? 'ನೈಸರ್ಗಿಕ ಚಕ್ರ ಮತ್ತು ಕ್ಷೇಮ' : 'Cycle & Reproductive Wellness')}
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-mint/15 text-mint border border-mint/25">
              <Lock size={10} />
              Encrypted
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            {lang === 'kn'
              ? 'ನಿಮ್ಮ ದೇಹದ ನೈಸರ್ಗಿಕ ಲಯವನ್ನು ಪ್ರೀತಿಯಿಂದ ಗಮನಿಸಿ.'
              : 'Attune gently to your body’s natural rhythm and needs.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => updateProfileMutation.mutate({ mode: isPregnancy ? 'cycle' : 'pregnancy' })}
            className="px-3 py-1.5 rounded-xl border border-line text-xs font-semibold hover:border-mint/40 text-text/90 flex items-center gap-1.5 transition-colors"
          >
            {isPregnancy ? <Flower2 size={14} /> : <Baby size={14} />}
            <span>{isPregnancy ? (lang === 'kn' ? 'ಚಕ್ರ ಟ್ರ್ಯಾಕಿಂಗ್‌ಗೆ ಬದಲಿಸಿ' : 'Switch to Cycle') : (lang === 'kn' ? 'ಗರ್ಭಾವಸ್ಥೆಗೆ ಬದಲಿಸಿ' : 'Switch to Pregnancy')}</span>
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1.5 rounded-xl border border-line text-xs font-semibold hover:border-mint/40 text-muted transition-colors"
          >
            {lang === 'kn' ? 'ಸಂರಚನೆ' : 'Settings'}
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="glass-card p-5 rounded-2xl border border-line backdrop-blur-xl animate-fadeIn space-y-4">
          <h2 className="text-sm font-semibold text-text">{lang === 'kn' ? 'ಪ್ರೊಫೈಲ್ ಸಂರಚನೆ' : 'Profile Configuration'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {!isPregnancy ? (
              <>
                <div>
                  <label className="block text-muted mb-1">{lang === 'kn' ? 'ಕಳೆದ ಮುಟ್ಟಿನ ಪ್ರಾರಂಭ ದಿನಾಂಕ' : 'Last Period Start Date'}</label>
                  <TextInput
                    type="date"
                    value={configPeriodStart || (profile.lastPeriodStart ?? '')}
                    onChange={(e) => setConfigPeriodStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-muted mb-1">{lang === 'kn' ? 'ಸರಾಸರಿ ಚಕ್ರದ ದಿನಗಳು (ದಿನಗಳು)' : 'Average Cycle Length (Days)'}</label>
                  <TextInput
                    type="number"
                    min={21}
                    max={45}
                    value={configCycleLength}
                    onChange={(e) => setConfigCycleLength(parseInt(e.target.value) || 28)}
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-muted mb-1">{lang === 'kn' ? 'ಗರ್ಭಧಾರಣೆಯ ಪ್ರಾರಂಭ ದಿನಾಂಕ' : 'Pregnancy Conception / LMP Date'}</label>
                <TextInput
                  type="date"
                  value={configPregnantSince || (profile.pregnantSince ?? '')}
                  onChange={(e) => setConfigPregnantSince(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="quiet" onClick={() => setShowConfig(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (isPregnancy) {
                  updateProfileMutation.mutate({ pregnantSince: configPregnantSince || profile.pregnantSince });
                } else {
                  updateProfileMutation.mutate({
                    lastPeriodStart: configPeriodStart || profile.lastPeriodStart,
                    cycleLengthDays: configCycleLength,
                  });
                }
              }}
            >
              <Check size={14} /> Save
            </Button>
          </div>
        </div>
      )}

      {/* Main Stats Card */}
      {!isPregnancy ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-line backdrop-blur-xl flex flex-col justify-between">
            <span className="text-xs text-muted font-medium">{lang === 'kn' ? 'ಇಂದಿನ ಚಕ್ರದ ದಿನ' : 'Day of Cycle'}</span>
            <div className="my-3">
              <span className="text-3xl font-extrabold text-mint">
                Day {cycleStats?.currentDayOfCycle ?? 1}
              </span>
              <span className="text-xs text-faint ml-2">of {profile.cycleLengthDays ?? 28}</span>
            </div>
            <p className="text-[11px] text-muted">
              {lang === 'kn' ? 'ನಿಮ್ಮ ನಿಯಮಿತ ಲಯ' : 'Regular rhythm'}
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-line backdrop-blur-xl flex flex-col justify-between">
            <span className="text-xs text-muted font-medium">{lang === 'kn' ? 'ಪ್ರಸ್ತುತ ಹಂತ' : 'Current Phase'}</span>
            <div className="my-3 flex items-center gap-2">
              <span className="text-xl font-bold capitalize text-text">
                {cycleStats?.currentPhase ?? 'Follicular'}
              </span>
              <Flower2 size={18} className="text-mint" />
            </div>
            <p className="text-[11px] text-muted">
              {cycleStats?.currentPhase === 'menstrual' && 'Time for deep rest, warm teas, and gentle stretching.'}
              {cycleStats?.currentPhase === 'follicular' && 'Energy and creativity are naturally expanding.'}
              {cycleStats?.currentPhase === 'ovulatory' && 'Peak vitality and clear communication.'}
              {cycleStats?.currentPhase === 'luteal' && 'Gentle wind-down; honor your need for quiet space.'}
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-line backdrop-blur-xl flex flex-col justify-between">
            <span className="text-xs text-muted font-medium">{lang === 'kn' ? 'ಮುಂದಿನ ಮುಟ್ಟಿನ ಅಂದಾಜು' : 'Next Period Predicted'}</span>
            <div className="my-3">
              <span className="text-2xl font-bold text-text">
                {cycleStats?.daysUntilNextPeriod !== undefined ? `In ${cycleStats.daysUntilNextPeriod} days` : 'Predicting…'}
              </span>
            </div>
            <p className="text-[11px] text-muted">
              {cycleStats?.nextPeriodDate ? `Approx. ${cycleStats.nextPeriodDate}` : 'Log past periods to sharpen estimate'}
            </p>
          </div>
        </div>
      ) : (
        /* Pregnancy Mode Overview */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-line backdrop-blur-xl flex flex-col justify-between">
            <span className="text-xs text-muted font-medium">{lang === 'kn' ? 'ಗರ್ಭಾವಸ್ಥೆಯ ವಾರ' : 'Gestational Age'}</span>
            <div className="my-3">
              <span className="text-3xl font-extrabold text-mint">
                Week {cycleStats?.gestationalWeeks ?? 12}
              </span>
              <span className="text-xs text-faint ml-2">+{cycleStats?.gestationalDays ?? 0} days</span>
            </div>
            <p className="text-[11px] text-muted">
              Trimester {cycleStats?.trimester ?? 1}
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-line backdrop-blur-xl flex flex-col justify-between">
            <span className="text-xs text-muted font-medium">{lang === 'kn' ? 'ಮೈಲಿಗಲ್ಲು' : 'Growth & Care'}</span>
            <div className="my-3">
              <span className="text-base font-bold text-text">
                {PREGNANCY_MILESTONES[cycleStats?.trimester ? (cycleStats.trimester * 3) : 3]?.size ?? 'Growing gently'}
              </span>
            </div>
            <p className="text-[11px] text-muted">
              {PREGNANCY_MILESTONES[cycleStats?.trimester ? (cycleStats.trimester * 3) : 3]?.tip}
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-line backdrop-blur-xl flex flex-col justify-between">
            <span className="text-xs text-muted font-medium">{lang === 'kn' ? 'ದೈನಂದಿನ ಚಲನೆಯ ಲೆಕ್ಕ' : 'Fetal Movement Check'}</span>
            <div className="my-3 flex items-center gap-3">
              <span className="text-2xl font-bold text-mint">{fetalKicks} kicks</span>
              <button
                onClick={() => setFetalKicks((c) => c + 1)}
                className="w-8 h-8 rounded-full bg-mint/20 text-mint border border-mint/40 flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-transform"
              >
                +1
              </button>
            </div>
            <p className="text-[11px] text-muted">Log peaceful gentle kicks</p>
          </div>
        </div>
      )}

      {/* Daily Check-in Logging Form */}
      <div className="glass-card p-5 rounded-2xl border border-line backdrop-blur-xl space-y-4">
        <h2 className="text-sm font-semibold text-text flex items-center gap-2">
          <Heart size={16} className="text-mint" />
          <span>{lang === 'kn' ? 'ಇಂದಿನ ದಾಖಲೆ' : 'Today’s Gentle Check-In'}</span>
        </h2>

        {!isPregnancy && (
          <div>
            <label className="block text-xs text-muted mb-2">{lang === 'kn' ? 'ಹರಿವು (Flow)' : 'Flow'}</label>
            <div className="flex flex-wrap gap-2">
              {(['none', 'spotting', 'light', 'medium', 'heavy'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFlow(level)}
                  className={`px-3 py-1.5 rounded-xl border text-xs capitalize transition-all ${
                    flow === level
                      ? 'bg-mint/20 border-mint text-mint font-semibold'
                      : 'border-line text-muted hover:border-mint/30'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-muted mb-2">{lang === 'kn' ? 'ಲಕ್ಷಣಗಳು ಮತ್ತು ಅನುಭವಗಳು' : 'Symptoms & Feelings'}</label>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS_LIST.map((sym) => {
              const active = selectedSymptoms.includes(sym);
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() =>
                    setSelectedSymptoms((prev) =>
                      active ? prev.filter((s) => s !== sym) : [...prev, sym]
                    )
                  }
                  className={`px-3 py-1.5 rounded-xl border text-xs transition-all ${
                    active
                      ? 'bg-mint/20 border-mint text-mint font-semibold'
                      : 'border-line text-muted hover:border-mint/30'
                  }`}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1">{lang === 'kn' ? 'ದೇಹದ ಉಷ್ಣತೆ (°C) - ಐಚ್ಛಿಕ' : 'Basal Temperature (°C) — Optional'}</label>
            <TextInput
              type="number"
              step="0.05"
              placeholder="36.5"
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">{lang === 'kn' ? 'ಖಾಸಗಿ ಟಿಪ್ಪಣಿ' : 'Private Encrypted Note'}</label>
            <TextInput
              placeholder="How does your body feel today?"
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => logEntryMutation.mutate()}
            disabled={logEntryMutation.isPending}
          >
            {logEntryMutation.isPending ? 'Saving Encrypted…' : 'Save Check-in'}
          </Button>
        </div>
      </div>

      {/* History Log */}
      <div className="glass-card p-5 rounded-2xl border border-line backdrop-blur-xl space-y-4">
        <h2 className="text-sm font-semibold text-text flex items-center justify-between">
          <span>{lang === 'kn' ? 'ಇತ್ತೀಚಿನ ದಾಖಲೆಗಳು' : 'Recent Private Entries'}</span>
          <span className="text-[11px] text-faint flex items-center gap-1 font-normal">
            <Lock size={11} /> Decrypted in-memory
          </span>
        </h2>

        {entriesQuery.data?.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">
            {lang === 'kn' ? 'ಇನ್ನೂ ಯಾವುದೇ ದಾಖಲೆಗಳಿಲ್ಲ. ಇಂದು ಮೊದಲ ದಾಖಲೆ ಉಳಿಸಿ.' : 'No entries logged yet. Add your first check-in above.'}
          </p>
        ) : (
          <div className="space-y-2">
            {entriesQuery.data?.slice(0, 7).map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-xl border border-line bg-surface2/40 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-semibold text-text">{entry.date}</span>
                  {entry.flowIntensity && entry.flowIntensity !== 'none' && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 capitalize">
                      {entry.flowIntensity}
                    </span>
                  )}
                  {entry.symptoms.length > 0 && (
                    <span className="ml-2 text-muted">
                      · {entry.symptoms.join(', ')}
                    </span>
                  )}
                </div>
                {entry.notes && (
                  <span className="text-faint italic truncate max-w-xs">{entry.notes}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Privacy Guarantee & Right to Be Forgotten */}
      <div className="glass-card p-4 rounded-2xl border border-line/60 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-mint" />
          <span>{lang === 'kn' ? 'ನಿಮ್ಮ ಆರೋಗ್ಯ ಡೇಟಾ ಗೌಪ್ಯವಾಗಿ ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಆಗಿದೆ.' : 'Your health records are encrypted at rest with field-level AES-256-GCM.'}</span>
        </div>
        <button
          onClick={() => setDeleteConfirmOpen(true)}
          className="text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
        >
          <Trash2 size={13} />
          <span>{lang === 'kn' ? 'ಎಲ್ಲ ದಾಖಲೆಗಳನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಿ' : 'Permanently erase health records'}</span>
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="quick-add-scrim" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="quick-add-dialog max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-text mb-2">Erase all health data?</h3>
            <p className="text-xs text-muted mb-4">
              This will permanently wipe all your cycle logs, pregnancy records, and encryption keys from the server. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="quiet" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button
                variant="outline"
                className="border-rose-500/40 text-rose-300 hover:bg-rose-500/20"
                onClick={() => wipeMutation.mutate()}
                disabled={wipeMutation.isPending}
              >
                {wipeMutation.isPending ? 'Erasing…' : 'Yes, Permanently Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
