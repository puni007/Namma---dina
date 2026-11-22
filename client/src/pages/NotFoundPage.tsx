import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

export function NotFoundPage({ homeTo = '/', inApp = false }: { homeTo?: string; inApp?: boolean }) {
  return <div className="not-found-page" id={inApp ? undefined : 'main-content'} tabIndex={-1}>
    <div className="not-found-card glass-card">
      <span className="not-found-icon"><Compass size={24} /></span>
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <h1>This page wandered off.</h1>
      <p className="muted">The address may be out of date, or the page may have moved.</p>
      <Link to={homeTo} className="button button-primary"><ArrowLeft size={16} /> Take me back</Link>
    </div>
  </div>;
}
