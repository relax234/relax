import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowRight, Pause, Play, Terminal } from 'lucide-react';

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [liveStats, setLiveStats] = useState({ fps: 60, frameMs: 16.7, jitterMs: 0.4 });

  useEffect(() => {
    if (paused) return;
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    let rafId = 0;
    let lastTime = performance.now();
    let lastUiUpdate = lastTime;
    const history: number[] = Array.from({ length: 48 }, () => 16.67);

    const draw = (now: number) => {
      const dt = Math.min(60, Math.max(2, now - lastTime));
      lastTime = now;
      history.push(dt);
      if (history.length > 48) history.shift();

      if (now - lastUiUpdate > 320) {
        lastUiUpdate = now;
        const recent = history.slice(-18);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const jitter =
          recent.reduce((acc, v) => acc + Math.abs(v - avg), 0) / recent.length;
        setLiveStats({
          fps: Math.min(360, Math.max(15, Math.round(1000 / avg))),
          frameMs: Number(avg.toFixed(1)),
          jitterMs: Number(jitter.toFixed(1)),
        });
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Reference 16.6ms (60Hz) hairline
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          const refY = h - (16.67 / 40) * (h - 16) - 8;
          ctx.moveTo(0, refY);
          ctx.lineTo(w, refY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Area fill under frame-time polyline
          const stepX = w / (history.length - 1);
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, 'rgba(34, 211, 238, 0.28)');
          grad.addColorStop(1, 'rgba(34, 211, 238, 0.0)');

          ctx.beginPath();
          history.forEach((val, idx) => {
            const clamped = Math.min(38, Math.max(3, val));
            const x = idx * stepX;
            const y = h - (clamped / 40) * (h - 16) - 8;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });

          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, [paused]);

  return (
    <section id="top" className="pt-12 pb-16 sm:pt-16 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Hero Narrative */}
          <div className="lg:col-span-7 min-w-0 flex flex-col justify-center">
            <div className="text-xs font-mono text-cyan-300/90 tracking-wide mb-4">
              Windows 10 и 11 · Открытый исходный код · Без лишних программ
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight leading-[1.08] text-white mb-5">
              Выжми максимум{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400">
                FPS и отклика
              </span>{' '}
              из своего ПК
            </h1>

            <p className="text-slate-300/90 text-base sm:text-lg max-w-xl mb-8 leading-relaxed">
              Проверь реальные параметры видеокарты, герцовки и стабильности кадров прямо в
              браузере и собери прозрачный{' '}
              <code className="text-cyan-300 font-mono text-sm">.bat</code> или{' '}
              <code className="text-violet-300 font-mono text-sm">.ps1</code> скрипт с откатом.
            </p>

            <div className="flex flex-wrap items-center gap-3.5">
              <a
                href="#scanner"
                className="px-6 py-3.5 rounded-xl bg-cyan-400 text-slate-950 font-bold text-sm hover:bg-cyan-300 glow-btn inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Проверить мой ПК</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#generator"
                className="px-5 py-3.5 rounded-xl bg-[#0C1220] border border-slate-700/80 text-slate-200 font-semibold text-sm hover:border-cyan-400/50 hover:text-white transition inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Terminal className="w-4 h-4 text-violet-400" />
                <span>Собрать скрипт</span>
              </a>
            </div>
          </div>

          {/* Right Live Frame-Time Oscilloscope Card */}
          <div className="lg:col-span-5 min-w-0 flex">
            <div className="w-full p-5 sm:p-6 rounded-2xl bg-[#0C1220] border border-slate-800/90 glow-border flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Монитор фреймтайма (Live)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-white transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  <span>{paused ? 'Старт' : 'Пауза'}</span>
                </button>
              </div>

              {/* Live Metrics Row */}
              <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-800/80">
                <div>
                  <div className="text-[11px] font-mono text-slate-400">Частота</div>
                  <div className="text-2xl font-extrabold text-cyan-400 font-mono tabular-nums mt-0.5">
                    {liveStats.fps} <span className="text-xs font-normal text-slate-400">FPS</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-slate-400">Время кадра</div>
                  <div className="text-2xl font-extrabold text-white font-mono tabular-nums mt-0.5">
                    {liveStats.frameMs}
                    <span className="text-xs font-normal text-slate-400 ml-0.5">мс</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-slate-400">Джиттер</div>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums mt-0.5">
                    {liveStats.jitterMs}
                    <span className="text-xs font-normal text-slate-400 ml-0.5">мс</span>
                  </div>
                </div>
              </div>

              {/* Real-Time Canvas Graph */}
              <div className="rounded-xl bg-[#060911] border border-slate-800/80 p-3">
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={96}
                  className="w-full h-24 block"
                  aria-label="График реального времени кадра в браузере"
                />
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 mt-1.5 whitespace-nowrap">
                  <span>Ориентир: 16.7 мс (60 Гц)</span>
                  <span>Live rAF</span>
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between gap-2">
                <span>Хочешь узнать слабые места системы?</span>
                <a
                  href="#scanner"
                  className="text-cyan-400 hover:text-cyan-300 font-semibold whitespace-nowrap"
                >
                  Запустить скан ↓
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Architectural Stats Strip */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80 rounded-2xl bg-[#0C1220]/90 border border-slate-800/90">
          <div className="p-5">
            <div className="text-2xl font-extrabold text-cyan-400 font-mono tabular-nums">−35%</div>
            <div className="text-xs text-slate-400 mt-1">Фоновых процессов и служб</div>
          </div>
          <div className="p-5">
            <div className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
              −4.2 мс
            </div>
            <div className="text-xs text-slate-400 mt-1">Снижение системного Input Lag</div>
          </div>
          <div className="p-5">
            <div className="text-2xl font-extrabold text-violet-400 font-mono tabular-nums">
              +12–25%
            </div>
            <div className="text-xs text-slate-400 mt-1">Стабильность редких кадров 1% Low</div>
          </div>
          <div className="p-5">
            <div className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums">
              100%
            </div>
            <div className="text-xs text-slate-400 mt-1">Обратимость с точкой отката</div>
          </div>
        </div>
      </div>
    </section>
  );
}
