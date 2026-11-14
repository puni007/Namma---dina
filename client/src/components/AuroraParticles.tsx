import { useEffect, useRef, useState } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { MotionMode } from '../lib/motion';

type AuroraParticlesProps = {
  active?: boolean;
  breathing?: boolean;
  inhaleSeconds?: number;
  holdSeconds?: number;
  exhaleSeconds?: number;
  intensity?: 'ambient' | 'focus';
  className?: string;
};

type Mote = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  phase: number;
  color: string;
  depth: number;
};

const colors = ['126,242,191', '54,205,182', '128,217,213'];

function readMotionMode(): MotionMode {
  const value = document.documentElement.dataset.motion;
  return value === 'off' || value === 'calm' ? value : 'full';
}

export function AuroraParticles({
  active = true,
  breathing = false,
  inhaleSeconds = 4,
  holdSeconds = 4,
  exhaleSeconds = 6,
  intensity = 'ambient',
  className = '',
}: AuroraParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [motionMode, setMotionMode] = useState<MotionMode>(readMotionMode);

  useEffect(() => {
    const observer = new MutationObserver(() => setMotionMode(readMotionMode()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true, desynchronized: true });
    if (!canvas || !context || motionMode === 'off' || !active) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let appIsActive = true;
    let disposed = false;
    const pointer = { x: 0, y: 0 };
    const startedAt = performance.now();
    let motes: Mote[] = [];

    const drawSize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const fullCount = Math.min(80, Math.max(40, Math.round(width * height / 24_000)));
      const count = motionMode === 'calm' ? Math.max(16, Math.round(fullCount * 0.48)) : fullCount;
      motes = Array.from({ length: count }, () => {
        const depth = 0.35 + Math.random() * 0.65;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 0.8 + Math.random() * 1.9,
          speed: 2.2 + Math.random() * 5.2,
          drift: (Math.random() - 0.5) * 4,
          phase: Math.random() * Math.PI * 2,
          color: colors[Math.floor(Math.random() * colors.length)]!,
          depth,
        };
      });
    };

    const canDraw = () => active && !document.hidden && appIsActive && !disposed;
    const drawFrame = (now: number) => {
      if (!canDraw()) {
        frame = 0;
        return;
      }
      context.clearRect(0, 0, width, height);
      const elapsed = (now - startedAt) / 1000;
      const parallaxX = pointer.x * 9;
      const parallaxY = pointer.y * 7;
      for (const mote of motes) {
        mote.y -= mote.speed * mote.depth / 60;
        mote.x += mote.drift / 60;
        if (mote.y < -8) { mote.y = height + 8; mote.x = Math.random() * width; }
        if (mote.x < -8) mote.x = width + 8;
        if (mote.x > width + 8) mote.x = -8;
        const twinkle = 0.42 + Math.sin(elapsed * 0.65 + mote.phase) * 0.2;
        const x = mote.x + parallaxX * mote.depth;
        const y = mote.y + parallaxY * mote.depth;
        context.beginPath();
        context.fillStyle = `rgba(${mote.color},${twinkle})`;
        context.shadowColor = `rgba(${mote.color},${intensity === 'focus' ? 0.72 : 0.48})`;
        context.shadowBlur = mote.radius * (intensity === 'focus' ? 5 : 3.2);
        context.arc(x, y, mote.radius * mote.depth, 0, Math.PI * 2);
        context.fill();
      }
      context.shadowBlur = 0;

      if (breathing) {
        const cycle = Math.max(1, inhaleSeconds + holdSeconds + exhaleSeconds);
        const phase = elapsed % cycle;
        const inhale = Math.max(1, inhaleSeconds);
        const hold = Math.max(0, holdSeconds);
        const exhale = Math.max(1, exhaleSeconds);
        const breath = phase < inhale
          ? phase / inhale
          : phase < inhale + hold
            ? 1
            : Math.max(0, 1 - (phase - inhale - hold) / exhale);
        const radius = Math.min(width, height) * (0.07 + breath * 0.085);
        const centerX = width / 2;
        const centerY = height * 0.53;
        const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        glow.addColorStop(0, `rgba(126,242,191,${intensity === 'focus' ? 0.16 : 0.075})`);
        glow.addColorStop(0.58, `rgba(54,205,182,${intensity === 'focus' ? 0.075 : 0.035})`);
        glow.addColorStop(1, 'rgba(54,205,182,0)');
        context.fillStyle = glow;
        context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
      }
      frame = window.requestAnimationFrame(drawFrame);
    };

    const resume = () => {
      if (canDraw() && frame === 0) frame = window.requestAnimationFrame(drawFrame);
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      } else resume();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (width && height) {
        pointer.x = (event.clientX / width - 0.5) * 2;
        pointer.y = (event.clientY / height - 0.5) * 2;
      }
    };

    drawSize();
    const resizeObserver = new ResizeObserver(drawSize);
    resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (window.matchMedia('(pointer: fine)').matches) window.addEventListener('pointermove', onPointerMove, { passive: true });
    let appListener: { remove: () => Promise<void> } | undefined;
    let cancelled = false;
    if (Capacitor.isNativePlatform()) {
      void NativeApp.addListener('appStateChange', ({ isActive: foreground }) => {
        appIsActive = foreground;
        if (!foreground && frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        } else resume();
      }).then((handle) => {
        if (cancelled) void handle.remove();
        else appListener = handle;
      }).catch(() => {});
    }
    resume();

    return () => {
      disposed = true;
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pointermove', onPointerMove);
      void appListener?.remove();
    };
  }, [active, breathing, exhaleSeconds, holdSeconds, inhaleSeconds, intensity, motionMode]);

  return <canvas ref={canvasRef} className={`aurora-particles ${className}`} aria-hidden="true" />;
}
