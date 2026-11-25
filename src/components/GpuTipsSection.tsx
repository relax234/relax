import { useState } from 'react';

type PlatformTab = 'all' | 'nvidia' | 'amd' | 'bios';

interface TipRow {
  setting: string;
  value: string;
}

interface TipCardData {
  id: Exclude<PlatformTab, 'all'>;
  brand: string;
  accentClass: string;
  borderHover: string;
  title: string;
  rows: TipRow[];
}

const TIP_CARDS: TipCardData[] = [
  {
    id: 'nvidia',
    brand: 'NVIDIA Control Panel',
    accentClass: 'text-emerald-400',
    borderHover: 'hover:border-emerald-500/40',
    title: 'Минимум задержки в играх',
    rows: [
      { setting: 'Электропитание', value: 'Макс. производительность' },
      { setting: 'Низкая задержка', value: 'Вкл / Ультра (GPU ≥ 95%)' },
      { setting: 'Фильтрация текстур', value: 'Высокая производительность' },
      { setting: 'Кэш шейдеров', value: '10 ГБ или Без ограничений' },
    ],
  },
  {
    id: 'amd',
    brand: 'AMD Adrenalin',
    accentClass: 'text-rose-400',
    borderHover: 'hover:border-rose-500/40',
    title: 'Плавный фреймтайм Radeon',
    rows: [
      { setting: 'Radeon Anti-Lag', value: 'Включено (для шутеров)' },
      { setting: 'Radeon Chill / Boost', value: 'Отключить для отклика 1:1' },
      { setting: 'Формат поверхности', value: 'Оптимизация включена' },
      { setting: 'Smart Access Memory', value: 'Включить в BIOS + Adrenalin' },
    ],
  },
  {
    id: 'bios',
    brand: 'BIOS и память',
    accentClass: 'text-cyan-400',
    borderHover: 'hover:border-cyan-500/40',
    title: 'Бесплатный прирост железа',
    rows: [
      { setting: 'Профиль XMP / EXPO', value: 'Вкл (вместо 2133/4800 МГц)' },
      { setting: 'Above 4G + ReBAR', value: '+5–10% FPS в DX12 / Vulkan' },
      { setting: 'Температура CPU', value: 'Держать ниже 85°C' },
      { setting: 'Температура GPU', value: 'Держать ниже 80°C' },
    ],
  },
];

export function GpuTipsSection() {
  const [platform, setPlatform] = useState<PlatformTab>('all');

  const visibleCards = TIP_CARDS.filter((c) => platform === 'all' || c.id === platform);

  return (
    <section id="gpu-tips" className="py-16 px-4 sm:px-6 border-t border-slate-800/70 bg-slate-950/35">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-xs font-mono text-emerald-400 tracking-wide">
              05 · Тонкая настройка драйверов
            </div>
            <h2 className="text-3xl font-bold mt-1.5 text-white">
              Быстрые настройки драйверов и BIOS
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Выбор платформы"
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#0C1220] border border-slate-800"
          >
            {(
              [
                { id: 'all', label: 'Все' },
                { id: 'nvidia', label: 'NVIDIA' },
                { id: 'amd', label: 'AMD' },
                { id: 'bios', label: 'BIOS и ОЗУ' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={platform === tab.id}
                onClick={() => setPlatform(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  platform === tab.id
                    ? 'bg-emerald-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`grid gap-6 ${
            visibleCards.length === 1 ? 'md:grid-cols-1 max-w-2xl' : 'md:grid-cols-3'
          }`}
        >
          {visibleCards.map((card) => (
            <div
              key={card.id}
              className={`p-6 rounded-2xl bg-[#0C1220] border border-slate-800/90 ${card.borderHover} transition-colors`}
            >
              <div className={`font-mono text-xs font-bold mb-1.5 ${card.accentClass}`}>
                {card.brand}
              </div>
              <h3 className="text-lg font-bold text-white mb-4">{card.title}</h3>
              <dl className="divide-y divide-slate-800/80 text-xs sm:text-sm">
                {card.rows.map((row) => (
                  <div
                    key={row.setting}
                    className="py-2.5 flex items-baseline justify-between gap-4"
                  >
                    <dt className="text-slate-400 shrink-0">{row.setting}</dt>
                    <dd className="text-slate-100 font-medium text-right">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
