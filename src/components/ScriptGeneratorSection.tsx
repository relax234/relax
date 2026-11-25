import { useState } from 'react';
import { Check, Copy, Download, RotateCcw, Search, ShieldCheck, X } from 'lucide-react';
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
  onToggleModule: (id: string) => void;
  onSelectPreset: (moduleIds: string[]) => void;
  onFormatChange: (fmt: ScriptFormat) => void;
  onMarkApplied?: (moduleIds: string[]) => void;
}

type CategoryFilter = 'all' | ScriptCategory;

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'gaming', label: 'GPU/FPS' },
  { id: 'input', label: 'Ввод' },
  { id: 'system', label: 'Система' },
  { id: 'network', label: 'Сеть' },
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
      'timerResolutionBcd',
      'gameTweaks',
      'gpuPriority',
      'hagsAndGameMode',
      'win32PrioritySep',
      'disableFullscreenOpt',
      'disablePowerThrottling',
      'highProcessPriorityFse',
      'mouseRawInput',
      'disableOverlays',
      'disableStickyKeys',
      'usbPowerSavingOff',
      'audioLatencyBoost',
      'csrWaitAndMenuDelay',
      'cleanTemp',
      'dnsFlush',
      'disableP2PUpdate',
      'nagleDisable',
      'telemetryLite',
      'disableErrorReporting',
    ],
  },
  {
    id: 'input',
    label: 'Ввод и отклик',
    modules: [
      'restorePoint',
      'cpuCoreParkingOff',
      'timerResolutionBcd',
      'gameTweaks',
      'gpuPriority',
      'hagsAndGameMode',
      'win32PrioritySep',
      'disableFullscreenOpt',
      'disablePowerThrottling',
      'highProcessPriorityFse',
      'mouseRawInput',
      'disableOverlays',
      'visualEffectsPerf',
      'disableStickyKeys',
      'usbPowerSavingOff',
      'audioLatencyBoost',
      'csrWaitAndMenuDelay',
    ],
  },
  {
    id: 'cleanup',
    label: 'Очистка и сеть',
    modules: [
      'restorePoint',
      'disableHibernation',
      'disableErrorReporting',
      'cleanTemp',
      'dnsFlush',
      'dnsCloudflareQuad',
      'disableP2PUpdate',
      'nagleDisable',
      'memoryStorageBoost',
      'disableRemoteAndMaps',
    ],
  },
] as const;

export function ScriptGeneratorSection({
  selectedModules,
  format,
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
      className="py-9 sm:py-11 px-4 sm:px-6 border-t border-zinc-800/80"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-mono text-zinc-400 tracking-wide">
              04 · Автоматизация настройки
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 text-white">
              Генератор безопасного скрипта
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              Выбери профиль или отдельные твики из {SCRIPT_MODULES.length} модулей — справа
              соберётся готовый рабочий файл.
            </p>
          </div>

          {/* Preset Selector */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#111113] border border-zinc-800">
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
                      ? 'bg-white text-zinc-950 font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-5 items-start">
          {/* Options */}
          <div className="lg:col-span-5 min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                role="tablist"
                aria-label="Категории твиков"
                className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#111113] border border-zinc-800"
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
                          ? 'bg-white text-zinc-950 font-semibold'
                          : 'text-zinc-400 hover:text-white'
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
                  className="text-zinc-200 hover:text-white transition cursor-pointer"
                >
                  Выбрать все
                </button>
                <span className="text-zinc-700" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRollbackMode(false);
                    onSelectPreset([]);
                  }}
                  className="text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  Снять выбор
                </button>
              </div>
            </div>

            {/* Compact Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Поиск по ${SCRIPT_MODULES.length} твикам (например, HAGS, USB, DNS)...`}
                aria-label="Поиск по твикам"
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-[#111113] border border-zinc-800 focus:border-zinc-500 focus:outline-none text-xs text-zinc-100 placeholder:text-zinc-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Очистить поиск"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
              {visibleModules.length === 0 ? (
                <div className="p-4 rounded-xl border border-zinc-800 bg-[#111113] text-xs text-zinc-400 flex items-center justify-between gap-3">
                  <span>По запросу «{searchQuery}» модули не найдены.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('all');
                    }}
                    className="text-white hover:underline shrink-0 cursor-pointer"
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
                          ? 'border-zinc-500 bg-white/[0.04]'
                          : 'border-zinc-800 bg-[#111113]'
                      } hover:border-zinc-700 cursor-pointer transition-colors`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => {
                          setRollbackMode(false);
                          onToggleModule(mod.id);
                        }}
                        className="mt-0.5 w-4 h-4 rounded accent-white cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-white leading-snug">
                            {mod.title}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400 shrink-0 tabular-nums mt-0.5">
                            {mod.impactTag}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{mod.desc}</div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Code Preview Terminal */}
          <div className="lg:col-span-7 min-w-0 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="px-4 py-2.5 bg-[#111113] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onFormatChange('bat')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition cursor-pointer ${
                    format === 'bat'
                      ? 'bg-white text-zinc-950'
                      : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                >
                  .bat
                </button>
                <button
                  type="button"
                  onClick={() => onFormatChange('ps1')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition cursor-pointer ${
                    format === 'ps1'
                      ? 'bg-white text-zinc-950'
                      : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
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
                      ? 'bg-amber-400 text-zinc-950'
                      : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Откат</span>
                </button>
                <span className="hidden xl:inline-block text-[11px] font-mono text-zinc-400 ml-1.5 tabular-nums whitespace-nowrap">
                  {rollbackMode
                    ? `Сток · ${lineCount} строк`
                    : `${activeCount}/${SCRIPT_MODULES.length} мод. · ${lineCount} строк`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-xs font-medium text-zinc-200 transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
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
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Скачать
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto max-h-[450px] leading-relaxed">
              <code data-testid="code-output">{generatedCode}</code>
            </pre>
            <div className="px-4 py-2.5 bg-[#111113] border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>
                  {rollbackMode
                    ? 'Режим отката: возвращает стандартные параметры Windows 10/11.'
                    : 'Авто-запрос прав администратора + системные утилиты (powercfg, reg, bcdedit, netsh, sc).'}
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
                  className="text-xs font-mono text-zinc-200 hover:text-white underline-offset-4 hover:underline cursor-pointer whitespace-nowrap shrink-0"
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
