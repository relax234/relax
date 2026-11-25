import {
  CHECKLIST_DATA,
  calculateOptimizationScore,
} from '../utils/opticore';

interface ChecklistSectionProps {
  checkedItems: Record<string, boolean>;
  onToggleCheck: (id: string) => void;
  onResetChecklist: () => void;
}

export function ChecklistSection({
  checkedItems,
  onToggleCheck,
  onResetChecklist,
}: ChecklistSectionProps) {
  const score = calculateOptimizationScore(checkedItems);

  return (
    <section id="checklist" className="py-16 px-4 sm:px-6 border-t border-slate-800/70">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
              Шаг 1 • Аудит
            </span>
            <h2 className="text-3xl font-bold mt-1">Интерактивный чек-лист оптимизации</h2>
            <p className="text-slate-400 text-sm mt-2">
              Отмечай пункты, которые уже сделал — прогресс сохраняется автоматически.
            </p>
          </div>

          {/* Score Card */}
          <div className="p-5 rounded-2xl bg-[#0E1525] border border-cyan-500/30 glow-border sm:min-w-[320px]">
            <div className="flex items-center justify-between gap-4 text-xs text-slate-400 mb-1.5">
              <span>Индекс оптимизации ПК</span>
              <span
                data-testid="fps-boost-badge"
                className="text-emerald-400 font-mono tabular-nums whitespace-nowrap"
              >
                +{score.stabilityBonus}% к стабильности
              </span>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span
                data-testid="score-percent"
                className="text-3xl font-extrabold text-white font-mono tabular-nums"
              >
                {score.percent}%
              </span>
              <span
                data-testid="score-label"
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${score.badgeClass}`}
              >
                {score.label}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-300"
                style={{ width: `${score.percent}%` }}
              />
            </div>
            <button
              type="button"
              onClick={onResetChecklist}
              className="mt-3 text-xs text-slate-500 hover:text-rose-400 transition cursor-pointer"
            >
              Сбросить прогресс
            </button>
          </div>
        </div>

        {/* Checklist Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {CHECKLIST_DATA.map((group) => (
            <div
              key={group.category}
              className="p-6 rounded-2xl bg-[#0E1525] border border-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-white">{group.category}</h3>
                <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-800 text-cyan-300">
                  {group.badge}
                </span>
              </div>
              <div className="space-y-3">
                {group.items.map((item) => {
                  const isChecked = !!checkedItems[item.id];
                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3.5 p-3 rounded-xl border ${
                        isChecked
                          ? 'border-cyan-500/40 bg-cyan-500/5'
                          : 'border-slate-800/80 bg-slate-900/40'
                      } hover:border-slate-700 cursor-pointer transition`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleCheck(item.id)}
                        className="mt-1 w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div
                          className={`text-sm font-semibold ${
                            isChecked
                              ? 'text-cyan-200 line-through opacity-80'
                              : 'text-slate-100'
                          }`}
                        >
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                      </div>
                      <span className="text-xs font-mono text-slate-500 tabular-nums">
                        +{item.weight}%
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
