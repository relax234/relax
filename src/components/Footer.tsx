export function Footer() {
  return (
    <footer className="py-10 px-4 sm:px-6 border-t border-slate-800/80 bg-[#060911]">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <span className="w-5 h-5 rounded bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-slate-950 font-mono text-[10px] font-bold">
            OC
          </span>
          <span>OptiCore</span>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="font-normal text-slate-400">
            Прозрачная настройка Windows с точкой восстановления
          </span>
        </div>

        <nav aria-label="Навигация в подвале" className="flex flex-wrap items-center gap-5">
          <a href="#scanner" className="hover:text-cyan-400 transition-colors">
            Сканер
          </a>
          <a href="#compare" className="hover:text-cyan-400 transition-colors">
            Сравнение
          </a>
          <a href="#checklist" className="hover:text-cyan-400 transition-colors">
            Чек-лист
          </a>
          <a href="#generator" className="hover:text-cyan-400 transition-colors">
            Генератор
          </a>
          <a href="#gpu-tips" className="hover:text-cyan-400 transition-colors">
            Драйверы
          </a>
          <a href="#faq" className="hover:text-cyan-400 transition-colors">
            FAQ
          </a>
        </nav>
      </div>
    </footer>
  );
}
