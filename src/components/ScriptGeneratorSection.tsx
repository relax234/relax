import { useState } from 'react';
import { Check, Copy, Download, ShieldCheck } from 'lucide-react';
import {
  SCRIPT_MODULES,
  generateOptimizationScript,
  type ScriptFormat,
} from '../utils/opticore';

interface ScriptGeneratorSectionProps {
  selectedModules: Record<string, boolean>;
  format: ScriptFormat;
  onToggleModule: (id: string) => void;
  onSelectPreset: (moduleIds: string[]) => void;
  onFormatChange: (fmt: ScriptFormat) => void;
}

const PRESETS = [
  {
    id: 'safe',
    label: 'Безопасный баланс',
    modules: ['restorePoint', 'ultimatePower', 'cleanTemp', 'gameTweaks'],
  },
  {
    id: 'esports',
    label: 'Максимум FPS (Киберспорт)',
    modules: [
      'restorePoint',
      'ultimatePower',
      'cleanTemp',
      'gameTweaks',
      'dnsFlush',
      'telemetryLite',
    ],
  },
  {
    id: 'cleanup',
    label: 'Очистка и сеть',
    modules: ['restorePoint', 'cleanTemp', 'dnsFlush'],
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

  const generatedCode = generateOptimizationScript(format, selectedModules);
  const activeCount = SCRIPT_MODULES.filter((m) => selectedModules[m.id]).length;
  const lineCount = generatedCode.split('\n').length;

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
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs font-mono text-violet-400 tracking-wide">
              03 · Автоматизация настройки
            </div>
            <h2 className="text-3xl font-bold mt-1.5 text-white">
              Генератор безопасного скрипта
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Выбери готовый профиль или нужные твики вручную — справа соберётся открытый файл.
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
          <div className="lg:col-span-5 min-w-0 space-y-2.5">
            {SCRIPT_MODULES.map((mod) => {
              const active = !!selectedModules[mod.id];
              return (
                <label
                  key={mod.id}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border ${
                    active
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-slate-800 bg-[#0C1220]'
                  } hover:border-slate-700 cursor-pointer transition-colors`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onToggleModule(mod.id)}
                    className="mt-1 w-4 h-4 rounded accent-violet-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-sm font-semibold text-white">{mod.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{mod.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Code Preview Terminal */}
          <div className="lg:col-span-7 min-w-0 rounded-2xl bg-[#080D18] border border-slate-800 overflow-hidden glow-border">
            <div className="px-4 py-3 bg-[#0C1220] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onFormatChange('bat')}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition cursor-pointer ${
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
                  className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition cursor-pointer ${
                    format === 'ps1'
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  OptiCore.ps1
                </button>
                <span className="hidden sm:inline-block text-[11px] font-mono text-slate-500 ml-2 tabular-nums">
                  {activeCount} мод. · {lineCount} строк
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Скачать файл
                </button>
              </div>
            </div>
            <pre className="p-5 text-xs sm:text-sm font-mono text-cyan-100/95 overflow-x-auto max-h-[430px] leading-relaxed">
              <code data-testid="code-output">{generatedCode}</code>
            </pre>
            <div className="px-4 py-2.5 bg-[#0C1220]/70 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Используются только встроенные утилиты Windows (powercfg, reg, ipconfig, sc).</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
