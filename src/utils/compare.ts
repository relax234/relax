import { formatShortGpuName } from './frameMonitor';
import {
  classifyGpu,
  evaluatePcScan,
  parseWindowsDiagReport,
  type GpuVendor,
  type HardwareScanInput,
  type WindowsDiagReport,
} from './scanner';

export type OptFlagId =
  | 'power'
  | 'hags_gamemode'
  | 'xmp'
  | 'gamedvr_off'
  | 'mouse_raw'
  | 'mpo_off'
  | 'win32_prio'
  | 'net_mmcss'
  | 'usb_power'
  | 'p2p_off'
  | 'telemetry_off'
  | 'ssd_temp';

/** 'on' = врублено, 'off' = выключено, 'unknown' = не проверено */
export type OptFlagState = 'on' | 'off' | 'unknown';

export interface OptCompareItemMeta {
  id: OptFlagId;
  category: 'GPU / FPS' | 'Ввод' | 'Система' | 'Сеть / SSD';
  title: string;
  desc: string;
  checklistId?: string;
  moduleIds: string[];
}

export const OPTIMIZATION_COMPARE_ITEMS: OptCompareItemMeta[] = [
  {
    id: 'power',
    category: 'Система',
    title: 'Схема питания «Макс. производительность»',
    desc: 'Не даёт процессору сбрасывать частоты между кадрами',
    checklistId: 'power',
    moduleIds: ['ultimatePower'],
  },
  {
    id: 'hags_gamemode',
    category: 'GPU / FPS',
    title: 'HAGS и Игровой режим Windows',
    desc: 'Аппаратное планирование очереди GPU и приоритет игры',
    checklistId: 'gamemode',
    moduleIds: ['hagsAndGameMode'],
  },
  {
    id: 'xmp',
    category: 'Система',
    title: 'Профиль ОЗУ XMP / EXPO в BIOS',
    desc: 'Память работает на полной частоте, а не на базовых 2133/4800 МГц',
    checklistId: 'xmp',
    moduleIds: [],
  },
  {
    id: 'gamedvr_off',
    category: 'GPU / FPS',
    title: 'Отключены GameDVR и фоновые оверлеи',
    desc: 'Убирает фоновую запись буфера экрана и просадки 1% Low FPS',
    checklistId: 'overlays',
    moduleIds: ['gameTweaks', 'disableOverlays'],
  },
  {
    id: 'mouse_raw',
    category: 'Ввод',
    title: 'Акселерация мыши выключена (1:1)',
    desc: 'Честный ввод без программного ускорения указателя Windows',
    checklistId: 'mouse',
    moduleIds: ['mouseRawInput'],
  },
  {
    id: 'mpo_off',
    category: 'GPU / FPS',
    title: 'Отключён MPO (OverlayTestMode=5)',
    desc: 'Убирает микроподёргивания DWM и мерцания при Alt-Tab',
    moduleIds: ['disableFullscreenOpt'],
  },
  {
    id: 'win32_prio',
    category: 'Система',
    title: 'Win32PrioritySeparation = 38 (0x26)',
    desc: 'Отдаёт короткие приоритетные кванты CPU активному окну игры',
    moduleIds: ['win32PrioritySep'],
  },
  {
    id: 'net_mmcss',
    category: 'GPU / FPS',
    title: 'Приоритет MMCSS и снятие сетевого троттлинга',
    desc: 'SystemResponsiveness=0 и высокий приоритет Tasks\\Games',
    moduleIds: ['gameTweaks', 'gpuPriority'],
  },
  {
    id: 'usb_power',
    category: 'Ввод',
    title: 'Отключено энергосбережение USB-портов',
    desc: 'Мышь, клавиатура и гарнитура не засыпают во время игры',
    moduleIds: ['usbPowerSavingOff'],
  },
  {
    id: 'p2p_off',
    category: 'Сеть / SSD',
    title: 'Отключена P2P-раздача обновлений Windows',
    desc: 'Windows не раздаёт пакеты обновлений другим ПК в фоне',
    checklistId: 'delivery',
    moduleIds: ['disableP2PUpdate'],
  },
  {
    id: 'telemetry_off',
    category: 'Система',
    title: 'Отключена телеметрия диагностики (DiagTrack)',
    desc: 'Остановлена фоновая отправка диагностических отчётов',
    moduleIds: ['telemetryLite'],
  },
  {
    id: 'ssd_temp',
    category: 'Сеть / SSD',
    title: 'Свободный SSD (≥15%) и чистый кэш Temp',
    desc: 'Исключает падение скорости записи и подфризы при подгрузке',
    checklistId: 'temp',
    moduleIds: ['cleanTemp'],
  },
];

