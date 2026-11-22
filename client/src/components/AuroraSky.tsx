import { useEffect, useRef } from 'react';
import type { MotionMode } from '../lib/motion';

type Star = {
  x: number;
  y: number;
  radius: number;
  phase: number;
  warmth: number;
};

type Curtain = {
  base: number;
  height: number;
  phase: number;
  frequency: number;
  color: string;
  glow: string;
  strength: number;
};

const curtains: Curtain[] = [
  { base: 0.68, height: 0.56, phase: 0.2, frequency: 1.8, color: '72,238,174', glow: '191,255,222', strength: 0.82 },
  { base: 0.59, height: 0.48, phase: 2.1, frequency: 2.4, color: '71,212,196', glow: '170,255,242', strength: 0.62 },
  { base: 0.51, height: 0.41, phase: 4.3, frequency: 1.35, color: '151,127,226', glow: '231,206,255', strength: 0.34 },
];

function readMotionMode(): MotionMode {
  const value = document.documentElement.dataset.motion;
  return value === 'off' || value === 'calm' ? value : 'full';
}

function isReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || readMotionMode() !== 'full';
}

function makeStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random() * 0.76,
    radius: 0.45 + Math.random() * 1.05,
    phase: Math.random() * Math.PI * 2,
    warmth: Math.random(),
  }));
}

function edgeY(x: number, width: number, height: number, curtain: Curtain, time: number) {
  const position = x / Math.max(1, width);
  const drift = time * 0.12 + curtain.phase;
  const broadFold = Math.sin(position * Math.PI * curtain.frequency + drift) * 0.027;
  const fineFold = Math.sin(position * Math.PI * (curtain.frequency * 2.7) - drift * 0.72) * 0.011;
  const wandering = Math.sin(position * Math.PI * 0.72 + drift * 0.48) * 0.012;
  return height * (curtain.base + broadFold + fineFold + wandering);
}

function drawCurtain(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  curtain: Curtain,
  time: number,
  lowPower: boolean,
) {
  const segments = lowPower ? 28 : 52;
  const topPoints: Array<{ x: number; y: number }> = [];
  const bottomPoints: Array<{ x: number; y: number }> = [];
  const stride = width / segments;

  for (let index = 0; index <= segments; index += 1) {
    const x = index * stride;
    const bottom = edgeY(x, width, height, curtain, time);
    const reach = curtain.height * height * (0.78 + 0.13 * Math.sin((x / width) * Math.PI * 2 + curtain.phase));
    const top = Math.max(-height * 0.16, bottom - reach);
    bottomPoints.push({ x, y: bottom });
    topPoints.push({ x, y: top });
  }

  context.save();
  context.beginPath();
  context.moveTo(bottomPoints[0]!.x, bottomPoints[0]!.y);
  for (let index = 1; index < bottomPoints.length; index += 1) {
    const point = bottomPoints[index]!;
    context.lineTo(point.x, point.y);
  }
  for (let index = topPoints.length - 1; index >= 0; index -= 1) {
    const point = topPoints[index]!;
    context.lineTo(point.x, point.y);
  }
  context.closePath();
  context.clip();

  const veil = context.createLinearGradient(0, height * (curtain.base - curtain.height * 0.94), 0, height * curtain.base);
  veil.addColorStop(0, `rgba(${curtain.glow},0)`);
  veil.addColorStop(0.2, `rgba(${curtain.glow},${curtain.strength * 0.035})`);
  veil.addColorStop(0.48, `rgba(${curtain.glow},${curtain.strength * 0.075})`);
  veil.addColorStop(0.72, `rgba(${curtain.color},${curtain.strength * 0.11})`);
  veil.addColorStop(0.92, `rgba(${curtain.color},${curtain.strength * 0.055})`);
  veil.addColorStop(1, `rgba(${curtain.glow},0)`);
  context.fillStyle = veil;
  context.fillRect(0, 0, width, height);

  const rays = lowPower ? 48 : 96;
  const glowWidth = Math.max(4, width / 210);
  for (let index = 0; index < rays; index += 1) {
    const normalized = (index + 0.32) / rays;
    const baseX = normalized * width;
    const sway = Math.sin(time * 0.18 + index * 0.71 + curtain.phase) * width * 0.008;
    const x = baseX + sway;
    const bottom = edgeY(x, width, height, curtain, time);
    const rayHeight = curtain.height * height * (0.5 + 0.43 * (0.5 + 0.5 * Math.sin(index * 1.83 + curtain.phase)));
    const top = Math.max(-height * 0.14, bottom - rayHeight);
    const shimmer = 0.5 + Math.sin(time * 0.55 + index * 0.39 + curtain.phase) * 0.18;
    const widthFactor = 0.7 + (0.5 + 0.5 * Math.sin(index * 2.43)) * 0.8;
    const beam = context.createLinearGradient(0, top, 0, bottom);
    beam.addColorStop(0, `rgba(${curtain.glow},0)`);
    beam.addColorStop(0.18, `rgba(${curtain.glow},${curtain.strength * shimmer * 0.13})`);
    beam.addColorStop(0.38, `rgba(${curtain.color},${curtain.strength * shimmer * 0.2})`);
    beam.addColorStop(0.65, `rgba(${curtain.color},${curtain.strength * shimmer * 0.14})`);
    beam.addColorStop(0.86, `rgba(${curtain.color},${curtain.strength * shimmer * 0.07})`);
    beam.addColorStop(1, `rgba(${curtain.glow},0)`);

    context.beginPath();
    context.moveTo(x, bottom + 2);
    context.bezierCurveTo(
      x + sway * 0.45 - glowWidth * 0.12,
      bottom - rayHeight * 0.35,
      x - sway * 0.25 + glowWidth * 0.12,
      top + rayHeight * 0.28,
      x + sway * 0.12,
      top,
    );
    context.strokeStyle = beam;
    context.lineWidth = glowWidth * widthFactor;
    context.lineCap = 'round';
    context.stroke();
  }
  context.restore();
}

