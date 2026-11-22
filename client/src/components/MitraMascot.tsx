import React from 'react';

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
  const imgSrc =
    pose === 'sleepy'
      ? '/mitra-sleepy.png'
      : pose === 'happy' || pose === 'celebrating'
      ? '/mitra-happy.png'
      : '/mitra.png';

  return (
    <div
      className={`mitra-mascot pose-${pose} stage-${stage} ${className}`}
      data-level={level}
      aria-label="Mitra flame companion"
      role="img"
    >
      {/* Soft atmospheric halo glow */}
      <div className={`mitra-halo-glow stage-${stage}`} />

      {/* Floating 3D Character Container */}
      <div className="mitra-character-wrap">
        {/* Stage 4 Aurora Golden Crown */}
        {stage === 'aurora' && (
          <div className="mitra-crown-flourish">
            <svg viewBox="0 0 32 16" width="22" height="11" fill="none">
              <path
                d="M16 2 L20 9 L24 4 L23 13 L9 13 L8 4 L12 9 Z"
                fill="url(#mitraCrownGold)"
                stroke="#fef08a"
                strokeWidth="0.8"
              />
              <circle cx="16" cy="3" r="1.5" fill="#ffffff" />
              <circle cx="8" cy="5" r="1" fill="#67e8d0" />
              <circle cx="24" cy="5" r="1" fill="#67e8d0" />
              <defs>
                <linearGradient id="mitraCrownGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {/* 3D Smiling Flame Mascot Image */}
        <img
          src={imgSrc}
          srcSet={`${imgSrc} 1x, /mitra-hd.png 2x`}
          alt="Mitra"
          className="mitra-3d-flame"
          draggable={false}
          loading="eager"
        />

        {/* Pose-specific Sparkles for Happy & Celebrating */}
        {(pose === 'happy' || pose === 'celebrating') && (
          <div className="mitra-pose-sparkles">
            <span className="sparkle s1">✨</span>
            <span className="sparkle s2">✦</span>
          </div>
        )}

        {/* Thinking Orbit Dots */}
        {pose === 'thinking' && (
          <div className="mitra-thinking-dots">
            <span className="dot d1" />
            <span className="dot d2" />
            <span className="dot d3" />
          </div>
        )}
      </div>
    </div>
  );
}
