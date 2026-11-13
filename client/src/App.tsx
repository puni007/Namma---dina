import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getData, sendData, setAuthTokens, type User } from './lib/api';
import {
  CalendarDays,
  ChartNoAxesCombined,
  CheckSquare,
  ChevronRight,
  CircleHelp,
  Clock3,
  HeartPulse,
  Leaf,
  LogOut,
  Menu,
  MoreHorizontal,
  NotebookPen,
  PanelsTopLeft,
  Settings2,
  Smartphone,
  Sparkles,
  Utensils,
  X,
  Tag,
  Languages,
} from 'lucide-react';
import { Button, Field, Loading, OfflineBanner, SelectInput, TextInput } from './components/ui';
import { useNativeLifecycle, useNetworkStatus } from './lib/native';
import { setPreferredTimezone, todayKey } from './lib/format';
import { useLanguage, type TranslationDict } from './lib/i18n';
import {
  AccountPage,
  CategoriesPage,
  DigitalPage,
  FoodPage,
  NotificationsPage,
  ReflectionPage,
  RemindersPage,
  SettingsPage,
} from './pages/ResourcePages';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const TasksPage = lazy(() => import('./pages/TasksPage').then((module) => ({ default: module.TasksPage })));
const HabitsPage = lazy(() => import('./pages/HabitsPage').then((module) => ({ default: module.HabitsPage })));
const PlannerPage = lazy(() => import('./pages/PlannerPage').then((module) => ({ default: module.PlannerPage })));
const InsightsPage = lazy(() => import('./pages/InsightsPage').then((module) => ({ default: module.InsightsPage })));
const LandingPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.RegisterPage })));
const ForgotPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.ForgotPage })));
const ResetPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.ResetPage })));
const WellnessPage = lazy(() => import('./pages/WellnessPage').then((module) => ({ default: module.WellnessPage })));

function buildNav(t: TranslationDict) {
  return [
    { to: '/app/day', label: t.navDay, icon: PanelsTopLeft, mobile: true },
    { to: '/app/tasks', label: t.navTasks, icon: CheckSquare, mobile: true },
    { to: '/app/categories', label: t.navCategories, icon: Tag },
    { to: '/app/habits', label: t.navHabits, icon: Leaf, mobile: true },
    { to: '/app/calendar', label: t.navCalendar, icon: CalendarDays },
    { to: '/app/reminders', label: t.navReminders, icon: Clock3 },
    { to: '/app/wellness', label: t.navWellness, icon: HeartPulse },
    { to: '/app/digital', label: t.navDigital, icon: Smartphone },
    { to: '/app/food', label: t.navFood, icon: Utensils },
    { to: '/app/reflection', label: t.navReflection, icon: NotebookPen },
    { to: '/app/insights', label: t.navInsights, icon: ChartNoAxesCombined, mobile: true },
    { to: '/app/notifications', label: t.navNotifications, icon: Sparkles },
    { to: '/app/settings', label: t.navSettings, icon: Settings2, mobile: true },
  ];
}

function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => getData<User>('/auth/me'),
    retry: false,
  });
}

function AppRoot() {
  useNativeLifecycle();
  const isOnline = useNetworkStatus();
  const userQuery = useCurrentUser();
  if (userQuery.isLoading) {
    return (
      <>
        <AuroraAtmosphere />
        <div className="app-content page-center"><Loading /></div>
        {!isOnline && <OfflineBanner />}
      </>
    );
  }
  const user = userQuery.data;
  if (user) setPreferredTimezone(user.timezone);
  return (
    <>
      <AuroraAtmosphere />
      <div className="app-content">
        <Suspense fallback={<div className="page-center"><Loading label="Opening your space" /></div>}>
          <Routes>
            <Route path="/" element={user ? <Navigate to="/app/day" replace /> : <LandingPage />} />
            <Route path="/login" element={user ? <Navigate to="/app/day" replace /> : <LoginPage />} />
            <Route path="/register" element={user ? <Navigate to="/onboarding" replace /> : <RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPage />} />
            <Route path="/reset-password" element={<ResetPage />} />
            <Route path="/onboarding" element={user ? <OnboardingPage user={user} /> : <Navigate to="/register" replace />} />
            <Route path="/app" element={user ? <AppShell user={user} /> : <Navigate to="/login" replace />}>
              <Route index element={<Navigate to="day" replace />} />
              <Route path="day" element={<DashboardPage user={user!} />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="habits" element={<HabitsPage />} />
              <Route path="calendar" element={<PlannerPage user={user!} />} />
              <Route path="reminders" element={<RemindersPage />} />
              <Route path="wellness" element={<WellnessPage />} />
              <Route path="digital" element={<DigitalPage />} />
              <Route path="food" element={<FoodPage />} />
              <Route path="reflection" element={<ReflectionPage />} />
              <Route path="insights" element={<InsightsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage user={user!} />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="*" element={<Navigate to="/app/day" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      {!isOnline && <OfflineBanner />}
    </>
  );
}

function AuroraAtmosphere() {
  const atmosphereRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    const trackPointer = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        atmosphereRef.current?.style.setProperty('--pointer-x', `${event.clientX}px`);
        atmosphereRef.current?.style.setProperty('--pointer-y', `${event.clientY}px`);
      });
    };
    window.addEventListener('pointermove', trackPointer, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', trackPointer);
    };
  }, []);
  return (
    <div className="aurora-atmosphere" aria-hidden="true">
      <span ref={atmosphereRef} className="aurora-cursor" />
      <span className="aurora-curtain aurora-curtain-one" />
      <span className="aurora-curtain aurora-curtain-two" />
      <span className="aurora-curtain aurora-curtain-three" />
      <span className="aurora-stars" />
      <span className="aurora-horizon" />
      <span className="aurora-vignette" />
    </div>
  );
}

