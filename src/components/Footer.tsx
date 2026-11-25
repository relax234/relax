export function Footer() {
  return (
    <footer className="py-7 px-4 sm:px-6 border-t border-zinc-800/80 bg-[#09090B]">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2 font-semibold text-zinc-200">
          <span className="w-5 h-5 rounded bg-white flex items-center justify-center text-zinc-950 font-mono text-[10px] font-extrabold">
            OC
          </span>
          <span>OptiCore</span>
          <span className="text-zinc-600" aria-hidden="true">
            ·
          </span>
          <span className="font-normal text-zinc-400">
            Прозрачная настройка Windows с точкой отката
          </span>
        </div>

        <nav aria-label="Навигация в подвале" className="flex flex-wrap items-center gap-5">
          <a href="#scanner" className="hover:text-white transition-colors">
            Сканер
          </a>
          <a href="#compare" className="hover:text-white transition-colors">
            Сравнение
          </a>
          <a href="#checklist" className="hover:text-white transition-colors">
            Чек-лист
          </a>
          <a href="#generator" className="hover:text-white transition-colors">
            Генератор
          </a>
          <a href="#gpu-tips" className="hover:text-white transition-colors">
            Драйверы и Win+R
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
        </nav>
      </div>
    </footer>
  );
}
