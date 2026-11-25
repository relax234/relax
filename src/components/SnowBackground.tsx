import { useEffect, useRef } from 'react';

interface SnowBackgroundProps {
  enabled: boolean;
  paused?: boolean;
}

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  driftAmp: number;
  driftPhase: number;
  driftFreq: number;
  alpha: number;
}

export function SnowBackground({ enabled, paused = false }: SnowBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!enabled) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let rafId = 0;
    let width = window.innerWidth || 1280;
    let height = window.innerHeight || 720;

    const flakeCount = width < 768 ? 34 : 64;
    const flakes: Snowflake[] = Array.from({ length: flakeCount }, (_, idx) => {
      const depth = (idx % 3) + 1;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: depth === 1 ? 1.1 + Math.random() * 0.7 : depth === 2 ? 1.8 + Math.random() * 1.0 : 2.5 + Math.random() * 1.3,
        speedY: depth === 1 ? 18 + Math.random() * 12 : depth === 2 ? 28 + Math.random() * 18 : 40 + Math.random() * 20,
        driftAmp: 10 + Math.random() * 18,
        driftPhase: Math.random() * Math.PI * 2,
        driftFreq: 0.4 + Math.random() * 0.6,
        alpha: depth === 1 ? 0.25 + Math.random() * 0.15 : depth === 2 ? 0.42 + Math.random() * 0.18 : 0.58 + Math.random() * 0.22,
      };
    });

    const syncSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth || 1280;
      height = window.innerHeight || 720;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawStaticOrFrame = (dtSec: number, timeSec: number) => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        if (!paused && !prefersReducedMotion && dtSec > 0) {
          f.y += f.speedY * dtSec;
          f.x += Math.sin(timeSec * f.driftFreq + f.driftPhase) * f.driftAmp * dtSec;
          if (f.y > height + 8) {
            f.y = -8;
            f.x = Math.random() * width;
          }
          if (f.x > width + 8) f.x = -8;
          if (f.x < -8) f.x = width + 8;
        }

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 240, 255, ${f.alpha})`;
        ctx.fill();
      }
    };

    syncSize();
    window.addEventListener('resize', syncSize);

    if (paused || prefersReducedMotion) {
      drawStaticOrFrame(0, 0);
      return () => {
        window.removeEventListener('resize', syncSize);
      };
    }

    let lastMs = performance.now();
    const tick = (nowMs: number) => {
      if (document.visibilityState === 'visible') {
        const dtSec = Math.min(0.05, Math.max(0.001, (nowMs - lastMs) / 1000));
        drawStaticOrFrame(dtSec, nowMs / 1000);
      }
      lastMs = nowMs;
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', syncSize);
      window.cancelAnimationFrame(rafId);
    };
  }, [enabled, paused]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="snow-canvas"
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-10 transition-opacity duration-300 ${
        paused ? 'opacity-20' : 'opacity-100'
      }`}
    />
  );
}
