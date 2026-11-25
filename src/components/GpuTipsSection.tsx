import { useState } from 'react';
import { AlertTriangle, Check, Copy, Download, Terminal } from 'lucide-react';
import { copyTextSafe } from '../utils/clipboard';
import { buildWingetUpgradeCommand, generateWingetUpdateScript } from '../utils/opticore';

export type PlatformTab = 'all' | 'nvidia' | 'amd' | 'bios' | 'winr' | 'cmd';

interface GpuTipsSectionProps {
  activeTab?: PlatformTab;
  onTabChange?: (tab: PlatformTab) => void;
}

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

const CMD_UPDATE_COMMANDS = [
  {
    title: '1. Показать доступные обновления (безопасный просмотр)',
    cmd: 'winget upgrade',
    desc: 'Выведет таблицу программ, текущую версию и новую доступную версию без установки.',
  },
  {
    title: '2. Обновить все программы сразу (базовая команда)',
    cmd: 'winget upgrade --all --accept-package-agreements --accept-source-agreements',
    desc: 'Обновит все найденные приложения и автоматически примет лицензионные соглашения.',
  },
  {
    title: '3. Обновить всё тихо, включая программы с версией Unknown',
    cmd: 'winget upgrade --all --include-unknown --silent --accept-package-agreements --accept-source-agreements',
    desc: 'Подхватывает Discord, утилиты и пакеты без указанной версии; установка идёт в фоне.',
  },
  {
    title: '4. Обновить одну конкретную программу по точному ID',
    cmd: 'winget upgrade --id Valve.Steam -e --accept-package-agreements',
    desc: 'Удобно для точечного обновления (примеры ID: Discord.Discord, OBSProject.OBSStudio, 7zip.7zip).',
  },
  {
    title: '5. Найти ID нужной программы в базе winget',
    cmd: 'winget search Discord',
    desc: 'Подставьте своё название вместо Discord, чтобы узнать точный Package ID для обновления.',
  },
  {
    title: '6. Починить базу winget при ошибках или пустом списке',
    cmd: 'winget source reset --force && winget source update',
    desc: 'Перезагружает индекс источников Microsoft (запускайте в CMD от имени администратора).',
  },
];

