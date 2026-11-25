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
      text: 'text-zinc-200',
      stroke: '#a1a1aa',
      labelClass: 'text-amber-300',
    };
  }
  if (score >= 82) {
    return {
      text: 'text-white',
      stroke: '#fafafa',
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
      cardBorder: 'border-rose-500/35 bg-rose-950/15',
    };
  }
  if (priority === 'medium') {
    return {
      label: 'Требует настройки',
      textClass: 'text-amber-300',
      cardBorder: 'border-amber-500/30 bg-[#111113]',
    };
  }
  return {
    label: 'В норме',
    textClass: 'text-emerald-300',
    cardBorder: 'border-zinc-800 bg-[#111113]',
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
        stroke="#fafafa"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
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

  const evaluation = scanData ? evaluatePcScan({ ...scanData, windowsReport }) : null;

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

  const applyParsedReport = async (report: WindowsDiagReport, shouldScroll: boolean) => {
    setReportError(null);
    setRecFilter('all');
    onWindowsReportChange(report);

    const verifiedIds = getChecklistIdsFromWindowsReport(report);
    setSyncedCount(verifiedIds.length);
    if (verifiedIds.length > 0 && onSyncChecklistItems) {
      onSyncChecklistItems(verifiedIds);
    }

    if (!scanData && !scanning) {
      await onStartScan();
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

  const handleAnalyzeReport = async () => {
    const parsed = parseWindowsDiagReport(rawReport);
    if (!parsed.ok) {
      setReportError(parsed.error);
      return;
    }

    await applyParsedReport(parsed.report, true);
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
    if (!scanData) return '';
    if (windowsReport?.ramTotalGb) {
      const speedPart = windowsReport.ramSpeedMhz ? ` · ${windowsReport.ramSpeedMhz} МГц` : '';
      const channelPart =
        windowsReport.ramStickCount === 1
          ? ' · 1 планка (одноканал!)'
          : windowsReport.ramStickCount && windowsReport.ramStickCount >= 2
            ? ` · ${windowsReport.ramStickCount} планки`
            : '';
      return `${windowsReport.ramTotalGb} ГБ ОЗУ${speedPart}${channelPart} · ${scanData.cpuCores} пот.`;
    }
    if (scanData.deviceMemoryGb === 8) {
      return `≥ 8 ГБ ОЗУ (лимит браузера) · ${scanData.cpuCores} пот.`;
    }
    if (scanData.deviceMemoryGb !== null) {
      return `~${scanData.deviceMemoryGb} ГБ ОЗУ · ${scanData.cpuCores} пот.`;
    }
    return `Объём ОЗУ скрыт браузером · ${scanData.cpuCores} пот.`;
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
      className="py-9 sm:py-11 px-4 sm:px-6 border-t border-zinc-800/80 bg-zinc-950/50"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-mono text-zinc-400 tracking-wide">
              01 · Честная диагностика ПК и Windows
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 text-white">
              Сканер системы и реальный аудит ОС
            </h2>
            <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
              Браузер проверяет GPU, CPU, герцовку и фреймтайм, а PowerShell-скрипт считывает
              настоящие параметры Windows и находит ошибки оптимизации.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleStartScan}
              disabled={scanning}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-60 text-zinc-950 font-bold text-sm glow-btn inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
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
          <div className="mb-5 p-4 rounded-2xl bg-[#111113] border border-zinc-700">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity className="w-4 h-4" />
                <span>{statusText || 'Анализ системы...'}</span>
              </div>
              <span className="text-sm font-mono font-bold text-white tabular-nums">
                {progress}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-md bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Empty Prompt State before first scan */}
        {!scanData && !scanning && (
          <div className="p-5 sm:p-6 rounded-2xl bg-[#111113] border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="text-base font-bold text-white">
                Начни с теста браузера или сразу вставь отчёт PowerShell ниже
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Для точного процента оптимизации Windows запусти безопасный read-only скрипт ниже —
                он сразу покажет ошибки реестра, XMP, HAGS, питания и подскажет, что исправить.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartScan}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-white hover:text-zinc-950 border border-zinc-700 text-zinc-100 font-semibold text-sm transition shrink-0 cursor-pointer inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Gauge className="w-4 h-4" />
              Запустить тест
            </button>
          </div>
        )}

        {/* Results Dashboard */}
        {scanData && evaluation && scoreAccent && (
          <div id="scan-results" className="space-y-4">
            {/* Overall Readiness Verdict Card */}
            <div className="p-5 rounded-2xl bg-[#111113] border border-zinc-800">
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
                        stroke="rgba(63, 63, 70, 0.55)"
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
                      <span className="text-[10px] font-mono text-zinc-400">
                        {evaluation.windowsVerified ? 'оптимизация' : 'база ПК'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className={`font-semibold ${scoreAccent.labelClass}`}>
                        {evaluation.verdictBadge}
                      </span>
                      <span className="text-zinc-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-zinc-300">
                        Потенциал: {evaluation.estimatedFpsGain}
                      </span>
                      <span className="text-zinc-600" aria-hidden="true">
                        ·
                      </span>
                      <span
                        data-testid="scanner-checks-count"
                        className="text-zinc-400 tabular-nums"
                      >
                        Проверено: {evaluation.checksCount} параметров
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      {evaluation.verdictTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      {evaluation.verdictDescription}
                    </p>
                  </div>
                </div>

                <div className="lg:min-w-[260px] flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                  {evaluation.windowsVerified ? (
                    <button
                      type="button"
                      onClick={handleApplyToGenerator}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm glow-btn inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <span>Подобрать скрипт под ПК</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={scrollToWindowsDiag}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm glow-btn inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <Terminal className="w-4 h-4 shrink-0" />
                      <span>Проверить Windows (PowerShell)</span>
                    </button>
                  )}

                  <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 text-xs text-zinc-400">
                    {appliedNotice ? (
                      <span className="text-emerald-300 font-medium">
                        Модули отмечены в генераторе ниже ✓
                      </span>
                    ) : (
                      <span>
                        Рекомендовано модулей: {evaluation.recommendedModuleIds.length}
                      </span>
                    )}
                    <span className="text-zinc-700" aria-hidden="true">
                      ·
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyToGenerator}
                      className="text-zinc-200 hover:text-white underline-offset-4 hover:underline cursor-pointer whitespace-nowrap"
                    >
                      В скрипт →
                    </button>
                    <span className="text-zinc-700" aria-hidden="true">
                      ·
                    </span>
                    <a
                      href="#compare"
                      className="text-zinc-300 hover:text-white font-medium whitespace-nowrap"
                    >
                      Сравнить ↓
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Detected Telemetry Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="min-w-0 p-3.5 rounded-xl bg-[#111113] border border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
                  <Monitor className="w-3.5 h-3.5 text-zinc-200" />
                  <span>Видеокарта (GPU)</span>
                </div>
                <div
                  className="text-sm font-semibold text-white truncate"
                  title={windowsReport?.gpuName || scanData.gpuRenderer}
                >
                  {windowsReport?.gpuName || scanData.gpuRenderer}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">{evaluation.gpuInfo.label}</div>
                {scanData.maxTextureSize && (
                  <div className="text-[11px] font-mono text-zinc-500 mt-0.5 tabular-nums">
                    {scanData.webgl2Supported ? 'WebGL2' : 'WebGL1'} · {scanData.maxTextureSize}px
                  </div>
                )}
              </div>

              <div className="min-w-0 p-3.5 rounded-xl bg-[#111113] border border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
                  <Cpu className="w-3.5 h-3.5 text-zinc-200" />
                  <span>Процессор и ОЗУ</span>
                </div>
                <div
                  className="text-sm font-semibold text-white truncate"
                  title={windowsReport?.cpuName || `${scanData.cpuCores} логических потоков`}
                >
                  {windowsReport?.cpuName || `${scanData.cpuCores} логических потоков`}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">{ramSummary}</div>
              </div>

              <div className="min-w-0 p-3.5 rounded-xl bg-[#111113] border border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-zinc-200" />
                  <span>Экран и фреймтайм</span>
                </div>
                <div className="text-sm font-semibold text-white font-mono tabular-nums">
                  {scanData.screenWidth}×{scanData.screenHeight} · {scanData.measuredHz} Гц
                </div>
                <div className="text-xs text-zinc-400 mt-0.5 font-mono tabular-nums">
                  Кадр {scanData.avgFrameMs} мс · джиттер {scanData.frameJitterMs} мс
                  {scanData.eventLoopLagMs !== undefined && scanData.eventLoopLagMs !== null
                    ? ` · поток ${scanData.eventLoopLagMs} мс`
                    : ''}
                </div>
                {scanData.frameDeltas && scanData.frameDeltas.length > 2 && (
                  <FrameCadenceSparkline deltas={scanData.frameDeltas} />
                )}
              </div>

              <div className="min-w-0 p-3.5 rounded-xl bg-[#111113] border border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
                  <Activity className="w-3.5 h-3.5 text-zinc-200" />
                  <span>ОС и система</span>
                </div>
                <div className="text-sm font-semibold text-white truncate">{scanData.osName}</div>
                <div className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  {windowsReport
                    ? `Питание: ${POWER_PLAN_LABELS[windowsReport.powerPlan || ''] || windowsReport.powerPlan || '—'} · HAGS: ${windowsReport.hagsEnabled ? 'Вкл' : 'Выкл'} · C: ${windowsReport.ssdFreePercent ?? '?'}%`
                    : scanData.onBattery
                      ? `От батареи (${scanData.batteryLevelPercent ?? '?'}%) — лимит мощности`
                      : scanData.connectionRttMs !== null
                        ? `Задержка сети ~${scanData.connectionRttMs} мс · Реестр не проверен`
                        : 'Реестр Windows ещё не проверен'}
                </div>
              </div>
            </div>

            {/* Verified Real Windows Parameters Matrix */}
            {evaluation.windowsVerified && evaluation.verifiedChecks.length > 0 && (
              <div
                data-testid="verified-windows-checks"
                className="p-4 sm:p-5 rounded-2xl bg-[#111113] border border-zinc-800 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Реальные параметры Windows по отчёту
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Проверено {evaluation.verifiedChecks.length} параметров: {passedChecksCount} в
                      норме, {failedChecksCount} требуют настройки.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-zinc-200 tabular-nums">
                    Оптимизация ОС: {evaluation.optimizationScore}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {evaluation.verifiedChecks.map((check) => (
                    <div
                      key={check.id}
                      className={`p-2.5 rounded-xl border text-xs ${
                        check.passed
                          ? 'bg-zinc-950/80 border-zinc-800'
                          : 'bg-rose-950/20 border-rose-500/35'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <span className="text-zinc-400 truncate">{check.label}</span>
                        {check.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                        )}
                      </div>
                      <div
                        className={`font-mono font-semibold truncate ${
                          check.passed ? 'text-zinc-100' : 'text-rose-200'
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
                  <Wrench className="w-4 h-4 text-zinc-200" />
                  <span>Что нужно сделать и какие ошибки найдены</span>
                </h3>

                <div
                  role="tablist"
                  aria-label="Фильтр рекомендаций"
                  className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#111113] border border-zinc-800"
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
                          ? 'bg-white text-zinc-950 font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredRecommendations.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#111113] border border-zinc-800 text-sm text-zinc-400">
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
                            <span className="text-zinc-300 tabular-nums">{rec.fpsImpact}</span>
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                            {rec.title}
                          </h4>
                          <p className="text-xs text-zinc-400 leading-relaxed">{rec.reason}</p>
                        </div>

                        <div className="pt-2.5 border-t border-zinc-800/80 flex flex-wrap items-end justify-between gap-2.5 text-xs text-zinc-200 leading-relaxed">
                          <div className="min-w-0 flex-1">
                            <span className="text-white font-semibold">Что сделать: </span>
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
                              className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700 hover:bg-white hover:text-zinc-950 text-zinc-200 font-mono text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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

        {/* Honest Deep Windows PowerShell Diagnostic */}
        <div
          id="windows-diag-panel"
          className="mt-5 rounded-2xl bg-[#111113] border border-zinc-800 overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setDeepOpen((prev) => !prev)}
            aria-expanded={deepOpen}
            className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-zinc-900/50 transition cursor-pointer"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
                <Terminal className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                  <span>Глубокая проверка Windows (PowerShell)</span>
                  <span className="text-xs font-mono font-normal text-zinc-400">
                    XMP · ОЗУ · HAGS · Power Throttling · VBS · Реестр · Temp
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Скрипт только читает настройки за 5 секунд, копирует строку{' '}
                  <code className="text-zinc-200 font-mono">OPTICORE:{'{...}'}</code> и сразу
                  показывает реальный % и ошибки Windows.
                </div>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform duration-200 ${
                deepOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {deepOpen && (
            <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-zinc-800 space-y-3">
              <div className="grid lg:grid-cols-2 gap-4 items-start">
                <div className="min-w-0 space-y-2.5">
                  <div className="text-xs font-mono text-zinc-300">
                    1. Скопируй код в PowerShell или скачай read-only файл:
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyDiagScript}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-xs font-medium text-zinc-100 transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {diagCopied ? 'Скрипт скопирован ✓' : 'Копировать PowerShell-скрипт'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadDiagScript}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-xs font-semibold text-zinc-950 transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Скачать OptiCore_Diag.ps1
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-36 leading-relaxed">
                    <code>{WINDOWS_DIAG_SCRIPT}</code>
                  </pre>
                </div>

                <div className="min-w-0 space-y-2.5">
                  <label
                    htmlFor="windows-diag-input"
                    className="block text-xs font-mono text-zinc-300"
                  >
                    2. Вставь строку результата{' '}
                    <code className="text-white">OPTICORE:{'{...}'}</code> сюда (разберётся
                    автоматически):
                  </label>
                  <textarea
                    id="windows-diag-input"
                    value={rawReport}
                    onChange={(e) => handleRawReportChange(e.target.value)}
                    rows={4}
                    placeholder='OPTICORE:{"cpuName":"AMD Ryzen 5 5600X","gpuName":"NVIDIA GeForce RTX 3060","ramTotalGb":16,"ramSpeedMhz":3200,"ramStickCount":2,"powerPlan":"balanced","gameDvrEnabled":true,"hagsEnabled":false,"mouseAccelEnabled":true,"vbsEnabled":false,"ssdFreePercent":24,"tempSizeMb":640,"startupCount":8}'
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-white focus:outline-none text-xs font-mono text-zinc-100 placeholder:text-zinc-600"
                  />

                  {reportError && (
                    <div
                      role="alert"
                      className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/35 text-xs text-rose-200"
                    >
                      {reportError}
                    </div>
                  )}

                  {windowsReport && evaluation && evaluation.windowsVerified && !reportError && (
                    <div
                      data-testid="diag-parsed-banner"
                      className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-700 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-zinc-200 font-mono">
                        Отчёт разобран: оптимизация Windows{' '}
                        <strong className="text-white">{evaluation.optimizationScore}%</strong> ·{' '}
                        проблем: {failedChecksCount}
                      </span>
                      <a
                        href="#scan-results"
                        className="text-white hover:underline inline-flex items-center gap-1 font-medium whitespace-nowrap"
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
                      className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition cursor-pointer"
                    >
                      Проанализировать отчёт
                    </button>
                    {windowsReport && (
                      <button
                        type="button"
                        onClick={handleClearReport}
                        className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs transition inline-flex items-center gap-1 cursor-pointer"
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
