export type GpuVendor = 'nvidia' | 'amd' | 'intel' | 'apple' | 'software' | 'unknown';

export interface WindowsDiagReport {
  cpuName?: string;
  gpuName?: string;
  ramTotalGb?: number;
  ramSpeedMhz?: number;
  ramStickCount?: number;
  powerPlan?: 'ultimate' | 'high' | 'balanced' | 'powersaver' | string;
  gameDvrEnabled?: boolean;
  gameModeEnabled?: boolean;
  hagsEnabled?: boolean;
  mouseAccelEnabled?: boolean;
  vbsEnabled?: boolean;
  networkTweaksApplied?: boolean;
  diagTrackRunning?: boolean;
  deliveryOptP2P?: boolean;
  ssdFreePercent?: number;
  tempSizeMb?: number;
  startupCount?: number;
}

export interface HardwareScanInput {
  cpuCores: number;
  deviceMemoryGb: number | null;
  gpuRenderer: string;
  gpuVendorRaw: string;
  webgl2Supported?: boolean;
  maxTextureSize?: number | null;
  screenWidth: number;
  screenHeight: number;
  measuredHz: number;
  avgFrameMs: number;
  frameJitterMs: number;
  frameDeltas?: number[];
  eventLoopLagMs?: number | null;
  onBattery?: boolean | null;
  batteryLevelPercent?: number | null;
  osName: string;
  isWindows: boolean;
  connectionRttMs: number | null;
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
  checksCount: number;
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

export const WINDOWS_DIAG_SCRIPT = String.raw`# OptiCore Deep Read-Only PC Scanner (ничего не меняет в системе)
$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name.Trim()
$gpu = (Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notmatch 'Microsoft Basic' } | Select-Object -First 1).Name.Trim()
$ramBytes = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
$ramGb = [math]::Round($ramBytes / 1GB)
$ramSticks = @(Get-CimInstance Win32_PhysicalMemory)
$ramSpeed = ($ramSticks | Measure-Object -Property Speed -Maximum).Maximum
$ramStickCount = $ramSticks.Count
$planRaw = (powercfg /getactivescheme)
$powerPlan = if ($planRaw -match 'e9a42b02|Ultimate') { 'ultimate' } elseif ($planRaw -match '8c5e7fda|High') { 'high' } elseif ($planRaw -match 'a1841308|Power saver') { 'powersaver' } else { 'balanced' }
$dvr = (Get-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -ErrorAction SilentlyContinue).GameDVR_Enabled
$gm = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\GameBar" -Name "AutoGameModeEnabled" -ErrorAction SilentlyContinue).AutoGameModeEnabled
$hags = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -Name "HwSchMode" -ErrorAction SilentlyContinue).HwSchMode
$mouseSpeed = (Get-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseSpeed" -ErrorAction SilentlyContinue).MouseSpeed
$dg = Get-CimInstance -Namespace root\Microsoft\Windows\DeviceGuard -ClassName Win32_DeviceGuard -ErrorAction SilentlyContinue
$vbsEnabled = ($null -ne $dg -and $dg.SecurityServicesRunning -contains 2)
$mmPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
$netThrot = (Get-ItemProperty -Path $mmPath -Name "NetworkThrottlingIndex" -ErrorAction SilentlyContinue).NetworkThrottlingIndex
$sysResp = (Get-ItemProperty -Path $mmPath -Name "SystemResponsiveness" -ErrorAction SilentlyContinue).SystemResponsiveness
$diagSvc = (Get-Service -Name "DiagTrack" -ErrorAction SilentlyContinue)
$doMode = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" -Name "DODownloadMode" -ErrorAction SilentlyContinue).DODownloadMode
$sysDrive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$ssdFree = if ($sysDrive.Size -gt 0) { [math]::Round(($sysDrive.FreeSpace / $sysDrive.Size) * 100) } else { $null }
$tempBytes = ((Get-ChildItem "$env:TEMP","C:\Windows\Temp" -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum)
$tempMb = if ($tempBytes) { [math]::Round($tempBytes / 1MB) } else { 0 }
$startup = (Get-CimInstance Win32_StartupCommand).Count

$report = [ordered]@{
  cpuName = $cpu
  gpuName = $gpu
  ramTotalGb = $ramGb
  ramSpeedMhz = [int]$ramSpeed
  ramStickCount = [int]$ramStickCount
  powerPlan = $powerPlan
  gameDvrEnabled = ($dvr -ne 0)
  gameModeEnabled = ($gm -ne 0)
  hagsEnabled = ($hags -eq 2)
  mouseAccelEnabled = ($mouseSpeed -ne "0")
  vbsEnabled = [bool]$vbsEnabled
  networkTweaksApplied = ($netThrot -eq 4294967295 -and $sysResp -eq 0)
  diagTrackRunning = ($null -ne $diagSvc -and $diagSvc.Status -eq 'Running')
  deliveryOptP2P = ($doMode -ne 0)
  ssdFreePercent = $ssdFree
  tempSizeMb = [int]$tempMb
  startupCount = [int]$startup
} | ConvertTo-Json -Compress

Write-Output "OPTICORE:$report"
Set-Clipboard -Value "OPTICORE:$report"
Write-Host ""
Write-Host "Глубокий отчёт скопирован в буфер обмена! Вставь его на сайте OptiCore." -ForegroundColor Green`;

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
  if (
    normalized.includes('nvidia') ||
    normalized.includes('geforce') ||
    normalized.includes('rtx') ||
    normalized.includes('gtx')
  ) {
    const isLowEnd = /\b(gt\s?[0-9]{3}|mx\s?[0-9]{3})\b/i.test(renderer);
    return {
      vendor: 'nvidia',
      isIntegratedOrWeak: isLowEnd,
      label: isLowEnd ? 'NVIDIA (начальный уровень)' : 'NVIDIA GeForce (дискретная)',
    };
  }
  if (normalized.includes('amd') || normalized.includes('radeon')) {
    const isApu =
      /vega\s?[0-9]+|radeon\(tm\)\s?graphics/i.test(renderer) && !/rx\s?[0-9]{3,4}/i.test(renderer);
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

function readOptBool(val: unknown): boolean | undefined {
  return typeof val === 'boolean' ? val : undefined;
}

function readOptNum(val: unknown): number | undefined {
  return typeof val === 'number' && Number.isFinite(val) ? val : undefined;
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
      ramTotalGb: readOptNum(parsed.ramTotalGb),
      ramSpeedMhz: readOptNum(parsed.ramSpeedMhz),
      ramStickCount: readOptNum(parsed.ramStickCount),
      powerPlan: typeof parsed.powerPlan === 'string' ? parsed.powerPlan : undefined,
      gameDvrEnabled: readOptBool(parsed.gameDvrEnabled),
      gameModeEnabled: readOptBool(parsed.gameModeEnabled),
      hagsEnabled: readOptBool(parsed.hagsEnabled),
      mouseAccelEnabled: readOptBool(parsed.mouseAccelEnabled),
      vbsEnabled: readOptBool(parsed.vbsEnabled),
      networkTweaksApplied: readOptBool(parsed.networkTweaksApplied),
      diagTrackRunning: readOptBool(parsed.diagTrackRunning),
      deliveryOptP2P: readOptBool(parsed.deliveryOptP2P),
      ssdFreePercent: readOptNum(parsed.ssdFreePercent),
      tempSizeMb: readOptNum(parsed.tempSizeMb),
      startupCount: readOptNum(parsed.startupCount),
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

export function getChecklistIdsFromWindowsReport(report: WindowsDiagReport): string[] {
  const checked: string[] = [];
  if (report.powerPlan === 'ultimate' || report.powerPlan === 'high') checked.push('power');
  if (report.startupCount !== undefined && report.startupCount <= 10) checked.push('startup');
  if (report.gameModeEnabled && report.hagsEnabled) checked.push('gamemode');
  if (report.ramSpeedMhz && report.ramSpeedMhz > 2400 && report.ramSpeedMhz !== 4800) {
    checked.push('xmp');
  }
  if (report.ssdFreePercent !== undefined && report.ssdFreePercent >= 15) checked.push('ssd');
  if (report.tempSizeMb !== undefined && report.tempSizeMb < 500) checked.push('temp');
  if (report.mouseAccelEnabled === false) checked.push('mouse');
  if (report.gameDvrEnabled === false) checked.push('overlays');
  if (report.deliveryOptP2P === false) checked.push('delivery');
  return checked;
}

export function evaluatePcScan(input: HardwareScanInput): ScanEvaluation {
  const gpuSourceName = input.windowsReport?.gpuName || input.gpuRenderer;
  const gpuInfo = classifyGpu(gpuSourceName);
  const recommendations: ScanRecommendation[] = [];
  let score = 92;
  let checksCount = 7;

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
        'Установите актуальный драйвер видеокарты NVIDIA / AMD с официального сайта и включите аппаратное ускорение в Windows и браузере.',
      fpsImpact: '+40–100% FPS',
      moduleIds: ['restorePoint', 'cleanTemp', 'visualEffectsPerf'],
    });
  } else if (gpuInfo.isIntegratedOrWeak) {
    score -= 14;
    recommendations.push({
      id: 'gpu-igpu',
      priority: 'medium',
      title: 'Обнаружена встроенная или начальная графика',
      reason: `GPU (${gpuSourceName}) делит пропускную способность с оперативной памятью, поэтому критически зависит от её частоты и фоновой нагрузки.`,
      action:
        'Освободите ОЗУ от фоновых программ, включите XMP/EXPO в BIOS и используйте FSR / NIS / низкие тени.',
      fpsImpact: '+12–22% FPS',
      moduleIds: ['restorePoint', 'ultimatePower', 'cleanTemp', 'gameTweaks', 'gpuPriority'],
    });
  } else {
    recommendations.push({
      id: 'gpu-ok',
      priority: 'ok',
      title: 'Аппаратный GPU обнаружен и готов к нагрузке',
      reason: `Видеокарта ${gpuSourceName} поддерживает аппаратное ускорение${input.webgl2Supported ? ' и WebGL2' : ''}.`,
      action:
        gpuInfo.vendor === 'nvidia'
          ? 'В панели NVIDIA выберите режим «Максимальная производительность» и включите Low Latency Mode.'
          : gpuInfo.vendor === 'amd'
            ? 'В AMD Adrenalin включите Radeon Anti-Lag и Smart Access Memory (ReBAR).'
            : 'Проверьте актуальность драйвера GPU и отключите ненужные внутриигровые оверлеи.',
      fpsImpact: '+5–12% 1% Low',
      moduleIds: ['gameTweaks', 'gpuPriority'],
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
        'На 2–4 потоках фоновые задачи Windows, телеметрия и оверлеи напрямую отбирают процессорное время у игр.',
      action:
        'Отключите лишнюю автозагрузку, службу телеметрии DiagTrack, фоновые приложения UWP и включите профиль Ultimate Performance.',
      fpsImpact: '+10–18% FPS',
      moduleIds: ['restorePoint', 'ultimatePower', 'telemetryLite', 'disableOverlays', 'gameTweaks'],
    });
  } else if (input.cpuCores <= 6) {
    score -= 4;
    recommendations.push({
      id: 'cpu-mid',
      priority: 'medium',
      title: `Средний запас потоков CPU (${input.cpuCores})`,
      reason:
        'Процессор справится с большинством игр, но при десятках фоновых служб возможны микростаттеры.',
      action:
        'Включите профиль Ultimate Performance и задайте высокий приоритет MMCSS для игр.',
      fpsImpact: '+6–10% стабильности',
      moduleIds: ['ultimatePower', 'gpuPriority', 'gameTweaks'],
    });
  } else {
    recommendations.push({
      id: 'cpu-ok',
      priority: 'ok',
      title: `Отличный запас потоков процессора (${input.cpuCores})`,
      reason: 'Многопоточности достаточно для современных игр и фоновых приложений.',
      action: 'Зафиксируйте схему «Максимальная производительность» и приоритет MMCSS.',
      fpsImpact: 'Стабильный фреймтайм',
      moduleIds: ['ultimatePower', 'gpuPriority'],
    });
  }

