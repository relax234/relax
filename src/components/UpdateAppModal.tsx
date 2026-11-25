import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  MonitorDown,
  RefreshCw,
  X,
} from 'lucide-react';
import { copyTextSafe } from '../utils/clipboard';
import {
  APP_VERSION,
  compareSemver,
  parseVersionManifest,
  type VersionManifest,
} from '../utils/appUpdater';
import type { DesktopUpdateEvent } from '../types/electron';

interface UpdateAppModalProps {
  open: boolean;
  onClose: () => void;
}

type WebCheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'up-to-date'; manifest: VersionManifest }
  | { status: 'available'; manifest: VersionManifest }
  | { status: 'error'; message: string };

export function UpdateAppModal({ open, onClose }: UpdateAppModalProps) {
  const [isElectron, setIsElectron] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(APP_VERSION);
  const [desktopState, setDesktopState] = useState<DesktopUpdateEvent | null>(null);
  const [webState, setWebState] = useState<WebCheckState>({ status: 'idle' });
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    const bridge = window.opticoreDesktop;
    if (!bridge) return;

    let unsub: (() => void) | undefined;
    void bridge
      .getAppInfo()
      .then((info) => {
        if (info?.isElectron) {
          setIsElectron(true);
          if (info.version) setCurrentVersion(info.version);
        }
      })
      .catch(() => {});

    unsub = bridge.onUpdateStatus((evt) => {
      setDesktopState(evt);
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  if (!open) return null;

  const handleCheckUpdates = async () => {
    const bridge = window.opticoreDesktop;
    if (bridge && isElectron) {
      setDesktopState({ state: 'checking' });
      const res = await bridge.checkForUpdates();
      if (!res.ok && res.error) {
        setDesktopState({ state: 'error', message: res.error });
      }
      return;
    }

    setWebState({ status: 'checking' });
    try {
      const resp = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data: unknown = await resp.json();
      const manifest = parseVersionManifest(data);
      if (!manifest) {
        throw new Error('Некорректный формат version.json');
      }
      if (compareSemver(manifest.version, currentVersion) > 0) {
        setWebState({ status: 'available', manifest });
      } else {
        setWebState({ status: 'up-to-date', manifest });
      }
    } catch {
      setWebState({
        status: 'error',
        message: 'Не удалось получить версию. Проверьте подключение к интернету.',
      });
    }
  };

  const handleCopy = async (text: string) => {
    const ok = await copyTextSafe(text);
    if (ok) {
      setCopiedCmd(text);
      window.setTimeout(() => setCopiedCmd(null), 1600);
    }
  };

  const localBuildCmd = 'npm install && npm run build:exe';
  const tagReleaseCmd = `git tag v${currentVersion} && git push --tags`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      data-testid="update-app-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04070e]/85 animate-fade-up"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0b1220] border border-sky-200/20 shadow-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-300/15 border border-amber-300/35 flex items-center justify-center shrink-0">
              <MonitorDown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 id="update-modal-title" className="text-lg sm:text-xl font-bold text-white">
                Обновление OptiCore и Windows .exe
              </h2>
              <div className="text-xs font-mono text-slate-300 flex flex-wrap items-center gap-2 mt-0.5">
                <span>Версия: v{currentVersion}</span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="text-amber-200">
                  {isElectron ? 'Настольное приложение (.exe)' : 'Веб-версия (готова к .exe)'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно обновлений"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Update Checker */}
        <div className="p-4 rounded-xl winter-card border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white">Проверка обновлений</div>
              <div className="text-xs text-slate-300 mt-0.5">
                {isElectron
                  ? 'Загружает новые релизы автоматически прямо внутри .exe приложения.'
                  : 'Проверяет актуальную версию и релиз-ноты приложения.'}
              </div>
            </div>
            <button
              type="button"
              data-testid="check-updates-btn"
              onClick={() => void handleCheckUpdates()}
              disabled={
                webState.status === 'checking' ||
                desktopState?.state === 'checking' ||
                desktopState?.state === 'downloading'
              }
              className="px-4 py-2 rounded-xl bg-amber-300 hover:bg-amber-200 disabled:opacity-60 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer glow-btn"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  webState.status === 'checking' || desktopState?.state === 'checking'
                    ? 'animate-spin'
                    : ''
                }`}
              />
              <span>Проверить обновление</span>
            </button>
          </div>

          {/* Electron Desktop Updater States */}
          {isElectron && desktopState && (
            <div
              data-testid="update-status-box"
              className="p-3 rounded-lg bg-[#070b14] border border-sky-200/15 text-xs space-y-2"
            >
              {desktopState.state === 'checking' && (
                <div className="text-slate-200 font-mono">
                  Подключение к серверу обновлений...
                </div>
              )}
              {desktopState.state === 'not-available' && (
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Установлена последняя версия v{desktopState.version || currentVersion}.</span>
                </div>
              )}
              {desktopState.state === 'available' && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-amber-200 font-semibold">
                    Доступно обновление v{desktopState.version}!
                  </span>
                  <button
                    type="button"
                    onClick={() => void window.opticoreDesktop?.downloadUpdate()}
                    className="px-3 py-1.5 rounded-lg bg-amber-300 hover:bg-amber-200 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать обновление</span>
                  </button>
                </div>
              )}
              {desktopState.state === 'downloading' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-slate-200">
                    <span>Загрузка новой версии...</span>
                    <span>{desktopState.progressPercent ?? 0}%</span>
                  </div>
                  <div className="h-1.5 rounded bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-300 transition-all"
                      style={{ width: `${desktopState.progressPercent ?? 0}%` }}
                    />
                  </div>
                </div>
              )}
              {desktopState.state === 'downloaded' && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-emerald-300 font-semibold">
                    Обновление v{desktopState.version} скачано и готово к установке.
                  </span>
                  <button
                    type="button"
                    onClick={() => void window.opticoreDesktop?.installUpdate()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Перезапустить и обновить
                  </button>
                </div>
              )}
              {desktopState.state === 'error' && (
                <div className="text-rose-300">{desktopState.message}</div>
              )}
            </div>
          )}

          {/* Web Update States */}
          {!isElectron && webState.status !== 'idle' && (
            <div
              data-testid="update-status-box"
              className="p-3 rounded-lg bg-[#070b14] border border-sky-200/15 text-xs space-y-1.5"
            >
              {webState.status === 'checking' && (
                <div className="text-slate-200 font-mono">Проверка версии...</div>
              )}
              {webState.status === 'up-to-date' && (
                <>
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>У вас актуальная версия v{webState.manifest.version}</span>
                  </div>
                  {webState.manifest.notes && (
                    <p className="text-slate-300 leading-relaxed">{webState.manifest.notes}</p>
                  )}
                </>
              )}
              {webState.status === 'available' && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-amber-200 font-semibold">
                      Доступна новая версия v{webState.manifest.version}!
                    </div>
                    {webState.manifest.notes && (
                      <div className="text-slate-300 mt-0.5">{webState.manifest.notes}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-3 py-1.5 rounded-lg bg-amber-300 hover:bg-amber-200 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Обновить сейчас
                  </button>
                </div>
              )}
              {webState.status === 'error' && (
                <div className="text-rose-300">{webState.message}</div>
              )}
            </div>
          )}
        </div>

        {/* How to build & share .exe with a friend */}
        <div className="p-4 rounded-xl bg-[#070b14]/90 border border-sky-200/15 space-y-3 text-xs">
          <div className="font-bold text-sm text-white">
            Как получить готовый .exe и поделиться с другом
          </div>

          <div className="space-y-2 text-slate-300 leading-relaxed">
            <p>
              В проект уже встроена оболочка Electron (Windows-приложение с таким же интерфейсом и
              рабочей кнопкой «Проверить обновление» через GitHub Releases):
            </p>
            <ol className="space-y-1.5 list-decimal list-inside text-slate-200">
              <li>
                <strong className="text-white">Способ 1 — Автосборка на GitHub (удобнее для друга):</strong>{' '}
                загрузи проект в свой репозиторий GitHub и отправь тег версии — GitHub Actions сам
                соберёт{' '}
                <code className="font-mono text-amber-200">OptiCore-Setup-{currentVersion}.exe</code>{' '}
                и <code className="font-mono text-amber-200">OptiCore-Portable-{currentVersion}.exe</code>{' '}
                во вкладку <strong className="text-white">Releases</strong>. Друг скачает{' '}
                <code className="font-mono text-amber-200">.exe</code> по прямой ссылке без установки
                Node.js, а новые релизы будут прилетать по кнопке внутри приложения.
              </li>
              <li>
                <strong className="text-white">Способ 2 — Сборка прямо на Windows ПК:</strong>{' '}
                скачай проект, открой терминал в папке и выполни команду ниже — оба{' '}
                <code className="font-mono text-amber-200">.exe</code> файла появятся в папке{' '}
                <code className="font-mono text-amber-200">release/</code>.
              </li>
            </ol>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => void handleCopy(localBuildCmd)}
              className="p-2.5 rounded-lg winter-card border hover:border-amber-300/40 text-left flex items-center justify-between gap-2 cursor-pointer transition"
            >
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">Сборка .exe на ПК:</div>
                <div className="font-mono text-[11px] text-amber-200 truncate">{localBuildCmd}</div>
              </div>
              {copiedCmd === localBuildCmd ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleCopy(tagReleaseCmd)}
              className="p-2.5 rounded-lg winter-card border hover:border-amber-300/40 text-left flex items-center justify-between gap-2 cursor-pointer transition"
            >
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">Выпуск релиза на GitHub:</div>
                <div className="font-mono text-[11px] text-amber-200 truncate">{tagReleaseCmd}</div>
              </div>
              {copiedCmd === tagReleaseCmd ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
