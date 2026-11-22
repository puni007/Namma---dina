import { useEffect, useState } from 'react';
import { ArrowUp, Mail } from 'lucide-react';
import { readUtmFromUrl, saveUtmForSession } from '../lib/utm';

export function SiteUtilities({ isApp = false }: { isApp?: boolean }) {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [trackingConsent, setTrackingConsent] = useState(() => {
    try {
      const saved = localStorage.getItem('nd_tracking_consent');
      return saved === 'allow' || saved === 'essential' ? saved : '';
    } catch { return ''; }
  });
  const [campaign] = useState(() => readUtmFromUrl(window.location.search));

  useEffect(() => {
    const updateScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0);
      setShowTop(window.scrollY > 420);
    };
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, []);

  useEffect(() => {
    if (trackingConsent === 'allow' && campaign) saveUtmForSession(campaign);
  }, [campaign, trackingConsent]);

  const chooseTracking = (choice: 'allow' | 'essential') => {
    setTrackingConsent(choice);
    try { localStorage.setItem('nd_tracking_consent', choice); } catch { /* Keep the choice for this visit. */ }
    if (choice === 'allow' && campaign) saveUtmForSession(campaign);
  };
  const showCookieNotice = trackingConsent === '';

  return <>
    <div className="scroll-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
    <a className={`floating-contact ${isApp ? 'floating-contact-app' : ''}`} href="mailto:nammadinna.support@gmail.com" aria-label="Email Namma Dina support">
      <Mail size={18} aria-hidden="true" /><span>Contact</span>
    </a>
    {showTop && !showCookieNotice && <button className={`back-to-top ${isApp ? 'back-to-top-app' : ''}`} type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" title="Back to top"><ArrowUp size={19} /></button>}
    {showCookieNotice && <aside className={`storage-notice ${isApp ? 'storage-notice-app' : ''}`} aria-label="Cookie and storage choices">
      <p>Essential cookies and browser storage keep sign-in and preferences working. If you allow it, UTM campaign details from this visit stay in this browser session and are attached only when you create an account. No advertising cookies or third-party analytics are used.</p>
      <div className="storage-notice-actions">
        <button type="button" className="button button-quiet" onClick={() => chooseTracking('essential')}>Essential only</button>
        <button type="button" className="button button-primary" onClick={() => chooseTracking('allow')}>Allow campaign attribution</button>
      </div>
    </aside>}
  </>;
}
