export function HeroSection() {
  return (
    <section id="top" className="pt-16 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-6">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" aria-hidden="true" />
          WINDOWS 10 / 11 • БЕЗ МУСОРНЫХ ПРОГРАММ • ОТКРЫТЫЙ КОД
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          Выжми максимум{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400">
            FPS и отклика
          </span>{' '}
          из своего ПК
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Никаких «ускорителей в один клик» со скрытым майнингом. Пройди интерактивный аудит системы
          и сгенерируй прозрачный <code className="text-cyan-300 font-mono">.bat</code> или{' '}
          <code className="text-violet-300 font-mono">.ps1</code> скрипт под свои задачи.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#scanner"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-cyan-400 text-slate-950 font-bold text-sm hover:bg-cyan-300 transition glow-btn"
          >
            Проверить мой ПК →
          </a>
          <a
            href="#generator"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-semibold text-sm hover:border-cyan-400/50 transition"
          >
            Собрать .BAT / .PS1 скрипт
          </a>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-14 max-w-4xl mx-auto">
          <div className="p-4 rounded-xl bg-[#0E1525]/90 border border-slate-800">
            <div className="text-2xl font-extrabold text-cyan-400 font-mono tabular-nums">-35%</div>
            <div className="text-xs text-slate-400 mt-1">Фоновых процессов</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0E1525]/90 border border-slate-800">
            <div className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">-4.2 мс</div>
            <div className="text-xs text-slate-400 mt-1">Снижение Input Lag</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0E1525]/90 border border-slate-800">
            <div className="text-2xl font-extrabold text-violet-400 font-mono tabular-nums">+12–25%</div>
            <div className="text-xs text-slate-400 mt-1">Стабильность 1% Low FPS</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0E1525]/90 border border-slate-800">
            <div className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums">100%</div>
            <div className="text-xs text-slate-400 mt-1">Обратимые настройки</div>
          </div>
        </div>
      </div>
    </section>
  );
}