  // 3. RAM evaluation
  const exactRamGb = input.windowsReport?.ramTotalGb ?? input.deviceMemoryGb;
  if (exactRamGb !== null && exactRamGb <= 4) {
    score -= 18;
    recommendations.push({
      id: 'ram-critical',
      priority: 'high',
      title: `Недостаточный объём ОЗУ (~${exactRamGb} ГБ)`,
      reason:
        'При 4 ГБ памяти Windows постоянно сбрасывает данные на диск (файл подкачки), что вызывает жёсткие фризы.',
      action:
        'Отключите фоновые UWP-приложения, телеметрию и прозрачность интерфейса; рассмотрите апгрейд до 16 ГБ.',
      fpsImpact: '-60% фризов',
      moduleIds: ['restorePoint', 'cleanTemp', 'telemetryLite', 'disableOverlays', 'visualEffectsPerf'],
    });
  } else if (
    exactRamGb !== null &&
    exactRamGb < 16 &&
    input.windowsReport?.ramTotalGb !== undefined
  ) {
    score -= 7;
    recommendations.push({
      id: 'ram-8gb',
      priority: 'medium',
      title: `Ограниченный запас ОЗУ (${exactRamGb} ГБ)`,
      reason: 'Современным играм и Windows 10/11 впритык хватает 8–12 ГБ.',
      action: 'Очистите автозагрузку, временные файлы и отключите фоновые приложения UWP.',
      fpsImpact: '+8–15% 1% Low',
      moduleIds: ['cleanTemp', 'telemetryLite', 'disableOverlays'],
    });
  }

