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
  win32PrioritySep38?: boolean;
  mpoDisabled?: boolean;
  usbPowerSavingOff?: boolean;
  nagleDisabled?: boolean;
  hibernationDisabled?: boolean;
  powerThrottlingOff?: boolean;
  transparencyDisabled?: boolean;
  uwpBackgroundDisabled?: boolean;
  gpuPriorityHigh?: boolean;
  fastDnsConfigured?: boolean;
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

export interface VerifiedWindowsCheck {
  id: string;
  label: string;
  valueText: string;
  passed: boolean;
}

export interface ScanEvaluation {
  score: number;
  hardwareScore: number;
  optimizationScore: number | null;
  windowsVerified: boolean;
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
  verifiedChecks: VerifiedWindowsCheck[];
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
$powerPlan = if ($planRaw -match 'e9a42b02|Ultimate|Максимальн') { 'ultimate' } elseif ($planRaw -match '8c5e7fda|High|Высок') { 'high' } elseif ($planRaw -match 'a1841308|Power saver|Эконом') { 'powersaver' } else { 'balanced' }
$dvr = (Get-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -ErrorAction SilentlyContinue).GameDVR_Enabled
$gm = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\GameBar" -Name "AutoGameModeEnabled" -ErrorAction SilentlyContinue).AutoGameModeEnabled
$hags = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -Name "HwSchMode" -ErrorAction SilentlyContinue).HwSchMode
$mouseSpeed = (Get-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseSpeed" -ErrorAction SilentlyContinue).MouseSpeed
$dg = Get-CimInstance -Namespace root\Microsoft\Windows\DeviceGuard -ClassName Win32_DeviceGuard -ErrorAction SilentlyContinue
$vbsEnabled = ($null -ne $dg -and $dg.SecurityServicesRunning -contains 2)
$mmPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
$netThrot = (Get-ItemProperty -Path $mmPath -Name "NetworkThrottlingIndex" -ErrorAction SilentlyContinue).NetworkThrottlingIndex
$sysResp = (Get-ItemProperty -Path $mmPath -Name "SystemResponsiveness" -ErrorAction SilentlyContinue).SystemResponsiveness
$gpuPrioVal = (Get-ItemProperty -Path "$mmPath\Tasks\Games" -Name "GPU Priority" -ErrorAction SilentlyContinue)."GPU Priority"
$diagSvc = (Get-Service -Name "DiagTrack" -ErrorAction SilentlyContinue)
$doMode = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" -Name "DODownloadMode" -ErrorAction SilentlyContinue).DODownloadMode
$sysDrive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$ssdFree = if ($sysDrive.Size -gt 0) { [math]::Round(($sysDrive.FreeSpace / $sysDrive.Size) * 100) } else { $null }
$tempBytes = ((Get-ChildItem "$env:TEMP","C:\Windows\Temp" -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum)
$tempMb = if ($tempBytes) { [math]::Round($tempBytes / 1MB) } else { 0 }
$startup = (Get-CimInstance Win32_StartupCommand).Count
$win32Prio = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" -Name "Win32PrioritySeparation" -ErrorAction SilentlyContinue).Win32PrioritySeparation
$mpoVal = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\Dwm" -Name "OverlayTestMode" -ErrorAction SilentlyContinue).OverlayTestMode
$usbVal = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USB" -Name "DisableSelectiveSuspend" -ErrorAction SilentlyContinue).DisableSelectiveSuspend
$hiberVal = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "HibernateEnabled" -ErrorAction SilentlyContinue).HibernateEnabled
$ptVal = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" -Name "PowerThrottlingOff" -ErrorAction SilentlyContinue).PowerThrottlingOff
$transVal = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "EnableTransparency" -ErrorAction SilentlyContinue).EnableTransparency
$uwpVal = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -ErrorAction SilentlyContinue).GlobalUserDisabled
$dnsServers = @(Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ServerAddresses)
$fastDns = ($dnsServers -contains '1.1.1.1' -or $dnsServers -contains '8.8.8.8' -or $dnsServers -contains '9.9.9.9')
$nagleOn = $false
Get-ChildItem "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" -ErrorAction SilentlyContinue | ForEach-Object {
  $p = Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue
  if ($p.TCPNoDelay -eq 1 -and $p.TcpAckFrequency -eq 1) { $nagleOn = $true }
}

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
  gpuPriorityHigh = ($gpuPrioVal -ge 6)
  diagTrackRunning = ($null -ne $diagSvc -and $diagSvc.Status -eq 'Running')
  deliveryOptP2P = ($doMode -ne 0)
  ssdFreePercent = $ssdFree
  tempSizeMb = [int]$tempMb
  startupCount = [int]$startup
  win32PrioritySep38 = ($win32Prio -eq 38)
  mpoDisabled = ($mpoVal -eq 5)
  usbPowerSavingOff = ($usbVal -eq 1)
  nagleDisabled = $nagleOn
  hibernationDisabled = ($hiberVal -eq 0)
  powerThrottlingOff = ($ptVal -eq 1)
  transparencyDisabled = ($transVal -eq 0)
  uwpBackgroundDisabled = ($uwpVal -eq 1)
  fastDnsConfigured = $fastDns
} | ConvertTo-Json -Compress

