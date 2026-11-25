import { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Link2,
  Minus,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { copyTextSafe } from '../utils/clipboard';
import {
  buildShareUrl,
  comparePcProfiles,
  createDemoFriendSnapshot,
  decodeShareInput,
  encodeShareCode,
  type OptFlagId,
  type OptFlagState,
  type PcShareSnapshot,
} from '../utils/compare';

interface CompareSectionProps {
  myName: string;
  onMyNameChange: (name: string) => void;
  mySnapshot: PcShareSnapshot | null;
  friendSnapshot: PcShareSnapshot | null;
  scanning: boolean;
  onRunScan: () => Promise<void>;
  onLoadFriend: (snapshot: PcShareSnapshot) => void;
  onClearFriend: () => void;
  onToggleMyOptFlag: (flagId: OptFlagId, nextState: boolean) => void;
  onAddModulesToGenerator: (moduleIds: string[]) => void;
}

type OptFilterTab = 'all' | 'diff' | 'friend_only' | 'me_only';

function OptStatePill({
  state,
  interactive,
  onClick,
  ariaLabel,
}: {
  state: OptFlagState;
  interactive?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const isOn = state === 'on';
  const isOff = state === 'off';

  const colorClass = isOn
    ? 'text-emerald-300 border-emerald-500/35 bg-emerald-500/10'
    : isOff
      ? 'text-rose-300 border-rose-500/30 bg-rose-500/10'
      : 'text-slate-400 border-slate-700/80 bg-slate-900/70';

  const icon = isOn ? (
    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
  ) : isOff ? (
    <XCircle className="w-3.5 h-3.5 shrink-0" />
  ) : (
    <Minus className="w-3.5 h-3.5 shrink-0" />
  );

  const label = isOn ? 'Врублено' : isOff ? 'Вырублено' : 'Не отмечено';

  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        title="Нажми, чтобы переключить статус у себя"
        className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition hover:brightness-125 cursor-pointer whitespace-nowrap ${colorClass}`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }

  return (
    <span
      className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${colorClass}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

export function CompareSection({
  myName,
  onMyNameChange,
  mySnapshot,
  friendSnapshot,
  scanning,
  onRunScan,
  onLoadFriend,
  onClearFriend,
  onToggleMyOptFlag,
  onAddModulesToGenerator,
}: CompareSectionProps) {
  const [pasteInput, setPasteInput] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [editingFriend, setEditingFriend] = useState(false);
  const [copiedType, setCopiedType] = useState<'link' | 'code' | null>(null);
  const [optFilter, setOptFilter] = useState<OptFilterTab>('all');
  const [importedNotice, setImportedNotice] = useState(false);

  const countEnabledOpts = (snap: PcShareSnapshot) =>
    Object.values(snap.opts).filter((v) => v === 'on').length;

  const handleCopyShareLink = async () => {
    if (!mySnapshot) return;
    const base = `${window.location.origin}${window.location.pathname}`;
    const url = buildShareUrl(base, mySnapshot);
    const ok = await copyTextSafe(url);
    if (ok) {
      setCopiedType('link');
      window.setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleCopyShareCode = async () => {
    if (!mySnapshot) return;
    const code = encodeShareCode(mySnapshot);
    const ok = await copyTextSafe(code);
    if (ok) {
      setCopiedType('code');
      window.setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleImportFriend = () => {
    const parsed = decodeShareInput(pasteInput);
    if (!parsed.ok) {
      setPasteError(parsed.error);
      return;
    }
    setPasteError(null);
    setEditingFriend(false);
    setPasteInput('');
    onLoadFriend(parsed.snapshot);
  };

  const handleLoadDemoFriend = () => {
    setPasteError(null);
    setEditingFriend(false);
    onLoadFriend(createDemoFriendSnapshot());
  };

  const comparison =
    mySnapshot && friendSnapshot ? comparePcProfiles(mySnapshot, friendSnapshot) : null;

  const filteredOptRows = comparison
    ? comparison.optRows.filter((row) => {
        if (optFilter === 'diff') return row.mine !== row.friend;
        if (optFilter === 'friend_only') return row.diffType === 'friend_only';
        if (optFilter === 'me_only') return row.diffType === 'me_only';
        return true;
      })
    : [];

  const diffCount = comparison
    ? comparison.optRows.filter((r) => r.mine !== r.friend).length
    : 0;

  return (
    <section
      id="compare"
      className="py-16 px-4 sm:px-6 border-t border-slate-800/70"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-10">
          <div>
            <div className="text-xs font-mono text-violet-400 tracking-wide">
              02 · Сравнение систем и твиков
            </div>
            <h2 className="text-3xl font-bold mt-1.5 text-white">
              Сравнение твоего ПК с ПК друга
            </h2>
            <p className="text-slate-400 text-sm mt-2 max-w-2xl">
              Сверь видеокарту, герцовку и стабильность кадров, а главное — наглядно посмотри,
              какие оптимизации врублены у тебя и какие включены у друга.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
            <Users className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Работает по прямой ссылке, коду OC1 или отчёту PowerShell</span>
          </div>
        </div>

        {/* Two Side-by-Side Profile Setup Cards */}
        <div className="grid lg:grid-cols-2 gap-6 items-stretch mb-8">
          {/* LEFT: MY PC */}
          <div className="p-6 rounded-2xl bg-[#0C1220] border border-slate-800/90 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <label htmlFor="my-pc-name" className="block text-[11px] font-mono text-cyan-400 mb-1">
                    Твой профиль
                  </label>
                  <input
                    id="my-pc-name"
                    type="text"
                    maxLength={28}
                    value={myName}
                    onChange={(e) => onMyNameChange(e.target.value)}
                    placeholder="Мой ПК"
                    className="w-full max-w-xs px-3 py-1.5 rounded-lg bg-[#060911] border border-slate-700/80 focus:border-cyan-400 focus:outline-none text-sm font-bold text-white"
                  />
                </div>
                <div className="text-xs font-mono text-slate-400 text-right">
                  {mySnapshot ? (
                    <span className="text-emerald-300">Готов к сравнению</span>
                  ) : (
                    <span>Ожидает сканирования</span>
                  )}
                </div>
              </div>

              {mySnapshot ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-800/80">
                    <div>
                      <div className="text-[11px] font-mono text-slate-400">Индекс</div>
                      <div className="text-lg font-extrabold text-cyan-400 font-mono tabular-nums mt-0.5">
                        {mySnapshot.hw.score}/100
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-slate-400">Экран</div>
                      <div className="text-lg font-extrabold text-white font-mono tabular-nums mt-0.5">
                        {mySnapshot.hw.hz} Гц
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-slate-400">Оптимизация</div>
                      <div className="text-lg font-extrabold text-emerald-400 font-mono tabular-nums mt-0.5">
                        {countEnabledOpts(mySnapshot)}/12
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <div className="truncate" title={mySnapshot.hw.gpu}>
                      <span className="text-slate-500">GPU: </span>
                      {mySnapshot.hw.gpu}
                    </div>
                    <div className="truncate" title={mySnapshot.hw.cpu}>
                      <span className="text-slate-500">CPU: </span>
                      {mySnapshot.hw.cpu}
                      <span className="text-slate-600 mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-400">
                        {mySnapshot.hw.hasWinReport ? 'PowerShell-отчёт' : 'Браузер + чек-лист'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#060911]/80 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                  Нажми «Просканировать мой ПК», чтобы зафиксировать характеристики твоего железа
                  и собрать ссылку-приглашение для друга.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800/70">
              {!mySnapshot ? (
                <button
                  type="button"
                  onClick={() => void onRunScan()}
                  disabled={scanning}
                  className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 text-slate-950 font-bold text-xs sm:text-sm glow-btn inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-4 h-4" />
                  <span>{scanning ? 'Идёт скан...' : 'Просканировать мой ПК'}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs glow-btn inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {copiedType === 'link' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedType === 'link' ? 'Ссылка скопирована ✓' : 'Скопировать ссылку для друга'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyShareCode}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {copiedType === 'code' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedType === 'code' ? 'Код скопирован ✓' : 'Код профиля'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* RIGHT: FRIEND PC */}
          <div className="p-6 rounded-2xl bg-[#0C1220] border border-slate-800/90 flex flex-col justify-between gap-5">
            {friendSnapshot && !editingFriend ? (
              <>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-violet-400 mb-1">
                        Профиль друга
                      </div>
                      <h3 className="text-lg font-bold text-white truncate">
                        {friendSnapshot.name}
                      </h3>
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      {friendSnapshot.isDemo ? 'Демо-профиль' : 'Загружен'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-800/80">
                    <div>
                      <div className="text-[11px] font-mono text-slate-400">Индекс</div>
                      <div className="text-lg font-extrabold text-violet-300 font-mono tabular-nums mt-0.5">
                        {friendSnapshot.hw.score}/100
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-slate-400">Экран</div>
                      <div className="text-lg font-extrabold text-white font-mono tabular-nums mt-0.5">
                        {friendSnapshot.hw.hz} Гц
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-slate-400">Оптимизация</div>
                      <div className="text-lg font-extrabold text-emerald-400 font-mono tabular-nums mt-0.5">
                        {countEnabledOpts(friendSnapshot)}/12
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1">
                    <div className="truncate" title={friendSnapshot.hw.gpu}>
                      <span className="text-slate-500">GPU: </span>
                      {friendSnapshot.hw.gpu}
                    </div>
                    <div className="truncate" title={friendSnapshot.hw.cpu}>
                      <span className="text-slate-500">CPU: </span>
                      {friendSnapshot.hw.cpu}
                      <span className="text-slate-600 mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-400">
                        {friendSnapshot.hw.hasWinReport ? 'PowerShell-отчёт' : 'Скан браузера'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800/70">
                  <button
                    type="button"
                    onClick={() => setEditingFriend(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Вставить другой код</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFriend(false);
                      onClearFriend();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-300 font-medium text-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Сбросить</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="friend-profile-input"
                      className="text-xs font-mono text-violet-400"
                    >
                      Загрузить ПК друга (ссылка, код OC1:... или OPTICORE:{'{...}'})
                    </label>
                    {editingFriend && friendSnapshot && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFriend(false);
                          setPasteError(null);
                        }}
                        className="text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        Отмена
                      </button>
                    )}
                  </div>

                  <textarea
                    id="friend-profile-input"
                    rows={4}
                    value={pasteInput}
                    onChange={(e) => {
                      setPasteInput(e.target.value);
                      if (pasteError) setPasteError(null);
                    }}
                    placeholder="Вставь ссылку от друга (?pc=OC1:...), короткий код OC1:... или вывод PowerShell OPTICORE:{...}"
                    className="w-full p-3 rounded-xl bg-[#060911] border border-slate-700/90 focus:border-violet-400 focus:outline-none text-xs font-mono text-slate-100 placeholder:text-slate-600"
                  />

                  {pasteError && (
                    <div
                      role="alert"
                      className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/35 text-xs text-rose-200"
                    >
                      {pasteError}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800/70">
                  <button
                    type="button"
                    onClick={handleImportFriend}
                    className="px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span>Сравнить ПК</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadDemoFriend}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium text-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Загрузить пример друга</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Prompt if friend loaded, waiting for user's own scan */}
        {friendSnapshot && !mySnapshot && (
          <div className="p-6 rounded-2xl bg-[#0C1220] border border-cyan-500/40 glow-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-base font-bold text-white">
                Профиль «{friendSnapshot.name}» загружен — остался только твой скан
              </div>
              <p className="text-xs text-slate-400">
                Запусти быстрый тест своего ПК, чтобы сразу увидеть таблицу сравнения железа и
                включённых оптимизаций.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onRunScan()}
              disabled={scanning}
              className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 text-slate-950 font-bold text-xs sm:text-sm glow-btn inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Play className="w-4 h-4" />
              <span>{scanning ? 'Идёт скан...' : 'Просканировать мой ПК'}</span>
            </button>
          </div>
        )}

        {/* Full Side-by-Side Comparison Board */}
        {mySnapshot && friendSnapshot && comparison && (
          <div data-testid="compare-results" className="space-y-6">
            {/* Summary Verdict Banner */}
            <div className="p-6 rounded-2xl bg-[#0C1220] border border-slate-800/90 glow-border flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-cyan-300 font-semibold">{mySnapshot.name}</span>
                  <span className="text-slate-600" aria-hidden="true">
                    vs
                  </span>
                  <span className="text-violet-300 font-semibold">{friendSnapshot.name}</span>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-emerald-300 tabular-nums">
                    Оптимизации: {comparison.myOnCount}/12 против {comparison.friendOnCount}/12
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  {comparison.onlyFriendOnCount > 0
                    ? `У друга включено ${comparison.onlyFriendOnCount} оптимизаций, которых ещё нет у тебя`
                    : comparison.onlyMeOnCount > 0
                      ? `Твой ПК настроен лучше на ${comparison.onlyMeOnCount} пунктов оптимизации`
                      : 'Системы настроены примерно на одном уровне'}
                </h3>
                <p className="text-xs text-slate-400">
                  Любой пункт у себя можно переключить прямо в таблице ниже — профиль и ссылка для
                  друга обновятся автоматически.
                </p>
              </div>

              {comparison.missingForMeModuleIds.length > 0 && (
                <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setImportedNotice(true);
                      onAddModulesToGenerator(comparison.missingForMeModuleIds);
                      window.setTimeout(() => setImportedNotice(false), 2500);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <span>
                      {importedNotice
                        ? 'Твики добавлены в генератор ✓'
                        : `Добавить недостающие твики (${comparison.missingForMeModuleIds.length})`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-400">
                    Скопирует в генератор всё, что включено у друга
                  </span>
                </div>
              )}
            </div>

            {/* Part A: Hardware & FPS Metrics Table */}
            <div className="rounded-2xl bg-[#0C1220] border border-slate-800/90 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-white">Железо и показатели FPS</h3>
                <span className="text-xs font-mono text-slate-400">
                  Сравнение ключевых узлов и плавности кадров
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-[11px] font-mono text-slate-400 bg-[#080D18]">
                      <th className="py-3 px-4 sm:px-5 font-medium">Параметр</th>
                      <th className="py-3 px-4 font-medium text-cyan-300">{mySnapshot.name}</th>
                      <th className="py-3 px-4 font-medium text-violet-300">
                        {friendSnapshot.name}
                      </th>
                      <th className="py-3 px-4 sm:px-5 font-medium text-right">Итог</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {comparison.hardwareRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 align-top">
                          <div className="font-semibold text-white">{row.label}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{row.note}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-100 align-top">
                          {row.myValue}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-200 align-top">
                          {row.friendValue}
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-right align-top whitespace-nowrap">
                          {row.leader === 'me' ? (
                            <span className="text-xs font-mono font-semibold text-emerald-300">
                              Ты впереди
                            </span>
                          ) : row.leader === 'friend' ? (
                            <span className="text-xs font-mono font-semibold text-violet-300">
                              Друг впереди
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-slate-400">Паритет</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Part B: Optimization Matrix (What's Enabled for Me vs Friend) */}
            <div className="rounded-2xl bg-[#0C1220] border border-slate-800/90 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Что врублено насчёт оптимизации
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Нажми на свой статус справа, чтобы отметить уже выполненную настройку на своём ПК.
                  </p>
                </div>

                <div
                  role="tablist"
                  aria-label="Фильтр оптимизаций в сравнении"
                  className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#080D18] border border-slate-800"
                >
                  {(
                    [
                      { id: 'all', label: `Все (${comparison.totalOptItems})` },
                      { id: 'diff', label: `Отличия (${diffCount})` },
                      {
                        id: 'friend_only',
                        label: `У друга (${comparison.onlyFriendOnCount})`,
                      },
                      { id: 'me_only', label: `У меня (${comparison.onlyMeOnCount})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={optFilter === tab.id}
                      onClick={() => setOptFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        optFilter === tab.id
                          ? 'bg-cyan-400 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOptRows.length === 0 ? (
                <div className="p-6 text-sm text-slate-400">
                  По выбранному фильтру отличий не найдено — переключитесь на вкладку «Все».
                </div>
              ) : (
                <div className="divide-y divide-slate-800/75">
                  {filteredOptRows.map((row) => {
                    const nextState = row.mine !== 'on';
                    return (
                      <div
                        key={row.meta.id}
                        className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-900/35 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white">{row.meta.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            <span className="font-mono text-[11px] text-slate-500">
                              {row.meta.category}
                            </span>
                            <span className="text-slate-600 mx-1.5" aria-hidden="true">
                              ·
                            </span>
                            <span>{row.meta.desc}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
                          <div className="flex items-center justify-between sm:justify-start gap-2 min-w-[165px]">
                            <span className="text-[11px] font-mono text-cyan-300/90">У меня:</span>
                            <OptStatePill
                              state={row.mine}
                              interactive
                              ariaLabel={`Переключить статус «${row.meta.title}» у себя`}
                              onClick={() => onToggleMyOptFlag(row.meta.id, nextState)}
                            />
                          </div>

                          <div className="flex items-center justify-between sm:justify-start gap-2 min-w-[172px]">
                            <span className="text-[11px] font-mono text-violet-300/90">
                              У друга:
                            </span>
                            <OptStatePill state={row.friend} />
                          </div>

                          <div className="sm:w-[92px] flex justify-end">
                            {row.diffType === 'friend_only' && row.meta.moduleIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => onAddModulesToGenerator(row.meta.moduleIds)}
                                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-cyan-400 hover:text-slate-950 text-cyan-300 font-mono text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer"
                              >
                                В скрипт →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
