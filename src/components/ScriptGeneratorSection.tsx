import { useState } from 'react';
import { Check, Copy, Download, RotateCcw, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { copyTextSafe } from '../utils/clipboard';
import {
  SCRIPT_MODULES,
  generateOptimizationScript,
  generateRollbackScript,
  type ScriptCategory,
  type ScriptFormat,
} from '../utils/opticore';

interface ScriptGeneratorSectionProps {
  selectedModules: Record<string, boolean>;
  format: ScriptFormat;
  importedCount?: number | null;
  onToggleModule: (id: string) => void;
  onSelectPreset: (moduleIds: string[]) => void;
  onFormatChange: (fmt: ScriptFormat) => void;
  onMarkApplied?: (moduleIds: string[]) => void;
}

type CategoryFilter = 'all' | ScriptCategory;

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'network', label: 'Сеть' },
  { id: 'gaming', label: 'GPU/FPS' },
  { id: 'input', label: 'Ввод' },
  { id: 'system', label: 'Система' },
];

const PRESETS = [
  {
    id: 'safe',
    label: 'Баланс',
    modules: [
      'restorePoint',
      'ultimatePower',
      'cleanTemp',
      'gameTweaks',
      'win32PrioritySep',
      'disablePowerThrottling',
    ],
  },
  {
    id: 'esports',
    label: 'Максимум FPS',
    modules: [
      'restorePoint',
      'ultimatePower',
      'cpuCoreParkingOff',
      'disablePowerThrottling',
      'pciExpressPowerOff',
      'processorBoostMax',
      'disableStartupDelay',
      'telemetryLite',
      'gameTweaks',
      'gpuPriority',
      'hagsAndGameMode',
      'win32PrioritySep',
      'windowedOptWin11',
      'diskSleepOff',
      'cleanShaderCache',
      'mouseRawInput',
      'usbPowerSavingOff',
      'disableOverlays',
      'visualEffectsPerf',
      'disableStickyKeys',
      'audioLatencyBoost',
      'menuShowDelayOnly',
      'disableGameNotifications',
      'cleanTemp',
      'dnsFlush',
      'disableP2PUpdate',
      'nagleDisable',
      'nicPowerSavingOff',
      'nicLowLatencyBuffers',
      'tcpRscAndEcnOptimize',
      'qosPacketSchedulerZero',
      'disableNetBiosAndLlmnr',
      'tcpPortsAndTtlOptimize',
      'memoryStorageBoost',
      'noAutoRebootDuringGame',
    ],
  },
  {
    id: 'network',
    label: 'Сеть и пинг',
    modules: [
      'restorePoint',
      'dnsFlush',
      'dnsCloudflareQuad',
      'disableP2PUpdate',
      'nagleDisable',
      'nicPowerSavingOff',
      'nicLowLatencyBuffers',
      'tcpRscAndEcnOptimize',
      'qosPacketSchedulerZero',
      'disableNetBiosAndLlmnr',
      'tcpPortsAndTtlOptimize',
      'gameTweaks',
    ],
  },
  {
    id: 'input',
    label: 'Ввод и отклик',
    modules: [
      'restorePoint',
      'cpuCoreParkingOff',
      'disablePowerThrottling',
      'pciExpressPowerOff',
      'gameTweaks',
      'gpuPriority',
      'hagsAndGameMode',
      'win32PrioritySep',
      'windowedOptWin11',
      'mouseRawInput',
      'usbPowerSavingOff',
      'disableOverlays',
      'visualEffectsPerf',
      'disableStickyKeys',
      'audioLatencyBoost',
      'menuShowDelayOnly',
      'disableGameNotifications',
    ],
  },
  {
    id: 'cleanup',
    label: 'Очистка',
    modules: [
      'restorePoint',
      'disableStartupDelay',
      'diskSleepOff',
      'cleanShaderCache',
      'repairDisplayArtifacts',
      'cleanTemp',
      'memoryStorageBoost',
      'noAutoRebootDuringGame',
    ],
  },
] as const;

