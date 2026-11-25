import { RefreshCw, Snowflake } from 'lucide-react';

interface FooterProps {
  snowEnabled?: boolean;
  onToggleSnow?: () => void;
  onOpenCmdGuide?: () => void;
  onOpenUpdates?: () => void;
}

export function Footer({
  snowEnabled = true,
  onToggleSnow,
  onOpenCmdGuide,
  onOpenUpdates,
}: FooterProps) {
  return (
    <footer className="py-7 px-4 sm:px-6 border-t border-sky-200/12 bg-[#060912]">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <span className="w-5 h-5 rounded bg-amber-300 flex items-center justify-center text-slate-950 font-mono text-[10px] font-extrabold">
            <Snowflake className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <span>OptiCore</span>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="font-normal text-slate-400">
            Прозрачная настройка Windows, BIOS и сети с точкой отката
          </span>
        </div>

        <nav aria-label="Навигация в подвале" className="flex flex-wrap items-center gap-4 sm:gap-5">
          <a href="#scanner" className="hover:text-amber-200 transition-colors">
            Сканер
          </a>
          <a href="#compare" className="hover:text-amber-200 transition-colors">
            Сравнение
          </a>
          <a href="#checklist" className="hover:text-amber-200 transition-colors">
            Чек-лист
          </a>
          <a href="#generator" className="hover:text-amber-200 transition-colors">
            Генератор
          </a>
          <a
            href="#gpu-tips"
            onClick={() => onOpenCmdGuide?.()}
            className="hover:text-amber-200 transition-colors"
          >
            Обновление CMD
          </a>
          <a href="#faq" className="hover:text-amber-200 transition-colors">
            FAQ
          </a>
          {onOpenUpdates && (
            <button
              type="button"
              onClick={onOpenUpdates}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-sky-200/20 hover:border-amber-300/40 text-slate-200 font-mono text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition"
            >
              <RefreshCw className="w-3 h-3 text-amber-300" aria-hidden="true" />
              <span>Проверить обновление / .exe</span>
            </button>
          )}
          {onToggleSnow && (
            <button
              type="button"
              onClick={onToggleSnow}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-sky-200/20 hover:border-amber-300/40 text-slate-200 font-mono text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition"
            >
              <Snowflake className="w-3 h-3 text-sky-300" aria-hidden="true" />
              <span>{snowEnabled ? 'Снег: ВКЛ' : 'Снег: ВЫКЛ'}</span>
            </button>
          )}
        </nav>
      </div>
    </footer>
  );
}
