export function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#070B14]/80 border-b border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <a
          href="#top"
          className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight whitespace-nowrap shrink-0"
        >
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-slate-950 font-mono text-sm">
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
          <a href="#scanner" className="hover:text-cyan-400 transition whitespace-nowrap shrink-0">
            Сканер ПК
          </a>
          <a href="#checklist" className="hover:text-cyan-400 transition whitespace-nowrap shrink-0">
            Чек-лист
          </a>
          <a href="#generator" className="hover:text-cyan-400 transition whitespace-nowrap shrink-0">
            Генератор скриптов
          </a>
          <a href="#gpu-tips" className="hover:text-cyan-400 transition whitespace-nowrap shrink-0">
            Видеокарты и OS
          </a>
          <a href="#faq" className="hover:text-cyan-400 transition whitespace-nowrap shrink-0">
            FAQ
          </a>
        </nav>

        <a
          href="#generator"
          className="px-4 py-2 rounded-lg bg-cyan-400 text-slate-950 font-semibold text-sm hover:bg-cyan-300 transition glow-btn whitespace-nowrap shrink-0"
        >
          Создать скрипт
        </a>
      </div>
    </header>
  );
}
