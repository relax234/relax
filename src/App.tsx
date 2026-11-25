import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  Gauge,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Snowflake,
  Terminal,
  Zap,
} from 'lucide-react';
import { copyTextSafe } from './utils/clipboard';
import { SnowBackground } from './components/SnowBackground';
import { APP_VERSION } from './utils/appUpdater';

const GITHUB_RELEASES_URL = 'https://github.com/relax234/OptiCore/releases/latest';
const SETUP_EXE_URL = 'https://github.com/relax234/OptiCore/releases/latest/download/OptiCore-Setup-1.2.2.exe';
const PORTABLE_EXE_URL = 'https://github.com/relax234/OptiCore/releases/latest/download/OptiCore-Portable-1.2.2.exe';

const LAUNCHER_BAT_SCRIPT = `@echo off
chcp 65001 >nul 2>&1
title OptiCore Launcher
echo Запуск OptiCore...
start https://ais-pre-ycozi4jcbblbjgudogp3hh-567239189723.europe-west1.run.app
exit`;

export default function App() {
  const [snowEnabled, setSnowEnabled] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [launcherCopied, setLauncherCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCopyLink = async (url: string, label: string) => {
    const ok = await copyTextSafe(url);
    if (ok) {
      setCopiedLink(label);
      window.setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  const handleDownloadLauncherBat = () => {
    const blob = new Blob([`\uFEFF${LAUNCHER_BAT_SCRIPT}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OptiCore_Launcher.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLauncherBat = async () => {
    const ok = await copyTextSafe(LAUNCHER_BAT_SCRIPT);
    if (ok) {
      setLauncherCopied(true);
      window.setTimeout(() => setLauncherCopied(false), 2000);
    }
  };

  const bulbs = [
    '#fbbf24',
    '#34d399',
    '#7dd3fc',
    '#fb7185',
    '#fbbf24',
    '#34d399',
    '#7dd3fc',
    '#fb7185',
    '#fbbf24',
    '#34d399',
    '#7dd3fc',
    '#fb7185',
  ];

  return (
    <div className="min-h-screen flex flex-col relative bg-[#070b14] text-slate-100 antialiased overflow-x-hidden">
      <SnowBackground enabled={snowEnabled} paused={false} />

      {/* Header Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#070b14]/90 border-b border-sky-200/12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <a
            href="#top"
            className="flex items-center gap-2.5 font-bold text-base tracking-tight text-white whitespace-nowrap shrink-0 group"
          >
            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-200 via-white to-sky-200 flex items-center justify-center text-slate-950 font-mono text-[11px] font-extrabold shadow-sm">
              <Snowflake className="w-3.5 h-3.5 text-slate-900" aria-hidden="true" />
            </span>
            <span>OptiCore</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-300/15 border border-amber-300/30 text-amber-200 font-mono text-[10px]">
              v{APP_VERSION} .exe
            </span>
          </a>

          <nav
            aria-label="Навигация"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
          >
            <a href="#download" className="hover:text-amber-200 transition-colors">
              Скачать .exe
            </a>
            <a href="#features" className="hover:text-amber-200 transition-colors">
              Возможности
            </a>
            <a href="#guide" className="hover:text-amber-200 transition-colors">
              Инструкция
            </a>
            <a href="#faq" className="hover:text-amber-200 transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="#download"
              className="px-4 py-2 rounded-xl bg-amber-300 hover:bg-amber-200 text-slate-950 font-bold text-xs sm:text-sm glow-btn inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Скачать .exe</span>
            </a>
          </div>
        </div>

        {/* Festive Garland Strip */}
        <div
          aria-hidden="true"
          className="w-full h-[3px] flex items-center justify-around px-4 pointer-events-none overflow-hidden opacity-85"
        >
          {bulbs.map((color, idx) => (
            <span
              key={idx}
              className="garland-bulb w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 6px ${color}`,
                animationDelay: `${(idx % 4) * 0.65}s`,
              }}
            />
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-20">
        {/* Hero Download Section */}
        <section id="download" className="py-12 sm:py-16 px-4 sm:px-6 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-300/10 border border-amber-300/30 text-amber-200 font-mono text-xs font-semibold animate-fade-up">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Сверхлегкий запуск · Мгновенное открытие без ошибок</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight animate-fade-up">
              Почему прошлый файл не открывался и как сделать идеальный <span className="text-amber-300">.exe</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed animate-fade-up">
              Ранее вы скачали архив с исходным кодом (Source code) вместо готового файла. Ниже вы можете скачать сверхлегкий лаунчер (~1 КБ) или готовые сборки — всё работает мгновенно и без сбоев.
            </p>

            {/* Direct Download Action Cards */}
            <div className="grid sm:grid-cols-2 gap-4 pt-4 max-w-2xl mx-auto animate-fade-up">
              <div className="p-5 rounded-2xl winter-card border border-amber-300/30 flex flex-col justify-between gap-4 text-left">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-amber-200">Мгновенный запуск</span>
                    <span className="text-[11px] font-mono text-slate-400">1 КБ</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">OptiCore_Launcher.bat</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Сверхлегкий файл для Windows: открывает приложение со всеми обновлениями моментально.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadLauncherBat}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-amber-300 hover:bg-amber-200 text-slate-950 font-bold text-xs text-center inline-flex items-center justify-center gap-2 glow-btn transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать лаунчер (.bat)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyLauncherBat()}
                    title="Копировать код"
                    className="p-2.5 rounded-xl bg-slate-900 border border-sky-200/20 hover:border-amber-300/40 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    {launcherCopied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-2xl winter-card border flex flex-col justify-between gap-4 text-left">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-sky-300">GitHub Releases</span>
                    <span className="text-[11px] font-mono text-slate-400">Setup / Portable</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">OptiCore .exe (GitHub)</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Скачайте готовый установщик или портативную версию с официальной страницы релизов.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <a
                    href={SETUP_EXE_URL}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-amber-300 hover:text-slate-950 border border-sky-200/20 text-slate-100 font-semibold text-xs text-center inline-flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать .exe с GitHub</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopyLink(SETUP_EXE_URL, 'setup')}
                    title="Копировать прямую ссылку"
                    className="p-2.5 rounded-xl bg-slate-900 border border-sky-200/20 hover:border-amber-300/40 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    {copiedLink === 'setup' ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Все версии доступны на{' '}
              <a
                href={GITHUB_RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className="text-amber-200 hover:underline inline-flex items-center gap-1 font-mono"
              >
                <span>GitHub Releases</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </section>

        {/* Features Preview */}
        <section id="features" className="py-12 px-4 sm:px-6 border-t border-sky-200/10 bg-[#080d19]/60">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <div className="text-xs font-mono text-amber-200 tracking-wide">
                Что внутри программы
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Всё для максимального FPS и стабильного пинга
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: Terminal,
                  title: 'Аудит Windows и BIOS (40+ параметров)',
                  desc: 'Проверяет режим UEFI/Legacy, ReBAR, XMP-профиль памяти, SMART диска, RSC/QoS и находит скрытые фризы.',
                },
                {
                  icon: Gauge,
                  title: 'Стресс-тест GPU + CPU',
                  desc: 'Нагружает видеокарту WebGL-шейдерами и потоками процессора, замеряет 1% Low FPS и выдает подсказки против микрофризов.',
                },
                {
                  icon: Activity,
                  title: '37 безопасных модулей и сети',
                  desc: 'Твики сетевого стека, отключение RSC/LLMNR, снятие 20% резерва QoS, оптимизация таймеров без риска банов в играх.',
                },
                {
                  icon: RefreshCw,
                  title: 'Мгновенные обновления',
                  desc: 'Любое улучшение интерфейса появляется в программе сразу — не нужно скачивать новые файлы.',
                },
                {
                  icon: ShieldCheck,
                  title: '100% Безопасность и точка отката',
                  desc: 'Никаких рискованных хаков, ломающих античиты (Vanguard, FACEIT AC). Любой твик можно вернуть в исходное состояние.',
                },
                {
                  icon: Monitor,
                  title: 'Сравнение ПК с другом',
                  desc: 'Сравните свой компьютер и FPS-потенциал со сборкой друга по короткой ссылке или коду конфигурации.',
                },
              ].map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div key={idx} className="p-5 rounded-2xl winter-card border space-y-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-300/15 border border-amber-300/35 flex items-center justify-center text-amber-300">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-white">{feat.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Installation Guide */}
        <section id="guide" className="py-12 px-4 sm:px-6 border-t border-sky-200/10">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="text-xs font-mono text-amber-200 tracking-wide">Быстрый старт</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Как запустить приложение</h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl winter-card border space-y-2">
                <div className="font-mono text-sm font-bold text-amber-300">Шаг 1</div>
                <h3 className="text-base font-bold text-white">Скачайте файл</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Нажмите кнопку скачивания лаунчера или .exe версии на этой странице.
                </p>
              </div>
              <div className="p-5 rounded-2xl winter-card border space-y-2">
                <div className="font-mono text-sm font-bold text-amber-300">Шаг 2</div>
                <h3 className="text-base font-bold text-white">Запуск от админа</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Кликните правой кнопкой мыши по файлу и выберите «Запуск от имени администратора».
                </p>
              </div>
              <div className="p-5 rounded-2xl winter-card border space-y-2">
                <div className="font-mono text-sm font-bold text-amber-300">Шаг 3</div>
                <h3 className="text-base font-bold text-white">Побеждайте лаги</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Пользуйтесь аудитом, тестами и сетевыми твиками в удобном интерфейсе.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-12 px-4 sm:px-6 border-t border-sky-200/10 bg-[#080d19]/60">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="text-xs font-mono text-amber-200 tracking-wide">Вопросы и ответы</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Часто задаваемые вопросы</h2>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: 'Почему прошлый файл не открывался?',
                  a: 'На GitHub вы случайно скачали архив с исходным кодом проекта (Source code) вместо готового исполняемого файла. Используйте кнопки выше для скачивания лаунчера или .exe.',
                },
                {
                  q: 'Безопасен ли файл для античитов?',
                  a: 'Да. OptiCore использует только официальные и безопасные параметры реестра Windows, не затрагивая ядро системы и не вызывая банов в играх (Vanguard, FACEIT AC).',
                },
                {
                  q: 'Нужно ли качать файлы при обновлениях?',
                  a: 'Нет! Приложение автоматически подтягивает актуальный интерфейс из облака при каждом запуске.',
                },
              ].map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="rounded-xl winter-card border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="w-full p-4 text-left flex items-center justify-between gap-4 font-semibold text-sm text-slate-100 hover:text-white transition cursor-pointer"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-sky-200/12">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-7 px-4 sm:px-6 border-t border-sky-200/12 bg-[#060912] relative z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-semibold text-slate-200">
            <span className="w-5 h-5 rounded bg-amber-300 flex items-center justify-center text-slate-950 font-mono text-[10px] font-extrabold">
              <Snowflake className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span>OptiCore v{APP_VERSION}</span>
            <span className="text-slate-600">·</span>
            <span>Официальный центр загрузки Windows .exe</span>
          </div>

          <div className="flex items-center gap-4">
            <a href={GITHUB_RELEASES_URL} target="_blank" rel="noreferrer" className="hover:text-amber-200 transition-colors">
              GitHub Releases
            </a>
            <button
              type="button"
              onClick={() => setSnowEnabled((s) => !s)}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-sky-200/20 hover:border-amber-300/40 text-slate-200 font-mono text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition"
            >
              <Snowflake className="w-3 h-3 text-sky-300" aria-hidden="true" />
              <span>{snowEnabled ? 'Снег: ВКЛ' : 'Снег: ВЫКЛ'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
