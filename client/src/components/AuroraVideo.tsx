import React, { useState } from 'react';
import { AuroraSky } from './AuroraSky';

export function AuroraVideo() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className="borealis-scene" aria-hidden="true">
      {!videoFailed ? (
        <video
          id="aurora"
          className="borealis-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
        >
          <source
            src="https://videos.pexels.com/video-files/5700940/5700940-uhd_3840_2160_25fps.mp4"
            type="video/mp4"
          />
        </video>
      ) : (
        /* Procedural Northern Lights canvas fallback when video is unavailable */
        <AuroraSky />
      )}
    </div>
  );
}
