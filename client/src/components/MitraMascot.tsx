export type MitraPose = 'idle' | 'happy' | 'thinking' | 'listening' | 'sleepy' | 'celebrating' | 'concerned';
export type MitraStage = 'ember' | 'flame' | 'radiance' | 'aurora';

export function MitraMascot({
  pose = 'idle',
  stage = 'flame',
  level = 1,
  className = '',
}: {
  pose?: MitraPose;
  stage?: MitraStage;
  level?: number;
  className?: string;
}) {
  return (
    <svg
      className={`mitra-mascot pose-${pose} stage-${stage} ${className}`}
      data-level={level}
      viewBox="0 0 96 96"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Core Flame Gradients */}
        <linearGradient id="mitraFlameGrad" x1="0.2" y1="0.05" x2="0.8" y2="0.95">
          <stop offset="0%" stopColor="#a9fff0" />
          <stop offset="35%" stopColor="#67e8d0" />
          <stop offset="70%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>

        <linearGradient id="mitraInnerFlame" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#c2fff7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#67e8d0" stopOpacity="0.1" />
        </linearGradient>

        <radialGradient id="mitraFlameGlow" cx="50%" cy="52%" r="48%">
          <stop offset="0%" stopColor="#67e8d0" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="mitraAuroraAura" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#c084fc" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>

        <filter id="mitraSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Atmospheric Aura */}
      <circle
        className="mitra-halo"
        cx="48"
        cy="50"
        r="40"
        fill={stage === 'aurora' ? 'url(#mitraAuroraAura)' : 'url(#mitraFlameGlow)'}
      />

      <g className="mitra-character">
        {/* Stage-Specific Flame Flourishes (Radiance & Aurora) */}
        {(stage === 'radiance' || stage === 'aurora') && (
          <g className="mitra-celestial-ribbons" stroke="rgba(194, 255, 247, 0.6)" strokeWidth="2" fill="none">
            <path d="M22 62 C16 46 22 28 32 18 C30 28 34 38 42 42" strokeLinecap="round" />
            <path d="M74 62 C80 46 74 28 64 18 C66 28 62 38 54 42" strokeLinecap="round" />
          </g>
        )}

        {/* Aurora Crown for Stage 4 */}
        {stage === 'aurora' && (
          <g className="mitra-crown" fill="#fef08a" stroke="#fef08a" strokeWidth="1">
            <polygon points="48,4 51,11 48,9 45,11" />
            <polygon points="36,9 38,15 35,14 33,15" />
            <polygon points="60,9 63,15 61,14 58,15" />
            <circle cx="48" cy="6" r="1.5" fill="#ffffff" />
          </g>
        )}

        {/* Main Smiling Flame Body */}
        <path
          className="mitra-flame-body"
          d="M48 10
             C54 22 68 28 72 44
             C76 58 72 74 58 82
             C48 87 36 85 28 78
             C20 70 18 56 24 44
             C28 36 34 30 38 20
             C40 26 44 28 48 10 Z"
          fill="url(#mitraFlameGrad)"
          stroke="#d1fae5"
          strokeWidth="1.8"
          strokeLinejoin="round"
          filter="url(#mitraSoftGlow)"
        />

        {/* Inner Flame Core */}
        <path
          className="mitra-flame-inner"
          d="M48 24
             C52 32 60 38 62 48
             C64 58 58 70 48 74
             C38 70 32 58 34 48
             C36 40 42 34 44 28
             C46 32 47 30 48 24 Z"
          fill="url(#mitraInnerFlame)"
        />

        {/* Dancing Flame Crest Ribbon */}
        <path
          className="mitra-ribbon"
          d="M58 70 C66 74 72 68 68 60 C64 54 56 58 58 64"
          fill="none"
          stroke="#a7f3d0"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Mitra's Expressive Eyes */}
        <g className="mitra-eyes">
          {pose === 'sleepy' ? (
            <g stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" fill="none">
              <path d="M35 48 C37 51 41 51 43 48" />
              <path d="M53 48 C55 51 59 51 61 48" />
            </g>
          ) : (
            <>
              <ellipse cx="39" cy="47" rx="3.2" ry="4.5" fill="#0f172a" />
              <ellipse cx="57" cy="47" rx="3.2" ry="4.5" fill="#0f172a" />
              {/* Eye sparkle reflections */}
              <circle cx="38" cy="45.5" r="1.3" fill="#ffffff" />
              <circle cx="56" cy="45.5" r="1.3" fill="#ffffff" />
            </>
          )}
        </g>

        {/* Mitra's Sweet Smile */}
        <path
          className="mitra-smile"
          d={
            pose === 'celebrating' || pose === 'happy'
              ? 'M41 55 C44 62 52 62 55 55'
              : pose === 'concerned'
                ? 'M42 58 C45 55 51 55 54 58'
                : 'M42 56 C45 60 51 60 54 56'
          }
          fill={pose === 'celebrating' ? '#f43f5e' : 'none'}
          stroke="#0f172a"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Rosy Cheeks */}
        <ellipse cx="32" cy="53" rx="3.8" ry="2.2" fill="#fda4af" fillOpacity="0.75" />
        <ellipse cx="64" cy="53" rx="3.8" ry="2.2" fill="#fda4af" fillOpacity="0.75" />

        {/* Dynamic Pose Details */}
        {pose === 'thinking' && (
          <g className="mitra-orbit" fill="#e0e7ff">
            <circle cx="78" cy="30" r="2.5" />
            <circle cx="84" cy="44" r="1.8" />
            <circle cx="76" cy="58" r="1.5" />
          </g>
        )}

        {(pose === 'happy' || pose === 'celebrating') && (
          <g className="mitra-sparkles" fill="#fef08a">
            <path d="M16 32 v6 M13 35 h6" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M80 62 v6 M77 65 h6" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="18" cy="65" r="1.5" />
            <circle cx="80" cy="26" r="1.5" />
          </g>
        )}

        {pose === 'celebrating' && (
          <g className="mitra-confetti" fill="#67e8d0">
            <circle cx="15" cy="45" r="2" fill="#38bdf8" />
            <circle cx="81" cy="45" r="2" fill="#c084fc" />
            <circle cx="24" cy="24" r="1.8" fill="#fef08a" />
            <circle cx="72" cy="20" r="1.8" fill="#67e8d0" />
          </g>
        )}

        {/* Floating Sparks for Ember/Flame/Aurora */}
        <g className="mitra-rising-sparks" fill="#a7f3d0" opacity="0.8">
          <circle cx="48" cy="18" r="1" />
          <circle cx="44" cy="14" r="0.8" />
          <circle cx="52" cy="12" r="0.8" />
        </g>
      </g>
    </svg>
  );
}