Write-Output "OPTICORE:$report"
Set-Clipboard -Value "OPTICORE:$report" -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Глубокий отчёт скопирован в буфер обмена! Вставь его на сайте OptiCore." -ForegroundColor Green
if ($Host.Name -eq 'ConsoleHost') { Read-Host "Нажми Enter для выхода" }`;

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
      win32PrioritySep38: readOptBool(parsed.win32PrioritySep38),
      mpoDisabled: readOptBool(parsed.mpoDisabled),
      usbPowerSavingOff: readOptBool(parsed.usbPowerSavingOff),
      nagleDisabled: readOptBool(parsed.nagleDisabled),
      hibernationDisabled: readOptBool(parsed.hibernationDisabled),
      powerThrottlingOff: readOptBool(parsed.powerThrottlingOff),
      transparencyDisabled: readOptBool(parsed.transparencyDisabled),
      uwpBackgroundDisabled: readOptBool(parsed.uwpBackgroundDisabled),
      gpuPriorityHigh: readOptBool(parsed.gpuPriorityHigh),
      fastDnsConfigured: readOptBool(parsed.fastDnsConfigured),
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
  if (report.fastDnsConfigured === true) checked.push('dns');
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
        'Отключите GameDVR, оверлеи, MPO (OverlayTestMode=5) и стабилизируйте планировщик Windows.',
      fpsImpact: '+12–20% 1% Low',
      moduleIds: [
        'restorePoint',
        'ultimatePower',
        'gameTweaks',
        'disableOverlays',
        'disableFullscreenOpt',
        'timerResolutionBcd',
      ],
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

  // 5. Deep Windows diagnostic checks (real verified OS optimization state)
  const wr = input.windowsReport;
  const verifiedChecks: VerifiedWindowsCheck[] = [];
  let winEarned = 0;
  let winPossible = 0;

  const recordCheck = (
    id: string,
    label: string,
    weight: number,
    passed: boolean,
    valueText: string,
  ) => {
    winPossible += weight;
    if (passed) winEarned += weight;
    verifiedChecks.push({ id, label, valueText, passed });
  };

  if (wr) {
    checksCount += 12;

    if (wr.powerPlan) {
      const ok = wr.powerPlan === 'ultimate' || wr.powerPlan === 'high';
      const labelMap: Record<string, string> = {
        ultimate: 'Макс. производительность',
        high: 'Высокая',
        balanced: 'Сбалансированная',
        powersaver: 'Экономия энергии',
      };
      recordCheck('power', 'Схема питания', 10, ok, labelMap[wr.powerPlan] || wr.powerPlan);
    }

    if (wr.powerThrottlingOff !== undefined) {
      recordCheck(
        'power_throttling',
        'Power Throttling',
        6,
        wr.powerThrottlingOff,
        wr.powerThrottlingOff ? 'Отключён' : 'Активен (сток)',
      );
      if (!wr.powerThrottlingOff) {
        recommendations.push({
          id: 'win-power-throttling',
          priority: 'medium',
          title: 'Включён системный Power Throttling Windows',
          reason: 'Windows может снижать частоту потоков при фоновой или смешанной нагрузке.',
          action: 'Примените твик «Отключить системный Power Throttling».',
          fpsImpact: '+3–8% 1% Low',
          moduleIds: ['disablePowerThrottling'],
        });
      }
    }

    if (wr.gameModeEnabled !== undefined) {
      recordCheck(
        'gamemode',
        'Игровой режим',
        5,
        wr.gameModeEnabled,
        wr.gameModeEnabled ? 'Включён' : 'Выключен',
      );
    }

    if (wr.hagsEnabled !== undefined) {
      recordCheck('hags', 'HAGS (GPU)', 6, wr.hagsEnabled, wr.hagsEnabled ? 'Включён' : 'Выключен');
    }

    if (wr.gameDvrEnabled !== undefined) {
      recordCheck(
        'gamedvr',
        'Xbox GameDVR',
        8,
        !wr.gameDvrEnabled,
        wr.gameDvrEnabled ? 'Включён (пишет фон)' : 'Отключён',
      );
    }

    if (wr.networkTweaksApplied !== undefined || wr.gpuPriorityHigh !== undefined) {
      const mmcssOk =
        wr.networkTweaksApplied === true && wr.gpuPriorityHigh !== false;
      recordCheck(
        'mmcss',
        'Приоритет MMCSS / GPU',
        8,
        mmcssOk,
        mmcssOk ? 'Настроен' : 'Сток Windows',
      );
    }

    if (wr.win32PrioritySep38 !== undefined) {
      recordCheck(
        'win32prio',
        'Win32PrioritySeparation',
        6,
        wr.win32PrioritySep38,
        wr.win32PrioritySep38 ? '38 (0x26)' : 'Сток Windows',
      );
      if (!wr.win32PrioritySep38) {
        recommendations.push({
          id: 'win-win32prio',
          priority: 'medium',
          title: 'Не настроен приоритет активного окна (Win32PrioritySeparation)',
          reason: 'Стандартные длинные кванты планировщика менее отзывчивы в соревновательных играх.',
          action: 'Примените модуль `win32PrioritySep` (значение 38 / 0x26).',
          fpsImpact: '-1–3 мс Input Lag',
          moduleIds: ['win32PrioritySep'],
        });
      }
    }

    if (wr.mpoDisabled !== undefined) {
      recordCheck(
        'mpo',
        'MPO (OverlayTestMode)',
        5,
        wr.mpoDisabled,
        wr.mpoDisabled ? 'Отключён (5)' : 'Включён (сток)',
      );
      if (!wr.mpoDisabled) {
        recommendations.push({
          id: 'win-mpo',
          priority: 'medium',
          title: 'Активен Multi-Plane Overlay (MPO)',
          reason: 'MPO часто вызывает микрофризы и мерцания в DX11/DX12 играх и при Alt-Tab.',
          action: 'Примените твик «Отключить MPO (OverlayTestMode=5)».',
          fpsImpact: 'Плавнее 1% Low',
          moduleIds: ['disableFullscreenOpt'],
        });
      }
    }

    if (wr.mouseAccelEnabled !== undefined) {
      recordCheck(
        'mouse',
        'Акселерация мыши',
        7,
        !wr.mouseAccelEnabled,
        wr.mouseAccelEnabled ? 'Включена' : 'Выключена (1:1)',
      );
    }

    if (wr.usbPowerSavingOff !== undefined) {
      recordCheck(
        'usb',
        'Энергосбережение USB',
        5,
        wr.usbPowerSavingOff,
        wr.usbPowerSavingOff ? 'Отключено' : 'Включено (сток)',
      );
      if (!wr.usbPowerSavingOff) {
        recommendations.push({
          id: 'win-usb',
          priority: 'medium',
          title: 'Включено автоотключение питания USB-портов',
          reason: 'Windows может переводить контроллер USB в сон и вызывать микрозадержки периферии.',
          action: 'Примените твик `usbPowerSavingOff`.',
          fpsImpact: 'Стабильный отклик мыши',
          moduleIds: ['usbPowerSavingOff'],
        });
      }
    }

    if (wr.transparencyDisabled !== undefined) {
      recordCheck(
        'transparency',
        'Прозрачность окон',
        4,
        wr.transparencyDisabled,
        wr.transparencyDisabled ? 'Отключена' : 'Включена',
      );
    }

    if (wr.uwpBackgroundDisabled !== undefined) {
      recordCheck(
        'uwp',
        'Фоновые UWP',
        4,
        wr.uwpBackgroundDisabled,
        wr.uwpBackgroundDisabled ? 'Запрещены' : 'Разрешены',
      );
    }

    if (wr.diagTrackRunning !== undefined) {
      recordCheck(
        'diagtrack',
        'Телеметрия DiagTrack',
        5,
        !wr.diagTrackRunning,
        wr.diagTrackRunning ? 'Работает в фоне' : 'Остановлена',
      );
    }

    if (wr.deliveryOptP2P !== undefined) {
      recordCheck(
        'p2p',
        'P2P обновлений',
        4,
        !wr.deliveryOptP2P,
        wr.deliveryOptP2P ? 'Включена' : 'Отключена',
      );
    }

    if (wr.nagleDisabled !== undefined) {
      recordCheck(
        'nagle',
        'Алгоритм Нагла',
        5,
        wr.nagleDisabled,
        wr.nagleDisabled ? 'Отключён' : 'Включён (сток)',
      );
      if (!wr.nagleDisabled) {
        recommendations.push({
          id: 'win-nagle',
          priority: 'medium',
          title: 'Не отключён алгоритм Нагла на сетевых адаптерах',
          reason: 'Сетевые пакеты буферизуются перед отправкой, увеличивая джиттер пинга.',
          action: 'Примените твик `nagleDisable`.',
          fpsImpact: 'Ниже джиттер пинга',
          moduleIds: ['nagleDisable'],
        });
      }
    }

    if (wr.startupCount !== undefined) {
      const startupOk = wr.startupCount <= 8;
      const startupMid = wr.startupCount <= 14;
      winPossible += 6;
      if (startupOk) winEarned += 6;
      else if (startupMid) winEarned += 3;
      verifiedChecks.push({
        id: 'startup',
        label: 'Автозагрузка',
        valueText: `${wr.startupCount} прогр.`,
        passed: startupOk,
      });
    }

    if (wr.ssdFreePercent !== undefined || wr.tempSizeMb !== undefined) {
      const ssdOk = wr.ssdFreePercent === undefined || wr.ssdFreePercent >= 15;
      const tempOk = wr.tempSizeMb === undefined || wr.tempSizeMb < 500;
      winPossible += 6;
      if (ssdOk && tempOk) winEarned += 6;
      else if (ssdOk || tempOk) winEarned += 3;
      verifiedChecks.push({
        id: 'ssd_temp',
        label: 'SSD C: и кэш Temp',
        valueText: `${wr.ssdFreePercent ?? '?'}% свободно · ${wr.tempSizeMb ?? '?'} МБ`,
        passed: ssdOk && tempOk,
      });
    }

    if (wr.ramStickCount === 1) {
      score -= 10;
      verifiedChecks.push({
        id: 'ram_channel',
        label: 'Режим ОЗУ',
        valueText: '1 планка (одноканал)',
        passed: false,
      });
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
    } else if (wr.ramStickCount && wr.ramStickCount >= 2) {
      verifiedChecks.push({
        id: 'ram_channel',
        label: 'Режим ОЗУ',
        valueText: `${wr.ramStickCount} планки (многоканал)`,
        passed: true,
      });
    }

    if (wr.ramSpeedMhz) {
      const xmpOk = wr.ramSpeedMhz > 2400 && wr.ramSpeedMhz !== 4800;
      recordCheck('xmp', 'Профиль ОЗУ (XMP)', 6, xmpOk, `${wr.ramSpeedMhz} МГц`);
      if (!xmpOk) {
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
        action: 'Примените твики реестра `gameTweaks`, `gpuPriority` и `win32PrioritySep`.',
        fpsImpact: '+5–10% стабильности',
        moduleIds: ['gameTweaks', 'gpuPriority', 'win32PrioritySep'],
      });
    }

    if (wr.vbsEnabled !== undefined) {
      verifiedChecks.push({
        id: 'vbs',
        label: 'Изоляция ядра (VBS)',
        valueText: wr.vbsEnabled ? 'Включена (-FPS)' : 'Выключена',
        passed: !wr.vbsEnabled,
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
        action: 'Очистите %TEMP%/D3DSCache и при нехватке места отключите гибернацию (hiberfil.sys).',
        fpsImpact: 'Устранение фризов',
        moduleIds: ['cleanTemp', 'disableHibernation', 'memoryStorageBoost'],
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
      priority: 'high',
      title: 'Не проверены реальные настройки оптимизации Windows',
      reason:
        'Браузер по правилам безопасности не имеет доступа к реестру, схеме питания, GameDVR, HAGS, XMP и службам Windows. Без PowerShell-проверки невозможно назвать честный % оптимизации.',
      action:
        'Откройте панель «Глубокая диагностика Windows (PowerShell)» ниже, скопируйте/скачайте скрипт и вставьте результат OPTICORE:{...}.',
      fpsImpact: 'Точный диагноз ОС',
      moduleIds: [
        'restorePoint',
        'ultimatePower',
        'cleanTemp',
        'gameTweaks',
        'gpuPriority',
        'win32PrioritySep',
        'mouseRawInput',
        'usbPowerSavingOff',
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
      action:
        'Перейдите на кабель Ethernet, сбросьте DNS-кэш, отключите алгоритм Нагла и P2P-обновления.',
      fpsImpact: 'Ниже пинг',
      moduleIds: ['dnsFlush', 'disableP2PUpdate', 'nagleDisable'],
    });
  }

  const hardwareScore = Math.max(15, Math.min(98, Math.round(score)));
  const windowsVerified = Boolean(wr && winPossible > 0);
  const optimizationScore = windowsVerified
    ? Math.max(0, Math.min(100, Math.round((winEarned / winPossible) * 100)))
    : null;

  // Honest primary score: when Windows is verified, show REAL OS optimization %;
  // when not verified, show hardware readiness without falsely claiming Windows is 92% optimized!
  const effectiveScore = optimizationScore !== null ? optimizationScore : hardwareScore;

  let verdictBadge = 'Требует настройки';
  let verdictTitle = 'Есть большой резерв оптимизации Windows';
  let verdictDescription =
    'Проверенные параметры системы показывают, что многие игровые настройки стоят в стоке. Выполните рекомендации ниже и примените скрипт.';
  let estimatedFpsGain = '+15–35% FPS';

  if (!windowsVerified) {
    verdictBadge = input.isWindows ? 'Оптимизация ОС не проверена' : 'Оценка по браузеру';
    verdictTitle =
      hardwareScore >= 78
        ? 'Железо готово, но настройки Windows ещё не проверены'
        : 'Обнаружены аппаратные или кадровые ограничения';
    verdictDescription = input.isWindows
      ? `Браузер оценил базу (GPU, CPU, ${input.measuredHz} Гц, фреймтайм) на ${hardwareScore}/100, но не видит реестр и службы Windows. Запустите read-only скрипт PowerShell ниже, чтобы узнать честный % оптимизации ПК.`
      : 'Оценка выполнена по параметрам, доступным из браузера (GPU, потоки CPU, герцовка и фреймтайм).';
    estimatedFpsGain = hardwareScore >= 78 ? 'Зависит от ОС' : '+15–35% FPS';
  } else if (optimizationScore !== null && optimizationScore >= 82) {
    verdictBadge = 'Отлично оптимизирован';
    verdictTitle = 'Система реально настроена на высокий FPS и низкую задержку';
    verdictDescription =
      'Большинство системных параметров, питание CPU, планировщик GPU и сетевые твики проверены и активны.';
    estimatedFpsGain = '+2–8% 1% Low';
  } else if (optimizationScore !== null && optimizationScore >= 55) {
    verdictBadge = 'Частично оптимизирован';
    verdictTitle = 'База настроена, но часть твиков Windows ещё в стоке';
    verdictDescription =
      'Докрутите оставшиеся пункты ниже — это уберёт фоновые просадки 1% Low и снизит Input Lag.';
    estimatedFpsGain = '+10–20% FPS';
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
    score: effectiveScore,
    hardwareScore,
    optimizationScore,
    windowsVerified,
    checksCount,
    verdictBadge,
    verdictTitle,
    verdictDescription,
    estimatedFpsGain,
    gpuInfo,
    verifiedChecks,
    recommendations,
    recommendedModuleIds: Array.from(moduleSet),
  };
}
