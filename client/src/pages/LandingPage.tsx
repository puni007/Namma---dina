import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Languages,
  Leaf,
  Menu,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { MitraMascot, type MitraPose } from '../components/MitraMascot';

interface PreviewItem {
  id: string;
  titleEn: string;
  titleKn: string;
  subtitleEn: string;
  subtitleKn: string;
  tagEn: string;
  tagKn: string;
  completed: boolean;
}

const INITIAL_ITEMS: PreviewItem[] = [
  {
    id: 'study',
    titleEn: 'Study session — 45 mins',
    titleKn: 'ಅಧ್ಯಯನ ಅವಧಿ — 45 ನಿಮಿಷ',
    subtitleEn: 'Deep focus with breathing room',
    subtitleKn: 'ಏಕಾಗ್ರತೆ ಮತ್ತು ಶಾಂತ ವಿರಾಮಗಳು',
    tagEn: 'Focus',
    tagKn: 'ಗಮನ',
    completed: true,
  },
  {
    id: 'walk',
    titleEn: 'Evening walk & unplug',
    titleKn: 'ಸಂಜೆ ನಡಿಗೆ ಮತ್ತು ವಿಶ್ರಾಂತಿ',
    subtitleEn: 'Fresh twilight air, screen-free flow',
    subtitleKn: 'ಪರದೆಯಿಂದ ದೂರ, ತಾಜಾ ಮುಸ್ಸಂಜೆ ಗಾಳಿ',
    tagEn: 'Habit',
    tagKn: 'ಅಭ್ಯಾಸ',
    completed: false,
  },
  {
    id: 'wellness',
    titleEn: 'Hydrate & check in',
    titleKn: 'ನೀರು ಕುಡಿಯುವುದು ಮತ್ತು ಯೋಗಕ್ಷೇಮ',
    subtitleEn: '500 ml cool water & a gentle stretch',
    subtitleKn: '500 ಮಿಲಿ ನೀರು ಮತ್ತು ಶಾಂತ ಧ್ಯಾನ',
    tagEn: 'Care',
    tagKn: 'ಕಾಳಜಿ',
    completed: false,
  },
];

function getMitraSpeech(completedCount: number, lang: 'en' | 'kn'): { message: string; pose: MitraPose } {
  if (lang === 'kn') {
    if (completedCount === 0) {
      return {
        message: 'ಒಂದೇ ಹೆಜ್ಜೆ — One gentle step at a time. Ready when you are.',
        pose: 'idle',
      };
    }
    if (completedCount === 1) {
      return {
        message: 'ಚೆನ್ನಾಗಿ ಮುನ್ನಡೆಯುತ್ತಿದ್ದೀರಿ — ಮೊದಲ ಹೆಜ್ಜೆ ಯಾವಾಗಲೂ ಮುಖ್ಯ.',
        pose: 'happy',
      };
    }
    if (completedCount === 2) {
      return {
        message: 'ಸುಂದರ ಲಯ — ನಿಮ್ಮ ದಿನ ಶಾಂತವಾಗಿ ಮತ್ತು ಅರ್ಥಪೂರ್ಣವಾಗಿ ಸಾಗುತ್ತಿದೆ.',
        pose: 'happy',
      };
    }
    return {
      message: 'ಅದ್ಭುತ! — ಇಂದಿನ ದಿನ ನಿಜಕ್ಕೂ ಅರ್ಥಪೂರ್ಣವಾಯಿತು. ನೀವು ಗೆದ್ದಿದ್ದೀರಿ!',
      pose: 'celebrating',
    };
  }

  // English (with bilingual soul)
  if (completedCount === 0) {
    return {
      message: 'ಒಂದೇ ಹೆಜ್ಜೆ — One gentle step at a time. Ready when you are.',
      pose: 'idle',
    };
  }
  if (completedCount === 1) {
    return {
      message: 'A thoughtful start. Small, gentle steps create lasting momentum.',
      pose: 'happy',
    };
  }
  if (completedCount === 2) {
    return {
      message: 'Wonderful rhythm today. Keep it light, you are doing beautifully.',
      pose: 'happy',
    };
  }
  return {
    message: 'What a meaningful day. You honored your own pace and made it count!',
    pose: 'celebrating',
  };
}