export const OPT_MODULE_TO_FLAGS: Record<string, OptFlagId[]> = {
  ultimatePower: ['power'],
  hagsAndGameMode: ['hags_gamemode'],
  gameTweaks: ['gamedvr_off', 'net_mmcss'],
  disableOverlays: ['gamedvr_off'],
  gpuPriority: ['net_mmcss'],
  mouseRawInput: ['mouse_raw'],
  disableFullscreenOpt: ['mpo_off'],
  win32PrioritySep: ['win32_prio'],
  usbPowerSavingOff: ['usb_power'],
  disableP2PUpdate: ['p2p_off'],
  telemetryLite: ['telemetry_off'],
  cleanTemp: ['ssd_temp'],
};

export interface PcShareSnapshot {
  v: 1;
  name: string;
  ts: number;
  isDemo?: boolean;
  hw: {
    gpu: string;
    gpuVendor: GpuVendor;
    cpu: string;
    cpuCores: number;
    ramGb: number | null;
    ramMhz: number | null;
    ramSticks: number | null;
    hz: number;
    res: string;
    avgFrameMs: number;
    jitterMs: number;
    score: number;
    hasWinReport: boolean;
  };
  opts: Record<OptFlagId, OptFlagState>;
}

export interface BuildSnapshotInput {
  name: string;
  scanData: HardwareScanInput;
  windowsReport?: WindowsDiagReport | null;
  checkedItems: Record<string, boolean>;
  appliedExtraFlags: Record<string, boolean>;
}

