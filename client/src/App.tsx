import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getData, sendData, setAuthTokens, type User } from './lib/api';
import {
  CalendarDays,
  ChartNoAxesCombined,
  CheckSquare,
  Copy,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flower2,
  HeartPulse,
  Leaf,
  LogOut,
  Menu,
  MoreHorizontal,
  Moon,
  NotebookPen,
  PanelsTopLeft,
  Plus,
  Search,
  Settings2,
  Smartphone,
  Sparkles,
  Sun,
  Utensils,
  X,
  Tag,
  Languages,
  Monitor,
  Smile,
  Wind,
} from 'lucide-react';
import { Button, Field, Loading, OfflineBanner, SelectInput, TextInput } from './components/ui';
import { AuroraParticles } from './components/AuroraParticles';
import { AuroraVideo } from './components/AuroraVideo';
import { useNativeLifecycle, useNetworkStatus } from './lib/native';
import { setPreferredTimezone, todayKey } from './lib/format';
import { useLanguage, type TranslationDict } from './lib/i18n';
import { getTimeOfDay, resolveMotionMode } from './lib/motion';
import { SiteSearch } from './components/SiteSearch';
import { SiteUtilities } from './components/SiteUtilities';
import { NotFoundPage } from './pages/NotFoundPage';
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
const ReproductivePage = lazy(() => import('./pages/ReproductivePage').then((module) => ({ default: module.ReproductivePage })));
const BreathePage = lazy(() => import('./pages/BreathePage').then((module) => ({ default: module.BreathePage })));
const MitraWidget = lazy(() => import('./components/MitraWidget').then((module) => ({ default: module.MitraWidget })));

function buildNav(t: TranslationDict) {
  return [
    { to: '/app/day', label: t.navHome, icon: PanelsTopLeft, mobile: true },
    { to: '/app/calendar', label: t.navMyDay, icon: CalendarDays, mobile: true },
    { to: '/app/habits', label: t.navHabits, icon: Leaf, mobile: true },
    { to: '/app/wellness', label: t.navWellness, icon: HeartPulse, mobile: true },
    { to: '/app/settings', label: t.navProfile, icon: Settings2, mobile: true },
    { to: '/app/tasks', label: t.navTasks, icon: CheckSquare },
    { to: '/app/categories', label: t.navCategories, icon: Tag },
    { to: '/app/reminders', label: t.navReminders, icon: Clock3 },
    { to: '/app/cycle', label: t.navCycle, icon: Flower2 },
    { to: '/app/digital', label: t.navDigital, icon: Smartphone },
    { to: '/app/food', label: t.navFood, icon: Utensils },
    { to: '/app/reflection', label: t.navReflection, icon: NotebookPen },
    { to: '/app/insights', label: t.navInsights, icon: ChartNoAxesCombined },
    { to: '/app/notifications', label: t.navNotifications, icon: Sparkles },
  ];
}

function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => getData<User>('/auth/me'),
    retry: false,
  });
}