export function AuroraSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true, desynchronized: true });
    if (!canvas || !context) return;

    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const lowPower = (device.deviceMemory ?? 8) <= 4 || device.connection?.saveData === true;
    let width = 1;
    let height = 1;
    let pixelScale = 1;
    let stars = makeStars(lowPower ? 64 : 118);
    let frame = 0;
    let lastDraw = 0;
    let startedAt = performance.now();
    let animate = !isReducedMotion();
    let disposed = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      pixelScale = Math.min(window.devicePixelRatio || 1, lowPower ? 0.72 : 1, Math.sqrt(1_500_000 / (width * height)));
      canvas.width = Math.max(1, Math.round(width * pixelScale));
      canvas.height = Math.max(1, Math.round(height * pixelScale));
      context.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
      stars = makeStars(lowPower ? 64 : Math.min(150, Math.round((width * height) / 11_000)));
      draw(performance.now(), true);
    };

    const draw = (now: number, staticFrame = false) => {
      if (disposed || document.hidden) {
        frame = 0;
        return;
      }
      if (!staticFrame && now - lastDraw < (lowPower ? 56 : 42)) {
        frame = window.requestAnimationFrame(draw);
        return;
      }
      lastDraw = now;
      const time = animate && !staticFrame ? (now - startedAt) / 1000 : 0;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'screen';

      const airglow = context.createRadialGradient(width * 0.51, height * 0.36, 0, width * 0.51, height * 0.36, Math.max(width, height) * 0.72);
      airglow.addColorStop(0, 'rgba(21,119,91,0.13)');
      airglow.addColorStop(0.44, 'rgba(16,88,91,0.07)');
      airglow.addColorStop(1, 'rgba(9,37,56,0)');
      context.fillStyle = airglow;
      context.fillRect(0, 0, width, height);

      for (const curtain of curtains) drawCurtain(context, width, height, curtain, time, lowPower);

      for (const star of stars) {
        const twinkle = animate ? 0.48 + Math.sin(time * (0.55 + star.warmth * 0.9) + star.phase) * 0.2 : 0.5;
        const x = star.x * width;
        const y = star.y * height;
        const color = star.warmth > 0.83 ? '255,226,190' : '231,255,248';
        context.beginPath();
        context.fillStyle = `rgba(${color},${twinkle})`;
        context.shadowColor = `rgba(${color},${twinkle * 0.65})`;
        context.shadowBlur = star.radius * (star.radius > 1.1 ? 4 : 2);
        context.arc(x, y, star.radius, 0, Math.PI * 2);
        context.fill();
      }
      context.shadowBlur = 0;
      context.globalCompositeOperation = 'source-over';

      if (animate) frame = window.requestAnimationFrame(draw);
      else frame = 0;
    };

    const resume = () => {
      if (!disposed && !document.hidden && animate && frame === 0) {
        startedAt = performance.now();
        frame = window.requestAnimationFrame(draw);
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden && frame) window.cancelAnimationFrame(frame);
      frame = 0;
      if (!document.hidden) {
        if (animate) resume();
        else draw(performance.now(), true);
      }
    };
    const onMotionPreferenceChange = () => {
      animate = !isReducedMotion();
      if (animate && !frame) resume();
      else if (!animate && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        draw(performance.now(), true);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const mutationObserver = new MutationObserver(onMotionPreferenceChange);
    mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion', 'data-theme'] });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.addEventListener('change', onMotionPreferenceChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    resize();
    if (animate) resume();

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      reducedMotion.removeEventListener('change', onMotionPreferenceChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="aurora-sky" aria-hidden="true" />;
}