function resolveOptFlagState(
  flagId: OptFlagId,
  windowsReport: WindowsDiagReport | null | undefined,
  checkedItems: Record<string, boolean>,
  appliedExtraFlags: Record<string, boolean>,
): OptFlagState {
  const manualOverride = appliedExtraFlags[flagId];
  if (typeof manualOverride === 'boolean') {
    return manualOverride ? 'on' : 'off';
  }

  if (windowsReport) {
    switch (flagId) {
      case 'power':
        if (windowsReport.powerPlan) {
          return windowsReport.powerPlan === 'ultimate' || windowsReport.powerPlan === 'high'
            ? 'on'
            : 'off';
        }
        break;
      case 'hags_gamemode':
        if (windowsReport.hagsEnabled !== undefined || windowsReport.gameModeEnabled !== undefined) {
          return windowsReport.hagsEnabled && windowsReport.gameModeEnabled !== false ? 'on' : 'off';
        }
        break;
      case 'xmp':
        if (windowsReport.ramSpeedMhz !== undefined) {
          return windowsReport.ramSpeedMhz > 2400 && windowsReport.ramSpeedMhz !== 4800
            ? 'on'
            : 'off';
        }
        break;
      case 'gamedvr_off':
        if (windowsReport.gameDvrEnabled !== undefined) {
          return windowsReport.gameDvrEnabled ? 'off' : 'on';
        }
        break;
      case 'mouse_raw':
        if (windowsReport.mouseAccelEnabled !== undefined) {
          return windowsReport.mouseAccelEnabled ? 'off' : 'on';
        }
        break;
      case 'mpo_off':
        if (windowsReport.mpoDisabled !== undefined) {
          return windowsReport.mpoDisabled ? 'on' : 'off';
        }
        break;
      case 'win32_prio':
        if (windowsReport.win32PrioritySep38 !== undefined) {
          return windowsReport.win32PrioritySep38 ? 'on' : 'off';
        }
        break;
      case 'net_mmcss':
        if (windowsReport.networkTweaksApplied !== undefined) {
          return windowsReport.networkTweaksApplied ? 'on' : 'off';
        }
        break;
      case 'usb_power':
        if (windowsReport.usbPowerSavingOff !== undefined) {
          return windowsReport.usbPowerSavingOff ? 'on' : 'off';
        }
        break;
      case 'p2p_off':
        if (windowsReport.deliveryOptP2P !== undefined) {
          return windowsReport.deliveryOptP2P ? 'off' : 'on';
        }
        break;
      case 'telemetry_off':
        if (windowsReport.diagTrackRunning !== undefined) {
          return windowsReport.diagTrackRunning ? 'off' : 'on';
        }
        break;
      case 'ssd_temp':
        if (windowsReport.ssdFreePercent !== undefined || windowsReport.tempSizeMb !== undefined) {
          const ssdOk =
            windowsReport.ssdFreePercent === undefined || windowsReport.ssdFreePercent >= 15;
          const tempOk = windowsReport.tempSizeMb === undefined || windowsReport.tempSizeMb < 500;
          return ssdOk && tempOk ? 'on' : 'off';
        }
        break;
    }
  }

  const meta = OPTIMIZATION_COMPARE_ITEMS.find((i) => i.id === flagId);
  if (meta?.checklistId && checkedItems[meta.checklistId]) {
    return 'on';
  }
  if (manualOverride === true) {
    return 'on';
  }
  if (manualOverride === false) {
    return 'off';
  }
  if (meta?.checklistId && checkedItems[meta.checklistId] === false) {
    return 'off';
  }
  return windowsReport ? 'off' : 'unknown';
}

export function buildPcShareSnapshot(input: BuildSnapshotInput): PcShareSnapshot {
  const { scanData, windowsReport, checkedItems, appliedExtraFlags } = input;
  const evaluation = evaluatePcScan({ ...scanData, windowsReport });
  const rawGpu = windowsReport?.gpuName || scanData.gpuRenderer;
  const cleanGpu = windowsReport?.gpuName ? rawGpu : formatShortGpuName(rawGpu);

  const opts = {} as Record<OptFlagId, OptFlagState>;
  for (const item of OPTIMIZATION_COMPARE_ITEMS) {
    opts[item.id] = resolveOptFlagState(
      item.id,
      windowsReport,
      checkedItems,
      appliedExtraFlags,
    );
  }

  // Also count manual checklist bonus subtly into comparison visibility without altering scanner evaluation score
  return {
    v: 1,
    name: input.name.trim().slice(0, 28) || 'Мой ПК',
    ts: Date.now(),
    hw: {
      gpu: cleanGpu,
      gpuVendor: evaluation.gpuInfo.vendor,
      cpu: windowsReport?.cpuName || `${scanData.cpuCores} потоков`,
      cpuCores: scanData.cpuCores,
      ramGb: windowsReport?.ramTotalGb ?? scanData.deviceMemoryGb,
      ramMhz: windowsReport?.ramSpeedMhz ?? null,
      ramSticks: windowsReport?.ramStickCount ?? null,
      hz: scanData.measuredHz,
      res: `${scanData.screenWidth}×${scanData.screenHeight}`,
      avgFrameMs: scanData.avgFrameMs,
      jitterMs: scanData.frameJitterMs,
      score: evaluation.score,
      hasWinReport: Boolean(windowsReport),
    },
    opts,
  };
}

function encodeOptFlagsCompact(opts: Record<OptFlagId, OptFlagState>): string {
  return OPTIMIZATION_COMPARE_ITEMS.map((item) => {
    const state = opts[item.id];
    if (state === 'on') return '1';
    if (state === 'off') return '0';
    return 'u';
  }).join('');
}

