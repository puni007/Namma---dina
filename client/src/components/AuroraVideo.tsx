import { useState } from 'react';
import { AuroraSky } from './AuroraSky';

export function AuroraVideo() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className="aurora-video-wrapper" aria-hidden="true">
      {!videoFailed && (
        <video
          className="aurora-video"
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.22,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        >
          <source src="/aurora-loop.mp4" type="video/mp4" />
        </video>
      )}
      {/* AuroraSky canvas is always present for lush starry depth and organic curtains */}
      <AuroraSky />
    </div>
  );
}
