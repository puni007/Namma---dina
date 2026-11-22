import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type SearchDestination = {
  to: string;
  label: string;
  keywords?: string;
};

export function SiteSearch({ items, onClose }: { items: SearchDestination[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return items.slice(0, 7);
    return items.filter((item) => `${item.label} ${item.keywords ?? ''}`.toLocaleLowerCase().includes(normalized)).slice(0, 8);
  }, [items, query]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const open = (to: string) => {
    navigate(to);
    onClose();
  };

  return (
    <div className="site-search-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="site-search-dialog" role="dialog" aria-modal="true" aria-labelledby="site-search-title">
        <div className="site-search-heading">
          <div><p className="eyebrow">FIND A PAGE</p><h2 id="site-search-title">Search Namma Dina</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close search"><X size={19} /></button>
        </div>
        <label className="site-search-field">
          <Search size={18} aria-hidden="true" />
          <input ref={inputRef} className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages and tools" aria-label="Search pages and tools" />
        </label>
        <div className="site-search-results" role="listbox" aria-label="Pages">
          {results.map((item) => <button key={item.to} type="button" role="option" aria-selected="false" onClick={() => open(item.to)}>
            <span>{item.label}</span><small>{item.to.replace('/app/', '').replaceAll('/', ' · ')}</small>
          </button>)}
          {results.length === 0 && <p className="site-search-empty">No pages match “{query.trim()}”.</p>}
        </div>
        <p className="site-search-hint">Searches page names and topics. Your notes stay private.</p>
      </section>
    </div>
  );
}
