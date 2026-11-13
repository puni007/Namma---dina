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

const rawTranslations = {
  en: {
    brandName: 'namma dina',
    brandSub: 'ನಮ್ಮ ದಿನ · OUR DAY',
    yourSpace: 'YOUR SPACE',
    progressQuote: 'Progress is made of small returns.',
    takeDayAsItComes: 'Take the day as it comes.',
    personalSpace: 'Personal space',
    spacePace: 'YOUR SPACE, AT YOUR PACE',
    signOut: 'Sign out',
    more: 'More',
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
  },
  kn: {
    brandName: 'ನಮ್ಮ ದಿನ',
    brandSub: 'OUR DAY · ನಮ್ಮ ದಿನ',
    yourSpace: 'ನಿಮ್ಮ ಜಾಗ',
    progressQuote: 'ಪ್ರಗತಿ ಸಣ್ಣ ಹೆಜ್ಜೆಗಳಲ್ಲಿದೆ.',
    takeDayAsItComes: 'ದಿನವನ್ನು ಪ್ರೀತಿಯಿಂದ ಸ್ವೀಕರಿಸಿ.',
    personalSpace: 'ವೈಯಕ್ತಿಕ ಜಾಗ',
    spacePace: 'ನಿಮ್ಮ ಜಾಗ, ನಿಮ್ಮ ವೇಗ',
    signOut: 'ನಿರ್ಗಮಿಸಿ',
    more: 'ಇನ್ನಷ್ಟು',
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
