import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Copy,
  Cpu,
  Download,
  Gauge,
  Monitor,
  Play,
  RotateCcw,
  Terminal,
  Wrench,
  X,
} from 'lucide-react';
import { runBrowserHardwareProbe } from '../utils/browserProbe';
import {
  WINDOWS_DIAG_SCRIPT,
  evaluatePcScan,
  parseWindowsDiagReport,
  type HardwareScanInput,
  type RecommendationPriority,
  type WindowsDiagReport,
} from '../utils/scanner';

interface ScannerSectionProps {
  onApplyRecommendedModules: (moduleIds: string[]) => void;
}

const POWER_PLAN_LABELS: Record<string, string> = {
  ultimate: 'Максимальная производительность',
  high: 'Высокая производительность',
  balanced: 'Сбалансированная',
  powersaver: 'Экономия энергии',
};

function getScoreAccent(score: number): {
  text: string;
  bar: string;
  badge: string;
} {
  if (score >= 82) {
    return {
      text: 'text-emerald-400',
      bar: 'from-emerald-400 to-cyan-400',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    };
  }
  if (score >= 62) {
    return {
      text: 'text-cyan-400',
      bar: 'from-cyan-400 to-violet-500',
      badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    };
  }
  return {
    text: 'text-amber-400',
    bar: 'from-amber-400 to-rose-500',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  };
}

function getPriorityStyle(priority: RecommendationPriority): {
  label: string;
  badgeClass: string;
  cardBorder: string;
} {
  if (priority === 'high') {
    return {
      label: 'Высокий приоритет',
      badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      cardBorder: 'border-rose-500/35 bg-rose-950/15',
    };
  }
  if (priority === 'medium') {
    return {
      label: 'Рекомендация',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      cardBorder: 'border-amber-500/30 bg-[#0E1525]',
    };
  }
  return {
    label: 'Оптимально',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    cardBorder: 'border-emerald-500/25 bg-[#0E1525]',
  };
}

