export type GpuVendor = 'nvidia' | 'amd' | 'intel' | 'apple' | 'software' | 'unknown';

export interface WindowsDiagReport {
  cpuName?: string;
  gpuName?: string;
  ramTotalGb?: number;
  ramSpeedMhz?: number;
  powerPlan?: 'ultimate' | 'high' | 'balanced' | 'powersaver' | string;
  gameDvrEnabled?: boolean;
  ssdFreePercent?: number;
  startupCount?: number;
}

export interface HardwareScanInput {
  cpuCores: number;
  deviceMemoryGb: number | null;
  gpuRenderer: string;
  gpuVendorRaw: string;
  screenWidth: number;
  screenHeight: number;
  measuredHz: number;
  avgFrameMs: number;
  frameJitterMs: number;
  osName: string;
  isWindows: boolean;
  connectionRttMs: number | null;
  frameDeltas?: number[];
  windowsReport?: WindowsDiagReport | null;
}

export type RecommendationPriority = 'high' | 'medium' | 'ok';

export interface ScanRecommendation {
  id: string;
  priority: RecommendationPriority;
  title: string;
  reason: string;
  action: string;
  fpsImpact: string;
  moduleIds: string[];
}

export interface ScanEvaluation {
  score: number;
  verdictBadge: string;
  verdictTitle: string;
  verdictDescription: string;
  estimatedFpsGain: string;
  gpuInfo: {
    vendor: GpuVendor;
    isIntegratedOrWeak: boolean;
    label: string;
  };
  recommendations: ScanRecommendation[];
  recommendedModuleIds: string[];
}

export const WINDOWS_DIAG_SCRIPT = String.raw`# OptiCore Read-Only PC Scanner (ничего не меняет в системе)
$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name.Trim()
$gpu = (Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notmatch 'Microsoft Basic' } | Select-Object -First 1).Name.Trim()
$ramBytes = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
$ramGb = [math]::Round($ramBytes / 1GB)
$ramSpeed = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Speed -Maximum).Maximum
$planRaw = (powercfg /getactivescheme)
$powerPlan = if ($planRaw -match 'e9a42b02|Ultimate') { 'ultimate' } elseif ($planRaw -match '8c5e7fda|High') { 'high' } elseif ($planRaw -match 'a1841308|Power saver') { 'powersaver' } else { 'balanced' }
$dvr = (Get-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -ErrorAction SilentlyContinue).GameDVR_Enabled
$sysDrive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$ssdFree = if ($sysDrive.Size -gt 0) { [math]::Round(($sysDrive.FreeSpace / $sysDrive.Size) * 100) } else { $null }
$startup = (Get-CimInstance Win32_StartupCommand).Count

$report = [ordered]@{
  cpuName = $cpu
  gpuName = $gpu
  ramTotalGb = $ramGb
  ramSpeedMhz = [int]$ramSpeed
  powerPlan = $powerPlan
  gameDvrEnabled = ($dvr -ne 0)
  ssdFreePercent = $ssdFree
  startupCount = [int]$startup
} | ConvertTo-Json -Compress

Write-Output "OPTICORE:$report"
Set-Clipboard -Value "OPTICORE:$report"
Write-Host ""
Write-Host "Отчёт скопирован в буфер обмена! Вставь его на сайте OptiCore." -ForegroundColor Green`;

export function classifyGpu(renderer: string): {
  vendor: GpuVendor;
  isIntegratedOrWeak: boolean;
  label: string;
} {
  const normalized = renderer.toLowerCase();

  if (!normalized || normalized === 'не определена') {
    return { vendor: 'unknown', isIntegratedOrWeak: false, label: 'Не определена браузером' };
  }
  if (
    normalized.includes('swiftshader') ||
    normalized.includes('llvmpipe') ||
    normalized.includes('software') ||
    normalized.includes('microsoft basic')
  ) {
    return {
      vendor: 'software',
      isIntegratedOrWeak: true,
      label: 'Программный рендер (нет аппаратного 3D-ускорения)',
    };
  }
  if (normalized.includes('nvidia') || normalized.includes('geforce') || normalized.includes('rtx') || normalized.includes('gtx')) {
    const isLowEnd = /\b(gt\s?[0-9]{3}|mx\s?[0-9]{3})\b/i.test(renderer);
    return {
      vendor: 'nvidia',
      isIntegratedOrWeak: isLowEnd,
      label: isLowEnd ? 'NVIDIA (начальный уровень)' : 'NVIDIA GeForce (дискретная)',
    };
  }
  if (normalized.includes('amd') || normalized.includes('radeon')) {
    const isApu = /vega\s?[0-9]+|radeon\(tm\)\s?graphics/i.test(renderer) && !/rx\s?[0-9]{3,4}/i.test(renderer);
    return {
      vendor: 'amd',
      isIntegratedOrWeak: isApu,
      label: isApu ? 'AMD Radeon (встроенная графика)' : 'AMD Radeon (дискретная)',
    };
  }
  if (normalized.includes('intel')) {
    const isArc = normalized.includes('arc');
    return {
      vendor: 'intel',
      isIntegratedOrWeak: !isArc,
      label: isArc ? 'Intel Arc' : 'Intel UHD / Iris (встроенная графика)',
    };
  }
  if (normalized.includes('apple')) {
    return { vendor: 'apple', isIntegratedOrWeak: false, label: 'Apple Silicon GPU' };
  }

  return { vendor: 'unknown', isIntegratedOrWeak: false, label: renderer };
}

