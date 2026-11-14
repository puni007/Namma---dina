import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, fullDuration = 600) {
  const [displayed, setDisplayed] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    let frame = 0;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersOff = () => media.matches || document.documentElement.dataset.motion === 'off';
    if (prefersOff()) {
      current.current = target;
      setDisplayed(target);
      return;
    }

    const mode = document.documentElement.dataset.motion;
    const duration = mode === 'calm' ? 280 : fullDuration;
    const from = current.current;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (target - from) * eased);
      current.current = value;
      setDisplayed(value);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    const stopIfReduced = () => {
      if (!prefersOff()) return;
      if (frame) window.cancelAnimationFrame(frame);
      current.current = target;
      setDisplayed(target);
    };
    const observer = new MutationObserver(stopIfReduced);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    media.addEventListener('change', stopIfReduced);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener('change', stopIfReduced);
    };
  }, [fullDuration, target]);

  return displayed;
}