const pageMetadataMap: Record<string, { title: string; description: string }> = {
  '/': { title: 'Namma Dina — Make today meaningful', description: 'A thoughtful space for your plans, habits and wellbeing in English and ಕನ್ನಡ.' },
  '/login': { title: 'Sign in — Namma Dina', description: 'Sign in to continue planning your day with Namma Dina.' },
  '/register': { title: 'Create an account — Namma Dina', description: 'Create your personal Namma Dina space for plans, habits and wellbeing.' },
  '/forgot-password': { title: 'Reset your password — Namma Dina', description: 'Request password reset instructions for your Namma Dina account.' },
  '/reset-password': { title: 'Choose a new password — Namma Dina', description: 'Set a new password for your Namma Dina account.' },
  '/onboarding': { title: 'Set up your day — Namma Dina', description: 'Choose a few preferences to make your Namma Dina space feel like yours.' },
  '/app/day': { title: 'My Day — Namma Dina', description: 'See today’s plans, habits and gentle next steps in Namma Dina.' },
  '/app/tasks': { title: 'Tasks — Namma Dina', description: 'Plan, organize and complete your tasks in Namma Dina.' },
  '/app/categories': { title: 'Categories — Namma Dina', description: 'Organize your tasks with personal categories.' },
  '/app/habits': { title: 'Habits — Namma Dina', description: 'Build flexible habits and track your check-ins.' },
  '/app/calendar': { title: 'Calendar — Namma Dina', description: 'View your schedule and planned time in Namma Dina.' },
  '/app/reminders': { title: 'Reminders — Namma Dina', description: 'Manage reminders for the things you want to remember.' },
  '/app/wellness': { title: 'Wellness — Namma Dina', description: 'Keep gentle track of the basics that support your day.' },
  '/app/cycle': { title: 'Cycle & Health — Namma Dina', description: 'Private, end-to-end encrypted cycle and health tracking.' },
  '/app/wellness/breathe': { title: 'Breathing pause — Namma Dina', description: 'Take a short guided breathing pause.' },
  '/app/digital': { title: 'Digital wellbeing — Namma Dina', description: 'Notice and reflect on your screen time.' },
  '/app/food': { title: 'Food — Namma Dina', description: 'Keep track of food spending and delivery patterns.' },
  '/app/reflection': { title: 'Reflection — Namma Dina', description: 'Make room to reflect on how your day felt.' },
  '/app/insights': { title: 'Insights — Namma Dina', description: 'Explore patterns in your plans, habits and wellbeing.' },
  '/app/notifications': { title: 'Notifications — Namma Dina', description: 'Review updates and reminders from Namma Dina.' },
  '/app/settings': { title: 'Settings — Namma Dina', description: 'Manage your profile, preferences and privacy choices.' },
  '/app/account': { title: 'Account and privacy — Namma Dina', description: 'Export your information or manage your Namma Dina account.' },
};

function pageMetadata(pathname: string) {
  return pageMetadataMap[pathname] ?? { title: 'Page not found — Namma Dina', description: 'This page could not be found. Return to Namma Dina to continue.' };
}

function AppRoot() {
  useNativeLifecycle();
  const location = useLocation();
  const isOnline = useNetworkStatus();
  const userQuery = useCurrentUser();
  const savedMotionMode = userQuery.data?.settings?.motionMode;
  const timezone = userQuery.data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  useEffect(() => {
    const page = pageMetadata(location.pathname);
    document.title = page.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', page.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', page.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', page.description);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', page.title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', page.description);
  }, [location.pathname]);
  useEffect(() => {
    const root = document.documentElement;
    const preference = savedMotionMode ?? 'auto';
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const device = navigator as Navigator & { deviceMemory?: number };
    const applyMotion = () => {
      root.dataset.motion = resolveMotionMode(preference, media.matches, device);
    };
    const applyTime = () => {
      root.dataset.timeOfDay = getTimeOfDay(timezone);
    };
    const longForm = ['/onboarding', '/app/settings', '/app/account', '/app/reflection'].includes(location.pathname);
    root.dataset.longForm = String(longForm);
    applyMotion();
    applyTime();
    media.addEventListener('change', applyMotion);
    const clock = window.setInterval(applyTime, 60_000);
    return () => {
      media.removeEventListener('change', applyMotion);
      window.clearInterval(clock);
    };
  }, [location.pathname, savedMotionMode, timezone]);
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
  const showPublicParticles = ['/', '/login', '/register'].includes(location.pathname);
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <AuroraAtmosphere />
      {showPublicParticles && <AuroraParticles intensity="ambient" />}
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
              <Route path="cycle" element={<ReproductivePage />} />
              <Route path="wellness/breathe" element={<BreathePage />} />
              <Route path="digital" element={<DigitalPage />} />
              <Route path="food" element={<FoodPage />} />
              <Route path="reflection" element={<ReflectionPage />} />
              <Route path="insights" element={<InsightsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage user={user!} />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="*" element={<NotFoundPage homeTo="/app/day" inApp />} />
            </Route>
            <Route path="*" element={<NotFoundPage homeTo={user ? '/app/day' : '/'} />} />
          </Routes>
        </Suspense>
      </div>
      {user && location.pathname.startsWith('/app') && <Suspense fallback={null}><MitraWidget /></Suspense>}
      {!isOnline && <OfflineBanner />}
      <SiteUtilities isApp={location.pathname.startsWith('/app')} />
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
      <AuroraVideo />
      <span ref={atmosphereRef} className="aurora-cursor" />
      <span className="aurora-horizon" />
      <span className="aurora-vignette" />
    </div>
  );
}