  // 4. Refresh rate, frame jitter, event loop lag, battery
  if (input.measuredHz <= 62) {
    score -= 4;
    recommendations.push({
      id: 'hz-60',
      priority: 'medium',
      title: `Экран работает на ${input.measuredHz} Гц`,
      reason:
        'Даже если видеокарта выдаёт 150+ FPS, дисплей выводит максимум ~60 кадров/с или в Windows не переключена повышенная герцовка.',
      action:
        'Проверьте «Параметры дисплея → Расширенные параметры дисплея» и выберите максимальную частоту экрана.',
      fpsImpact: 'До 2× плавнее',
      moduleIds: [],
    });
  }

  if (input.frameJitterMs > 4.5) {
    score -= 9;
    recommendations.push({
      id: 'jitter-high',
      priority: 'high',
      title: `Нестабильный фреймтайм (джиттер ${input.frameJitterMs.toFixed(1)} мс)`,
      reason:
        'В момент замера кадры отрисовывались неравномерно — это признак фоновой нагрузки или энергосбережения.',
      action:
        'Отключите GameDVR, оверлеи и примените игровые твики реестра (NetworkThrottlingIndex / SystemResponsiveness).',
      fpsImpact: '+12–20% 1% Low',
      moduleIds: ['restorePoint', 'ultimatePower', 'gameTweaks', 'disableOverlays'],
    });
  }

