import { Download, RefreshCw, Snowflake } from 'lucide-react';
import { APP_VERSION } from '../utils/appUpdater';

interface NavbarProps {
  onOpenCmdGuide?: () => void;
  onOpenUpdates?: () => void;
}

export function Navbar({ onOpenCmdGuide, onOpenUpdates }: NavbarProps) {
  const bulbs = [
    '#fbbf24', // champagne gold
    '#34d399', // pine emerald
    '#7dd3fc', // frost sky
    '#fb7185', // crimson berry
    '#fbbf24',
    '#34d399',
    '#7dd3fc',
    '#fb7185',
    '#fbbf24',
    '#34d399',
    '#7dd3fc',
    '#fb7185',
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#070b14]/88 border-b border-sky-200/12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <a
          href="#top"
          className="flex items-center gap-2.5 font-bold text-base tracking-tight text-white whitespace-nowrap shrink-0 group"
        >
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-200 via-white to-sky-200 flex items-center justify-center text-slate-950 font-mono text-[11px] font-extrabold shadow-sm">
            <Snowflake className="w-3.5 h-3.5 text-slate-900" aria-hidden="true" />
          </span>
          <span>OptiCore</span>
        </a>

        <nav
          aria-label="Основная навигация"
          className="hidden md:flex items-center gap-4 lg:gap-5 text-sm font-medium text-slate-300"
        >
          <a
            href="#scanner"
            className="py-1 border-b border-transparent hover:border-amber-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Сканер ПК
          </a>
          <a
            href="#compare"
            className="py-1 border-b border-transparent hover:border-amber-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Сравнение
          </a>
          <a
            href="#checklist"
            className="py-1 border-b border-transparent hover:border-amber-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Чек-лист
          </a>
          <a
            href="#generator"
            className="py-1 border-b border-transparent hover:border-amber-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Генератор
          </a>
          <a
            href="#gpu-tips"
            onClick={() => onOpenCmdGuide?.()}
            className="py-1 border-b border-transparent hover:border-amber-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Обновление CMD
          </a>
          <a
            href="#faq"
            className="py-1 border-b border-transparent hover:border-amber-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="#download-exe"
            className="px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-400/35 hover:bg-sky-400 hover:text-slate-950 text-sky-200 font-bold text-xs inline-flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать .exe</span>
          </a>
          {onOpenUpdates && (
            <button
              type="button"
              data-testid="open-update-modal"
              onClick={onOpenUpdates}
              title="Проверить обновление или скачать Windows .exe"
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-sky-200/20 hover:border-amber-300/45 text-slate-200 font-mono text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition"
            >
              <RefreshCw className="w-3 h-3 text-amber-300" aria-hidden="true" />
              <span>v{APP_VERSION}</span>
            </button>
          )}
          <a
            href="#generator"
            className="px-3.5 py-1.5 rounded-lg bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm hover:bg-amber-200 glow-btn whitespace-nowrap shrink-0"
          >
            Создать скрипт
          </a>
        </div>
      </div>

      {/* Subtle New Year Fairy-Light Garland Strip */}
      <div
        aria-hidden="true"
        className="w-full h-[3px] flex items-center justify-around px-4 pointer-events-none overflow-hidden opacity-85"
      >
        {bulbs.map((color, idx) => (
          <span
            key={idx}
            className="garland-bulb w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 6px ${color}`,
              animationDelay: `${(idx % 4) * 0.65}s`,
            }}
          />
        ))}
      </div>
    </header>
  );
}