export function ScriptGeneratorSection({
  selectedModules,
  format,
  importedCount,
  onToggleModule,
  onSelectPreset,
  onFormatChange,
  onMarkApplied,
}: ScriptGeneratorSectionProps) {
  const [copied, setCopied] = useState(false);
  const [markedApplied, setMarkedApplied] = useState(false);
  const [rollbackMode, setRollbackMode] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const generatedCode = rollbackMode
    ? generateRollbackScript(format)
    : generateOptimizationScript(format, selectedModules);
  const activeCount = SCRIPT_MODULES.filter((m) => selectedModules[m.id]).length;
  const lineCount = generatedCode.split('\n').length;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleModules = SCRIPT_MODULES.filter((mod) => {
    const matchCategory = categoryFilter === 'all' || mod.category === categoryFilter;
    if (!matchCategory) return false;
    if (!normalizedQuery) return true;
    return (
      mod.title.toLowerCase().includes(normalizedQuery) ||
      mod.desc.toLowerCase().includes(normalizedQuery) ||
      mod.impactTag.toLowerCase().includes(normalizedQuery) ||
      mod.id.toLowerCase().includes(normalizedQuery)
    );
  });

  const handleCopy = async () => {
    const ok = await copyTextSafe(generatedCode);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDownload = () => {
    const crlf = generatedCode.replace(/\r?\n/g, '\r\n');
    const payload = format === 'ps1' ? `\uFEFF${crlf}` : crlf;
    const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = rollbackMode ? 'OptiCore_Rollback' : 'OptiCore_Optimize';
    a.download = format === 'bat' ? `${prefix}.bat` : `${prefix}.ps1`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isPresetActive = (presetModules: readonly string[]) =>
    !rollbackMode &&
    SCRIPT_MODULES.every((m) => !!selectedModules[m.id] === presetModules.includes(m.id));

  return (
    <section
      id="generator"
      className="py-9 sm:py-11 px-4 sm:px-6 border-t border-sky-200/12"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-mono text-amber-200/90 tracking-wide">
              04 · Автоматизация настройки (включая сетевой стек)
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 text-white">
              Генератор безопасного скрипта
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              Выбери профиль или отдельные твики из {SCRIPT_MODULES.length} модулей — справа
              соберётся готовый рабочий файл.
            </p>
          </div>

          {/* Preset Selector */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl winter-card border">
            {PRESETS.map((preset) => {
              const active = isPresetActive(preset.modules);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setRollbackMode(false);
                    onSelectPreset([...preset.modules]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-amber-300 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {importedCount && importedCount > 0 && (
          <div
            data-testid="generator-imported-banner"
            className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-500/12 border border-emerald-400/35 text-xs font-mono text-emerald-200 flex items-center gap-2 animate-fade-up"
          >
            <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>
              Рекомендованные твики ({importedCount}) добавлены в сборку скрипта — проверь галочки
              ниже и скачай файл.
            </span>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-5 items-start">
          {/* Options */}
          <div className="lg:col-span-5 min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                role="tablist"
                aria-label="Категории твиков"
                className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg winter-card border"
              >
                {CATEGORY_TABS.map((tab) => {
                  const count =
                    tab.id === 'all'
                      ? SCRIPT_MODULES.length
                      : SCRIPT_MODULES.filter((m) => m.category === tab.id).length;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={categoryFilter === tab.id}
                      onClick={() => setCategoryFilter(tab.id)}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        categoryFilter === tab.id
                          ? 'bg-amber-300 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {tab.label} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setRollbackMode(false);
                    onSelectPreset(SCRIPT_MODULES.map((m) => m.id));
                  }}
                  className="text-slate-200 hover:text-amber-200 transition cursor-pointer"
                >
                  Выбрать все
                </button>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRollbackMode(false);
                    onSelectPreset([]);
                  }}
                  className="text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  Снять выбор
                </button>
              </div>
            </div>

            {/* Compact Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Поиск по ${SCRIPT_MODULES.length} твикам (RSC, QoS, HAGS, USB, DNS)...`}
                aria-label="Поиск по твикам"
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-[#0c1322] border border-sky-200/15 focus:border-amber-300 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Очистить поиск"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
              {visibleModules.length === 0 ? (
                <div className="p-4 rounded-xl border winter-card text-xs text-slate-400 flex items-center justify-between gap-3">
                  <span>По запросу «{searchQuery}» модули не найдены.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('all');
                    }}
                    className="text-amber-300 hover:underline shrink-0 cursor-pointer"
                  >
                    Сбросить
                  </button>
                </div>
              ) : (
                visibleModules.map((mod) => {
                  const active = !!selectedModules[mod.id];
                  return (
                    <label
                      key={mod.id}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border ${
                        active
                          ? 'border-amber-300/45 bg-amber-300/[0.06]'
                          : 'border-sky-200/12 bg-[#0c1322]/90'
                      } hover:border-sky-200/30 cursor-pointer transition-colors`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => {
                          setRollbackMode(false);
                          onToggleModule(mod.id);
                        }}
                        className="mt-0.5 w-4 h-4 rounded accent-amber-300 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-white leading-snug">
                            {mod.title}
                          </span>
                          <span className="text-[11px] font-mono text-sky-200/80 shrink-0 tabular-nums mt-0.5">
                            {mod.impactTag}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                          {mod.desc}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Code Preview Terminal */}
          <div className="lg:col-span-7 min-w-0 rounded-2xl bg-[#070b14] border border-sky-200/15 overflow-hidden glow-border">
            <div className="px-4 py-2.5 bg-[#0c1322] border-b border-sky-200/12 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onFormatChange('bat')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition cursor-pointer ${
                    format === 'bat'
                      ? 'bg-amber-300 text-slate-950'
                      : 'bg-[#070b14] border border-sky-200/15 text-slate-300 hover:text-white'
                  }`}
                >
                  .bat
                </button>
                <button
                  type="button"
                  onClick={() => onFormatChange('ps1')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition cursor-pointer ${
                    format === 'ps1'
                      ? 'bg-amber-300 text-slate-950'
                      : 'bg-[#070b14] border border-sky-200/15 text-slate-300 hover:text-white'
                  }`}
                >
                  .ps1
                </button>
                <button
                  type="button"
                  onClick={() => setRollbackMode((r) => !r)}
                  title="Показать скрипт возврата стандартных настроек Windows"
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition inline-flex items-center gap-1 cursor-pointer ${
                    rollbackMode
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-[#070b14] border border-sky-200/15 text-slate-300 hover:text-white'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Откат</span>
                </button>
                <span className="hidden xl:inline-block text-[11px] font-mono text-slate-400 ml-1.5 tabular-nums whitespace-nowrap">
                  {rollbackMode
                    ? `Сток · ${lineCount} строк`
                    : `${activeCount}/${SCRIPT_MODULES.length} мод. · ${lineCount} строк`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1.5 rounded-lg bg-[#070b14] border border-sky-200/20 hover:bg-slate-800 text-xs font-medium text-slate-100 transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-lg bg-amber-300 hover:bg-amber-200 text-slate-950 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Скачать
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[450px] leading-relaxed">
              <code data-testid="code-output">{generatedCode}</code>
            </pre>
            <div className="px-4 py-2.5 bg-[#0c1322] border-t border-sky-200/12 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>
                  {rollbackMode
                    ? 'Режим отката: возвращает стандартные параметры Windows 10/11 и сети.'
                    : 'Безопасно для античитов и без мерцаний: авто-UAC + штатные утилиты (powercfg, reg, netsh, sc).'}
                </span>
              </div>
              {!rollbackMode && activeCount > 0 && onMarkApplied && (
                <button
                  type="button"
                  onClick={() => {
                    const activeIds = SCRIPT_MODULES.filter((m) => selectedModules[m.id]).map(
                      (m) => m.id,
                    );
                    onMarkApplied(activeIds);
                    setMarkedApplied(true);
                    window.setTimeout(() => setMarkedApplied(false), 2200);
                  }}
                  className="text-xs font-mono text-amber-200 hover:text-amber-100 underline-offset-4 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  {markedApplied
                    ? 'Отмечено в профиле сравнения ✓'
                    : '✓ Применил у себя (отметить для сравнения)'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