  if (input.eventLoopLagMs !== undefined && input.eventLoopLagMs !== null) {
    checksCount += 1;
    if (input.eventLoopLagMs > 3.5) {
      score -= 6;
      recommendations.push({
        id: 'event-lag',
        priority: 'medium',
        title: `Повышенная задержка отклика потоков (${input.eventLoopLagMs} мс)`,
        reason:
          'Планировщик задач браузера отвечает с задержкой — возможна высокая фоновая нагрузка на CPU.',
        action: 'Закройте лишние фоновые программы и отключите телеметрию / фоновые UWP.',
        fpsImpact: '-2–4 мс Input Lag',
        moduleIds: ['telemetryLite', 'disableOverlays', 'ultimatePower'],
      });
    }
  }

  if (input.onBattery) {
    checksCount += 1;
    score -= 12;
    recommendations.push({
      id: 'battery-throttle',
      priority: 'high',
      title: `Работа от аккумулятора (${input.batteryLevelPercent ?? '?'}%)`,
      reason:
        'При питании от батареи ноутбук принудительно снижает лимиты мощности CPU и GPU.',
      action: 'Обязательно подключите зарядное устройство перед запуском игр.',
      fpsImpact: '+30–60% FPS',
      moduleIds: ['ultimatePower'],
    });
  }

