import { useState } from 'react';
import {
  SCRIPT_MODULES,
  generateOptimizationScript,
  type ScriptFormat,
} from '../utils/opticore';

interface ScriptGeneratorSectionProps {
  selectedModules: Record<string, boolean>;
  format: ScriptFormat;
  onToggleModule: (id: string) => void;
  onFormatChange: (fmt: ScriptFormat) => void;
}

export function ScriptGeneratorSection({
  selectedModules,
  format,
  onToggleModule,
  onFormatChange,
}: ScriptGeneratorSectionProps) {
  const [copied, setCopied] = useState(false);

  const generatedCode = generateOptimizationScript(format, selectedModules);

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

  return (
    <section
      id="generator"
      className="py-16 px-4 sm:px-6 border-t border-slate-800/70 bg-slate-950/40"
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <span className="text-xs font-mono uppercase tracking-wider text-violet-400">
            Шаг 2 • Автоматизация
          </span>
          <h2 className="text-3xl font-bold mt-1">Генератор безопасного скрипта</h2>
          <p className="text-slate-400 text-sm mt-2">
            Выбери нужные твики слева — справа сразу соберётся готовый файл для запуска от имени
            администратора.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Options */}
          <div className="lg:col-span-5 space-y-3">
            {SCRIPT_MODULES.map((mod) => {
              const active = !!selectedModules[mod.id];
              return (
                <label
                  key={mod.id}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border ${
                    active
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-slate-800 bg-[#0E1525]'
                  } cursor-pointer transition`}
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

          {/* Code Preview */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0B111E] border border-slate-800 overflow-hidden glow-border">
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
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
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
                >
                  {copied ? 'Скопировано ✓' : 'Копировать'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer"
                >
                  Скачать файл ↓
                </button>
              </div>
            </div>
            <pre className="p-5 text-xs sm:text-sm font-mono text-cyan-100 overflow-x-auto max-h-[460px] leading-relaxed">
              <code data-testid="code-output">{generatedCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
