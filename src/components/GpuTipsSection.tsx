import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyTextSafe } from '../utils/clipboard';

type PlatformTab = 'all' | 'nvidia' | 'amd' | 'bios' | 'winr';

interface TipRow {
  setting: string;
  value: string;
}

interface TipCardData {
  id: 'nvidia' | 'amd' | 'bios';
  brand: string;
  title: string;
  rows: TipRow[];
}

const TIP_CARDS: TipCardData[] = [
  {
    id: 'nvidia',
    brand: 'NVIDIA Control Panel',
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
    title: 'Бесплатный прирост железа',
    rows: [
      { setting: 'Профиль XMP / EXPO', value: 'Вкл (вместо 2133/4800 МГц)' },
      { setting: 'Above 4G + ReBAR', value: '+5–10% FPS в DX12 / Vulkan' },
      { setting: 'Температура CPU', value: 'Держать ниже 85°C' },
      { setting: 'Температура GPU', value: 'Держать ниже 80°C' },
    ],
  },
];

const WINR_COMMANDS = [
  { cmd: 'powercfg.cpl', desc: 'Быстрый выбор схемы питания Windows' },
  { cmd: 'msconfig', desc: 'Отключение лишних не-Microsoft служб и загрузки' },
  { cmd: 'cleanmgr', desc: 'Встроенная глубокая очистка диска и старых обновлений' },
  { cmd: 'sysdm.cpl', desc: 'Быстродействие, визуальные эффекты и файл подкачки' },
  { cmd: 'resmon', desc: 'Монитор ресурсов: кто реально грузит CPU, сеть и SSD' },
  { cmd: 'dxdiag', desc: 'Проверка DirectX и точной версии драйвера видеокарты' },
];

export function GpuTipsSection() {
  const [platform, setPlatform] = useState<PlatformTab>('all');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const visibleCards = TIP_CARDS.filter((c) => platform === 'all' || c.id === platform);

  const handleCopyCmd = async (cmd: string) => {
    const ok = await copyTextSafe(cmd);
    if (ok) {
      setCopiedCmd(cmd);
      window.setTimeout(() => setCopiedCmd(null), 1600);
    }
  };

  return (
    <section
      id="gpu-tips"
      className="py-9 sm:py-11 px-4 sm:px-6 border-t border-zinc-800/80 bg-zinc-950/50"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-mono text-zinc-400 tracking-wide">
              05 · Драйверы, BIOS и быстрые команды
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 text-white">
              Шпаргалка драйверов и Win+R
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Выбор раздела"
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#111113] border border-zinc-800"
          >
            {(
              [
                { id: 'all', label: 'Все' },
                { id: 'nvidia', label: 'NVIDIA' },
                { id: 'amd', label: 'AMD' },
                { id: 'bios', label: 'BIOS' },
                { id: 'winr', label: 'Команды Win+R' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={platform === tab.id}
                onClick={() => setPlatform(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  platform === tab.id
                    ? 'bg-white text-zinc-950 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {platform === 'winr' ? (
          <div
            data-testid="winr-commands-grid"
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {WINR_COMMANDS.map((item) => (
              <button
                key={item.cmd}
                type="button"
                onClick={() => void handleCopyCmd(item.cmd)}
                className="p-4 rounded-xl bg-[#111113] border border-zinc-800 hover:border-zinc-500 text-left flex items-start justify-between gap-3 transition cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="font-mono text-sm font-bold text-white">{item.cmd}</div>
                  <div className="text-xs text-zinc-400 mt-1 leading-relaxed">{item.desc}</div>
                </div>
                <span className="text-[11px] font-mono text-zinc-400 inline-flex items-center gap-1 shrink-0 pt-0.5">
                  {copiedCmd === item.cmd ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Ок</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Копия</span>
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div
            className={`grid gap-4 ${
              visibleCards.length === 1 ? 'md:grid-cols-1 max-w-2xl' : 'md:grid-cols-3'
            }`}
          >
            {visibleCards.map((card) => (
              <div
                key={card.id}
                className="p-4 sm:p-5 rounded-2xl bg-[#111113] border border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                <div className="font-mono text-xs font-semibold text-zinc-400 mb-1">
                  {card.brand}
                </div>
                <h3 className="text-base font-bold text-white mb-3">{card.title}</h3>
                <dl className="divide-y divide-zinc-800/80 text-xs">
                  {card.rows.map((row) => (
                    <div
                      key={row.setting}
                      className="py-2 flex items-baseline justify-between gap-3"
                    >
                      <dt className="text-zinc-400 shrink-0">{row.setting}</dt>
                      <dd className="text-zinc-100 font-medium text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
