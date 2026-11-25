import { useState } from 'react';
import { Check, Copy, Download, ShieldCheck } from 'lucide-react';
import {
  SCRIPT_MODULES,
  generateOptimizationScript,
  type ScriptCategory,
  type ScriptFormat,
} from '../utils/opticore';

interface ScriptGeneratorSectionProps {
  selectedModules: Record<string, boolean>;
  format: ScriptFormat;
  onToggleModule: (id: string) => void;
  onSelectPreset: (moduleIds: string[]) => void;
  onFormatChange: (fmt: ScriptFormat) => void;
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
    modules: ['restorePoint', 'ultimatePower', 'cleanTemp', 'gameTweaks'],
  },
  {
    id: 'esports',
    label: 'Максимум FPS',
    modules: [
      'restorePoint',
      'ultimatePower',
      'gameTweaks',
      'gpuPriority',
      'hagsAndGameMode',
      'mouseRawInput',
      'disableOverlays',
      'cleanTemp',
      'dnsFlush',
      'disableP2PUpdate',
      'telemetryLite',
    ],
  },
  {
    id: 'input',
    label: 'Ввод и отклик',
    modules: [
      'restorePoint',
      'gameTweaks',
      'gpuPriority',
      'hagsAndGameMode',
      'mouseRawInput',
      'disableOverlays',
      'visualEffectsPerf',
    ],
  },
  {
    id: 'cleanup',
    label: 'Очистка и сеть',
    modules: ['restorePoint', 'cleanTemp', 'dnsFlush', 'disableP2PUpdate'],
  },
] as const;

export function ScriptGeneratorSection({
  selectedModules,
  format,
  onToggleModule,
  onSelectPreset,
  onFormatChange,
}: ScriptGeneratorSectionProps) {
  const [copied, setCopied] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const generatedCode = generateOptimizationScript(format, selectedModules);
  const activeCount = SCRIPT_MODULES.filter((m) => selectedModules[m.id]).length;
  const lineCount = generatedCode.split('\n').length;

  const visibleModules =
    categoryFilter === 'all'
      ? SCRIPT_MODULES
      : SCRIPT_MODULES.filter((m) => m.category === categoryFilter);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'bat' ? 'OptiCore_Optimize.bat' : 'OptiCore_Optimize.ps1';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isPresetActive = (presetModules: readonly string[]) =>
    SCRIPT_MODULES.every((m) => !!selectedModules[m.id] === presetModules.includes(m.id));

  return (
    <section
      id="generator"
      className="py-16 px-4 sm:px-6 border-t border-slate-800/70 bg-slate-950/40"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="text-xs font-mono text-violet-400 tracking-wide">
              03 · Автоматизация настройки
            </div>
            <h2 className="text-3xl font-bold mt-1.5 text-white">
              Генератор безопасного скрипта
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Выбери готовый профиль или нужные твики из 12 модулей — справа соберётся открытый
              файл.
            </p>
          </div>

          {/* Preset Selector */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#0C1220] border border-slate-800">
            {PRESETS.map((preset) => {
              const active = isPresetActive(preset.modules);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset([...preset.modules])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-violet-500 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Options */}
          <div className="lg:col-span-5 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                role="tablist"
                aria-label="Категории твиков"
                className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#0C1220] border border-slate-800"
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
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        categoryFilter === tab.id
                          ? 'bg-cyan-400 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-white'
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
                  onClick={() => onSelectPreset(SCRIPT_MODULES.map((m) => m.id))}
                  className="text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                >
                  Выбрать все
                </button>
                <span className="text-slate-700" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => onSelectPreset([])}
                  className="text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  Снять выбор
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-0.5">
              {visibleModules.map((mod) => {
                const active = !!selectedModules[mod.id];
                return (
                  <label
                    key={mod.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                      active
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-slate-800 bg-[#0C1220]'
                    } hover:border-slate-700 cursor-pointer transition-colors`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => onToggleModule(mod.id)}
                      className="mt-1 w-4 h-4 rounded accent-violet-500 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-white leading-snug">
                          {mod.title}
                        </span>
                        <span className="text-[11px] font-mono text-cyan-300/90 shrink-0 tabular-nums mt-0.5">
                          {mod.impactTag}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{mod.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Code Preview Terminal */}
          <div className="lg:col-span-7 min-w-0 rounded-2xl bg-[#080D18] border border-slate-800 overflow-hidden glow-border">
            <div className="px-4 py-3 bg-[#0C1220] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onFormatChange('bat')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition cursor-pointer ${
                    format === 'bat'
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  OptiCore.bat
                </button>
                <button
                  type="button"
                  onClick={() => onFormatChange('ps1')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition cursor-pointer ${
                    format === 'ps1'
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  OptiCore.ps1
                </button>
                <span className="hidden xl:inline-block text-[11px] font-mono text-slate-400 ml-1.5 tabular-nums whitespace-nowrap">
                  {activeCount}/{SCRIPT_MODULES.length} мод. · {lineCount} строк
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Скачать
                </button>
              </div>
            </div>
            <pre className="p-5 text-xs sm:text-sm font-mono text-cyan-100/95 overflow-x-auto max-h-[470px] leading-relaxed">
              <code data-testid="code-output">{generatedCode}</code>
            </pre>
            <div className="px-4 py-2.5 bg-[#0C1220]/70 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Используются только встроенные утилиты Windows (powercfg, reg, ipconfig, netsh, sc).
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
