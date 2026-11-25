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
    <section id="checklist" className="py-9 sm:py-11 px-4 sm:px-6 border-t border-zinc-800/80 bg-zinc-950/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-6">
          <div>
            <div className="text-xs font-mono text-zinc-400 tracking-wide">
              03 · Ручной аудит системы
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 text-white">
              Чек-лист оптимизации
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              Отмечай выполненные пункты вручную или загрузи отчёт Windows выше.
            </p>
          </div>

          {/* Score Card */}
          <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800 sm:min-w-[300px]">
            <div className="flex items-center justify-between gap-4 text-xs text-zinc-400 mb-1">
              <span>Индекс по чек-листу</span>
              <span
                data-testid="fps-boost-badge"
                className="text-zinc-200 font-mono tabular-nums whitespace-nowrap"
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
                className="text-xs font-mono font-semibold text-zinc-300"
              >
                {score.label}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-md overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${score.percent}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCheckAllChecklist}
                  className="text-xs text-white hover:underline transition cursor-pointer"
                >
                  Отметить все
                </button>
                <span className="text-zinc-700" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  onClick={onResetChecklist}
                  className="text-xs text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                >
                  Сбросить прогресс
                </button>
              </div>
              <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                {Object.values(checkedItems).filter(Boolean).length} / 12
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
                className="p-4 sm:p-5 rounded-2xl bg-[#111113] border border-zinc-800"
              >
                <div className="flex items-center justify-between gap-4 mb-3 pb-2.5 border-b border-zinc-800">
                  <h3 className="font-bold text-base text-white">{group.category}</h3>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-zinc-400">{group.badge}</span>
                    <span className="text-zinc-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-zinc-200 tabular-nums">
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
                            ? 'border-zinc-500 bg-white/[0.04]'
                            : 'border-zinc-800/80 bg-zinc-950/60'
                        } hover:border-zinc-700 cursor-pointer transition-colors`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleCheck(item.id)}
                          className="mt-0.5 w-4 h-4 rounded accent-white cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm font-semibold ${
                              isChecked
                                ? 'text-zinc-400 line-through'
                                : 'text-zinc-100'
                            }`}
                          >
                            {item.title}
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5">{item.desc}</div>
                        </div>
                        <span className="text-xs font-mono text-zinc-500 tabular-nums shrink-0">
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