function AppShell({ user }: { user: User }) {
  const { lang, setLanguage, t } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const nav = useMemo(() => buildNav(t), [t]);

  const logout = useMutation({
    mutationFn: async () => {
      await sendData('/auth/logout', 'POST').catch(() => {});
      await setAuthTokens(null);
    },
    onSuccess: () => {
      queryClient.clear();
      navigate('/login');
    },
  });

  const activeNav = nav.find((item) => location.pathname === item.to)?.label ?? t.navDay;
  useReminderWatcher();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/app/day" className="brand">
          <span className="brand-mark"><span /></span>
          <span><strong>{t.brandName}</strong><small>{t.brandSub}</small></span>
        </Link>
        <div className="sidebar-label">{t.yourSpace}</div>
        <nav className="side-nav">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {label === t.navDay && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="note-spark"><Sparkles size={15} /></div>
            <p>{t.progressQuote}</p>
            <span>{t.takeDayAsItComes}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="profile-chip"
              style={{ flex: 1 }}
              onClick={() => navigate('/app/settings')}
            >
              <span className="avatar">{user.displayName.slice(0, 1).toUpperCase()}</span>
              <span><strong>{user.displayName}</strong><small>{t.personalSpace}</small></span>
              <ChevronRight size={15} />
            </button>
            <button
              className="icon-button"
              onClick={() => setLanguage(lang === 'en' ? 'kn' : 'en')}
              title={lang === 'en' ? 'ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ' : 'Switch to English'}
              style={{ width: '38px', height: '38px', fontSize: '11px', fontWeight: 700 }}
              aria-label="Toggle language"
            >
              {lang === 'en' ? 'ಕನ್ನಡ' : 'EN'}
            </button>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div className="crumb">
            <span>{activeNav}</span>
            <span className="crumb-sep">/</span>
            <span className="muted">{todayKey()}</span>
          </div>
          <div className="topbar-right">
            <button
              className="icon-button"
              onClick={() => setLanguage(lang === 'en' ? 'kn' : 'en')}
              title={lang === 'en' ? 'ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ' : 'Switch to English'}
              style={{ height: '30px', padding: '0 8px', width: 'auto', fontSize: '11px', fontWeight: 700, gap: '4px' }}
            >
              <Languages size={14} />
              <span>{lang === 'en' ? 'ಕನ್ನಡ' : 'EN'}</span>
            </button>
            <span className="topbar-pulse" />
            <span>{t.spacePace}</span>
            <button className="avatar avatar-small" onClick={() => navigate('/app/settings')} aria-label="Open settings">
              {user.displayName.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <div className="mobile-drawer">
            <div className="mobile-drawer-head">
              <span className="eyebrow">{t.yourSpace}</span>
              <button className="icon-button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
            </div>
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink onClick={() => setMobileOpen(false)} key={to} to={to} className="nav-link">
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            <button className="nav-link" onClick={() => logout.mutate()}>
              <LogOut size={18} />
              {t.signOut}
            </button>
          </div>
        )}

        <div className="page-wrap">
          <div key={location.pathname} className="page-route">
            <Outlet />
          </div>
        </div>
      </main>

      <nav className="bottom-nav">
        {nav.filter((item) => item.mobile).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''}`}>
            <Icon size={18} />
            <small>{label}</small>
          </NavLink>
        ))}
        <button className={`bottom-link ${moreOpen ? 'active' : ''}`} onClick={() => setMoreOpen(!moreOpen)}>
          <MoreHorizontal size={18} />
          <small>{t.more}</small>
        </button>
      </nav>

      {moreOpen && (
        <div className="more-panel">
          {nav.filter((item) => !item.mobile).map(({ to, label, icon: Icon }) => (
            <NavLink onClick={() => setMoreOpen(false)} key={to} to={to} className="nav-link">
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
          <NavLink onClick={() => setMoreOpen(false)} to="/app/account" className="nav-link">
            <CircleHelp size={17} />
            {t.navAccount}
          </NavLink>
          <button onClick={() => logout.mutate()} className="nav-link">
            <LogOut size={17} />
            {t.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

function useReminderWatcher() {
  const { data } = useQuery({
    queryKey: ['notifications', 'watch'],
    queryFn: () => getData<Array<{ id: string; title: string; body: string; createdAt: string; readAt?: string | null }>>('/notifications?limit=30'),
    refetchInterval: 30_000,
  });
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => getData<Record<string, unknown>>('/users/settings') });
  const handled = useRef(new Set<string>());
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    const unseen = (data ?? []).filter(
      (row) => !row.readAt && new Date(row.createdAt).getTime() >= mountedAt.current && !handled.current.has(row.id)
    );
    for (const notification of unseen) {
      handled.current.add(notification.id);
      if (settings.data?.browserNotifications === true && 'Notification' in window && Notification.permission === 'granted') {
        void (async () => {
          try {
            if ('serviceWorker' in navigator) {
              const registration = await navigator.serviceWorker.ready;
              if (await registration.pushManager.getSubscription()) return;
            }
          } catch {
            /* Fall back to a page notification when push is unavailable. */
          }
          new Notification(notification.title, { body: notification.body, icon: '/pwa.svg' });
        })();
      }
    }
  }, [data, settings.data]);
}

function OnboardingPage({ user }: { user: User }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [wake, setWake] = useState('07:00');
  const [sleep, setSleep] = useState('23:00');
  const [goal, setGoal] = useState('');
  const [style, setStyle] = useState('balanced');
  const [timezone, setTimezone] = useState(user.timezone);
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [reminders, setReminders] = useState(true);
  const habitChoices = ['Take a walk', 'Read a little', 'Stretch', 'Drink water'];

  const save = useMutation({
    mutationFn: async () => {
      await sendData('/users/settings', 'PATCH', {
        wakeTime: wake,
        sleepTime: sleep,
        goals: goal.trim() ? [goal.trim()] : [],
        planningStyle: style,
        notificationPreferences: { reminders, dailySummary: false },
      });
      for (const name of selectedHabits) {
        await sendData('/habits', 'POST', { name, frequency: 'DAILY', targetValue: 1, targetUnit: 'check-in', flexible: true });
      }
      return sendData('/users/profile', 'PATCH', { onboardingDone: true, timezone });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate('/app/day');
    },
  });

  return (
    <div className="auth-layout">
      <div className="auth-glow" />
      <section className="auth-card glass-card">
        <Link to="/" className="brand auth-brand">
          <span className="brand-mark"><span /></span>
          <span><strong>namma dina</strong><small>ನಮ್ಮ ದಿನ · OUR DAY</small></span>
        </Link>
        <p className="eyebrow">A GENTLE START</p>
        <h1>Shape a day that feels like yours.</h1>
        <p className="muted">A few preferences help us make your first plan feel more natural. You can change these anytime.</p>
        <div className="form-stack">
          <Field label="When do you like to start your day?"><TextInput type="time" value={wake} onChange={(e) => setWake(e.target.value)} /></Field>
          <Field label="When do you usually wind down?"><TextInput type="time" value={sleep} onChange={(e) => setSleep(e.target.value)} /></Field>
          <Field label="Timezone"><TextInput value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Kolkata" /></Field>
          <Field label="One thing you want more room for"><TextInput value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. time to read, regular walks" /></Field>
          <Field label="Planning style">
            <SelectInput value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="focused">Focused blocks</option>
              <option value="balanced">A balanced mix</option>
              <option value="flexible">Loose and flexible</option>
            </SelectInput>
          </Field>
          <div className="onboarding-choices">
            <span>Any habits you’d like to start with? <small>Optional</small></span>
            <div>
              {habitChoices.map((name) => (
                <label key={name}>
                  <input
                    type="checkbox"
                    checked={selectedHabits.includes(name)}
                    onChange={(e) => setSelectedHabits((current) => e.target.checked ? [...current, name] : current.filter((item) => item !== name))}
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>
          <label className="check-row">
            <input type="checkbox" checked={reminders} onChange={(e) => setReminders(e.target.checked)}/>
            <span><strong>Keep gentle reminders on</strong><small>Browser permission is optional and can be enabled later.</small></span>
          </label>
          {save.isError && <p className="inline-error">{save.error instanceof Error ? save.error.message : 'Could not save onboarding.'}</p>}
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Finish setup'} <ChevronRight size={16} />
          </Button>
          <button
            className="text-button"
            onClick={() => {
              sendData('/users/profile', 'PATCH', { onboardingDone: true }).then(() => {
                void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
                navigate('/app/day');
              });
            }}
          >
            Skip for now
          </button>
        </div>
      </section>
      <p className="auth-foot">{user.displayName}, your day can start small.</p>
    </div>
  );
}

export default AppRoot;
