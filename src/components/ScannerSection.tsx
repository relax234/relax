import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUp,
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
import { copyTextSafe } from '../utils/clipboard';
import {
  WINDOWS_DIAG_SCRIPT,
  evaluatePcScan,
  getChecklistIdsFromWindowsReport,
  parseWindowsDiagReport,
  type HardwareScanInput,
  type RecommendationPriority,
  type WindowsDiagReport,
} from '../utils/scanner';

interface ScannerSectionProps {
  scanData: HardwareScanInput | null;
  scanning: boolean;
  progress: number;
  statusText: string;
  windowsReport: WindowsDiagReport | null;
  onStartScan: () => Promise<void>;
  onWindowsReportChange: (report: WindowsDiagReport | null) => void;
  onApplyRecommendedModules: (moduleIds: string[]) => void;
  onAddModules?: (moduleIds: string[]) => void;
  onSyncChecklistItems?: (itemIds: string[]) => void;
}

type RecFilter = 'all' | 'high' | 'medium' | 'ok';

const POWER_PLAN_LABELS: Record<string, string> = {
  ultimate: 'Максимальная производительность',
  high: 'Высокая производительность',
  balanced: 'Сбалансированная',
  powersaver: 'Экономия энергии',
};

function getScoreAccent(score: number, windowsVerified: boolean): {
  text: string;
  stroke: string;
  labelClass: string;
} {
  if (!windowsVerified) {
    return {
      text: 'text-slate-200',
      stroke: '#94a3b8',
      labelClass: 'text-amber-300',
    };
  }
  if (score >= 82) {
    return {
      text: 'text-white',
      stroke: '#fcd34d',
      labelClass: 'text-emerald-300',
    };
  }
  if (score >= 55) {
    return {
      text: 'text-amber-300',
      stroke: '#fbbf24',
      labelClass: 'text-amber-300',
    };
  }
  return {
    text: 'text-rose-300',
    stroke: '#fb7185',
    labelClass: 'text-rose-300',
  };
}

function getPriorityStyle(priority: RecommendationPriority): {
  label: string;
  textClass: string;
  cardBorder: string;
} {
  if (priority === 'high') {
    return {
      label: 'Критичная ошибка',
      textClass: 'text-rose-300',
      cardBorder: 'border-rose-400/35 bg-rose-950/20',
    };
  }
  if (priority === 'medium') {
    return {
      label: 'Требует настройки',
      textClass: 'text-amber-300',
      cardBorder: 'border-amber-300/30 winter-card',
    };
  }
  return {
    label: 'В норме',
    textClass: 'text-emerald-300',
    cardBorder: 'border-sky-200/12 winter-card',
  };
}