function AppShell({ user }: { user: User }) {
  const { lang, setLanguage, t } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddKind, setQuickAddKind] = useState<'task' | 'water' | 'habit' | 'mood' | 'reflection' | 'breathe'>('task');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [theme, setTheme] = useState<'night' | 'day' | 'system'>(() => {
    try {
      const saved = localStorage.getItem('nd_theme');
      if (saved === 'day' || saved === 'night' || saved === 'system') return saved;
      return 'system';
    } catch {
      return 'system';
    }
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const nav = useMemo(() => buildNav(t), [t]);
  const searchItems = useMemo(() => [
    ...nav.map((item) => ({ ...item, keywords: `${item.label} plan track manage` })),
    { to: '/app/wellness/breathe', label: lang === 'kn' ? 'ಉಸಿರಾಟದ ವಿರಾಮ' : 'Breathing pause', keywords: 'breathe calm pause wellness' },
    { to: '/app/account', label: t.navAccount, keywords: 'privacy export delete account' },
  ], [lang, nav, t.navAccount]);
  const navGroups = useMemo(() => [
    { label: t.groupToday, items: nav.filter((item) => ['/app/day', '/app/calendar', '/app/tasks'].includes(item.to)) },
    { label: t.groupPlan, items: nav.filter((item) => ['/app/categories', '/app/reminders'].includes(item.to)) },
    { label: t.groupCare, items: nav.filter((item) => ['/app/habits', '/app/wellness', '/app/cycle', '/app/digital', '/app/food'].includes(item.to)) },
    { label: t.groupReflect, items: nav.filter((item) => ['/app/reflection', '/app/insights', '/app/notifications', '/app/settings'].includes(item.to)) },
  ], [nav, t]);

  useEffect(() => {
    const applyResolvedTheme = () => {
      let resolved: 'night' | 'day' = 'night';
      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
      } else {
        resolved = theme;
      }
      document.documentElement.dataset.theme = resolved;
    };

    applyResolvedTheme();
    try { localStorage.setItem('nd_theme', theme); } catch { /* Ignore storage errors. */ }

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', applyResolvedTheme);
      return () => media.removeEventListener('change', applyResolvedTheme);
    }
  }, [theme]);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setQuickAddOpen(true);
      }
      if (event.key === 'Escape') {
        setQuickAddOpen(false);
        setMobileOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!quickAddOpen) setQuickTaskTitle('');
  }, [quickAddOpen]);

  const logout = useMutation({
    mutationFn: async () => {
      await sendData('/auth/logout', 'POST').catch(() => { });
      await setAuthTokens(null);
    },
    onSettled: () => {
      queryClient.clear();
      navigate('/login');
    },
  });

  const quickCreateTask = useMutation({
    mutationFn: () => sendData('/tasks', 'POST', { title: quickTaskTitle.trim(), priority: 'MEDIUM', scheduledMinutes: 30 }),
    onSuccess: () => {
      setQuickAddOpen(false);
      setQuickTaskTitle('');
      setCopyStatus(lang === 'kn' ? 'ಕೆಲಸವನ್ನು ಸೇರಿಸಲಾಗಿದೆ' : 'Task added');
      window.setTimeout(() => setCopyStatus(''), 2500);
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
  const quickLogWater = useMutation({
    mutationFn: (amountMl: number) => sendData('/water', 'POST', { date: todayKey(new Date(), user.timezone), amountMl }),
    onSuccess: () => {
      setQuickAddOpen(false);
      setCopyStatus(lang === 'kn' ? 'ನೀರಿನ ದಾಖಲೆಯನ್ನು ಉಳಿಸಲಾಗಿದೆ' : 'Water log saved');
      window.setTimeout(() => setCopyStatus(''), 2500);
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      void queryClient.invalidateQueries({ queryKey: ['wellness'] });
    },
  });

  const cycleTheme = () => {
    setTheme((curr) => {
      if (curr === 'night') return 'day';
      if (curr === 'day') return 'system';
      return 'night';
    });
  };

  const quickLogMood = useMutation({
    mutationFn: (mood: number) => sendData('/wellness', 'POST', { date: todayKey(new Date(), user.timezone), mood }),
    onSuccess: () => {
      setQuickAddOpen(false);
      setCopyStatus(lang === 'kn' ? 'ಮನಸ್ಥಿತಿಯನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ' : 'Mood logged');
      window.setTimeout(() => setCopyStatus(''), 2500);
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      void queryClient.invalidateQueries({ queryKey: ['wellness'] });
    },
  });

  const activeNav = nav.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))?.label ?? t.navDay;
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const copyCurrentPage = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const fallback = document.createElement('textarea');
        fallback.value = window.location.href;
        fallback.setAttribute('readonly', '');
        fallback.style.position = 'fixed';
        fallback.style.opacity = '0';
        document.body.appendChild(fallback);
        fallback.select();
        const copied = document.execCommand('copy');
        fallback.remove();
        if (!copied) throw new Error('Clipboard access unavailable');
      }
      setCopyStatus(lang === 'kn' ? 'ಲಿಂಕ್ ನಕಲಿಸಲಾಗಿದೆ' : 'Page link copied');
    } catch {
      setCopyStatus(lang === 'kn' ? 'ಲಿಂಕ್ ನಕಲಿಸಲಾಗಲಿಲ್ಲ' : 'Could not copy the page link');
    }
    window.setTimeout(() => setCopyStatus(''), 2500);
  };
  useReminderWatcher();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/app/day" className="brand" aria-label={`${t.brandName} ${t.brandSub}`}>
          <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="16" r="6" /><path d="M9 29c4-6 9-9 15-9s11 3 15 9" /><path d="M7 33h34M12 38h24" /></svg></span>
          <span><strong>{t.brandName}</strong>{' '}<small>{t.brandSub}</small></span>
        </Link>
        <nav className="side-nav">
          {navGroups.map((group) => <div className="side-nav-group" key={group.label}>
            <div className="sidebar-label">{group.label}</div>
            {group.items.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} aria-label={label} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
                {label === t.navDay && <span className="nav-dot" />}
              </NavLink>
            ))}
          </div>)}
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
              aria-label={lang === 'en' ? 'ಕನ್ನಡ, switch to Kannada' : 'EN, switch to English'}
            >
              {lang === 'en' ? 'ಕನ್ನಡ' : 'EN'}
            </button>
          </div>
          <button className="nav-link" onClick={() => logout.mutate()}><LogOut size={16} /><span>{t.signOut}</span></button>
        </div>
      </aside>

      <main className="app-main" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="mobile-navigation">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="crumb">
            <span>{activeNav}</span>
            <span className="crumb-sep">/</span>
            <span className="muted">{todayKey()}</span>
          </div>
          <div className="topbar-right">
            <button className="icon-button site-search-trigger" type="button" onClick={() => setSearchOpen(true)} aria-label="Search pages" title="Search pages"><Search size={18} /></button>
            <button className="icon-button copy-page-trigger" type="button" onClick={() => void copyCurrentPage()} aria-label="Copy page link" title="Copy page link"><Copy size={17} /></button>
            <button className="assistant-trigger" onClick={() => window.dispatchEvent(new Event('namma-dina:open-mitra'))} aria-label={t.navMitra}>
              <Sparkles size={17} /><span>{t.navMitra}</span>
            </button>
            <button className="quick-add-trigger" onClick={() => setQuickAddOpen(true)} aria-label={`${t.quickAdd} Ctrl K`} aria-keyshortcuts="Control+K Meta+K">
              <Plus size={17} aria-hidden="true" /><span>{t.quickAdd}{' '}<kbd aria-hidden="true">Ctrl K</kbd></span>
            </button>
            <button
              className="icon-button theme-toggle"
              onClick={cycleTheme}
              aria-label={theme === 'night' ? t.themeDay : theme === 'day' ? t.themeSystem : t.themeNight}
              title={theme === 'night' ? `${t.themeNight} (Switch to Day)` : theme === 'day' ? `${t.themeDay} (Switch to System)` : `${t.themeSystem} (Switch to Night)`}
              aria-pressed={theme !== 'night'}
            >
              {theme === 'night' ? <Moon size={18} /> : theme === 'day' ? <Sun size={18} /> : <Monitor size={18} />}
            </button>
            <button
              className="icon-button"
              onClick={() => setLanguage(lang === 'en' ? 'kn' : 'en')}
              title={lang === 'en' ? 'ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ' : 'Switch to English'}
              style={{ height: '30px', padding: '0 8px', width: 'auto', fontSize: '12px', fontWeight: 700, gap: '4px' }}
              aria-label={lang === 'en' ? 'ಕನ್ನಡ, switch to Kannada' : 'EN, switch to English'}
            >
              <Languages size={14} />
              <span>{lang === 'en' ? 'ಕನ್ನಡ' : 'EN'}</span>
            </button>
            <button className="avatar avatar-small" onClick={() => navigate('/app/settings')} aria-label="Open settings">
              {user.displayName.slice(0, 1).toUpperCase()}
            </button>
            <button className="icon-button topbar-signout" onClick={() => logout.mutate()} aria-label={t.signOut} title={t.signOut}><LogOut size={16} /></button>
          </div>
        </header>

        {mobileOpen && (
          <nav className="mobile-drawer" id="mobile-navigation" aria-label={t.yourSpace}>
            <div className="mobile-drawer-head">
              <Link to="/app/day" className="brand mobile-drawer-brand" onClick={() => setMobileOpen(false)} aria-label={`${t.brandName} ${t.brandSub}`}>
                <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="16" r="6" /><path d="M9 29c4-6 9-9 15-9s11 3 15 9" /><path d="M7 33h34M12 38h24" /></svg></span>
                <span><strong>{t.brandName}</strong><small>{t.brandSub}</small></span>
              </Link>
              <button className="icon-button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
            </div>
            <button className="nav-link mobile-tool-link" type="button" onClick={() => { setMobileOpen(false); setSearchOpen(true); }}><Search size={18} />Search pages</button>
            <button className="nav-link mobile-tool-link" type="button" onClick={() => void copyCurrentPage()}><Copy size={18} />Copy page link</button>
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink onClick={() => setMobileOpen(false)} key={to} to={to} aria-label={label} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            <button className="nav-link" onClick={() => logout.mutate()}>
              <LogOut size={18} />
              {t.signOut}
            </button>
          </nav>
        )}

        <div className="page-wrap">
          <div key={location.pathname} className="page-route">
            <Outlet />
          </div>
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Mobile Navigation">
        {nav.filter((item) => item.mobile).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''}`}>
            <Icon size={19} strokeWidth={1.8} />
            <small>{label}</small>
          </NavLink>
        ))}
      </nav>

      {moreOpen && (
        <div className="more-panel">
          <button onClick={() => { setMoreOpen(false); setSearchOpen(true); }} className="nav-link"><Search size={17} />Search pages</button>
          <button onClick={() => void copyCurrentPage()} className="nav-link"><Copy size={17} />Copy page link</button>
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

      <button className="quick-add-fab" onClick={() => setQuickAddOpen(true)} aria-label={t.quickAdd} title={t.quickAdd}>
        <Plus size={24} />
      </button>

      {quickAddOpen && <div className="quick-add-scrim" onClick={() => setQuickAddOpen(false)}>
        <section className="quick-add-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-add-title" onClick={(event) => event.stopPropagation()}>
          <div className="quick-add-heading">
            <div><p className="eyebrow">{t.quickAdd}</p><h2 id="quick-add-title">{t.quickAddTitle}</h2><p>{t.quickAddHint}</p></div>
            <button className="icon-button" onClick={() => setQuickAddOpen(false)} aria-label={lang === 'kn' ? 'ಮುಚ್ಚಿ' : 'Close'}><X size={19} /></button>
          </div>
          <div className="quick-add-options" role="tablist" aria-label={t.quickAddTitle}>
            {([
              ['task', t.quickTask, CheckSquare],
              ['water', t.quickWater, HeartPulse],
              ['habit', t.quickHabit, Leaf],
              ['mood', t.quickMood, Smile],
              ['reflection', t.quickReflection, NotebookPen],
              ['breathe', t.quickBreathe, Wind],
            ] as const).map(([kind, label, Icon]) => <button key={kind} role="tab" aria-selected={quickAddKind === kind} className={quickAddKind === kind ? 'active' : ''} onClick={() => setQuickAddKind(kind)}><Icon size={17} /><span>{label}</span></button>)}
          </div>
          {quickAddKind === 'task' && <form className="quick-add-form" onSubmit={(event) => { event.preventDefault(); if (quickTaskTitle.trim()) quickCreateTask.mutate(); }}>
            <label htmlFor="quick-task-title">{t.quickTask}</label>
            <TextInput id="quick-task-title" autoFocus value={quickTaskTitle} onChange={(event) => setQuickTaskTitle(event.target.value)} placeholder={t.quickTaskPlaceholder} maxLength={160} />
            {quickCreateTask.isError && <p className="inline-error">{lang === 'kn' ? 'ಕೆಲಸವನ್ನು ಉಳಿಸಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.' : 'That task could not be saved. Try again.'}</p>}
            <Button type="submit" disabled={!quickTaskTitle.trim() || quickCreateTask.isPending}>{quickCreateTask.isPending ? (lang === 'kn' ? 'ಸೇರಿಸಲಾಗುತ್ತಿದೆ…' : 'Adding…') : t.quickCreateTask}<Plus size={16} /></Button>
          </form>}
          {quickAddKind === 'water' && <div className="quick-add-water"><p>{lang === 'kn' ? 'ನಿಮ್ಮ ಇಂದಿನ ದಾಖಲೆಗೆ ನೀರನ್ನು ಸೇರಿಸಿ.' : 'Add water to today’s check-in.'}</p><div><Button type="button" variant="outline" onClick={() => quickLogWater.mutate(250)} disabled={quickLogWater.isPending}>{t.quickWater250}</Button><Button type="button" onClick={() => quickLogWater.mutate(500)} disabled={quickLogWater.isPending}>{t.quickWater500}</Button></div>{quickLogWater.isError && <p className="inline-error">{lang === 'kn' ? 'ನೀರಿನ ದಾಖಲೆಯನ್ನು ಉಳಿಸಲಾಗಲಿಲ್ಲ.' : 'That water log could not be saved.'}</p>}</div>}
          {quickAddKind === 'habit' && <div className="quick-add-route"><p>{lang === 'kn' ? 'ಇಂದಿನ ಅಭ್ಯಾಸವನ್ನು ಆರಿಸಿ ದಾಖಲಿಸಿ.' : 'Choose a habit and check in for today.'}</p><Button type="button" onClick={() => { setQuickAddOpen(false); navigate('/app/habits'); }}>{lang === 'kn' ? 'ಅಭ್ಯಾಸಗಳನ್ನು ತೆರೆಯಿರಿ' : 'Open habits'}<ChevronRight size={16} /></Button></div>}
          {quickAddKind === 'mood' && <div className="quick-add-mood"><p>{lang === 'kn' ? 'ಇಂದು ನಿಮ್ಮ ಮನಸ್ಥಿತಿ ಹೇಗಿದೆ?' : 'How are you feeling today?'}</p><div className="quick-mood-grid">{([ [5, '🌟', t.quickMoodGreat], [4, '😊', t.quickMoodGood], [3, '😐', t.quickMoodOkay], [2, '😔', t.quickMoodLow], [1, '😫', t.quickMoodTired] ] as const).map(([score, emoji, text]) => (<button key={score} type="button" className="quick-mood-btn" disabled={quickLogMood.isPending} onClick={() => quickLogMood.mutate(score)}><span style={{ fontSize: '20px' }}>{emoji}</span><small>{text}</small></button>))}</div>{quickLogMood.isError && <p className="inline-error">{lang === 'kn' ? 'ಮನಸ್ಥಿತಿಯನ್ನು ದಾಖಲಿಸಲಾಗಲಿಲ್ಲ.' : 'Could not save mood.'}</p>}</div>}
          {quickAddKind === 'reflection' && <div className="quick-add-route"><p>{lang === 'kn' ? 'ಇಂದಿನ ದಿನದ ಬಗ್ಗೆ ಒಂದು ಕ್ಷಣ ಗಮನಿಸಿ.' : 'Take a moment to notice the day you had.'}</p><Button type="button" onClick={() => { setQuickAddOpen(false); navigate('/app/reflection'); }}>{lang === 'kn' ? 'ಅವಲೋಕನ ತೆರೆಯಿರಿ' : 'Open reflection'}<ChevronRight size={16} /></Button></div>}
          {quickAddKind === 'breathe' && <div className="quick-add-route"><p>{t.quickBreathePrompt}</p><Button type="button" onClick={() => { setQuickAddOpen(false); navigate('/app/wellness/breathe'); }}>{t.startBreathing}<ChevronRight size={16} /></Button></div>}
        </section>
      </div>}
      {copyStatus && <div className="copy-status" role="status" aria-live="polite">{copyStatus}</div>}
      {searchOpen && <SiteSearch items={searchItems} onClose={closeSearch} />}
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
  const [step, setStep] = useState(0);
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
      <section id="main-content" tabIndex={-1} className="auth-card glass-card">
        <Link to="/" className="brand auth-brand">
          <span className="brand-mark"><span /></span>
          <span><strong>namma dina</strong><small>ನಮ್ಮ ದಿನ · OUR DAY</small></span>
        </Link>
        <p className="eyebrow">A GENTLE START</p>
        <h1>Shape a day that feels like yours.</h1>
        <p className="muted">A few preferences help us make your first plan feel more natural. You can change these anytime.</p>
        <div className="onboarding-progress" role="progressbar" aria-label="Onboarding progress" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1}>
          <div className="onboarding-dots" aria-hidden="true">{[0, 1, 2].map((index) => <span key={index} className={index <= step ? 'complete' : ''} />)}</div>
          <span>Step {step + 1} of 3</span>
        </div>
        <div key={step} className={`onboarding-step onboarding-step-${step}`}>
          <svg className="onboarding-illustration" viewBox="0 0 64 48" aria-hidden="true"><circle cx="49" cy="11" r="4" /><path d="M3 34c10-12 18-12 29-3 7 6 14 7 22 0 3-3 5-4 7-3v17H3Z" /><path d="M3 39c9-5 16-5 25 0s17 5 25 0 7-3 8-2" /></svg>
          <h2>{step === 0 ? 'Start with your day.' : step === 1 ? 'Make room for what matters.' : 'Choose a gentle rhythm.'}</h2>
          {step === 0 && <div className="form-stack"><Field label="When do you like to start your day?"><TextInput type="time" value={wake} onChange={(e) => setWake(e.target.value)} /></Field><Field label="When do you usually wind down?"><TextInput type="time" value={sleep} onChange={(e) => setSleep(e.target.value)} /></Field><Field label="Timezone"><TextInput value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Kolkata" /></Field></div>}
          {step === 1 && <div className="form-stack"><Field label="One thing you want more room for"><TextInput value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. time to read, regular walks" /></Field><Field label="Planning style"><SelectInput value={style} onChange={(e) => setStyle(e.target.value)}><option value="focused">Focused blocks</option><option value="balanced">A balanced mix</option><option value="flexible">Loose and flexible</option></SelectInput></Field></div>}
          {step === 2 && <div className="form-stack"><div className="onboarding-choices"><span>Any habits you’d like to start with? <small>Optional</small></span><div>{habitChoices.map((name) => <label key={name}><input type="checkbox" checked={selectedHabits.includes(name)} onChange={(e) => setSelectedHabits((current) => e.target.checked ? [...current, name] : current.filter((item) => item !== name))} />{name}</label>)}</div></div><label className="check-row"><input type="checkbox" checked={reminders} onChange={(e) => setReminders(e.target.checked)} /><span><strong>Keep gentle reminders on</strong><small>Browser permission is optional and can be enabled later.</small></span></label></div>}
        </div>
        {save.isError && <p className="inline-error">{save.error instanceof Error ? save.error.message : 'Could not save onboarding.'}</p>}
        <div className="onboarding-actions">
          {step > 0 && <Button variant="quiet" onClick={() => setStep(step - 1)} disabled={save.isPending}>Back</Button>}
          {step < 2 && <Button onClick={() => setStep(step + 1)}>Continue <ChevronRight size={16} /></Button>}
          {step === 2 && <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Finish setup'} <ChevronRight size={16} /></Button>}
        </div>
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
      </section>
      <p className="auth-foot">{user.displayName}, your day can start small.</p>
    </div>
  );
}

export default AppRoot;
