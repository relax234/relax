import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Square,
  Terminal,
} from 'lucide-react';
import { detectWebGlInfo, measureEventLoopLag } from '../utils/browserProbe';
import {
  computeFrameMetrics,
  formatShortGpuName,
  type FrameMonitorMetrics,
} from '../utils/frameMonitor';
import { classifyGpu } from '../utils/scanner';
import {
  computeStressSummary,
  createGpuStressEngine,
  startCpuStressWorkers,
  type CpuWorkerPool,
  type GpuStressEngine,
  type StressBenchmarkSummary,
  type StressIntensity,
} from '../utils/stressBenchmark';

const STRESS_DURATION_MS = 8000;

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
  const stressSamplesRef = useRef<number[]>([]);
  const stressStartTimeRef = useRef(0);
  const gpuEngineRef = useRef<GpuStressEngine | null>(null);
  const cpuPoolRef = useRef<CpuWorkerPool | null>(null);
  const activeStressIntensityRef = useRef<StressIntensity>('extreme');
  const stressMetaRef = useRef<{ workers: number; gpuLabel: string }>({
    workers: 0,
    gpuLabel: '',
  });
  const resetCounterRef = useRef(0);

  const [paused, setPaused] = useState(false);
  const [stressIntensity, setStressIntensity] = useState<StressIntensity>('extreme');
  const [stressActive, setStressActive] = useState(false);
  const [stressProgress, setStressProgress] = useState(0);
  const [stressRemainingSec, setStressRemainingSec] = useState(8);
  const [stressMeta, setStressMeta] = useState<{ workers: number; gpuLabel: string } | null>(null);
  const [stressSummary, setStressSummary] = useState<StressBenchmarkSummary | null>(null);
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

  const cleanupStressResources = () => {
    stressActiveRef.current = false;
    if (gpuEngineRef.current) {
      gpuEngineRef.current.dispose();
      gpuEngineRef.current = null;
    }
    if (cpuPoolRef.current) {
      cpuPoolRef.current.stop();
      cpuPoolRef.current = null;
    }
  };

  const stopStressTest = (saveResultIfEnoughSamples: boolean) => {
    const elapsedMs = stressStartTimeRef.current
      ? Math.max(0, performance.now() - stressStartTimeRef.current)
      : 0;
    const collected = [...stressSamplesRef.current];
    const meta = stressMetaRef.current;
    const usedIntensity = activeStressIntensityRef.current;

    cleanupStressResources();
    setStressActive(false);
    setStressProgress(0);

    if (saveResultIfEnoughSamples && elapsedMs >= 1400 && collected.length >= 6) {
      setStressSummary(
        computeStressSummary({
          deltas: collected,
          intensity: usedIntensity,
          cpuWorkersUsed: meta.workers,
          gpuWorkloadLabel: meta.gpuLabel,
          durationSec: Math.min(STRESS_DURATION_MS / 1000, elapsedMs / 1000),
        }),
      );
    }
  };

  const startStressTest = () => {
    cleanupStressResources();
    if (paused) setPaused(false);

    const isSoftwareRenderer = classifyGpu(hwSummary.gpuFull).vendor === 'software';
    const gpuEngine = createGpuStressEngine(stressIntensity, isSoftwareRenderer);
    const cpuPool = startCpuStressWorkers(
      stressIntensity,
      hwSummary.cpuCores,
      isSoftwareRenderer,
    );

    gpuEngineRef.current = gpuEngine;
    cpuPoolRef.current = cpuPool;
    stressSamplesRef.current = [];
    stressStartTimeRef.current = performance.now();
    activeStressIntensityRef.current = stressIntensity;
    const meta = { workers: cpuPool.workerCount, gpuLabel: gpuEngine.label };
    stressMetaRef.current = meta;
    stressActiveRef.current = true;

    setStressMeta(meta);
    setStressSummary(null);
    setStressProgress(0);
    setStressRemainingSec(Math.ceil(STRESS_DURATION_MS / 1000));
    setStressActive(true);
  };

  // Manage timed 8-second real CPU+GPU stress pass & guarantee cleanup
  useEffect(() => {
    if (!stressActive) return;

    const interval = window.setInterval(() => {
      const elapsed = Math.max(0, performance.now() - stressStartTimeRef.current);
      const pct = Math.min(100, Math.round((elapsed / STRESS_DURATION_MS) * 100));
      const rem = Math.max(0, Math.ceil((STRESS_DURATION_MS - elapsed) / 1000));
      setStressProgress(pct);
      setStressRemainingSec(rem);

      if (elapsed >= STRESS_DURATION_MS) {
        stopStressTest(true);
      }
    }, 120);

    return () => {
      window.clearInterval(interval);
    };
  }, [stressActive]);

  useEffect(() => {
    return () => {
      cleanupStressResources();
    };
  }, []);

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

    const draw = (now: number) => {
      if (stressActiveRef.current && gpuEngineRef.current) {
        gpuEngineRef.current.renderPass(now);
      }

      if (lastTime > 0) {
        const dt = now - lastTime;
        if (dt >= 1.5 && dt <= 250) {
          history.push(dt);
          if (history.length > 60) history.shift();
          if (stressActiveRef.current) {
            stressSamplesRef.current.push(dt);
          }
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
              stressActiveRef.current ? 'rgba(251, 191, 36, 0.24)' : 'rgba(255, 255, 255, 0.16)',
            );
            grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

            ctx.beginPath();
            history.forEach((val, idx) => {
              const x = (offsetSlots + idx) * stepX;
              const y = toY(val);
              if (idx === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });

            ctx.strokeStyle = stressActiveRef.current ? '#fbbf24' : '#fafafa';
            ctx.lineWidth = 1.75;
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
            ctx.fillStyle = stressActiveRef.current ? '#fbbf24' : '#ffffff';
            ctx.beginPath();
            ctx.arc(lastX, dotY, 3, 0, Math.PI * 2);
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
    if (stressActive) {
      stopStressTest(false);
    }
    setStressSummary(null);
    setStressMeta(null);
    resetCounterRef.current += 1;
    setResetTick(resetCounterRef.current);
    setLiveStats(computeFrameMetrics([]));
  };

  const handleTogglePause = () => {
    if (!paused && stressActive) {
      stopStressTest(true);
    }
    setPaused((p) => !p);
  };

  const statusColorClass = paused
    ? 'text-slate-400'
    : stressActive
      ? 'text-amber-300'
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
    <section id="top" className="pt-8 pb-10 sm:pt-10 sm:pb-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Left Hero Narrative */}
          <div className="lg:col-span-7 min-w-0 flex flex-col justify-center">
            <div className="text-xs font-mono text-zinc-400 tracking-wide mb-3">
              Windows 10 и 11 · Открытый исходный код · Без сторонних утилит
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] text-white mb-4">
              Выжми максимум{' '}
              <span className="text-zinc-300 underline decoration-zinc-600 decoration-2 underline-offset-8">
                FPS и отклика
              </span>{' '}
              из своего ПК
            </h1>

            <p className="text-zinc-400 text-sm sm:text-base max-w-xl mb-6 leading-relaxed">
              Честная проверка параметров Windows, стресс-тест CPU + GPU и сборка прозрачного{' '}
              <code className="text-zinc-100 font-mono text-xs bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                .bat
              </code>{' '}
              или{' '}
              <code className="text-zinc-100 font-mono text-xs bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                .ps1
              </code>{' '}
              скрипта с откатом.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#scanner"
                className="px-5 py-3 rounded-xl bg-white text-zinc-950 font-bold text-sm hover:bg-zinc-200 glow-btn inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Проверить мой ПК</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#generator"
                className="px-4 py-3 rounded-xl bg-[#111113] border border-zinc-700/90 text-zinc-200 font-semibold text-sm hover:border-zinc-500 hover:text-white transition inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Terminal className="w-4 h-4 text-zinc-300" />
                <span>Собрать скрипт</span>
              </a>
            </div>
          </div>

          {/* Right Live Frame-Time Oscilloscope Card */}
          <div className="lg:col-span-5 min-w-0 flex">
            <div className="w-full p-4 sm:p-5 rounded-2xl bg-[#111113] border border-zinc-800 glow-border flex flex-col justify-between gap-3">
              {/* Row 1: Title + Playback Controls */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-200">
                    <Activity className="w-4 h-4 text-white shrink-0" />
                    <span className="truncate">Монитор фреймтайма (Live)</span>
                  </div>
                  <div
                    data-testid="live-status"
                    className={`text-[11px] font-mono mt-0.5 tabular-nums ${statusColorClass}`}
                  >
                    {paused
                      ? 'На паузе'
                      : stressActive
                        ? `Стресс CPU + GPU · осталось ${stressRemainingSec}с`
                        : liveStats.stabilityLabel}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    aria-label={paused ? 'Продолжить монитор' : 'Поставить монитор на паузу'}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-500 transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    <span>{paused ? 'Старт' : 'Пауза'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetMonitor}
                    aria-label="Сбросить график фреймтайма"
                    title="Сбросить историю замеров"
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Row 2: Real CPU + GPU Stress Benchmark Control Bar */}
              <div className="flex items-center justify-between gap-2 rounded-xl bg-zinc-950 border border-zinc-800 p-1">
                <div
                  role="group"
                  aria-label="Режим нагрузки"
                  className="flex items-center gap-1 min-w-0"
                >
                  <button
                    type="button"
                    disabled={stressActive}
                    onClick={() => setStressIntensity('medium')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${
                      stressIntensity === 'medium'
                        ? 'bg-white text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Средняя
                  </button>
                  <button
                    type="button"
                    disabled={stressActive}
                    onClick={() => setStressIntensity('extreme')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${
                      stressIntensity === 'extreme'
                        ? 'bg-white text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Сильная
                  </button>
                </div>

                <button
                  type="button"
                  data-testid="stress-test-btn"
                  onClick={() => (stressActive ? stopStressTest(true) : startStressTest())}
                  title="Запустить 8-секундный тест под реальной нагрузкой CPU-потоков и WebGL-шейдеров"
                  className={`px-3 py-1 rounded-lg border text-xs font-mono transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    stressActive
                      ? 'bg-amber-400 border-amber-300 text-zinc-950 font-bold'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-white hover:text-zinc-950 hover:border-white'
                  }`}
                >
                  {stressActive ? (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      <span className="tabular-nums">Стоп · {stressRemainingSec}с</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-3.5 h-3.5" />
                      <span>Стресс-тест</span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2.5 border-y border-zinc-800/90">
                <div>
                  <div className="text-[11px] font-mono text-zinc-400">Частота</div>
                  <div
                    data-testid="live-fps"
                    className="text-lg font-extrabold text-white font-mono tabular-nums mt-0.5"
                  >
                    {liveStats.fps}{' '}
                    <span className="text-[11px] font-normal text-zinc-500">FPS</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-zinc-400">1% Low</div>
                  <div
                    data-testid="live-low-fps"
                    className="text-lg font-extrabold text-zinc-200 font-mono tabular-nums mt-0.5"
                  >
                    {liveStats.onePercentLowFps}{' '}
                    <span className="text-[11px] font-normal text-zinc-500">FPS</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-zinc-400">Кадр</div>
                  <div
                    data-testid="live-frametime"
                    className="text-lg font-extrabold text-white font-mono tabular-nums mt-0.5"
                  >
                    {liveStats.avgFrameMs}
                    <span className="text-[11px] font-normal text-zinc-500 ml-0.5">мс</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-zinc-400">Джиттер</div>
                  <div
                    data-testid="live-jitter"
                    className={`text-lg font-extrabold font-mono tabular-nums mt-0.5 ${jitterColorClass}`}
                  >
                    {liveStats.jitterMs}
                    <span className="text-[11px] font-normal text-zinc-500 ml-0.5">мс</span>
                  </div>
                </div>
              </div>

              {/* Real-Time Canvas Graph */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-2.5">
                <canvas
                  ref={canvasRef}
                  data-testid="live-monitor-canvas"
                  className="w-full h-20 block"
                  aria-label="График реального времени кадра в браузере"
                />
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-500 mt-1 whitespace-nowrap">
                  <span className="tabular-nums">
                    Ориентир: {liveStats.targetFrameMs} мс ({liveStats.detectedHz} Гц)
                  </span>
                  <span className="tabular-nums">Пик: {liveStats.worstFrameMs} мс</span>
                </div>
              </div>

              {/* Active Stress Test Progress */}
              {stressActive && stressMeta && (
                <div
                  data-testid="stress-progress"
                  className="rounded-xl bg-zinc-950 border border-amber-500/40 p-2.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="text-amber-200 truncate">
                      {stressMeta.gpuLabel} · CPU: {stressMeta.workers} пот.
                    </span>
                    <span className="text-amber-300 font-bold tabular-nums shrink-0">
                      {stressProgress}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-[width] duration-150"
                      style={{ width: `${stressProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Stress Test Result Summary */}
              {!stressActive && stressSummary && (
                <div
                  data-testid="stress-summary"
                  className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div
                      className={`font-semibold inline-flex items-center gap-1.5 min-w-0 ${
                        stressSummary.verdictTone === 'good'
                          ? 'text-emerald-300'
                          : stressSummary.verdictTone === 'warn'
                            ? 'text-amber-300'
                            : 'text-rose-300'
                      }`}
                    >
                      {stressSummary.verdictTone === 'good' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{stressSummary.verdict}</span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400 whitespace-nowrap shrink-0 tabular-nums">
                      {stressSummary.intensity === 'extreme' ? 'Сильная' : 'Средняя'} ·{' '}
                      {stressSummary.durationSec} с
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1.5 border-t border-zinc-800">
                    <div>
                      <div className="text-zinc-500">Ср. FPS</div>
                      <div className="text-white font-bold tabular-nums">
                        {stressSummary.avgFps}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">1% Low</div>
                      <div className="text-zinc-200 font-bold tabular-nums">
                        {stressSummary.onePercentLowFps}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Пик · Дропы</div>
                      <div className="text-zinc-200 font-bold tabular-nums">
                        {stressSummary.worstFrameMs} мс · {stressSummary.dropCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Стабильность</div>
                      <div
                        className={`font-bold tabular-nums ${
                          stressSummary.stabilityPercent >= 82
                            ? 'text-emerald-300'
                            : stressSummary.stabilityPercent >= 60
                              ? 'text-amber-300'
                              : 'text-rose-300'
                        }`}
                      >
                        {stressSummary.stabilityPercent}%
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-zinc-500 truncate">
                    Нагрузка: {stressSummary.gpuWorkloadLabel} · CPU: {stressSummary.cpuWorkersUsed}{' '}
                    пот.
                  </div>
                </div>
              )}

              {/* Live Hardware & Main-Thread Telemetry Strip */}
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono border-t border-zinc-800/80 pt-2.5">
                <div className="min-w-0">
                  <div className="text-zinc-500">GPU</div>
                  <div
                    data-testid="live-gpu"
                    className="text-zinc-200 truncate"
                    title={hwSummary.gpuFull}
                  >
                    {hwSummary.gpuShort}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-zinc-500">CPU · ОЗУ</div>
                  <div className="text-zinc-200 truncate tabular-nums">
                    {hwSummary.cpuCores} пот. · {hwSummary.ramText}
                  </div>
                </div>
                <div className="min-w-0 text-right">
                  <div className="text-zinc-500">Отклик потока</div>
                  <div data-testid="live-lag" className="text-white tabular-nums">
                    {hwSummary.eventLoopLagMs} мс
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Architectural Stats Strip */}
        <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800 rounded-2xl bg-[#111113] border border-zinc-800">
          <div className="p-4">
            <div className="text-xl font-extrabold text-white font-mono tabular-nums">28</div>
            <div className="text-xs text-zinc-400 mt-0.5">Прозрачных твиков Windows</div>
          </div>
          <div className="p-4">
            <div className="text-xl font-extrabold text-white font-mono tabular-nums">
              17+
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">Реальных проверок реестра и ОС</div>
          </div>
          <div className="p-4">
            <div className="text-xl font-extrabold text-white font-mono tabular-nums">
              CPU+GPU
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">WebGL и потоковый стресс-тест</div>
          </div>
          <div className="p-4">
            <div className="text-xl font-extrabold text-white font-mono tabular-nums">
              100%
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">Обратимость с точкой отката</div>
          </div>
        </div>
      </div>
    </section>
  );
}
