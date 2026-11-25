export function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#09090B]/90 border-b border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="flex items-center gap-2.5 font-bold text-base tracking-tight text-white whitespace-nowrap shrink-0"
        >
          <span className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-zinc-950 font-mono text-[11px] font-extrabold">
            OC
          </span>
          <span>OptiCore</span>
        </a>

        <nav
          aria-label="Основная навигация"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400"
        >
          <a
            href="#scanner"
            className="py-1 border-b border-transparent hover:border-white hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Сканер ПК
          </a>
          <a
            href="#compare"
            className="py-1 border-b border-transparent hover:border-white hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Сравнение
          </a>
          <a
            href="#checklist"
            className="py-1 border-b border-transparent hover:border-white hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Чек-лист
          </a>
          <a
            href="#generator"
            className="py-1 border-b border-transparent hover:border-white hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Генератор
          </a>
          <a
            href="#faq"
            className="py-1 border-b border-transparent hover:border-white hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            FAQ
          </a>
        </nav>

        <a
          href="#generator"
          className="px-3.5 py-1.5 rounded-lg bg-white text-zinc-950 font-bold text-xs sm:text-sm hover:bg-zinc-200 glow-btn whitespace-nowrap shrink-0"
        >
          Создать скрипт
        </a>
      </div>
    </header>
  );
}