  // 5. Deep Windows diagnostic checks (when report is attached)
  const wr = input.windowsReport;
  if (wr) {
    checksCount += 12;

    if (wr.ramStickCount === 1) {
      score -= 10;
      recommendations.push({
        id: 'win-single-channel',
        priority: 'high',
        title: 'Оперативная память работает в одноканальном режиме (1 планка)',
        reason:
          'При одной планке ОЗУ пропускная способность памяти урезана вдвое, что сильно снижает FPS в процессорозависимых играх.',
        action:
          'Для заметного буста FPS и 1% Low добавьте вторую аналогичную планку ОЗУ в слот A2/B2.',
        fpsImpact: '+15–25% FPS',
        moduleIds: [],
      });
    }

    if (wr.ramSpeedMhz && (wr.ramSpeedMhz <= 2400 || wr.ramSpeedMhz === 4800)) {
      score -= 10;
      recommendations.push({
        id: 'win-xmp',
        priority: 'high',
        title: `ОЗУ работает на базовой частоте ${wr.ramSpeedMhz} МГц (XMP/EXPO выключен)`,
        reason:
          'Память DDR4 на 2133/2400 МГц или DDR5 на 4800 МГц ограничивает скорость CPU и вызывает просадки 1% Low FPS.',
        action: 'Зайдите в BIOS (Del/F2 при старте ПК) и активируйте профиль XMP / DOCP / EXPO.',
        fpsImpact: '+10–18% FPS',
        moduleIds: [],
      });
    }

    if (wr.powerPlan === 'balanced' || wr.powerPlan === 'powersaver') {
      score -= 9;
      recommendations.push({
        id: 'win-power',
        priority: 'high',
        title:
          wr.powerPlan === 'powersaver'
            ? 'Включена схема «Экономия энергии»!'
            : 'Активна схема питания «Сбалансированная»',
        reason:
          'Процессор сбрасывает турбо-частоты между кадрами, что увеличивает задержку ввода.',
        action: 'Активируйте схему «Максимальная производительность» через скрипт OptiCore.',
        fpsImpact: '-3 мс Input Lag',
        moduleIds: ['restorePoint', 'ultimatePower'],
      });
    }

    if (wr.hagsEnabled === false) {
      score -= 4;
      recommendations.push({
        id: 'win-hags',
        priority: 'medium',
        title: 'Отключено аппаратное планирование GPU (HAGS)',
        reason:
          'На Windows 10/11 HAGS снижает задержку очереди кадров и нужен для Frame Generation.',
        action: 'Включите модуль «HAGS и Игровой режим Windows» в генераторе ниже.',
        fpsImpact: '-1–2 мс Latency',
        moduleIds: ['hagsAndGameMode'],
      });
    }

    if (wr.mouseAccelEnabled) {
      score -= 4;
      recommendations.push({
        id: 'win-mouse-accel',
        priority: 'medium',
        title: 'Включена акселерация мыши Windows',
        reason:
          'Повышенная точность указателя искажает мышечную память в шутерах при резких движениях.',
        action: 'Примените твик «Отключить акселерацию мыши Windows» (MouseSpeed=0).',
        fpsImpact: 'Честный ввод 1:1',
        moduleIds: ['mouseRawInput'],
      });
    }

    if (wr.gameDvrEnabled) {
      score -= 6;
      recommendations.push({
        id: 'win-gamedvr',
        priority: 'medium',
        title: 'Включена фоновая запись Xbox GameDVR',
        reason: 'Windows буферизует видео в фоне и снижает стабильность кадров.',
        action: 'Отключите GameDVR и Game Bar через соответствующие твики в генераторе.',
        fpsImpact: '+5–8% 1% Low',
        moduleIds: ['gameTweaks', 'disableOverlays'],
      });
    }

    if (wr.networkTweaksApplied === false) {
      score -= 4;
      recommendations.push({
        id: 'win-mmcss',
        priority: 'medium',
        title: 'Включён системный троттлинг сети и мультимедиа',
        reason:
          'Стандартные значения NetworkThrottlingIndex и SystemResponsiveness резервируют часть CPU/сети под фоновые задачи.',
        action: 'Примените твики реестра `gameTweaks` и `gpuPriority`.',
        fpsImpact: '+5–10% стабильности',
        moduleIds: ['gameTweaks', 'gpuPriority'],
      });
    }

    if (wr.vbsEnabled) {
      score -= 5;
      recommendations.push({
        id: 'win-vbs',
        priority: 'medium',
        title: 'Активна изоляция ядра Windows (VBS / Memory Integrity)',
        reason:
          'На процессорах прошлых поколений VBS/HVCI может забирать 5–10% игрового FPS.',
        action:
          'Если ПК используется только для игр, проверьте «Безопасность Windows → Безопасность устройства → Изоляция ядра».',
        fpsImpact: '+5–10% FPS',
        moduleIds: [],
      });
    }

    if (wr.diagTrackRunning) {
      score -= 3;
      recommendations.push({
        id: 'win-diagtrack',
        priority: 'medium',
        title: 'Работает фоновая служба телеметрии DiagTrack',
        reason: 'Периодически создаёт нагрузку на диск и процессор в фоне.',
        action: 'Добавьте отключение DiagTrack в генераторе скриптов.',
        fpsImpact: '-Фоновые пики',
        moduleIds: ['telemetryLite'],
      });
    }

    if (wr.deliveryOptP2P) {
      score -= 3;
      recommendations.push({
        id: 'win-p2p',
        priority: 'medium',
        title: 'Не отключена P2P-оптимизация доставки обновлений',
        reason: 'Windows может раздавать обновления другим ПК и вызывать скачки пинга.',
        action: 'Примените твик «Отключить P2P-раздачу обновлений Windows».',
        fpsImpact: 'Ниже джиттер пинга',
        moduleIds: ['disableP2PUpdate'],
      });
    }

    if (
      (wr.ssdFreePercent !== undefined && wr.ssdFreePercent < 15) ||
      (wr.tempSizeMb !== undefined && wr.tempSizeMb > 1000)
    ) {
      score -= 7;
      recommendations.push({
        id: 'win-ssd',
        priority: 'high',
        title:
          wr.ssdFreePercent !== undefined && wr.ssdFreePercent < 15
            ? `На диске C: осталось всего ${wr.ssdFreePercent}% места`
            : `Накопилось ${wr.tempSizeMb} МБ временного кэша Temp`,
        reason:
          'При заполнении SSD более чем на 85% падает скорость записи, а старый кэш замедляет подгрузки.',
        action: 'Очистите %TEMP%, Windows Temp и D3DSCache через модуль очистки.',
        fpsImpact: 'Устранение фризов',
        moduleIds: ['cleanTemp'],
      });
    }

    if (wr.startupCount !== undefined && wr.startupCount > 10) {
      score -= 4;
      recommendations.push({
        id: 'win-startup',
        priority: 'medium',
        title: `Перегружена автозагрузка (${wr.startupCount} программ)`,
        reason: 'Фоновые апдейтеры и лаунчеры занимают ОЗУ и создают лишние прерывания CPU.',
        action: 'Откройте Диспетчер задач → Автозагрузка и отключите лишние программы.',
        fpsImpact: '-25% фоновых задач',
        moduleIds: ['telemetryLite', 'disableOverlays'],
      });
    }
  } else if (input.isWindows) {
    recommendations.push({
      id: 'win-baseline',
      priority: 'medium',
      title: 'Рекомендуемый пакет системной оптимизации Windows',
      reason:
        'Браузер не видит настройки реестра Windows (HAGS, XMP, схему питания, GameDVR и кэш Temp), но их легко проверить read-only скриптом PowerShell ниже или оптимизировать сразу.',
      action:
        'Запустите глубокий скан PowerShell или сразу примените безопасный набор твиков.',
      fpsImpact: '+10–22% стабильности',
      moduleIds: [
        'restorePoint',
        'ultimatePower',
        'cleanTemp',
        'gameTweaks',
        'gpuPriority',
        'mouseRawInput',
      ],
    });
  }