function decodeOptFlagsCompact(compact: string): Record<OptFlagId, OptFlagState> {
  const opts = {} as Record<OptFlagId, OptFlagState>;
  OPTIMIZATION_COMPARE_ITEMS.forEach((item, index) => {
    const ch = compact[index];
    opts[item.id] = ch === '1' ? 'on' : ch === '0' ? 'off' : 'unknown';
  });
  return opts;
}

function utf8ToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUtf8(b64url: string): string {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  if (typeof atob === 'function') {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(b64, 'base64').toString('utf-8');
}

interface WirePayloadV1 {
  v: 1;
  n: string;
  t: number;
  d?: 1;
  h: [
    string, // gpu
    string, // cpu
    number, // cpuCores
    number | null, // ramGb
    number | null, // ramMhz
    number | null, // ramSticks
    number, // hz
    string, // res
    number, // avgFrameMs
    number, // jitterMs
    number, // score
    0 | 1, // hasWinReport
  ];
  o: string;
}

export function encodeShareCode(snapshot: PcShareSnapshot): string {
  const payload: WirePayloadV1 = {
    v: 1,
    n: snapshot.name.slice(0, 28),
    t: snapshot.ts,
    ...(snapshot.isDemo ? { d: 1 } : {}),
    h: [
      snapshot.hw.gpu.slice(0, 72),
      snapshot.hw.cpu.slice(0, 64),
      snapshot.hw.cpuCores,
      snapshot.hw.ramGb,
      snapshot.hw.ramMhz,
      snapshot.hw.ramSticks,
      snapshot.hw.hz,
      snapshot.hw.res,
      snapshot.hw.avgFrameMs,
      snapshot.hw.jitterMs,
      snapshot.hw.score,
      snapshot.hw.hasWinReport ? 1 : 0,
    ],
    o: encodeOptFlagsCompact(snapshot.opts),
  };
  return `OC1:${utf8ToBase64Url(JSON.stringify(payload))}`;
}

export function buildShareUrl(currentOriginAndPath: string, snapshot: PcShareSnapshot): string {
  const code = encodeShareCode(snapshot);
  const sep = currentOriginAndPath.includes('?') ? '&' : '?';
  return `${currentOriginAndPath}${sep}pc=${encodeURIComponent(code)}`;
}

export function decodeShareInput(
  raw: string,
): { ok: true; snapshot: PcShareSnapshot } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Вставьте ссылку друга, код OC1:... или отчёт PowerShell.' };
  }

  // 1. Check if user pasted a raw PowerShell OPTICORE:{...} report from a friend
  if (trimmed.includes('OPTICORE:')) {
    const parsedWin = parseWindowsDiagReport(trimmed);
    if (!parsedWin.ok) {
      return { ok: false, error: parsedWin.error };
    }
    const wr = parsedWin.report;
    const synthScan: HardwareScanInput = {
      cpuCores: 8,
      deviceMemoryGb: wr.ramTotalGb ?? 16,
      gpuRenderer: wr.gpuName || 'Видеокарта Windows',
      gpuVendorRaw: wr.gpuName || '',
      webgl2Supported: true,
      screenWidth: 1920,
      screenHeight: 1080,
      measuredHz: 144,
      avgFrameMs: 6.9,
      frameJitterMs: 0.8,
      osName: 'Windows 10 / 11',
      isWindows: true,
      connectionRttMs: null,
    };
    const snap = buildPcShareSnapshot({
      name: 'ПК друга (PowerShell)',
      scanData: synthScan,
      windowsReport: wr,
      checkedItems: {},
      appliedExtraFlags: {},
    });
    return { ok: true, snapshot: snap };
  }

  // 2. Extract ?pc=... param if user pasted a full URL
  let token = trimmed;
  if (trimmed.includes('pc=')) {
    try {
      const url = trimmed.startsWith('http')
        ? new URL(trimmed)
        : new URL(trimmed, 'https://opticore.local');
      const pcParam = url.searchParams.get('pc');
      if (pcParam) token = decodeURIComponent(pcParam);
    } catch {
      const match = trimmed.match(/[?&]pc=([^&\s]+)/);
      if (match?.[1]) token = decodeURIComponent(match[1]);
    }
  }

  const ocIndex = token.indexOf('OC1:');
  if (ocIndex < 0) {
    return {
      ok: false,
      error: 'Не удалось распознать профиль друга. Попросите друга скопировать ссылку или код OC1:...',
    };
  }

  const encoded = token.slice(ocIndex + 4).trim().split(/\s/)[0];
  try {
    const jsonStr = base64UrlToUtf8(encoded);
    const parsed = JSON.parse(jsonStr) as Partial<WirePayloadV1>;
    if (parsed.v !== 1 || !Array.isArray(parsed.h) || typeof parsed.o !== 'string') {
      return { ok: false, error: 'Повреждённый или устаревший код профиля.' };
    }
    const [
      gpu,
      cpu,
      cpuCores,
      ramGb,
      ramMhz,
      ramSticks,
      hz,
      res,
      avgFrameMs,
      jitterMs,
      score,
      hasWinReport,
    ] = parsed.h;

    if (typeof gpu !== 'string' || typeof hz !== 'number' || typeof score !== 'number') {
      return { ok: false, error: 'В коде профиля не хватает характеристик ПК.' };
    }

    const gpuInfo = classifyGpu(gpu);
    return {
      ok: true,
      snapshot: {
        v: 1,
        name: typeof parsed.n === 'string' && parsed.n.trim() ? parsed.n.trim() : 'ПК друга',
        ts: typeof parsed.t === 'number' ? parsed.t : Date.now(),
        ...(parsed.d === 1 ? { isDemo: true } : {}),
        hw: {
          gpu,
          gpuVendor: gpuInfo.vendor,
          cpu: typeof cpu === 'string' ? cpu : `${cpuCores || 4} потоков`,
          cpuCores: typeof cpuCores === 'number' ? cpuCores : 4,
          ramGb: typeof ramGb === 'number' ? ramGb : null,
          ramMhz: typeof ramMhz === 'number' ? ramMhz : null,
          ramSticks: typeof ramSticks === 'number' ? ramSticks : null,
          hz,
          res: typeof res === 'string' ? res : '1920×1080',
          avgFrameMs: typeof avgFrameMs === 'number' ? avgFrameMs : 16.7,
          jitterMs: typeof jitterMs === 'number' ? jitterMs : 0,
          score,
          hasWinReport: hasWinReport === 1,
        },
        opts: decodeOptFlagsCompact(parsed.o),
      },
    };
  } catch {
    return {
      ok: false,
      error: 'Ошибка чтения кода профиля. Убедитесь, что скопировали ссылку или код полностью.',
    };
  }
}