const FAQ_ITEMS = [
  {
    qEn: 'Can I use Namma Dina in Kannada?',
    qKn: 'ನಾನು ನಮ್ಮ ದಿನವನ್ನು ಕನ್ನಡದಲ್ಲಿ ಬಳಸಬಹುದೇ?',
    aEn: 'Yes! Seamlessly switch between English and ಕನ್ನಡ anywhere in the app with a single click. Every feature, prompt, and companion reflection is natively bilingual.',
    aKn: 'ಹೌದು! ಅಪ್ಲಿಕೇಶನ್‌ನಲ್ಲಿ ಇಂಗ್ಲಿಷ್ ಮತ್ತು ಕನ್ನಡದ ನಡುವೆ ಸುಲಭವಾಗಿ ಬದಲಾಯಿಸಿ. ಎಲ್ಲ ವೈಶಿಷ್ಟ್ಯಗಳು, ಮಾರ್ಗದರ್ಶನಗಳು ಮತ್ತು ಜ್ಞಾಪನೆಗಳು ದ್ವಿಭಾಷೆಯಲ್ಲಿ ಲಭ್ಯವಿದೆ.',
  },
  {
    qEn: 'What does "Gentle Comeback" mean?',
    qKn: '"ಜೆಂಟಲ್ ಕಂಬ್ಯಾಕ್" ಎಂದರೆ ಏನು?',
    aEn: 'When life happens and a day gets derailed, Namma Dina never punishes you with broken streak alerts or guilt. Mitra calculates your Comeback Score and suggests one small, manageable step to regain your flow.',
    aKn: 'ಯೋಜನೆಗಳು ತಪ್ಪಿದಾಗ ನಮ್ಮ ದಿನ ಎಂದಿಗೂ ಕಠಿಣ ಎಚ್ಚರಿಕೆಗಳನ್ನು ನೀಡುವುದಿಲ್ಲ. ಬದಲಿಗೆ, ಮಿತ್ರ ಸಣ್ಣ ಮತ್ತು ಸುಲಭ ಹೆಜ್ಜೆಯನ್ನು ಸೂಚಿಸಿ ನಿಮ್ಮ ಲಯವನ್ನು ಪುನಃ ಹೊಂದಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
  },
  {
    qEn: 'Who is Mitra, and do I have to use AI?',
    qKn: 'ಮಿತ್ರ ಯಾರು ಮತ್ತು ನಾನು ಎಐ ಬಳಸಲೇಬೇಕೇ?',
    aEn: 'Mitra is your warm, evolving smiling flame companion that grows with your daily accomplishments. Mitra is completely optional and private, and never changes your plans without your explicit confirmation.',
    aKn: 'ಮಿತ್ರ ನಿಮ್ಮ ದಿನನಿತ್ಯದ ಸಾಧನೆಗಳೊಂದಿಗೆ ಬೆಳೆಯುವ ಆತ್ಮೀಯ ಜ್ವಾಲೆಯ ಸಂಗಾತಿ. ಮಿತ್ರ ಸಂಪೂರ್ಣ ಐಚ್ಛಿಕ ಮತ್ತು ಗೌಪ್ಯವಾಗಿದ್ದು, ನಿಮ್ಮ ಅನುಮತಿಯಿಲ್ಲದೆ ಯೋಜನೆಗಳನ್ನು ಬದಲಿಸುವುದಿಲ್ಲ.',
  },
  {
    qEn: 'Is my health and personal data private?',
    qKn: 'ನನ್ನ ಆರೋಗ್ಯ ಮತ್ತು ವೈಯಕ್ತಿಕ ದಾಖಲೆಗಳು ಸುರಕ್ಷಿತವೇ?',
    aEn: 'All sensitive health, cycle, and pregnancy entries are fortified with AES-256-GCM client-side encryption. We also support an instant, one-click right-to-be-forgotten purge whenever you decide.',
    aKn: 'ಎಲ್ಲ ಸೂಕ್ಷ್ಮ ಆರೋಗ್ಯ ದಾಖಲೆಗಳು AES-256-GCM ಎನ್‌ಕ್ರಿಪ್ಶನ್‌ನಿಂದ ಸಂಪೂರ್ಣ ಸುರಕ್ಷಿತವಾಗಿವೆ. ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ಒಂದೇ ಕ್ಲಿಕ್‌ನಲ್ಲಿ ಡೇಟಾವನ್ನು ಸಂಪೂರ್ಣ ಅಳಿಸಬಹುದು.',
  },
];

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroLang, setHeroLang] = useState<'en' | 'kn'>('en');
  const [items, setItems] = useState<PreviewItem[]>(INITIAL_ITEMS);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const completedCount = items.filter((item) => item.completed).length;
  const { message: companionMessage, pose: mitraPose } = getMitraSpeech(completedCount, heroLang);
  const completionPercentage = Math.round((completedCount / items.length) * 100);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  return (
    <div className="relative min-h-screen bg-[#060B14] text-slate-100 font-['Plus_Jakarta_Sans','Noto_Sans_Kannada',sans-serif] selection:bg-emerald-500/20 selection:text-emerald-300 overflow-x-hidden">
      {/* =========================================================================
          BACKGROUND: Deep Midnight-Indigo Base + Organic Aurora Ribbons
      ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Soft emerald-teal organic aurora ribbon */}
        <div className="absolute -top-[20%] -left-[10%] w-[75vw] h-[65vw] max-w-[950px] max-h-[800px] rounded-full aurora-ribbon-emerald blur-[90px]" />

        {/* Soft twilight-indigo ribbon drifting across center-right */}
        <div className="absolute top-[10%] -right-[15%] w-[70vw] h-[60vw] max-w-[900px] max-h-[750px] rounded-full aurora-ribbon-twilight blur-[100px]" />

        {/* Ambient subtle starry grain / particle dots */}
        <div className="absolute inset-0 bg-[radial-gradient(1px_1px_at_20px_30px,rgba(255,255,255,0.15),transparent_100%),radial-gradient(1px_1px_at_80px_120px,rgba(110,231,183,0.12),transparent_100%)] bg-[length:140px_140px] opacity-40" />

        {/* Vignette depth gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#060B14]/30 to-[#060B14] pointer-events-none" />
      </div>

      {/* =========================================================================
          TOP NAVBAR: Minimal, Crisp, Bilingual Brand + CTA
      ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#060B14]/75 border-b border-white/[0.08] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
          {/* Brand Mark */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-xl py-1 px-1">
            <span className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0B2127] to-[#123838] border border-emerald-400/30 shadow-[0_0_18px_rgba(16,185,129,0.22)] group-hover:border-emerald-400/60 transition-all duration-300">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_10px_#34d399]" />
            </span>
            <div className="flex flex-col">
              <strong className="text-base sm:text-lg font-bold text-white tracking-tight leading-none group-hover:text-emerald-300 transition-colors">
                namma dina
              </strong>
              <small className="text-[11px] text-slate-400 tracking-wider font-medium mt-1">
                ನಮ್ಮ ದಿನ · OUR DAY
              </small>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a
              href="#how-it-works"
              className="hover:text-emerald-300 transition-colors py-2 focus:outline-none focus-visible:text-emerald-400"
            >
              How it works
            </a>
            <a
              href="#faq"
              className="hover:text-emerald-300 transition-colors py-2 focus:outline-none focus-visible:text-emerald-400"
            >
              FAQ
            </a>
            <Link
              to="/login"
              className="hover:text-white transition-colors py-2 focus:outline-none focus-visible:text-emerald-400"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-[#060B14] bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#34D399] hover:to-[#6EE7B7] shadow-[0_0_22px_rgba(16,185,129,0.35)] transition-all transform hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <span>Start your day</span>
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </nav>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/10 bg-[#0B1320]/95 backdrop-blur-2xl px-6 py-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-slate-200 hover:text-emerald-300 font-medium text-sm transition-colors"
            >
              How it works
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-slate-200 hover:text-emerald-300 font-medium text-sm transition-colors"
            >
              FAQ
            </a>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-slate-200 hover:text-white font-medium text-sm transition-colors"
            >
              Sign in
            </Link>
            <div className="pt-2">
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold text-[#060B14] bg-gradient-to-r from-[#10B981] to-[#34D399] shadow-[0_0_20px_rgba(16,185,129,0.35)]"
              >
                <span>Start your day</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          HERO SECTION: Emotional Resonance + Living Interactive Mitra Preview
      ========================================================================= */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-12 pb-20 lg:pt-20 lg:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Column: Emotionally Resonant Hero Copy */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              {/* Gentle Pill Badge */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium w-fit mb-6 shadow-[0_0_15px_rgba(16,185,129,0.08)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>A gentler way to plan your day · ಒಂದು ಹೊಸ ಆರಂಭ</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white tracking-tight leading-[1.08] mb-4">
                Make today<br />
                <span className="bg-gradient-to-r from-[#10B981] via-[#6EE7B7] to-[#F59E0B] bg-clip-text text-transparent">
                  meaningful.
                </span>
              </h1>

              {/* Sub-headline */}
              <p className="text-xl sm:text-2xl text-slate-300 font-medium tracking-tight mb-4">
                Make tomorrow better.
              </p>

              {/* Descriptive Copy */}
              <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-xl mb-9">
                A thoughtful space for your plans, habits, and wellbeing. When a day goes sideways, find your way back without the guilt.
              </p>

              {/* Hero CTA Actions */}
              <div className="flex flex-wrap items-center gap-4 mb-10">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold text-[#060B14] bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#34D399] hover:to-[#6EE7B7] shadow-[0_0_30px_rgba(16,185,129,0.38)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  <span>Create your free space</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <span>Explore the rhythm</span>
                  <ArrowDownRight size={16} className="text-emerald-400" />
                </a>
              </div>

              {/* Trust Avatars & Micro-copy */}
              <div className="flex items-center gap-3.5 pt-2 text-xs text-slate-400">
                <div className="flex -space-x-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-[11px] text-emerald-200 font-semibold shadow-sm">
                    ಸ
                  </span>
                  <span className="w-7 h-7 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-[11px] text-indigo-200 font-semibold shadow-sm">
                    日
                  </span>
                  <span className="w-7 h-7 rounded-full bg-amber-950 border border-amber-500/40 flex items-center justify-center text-[11px] text-amber-200 shadow-sm">
                    ✦
                  </span>
                </div>
                <span className="font-medium text-slate-300">
                  Small steps. Your pace. Always yours.
                </span>
              </div>
            </div>

            {/* Right Column: Living Mitra Focal Point & Interactive Day Preview */}
            <div className="lg:col-span-6 relative flex justify-center">
              {/* Warm Amber-Emerald Aura behind Mitra and the Card */}
              <div className="absolute -top-12 -right-8 w-80 h-80 rounded-full aurora-ember-aura blur-3xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-72 h-72 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

              {/* Frosted Glassmorphism Hero Card */}
              <div className="relative w-full max-w-[460px] rounded-3xl p-6 sm:p-7 backdrop-blur-xl bg-[#0B1320]/75 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.55),0_0_45px_rgba(16,185,129,0.07)] overflow-hidden">
                {/* Subtle top-lit border highlight */}
                <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent pointer-events-none" />

                {/* Card Header: Gentle Comeback Badge + Live Language Toggle Pill */}
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium tracking-wide">
                    <Leaf size={12} className="text-emerald-400" />
                    <span>Gentle Comeback</span>
                  </div>

                  {/* Live EN / ಕನ್ನಡ Toggle Pill */}
                  <button
                    type="button"
                    onClick={() => setHeroLang(heroLang === 'en' ? 'kn' : 'en')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                    title="Toggle Language Preview (English / ಕನ್ನಡ)"
                  >
                    <Languages size={12} className="text-emerald-400" />
                    <span className={heroLang === 'en' ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                      EN
                    </span>
                    <span className="text-slate-600">/</span>
                    <span className={heroLang === 'kn' ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                      ಕನ್ನಡ
                    </span>
                  </button>
                </div>

                {/* Mitra Companion Spotlight: Breathing Flame Avatar + Dynamic Speech */}
                <div className="relative mb-5 p-4 rounded-2xl bg-gradient-to-br from-emerald-950/35 via-[#0E1A2D]/70 to-amber-950/25 border border-emerald-500/20 flex items-center gap-4 shadow-inner">
                  {/* Mitra Flame Avatar with amber aura */}
                  <div className="relative flex-shrink-0 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-radial-gradient from-amber-400/30 via-emerald-400/20 to-transparent blur-md transform scale-125 animate-pulse" />
                    <div className="relative w-14 h-14 transition-transform duration-300 hover:scale-110">
                      <MitraMascot pose={mitraPose} stage="flame" level={1} />
                    </div>
                  </div>

                  {/* Companion Speech Bubble */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
                        {heroLang === 'kn' ? 'ಮಿತ್ರ · ಸಂಗಾತಿ' : 'Mitra · Companion'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold">
                        Lv 1
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-100 leading-snug font-medium transition-all duration-300">
                      {companionMessage}
                    </p>
                  </div>
                </div>

                {/* Today's Rhythm Progress Bar & Indicator */}
                <div className="flex items-center justify-between p-3.5 mb-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    {/* Mini Circular Progress Ring */}
                    <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke="url(#heroProgressGradient)"
                          strokeWidth="3"
                          strokeDasharray={94.2}
                          strokeDashoffset={94.2 - (completedCount / items.length) * 94.2}
                          strokeLinecap="round"
                          className="transition-all duration-500 ease-out"
                        />
                        <defs>
                          <linearGradient id="heroProgressGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#10B981" />
                            <stop offset="100%" stopColor="#F59E0B" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className="absolute text-[11px] font-bold text-slate-100">
                        {completionPercentage}%
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xs font-semibold text-slate-100 m-0">
                        {heroLang === 'kn' ? 'ಇಂದಿನ ಲಯ' : "Today's Rhythm"}
                      </h2>
                      <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                        {completedCount === 0
                          ? (heroLang === 'kn' ? 'ಆರಂಭಿಸಲು ಸಿದ್ಧ' : 'Ready when you are')
                          : (heroLang === 'kn'
                              ? `${items.length} ರಲ್ಲಿ ${completedCount} ಪೂರ್ಣಗೊಂಡಿದೆ`
                              : `${completedCount} of ${items.length} completed`)}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium tracking-wide">
                    {heroLang === 'kn' ? 'ಒತ್ತಡವಿಲ್ಲ · ಪೂರ್ಣ ಲಯ' : 'No guilt · Pure flow'}
                  </span>
                </div>

                {/* Realistic Calming Daily Items (Interactive toggle without harsh strikethroughs) */}
                <div className="space-y-2.5">
                  {items.map((item) => {
                    const isDone = item.completed;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className={`w-full text-left flex items-center gap-3.5 p-3 rounded-xl border transition-all duration-300 group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                          isDone
                            ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.06)]'
                            : 'bg-white/[0.02] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.04]'
                        }`}
                      >
                        {/* Custom Soft Check Circle */}
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                            isDone
                              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-[#060B14] shadow-[0_0_10px_rgba(16,185,129,0.4)] scale-105'
                              : 'border border-slate-600 group-hover:border-slate-400'
                          }`}
                        >
                          {isDone && <Check size={12} strokeWidth={3} />}
                        </div>

                        {/* Title and Tag */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs sm:text-[13px] font-medium transition-colors ${
                                isDone ? 'text-emerald-200' : 'text-slate-200 group-hover:text-white'
                              }`}
                            >
                              {heroLang === 'kn' ? item.titleKn : item.titleEn}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isDone
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                                  : 'bg-white/5 text-slate-400 border border-white/5'
                              }`}
                            >
                              {heroLang === 'kn' ? item.tagKn : item.tagEn}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {heroLang === 'kn' ? item.subtitleKn : item.subtitleEn}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Card Footer Micro-Note */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-400" />
                    <span>
                      {heroLang === 'kn'
                        ? 'ಮತ್ತೆ ಆರಂಭಿಸಲು ಸದಾ ಸ್ಥಳವಿದೆ'
                        : 'There is always room to begin again.'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {heroLang === 'kn' ? 'ಬದಲಾಯಿಸಲು ಸ್ಪರ್ಶಿಸಿ' : 'Tap item to check'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3-COLUMN PILLARS: Plan with breathing room / Patterns / Come back gently
        ========================================================================= */}
        <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">
              Rhythm & Flow · ಸಹಜ ಲಯ
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mt-2">
              Designed for real life, not ideal days.
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3">
              Most productivity apps punish missed days. Namma Dina meets you where you are.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 01 */}
            <div className="group rounded-3xl p-7 backdrop-blur-xl bg-[#0B1320]/70 border border-white/10 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 shadow-[0_15px_35px_rgba(0,0,0,0.3)] flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">01</span>
                <h3 className="text-lg font-semibold text-white mt-3 mb-2">Plan with breathing room</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Shape the day around what truly matters. Leave spacious buffers between events so life can unfold without breaking your schedule.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] text-emerald-400/90 font-medium flex items-center gap-1.5">
                <Sparkles size={12} />
                <span>Flexible time buffers · ಒತ್ತಡವಿಲ್ಲ</span>
              </div>
            </div>

            {/* Pillar 02 */}
            <div className="group rounded-3xl p-7 backdrop-blur-xl bg-[#0B1320]/70 border border-white/10 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1 shadow-[0_15px_35px_rgba(0,0,0,0.3)] flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-400 tracking-wider">02</span>
                <h3 className="text-lg font-semibold text-white mt-3 mb-2">Notice the patterns</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  See how your focus, hydration, and moods ebb and flow. Gain genuine self-awareness through gentle reflections, never algorithmic guilt.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] text-indigo-400/90 font-medium flex items-center gap-1.5">
                <Sparkles size={12} />
                <span>Private weekly insights · ಆಂತರಿಕ ಅರಿವು</span>
              </div>
            </div>

            {/* Pillar 03 */}
            <div className="group rounded-3xl p-7 backdrop-blur-xl bg-[#0B1320]/70 border border-white/10 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 shadow-[0_15px_35px_rgba(0,0,0,0.3)] flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400 tracking-wider">03</span>
                <h3 className="text-lg font-semibold text-white mt-3 mb-2">Come back gently</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Missed an appointment or skipped habits? Mitra calculates your Comeback Score and suggests one small, manageable step forward.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] text-amber-400/90 font-medium flex items-center gap-1.5">
                <Leaf size={12} />
                <span>Guilt-free reset · ಮರುಆರಂಭ</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            FAQ ACCORDION: Frosted Glass Clarity
        ========================================================================= */}
        <section id="faq" className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 py-16">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">
              Quick Answers · ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2">
              A few things you may be wondering.
            </h2>
          </div>

          <div className="space-y-3.5">
            {FAQ_ITEMS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl backdrop-blur-xl bg-[#0B1320]/70 border border-white/10 overflow-hidden transition-colors duration-200"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 text-slate-100 hover:text-emerald-300 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm sm:text-base font-semibold">
                      {heroLang === 'kn' ? faq.qKn : faq.qEn}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-emerald-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/[0.06] animate-in fade-in duration-200">
                      {heroLang === 'kn' ? faq.aKn : faq.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            CLOSER BANNER: Every Day is a New Page
        ========================================================================= */}
        <section className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 py-12 text-center">
          <div className="rounded-3xl p-8 sm:p-12 backdrop-blur-xl bg-gradient-to-b from-[#0B1320]/90 to-[#060B14]/90 border border-emerald-500/25 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(16,185,129,0.08)]">
            <div className="w-11 h-11 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Star size={18} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
              Every day is a new page.
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto mb-7">
              ನಿಮ್ಮ ದಿನ, ನಿಮ್ಮ ವೇಗದಲ್ಲಿ · Your personal day management space in English and ಕನ್ನಡ.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-[#060B14] bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#34D399] hover:to-[#6EE7B7] shadow-[0_0_28px_rgba(16,185,129,0.38)] transition-all transform hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <span>Find your rhythm</span>
              <ChevronRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </section>
      </main>

      {/* =========================================================================
          FOOTER: Bilingual Soul + Clean Alignment
      ========================================================================= */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#060B14]/90 backdrop-blur-xl py-10 px-5 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </span>
            <span className="font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
              namma dina · ನಮ್ಮ ದಿನ
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Footer Navigation">
            <a href="#how-it-works" className="hover:text-emerald-300 transition-colors">
              How it works
            </a>
            <a href="#faq" className="hover:text-emerald-300 transition-colors">
              FAQ
            </a>
            <Link to="/login" className="hover:text-emerald-300 transition-colors">
              Sign in
            </Link>
            <Link to="/register" className="hover:text-emerald-300 transition-colors">
              Create an account
            </Link>
            <a href="mailto:nammadinna.support@gmail.com" className="hover:text-emerald-300 transition-colors">
              Email support
            </a>
          </nav>

          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
            <span>© {new Date().getFullYear()} Namma Dina</span>
            <span>·</span>
            <span>ನಮ್ಮ ದಿನ · OUR DAY</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
