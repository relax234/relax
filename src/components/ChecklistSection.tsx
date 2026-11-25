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
  const totalChecklistItems = CHECKLIST_DATA.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <section
      id="checklist"
      className="py-9 sm:py-11 px-4 sm:px-6 border-t border-sky-200/10 bg-[#080d19]/55"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-6">
          <div>
            <div className="text-xs font-mono text-amber-200/90 tracking-wide">
              03 · Ручной аудит системы
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 text-white">
              Чек-лист оптимизации
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              Отмечай выполненные пункты вручную или загрузи отчёт Windows выше.
            </p>
          </div>

          {/* Score Card */}
          <div className="p-4 rounded-2xl winter-card border sm:min-w-[300px]">
            <div className="flex items-center justify-between gap-4 text-xs text-slate-300 mb-1">
              <span>Индекс по чек-листу</span>
              <span
                data-testid="fps-boost-badge"
                className="text-amber-200 font-mono tabular-nums whitespace-nowrap"
              >
                +{score.stabilityBonus}% к стабильности
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <span
                data-testid="score-percent"
                className="text-2xl font-extrabold text-white font-mono tabular-nums"
              >
                {score.percent}%
              </span>
              <span
                data-testid="score-label"
                className="text-xs font-mono font-semibold text-emerald-300"
              >
                {score.label}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-md overflow-hidden">
              <div
                className="h-full bg-amber-300 transition-all duration-300"
                style={{ width: `${score.percent}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCheckAllChecklist}
                  className="text-xs text-amber-200 hover:underline transition cursor-pointer"
                >
                  Отметить все
                </button>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  onClick={onResetChecklist}
                  className="text-xs text-slate-400 hover:text-rose-300 transition cursor-pointer"
                >
                  Сбросить прогресс
                </button>
              </div>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {Object.values(checkedItems).filter(Boolean).length} / {totalChecklistItems}
              </span>
            </div>
          </div>
        </div>

        {/* Checklist Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {CHECKLIST_DATA.map((group) => {
            const doneInGroup = group.items.filter((i) => checkedItems[i.id]).length;
            return (
              <div
                key={group.category}
                className="p-4 sm:p-5 rounded-2xl winter-card border"
              >
                <div className="flex items-center justify-between gap-4 mb-3 pb-2.5 border-b border-sky-200/12">
                  <h3 className="font-bold text-base text-white">{group.category}</h3>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400">{group.badge}</span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-amber-200 tabular-nums">
                      {doneInGroup}/{group.items.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const isChecked = !!checkedItems[item.id];
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border ${
                          isChecked
                            ? 'border-amber-300/40 bg-amber-300/[0.06]'
                            : 'border-sky-200/12 bg-[#070b14]/65'
                        } hover:border-sky-200/25 cursor-pointer transition-colors`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleCheck(item.id)}
                          className="mt-0.5 w-4 h-4 rounded accent-amber-300 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm font-semibold ${
                              isChecked
                                ? 'text-slate-400 line-through'
                                : 'text-slate-100'
                            }`}
                          >
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-300 mt-0.5">{item.desc}</div>
                        </div>
                        <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
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