export function createDemoFriendSnapshot(): PcShareSnapshot {
  return {
    v: 1,
    name: 'Димон (пример друга)',
    ts: Date.now(),
    isDemo: true,
    hw: {
      gpu: 'NVIDIA GeForce RTX 3060',
      gpuVendor: 'nvidia',
      cpu: 'AMD Ryzen 5 5600X',
      cpuCores: 12,
      ramGb: 16,
      ramMhz: 3200,
      ramSticks: 2,
      hz: 144,
      res: '1920×1080',
      avgFrameMs: 6.9,
      jitterMs: 0.7,
      score: 86,
      hasWinReport: true,
    },
    opts: {
      power: 'on',
      hags_gamemode: 'on',
      xmp: 'on',
      gamedvr_off: 'on',
      mouse_raw: 'on',
      mpo_off: 'on',
      win32_prio: 'on',
      net_mmcss: 'on',
      usb_power: 'off',
      p2p_off: 'on',
      telemetry_off: 'off',
      ssd_temp: 'on',
    },
  };
}

export type MetricLeader = 'me' | 'friend' | 'tie';

export interface HardwareCompareRow {
  id: string;
  label: string;
  myValue: string;
  friendValue: string;
  leader: MetricLeader;
  note: string;
}

export interface OptCompareRow {
  meta: OptCompareItemMeta;
  mine: OptFlagState;
  friend: OptFlagState;
  diffType: 'both_on' | 'both_off' | 'friend_only' | 'me_only' | 'mixed';
}