export function parseWindowsDiagReport(
  raw: string,
): { ok: true; report: WindowsDiagReport } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Вставьте вывод диагностического скрипта PowerShell.' };
  }

  const markerIndex = trimmed.indexOf('OPTICORE:');
  const jsonSlice =
    markerIndex >= 0 ? trimmed.slice(markerIndex + 'OPTICORE:'.length).trim() : trimmed;

  const firstBrace = jsonSlice.indexOf('{');
  const lastBrace = jsonSlice.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    return {
      ok: false,
      error: 'Не найден JSON-отчёт. Скопируйте строку целиком, начиная с OPTICORE:{...}.',
    };
  }

  try {
    const parsed = JSON.parse(jsonSlice.slice(firstBrace, lastBrace + 1)) as Record<
      string,
      unknown
    >;

    const report: WindowsDiagReport = {
      cpuName: typeof parsed.cpuName === 'string' ? parsed.cpuName : undefined,
      gpuName: typeof parsed.gpuName === 'string' ? parsed.gpuName : undefined,
      ramTotalGb:
        typeof parsed.ramTotalGb === 'number' && Number.isFinite(parsed.ramTotalGb)
          ? parsed.ramTotalGb
          : undefined,
      ramSpeedMhz:
        typeof parsed.ramSpeedMhz === 'number' && Number.isFinite(parsed.ramSpeedMhz)
          ? parsed.ramSpeedMhz
          : undefined,
      powerPlan: typeof parsed.powerPlan === 'string' ? parsed.powerPlan : undefined,
      gameDvrEnabled:
        typeof parsed.gameDvrEnabled === 'boolean' ? parsed.gameDvrEnabled : undefined,
      ssdFreePercent:
        typeof parsed.ssdFreePercent === 'number' && Number.isFinite(parsed.ssdFreePercent)
          ? parsed.ssdFreePercent
          : undefined,
      startupCount:
        typeof parsed.startupCount === 'number' && Number.isFinite(parsed.startupCount)
          ? parsed.startupCount
          : undefined,
    };

    if (
      report.ramTotalGb === undefined &&
      report.powerPlan === undefined &&
      report.gpuName === undefined &&
      report.cpuName === undefined
    ) {
      return {
        ok: false,
        error: 'В отчёте отсутствуют ключевые поля диагностики ПК.',
      };
    }

    return { ok: true, report };
  } catch {
    return {
      ok: false,
      error: 'Ошибка разбора JSON. Убедитесь, что строка отчёта скопирована без обрывов.',
    };
  }
}

