import { useEffect, useState } from 'react';

export type Language = 'en' | 'kn';

let currentLanguage: Language = (() => {
  try {
    const saved = localStorage.getItem('nd_language');
    if (saved === 'kn' || saved === 'en') return saved;
  } catch {
    // Ignore
  }
  return 'en';
})();

if (typeof document !== 'undefined') document.documentElement.lang = currentLanguage;

const rawTranslations = {
  en: {
    brandName: 'namma dina',
    brandSub: 'ನಮ್ಮ ದಿನ · OUR DAY',
    yourSpace: 'YOUR SPACE',
    groupToday: 'TODAY',
    groupPlan: 'PLAN',
    groupCare: 'CARE',
    groupReflect: 'REFLECT',
    groupAccount: 'YOU',
    progressQuote: 'Progress is made of small returns.',
    takeDayAsItComes: 'Take the day as it comes.',
    personalSpace: 'Personal space',
    spacePace: 'YOUR SPACE, AT YOUR PACE',
    signOut: 'Sign out',
    more: 'More',
    navMitra: 'Mitra',
    today: 'Today',
    tomorrow: 'Tomorrow',
    calendar: 'Calendar',

    navDay: 'My day',
    navTasks: 'Tasks',
    navCategories: 'Task categories',
    navHabits: 'Habits',
    navCalendar: 'Calendar',
    navReminders: 'Reminders',
    navWellness: 'Wellness',
    navCycle: 'Cycle & Health',
    navDigital: 'Digital wellbeing',
    navFood: 'Food & spending',
    navReflection: 'Reflection',
    navInsights: 'Insights',
    navNotifications: 'Notifications',
    navSettings: 'Settings',
    navAccount: 'Account & privacy',

    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',

    language: 'Language',
    langEnglish: 'English',
    langKannada: 'ಕನ್ನಡ (Kannada)',
    themeDay: 'Switch to Aurora Day',
    themeNight: 'Switch to Aurora Night',
    themeSystem: 'Switch to System Theme',
    navHome: 'Home',
    navMyDay: 'My Day',
    navProfile: 'Profile',
    phoneAuth: 'Phone number',
    enterOtp: 'Enter 6-digit code',
    sendOtp: 'Send code',
    verifyOtp: 'Verify & sign in',
    continueWithGoogle: 'Continue with Google',
    continueWithFacebook: 'Continue with Facebook',
    quickAdd: 'Add',
    quickAddTitle: 'Add something',
    quickAddHint: 'Choose one small next step.',
    quickTask: 'Task',
    quickHabit: 'Habit check-in',
    quickWater: 'Water',
    quickMood: 'Mood',
    quickReflection: 'Reflection',
    quickBreathe: 'Breathe',
    quickTaskPlaceholder: 'What would you like to do?',
    quickCreateTask: 'Add task',
    quickWater250: 'Log 250 ml',
    quickWater500: 'Log 500 ml',
    quickMoodGreat: 'Great',
    quickMoodGood: 'Good',
    quickMoodOkay: 'Okay',
    quickMoodLow: 'Low',
    quickMoodTired: 'Tired',
    quickBreathePrompt: 'Take a slow, guided breathing pause.',
    startBreathing: 'Start breathing pause',
  },
  kn: {
    brandName: 'ನಮ್ಮ ದಿನ',
    brandSub: 'OUR DAY · ನಮ್ಮ ದಿನ',
    yourSpace: 'ನಿಮ್ಮ ಜಾಗ',
    groupToday: 'ಇಂದು',
    groupPlan: 'ಯೋಜನೆ',
    groupCare: 'ಆರೈಕೆ',
    groupReflect: 'ಅವಲೋಕನ',
    groupAccount: 'ನೀವು',
    progressQuote: 'ಪ್ರಗತಿ ಸಣ್ಣ ಹೆಜ್ಜೆಗಳಲ್ಲಿದೆ.',
    takeDayAsItComes: 'ದಿನವನ್ನು ಪ್ರೀತಿಯಿಂದ ಸ್ವೀಕರಿಸಿ.',
    personalSpace: 'ವೈಯಕ್ತಿಕ ಜಾಗ',
    spacePace: 'ನಿಮ್ಮ ಜಾಗ, ನಿಮ್ಮ ವೇಗ',
    signOut: 'ನಿರ್ಗಮಿಸಿ',
    more: 'ಇನ್ನಷ್ಟು',
    navMitra: 'ಮಿತ್ರ',
    today: 'ಇಂದು',
    tomorrow: 'ನಾಳೆ',
    calendar: 'ಕ್ಯಾಲೆಂಡರ್',

    navDay: 'ನನ್ನ ದಿನ',
    navTasks: 'ಕೆಲಸಗಳು',
    navCategories: 'ವರ್ಗಗಳು',
    navHabits: 'ಅಭ್ಯಾಸಗಳು',
    navCalendar: 'ಕ್ಯಾಲೆಂಡರ್',
    navReminders: 'ಜ್ಞಾಪನೆಗಳು',
    navWellness: 'ಆರೋಗ್ಯ',
    navCycle: 'ಚಕ್ರ ಮತ್ತು ಆರೋಗ್ಯ',
    navDigital: 'ಡಿಜಿಟಲ್ ಸಮತೋಲನ',
    navFood: 'ಆಹಾರ ಮತ್ತು ಖರ್ಚು',
    navReflection: 'ದಿನದ ಅವಲೋಕನ',
    navInsights: 'ಒಳನೋಟಗಳು',
    navNotifications: 'ಸೂಚನೆಗಳು',
    navSettings: 'ಸೆಟ್ಟಿಂಗ್ಸ್',
    navAccount: 'ಖಾತೆ ಮತ್ತು ಗೌಪ್ಯತೆ',

    goodMorning: 'ಶುಭೋದಯ',
    goodAfternoon: 'ಶುಭ ಮಧ್ಯಾಹ್ನ',
    goodEvening: 'ಶುಭ ಸಂಜೆ',

    language: 'ಭಾಷೆ',
    langEnglish: 'English',
    langKannada: 'ಕನ್ನಡ (Kannada)',
    themeDay: 'ಹಗಲು ಥೀಮ್‌ಗೆ ಬದಲಿಸಿ',
    themeNight: 'ರಾತ್ರಿ ಥೀಮ್‌ಗೆ ಬದಲಿಸಿ',
    themeSystem: 'ಸಿಸ್ಟಮ್ ಥೀಮ್‌ಗೆ ಬದಲಿಸಿ',
    navHome: 'ಮುಖಪುಟ',
    navMyDay: 'ನನ್ನ ದಿನ',
    navProfile: 'ಪ್ರೊಫೈಲ್',
    phoneAuth: 'ದೂರವಾಣಿ ಸಂಖ್ಯೆ',
    enterOtp: '೬-ಅಂಕಿಯ ಕೋಡ್ ನಮೂದಿಸಿ',
    sendOtp: 'ಕೋಡ್ ಕಳುಹಿಸಿ',
    verifyOtp: 'ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಪ್ರವೇಶಿಸಿ',
    continueWithGoogle: 'Google ಮೂಲಕ ಮುಂದುವರಿಯಿರಿ',
    continueWithFacebook: 'Facebook ಮೂಲಕ ಮುಂದುವರಿಯಿರಿ',
    quickAdd: 'ಸೇರಿಸಿ',
    quickAddTitle: 'ಏನನ್ನಾದರೂ ಸೇರಿಸಿ',
    quickAddHint: 'ಒಂದು ಚಿಕ್ಕ ಹೆಜ್ಜೆಯನ್ನು ಆರಿಸಿ.',
    quickTask: 'ಕೆಲಸ',
    quickHabit: 'ಅಭ್ಯಾಸ ದಾಖಲಿಸಿ',
    quickWater: 'ನೀರು',
    quickMood: 'ಮನಸ್ಥಿತಿ',
    quickReflection: 'ಅವಲೋಕನ',
    quickBreathe: 'ಉಸಿರಾಟ',
    quickTaskPlaceholder: 'ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?',
    quickCreateTask: 'ಕೆಲಸ ಸೇರಿಸಿ',
    quickWater250: '250 ಮಿ.ಲೀ. ದಾಖಲಿಸಿ',
    quickWater500: '500 ಮಿ.ಲೀ. ದಾಖಲಿಸಿ',
    quickMoodGreat: 'ಅತ್ಯುತ್ತಮ',
    quickMoodGood: 'ಉತ್ತಮ',
    quickMoodOkay: 'ಪರವಾಗಿಲ್ಲ',
    quickMoodLow: 'ಕಡಿಮೆ',
    quickMoodTired: 'ದಣಿದಿದೆ',
    quickBreathePrompt: 'ಶಾಂತವಾಗಿ ಉಸಿರಾಟದ ವಿರಾಮ ತೆಗೆದುಕೊಳ್ಳಿ.',
    startBreathing: 'ಉಸಿರಾಟದ ವಿರಾಮ ಆರಂಭಿಸಿ',
  },
};

export type TranslationKey = keyof typeof rawTranslations.en;
export type TranslationDict = Record<TranslationKey, string>;

export const translations: Record<Language, TranslationDict> = rawTranslations;

const listeners = new Set<(lang: Language) => void>();

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language) {
  currentLanguage = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  try {
    localStorage.setItem('nd_language', lang);
  } catch {
    // Ignore storage errors
  }
  listeners.forEach((listener) => listener(lang));
}

export function useLanguage() {
  const [lang, setLangState] = useState<Language>(getLanguage);

  useEffect(() => {
    const handler = (l: Language) => setLangState(l);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const t = translations[lang];
  return { lang, setLanguage, t };
}