export interface PcComparisonResult {
  myOnCount: number;
  friendOnCount: number;
  totalOptItems: number;
  onlyFriendOnCount: number;
  onlyMeOnCount: number;
  bothOnCount: number;
  missingForMeModuleIds: string[];
  hardwareRows: HardwareCompareRow[];
  optRows: OptCompareRow[];
}

function formatRamCell(hw: PcShareSnapshot['hw']): string {
  const parts: string[] = [];
  if (hw.ramGb !== null) {
    parts.push(hw.ramGb === 8 && !hw.hasWinReport ? '≥8 ГБ' : `${hw.ramGb} ГБ`);
  } else {
    parts.push('Скрыто');
  }
  if (hw.ramMhz) parts.push(`${hw.ramMhz} МГц`);
  if (hw.ramSticks) parts.push(`${hw.ramSticks} пл.`);
  return parts.join(' · ');
}

export function comparePcProfiles(
  mine: PcShareSnapshot,
  friend: PcShareSnapshot,
): PcComparisonResult {
  const hardwareRows: HardwareCompareRow[] = [];

  // 1. Overall Score
  hardwareRows.push({
    id: 'score',
    label: 'Индекс готовности ПК',
    myValue: `${mine.hw.score}/100`,
    friendValue: `${friend.hw.score}/100`,
    leader:
      mine.hw.score > friend.hw.score
        ? 'me'
        : friend.hw.score > mine.hw.score
          ? 'friend'
          : 'tie',
    note:
      mine.hw.score === friend.hw.score
        ? 'Одинаковый индекс'
        : `Разница ${Math.abs(mine.hw.score - friend.hw.score)} б.`,
  });

  // 2. GPU
  const gpuScore = (vendor: GpuVendor) =>
    vendor === 'nvidia' || vendor === 'amd' || vendor === 'apple'
      ? 3
      : vendor === 'intel'
        ? 2
        : vendor === 'software'
          ? 0
          : 1;
  const myGpuRank = gpuScore(mine.hw.gpuVendor);
  const frGpuRank = gpuScore(friend.hw.gpuVendor);
  hardwareRows.push({
    id: 'gpu',
    label: 'Видеокарта (GPU)',
    myValue: mine.hw.gpu,
    friendValue: friend.hw.gpu,
    leader: myGpuRank > frGpuRank ? 'me' : frGpuRank > myGpuRank ? 'friend' : 'tie',
    note:
      myGpuRank === frGpuRank
        ? 'Аппаратный класс сопоставим'
        : myGpuRank > frGpuRank
          ? 'У тебя мощнее класс GPU'
          : 'У друга выше класс GPU',
  });

  // 3. CPU Threads
  const formatCpuCell = (hw: PcShareSnapshot['hw']) =>
    hw.cpu.includes('пот') ? hw.cpu : `${hw.cpu} (${hw.cpuCores} пот.)`;
  hardwareRows.push({
    id: 'cpu',
    label: 'Процессор (потоки)',
    myValue: formatCpuCell(mine.hw),
    friendValue: formatCpuCell(friend.hw),
    leader:
      mine.hw.cpuCores > friend.hw.cpuCores
        ? 'me'
        : friend.hw.cpuCores > mine.hw.cpuCores
          ? 'friend'
          : 'tie',
    note:
      mine.hw.cpuCores === friend.hw.cpuCores
        ? `По ${mine.hw.cpuCores} потоков`
        : `${Math.abs(mine.hw.cpuCores - friend.hw.cpuCores)} пот. разницы`,
  });

  // 4. RAM
  const ramScore = (hw: PcShareSnapshot['hw']) =>
    (hw.ramGb ?? 8) * 10 + (hw.ramMhz ? hw.ramMhz / 100 : 0) + (hw.ramSticks && hw.ramSticks >= 2 ? 40 : 0);
  const myRamScore = ramScore(mine.hw);
  const frRamScore = ramScore(friend.hw);
  hardwareRows.push({
    id: 'ram',
    label: 'Оперативная память',
    myValue: formatRamCell(mine.hw),
    friendValue: formatRamCell(friend.hw),
    leader:
      Math.abs(myRamScore - frRamScore) < 5
        ? 'tie'
        : myRamScore > frRamScore
          ? 'me'
          : 'friend',
    note:
      mine.hw.ramMhz || friend.hw.ramMhz
        ? 'Учтены объём, частота и каналы'
        : 'Для точной частоты ОЗУ нужен PowerShell-отчёт',
  });

  // 5. Display Refresh Rate
  hardwareRows.push({
    id: 'hz',
    label: 'Монитор и герцовка',
    myValue: `${mine.hw.res} · ${mine.hw.hz} Гц`,
    friendValue: `${friend.hw.res} · ${friend.hw.hz} Гц`,
    leader:
      Math.abs(mine.hw.hz - friend.hw.hz) <= 3
        ? 'tie'
        : mine.hw.hz > friend.hw.hz
          ? 'me'
          : 'friend',
    note:
      Math.abs(mine.hw.hz - friend.hw.hz) <= 3
        ? 'Одинаковая плавность экрана'
        : `${Math.max(mine.hw.hz, friend.hw.hz)} Гц даёт выше чёткость`,
  });

  // 6. Frame Jitter (lower is better)
  hardwareRows.push({
    id: 'jitter',
    label: 'Стабильность кадра (джиттер)',
    myValue: `${mine.hw.jitterMs} мс (кадр ${mine.hw.avgFrameMs} мс)`,
    friendValue: `${friend.hw.jitterMs} мс (кадр ${friend.hw.avgFrameMs} мс)`,
    leader:
      Math.abs(mine.hw.jitterMs - friend.hw.jitterMs) < 0.35
        ? 'tie'
        : mine.hw.jitterMs < friend.hw.jitterMs
          ? 'me'
          : 'friend',
    note: 'Чем ниже джиттер, тем ровнее 1% Low FPS',
  });

  // Optimization comparison
  let myOnCount = 0;
  let friendOnCount = 0;
  let onlyFriendOnCount = 0;
  let onlyMeOnCount = 0;
  let bothOnCount = 0;
  const missingModuleSet = new Set<string>();

  const optRows: OptCompareRow[] = OPTIMIZATION_COMPARE_ITEMS.map((meta) => {
    const mineState = mine.opts[meta.id];
    const friendState = friend.opts[meta.id];

    if (mineState === 'on') myOnCount += 1;
    if (friendState === 'on') friendOnCount += 1;

    let diffType: OptCompareRow['diffType'] = 'mixed';
    if (mineState === 'on' && friendState === 'on') {
      diffType = 'both_on';
      bothOnCount += 1;
    } else if (mineState !== 'on' && friendState === 'on') {
      diffType = 'friend_only';
      onlyFriendOnCount += 1;
      for (const mId of meta.moduleIds) {
        missingModuleSet.add(mId);
      }
    } else if (mineState === 'on' && friendState !== 'on') {
      diffType = 'me_only';
      onlyMeOnCount += 1;
    } else if (mineState === 'off' && friendState === 'off') {
      diffType = 'both_off';
    }

    return {
      meta,
      mine: mineState,
      friend: friendState,
      diffType,
    };
  });

  return {
    myOnCount,
    friendOnCount,
    totalOptItems: OPTIMIZATION_COMPARE_ITEMS.length,
    onlyFriendOnCount,
    onlyMeOnCount,
    bothOnCount,
    missingForMeModuleIds: Array.from(missingModuleSet),
    hardwareRows,
    optRows,
  };
}