export function evaluatePcScan(input: HardwareScanInput): ScanEvaluation {
  const gpuSourceName = input.windowsReport?.gpuName || input.gpuRenderer;
  const gpuInfo = classifyGpu(gpuSourceName);
  const recommendations: ScanRecommendation[] = [];
  let score = 88;

  // 1. GPU evaluation
  if (gpuInfo.vendor === 'software') {
    score -= 34;
    recommendations.push({
      id: 'gpu-software',
      priority: 'high',
      title: 'Не активно аппаратное ускорение видеокарты',
      reason:
        'Браузер использует программный рендер (SwiftShader / Basic Driver). В играх и интерфейсе возможны критически низкий FPS и фризы.',
      action:
        'Установите актуальный драйвер видеокарты NVIDIA / AMD с официального сайта и включите аппаратное ускорение в настройках Windows и браузера.',
      fpsImpact: '+40–100% FPS',
      moduleIds: ['restorePoint', 'cleanTemp'],
    });
  } else if (gpuInfo.isIntegratedOrWeak) {
    score -= 14;
    recommendations.push({
      id: 'gpu-igpu',
      priority: 'medium',
      title: 'Обнаружена встроенная или начальная графика',
      reason: `GPU (${gpuSourceName}) делит пропускную способность с оперативной памятью, поэтому критически зависит от её частоты и фоновой нагрузки.`,
      action:
        'Освободите ОЗУ от фоновых программ, включите XMP/EXPO в BIOS и используйте FSR / NIS / низкие тени для стабильных 60+ FPS.',
      fpsImpact: '+12–22% FPS',
      moduleIds: ['restorePoint', 'ultimatePower', 'cleanTemp', 'gameTweaks'],
    });
  } else {
    recommendations.push({
      id: 'gpu-ok',
      priority: 'ok',
      title: 'Аппаратный GPU обнаружен и готов к нагрузке',
      reason: `Видеокарта ${gpuSourceName} поддерживает аппаратное ускорение. Узким местом чаще всего становятся фоновые службы и настройки драйвера.`,
      action:
        gpuInfo.vendor === 'nvidia'
          ? 'В панели NVIDIA выберите режим «Максимальная производительность» и включите Low Latency Mode.'
          : gpuInfo.vendor === 'amd'
            ? 'В AMD Adrenalin включите Radeon Anti-Lag и проверьте активацию Smart Access Memory (ReBAR).'
            : 'Проверьте свежесть драйвера GPU и отключите ненужные внутриигровые оверлеи.',
      fpsImpact: '+5–12% 1% Low',
      moduleIds: ['gameTweaks'],
    });
  }

  // 2. CPU cores
  if (input.cpuCores <= 4) {
    score -= 14;
    recommendations.push({
      id: 'cpu-low',
      priority: 'high',
      title: `Мало потоков процессора (${input.cpuCores})`,
      reason:
        'На 2–4 потоках любые фоновые задачи Windows, браузер или телеметрия напрямую отбирают процессорное время у игр.',
      action:
        'Обязательно отключите лишнюю автозагрузку, службу телеметрии DiagTrack и включите схему питания «Максимальная производительность».',
      fpsImpact: '+10–18% FPS',
      moduleIds: ['restorePoint', 'ultimatePower', 'telemetryLite', 'gameTweaks'],
    });
  } else if (input.cpuCores <= 6) {
    score -= 5;
    recommendations.push({
      id: 'cpu-mid',
      priority: 'medium',
      title: `Средний запас потоков CPU (${input.cpuCores})`,
      reason:
        'Процессор справится с большинством игр, но при стриме или десятках вкладок в фоне возможны микростаттеры.',
      action:
        'Включите профиль Ultimate Performance, чтобы ядра не уходили в энергосбережение во время резких сцен.',
      fpsImpact: '+6–10% стабильности',
      moduleIds: ['ultimatePower', 'gameTweaks'],
    });
  } else {
    recommendations.push({
      id: 'cpu-ok',
      priority: 'ok',
      title: `Отличный запас потоков процессора (${input.cpuCores})`,
      reason: 'Многопоточности достаточно для современных игр и фоновых приложений.',
      action: 'Зафиксируйте схему «Максимальная производительность», чтобы исключить скачки частот.',
      fpsImpact: 'Стабильный фреймтайм',
      moduleIds: ['ultimatePower'],
    });
  }

  // 3. RAM evaluation (prefer exact Windows report if provided, otherwise browser deviceMemory)
  const exactRamGb = input.windowsReport?.ramTotalGb ?? input.deviceMemoryGb;
  if (exactRamGb !== null && exactRamGb <= 4) {
    score -= 18;
    recommendations.push({
      id: 'ram-critical',
      priority: 'high',
      title: `Недостаточный объём ОЗУ (~${exactRamGb} ГБ)`,
      reason:
        'При 4 ГБ памяти Windows постоянно сбрасывает данные на диск (файл подкачки), что вызывает жёсткие фризы каждые несколько секунд.',
      action:
        'Закрывайте браузер и лаунчеры перед запуском игр, отключите фоновые службы и рассмотрите апгрейд до 16 ГБ.',
      fpsImpact: '-60% фризов',
      moduleIds: ['restorePoint', 'cleanTemp', 'telemetryLite'],
    });
  } else if (exactRamGb !== null && exactRamGb < 16 && input.windowsReport?.ramTotalGb !== undefined) {
    score -= 8;
    recommendations.push({
      id: 'ram-8gb',
      priority: 'medium',
      title: `Ограниченный запас ОЗУ (${exactRamGb} ГБ)`,
      reason: 'Современным играм и Windows 10/11 впритык хватает 8–12 ГБ; возможны подлагивания в открытых мирах.',
      action: 'Вычистите автозагрузку и временные файлы, чтобы оставить максимум памяти под игру.',
      fpsImpact: '+8–15% 1% Low',
      moduleIds: ['cleanTemp', 'telemetryLite'],
    });
  }

  // 4. Refresh rate & frame pacing from real browser measurement
  if (input.measuredHz <= 62) {
    score -= 4;
    recommendations.push({
      id: 'hz-60',
      priority: 'medium',
      title: `Экран работает на ${input.measuredHz} Гц`,
      reason:
        'Даже если видеокарта выдаёт 150 FPS, дисплей показывает максимум 60 кадров в секунду (или в Windows не переключена повышенная герцовка).',
      action:
        'Проверьте «Параметры дисплея → Расширенные параметры дисплея» — если монитор 120/144+ Гц, выберите максимальную частоту вручную.',
      fpsImpact: 'До 2× плавнее картинка',
      moduleIds: [],
    });
  }

  if (input.frameJitterMs > 4.5) {
    score -= 10;
    recommendations.push({
      id: 'jitter-high',
      priority: 'high',
      title: `Зафиксирована нестабильность фреймтайма (джиттер ${input.frameJitterMs.toFixed(1)} мс)`,
      reason:
        'В момент теста кадры отрисовывались неравномерно — это признак фоновой нагрузки на CPU/GPU или энергосберегающих ограничений.',
      action:
        'Отключите GameDVR, оверлеи и примените сетевые и системные твики реестра (NetworkThrottlingIndex / SystemResponsiveness).',
      fpsImpact: '+12–20% 1% Low',
      moduleIds: ['restorePoint', 'ultimatePower', 'gameTweaks'],
    });
  }

  // 5. Deep Windows diagnostic checks (when report is attached)
  const wr = input.windowsReport;
  if (wr) {
    if (wr.ramSpeedMhz && (wr.ramSpeedMhz <= 2400 || wr.ramSpeedMhz === 4800)) {
      score -= 12;
      recommendations.push({
        id: 'win-xmp',
        priority: 'high',
        title: `ОЗУ работает на базовой частоте ${wr.ramSpeedMhz} МГц (XMP/EXPO выключен)`,
        reason:
          'Память DDR4 на 2133/2400 МГц или DDR5 на 4800 МГц режет производительность процессора и просадку 1% Low FPS.',
        action:
          'Зайдите в BIOS (Del/F2 при старте ПК) и активируйте профиль XMP / DOCP / EXPO.',
        fpsImpact: '+10–18% FPS',
        moduleIds: [],
      });
    }

    if (wr.powerPlan === 'balanced' || wr.powerPlan === 'powersaver') {
      score -= 10;
      recommendations.push({
        id: 'win-power',
        priority: 'high',
        title:
          wr.powerPlan === 'powersaver'
            ? 'Включена схема «Экономия энергии»!'
            : 'Активна схема питания «Сбалансированная»',
        reason:
          'Процессор сбрасывает турбо-частоты между кадрами, что увеличивает задержку ввода (Input Lag).',
        action: 'Активируйте схему «Максимальная производительность» через скрипт OptiCore.',
        fpsImpact: '-3 мс Input Lag',
        moduleIds: ['restorePoint', 'ultimatePower'],
      });
    }

    if (wr.gameDvrEnabled) {
      score -= 6;
      recommendations.push({
        id: 'win-gamedvr',
        priority: 'medium',
        title: 'Включена фоновая запись Xbox GameDVR',
        reason: 'Windows постоянно буферизует видео в фоне и снижает стабильность кадров.',
        action: 'Отключите GameDVR через игровой блок твиков реестра в генераторе ниже.',
        fpsImpact: '+5–8% 1% Low',
        moduleIds: ['gameTweaks'],
      });
    }

    if (wr.ssdFreePercent !== undefined && wr.ssdFreePercent < 15) {
      score -= 8;
      recommendations.push({
        id: 'win-ssd',
        priority: 'high',
        title: `На диске C: осталось всего ${wr.ssdFreePercent}% свободного места`,
        reason: 'При заполнении SSD более чем на 85% падает скорость записи и появляются фризы подгрузки локаций.',
        action: 'Очистите временные файлы (%TEMP%, Windows Temp, кэш шейдеров) и удалите старые дистрибутивы.',
        fpsImpact: 'Устранение фризов',
        moduleIds: ['cleanTemp'],
      });
    }

    if (wr.startupCount !== undefined && wr.startupCount > 10) {
      score -= 5;
      recommendations.push({
        id: 'win-startup',
        priority: 'medium',
        title: `Перегружена автозагрузка (${wr.startupCount} программ)`,
        reason: 'Фоновые апдейтеры и лаунчеры занимают ОЗУ и создают лишние прерывания CPU.',
        action: 'Откройте Диспетчер задач → Автозагрузка и отключите всё, кроме драйверов звука и защиты.',
        fpsImpact: '-25% фоновых задач',
        moduleIds: ['telemetryLite'],
      });
    }
  } else if (input.isWindows) {
    // Recommend standard safe baseline bundle for Windows users before deep scan
    recommendations.push({
      id: 'win-baseline',
      priority: 'medium',
      title: 'Рекомендуемый пакет системной оптимизации Windows',
      reason:
        'Браузер не видит настройки реестра Windows (схему питания, GameDVR, кэш Temp и телеметрию), но их безопасно оптимизировать базовым скриптом.',
      action:
        'Примените скрипт с точкой восстановления, схемой Ultimate Performance, очисткой Temp и игровыми твиками реестра — или запустите глубокий скан PowerShell.',
      fpsImpact: '+10–20% стабильности',
      moduleIds: ['restorePoint', 'ultimatePower', 'cleanTemp', 'gameTweaks'],
    });
  }

  if (input.connectionRttMs !== null && input.connectionRttMs > 100) {
    score -= 4;
    recommendations.push({
      id: 'net-rtt',
      priority: 'medium',
      title: `Повышенная сетевая задержка (${input.connectionRttMs} мс)`,
      reason: 'В онлайн-играх высокий пинг ощущается как подёргивания и задержка регистрации попаданий.',
      action: 'Подключитесь по кабелю Ethernet, сбросьте DNS-кэш и отключите фоновые загрузки.',
      fpsImpact: 'Ниже пинг и потери пакетов',
      moduleIds: ['dnsFlush'],
    });
  }

  const clampedScore = Math.max(15, Math.min(98, Math.round(score)));

  let verdictBadge = 'Требует внимания';
  let verdictTitle = 'Есть заметный резерв для роста FPS';
  let verdictDescription =
    'Система справляется с базовыми задачами, но обнаруженные ограничения снижают плавность и отклик в играх.';
  let estimatedFpsGain = '+15–30% FPS';

  if (clampedScore >= 82) {
    verdictBadge = 'Отличное состояние';
    verdictTitle = 'Железо в отличной форме — нужна только тонкая настройка';
    verdictDescription =
      'Аппаратная база сбалансирована. Системные твики Windows и настройка драйвера помогут стабилизировать 1% Low FPS и снизить Input Lag.';
    estimatedFpsGain = '+8–15% 1% Low';
  } else if (clampedScore >= 62) {
    verdictBadge = 'Хорошая база';
    verdictTitle = 'Система работает нормально, но теряет часть производительности';
    verdictDescription =
      'Выполните приоритетные рекомендации ниже и примените безопасный скрипт — это уберёт фоновые просадки и ускорит отклик.';
    estimatedFpsGain = '+12–25% FPS';
  }

  // Sort high -> medium -> ok
  const priorityRank: Record<RecommendationPriority, number> = {
    high: 0,
    medium: 1,
    ok: 2,
  };
  recommendations.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

  const moduleSet = new Set<string>();
  for (const rec of recommendations) {
    for (const modId of rec.moduleIds) {
      moduleSet.add(modId);
    }
  }
  if (moduleSet.size === 0) {
    moduleSet.add('restorePoint');
    moduleSet.add('gameTweaks');
  }

  return {
    score: clampedScore,
    verdictBadge,
    verdictTitle,
    verdictDescription,
    estimatedFpsGain,
    gpuInfo,
    recommendations,
    recommendedModuleIds: Array.from(moduleSet),
  };
}
