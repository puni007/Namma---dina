import React, { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  GlassWater,
  Leaf,
  Plus,
  Sparkles,
  SunMedium,
  Waves,
} from 'lucide-react';
import { getData, sendData, type Overview, type Task, type User } from '../lib/api';
import { formatTime, greeting, todayKey } from '../lib/format';
import { useLanguage, type Language } from '../lib/i18n';
import { dashboardCopy } from '../lib/dashboardCopy';
import { MitraMascot, type MitraPose } from '../components/MitraMascot';
import { MorningBriefingCard } from '../components/AICompanion';
import { useCountUp } from '../lib/useCountUp';

function displayDate(day: string, lang: Language) {
  return new Intl.DateTimeFormat(lang === 'kn' ? 'kn-IN' : 'en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00.000Z`));
}

function clock(value: string) {
  return formatTime(value);
}

function getMitraDayGreeting(hour: number, name: string, lang: Language): { greeting: string; prompt: string; pose: MitraPose } {
  const firstName = name.split(' ')[0] || name;
  if (lang === 'kn') {
    if (hour >= 5 && hour < 12) {
      return {
        greeting: `ಶುಭೋದಯ, ${firstName}`,
        prompt: 'ದಿನವನ್ನು ನಿಮ್ಮ ವೇಗದಲ್ಲೇ ಆರಂಭಿಸಿ — ಒಂದೇ ಸಣ್ಣ ಹೆಜ್ಜೆ ಸಾಕು.',
        pose: 'happy',
      };
    }
    if (hour >= 12 && hour < 17) {
      return {
        greeting: `ಶುಭ ಮಧ್ಯಾಹ್ನ, ${firstName}`,
        prompt: 'ಮಧ್ಯಾಹ್ನದ ವಿಶ್ರಾಂತಿ: ನೀರು ಕುಡಿಯಿರಿ, ನಿಮ್ಮ ಲಯವನ್ನು ಶಾಂತವಾಗಿ ಮುಂದುವರಿಸಿ.',
        pose: 'idle',
      };
    }
    if (hour >= 17 && hour < 22) {
      return {
        greeting: `ಶುಭ ಸಂಜೆ, ${firstName}`,
        prompt: 'ಮುಸ್ಸಂಜೆಯ ವಿಶ್ರಾಂತಿ: ಇಂದಿನ ಸಣ್ಣ ಸಾಧನೆಗಳನ್ನು ಮೆಚ್ಚಿ, ನಿಧಾನವಾಗಿ ಸುಧಾರಿಸಿಕೊಳ್ಳಿ.',
        pose: 'happy',
      };
    }
    return {
      greeting: `ಶುಭ ರಾತ್ರಿ, ${firstName}`,
      prompt: 'ದಿನ ಮುಗಿದಿದೆ. ಪ್ರಶಾಂತ ನಿದ್ರೆಗೆ ಜಾರಿ, ನಾಳೆಗೆ ಹೊಸ ಆರಂಭ ನೀಡಿ.',
      pose: 'sleepy',
    };
  }

  // English
  if (hour >= 5 && hour < 12) {
    return {
      greeting: `Good morning, ${firstName}`,
      prompt: 'Take the day at your own pace — one mindful step is all it takes.',
      pose: 'happy',
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      greeting: `Good afternoon, ${firstName}`,
      prompt: 'Midday pause: Breathe, hydrate, and honor the progress you’ve made so far.',
      pose: 'idle',
    };
  }
  if (hour >= 17 && hour < 22) {
    return {
      greeting: `Good evening, ${firstName}`,
      prompt: 'Evening twilight: Time to wind down and celebrate what you brought to life today.',
      pose: 'happy',
    };
  }
  return {
    greeting: `Good night, ${firstName}`,
    prompt: 'The day is complete. Rest deeply and give tomorrow a gentle beginning.',
    pose: 'sleepy',
  };
}

export function DashboardPage({ user }: { user: User }) {
  const { lang, t } = useLanguage();
  const copy = dashboardCopy[lang];
  const client = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [quickTitle, setQuickTitle] = useState('');

  const baseDay = todayKey(new Date(), user.timezone);
  const selectedDate = new Date(`${baseDay}T12:00:00.000Z`);
  selectedDate.setUTCDate(selectedDate.getUTCDate() + offset);
  const date = selectedDate.toISOString().slice(0, 10);

  const overview = useQuery({
    queryKey: ['overview', date],
    queryFn: () => getData<Overview>(`/overview?date=${date}`),
  });

  const insights = useQuery({
    queryKey: ['insights'],
    queryFn: () => getData<{ score: { value: number | null; explanation: string; recoveryEvents: number } }>('/insights'),
  });

  const day = overview.data;

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ['overview'] });
    void client.invalidateQueries({ queryKey: ['tasks'] });
    void client.invalidateQueries({ queryKey: ['habit-logs'] });
    void client.invalidateQueries({ queryKey: ['insights'] });
    void client.invalidateQueries({ queryKey: ['wellness'] });
  };

  const addTask = useMutation({
    mutationFn: () => sendData('/tasks', 'POST', { title: quickTitle.trim(), priority: 'MEDIUM', scheduledMinutes: 30 }),
    onSuccess: () => {
      setQuickTitle('');
      invalidate();
    },
  });

  const completeTask = useMutation({
    mutationFn: (task: Task) =>
      sendData(`/tasks/${task.id}`, 'PATCH', {
        status: task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED',
        completedAt: task.status === 'COMPLETED' ? null : new Date().toISOString(),
      }),
    onSuccess: invalidate,
  });

  const logHabit = useMutation({
    mutationFn: async (habit: NonNullable<typeof day>['habits'][number]) => {
      const logs = await getData<Array<{ id: string; habitId: string; value: number }>>(`/habit-logs?date=${date}&limit=100`);
      const existing = logs.find((row) => row.habitId === habit.id);
      const value = habit.frequency === 'WEEKLY' ? (existing?.value ?? 0) + 1 : habit.targetValue;
      return existing
        ? sendData(`/habit-logs/${existing.id}`, 'PATCH', { value })
        : sendData('/habit-logs', 'POST', { habitId: habit.id, date, value, note: null });
    },
    onSuccess: invalidate,
  });

  const addWater = useMutation({
    mutationFn: (amountMl: number) => sendData('/water', 'POST', { date, amountMl }),
    onSuccess: invalidate,
  });

  const tasks = useMemo(
    () =>
      [...(day?.tasks ?? [])].sort(
        (a, b) =>
          ({ URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }[a.priority] -
            ({ URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }[b.priority]))
      ),
    [day?.tasks]
  );

  const priorities = tasks.filter((task) => task.status !== 'CANCELLED').slice(0, 6);
  const progress = day?.progress ?? 0;
  const animatedProgress = useCountUp(progress);
  const scoreValue = insights.data?.score.value ?? null;
  const animatedScore = useCountUp(scoreValue ?? 0);

  const nowHour = Number(
    new Intl.DateTimeFormat('en', { timeZone: user.timezone, hour: '2-digit', hourCycle: 'h23' }).format(new Date())
  );

  const { greeting: greetingText, prompt: mitraPrompt, pose: defaultPose } = getMitraDayGreeting(
    nowHour,
    user.displayName,
    lang
  );

  // Mitra pose reacts dynamically to completed items
  const completedTaskCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const activeMitraPose: MitraPose = completedTaskCount > 0 ? (progress >= 80 ? 'celebrating' : 'happy') : defaultPose;

  function quickSubmit(event: FormEvent) {
    event.preventDefault();
    if (quickTitle.trim()) addTask.mutate();
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] text-slate-100 font-['Plus_Jakarta_Sans','Noto_Sans_Kannada',sans-serif] pb-16">
      {/* =========================================================================
          ATMOSPHERIC AURORA LIGHT BACKDROP (#070D19 + Teal #14B8A6 + Indigo #6366F1 + Amber #F59E0B)
      ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Soft Teal light ribbon */}
        <div className="absolute top-[-15%] left-[5%] w-[65vw] h-[55vw] max-w-[850px] max-h-[700px] rounded-full bg-radial-gradient from-teal-500/12 via-emerald-600/6 to-transparent blur-[90px] animate-pulse" style={{ animationDuration: '10s' }} />

        {/* Soft Twilight Indigo ambient ribbon */}
        <div className="absolute top-[20%] right-[-10%] w-[60vw] h-[50vw] max-w-[800px] max-h-[650px] rounded-full bg-radial-gradient from-indigo-500/14 via-purple-600/8 to-transparent blur-[100px] animate-pulse" style={{ animationDuration: '14s' }} />

        {/* Soft Warm Amber glow around Mitra zone */}
        <div className="absolute top-[5%] left-[20%] w-[45vw] h-[40vw] max-w-[550px] max-h-[500px] rounded-full bg-radial-gradient from-amber-500/10 via-amber-600/4 to-transparent blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* =========================================================================
            HEADER: Living Mitra Companion + Greeting + Time-Adaptive Prompt
        ========================================================================= */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 mb-8 border-b border-white/[0.08]">
          {/* Left: Living Mitra + Greeting + Prompt */}
          <div className="flex items-center gap-5">
            {/* Mitra Flame Avatar with Breathing Amber-Teal Aura */}
            <button
              type="button"
              className="relative flex-shrink-0 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-full"
              onClick={() => window.dispatchEvent(new Event('namma-dina:open-mitra'))}
              title={lang === 'kn' ? 'ಮಿತ್ರನೊಂದಿಗೆ ಮಾತನಾಡಿ' : 'Chat with Mitra'}
              aria-label="Open Mitra AI companion"
            >
              <div className="absolute inset-0 rounded-full bg-radial-gradient from-amber-400/30 via-teal-400/20 to-transparent blur-md transform scale-125 group-hover:scale-135 transition-transform duration-300 animate-pulse" />
              <div className="relative w-16 h-16 sm:w-18 sm:h-18 transition-transform duration-300 group-hover:scale-110">
                <MitraMascot pose={activeMitraPose} stage="flame" level={1} />
              </div>
            </button>

            {/* Greeting and Supportive Prompt */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
                  {displayDate(date, lang)}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-amber-300 font-medium">
                  {offset === 0 ? t.today : offset === 1 ? t.tomorrow : displayDate(date, lang).split(',')[0]}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {greetingText}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl leading-relaxed flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-ping" />
                <span>{mitraPrompt}</span>
              </p>
            </div>
          </div>

          {/* Right: Date Switcher & Day Navigation */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md text-xs shadow-sm">
              <button
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                onClick={() => setOffset(Math.max(0, offset - 1))}
                aria-label="Previous day"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3.5 font-semibold text-slate-200">
                {offset === 0 ? t.today : offset === 1 ? t.tomorrow : displayDate(date, lang).split(',')[0]}
              </span>
              <button
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                onClick={() => setOffset(Math.min(1, offset + 1))}
                aria-label="Next day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <Link
              to="/app/calendar"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white backdrop-blur-md transition-colors"
              title={t.calendar}
            >
              <SunMedium size={15} className="text-amber-400" />
              <span className="hidden sm:inline font-semibold">{t.calendar}</span>
            </Link>
          </div>
        </div>

        {/* Morning Briefing Banner (when available for today) */}
        {offset === 0 && (
          <div className="mb-8">
            <MorningBriefingCard />
          </div>
        )}

        {/* =========================================================================
            TWO CALM ZONES: Left Main Column (Focus & Care) + Right Column (Today's Rhythm)
        ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* =======================================================================
              ZONE 1 (LEFT COLUMN - 7 COLS): Frictionless Quick-Add + Open Focus List + Habits
          ======================================================================= */}
          <div className="lg:col-span-7 space-y-8">
            {/* Frictionless Quick-Add Input */}
            <div>
              <form onSubmit={quickSubmit} className="relative">
                <div className="relative flex items-center rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] focus-within:bg-[#0B1320]/80 border border-white/[0.08] focus-within:border-emerald-500/40 focus-within:shadow-[0_0_25px_rgba(16,185,129,0.12)] transition-all duration-300">
                  <div className="pl-4 pr-2 text-emerald-400 flex items-center">
                    <Plus size={18} strokeWidth={2.5} />
                  </div>
                  <input
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder={lang === 'kn' ? '+ ಇಂದಿಗೆ ಒಂದು ಸಣ್ಣ ಹೆಜ್ಜೆಯನ್ನು ಸೇರಿಸಿ...' : '+ Add a gentle step for today...'}
                    className="w-full py-4 pr-28 bg-transparent text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none"
                    aria-label={copy.quickTask}
                  />
                  <button
                    type="submit"
                    disabled={!quickTitle.trim() || addTask.isPending}
                    className="absolute right-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-[#060B14] font-semibold text-xs disabled:opacity-25 disabled:pointer-events-none hover:shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
                  >
                    {lang === 'kn' ? 'ಸೇರಿಸಿ' : 'Add'}
                  </button>
                </div>
              </form>
            </div>

            {/* Today's Focus List (Clean, open, uncluttered) */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                <h2 className="text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2 m-0">
                  <span>{lang === 'kn' ? 'ಇಂದಿನ ಆದ್ಯತೆಗಳು' : "Today's Focus"}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono">
                    {priorities.length}
                  </span>
                </h2>
                <Link
                  to="/app/tasks"
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-semibold"
                >
                  <span>{copy.seeAll}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {priorities.length === 0 ? (
                /* Airy, Gentle Empty State (No giant boxed-in card) */
                <div className="py-10 px-6 text-center rounded-2xl bg-white/[0.015] border border-dashed border-white/[0.08]">
                  <p className="text-sm text-slate-300 font-medium mb-1">
                    {lang === 'kn' ? 'ಇಂದು ಯಾವುದೇ ಕಡ್ಡಾಯ ಕಾರ್ಯಗಳಿಲ್ಲ.' : 'Your day is open and unhurried.'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {lang === 'kn'
                      ? 'ಮೇಲಿನ ಸರಳ ಇನ್‌ಪುಟ್‌ನಲ್ಲಿ ಒಂದು ಸಣ್ಣ ಹೆಜ್ಜೆ ಸೇರಿಸಿ, ಅಥವಾ ದಿನವನ್ನು ವಿಶ್ರಾಂತಿಯಲ್ಲಿ ಕಳೆಯಿರಿ.'
                      : 'Add a single focus above, or simply take today to rest and recharge.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {priorities.map((task) => {
                    const isDone = task.status === 'COMPLETED';
                    return (
                      <div
                        key={task.id}
                        className={`group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl transition-all duration-200 ${
                          isDone
                            ? 'bg-emerald-950/15 border border-emerald-500/20 text-slate-400'
                            : 'bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] text-slate-100 shadow-sm'
                        }`}
                      >
                        {/* Soft Circular Check Target */}
                        <button
                          type="button"
                          onClick={() => completeTask.mutate(task)}
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                            isDone
                              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-[#060B14] shadow-[0_0_10px_rgba(16,185,129,0.35)] scale-105'
                              : 'border border-slate-600 group-hover:border-emerald-400/70'
                          }`}
                          aria-label={isDone ? 'Mark pending' : 'Mark completed'}
                        >
                          {isDone && <Check size={12} strokeWidth={3} />}
                        </button>

                        {/* Title & Schedule Details */}
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-sm sm:text-[15px] font-medium transition-colors block truncate ${
                              isDone ? 'text-emerald-200/90' : 'text-slate-100 group-hover:text-white'
                            }`}
                          >
                            {task.title}
                          </span>
                          <small className="text-[11px] text-slate-400 mt-0.5 block">
                            {task.scheduledStart
                              ? clock(task.scheduledStart)
                              : task.dueAt
                                ? `Due ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(task.dueAt))}`
                                : (lang === 'kn' ? 'ನಿಮ್ಮ ಸಮಯಕ್ಕೆ ತಕ್ಕಂತೆ' : 'Flexible timing')}
                          </small>
                        </div>

                        {/* Priority Dot */}
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            task.priority === 'URGENT'
                              ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]'
                              : task.priority === 'HIGH'
                                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                : 'bg-emerald-400/80'
                          }`}
                          title={`Priority: ${task.priority}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Daily Habits (Open, Calm Check-ins) */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                <h2 className="text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2 m-0">
                  <span>{lang === 'kn' ? 'ದೈನಂದಿನ ಹವ್ಯಾಸಗಳು' : 'Daily Habits'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono">
                    {day?.habits?.length ?? 0}
                  </span>
                </h2>
                <Link
                  to="/app/habits"
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-semibold"
                >
                  <span>{copy.allHabits}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {!day?.habits?.length ? (
                <div className="py-8 px-6 text-center rounded-2xl bg-white/[0.015] border border-dashed border-white/[0.08]">
                  <p className="text-xs text-slate-400">{copy.noHabitsBody}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {day.habits.slice(0, 4).map((habit) => (
                    <div
                      key={habit.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 ${
                        habit.done
                          ? 'bg-emerald-950/20 border-emerald-500/25'
                          : 'bg-white/[0.025] hover:bg-white/[0.05] border-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            habit.done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-slate-400'
                          }`}
                        >
                          {habit.done ? <Check size={15} /> : <Leaf size={15} />}
                        </span>
                        <div className="min-w-0">
                          <strong className="text-xs sm:text-sm text-slate-200 block truncate">{habit.name}</strong>
                          <small className="text-[10px] text-slate-400 block">
                            {habit.value} / {habit.targetValue} {habit.targetUnit}
                          </small>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => logHabit.mutate(habit)}
                        disabled={logHabit.isPending}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          habit.done
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                            : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                        }`}
                      >
                        {habit.done ? copy.done : copy.log}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* =======================================================================
              ZONE 2 (RIGHT COLUMN - 5 COLS): Unified "Today's Rhythm" Panel
          ======================================================================= */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl p-6 sm:p-7 backdrop-blur-xl bg-[#0B1320]/75 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_35px_rgba(16,185,129,0.06)] space-y-6">
              {/* Panel Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                    {copy.progressEyebrow}
                  </span>
                  <h2 className="text-base font-bold text-white tracking-tight mt-0.5 m-0">
                    {lang === 'kn' ? 'ಇಂದಿನ ಲಯ' : "Today's Rhythm"}
                  </h2>
                </div>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  <Waves size={16} />
                </span>
              </div>

              {/* Progress Ring & Day Summary */}
              <div className="flex items-center gap-5">
                {/* Circular Progress Ring */}
                <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="url(#dayProgressGradient)"
                      strokeWidth="5"
                      strokeDasharray={163.3}
                      strokeDashoffset={163.3 - (animatedProgress / 100) * 163.3}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                    <defs>
                      <linearGradient id="dayProgressGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#14B8A6" />
                        <stop offset="60%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#F59E0B" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-base font-extrabold text-white leading-none">{animatedProgress}%</span>
                  </div>
                </div>

                {/* Status text */}
                <div className="space-y-1">
                  <strong className="text-sm font-semibold text-slate-100 block">
                    {progress >= 70 ? copy.progressGood : progress > 0 ? copy.progressStarted : copy.progressBegin}
                  </strong>
                  <p className="text-xs text-slate-400 leading-snug m-0">
                    {copy.progressDescription}
                  </p>
                </div>
              </div>

              {/* Calm Completion Bars */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-300">{copy.tasks}</span>
                    <span className="text-emerald-400 font-semibold">{day?.taskProgress ?? 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${day?.taskProgress ?? 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-300">{copy.habits}</span>
                    <span className="text-indigo-400 font-semibold">{day?.habitProgress ?? 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400 transition-all duration-500"
                      style={{ width: `${day?.habitProgress ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Seamless Hydration Log Row */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/20 flex items-center justify-center">
                    <GlassWater size={16} />
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">{copy.water}</span>
                    <small className="text-[11px] text-slate-400">{day?.waterMl ?? 0} / {day?.waterGoalMl ?? 2000} ml</small>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => addWater.mutate(250)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    +250
                  </button>
                  <button
                    type="button"
                    onClick={() => addWater.mutate(500)}
                    className="px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-[11px] text-teal-300 font-medium transition-colors cursor-pointer"
                  >
                    +500
                  </button>
                </div>
              </div>

              {/* Gentle Comeback Note */}
              <div className="pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Sparkles size={14} />
                    <span className="text-xs font-semibold tracking-wide uppercase">{copy.comebackLabel}</span>
                  </div>
                  <Link
                    to="/app/insights"
                    className="text-slate-400 hover:text-white transition-colors"
                    aria-label="See how the score works"
                  >
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed m-0">
                  {scoreValue == null
                    ? copy.comebackEmpty
                    : `${animatedScore} · ${copy.comebackBased}`}
                </p>
                <div className="mt-2 text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                  <Leaf size={12} className="text-emerald-400 flex-shrink-0" />
                  <span>
                    {lang === 'kn'
                      ? 'ಸಣ್ಣ ಹೆಜ್ಜೆಗಳೇ ಲಯವನ್ನು ನಿರ್ಮಿಸುತ್ತವೆ. ಅಪರಾಧವಿಲ್ಲ.'
                      : 'Small steps build your rhythm. No guilt, ever.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Mutation Error Display if network error occurs */}
        {(addTask.isError || completeTask.isError || logHabit.isError || addWater.isError) && (
          <p className="mt-6 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
            {copy.saveError}
          </p>
        )}
      </div>
    </div>
  );
}
