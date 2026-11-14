export type MitraPose = 'idle' | 'happy' | 'thinking' | 'listening' | 'sleepy' | 'celebrating' | 'concerned';

export function MitraMascot({ pose = 'idle', className = '' }: { pose?: MitraPose; className?: string }) {
  return <svg className={`mitra-mascot pose-${pose} ${className}`} viewBox="0 0 96 96" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="mitraGlass" x1=".15" y1="0" x2=".9" y2="1"><stop stopColor="#a9fff0"/><stop offset=".55" stopColor="#67e8d0"/><stop offset="1" stopColor="#63cfe8"/></linearGradient>
      <radialGradient id="mitraGlow"><stop stopColor="#73f5df" stopOpacity=".46"/><stop offset="1" stopColor="#55d9cf" stopOpacity="0"/></radialGradient>
      <filter id="mitraBlur"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>
    <ellipse className="mitra-halo" cx="48" cy="48" rx="37" ry="36" fill="url(#mitraGlow)" filter="url(#mitraBlur)"/>
    <g className="mitra-character">
      <path className="mitra-ribbon" d="M61 69c10 4 14 11 8 16-5 4-13 0-12-5 1-3 5-4 7-1" fill="none" stroke="#76e8d9" strokeWidth="3" strokeLinecap="round"/>
      <path d="M48 13c-15 0-25 11-25 26v19c0 13 10 23 25 23s25-10 25-23V39C73 24 63 13 48 13Z" fill="url(#mitraGlass)" stroke="#c2fff7" strokeOpacity=".8" strokeWidth="2"/>
      <path d="M37 14c1-7 21-7 22 0M43 8h10" fill="none" stroke="#b6f8ee" strokeWidth="3" strokeLinecap="round"/>
      <path d="M28 53c7 6 33 6 40 0v7c0 12-8 19-20 19S28 72 28 60v-7Z" fill="#d7fff5" fillOpacity=".19"/>
      <g className="mitra-eyes"><ellipse cx="39" cy="43" rx="3.2" ry="4.3" fill="#173b45"/><ellipse cx="57" cy="43" rx="3.2" ry="4.3" fill="#173b45"/></g>
      <path className="mitra-smile" d="M42 53c3 4 9 4 12 0" fill="none" stroke="#236b70" strokeWidth="2.2" strokeLinecap="round"/>
      <ellipse cx="32" cy="50" rx="4" ry="2.2" fill="#f5a6a3" fillOpacity=".6"/><ellipse cx="64" cy="50" rx="4" ry="2.2" fill="#f5a6a3" fillOpacity=".6"/>
      {pose === 'thinking' && <g className="mitra-orbit" fill="#b7fff4"><circle cx="78" cy="28" r="2.5"/><circle cx="82" cy="42" r="1.8"/><circle cx="76" cy="55" r="1.4"/></g>}
      {(pose === 'happy' || pose === 'celebrating') && <g className="mitra-sparkles" fill="#c8fff7"><path d="M18 29v8m-4-4h8M76 59v7m-3.5-3.5h7" stroke="#c8fff7" strokeWidth="1.5" strokeLinecap="round"/><circle cx="19" cy="62" r="1.5"/><circle cx="78" cy="23" r="1.4"/></g>}
      {pose === 'sleepy' && <g className="mitra-sleepy-eyes" stroke="#173b45" strokeWidth="2.3" strokeLinecap="round"><path d="M35 44c2 2 5 2 7 0M53 44c2 2 5 2 7 0"/></g>}
      {pose === 'concerned' && <path d="m37 41 4 2m14-2-4 2m-3 10v2" stroke="#236b70" strokeWidth="1.8" strokeLinecap="round"/>}
      {pose === 'celebrating' && <g className="mitra-confetti" fill="#a8fff0"><circle cx="17" cy="42" r="2"/><circle cx="79" cy="43" r="2"/><circle cx="25" cy="23" r="1.6"/><circle cx="69" cy="21" r="1.5"/></g>}
    </g>
  </svg>;
}
