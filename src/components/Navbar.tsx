export function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#060911]/85 border-b border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-white whitespace-nowrap shrink-0"
        >
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-slate-950 font-mono text-xs font-bold">
            OC
          </span>
          <span>
            Opti<span className="text-cyan-400">Core</span>
          </span>
        </a>

        <nav
          aria-label="Основная навигация"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
        >
          <a
            href="#scanner"
            className="py-1 border-b border-transparent hover:border-cyan-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Сканер ПК
          </a>
          <a
            href="#checklist"
            className="py-1 border-b border-transparent hover:border-cyan-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Чек-лист
          </a>
          <a
            href="#generator"
            className="py-1 border-b border-transparent hover:border-cyan-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Генератор
          </a>
          <a
            href="#gpu-tips"
            className="py-1 border-b border-transparent hover:border-cyan-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Драйверы и BIOS
          </a>
          <a
            href="#faq"
            className="py-1 border-b border-transparent hover:border-cyan-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            FAQ
          </a>
        </nav>

        <a
          href="#generator"
          className="px-4 py-2 rounded-lg bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm hover:bg-cyan-300 glow-btn whitespace-nowrap shrink-0"
        >
          Создать скрипт
        </a>
      </div>
    </header>
  );
}
