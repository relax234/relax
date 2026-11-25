import {
  CHECKLIST_DATA,
  calculateOptimizationScore,
} from '../utils/opticore';

interface ChecklistSectionProps {
  checkedItems: Record<string, boolean>;
  onToggleCheck: (id: string) => void;
  onCheckAllChecklist: () => void;
  onResetChecklist: () => void;
}

export function ChecklistSection({
  checkedItems,
  onToggleCheck,
  onCheckAllChecklist,
  onResetChecklist,
}: ChecklistSectionProps) {
  const score = calculateOptimizationScore(checkedItems);

  return (
    <section id="checklist" className="py-16 px-4 sm:px-6 border-t border-slate-800/70 bg-slate-950/35">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs font-mono text-cyan-400 tracking-wide">
              03 · Ручной аудит системы
            </div>
            <h2 className="text-3xl font-bold mt-1.5 text-white">
              Интерактивный чек-лист оптимизации
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Отмечай пункты, которые уже настроил — прогресс сохраняется локально в браузере.
            </p>
          </div>

          {/* Score Card */}
          <div className="p-5 rounded-2xl bg-[#0C1220] border border-slate-800/90 glow-border sm:min-w-[320px]">
            <div className="flex items-center justify-between gap-4 text-xs text-slate-400 mb-1.5">
              <span>Индекс оптимизации ПК</span>
              <span
                data-testid="fps-boost-badge"
                className="text-emerald-400 font-mono tabular-nums whitespace-nowrap"
              >
                +{score.stabilityBonus}% к стабильности
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 mb-2.5">
              <span
                data-testid="score-percent"
                className="text-3xl font-extrabold text-white font-mono tabular-nums"
              >
                {score.percent}%
              </span>
              <span
                data-testid="score-label"
                className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${score.badgeClass}`}
              >
                {score.label}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-md overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-300"
                style={{ width: `${score.percent}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCheckAllChecklist}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                >
                  Отметить все
                </button>
                <span className="text-slate-700" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  onClick={onResetChecklist}
                  className="text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  Сбросить прогресс
                </button>
              </div>
              <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                {Object.values(checkedItems).filter(Boolean).length} / 12 пунктов
              </span>
            </div>
          </div>
        </div>

        {/* Checklist Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {CHECKLIST_DATA.map((group) => {
            const doneInGroup = group.items.filter((i) => checkedItems[i.id]).length;
            return (
              <div
                key={group.category}
                className="p-6 rounded-2xl bg-[#0C1220] border border-slate-800/90"
              >
                <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800/80">
                  <h3 className="font-bold text-lg text-white">{group.category}</h3>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-cyan-300">{group.badge}</span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-400 tabular-nums">
                      {doneInGroup}/{group.items.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {group.items.map((item) => {
                    const isChecked = !!checkedItems[item.id];
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3.5 p-3 rounded-xl border ${
                          isChecked
                            ? 'border-cyan-500/40 bg-cyan-500/5'
                            : 'border-slate-800/80 bg-[#060911]/55'
                        } hover:border-slate-700 cursor-pointer transition-colors`}
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
                                ? 'text-cyan-200 line-through opacity-75'
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
