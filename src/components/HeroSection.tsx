import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowRight, Flame, Pause, Play, RotateCcw, Terminal } from 'lucide-react';
import { detectWebGlInfo, measureEventLoopLag } from '../utils/browserProbe';
import {
  computeFrameMetrics,
  formatShortGpuName,
  type FrameMonitorMetrics,
} from '../utils/frameMonitor';

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

interface LiveHwSummary {
  gpuShort: string;
  gpuFull: string;
  webgl2Supported: boolean;
  cpuCores: number;
  ramText: string;
  eventLoopLagMs: number;
}

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stressActiveRef = useRef(false);
  const stressBufferRef = useRef<HTMLCanvasElement | null>(null);
  const resetCounterRef = useRef(0);

  const [paused, setPaused] = useState(false);
  const [stressActive, setStressActive] = useState(false);
  const [resetTick, setResetTick] = useState(0);
  const [liveStats, setLiveStats] = useState<FrameMonitorMetrics>(() => computeFrameMetrics([]));
  const [hwSummary, setHwSummary] = useState<LiveHwSummary>({
    gpuShort: 'Определение...',
    gpuFull: '',
    webgl2Supported: false,
    cpuCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
    ramText: '—',
    eventLoopLagMs: 0.2,
  });

  useEffect(() => {
    stressActiveRef.current = stressActive;
    if (!stressActive) return;
    const timer = window.setTimeout(() => setStressActive(false), 5000);
    return () => window.clearTimeout(timer);
  }, [stressActive]);

  // Real GPU / CPU / RAM detection + periodic MessageChannel event-loop lag probe
  useEffect(() => {
    let cancelled = false;
    const gpu = detectWebGlInfo();
    const nav = navigator as NavigatorWithMemory;
    const mem =
      typeof nav.deviceMemory === 'number' && Number.isFinite(nav.deviceMemory)
        ? nav.deviceMemory >= 8
          ? '≥8 ГБ'
          : `${nav.deviceMemory} ГБ`
        : 'скрыто';

    setHwSummary((prev) => ({
      ...prev,
      gpuShort: formatShortGpuName(gpu.renderer),
      gpuFull: gpu.renderer,
      webgl2Supported: gpu.webgl2Supported,
      cpuCores: navigator.hardwareConcurrency || 4,
      ramText: mem,
    }));

    const pollLag = async () => {
      const lag = await measureEventLoopLag();
      if (!cancelled) {
        setHwSummary((prev) => ({ ...prev, eventLoopLagMs: lag }));
      }
    };

    void pollLag();
    const interval = window.setInterval(() => {
      if (!paused && document.visibilityState === 'visible') {
        void pollLag();
      }
    }, 1800);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [paused]);

  // Real-time rAF frame-time profiler (works regardless of OS reduced-motion setting)
  useEffect(() => {
    if (paused) return;

    let rafId = 0;
    let lastTime = 0;
    let lastUiUpdate = 0;
    const history: number[] = [];

    const handleVisibility = () => {
      lastTime = 0;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const runStressPass = (now: number) => {
      if (!stressBufferRef.current) {
        const off = document.createElement('canvas');
        off.width = 256;
        off.height = 256;
        stressBufferRef.current = off;
      }
      const offCtx = stressBufferRef.current.getContext('2d');
      if (offCtx) {
        for (let i = 0; i < 45; i++) {
          const x = ((now * 0.13 + i * 37) % 220);
          const y = ((now * 0.09 + i * 53) % 220);
          offCtx.fillStyle = i % 2 === 0 ? 'rgba(34,211,238,0.18)' : 'rgba(139,92,246,0.18)';
          offCtx.fillRect(x, y, 36, 36);
        }
      }
    };

    const draw = (now: number) => {
      if (stressActiveRef.current) {
        runStressPass(now);
      }

      if (lastTime > 0) {
        const dt = now - lastTime;
        if (dt >= 1.5 && dt <= 150) {
          history.push(dt);
          if (history.length > 60) history.shift();
        }
      }
      lastTime = now;

      if (history.length >= 4 && (lastUiUpdate === 0 || now - lastUiUpdate >= 260)) {
        lastUiUpdate = now;
        const recent = history.slice(-36);
        setLiveStats(computeFrameMetrics(recent));
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssW = canvas.clientWidth || 360;
        const cssH = canvas.clientHeight || 96;
        const targetW = Math.round(cssW * dpr);
        const targetH = Math.round(cssH * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          const w = cssW;
          const h = cssH;
          ctx.clearRect(0, 0, w, h);

          const currentMetrics = computeFrameMetrics(history);
          const maxScale = Math.max(24, currentMetrics.targetFrameMs * 2.25);
          const toY = (ms: number) =>
            h - (Math.min(maxScale, Math.max(1.5, ms)) / maxScale) * (h - 16) - 8;

          // Subtle vertical grid divisions
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
          ctx.lineWidth = 1;
          for (let gx = 1; gx < 6; gx++) {
            const x = (w / 6) * gx;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }

          // Adaptive target Hz dashed line
          const refY = toY(currentMetrics.targetFrameMs);
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, refY);
          ctx.lineTo(w, refY);
          ctx.stroke();
          ctx.setLineDash([]);

          if (history.length >= 2) {
            const maxSlots = 60;
            const stepX = w / (maxSlots - 1);
            const offsetSlots = maxSlots - history.length;

            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(
              0,
              stressActiveRef.current ? 'rgba(251, 191, 36, 0.30)' : 'rgba(34, 211, 238, 0.28)',
            );
            grad.addColorStop(1, 'rgba(34, 211, 238, 0.0)');

            ctx.beginPath();
            history.forEach((val, idx) => {
              const x = (offsetSlots + idx) * stepX;
              const y = toY(val);
              if (idx === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });

            ctx.strokeStyle = stressActiveRef.current ? '#fbbf24' : '#22d3ee';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Fill under active trace
            const firstX = offsetSlots * stepX;
            const lastX = (offsetSlots + history.length - 1) * stepX;
            ctx.lineTo(lastX, h);
            ctx.lineTo(firstX, h);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();

            // Highlight spike points above 1.5x target frame time
            history.forEach((val, idx) => {
              if (val > currentMetrics.targetFrameMs * 1.5) {
                const x = (offsetSlots + idx) * stepX;
                const y = toY(val);
                ctx.fillStyle = val > currentMetrics.targetFrameMs * 2.1 ? '#fb7185' : '#fbbf24';
                ctx.beginPath();
                ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                ctx.fill();
              }
            });

            // Live cursor dot on latest sample
            const latestVal = history[history.length - 1];
            const dotY = toY(latestVal);
            ctx.fillStyle = stressActiveRef.current ? '#fbbf24' : '#34d399';
            ctx.beginPath();
            ctx.arc(lastX, dotY, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.cancelAnimationFrame(rafId);
    };
  }, [paused, resetTick]);

  const handleResetMonitor = () => {
    resetCounterRef.current += 1;
    setResetTick(resetCounterRef.current);
    setLiveStats(computeFrameMetrics([]));
  };

  const statusColorClass = paused
    ? 'text-slate-400'
    : liveStats.stabilityStatus === 'bad'
      ? 'text-rose-400'
      : liveStats.stabilityStatus === 'warn'
        ? 'text-amber-300'
        : 'text-emerald-400';

  const jitterColorClass =
    liveStats.jitterMs > 4.2
      ? 'text-rose-400'
      : liveStats.jitterMs > 1.8
        ? 'text-amber-300'
        : 'text-emerald-400';

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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
                    <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Монитор фреймтайма (Live)</span>
                  </div>
                  <div
                    data-testid="live-status"
                    className={`text-[11px] font-mono mt-0.5 ${statusColorClass}`}
                  >
                    {paused
                      ? 'На паузе'
                      : stressActive
                        ? 'Идёт тест отрисовки (5 сек)...'
                        : liveStats.stabilityLabel}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (paused) setPaused(false);
                      setStressActive((s) => !s);
                    }}
                    title="Запустить 5-секундную нагрузку на рендер кадров"
                    className={`px-2.5 py-1 rounded-md border text-xs font-mono transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      stressActive
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                        : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Flame className="w-3 h-3" />
                    <span>{stressActive ? 'Тест…' : 'Нагрузка'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    aria-label={paused ? 'Продолжить монитор' : 'Поставить монитор на паузу'}
                    className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-white transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    <span>{paused ? 'Старт' : 'Пауза'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetMonitor}
                    aria-label="Сбросить график фреймтайма"
                    title="Сбросить историю замеров"
                    className="p-1.5 rounded-md bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Live Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-800/80">
                <div>
                  <div className="text-[11px] font-mono text-slate-400">Частота</div>
                  <div
                    data-testid="live-fps"
                    className="text-xl font-extrabold text-cyan-400 font-mono tabular-nums mt-0.5"
                  >
                    {liveStats.fps}{' '}
                    <span className="text-[11px] font-normal text-slate-400">FPS</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-slate-400">1% Low</div>
                  <div
                    data-testid="live-low-fps"
                    className="text-xl font-extrabold text-violet-300 font-mono tabular-nums mt-0.5"
                  >
                    {liveStats.onePercentLowFps}{' '}
                    <span className="text-[11px] font-normal text-slate-400">FPS</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-slate-400">Кадр</div>
                  <div
                    data-testid="live-frametime"
                    className="text-xl font-extrabold text-white font-mono tabular-nums mt-0.5"
                  >
                    {liveStats.avgFrameMs}
                    <span className="text-[11px] font-normal text-slate-400 ml-0.5">мс</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-slate-400">Джиттер</div>
                  <div
                    data-testid="live-jitter"
                    className={`text-xl font-extrabold font-mono tabular-nums mt-0.5 ${jitterColorClass}`}
                  >
                    {liveStats.jitterMs}
                    <span className="text-[11px] font-normal text-slate-400 ml-0.5">мс</span>
                  </div>
                </div>
              </div>

              {/* Real-Time Canvas Graph */}
              <div className="rounded-xl bg-[#060911] border border-slate-800/80 p-3">
                <canvas
                  ref={canvasRef}
                  data-testid="live-monitor-canvas"
                  className="w-full h-24 block"
                  aria-label="График реального времени кадра в браузере"
                />
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 mt-1.5 whitespace-nowrap">
                  <span className="tabular-nums">
                    Ориентир: {liveStats.targetFrameMs} мс ({liveStats.detectedHz} Гц)
                  </span>
                  <span className="tabular-nums">Пик: {liveStats.worstFrameMs} мс</span>
                </div>
              </div>

              {/* Live Hardware & Main-Thread Telemetry Strip */}
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono border-t border-slate-800/70 pt-3">
                <div className="min-w-0">
                  <div className="text-slate-500">GPU</div>
                  <div
                    data-testid="live-gpu"
                    className="text-slate-200 truncate"
                    title={hwSummary.gpuFull}
                  >
                    {hwSummary.gpuShort}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-slate-500">CPU · ОЗУ</div>
                  <div className="text-slate-200 truncate tabular-nums">
                    {hwSummary.cpuCores} пот. · {hwSummary.ramText}
                  </div>
                </div>
                <div className="min-w-0 text-right">
                  <div className="text-slate-500">Отклик потока</div>
                  <div data-testid="live-lag" className="text-cyan-300 tabular-nums">
                    {hwSummary.eventLoopLagMs} мс
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between gap-2">
                <span>Нужен полный разбор и твики?</span>
                <a
                  href="#scanner"
                  className="text-cyan-400 hover:text-cyan-300 font-semibold whitespace-nowrap"
                >
                  Открыть сканер ↓
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