export function ScannerSection({ onApplyRecommendedModules }: ScannerSectionProps) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [scanData, setScanData] = useState<HardwareScanInput | null>(null);

  const [deepOpen, setDeepOpen] = useState(false);
  const [diagCopied, setDiagCopied] = useState(false);
  const [rawReport, setRawReport] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  const [windowsReport, setWindowsReport] = useState<WindowsDiagReport | null>(null);
  const [appliedNotice, setAppliedNotice] = useState(false);

  const evaluation = scanData ? evaluatePcScan({ ...scanData, windowsReport }) : null;

  const handleStartScan = async () => {
    if (scanning) return;
    setScanning(true);
    setProgress(5);
    setStatusText('Запуск диагностики оборудования...');
    setAppliedNotice(false);

    try {
      const result = await runBrowserHardwareProbe((pct, text) => {
        setProgress(pct);
        setStatusText(text);
      });
      setScanData(result);
    } finally {
      setScanning(false);
    }
  };

  const handleCopyDiagScript = async () => {
    try {
      await navigator.clipboard.writeText(WINDOWS_DIAG_SCRIPT);
      setDiagCopied(true);
      window.setTimeout(() => setDiagCopied(false), 1800);
    } catch {
      setDiagCopied(false);
    }
  };

  const handleDownloadDiagScript = () => {
    const blob = new Blob([WINDOWS_DIAG_SCRIPT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OptiCore_Diag.ps1';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAnalyzeReport = async () => {
    const parsed = parseWindowsDiagReport(rawReport);
    if (!parsed.ok) {
      setReportError(parsed.error);
      return;
    }

    setReportError(null);
    setWindowsReport(parsed.report);

    if (!scanData) {
      await handleStartScan();
    }
  };

  const handleClearReport = () => {
    setWindowsReport(null);
    setRawReport('');
    setReportError(null);
  };

  const handleApplyToGenerator = () => {
    if (!evaluation) return;
    setAppliedNotice(true);
    onApplyRecommendedModules(evaluation.recommendedModuleIds);
    window.setTimeout(() => setAppliedNotice(false), 3000);
  };

  const ramSummary = (() => {
    if (!scanData) return '';
    if (windowsReport?.ramTotalGb) {
      const speedPart = windowsReport.ramSpeedMhz ? ` · ${windowsReport.ramSpeedMhz} МГц` : '';
      return `${windowsReport.ramTotalGb} ГБ ОЗУ${speedPart} · ${scanData.cpuCores} потоков`;
    }
    if (scanData.deviceMemoryGb === 8) {
      return '≥ 8 ГБ ОЗУ (лимит браузера)';
    }
    if (scanData.deviceMemoryGb !== null) {
      return `~${scanData.deviceMemoryGb} ГБ ОЗУ`;
    }
    return 'Объём ОЗУ скрыт браузером';
  })();

  const scoreAccent = evaluation ? getScoreAccent(evaluation.score) : null;

  return (
    <section
      id="scanner"
      className="py-16 px-4 sm:px-6 border-t border-slate-800/70 bg-slate-950/35"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
              Шаг 0 • Экспресс-диагностика ПК
            </span>
            <h2 className="text-3xl font-bold mt-1">Сканер системы и поиск потерь FPS</h2>
            <p className="text-slate-400 text-sm mt-2 max-w-2xl">
              Проверяет реальные параметры браузера (GPU через WebGL, потоки CPU, ОЗУ, герцовку
              экрана и джиттер кадров) и показывает, что мешает максимальному FPS.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleStartScan}
              disabled={scanning}
              className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 text-slate-950 font-bold text-sm transition glow-btn inline-flex items-center gap-2 cursor-pointer"
            >
              {scanData ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {scanning
                ? 'Идёт сканирование...'
                : scanData
                  ? 'Пересканировать'
                  : 'Просканировать мой ПК'}
            </button>
          </div>
        </div>

        {/* Scanning Progress Bar */}
        {scanning && (
          <div className="mb-8 p-6 rounded-2xl bg-[#0E1525] border border-cyan-500/40 glow-border">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-cyan-300">
                <Activity className="w-4 h-4 animate-pulse" />
                <span>{statusText || 'Анализ системы...'}</span>
              </div>
              <span className="text-sm font-mono font-bold text-cyan-400 tabular-nums">
                {progress}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-lg bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Empty Prompt State before first scan */}
        {!scanData && !scanning && (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0E1525]/90 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="text-lg font-bold text-white">
                Готов проверить твой компьютер без установки программ
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Нажми <span className="text-cyan-300 font-medium">«Просканировать мой ПК»</span>,
                чтобы за 1 секунду измерить частоту обновления экрана, стабильность фреймтайма,
                модель видеокарты и получить персональный список шагов для буста FPS.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartScan}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/35 text-cyan-300 font-semibold text-sm transition shrink-0 cursor-pointer inline-flex items-center gap-2"
            >
              <Gauge className="w-4 h-4" />
              Запустить тест
            </button>
          </div>
        )}

        {/* Results Dashboard */}
        {scanData && evaluation && scoreAccent && (
          <div className="space-y-6">
            {/* Overall Readiness Verdict Card */}
            <div className="p-6 rounded-2xl bg-[#0E1525] border border-slate-800 glow-border">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-md border text-xs font-mono font-semibold ${scoreAccent.badge}`}
                    >
                      {evaluation.verdictBadge}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-mono">
                      Потенциал: {evaluation.estimatedFpsGain}
                    </span>
                    {windowsReport && (
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                        + Отчёт Windows подключён
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    {evaluation.verdictTitle}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {evaluation.verdictDescription}
                  </p>
                </div>

                <div className="lg:min-w-[300px] p-4 rounded-xl bg-[#070B14]/80 border border-slate-800/90 shrink-0">
                  <div className="flex items-baseline justify-between gap-4 mb-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                      Индекс готовности ПК
                    </span>
                    <span
                      data-testid="scanner-score"
                      className={`text-3xl font-extrabold font-mono tabular-nums ${scoreAccent.text}`}
                    >
                      {evaluation.score}/100
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-lg bg-slate-800 overflow-hidden mb-3">
                    <div
                      className={`h-full bg-gradient-to-r ${scoreAccent.bar} transition-all duration-500`}
                      style={{ width: `${evaluation.score}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyToGenerator}
                    className="w-full px-4 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs sm:text-sm transition inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <span>Подобрать скрипт под ПК</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                  {appliedNotice && (
                    <div className="mt-2 text-xs text-emerald-300 font-medium text-center">
                      Модули выбраны в генераторе ниже ✓
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detected Telemetry Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#0E1525] border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1.5">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span>ВИДЕОКАРТА (GPU)</span>
                </div>
                <div
                  className="text-sm font-semibold text-white truncate"
                  title={windowsReport?.gpuName || scanData.gpuRenderer}
                >
                  {windowsReport?.gpuName || scanData.gpuRenderer}
                </div>
                <div className="text-xs text-slate-400 mt-1">{evaluation.gpuInfo.label}</div>
              </div>

              <div className="p-4 rounded-xl bg-[#0E1525] border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1.5">
                  <Cpu className="w-4 h-4 text-violet-400" />
                  <span>ПРОЦЕССОР И ОЗУ</span>
                </div>
                <div
                  className="text-sm font-semibold text-white truncate"
                  title={windowsReport?.cpuName || `${scanData.cpuCores} логических потоков`}
                >
                  {windowsReport?.cpuName || `${scanData.cpuCores} логических потоков`}
                </div>
                <div className="text-xs text-slate-400 mt-1">{ramSummary}</div>
              </div>

              <div className="p-4 rounded-xl bg-[#0E1525] border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1.5">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  <span>ЭКРАН И ФРЕЙМТАЙМ</span>
                </div>
                <div className="text-sm font-semibold text-white font-mono tabular-nums">
                  {scanData.screenWidth}×{scanData.screenHeight} · {scanData.measuredHz} Гц
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                  Кадр {scanData.avgFrameMs} мс · джиттер {scanData.frameJitterMs} мс
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0E1525] border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1.5">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>ОС И СЕТЬ</span>
                </div>
                <div className="text-sm font-semibold text-white truncate">{scanData.osName}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {windowsReport
                    ? `Питание: ${POWER_PLAN_LABELS[windowsReport.powerPlan || ''] || windowsReport.powerPlan || '—'} · C: ${windowsReport.ssdFreePercent ?? '?'}%`
                    : scanData.connectionRttMs !== null
                      ? `Задержка сети ~${scanData.connectionRttMs} мс`
                      : 'Базовый режим браузера'}
                </div>
              </div>
            </div>

            {/* Actionable Recommendations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  <span>Что нужно сделать, чтобы прибавить FPS</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Найдено пунктов: {evaluation.recommendations.length}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {evaluation.recommendations.map((rec) => {
                  const style = getPriorityStyle(rec.priority);
                  return (
                    <div
                      key={rec.id}
                      className={`p-5 rounded-xl border ${style.cardBorder} flex flex-col justify-between gap-3`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md border text-xs font-mono font-medium inline-flex items-center gap-1.5 ${style.badgeClass}`}
                          >
                            {rec.priority === 'ok' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5" />
                            )}
                            {style.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-mono tabular-nums">
                            {rec.fpsImpact}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white mb-1">{rec.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed mb-2.5">{rec.reason}</p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-800/80 text-xs text-slate-200 leading-relaxed">
                        <span className="text-cyan-400 font-semibold">Что сделать: </span>
                        {rec.action}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Honest Optional Deep Windows PowerShell Diagnostic */}
        <div className="mt-6 rounded-2xl bg-[#0E1525] border border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setDeepOpen((prev) => !prev)}
            aria-expanded={deepOpen}
            className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-900/50 transition cursor-pointer"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
                <Terminal className="w-4 h-4 text-violet-300" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                  <span>Глубокая диагностика Windows (PowerShell)</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono">
                    XMP · Питание · GameDVR · SSD
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Браузер по соображениям безопасности не видит частоту ОЗУ, схему питания и место на
                  диске — проверь их за 5 секунд read-only скриптом.
                </div>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${
                deepOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {deepOpen && (
            <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-4">
              <div className="grid lg:grid-cols-2 gap-5 items-start">
                <div className="space-y-3">
                  <div className="text-xs font-mono text-slate-300">
                    1. Запусти этот безопасный скрипт (он только читает параметры):
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyDiagScript}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {diagCopied ? 'Скрипт скопирован ✓' : 'Копировать PowerShell-скрипт'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadDiagScript}
                      className="px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-xs font-medium text-violet-200 transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Скачать OptiCore_Diag.ps1
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#070B14] border border-slate-800 text-[11px] font-mono text-cyan-100/90 overflow-x-auto max-h-44 leading-relaxed">
                    <code>{WINDOWS_DIAG_SCRIPT}</code>
                  </pre>
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="windows-diag-input"
                    className="block text-xs font-mono text-slate-300"
                  >
                    2. Вставь строку результата <code className="text-cyan-300">OPTICORE:{'{...}'}</code>{' '}
                    сюда:
                  </label>
                  <textarea
                    id="windows-diag-input"
                    value={rawReport}
                    onChange={(e) => {
                      setRawReport(e.target.value);
                      if (reportError) setReportError(null);
                    }}
                    rows={5}
                    placeholder='OPTICORE:{"cpuName":"AMD Ryzen 5 5600X","gpuName":"NVIDIA GeForce RTX 3060","ramTotalGb":16,"ramSpeedMhz":3200,"powerPlan":"balanced","gameDvrEnabled":true,"ssdFreePercent":24,"startupCount":8}'
                    className="w-full p-3 rounded-xl bg-[#070B14] border border-slate-700 focus:border-cyan-400 focus:outline-none text-xs font-mono text-slate-100 placeholder:text-slate-600"
                  />

                  {reportError && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/35 text-xs text-rose-200"
                    >
                      {reportError}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleAnalyzeReport}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                    >
                      Проанализировать отчёт
                    </button>
                    {windowsReport && (
                      <button
                        type="button"
                        onClick={handleClearReport}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Сбросить отчёт
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
