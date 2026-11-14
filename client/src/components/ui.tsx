import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { Plus, WifiOff } from 'lucide-react';

export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) { return <section className={`glass-card ${className}`}>{children}</section>; }
export function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) { return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{subtitle && <p className="muted heading-subtitle">{subtitle}</p>}</div>{action}</div>; }
export function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'outline' | 'danger' }) { return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>; }
export function Field({ label, children, hint }: PropsWithChildren<{ label: string; hint?: string }>) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input className="input" {...props} />; }
export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className="input" {...props} />; }
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className="input textarea" {...props} />; }
export function Loading({ label = 'Loading your day' }: { label?: string }) { return <div className="loading" role="status" aria-label={label}><span className="loading-skeleton" aria-hidden="true"><i/><i/><i/></span><span>{label}</span></div>; }
export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) { return <div className="empty-state"><span className="empty-icon"><svg className="empty-illustration" viewBox="0 0 64 64" aria-hidden="true"><circle cx="45" cy="16" r="3"/><path d="M5 43c9-8 15-7 23 0s14 7 22 0 10-6 12-4v15H5Z"/><path d="M5 49c8-5 15-4 23 1s16 5 24 0 9-3 10-2"/></svg><span className="empty-icon-symbol">{icon ?? <Plus size={18} />}</span></span><h3>{title}</h3><p>{body}</p>{action}</div>; }
export function ProgressBar({ value, color = 'mint' }: { value: number; color?: string }) { return <div className="progress-track"><div className={`progress-fill ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>; }
export function Badge({ children, tone = 'mint' }: PropsWithChildren<{ tone?: 'mint' | 'violet' | 'blue' | 'amber' }>) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Modal({ title, onClose, children }: PropsWithChildren<{ title: string; onClose: () => void }>) { return <div className="modal-backdrop" onClick={onClose}><div className="modal glass-card" onClick={(event) => event.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div>{children}</div></div>; }

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal glass-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onCancel} aria-label="Close dialog">×</button>
        </div>
        <p style={{ margin: '0 0 20px', color: '#c9d4ea', fontSize: '13px', lineHeight: '1.6' }}>
          {message}
        </p>
        <div className="modal-actions">
          <Button type="button" variant="quiet" onClick={onCancel}>{cancelLabel}</Button>
          <Button type="button" variant={tone} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export function RatingSelect({
  value,
  onChange,
  labels = ['1', '2', '3', '4', '5'],
}: {
  value?: number | null;
  onChange: (val: number) => void;
  labels?: string[];
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
      {[1, 2, 3, 4, 5].map((num) => {
        const isSelected = value === num;
        return (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`button ${isSelected ? 'button-primary' : 'button-outline'}`}
            style={{
              padding: '8px 4px',
              minHeight: '44px',
              flexDirection: 'column',
              gap: '2px',
              borderColor: isSelected ? undefined : 'rgba(181, 205, 255, 0.15)',
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 700 }}>{num}</span>
            <small style={{ fontSize: '9px', opacity: 0.8, textTransform: 'capitalize' }}>
              {labels[num - 1] ?? num}
            </small>
          </button>
        );
      })}
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'rgba(10, 20, 26, 0.94)',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
        borderRadius: '999px',
        color: '#fef3c7',
        fontSize: '12px',
        fontWeight: 500,
        backdropFilter: 'blur(12px)',
      }}
    >
      <WifiOff size={15} color="#f59e0b" />
      <span>Offline mode · Changes will sync when reconnected</span>
    </div>
  );
}