export function GpuTipsSection({ activeTab, onTabChange }: GpuTipsSectionProps) {
  const [internalTab, setInternalTab] = useState<PlatformTab>('all');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [includeUnknown, setIncludeUnknown] = useState(true);
  const [silentMode, setSilentMode] = useState(true);

  const platform = activeTab ?? internalTab;
  const setPlatform = (next: PlatformTab) => {
    if (onTabChange) {
      onTabChange(next);
    } else {
      setInternalTab(next);
    }
  };

  const visibleCards = TIP_CARDS.filter((c) => platform === 'all' || c.id === platform);
  const builtWingetCmd = buildWingetUpgradeCommand({
    includeUnknown,
    silent: silentMode,
  });

  const handleCopyCmd = async (cmd: string) => {
    const ok = await copyTextSafe(cmd);
    if (ok) {
      setCopiedCmd(cmd);
      window.setTimeout(() => setCopiedCmd(null), 1600);
    }
  };

  const handleDownloadWingetBat = () => {
    const script = generateWingetUpdateScript({
      includeUnknown,
      silent: silentMode,
    });
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OptiCore_UpdateApps.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="gpu-tips"
      className="py-9 sm:py-11 px-4 sm:px-6 border-t border-sky-200/10 bg-[#080d19]/55"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="text-xs font-mono text-amber-200/90 tracking-wide">
              05 · Драйверы, BIOS, CMD и быстрые команды
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 text-white">
              Шпаргалка драйверов, Win+R и CMD
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Выбор раздела"
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl winter-card border shrink-0"
          >
            {(
              [
                { id: 'all', label: 'Все' },
                { id: 'nvidia', label: 'NVIDIA' },
                { id: 'amd', label: 'AMD' },
                { id: 'bios', label: 'BIOS' },
                { id: 'winr', label: 'Win+R' },
                { id: 'cmd', label: 'Обновление CMD' },
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
                    ? 'bg-amber-300 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
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
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-up"
          >
            {WINR_COMMANDS.map((item) => (
              <button
                key={item.cmd}
                type="button"
                onClick={() => void handleCopyCmd(item.cmd)}
                className="p-4 rounded-xl winter-card border hover:border-amber-300/40 text-left flex items-start justify-between gap-3 transition cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="font-mono text-sm font-bold text-amber-200">{item.cmd}</div>
                  <div className="text-xs text-slate-300 mt-1 leading-relaxed">{item.desc}</div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 inline-flex items-center gap-1 shrink-0 pt-0.5">
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
        ) : platform === 'cmd' ? (
          <div data-testid="cmd-update-guide" className="space-y-4 animate-fade-up">
            {/* Step-by-step Instructions + Live Command Builder */}
            <div className="grid lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-6 min-w-0 p-4 sm:p-5 rounded-2xl winter-card border space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-amber-200">
                  <Terminal className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Пошаговая инструкция (Windows 10 / 11)</span>
                </div>
                <ol className="space-y-2.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
                  <li className="flex gap-2.5">
                    <span className="font-mono font-bold text-amber-300 shrink-0">01.</span>
                    <span>
                      Нажми <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-sky-200/20 font-mono text-[11px] text-amber-200">Win + R</kbd>, введи{' '}
                      <code className="font-mono text-amber-200">cmd</code> и нажми{' '}
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-sky-200/20 font-mono text-[11px] text-amber-200">Ctrl + Shift + Enter</kbd>{' '}
                      — командная строка откроется от имени администратора.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-mono font-bold text-amber-300 shrink-0">02.</span>
                    <span>
                      Сначала посмотри, для каких программ вышли апдейты: введи{' '}
                      <code className="font-mono text-amber-200">winget upgrade</code> и нажми Enter.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-mono font-bold text-amber-300 shrink-0">03.</span>
                    <span>
                      Чтобы обновить всё разом без лишних вопросов, вставь команду из конструктора справа (ПКМ в окне CMD вставляет скопированный текст) или скачай готовый{' '}
                      <code className="font-mono text-amber-200">.bat</code>.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-mono font-bold text-amber-300 shrink-0">04.</span>
                    <span>
                      Если какая-то программа запущена (например, Discord, Steam или браузер), закрой её в системном трее — иначе установщик не сможет заменить файлы.
                    </span>
                  </li>
                </ol>
              </div>

              <div className="lg:col-span-6 min-w-0 p-4 sm:p-5 rounded-2xl winter-card border flex flex-col justify-between gap-3">
                <div className="space-y-3 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold text-amber-200">
                      Быстрая команда и рабочий .bat-файл
                    </span>
                    <span className="text-[11px] font-mono text-emerald-300">
                      Встроенный менеджер winget
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-slate-200">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeUnknown}
                        onChange={(e) => setIncludeUnknown(e.target.checked)}
                        className="w-4 h-4 rounded accent-amber-300 cursor-pointer"
                      />
                      <span>Захватывать Unknown-версии</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={silentMode}
                        onChange={(e) => setSilentMode(e.target.checked)}
                        className="w-4 h-4 rounded accent-amber-300 cursor-pointer"
                      />
                      <span>Тихая установка (--silent)</span>
                    </label>
                  </div>

                  <pre className="p-3 rounded-xl bg-[#070b14] border border-sky-200/15 text-xs font-mono text-amber-200 whitespace-pre-wrap break-words leading-relaxed">
                    <code>{builtWingetCmd}</code>
                  </pre>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="copy-winget-cmd"
                    onClick={() => void handleCopyCmd(builtWingetCmd)}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 border border-sky-200/20 hover:border-amber-300/45 text-xs font-semibold text-slate-100 inline-flex items-center gap-1.5 cursor-pointer transition"
                  >
                    {copiedCmd === builtWingetCmd ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Команда скопирована</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-300" />
                        <span>Копировать команду</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    data-testid="download-winget-bat"
                    onClick={handleDownloadWingetBat}
                    className="px-3.5 py-2 rounded-lg bg-amber-300 hover:bg-amber-200 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition glow-btn"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать OptiCore_UpdateApps.bat</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Individual Verified CMD Commands */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CMD_UPDATE_COMMANDS.map((item) => (
                <button
                  key={item.cmd}
                  type="button"
                  onClick={() => void handleCopyCmd(item.cmd)}
                  className="p-4 rounded-xl winter-card border hover:border-amber-300/40 text-left flex flex-col justify-between gap-2.5 transition cursor-pointer"
                >
                  <div className="space-y-1.5 min-w-0 w-full">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-white leading-snug">
                        {item.title}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 inline-flex items-center gap-1 shrink-0">
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
                    </div>
                    <div className="p-2 rounded-lg bg-[#070b14] border border-sky-200/12 font-mono text-[11px] text-amber-200 break-all">
                      {item.cmd}
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">{item.desc}</div>
                </button>
              ))}
            </div>

            {/* Troubleshooting Cards */}
            <div className="grid md:grid-cols-3 gap-3">
              <div className="min-w-0 p-3.5 rounded-xl border border-amber-300/25 bg-[#070b14]/85 text-xs space-y-1">
                <div className="font-semibold text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>«winget» не распознан в CMD</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Откройте Microsoft Store, найдите{' '}
                  <strong className="text-white">Установщик приложений (App Installer)</strong> и
                  нажмите «Обновить». Быстрый вызов из CMD:{' '}
                  <code className="font-mono text-amber-200 break-all">
                    start ms-windows-store://pdp/?productid=9NBLGGH4NNS1
                  </code>
                </p>
              </div>
              <div className="min-w-0 p-3.5 rounded-xl border border-sky-200/15 bg-[#070b14]/85 text-xs space-y-1">
                <div className="font-semibold text-white">Иероглифы вместо кириллицы</div>
                <p className="text-slate-300 leading-relaxed">
                  В классической CMD перед запуском введите{' '}
                  <code className="font-mono text-amber-200">chcp 65001</code> — консоль перейдёт в
                  UTF-8, и русские названия отобразятся чисто. В скачанном{' '}
                  <code className="font-mono text-amber-200">.bat</code> это уже вшито.
                </p>
              </div>
              <div className="min-w-0 p-3.5 rounded-xl border border-sky-200/15 bg-[#070b14]/85 text-xs space-y-1">
                <div className="font-semibold text-white">Ошибка источника или зависание</div>
                <p className="text-slate-300 leading-relaxed">
                  Выполните{' '}
                  <code className="font-mono text-amber-200 break-words">
                    winget source reset --force && winget source update
                  </code>{' '}
                  от администратора и повторите обновление. Если мешает запущенная программа —
                  закройте её в трее.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-4 animate-fade-up ${
              visibleCards.length === 1 ? 'md:grid-cols-1 max-w-2xl' : 'md:grid-cols-3'
            }`}
          >
            {visibleCards.map((card) => (
              <div
                key={card.id}
                className="p-4 sm:p-5 rounded-2xl winter-card border hover:border-sky-200/25 transition-colors"
              >
                <div className="font-mono text-xs font-semibold text-amber-200/85 mb-1">
                  {card.brand}
                </div>
                <h3 className="text-base font-bold text-white mb-3">{card.title}</h3>
                <dl className="divide-y divide-sky-200/12 text-xs">
                  {card.rows.map((row) => (
                    <div
                      key={row.setting}
                      className="py-2 flex items-baseline justify-between gap-3"
                    >
                      <dt className="text-slate-300 shrink-0">{row.setting}</dt>
                      <dd className="text-slate-100 font-medium text-right">{row.value}</dd>
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