function FrameCadenceSparkline({ deltas }: { deltas: number[] }) {
  if (deltas.length < 3) return null;
  const max = Math.max(25, ...deltas);
  const min = Math.min(4, ...deltas);
  const span = Math.max(4, max - min);
  const w = 180;
  const h = 28;
  const points = deltas
    .map((d, idx) => {
      const x = (idx / (deltas.length - 1)) * w;
      const y = h - ((d - min) / span) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-6 mt-1.5 overflow-visible"
      aria-label="График замеренных интервалов кадров"
    >
      <polyline
        fill="none"
        stroke="#fcd34d"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function buildImmediateScanFromReport(report: WindowsDiagReport): HardwareScanInput {
  const hz = report.windowsDisplayHz || 60;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const screenWidth =
    typeof window !== 'undefined' ? Math.round((window.screen.width || 1920) * dpr) : 1920;
  const screenHeight =
    typeof window !== 'undefined' ? Math.round((window.screen.height || 1080) * dpr) : 1080;

  return {
    cpuCores:
      report.cpuThreads ||
      (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4),
    deviceMemoryGb: report.ramTotalGb ?? null,
    gpuRenderer: report.gpuName || 'Видеокарта (из отчёта Windows)',
    gpuVendorRaw: report.gpuName || '',
    screenWidth,
    screenHeight,
    measuredHz: hz,
    avgFrameMs: Number((1000 / Math.max(30, hz)).toFixed(1)),
    frameJitterMs: 0.4,
    osName: report.osCaption || 'Windows 10 / 11',
    isWindows: true,
    connectionRttMs: null,
    windowsReport: report,
  };
}

export function ScannerSection({
  scanData,
  scanning,
  progress,
  statusText,
  windowsReport,
  onStartScan,
  onWindowsReportChange,
  onApplyRecommendedModules,
  onAddModules,
  onSyncChecklistItems,
}: ScannerSectionProps) {
  const [recFilter, setRecFilter] = useState<RecFilter>('all');

  const [deepOpen, setDeepOpen] = useState(true);
  const [diagCopied, setDiagCopied] = useState(false);
  const [rawReport, setRawReport] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [appliedNotice, setAppliedNotice] = useState(false);
  const [addedRecId, setAddedRecId] = useState<string | null>(null);

  const effectiveScanData =
    scanData ?? (windowsReport ? buildImmediateScanFromReport(windowsReport) : null);
  const evaluation = effectiveScanData
    ? evaluatePcScan({ ...effectiveScanData, windowsReport })
    : null;

  const handleStartScan = async () => {
    if (scanning) return;
    setAppliedNotice(false);
    setRecFilter('all');
    await onStartScan();
  };

  const handleCopyDiagScript = async () => {
    const ok = await copyTextSafe(WINDOWS_DIAG_SCRIPT);
    if (ok) {
      setDiagCopied(true);
      window.setTimeout(() => setDiagCopied(false), 1800);
    }
  };

  const handleDownloadDiagScript = () => {
    const crlf = WINDOWS_DIAG_SCRIPT.replace(/\r?\n/g, '\r\n');
    const blob = new Blob([`\uFEFF${crlf}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OptiCore_Diag.ps1';
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyParsedReport = (report: WindowsDiagReport, shouldScroll: boolean) => {
    setReportError(null);
    setRecFilter('all');
    onWindowsReportChange(report);

    const verifiedIds = getChecklistIdsFromWindowsReport(report);
    setSyncedCount(verifiedIds.length);
    if (verifiedIds.length > 0 && onSyncChecklistItems) {
      onSyncChecklistItems(verifiedIds);
    }

    if (!scanData && !scanning) {
      void onStartScan();
    }

    if (shouldScroll) {
      window.setTimeout(() => {
        document.getElementById('scan-results')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 90);
    }
  };

  const handleRawReportChange = (nextValue: string) => {
    setRawReport(nextValue);
    if (reportError) setReportError(null);

    const trimmed = nextValue.trim();
    if (trimmed.includes('OPTICORE:') && trimmed.includes('}')) {
      const parsed = parseWindowsDiagReport(trimmed);
      if (parsed.ok) {
        void applyParsedReport(parsed.report, true);
      }
    }
  };

  const handleAnalyzeReport = () => {
    const parsed = parseWindowsDiagReport(rawReport);
    if (!parsed.ok) {
      setReportError(parsed.error);
      return;
    }

    applyParsedReport(parsed.report, true);
  };

  const handleClearReport = () => {
    onWindowsReportChange(null);
    setSyncedCount(null);
    setRawReport('');
    setReportError(null);
  };

  const handleApplyToGenerator = () => {
    if (!evaluation) return;
    setAppliedNotice(true);
    onApplyRecommendedModules(evaluation.recommendedModuleIds);
    window.setTimeout(() => setAppliedNotice(false), 3000);
  };

  const scrollToWindowsDiag = () => {
    setDeepOpen(true);
    window.setTimeout(() => {
      document.getElementById('windows-diag-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 60);
  };

  const ramSummary = (() => {
    if (!effectiveScanData) return '';
    if (windowsReport?.ramTotalGb) {
      const speedPart = windowsReport.ramSpeedMhz ? ` · ${windowsReport.ramSpeedMhz} МГц` : '';
      const freePart =
        windowsReport.ramFreeGb !== undefined ? ` · своб. ${windowsReport.ramFreeGb} ГБ` : '';
      const channelPart =
        windowsReport.ramStickCount === 1
          ? ' · 1 пл. (одноканал!)'
          : windowsReport.ramStickCount && windowsReport.ramStickCount >= 2
            ? ` · ${windowsReport.ramStickCount} пл.`
            : '';
      return `${windowsReport.ramTotalGb} ГБ ОЗУ${speedPart}${channelPart}${freePart}`;
    }
    if (effectiveScanData.deviceMemoryGb === 8) {
      return `≥ 8 ГБ ОЗУ (лимит браузера) · ${effectiveScanData.cpuCores} пот.`;
    }
    if (effectiveScanData.deviceMemoryGb !== null) {
      return `~${effectiveScanData.deviceMemoryGb} ГБ ОЗУ · ${effectiveScanData.cpuCores} пот.`;
    }
    return `Объём ОЗУ скрыт браузером · ${effectiveScanData.cpuCores} пот.`;
  })();

  const scoreAccent = evaluation
    ? getScoreAccent(evaluation.score, evaluation.windowsVerified)
    : null;
  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = evaluation
    ? ringCircumference * (1 - evaluation.score / 100)
    : ringCircumference;

  const filteredRecommendations = evaluation
    ? evaluation.recommendations.filter((r) => recFilter === 'all' || r.priority === recFilter)
    : [];

  const counts = evaluation
    ? {
        all: evaluation.recommendations.length,
        high: evaluation.recommendations.filter((r) => r.priority === 'high').length,
        medium: evaluation.recommendations.filter((r) => r.priority === 'medium').length,
        ok: evaluation.recommendations.filter((r) => r.priority === 'ok').length,
      }
    : { all: 0, high: 0, medium: 0, ok: 0 };

  const failedChecksCount = evaluation
    ? evaluation.verifiedChecks.filter((c) => !c.passed).length
    : 0;
  const passedChecksCount = evaluation
    ? evaluation.verifiedChecks.filter((c) => c.passed).length
    : 0;

  return (
    <section
      id="scanner"
      className="py-9 sm:py-11 px-4 sm:px-6 border-t border-sky-200/10 bg-[#080d19]/55"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-mono text-amber-200/90 tracking-wide">
              01 · Честная диагностика ПК, BIOS и Windows
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 text-white">
              Сканер системы и реальный аудит ОС
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Браузер нагружает GPU шейдерами и замеряет фреймтайм, а PowerShell-скрипт считывает
              параметры BIOS/UEFI, ReBAR, XMP, SMART-диска, Windows и сети (40+ проверок).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleStartScan}
              disabled={scanning}
              className="px-5 py-2.5 rounded-xl bg-amber-300 hover:bg-amber-200 disabled:opacity-60 text-slate-950 font-bold text-sm glow-btn inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
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
          <div className="mb-5 p-4 rounded-2xl winter-card border border-amber-300/25">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity className="w-4 h-4 text-amber-300" />
                <span>{statusText || 'Анализ системы и нагрузка GPU...'}</span>
              </div>
              <span className="text-sm font-mono font-bold text-amber-200 tabular-nums">
                {progress}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-md bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-amber-300 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Empty Prompt State before first scan */}
        {!effectiveScanData && !scanning && (
          <div className="p-5 sm:p-6 rounded-2xl winter-card border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="text-base font-bold text-white">
                Начни с теста GPU/браузера или сразу вставь отчёт PowerShell ниже
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Для точного процента оптимизации Windows, BIOS/UEFI, ReBAR и сети запусти безопасный
                read-only скрипт ниже — он покажет реальные узкие места и соберёт скрипт исправлений.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartScan}
              className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-amber-300 hover:text-slate-950 border border-sky-200/20 text-slate-100 font-semibold text-sm transition shrink-0 cursor-pointer inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Gauge className="w-4 h-4" />
              Запустить тест
            </button>
          </div>
        )}

        {/* Results Dashboard */}
        {effectiveScanData && evaluation && scoreAccent && (
          <div id="scan-results" className="space-y-4 animate-fade-up">
            {/* Overall Readiness Verdict Card */}
            <div className="p-5 rounded-2xl winter-card border">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* Circular Score Ring */}
                  <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                      <circle
                        cx="50"
                        cy="50"
                        r={ringRadius}
                        fill="none"
                        stroke="rgba(148, 163, 184, 0.25)"
                        strokeWidth="7"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r={ringRadius}
                        fill="none"
                        stroke={scoreAccent.stroke}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        data-testid="scanner-score"
                        className={`text-lg font-extrabold font-mono tabular-nums ${scoreAccent.text}`}
                      >
                        {evaluation.windowsVerified
                          ? `${evaluation.optimizationScore}%`
                          : `${evaluation.hardwareScore}/100`}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {evaluation.windowsVerified ? 'оптимизация' : 'база ПК'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className={`font-semibold ${scoreAccent.labelClass}`}>
                        {evaluation.verdictBadge}
                      </span>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-300">
                        Потенциал: {evaluation.estimatedFpsGain}
                      </span>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span
                        data-testid="scanner-checks-count"
                        className="text-slate-400 tabular-nums"
                      >
                        Проверено: {evaluation.checksCount} параметров
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      {evaluation.verdictTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {evaluation.verdictDescription}
                    </p>
                  </div>
                </div>

                <div className="lg:min-w-[260px] flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                  {evaluation.windowsVerified ? (
                    <button
                      type="button"
                      onClick={handleApplyToGenerator}
                      className="px-4 py-2.5 rounded-xl bg-amber-300 hover:bg-amber-200 text-slate-950 font-bold text-sm glow-btn inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <span>Подобрать скрипт под ПК</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={scrollToWindowsDiag}
                      className="px-4 py-2.5 rounded-xl bg-amber-300 hover:bg-amber-200 text-slate-950 font-bold text-sm glow-btn inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <Terminal className="w-4 h-4 shrink-0" />
                      <span>Проверить Windows и BIOS</span>
                    </button>
                  )}

                  <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 text-xs text-slate-400">
                    {appliedNotice ? (
                      <span className="text-emerald-300 font-medium">
                        Модули отмечены в генераторе ниже ✓
                      </span>
                    ) : (
                      <span>
                        Рекомендовано модулей: {evaluation.recommendedModuleIds.length}
                      </span>
                    )}
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyToGenerator}
                      className="text-amber-200 hover:text-amber-100 underline-offset-4 hover:underline cursor-pointer whitespace-nowrap"
                    >
                      В скрипт →
                    </button>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <a
                      href="#compare"
                      className="text-slate-300 hover:text-white font-medium whitespace-nowrap"
                    >
                      Сравнить ↓
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Detected Telemetry Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="min-w-0 p-3.5 rounded-xl winter-card border">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-200/80 mb-1">
                  <Monitor className="w-3.5 h-3.5 text-amber-300" />
                  <span>Видеокарта (GPU)</span>
                </div>
                <div
                  className="text-sm font-semibold text-white truncate"
                  title={windowsReport?.gpuName || effectiveScanData.gpuRenderer}
                >
                  {windowsReport?.gpuName || effectiveScanData.gpuRenderer}
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {evaluation.gpuInfo.label}
                  {windowsReport?.gpuVramGb ? ` · ${windowsReport.gpuVramGb} ГБ VRAM` : ''}
                  {windowsReport?.rebarEnabled === true
                    ? ' · ReBAR ВКЛ'
                    : windowsReport?.rebarEnabled === false
                      ? ' · ReBAR ВЫКЛ'
                      : ''}
                </div>
                {windowsReport?.gpuDriverVersion ? (
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums truncate">
                    Драйвер {windowsReport.gpuDriverVersion}
                    {windowsReport.gpuDriverAgeDays !== undefined
                      ? ` (${windowsReport.gpuDriverAgeDays} дн.)`
                      : ''}
                  </div>
                ) : (
                  effectiveScanData.maxTextureSize && (
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                      {effectiveScanData.webgl2Supported ? 'WebGL2' : 'WebGL1'} ·{' '}
                      {effectiveScanData.maxTextureSize}px
                    </div>
                  )
                )}
              </div>

              <div className="min-w-0 p-3.5 rounded-xl winter-card border">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-200/80 mb-1">
                  <Cpu className="w-3.5 h-3.5 text-amber-300" />
                  <span>Процессор и ОЗУ</span>
                </div>
                <div
                  className="text-sm font-semibold text-white truncate"
                  title={
                    windowsReport?.cpuName || `${effectiveScanData.cpuCores} логических потоков`
                  }
                >
                  {windowsReport?.cpuName || `${effectiveScanData.cpuCores} логических потоков`}
                </div>
                <div className="text-xs text-slate-300 mt-0.5">{ramSummary}</div>
                {windowsReport && (
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums truncate">
                    {windowsReport.cpuThreads ?? effectiveScanData.cpuCores} пот.
                    {windowsReport.ramRatedMhz && windowsReport.ramSpeedMhz
                      ? ` · SPD ${windowsReport.ramRatedMhz}`
                      : ''}
                    {windowsReport.cpuLoadPercent !== undefined
                      ? ` · фон ${windowsReport.cpuLoadPercent}%`
                      : ''}
                    {windowsReport.topRamApp
                      ? ` · ${windowsReport.topRamApp}: ${windowsReport.topRamMb ?? '?'}МБ`
                      : ''}
                  </div>
                )}
              </div>

              <div className="min-w-0 p-3.5 rounded-xl winter-card border">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-200/80 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-amber-300" />
                  <span>Экран и тест GPU</span>
                </div>
                <div className="text-sm font-semibold text-white font-mono tabular-nums">
                  {effectiveScanData.screenWidth}×{effectiveScanData.screenHeight} ·{' '}
                  {windowsReport?.windowsDisplayHz ?? effectiveScanData.measuredHz} Гц
                  {windowsReport?.windowsMaxHz &&
                  windowsReport.windowsDisplayHz &&
                  windowsReport.windowsMaxHz > windowsReport.windowsDisplayHz + 5
                    ? ` (макс ${windowsReport.windowsMaxHz})`
                    : ''}
                </div>
                <div className="text-xs text-slate-300 mt-0.5 font-mono tabular-nums">
                  {effectiveScanData.gpuStressFps
                    ? `GPU тест: ${effectiveScanData.gpuStressFps} FPS · джиттер ${effectiveScanData.gpuStressJitterMs ?? effectiveScanData.frameJitterMs}мс${
                        effectiveScanData.gpuStressDrops
                          ? ` · ${effectiveScanData.gpuStressDrops} спадов`
                          : ''
                      }`
                    : `Кадр ${effectiveScanData.avgFrameMs} мс · джиттер ${effectiveScanData.frameJitterMs} мс`}
                </div>
                {effectiveScanData.frameDeltas && effectiveScanData.frameDeltas.length > 2 && (
                  <FrameCadenceSparkline deltas={effectiveScanData.frameDeltas} />
                )}
              </div>

              <div className="min-w-0 p-3.5 rounded-xl winter-card border">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-200/80 mb-1">
                  <Activity className="w-3.5 h-3.5 text-amber-300" />
                  <span>ОС, BIOS и диски</span>
                </div>
                <div
                  className="text-sm font-semibold text-white truncate"
                  title={
                    windowsReport?.moboName
                      ? `${windowsReport.moboName} (${windowsReport.bootMode || 'UEFI'})`
                      : windowsReport?.osCaption || effectiveScanData.osName
                  }
                >
                  {windowsReport?.moboName
                    ? `${windowsReport.moboName}`
                    : windowsReport?.osCaption || effectiveScanData.osName}
                </div>
                <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {windowsReport
                    ? `${windowsReport.bootMode || 'UEFI'}${
                        windowsReport.biosVersion ? ` · BIOS ${windowsReport.biosVersion}` : ''
                      } · ${POWER_PLAN_LABELS[windowsReport.powerPlan || ''] || windowsReport.powerPlan || '—'} · C: ${windowsReport.systemDriveBus || windowsReport.systemDriveType || 'Диск'} (${windowsReport.ssdFreePercent ?? '?'}%)${
                        windowsReport.tcpRscEnabled !== undefined
                          ? ` · RSC ${windowsReport.tcpRscEnabled ? 'Вкл' : 'Выкл'}`
                          : ''
                      }`
                    : effectiveScanData.onBattery
                      ? `От батареи (${effectiveScanData.batteryLevelPercent ?? '?'}%) — лимит мощности`
                      : effectiveScanData.connectionRttMs !== null
                        ? `Задержка сети ~${effectiveScanData.connectionRttMs} мс · Реестр и BIOS не проверены`
                        : 'Реестр Windows и BIOS ещё не проверены'}
                </div>
              </div>
            </div>

            {/* Verified Real Windows Parameters Matrix */}
            {evaluation.windowsVerified && evaluation.verifiedChecks.length > 0 && (
              <div
                data-testid="verified-windows-checks"
                className="p-4 sm:p-5 rounded-2xl winter-card border space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Реальные параметры Windows, BIOS/UEFI и сети по отчёту
                    </h3>
                    <p className="text-xs text-slate-300">
                      Проверено {evaluation.verifiedChecks.length} параметров: {passedChecksCount} в
                      норме, {failedChecksCount} требуют настройки.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-amber-200 tabular-nums">
                    Оптимизация ОС: {evaluation.optimizationScore}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {evaluation.verifiedChecks.map((check) => (
                    <div
                      key={check.id}
                      className={`p-2.5 rounded-xl border text-xs ${
                        check.passed
                          ? 'bg-[#070b14]/85 border-sky-200/12'
                          : 'bg-rose-950/25 border-rose-400/35'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <span className="text-slate-300 truncate">{check.label}</span>
                        {check.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                        )}
                      </div>
                      <div
                        className={`font-mono font-semibold truncate ${
                          check.passed ? 'text-slate-100' : 'text-rose-200'
                        }`}
                        title={check.valueText}
                      >
                        {check.valueText}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Recommendations + Interactive Filter Tabs */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-300" />
                  <span>Что нужно сделать и какие ошибки найдены</span>
                </h3>

                <div
                  role="tablist"
                  aria-label="Фильтр рекомендаций"
                  className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg winter-card border"
                >
                  {(
                    [
                      { id: 'all', label: `Все (${counts.all})` },
                      { id: 'high', label: `Ошибки (${counts.high})` },
                      { id: 'medium', label: `Настройки (${counts.medium})` },
                      { id: 'ok', label: `Норма (${counts.ok})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={recFilter === tab.id}
                      onClick={() => setRecFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        recFilter === tab.id
                          ? 'bg-amber-300 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredRecommendations.length === 0 ? (
                <div className="p-4 rounded-xl winter-card border text-sm text-slate-300">
                  В этой категории нет пунктов — переключитесь на вкладку «Все».
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {filteredRecommendations.map((rec) => {
                    const style = getPriorityStyle(rec.priority);
                    return (
                      <div
                        key={rec.id}
                        className={`p-4 rounded-xl border ${style.cardBorder} flex flex-col justify-between gap-2.5 transition-colors`}
                      >
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 text-xs font-mono">
                            <span
                              className={`font-semibold inline-flex items-center gap-1.5 ${style.textClass}`}
                            >
                              {rec.priority === 'ok' ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              )}
                              {style.label}
                            </span>
                            <span className="text-slate-300 tabular-nums">{rec.fpsImpact}</span>
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                            {rec.title}
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">{rec.reason}</p>
                        </div>

                        <div className="pt-2.5 border-t border-sky-200/12 flex flex-wrap items-end justify-between gap-2.5 text-xs text-slate-200 leading-relaxed">
                          <div className="min-w-0 flex-1">
                            <span className="text-amber-200 font-semibold">Что сделать: </span>
                            {rec.action}
                          </div>
                          {rec.moduleIds.length > 0 && onAddModules && (
                            <button
                              type="button"
                              onClick={() => {
                                setAddedRecId(rec.id);
                                onAddModules(rec.moduleIds);
                                window.setTimeout(() => setAddedRecId(null), 2000);
                              }}
                              className="px-2.5 py-1 rounded-md bg-slate-900 border border-sky-200/20 hover:bg-amber-300 hover:text-slate-950 text-slate-100 font-mono text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              {addedRecId === rec.id ? 'Добавлено ✓' : 'В скрипт →'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Honest Deep Windows, BIOS & Network PowerShell Diagnostic */}
        <div
          id="windows-diag-panel"
          className="mt-5 rounded-2xl winter-card border overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setDeepOpen((prev) => !prev)}
            aria-expanded={deepOpen}
            className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-slate-900/50 transition cursor-pointer"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-300/15 border border-amber-300/35 flex items-center justify-center shrink-0">
                <Terminal className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                  <span>Глубокая проверка Windows, BIOS и сети (PowerShell · 40+ параметров)</span>
                  <span className="text-xs font-mono font-normal text-amber-200/80">
                    BIOS/UEFI · ReBAR · XMP · VRAM · Драйвер · SMART · Сеть (RSC/QoS)
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Только чтение за 5 секунд: сканирует вплоть до версии BIOS, режима UEFI/Legacy,
                  ReBAR, NVMe/SMART, конфликтных твиков (MPO/BCD), сети и копирует{' '}
                  <code className="text-amber-200 font-mono">OPTICORE:{'{...}'}</code>.
                </div>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                deepOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {deepOpen && (
            <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-sky-200/12 space-y-3">
              <div className="grid lg:grid-cols-2 gap-4 items-start">
                <div className="min-w-0 space-y-2.5">
                  <div className="text-xs font-mono text-slate-300">
                    1. Скопируй код в PowerShell или скачай read-only файл:
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyDiagScript}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-sky-200/20 hover:bg-slate-800 text-xs font-medium text-slate-100 transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-300" />
                      {diagCopied ? 'Скрипт скопирован ✓' : 'Копировать PowerShell-скрипт'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadDiagScript}
                      className="px-3 py-1.5 rounded-lg bg-amber-300 hover:bg-amber-200 text-xs font-semibold text-slate-950 transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Скачать OptiCore_Diag.ps1
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-[#070b14] border border-sky-200/15 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-36 leading-relaxed">
                    <code>{WINDOWS_DIAG_SCRIPT}</code>
                  </pre>
                </div>

                <div className="min-w-0 space-y-2.5">
                  <label
                    htmlFor="windows-diag-input"
                    className="block text-xs font-mono text-slate-300"
                  >
                    2. Вставь строку результата{' '}
                    <code className="text-amber-200">OPTICORE:{'{...}'}</code> сюда (разберётся
                    автоматически):
                  </label>
                  <textarea
                    id="windows-diag-input"
                    value={rawReport}
                    onChange={(e) => handleRawReportChange(e.target.value)}
                    rows={4}
                    placeholder='OPTICORE:{"cpuName":"AMD Ryzen 5 5600X","moboName":"MSI B550-A PRO","biosVersion":"A.E0","bootMode":"UEFI","rebarEnabled":true,"gpuName":"NVIDIA GeForce RTX 3060","ramTotalGb":16,"ramSpeedMhz":3200,"ramRatedMhz":3200,"ramStickCount":2,"powerPlan":"balanced","tcpRscEnabled":true,"qosReservedPercent":20}'
                    className="w-full p-3 rounded-xl bg-[#070b14] border border-sky-200/20 focus:border-amber-300 focus:outline-none text-xs font-mono text-slate-100 placeholder:text-slate-600"
                  />

                  {reportError && (
                    <div
                      role="alert"
                      className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-400/35 text-xs text-rose-200"
                    >
                      {reportError}
                    </div>
                  )}

                  {windowsReport && evaluation && evaluation.windowsVerified && !reportError && (
                    <div
                      data-testid="diag-parsed-banner"
                      className="p-2.5 rounded-lg bg-[#070b14] border border-emerald-400/30 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-slate-200 font-mono">
                        Отчёт разобран: оптимизация ОС{' '}
                        <strong className="text-amber-200">{evaluation.optimizationScore}%</strong>{' '}
                        · проблем: {failedChecksCount}
                      </span>
                      <a
                        href="#scan-results"
                        className="text-amber-200 hover:underline inline-flex items-center gap-1 font-medium whitespace-nowrap"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>К ошибкам</span>
                      </a>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAnalyzeReport}
                      className="px-4 py-2 rounded-lg bg-amber-300 hover:bg-amber-200 text-slate-950 font-bold text-xs transition cursor-pointer"
                    >
                      Проанализировать отчёт
                    </button>
                    {windowsReport && (
                      <button
                        type="button"
                        onClick={handleClearReport}
                        className="px-3 py-2 rounded-lg bg-slate-900 border border-sky-200/20 hover:bg-slate-800 text-slate-300 text-xs transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Сбросить отчёт
                      </button>
                    )}
                    {syncedCount !== null && syncedCount > 0 && (
                      <span
                        data-testid="checklist-sync-notice"
                        className="text-xs font-mono text-emerald-300"
                      >
                        Синхронизировано с чек-листом: {syncedCount} пунктов
                      </span>
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