  if (input.connectionRttMs !== null && input.connectionRttMs > 100) {
    score -= 4;
    recommendations.push({
      id: 'net-rtt',
      priority: 'medium',
      title: `Повышенная сетевая задержка (${input.connectionRttMs} мс)`,
      reason: 'В онлайн-играх высокий пинг ощущается как подёргивания и задержка регистрации.',
      action: 'Перейдите на кабель Ethernet, сбросьте DNS-кэш и отключите P2P-обновления.',
      fpsImpact: 'Ниже пинг',
      moduleIds: ['dnsFlush', 'disableP2PUpdate'],
    });
  }

  const clampedScore = Math.max(15, Math.min(98, Math.round(score)));

  let verdictBadge = 'Требует внимания';
  let verdictTitle = 'Есть заметный резерв для роста FPS';
  let verdictDescription =
    'Обнаруженные ограничения снижают плавность и отклик в играх — выполните приоритетные пункты и примените подобранный скрипт.';
  let estimatedFpsGain = '+15–35% FPS';

  if (clampedScore >= 82) {
    verdictBadge = 'Отличное состояние';
    verdictTitle = 'Железо в отличной форме — нужна лишь тонкая настройка';
    verdictDescription =
      'Аппаратная база сбалансирована. Точечные твики Windows и настройка драйвера помогут стабилизировать 1% Low FPS и снизить Input Lag.';
    estimatedFpsGain = '+8–15% 1% Low';
  } else if (clampedScore >= 62) {
    verdictBadge = 'Хорошая база';
    verdictTitle = 'Система работает нормально, но теряет часть производительности';
    verdictDescription =
      'Выполните приоритетные рекомендации ниже и примените безопасный скрипт — это уберёт фоновые просадки и ускорит отклик.';
    estimatedFpsGain = '+12–25% FPS';
  }

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
    checksCount,
    verdictBadge,
    verdictTitle,
    verdictDescription,
    estimatedFpsGain,
    gpuInfo,
    recommendations,
    recommendedModuleIds: Array.from(moduleSet),
  };
}
