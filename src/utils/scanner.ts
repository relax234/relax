export type GpuVendor = 'nvidia' | 'amd' | 'intel' | 'apple' | 'software' | 'unknown';

export interface WindowsDiagReport {
  cpuName?: string;
  cpuCoresPhysical?: number;
  cpuThreads?: number;
  cpuMaxClockMhz?: number;
  cpuLoadPercent?: number;
  gpuName?: string;
  gpuVramGb?: number;
  gpuDriverVersion?: string;
  gpuDriverAgeDays?: number;
  windowsDisplayHz?: number;
  windowsMaxHz?: number;
  ramTotalGb?: number;
  ramFreeGb?: number;
  ramSpeedMhz?: number;
  ramStickCount?: number;
  osCaption?: string;
  uptimeDays?: number;
  pendingReboot?: boolean;
  fastStartupOn?: boolean;
  systemDriveType?: string;
  ssdFreePercent?: number;
  ssdFreeGb?: number;
  tempSizeMb?: number;
  shaderCacheMb?: number;
  startupCount?: number;
  topRamApp?: string;
  topRamMb?: number;
  powerPlan?: 'ultimate' | 'high' | 'balanced' | 'powersaver' | string;
  powerThrottlingOff?: boolean;
  cpuCoreParkingOff?: boolean;
  pciAspmOff?: boolean;
  diskSleepOff?: boolean;
  gameDvrEnabled?: boolean;
  gameModeEnabled?: boolean;
  hagsEnabled?: boolean;
  windowedOptEnabled?: boolean;
  mouseAccelEnabled?: boolean;
  usbPowerSavingOff?: boolean;
  transparencyDisabled?: boolean;
  uwpBackgroundDisabled?: boolean;
  networkTweaksApplied?: boolean;
  gpuPriorityHigh?: boolean;
  win32PrioritySep38?: boolean;
  diagTrackRunning?: boolean;
  deliveryOptP2P?: boolean;
  nagleDisabled?: boolean;
  nicPowerSavingOff?: boolean;
  ntfsLastAccessOff?: boolean;
  fastDnsConfigured?: boolean;
  secureBootEnabled?: boolean;
  tpmReady?: boolean;
  vbsEnabled?: boolean;
  // Risky/conflict checks that cause flickers, crashes, or anti-cheat bans
  mpoDisabled?: boolean;
  bcdTimerActive?: boolean;
  fseOverrideActive?: boolean;
  autoEndTasksActive?: boolean;
  // BIOS / UEFI / Firmware & Bus Audit
  moboName?: string;
  biosVersion?: string;
  biosDate?: string;
  biosAgeDays?: number;
  bootMode?: 'UEFI' | 'Legacy' | string;
  rebarEnabled?: boolean | null;
  virtualizationEnabled?: boolean;
  ramRatedMhz?: number;
  systemDriveBus?: string;
  ssdHealth?: string;
  pageFileMb?: number;
  // Network stack (RSC / QoS / LLMNR)
  tcpRscEnabled?: boolean;
  qosReservedPercent?: number;
  llmnrEnabled?: boolean;
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
  gpuStressFps?: number | null;
  gpuStressJitterMs?: number | null;
  gpuStressDrops?: number | null;
  gpuStressWorkloadLabel?: string | null;
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

export const WINDOWS_DIAG_SCRIPT = String.raw`# OptiCore Deep Read-Only PC, BIOS & Network Audit (ничего не меняет в системе)
Write-Host "Сбор расширенной диагностики Windows, BIOS/UEFI и сети (40+ параметров)..." -ForegroundColor Cyan

$cpuObj = Get-CimInstance Win32_Processor | Select-Object -First 1
$cpu = if ($cpuObj.Name) { $cpuObj.Name.Trim() } else { "Unknown CPU" }
$cpuCoresPhys = [int]$cpuObj.NumberOfCores
$cpuThreads = [int]$cpuObj.NumberOfLogicalProcessors
$cpuMaxClock = [int]$cpuObj.MaxClockSpeed
$cpuLoad = [int]$cpuObj.LoadPercentage
$virtEnabled = [bool]$cpuObj.VirtualizationFirmwareEnabled

$boardObj = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue | Select-Object -First 1
$moboName = if ($boardObj) { ("$($boardObj.Manufacturer) $($boardObj.Product)").Trim() } else { $null }
$biosObj = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue | Select-Object -First 1
$biosVersion = if ($biosObj -and $biosObj.SMBIOSBIOSVersion) { $biosObj.SMBIOSBIOSVersion.Trim() } else { $null }
$biosDate = $null
$biosAgeDays = $null
if ($biosObj -and $biosObj.ReleaseDate) {
  $bd = [datetime]$biosObj.ReleaseDate
  $biosDate = $bd.ToString("yyyy-MM-dd")
  $biosAgeDays = [math]::Max(0, [int]((Get-Date) - $bd).TotalDays)
}

$bootMode = "Unknown"
try {
  if ($env:firmware_type -eq "UEFI") { $bootMode = "UEFI" }
  elseif ($env:firmware_type -eq "Legacy") { $bootMode = "Legacy" }
  else {
    $peFw = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control" -Name "PEFirmwareType" -ErrorAction SilentlyContinue).PEFirmwareType
    if ($peFw -eq 2) { $bootMode = "UEFI" } elseif ($peFw -eq 1) { $bootMode = "Legacy" }
  }
} catch {}

$gpuObj = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notmatch 'Microsoft Basic|Remote|Parsec|Virtual' } | Select-Object -First 1
if (-not $gpuObj) { $gpuObj = Get-CimInstance Win32_VideoController | Select-Object -First 1 }
$gpu = if ($gpuObj.Name) { $gpuObj.Name.Trim() } else { "Unknown GPU" }
$gpuDriverVer = $gpuObj.DriverVersion
$gpuDriverAgeDays = $null
if ($gpuObj.DriverDate) {
  $gpuDriverAgeDays = [math]::Max(0, [int]((Get-Date) - [datetime]$gpuObj.DriverDate).TotalDays)
}
$winHz = if ($gpuObj.CurrentRefreshRate) { [int]$gpuObj.CurrentRefreshRate } else { $null }
$winMaxHz = if ($gpuObj.MaxRefreshRate) { [int]$gpuObj.MaxRefreshRate } else { $null }

$rebarEnabled = $null
try {
  $gpuPnp = Get-CimInstance Win32_PnPEntity -Filter "PNPClass='Display'" -ErrorAction SilentlyContinue | Where-Object { $_.PNPDeviceID -match 'VEN_10DE|VEN_1002|VEN_8086' } | Select-Object -First 1
  if ($gpuPnp) {
    $assoc = Get-CimAssociatedInstance -InputObject $gpuPnp -ResultClassName Win32_DeviceMemoryAddress -ErrorAction SilentlyContinue
    if ($assoc) {
      $maxBarBytes = ($assoc | ForEach-Object { [uint64]$_.EndingAddress - [uint64]$_.StartingAddress + 1 } | Measure-Object -Maximum).Maximum
      if ($maxBarBytes -gt 0) {
        $rebarEnabled = ($maxBarBytes -ge 512MB)
      }
    }
  }
} catch { $rebarEnabled = $null }

$vramBytes = $null
Get-ChildItem "HKLM:\SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0*" -ErrorAction SilentlyContinue | ForEach-Object {
  $p = Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue
  if ($p."HardwareInformation.qwMemorySize" -and (-not $vramBytes -or $p."HardwareInformation.qwMemorySize" -gt $vramBytes)) {
    $vramBytes = [uint64]$p."HardwareInformation.qwMemorySize"
  }
}
if (-not $vramBytes -and $gpuObj.AdapterRAM) { $vramBytes = [uint64]$gpuObj.AdapterRAM }
$gpuVramGb = if ($vramBytes) { [math]::Round($vramBytes / 1GB, 1) } else { $null }

$osObj = Get-CimInstance Win32_OperatingSystem
$csObj = Get-CimInstance Win32_ComputerSystem
$ramGb = [math]::Round($csObj.TotalPhysicalMemory / 1GB)
$ramFreeGb = [math]::Round(($osObj.FreePhysicalMemory * 1KB) / 1GB, 1)
$ramSticks = @(Get-CimInstance Win32_PhysicalMemory)
$ramSpeed = ($ramSticks | ForEach-Object { if ($_.ConfiguredClockSpeed -gt 0) { $_.ConfiguredClockSpeed } else { $_.Speed } } | Measure-Object -Maximum).Maximum
$ramRated = ($ramSticks | ForEach-Object { if ($_.Speed -gt 0) { $_.Speed } else { 0 } } | Measure-Object -Maximum).Maximum
$ramStickCount = $ramSticks.Count
$uptimeDays = [math]::Round(((Get-Date) - $osObj.LastBootUpTime).TotalDays, 1)
$osCaption = "$($osObj.Caption) (Build $($osObj.BuildNumber))"

$pageFileMb = $null
try {
  $pf = Get-CimInstance Win32_PageFileUsage -ErrorAction SilentlyContinue
  if ($pf) {
    $pageFileMb = [int](($pf | Measure-Object -Property AllocatedBaseSize -Sum).Sum)
  } elseif ($csObj.AutomaticManagedPagefile) {
    $pageFileMb = -1
  } else {
    $pageFileMb = 0
  }
} catch {}

$pendingReboot = (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending") -or
                 (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\WindowsUpdate\Auto Update\RebootRequired")
$fastBootVal = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" -Name "HiberbootEnabled" -ErrorAction SilentlyContinue).HiberbootEnabled

$planRaw = (powercfg /getactivescheme) -join " "
$powerPlan = if ($planRaw -match 'e9a42b02|Ultimate|Максимальн') { 'ultimate' } elseif ($planRaw -match '8c5e7fda|High|Высок') { 'high' } elseif ($planRaw -match 'a1841308|Power saver|Эконом') { 'powersaver' } else { 'balanced' }

$cpRaw = (powercfg /q SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 2>$null) -join " "
$coreParkMatches = [regex]::Matches($cpRaw, '0x([0-9a-fA-F]+)')
$coreParkingOff = $false
if ($coreParkMatches.Count -gt 0) {
  $lastHex = $coreParkMatches[$coreParkMatches.Count - 1].Groups[1].Value
  $coreParkingOff = ([Convert]::ToInt32($lastHex, 16) -ge 100)
}

$aspmRaw = (powercfg /q SCHEME_CURRENT SUB_PCIEXPRESS ASPM 2>$null) -join " "
$aspmMatches = [regex]::Matches($aspmRaw, '0x([0-9a-fA-F]+)')
$pciAspmOff = $false
if ($aspmMatches.Count -gt 0) {
  $lastAspm = $aspmMatches[$aspmMatches.Count - 1].Groups[1].Value
  $pciAspmOff = ([Convert]::ToInt32($lastAspm, 16) -eq 0)
}

$diskIdleRaw = (powercfg /q SCHEME_CURRENT SUB_DISK DISKIDLE 2>$null) -join " "
$diskMatches = [regex]::Matches($diskIdleRaw, '0x([0-9a-fA-F]+)')
$diskSleepOff = $false
if ($diskMatches.Count -gt 0) {
  $lastDisk = $diskMatches[$diskMatches.Count - 1].Groups[1].Value
  $diskSleepOff = ([Convert]::ToInt32($lastDisk, 16) -eq 0)
}

$sysPart = Get-Partition -DriveLetter C -ErrorAction SilentlyContinue
$physDisk = if ($sysPart) { Get-PhysicalDisk -ErrorAction SilentlyContinue | Where-Object { $_.DeviceId -eq $sysPart.DiskNumber } | Select-Object -First 1 } else { $null }
$driveType = if ($physDisk -and $physDisk.MediaType) { "$($physDisk.MediaType)" } else { "Unknown" }
$driveBus = if ($physDisk -and $physDisk.BusType) { "$($physDisk.BusType)" } else { $null }
$ssdHealth = if ($physDisk -and $physDisk.HealthStatus) { "$($physDisk.HealthStatus)" } else { $null }

$sysDrive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$ssdFree = if ($sysDrive.Size -gt 0) { [math]::Round(($sysDrive.FreeSpace / $sysDrive.Size) * 100) } else { $null }
$ssdFreeGb = if ($sysDrive.FreeSpace) { [math]::Round($sysDrive.FreeSpace / 1GB, 1) } else { $null }

$tempBytes = ((Get-ChildItem "$env:TEMP","C:\Windows\Temp" -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum)
$tempMb = if ($tempBytes) { [math]::Round($tempBytes / 1MB) } else { 0 }

$shaderBytes = ((Get-ChildItem "$env:LOCALAPPDATA\D3DSCache","$env:LOCALAPPDATA\NVIDIA\DXCache","$env:LOCALAPPDATA\AMD\DxCache" -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum)
$shaderMb = if ($shaderBytes) { [math]::Round($shaderBytes / 1MB) } else { 0 }

$startup = (Get-CimInstance Win32_StartupCommand).Count
$topProc = Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 1
$topRamApp = if ($topProc) { $topProc.ProcessName } else { "" }
$topRamMb = if ($topProc) { [math]::Round($topProc.WorkingSet64 / 1MB) } else { 0 }

$dvr = (Get-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -ErrorAction SilentlyContinue).GameDVR_Enabled
$fseMode = (Get-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_FSEBehaviorMode" -ErrorAction SilentlyContinue).GameDVR_FSEBehaviorMode
$gm = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\GameBar" -Name "AutoGameModeEnabled" -ErrorAction SilentlyContinue).AutoGameModeEnabled
$hags = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -Name "HwSchMode" -ErrorAction SilentlyContinue).HwSchMode
$dxPrefs = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences" -Name "DirectXUserGlobalSettings" -ErrorAction SilentlyContinue).DirectXUserGlobalSettings
$windowedOpt = ($dxPrefs -match 'SwapEffectUpgradeEnable=1')
$mouseSpeed = (Get-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseSpeed" -ErrorAction SilentlyContinue).MouseSpeed
$autoEndTasks = (Get-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "AutoEndTasks" -ErrorAction SilentlyContinue).AutoEndTasks

$dg = Get-CimInstance -Namespace root\Microsoft\Windows\DeviceGuard -ClassName Win32_DeviceGuard -ErrorAction SilentlyContinue
$vbsEnabled = ($null -ne $dg -and $dg.SecurityServicesRunning -contains 2)

$secBoot = $null
try { $secBoot = [bool](Confirm-SecureBootUEFI -ErrorAction Stop) } catch { $secBoot = $null }
$tpmReady = $null
try { $tpmObj = Get-Tpm -ErrorAction Stop; $tpmReady = [bool]($tpmObj.TpmPresent -and $tpmObj.TpmReady) } catch { $tpmReady = $null }

$mmPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
$netThrot = (Get-ItemProperty -Path $mmPath -Name "NetworkThrottlingIndex" -ErrorAction SilentlyContinue).NetworkThrottlingIndex
$sysResp = (Get-ItemProperty -Path $mmPath -Name "SystemResponsiveness" -ErrorAction SilentlyContinue).SystemResponsiveness
$gpuPrioVal = (Get-ItemProperty -Path "$mmPath\Tasks\Games" -Name "GPU Priority" -ErrorAction SilentlyContinue)."GPU Priority"
$diagSvc = (Get-Service -Name "DiagTrack" -ErrorAction SilentlyContinue)
$doMode = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" -Name "DODownloadMode" -ErrorAction SilentlyContinue).DODownloadMode
$win32Prio = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" -Name "Win32PrioritySeparation" -ErrorAction SilentlyContinue).Win32PrioritySeparation
$mpoVal = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\Dwm" -Name "OverlayTestMode" -ErrorAction SilentlyContinue).OverlayTestMode
$usbVal = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USB" -Name "DisableSelectiveSuspend" -ErrorAction SilentlyContinue).DisableSelectiveSuspend
$ptVal = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" -Name "PowerThrottlingOff" -ErrorAction SilentlyContinue).PowerThrottlingOff
$transVal = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "EnableTransparency" -ErrorAction SilentlyContinue).EnableTransparency
$uwpVal = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -ErrorAction SilentlyContinue).GlobalUserDisabled

$bcdRaw = (bcdedit /enum "{current}" 2>$null) -join " "
$bcdTimerActive = ($bcdRaw -match 'useplatformtick\s+Yes' -or $bcdRaw -match 'disabledynamictick\s+Yes')

$ntfsRaw = (fsutil behavior query disablelastaccess 2>$null) -join " "
$ntfsOff = ($ntfsRaw -match '=\s*[13]')

$dnsServers = @(Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ServerAddresses)
$fastDns = ($dnsServers -contains '1.1.1.1' -or $dnsServers -contains '8.8.8.8' -or $dnsServers -contains '9.9.9.9')

$nagleOn = $false
Get-ChildItem "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" -ErrorAction SilentlyContinue | ForEach-Object {
  $p = Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue
  if ($p.TCPNoDelay -eq 1 -and $p.TcpAckFrequency -eq 1) { $nagleOn = $true }
}

$nicPmOff = $false
try {
  $upAdapters = @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' })
  if ($upAdapters.Count -gt 0) {
    $pm = Get-NetAdapterPowerManagement -Name $upAdapters[0].Name -ErrorAction SilentlyContinue
    if ($pm -and $pm.AllowComputerToTurnOffDevice -eq 'Disabled') { $nicPmOff = $true }
  }
} catch {}

$tcpRscOn = $null
try {
  $tcpGlob = (netsh int tcp show global 2>$null) -join " "
  if ($tcpGlob -match 'Receive Segment Coalescing[^:\r\n]*:\s*(enabled|включено)') { $tcpRscOn = $true }
  elseif ($tcpGlob -match 'Receive Segment Coalescing[^:\r\n]*:\s*(disabled|отключено)') { $tcpRscOn = $false }
} catch {}

$qosVal = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Psched" -Name "NonBestEffortLimit" -ErrorAction SilentlyContinue).NonBestEffortLimit
$qosReservedPct = if ($null -ne $qosVal) { [int]$qosVal } else { 20 }

$llmnrVal = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient" -Name "EnableMulticast" -ErrorAction SilentlyContinue).EnableMulticast
$llmnrEnabled = ($llmnrVal -ne 0)

$reportObj = [ordered]@{
  cpuName = $cpu
  cpuCoresPhysical = $cpuCoresPhys
  cpuThreads = $cpuThreads
  cpuMaxClockMhz = $cpuMaxClock
  cpuLoadPercent = $cpuLoad
  gpuName = $gpu
  gpuVramGb = $gpuVramGb
  gpuDriverVersion = $gpuDriverVer
  gpuDriverAgeDays = $gpuDriverAgeDays
  windowsDisplayHz = $winHz
  windowsMaxHz = $winMaxHz
  ramTotalGb = $ramGb
  ramFreeGb = $ramFreeGb
  ramSpeedMhz = [int]$ramSpeed
  ramRatedMhz = [int]$ramRated
  ramStickCount = [int]$ramStickCount
  osCaption = $osCaption
  uptimeDays = $uptimeDays
  pendingReboot = [bool]$pendingReboot
  fastStartupOn = ($fastBootVal -eq 1)
  systemDriveType = $driveType
  systemDriveBus = $driveBus
  ssdHealth = $ssdHealth
  pageFileMb = $pageFileMb
  ssdFreePercent = $ssdFree
  ssdFreeGb = $ssdFreeGb
  tempSizeMb = [int]$tempMb
  shaderCacheMb = [int]$shaderMb
  startupCount = [int]$startup
  topRamApp = $topRamApp
  topRamMb = [int]$topRamMb
  powerPlan = $powerPlan
  powerThrottlingOff = ($ptVal -eq 1)
  cpuCoreParkingOff = $coreParkingOff
  pciAspmOff = $pciAspmOff
  diskSleepOff = $diskSleepOff
  gameDvrEnabled = ($dvr -ne 0)
  gameModeEnabled = ($gm -ne 0)
  hagsEnabled = ($hags -eq 2)
  windowedOptEnabled = $windowedOpt
  mouseAccelEnabled = ($mouseSpeed -ne "0")
  usbPowerSavingOff = ($usbVal -eq 1)
  transparencyDisabled = ($transVal -eq 0)
  uwpBackgroundDisabled = ($uwpVal -eq 1)
  networkTweaksApplied = ($netThrot -eq 4294967295 -and $sysResp -le 10)
  gpuPriorityHigh = ($gpuPrioVal -ge 6)
  win32PrioritySep38 = ($win32Prio -eq 38)
  diagTrackRunning = ($null -ne $diagSvc -and $diagSvc.Status -eq 'Running')
  deliveryOptP2P = ($doMode -ne 0)
  nagleDisabled = $nagleOn
  nicPowerSavingOff = $nicPmOff
  ntfsLastAccessOff = $ntfsOff
  fastDnsConfigured = $fastDns
  tcpRscEnabled = $tcpRscOn
  qosReservedPercent = $qosReservedPct
  llmnrEnabled = $llmnrEnabled
  secureBootEnabled = $secBoot
  tpmReady = $tpmReady
  vbsEnabled = [bool]$vbsEnabled
  moboName = $moboName
  biosVersion = $biosVersion
  biosDate = $biosDate
  biosAgeDays = $biosAgeDays
  bootMode = $bootMode
  rebarEnabled = $rebarEnabled
  virtualizationEnabled = $virtEnabled
  mpoDisabled = ($mpoVal -eq 5)
  bcdTimerActive = $bcdTimerActive
  fseOverrideActive = ($fseMode -eq 2)
  autoEndTasksActive = ($autoEndTasks -eq "1")
}
$report = $reportObj | ConvertTo-Json -Compress

Write-Host ""
Write-Host "Плата/BIOS: $moboName | BIOS $biosVersion ($biosDate) | $bootMode | ReBAR: $rebarEnabled" -ForegroundColor Gray
Write-Host "CPU: $cpu ($cpuCoresPhys ядер / $cpuThreads пот., нагрузка $cpuLoad%)" -ForegroundColor Gray
Write-Host "GPU: $gpu ($gpuVramGb ГБ VRAM, драйвер $gpuDriverVer) · Экран: $winHz Гц (макс. $winMaxHz Гц)" -ForegroundColor Gray
Write-Host "ОЗУ: $ramGb ГБ ($ramStickCount пл., $ramSpeed / SPD $ramRated МГц) · Диск C: $driveType $driveBus ($ssdFreeGb ГБ своб.)" -ForegroundColor Gray
Write-Host ""
Write-Output "OPTICORE:$report"
Set-Clipboard -Value "OPTICORE:$report" -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Расширенный отчёт скопирован в буфер обмена! Вставь его на сайте OptiCore." -ForegroundColor Green
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

function readOptStr(val: unknown): string | undefined {
  return typeof val === 'string' && val.trim().length > 0 ? val.trim() : undefined;
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
      cpuName: readOptStr(parsed.cpuName),
      cpuCoresPhysical: readOptNum(parsed.cpuCoresPhysical),
      cpuThreads: readOptNum(parsed.cpuThreads),
      cpuMaxClockMhz: readOptNum(parsed.cpuMaxClockMhz),
      cpuLoadPercent: readOptNum(parsed.cpuLoadPercent),
      gpuName: readOptStr(parsed.gpuName),
      gpuVramGb: readOptNum(parsed.gpuVramGb),
      gpuDriverVersion: readOptStr(parsed.gpuDriverVersion),
      gpuDriverAgeDays: readOptNum(parsed.gpuDriverAgeDays),
      windowsDisplayHz: readOptNum(parsed.windowsDisplayHz),
      windowsMaxHz: readOptNum(parsed.windowsMaxHz),
      ramTotalGb: readOptNum(parsed.ramTotalGb),
      ramFreeGb: readOptNum(parsed.ramFreeGb),
      ramSpeedMhz: readOptNum(parsed.ramSpeedMhz),
      ramStickCount: readOptNum(parsed.ramStickCount),
      osCaption: readOptStr(parsed.osCaption),
      uptimeDays: readOptNum(parsed.uptimeDays),
      pendingReboot: readOptBool(parsed.pendingReboot),
      fastStartupOn: readOptBool(parsed.fastStartupOn),
      systemDriveType: readOptStr(parsed.systemDriveType),
      ssdFreePercent: readOptNum(parsed.ssdFreePercent),
      ssdFreeGb: readOptNum(parsed.ssdFreeGb),
      tempSizeMb: readOptNum(parsed.tempSizeMb),
      shaderCacheMb: readOptNum(parsed.shaderCacheMb),
      startupCount: readOptNum(parsed.startupCount),
      topRamApp: readOptStr(parsed.topRamApp),
      topRamMb: readOptNum(parsed.topRamMb),
      powerPlan: readOptStr(parsed.powerPlan),
      powerThrottlingOff: readOptBool(parsed.powerThrottlingOff),
      cpuCoreParkingOff: readOptBool(parsed.cpuCoreParkingOff),
      pciAspmOff: readOptBool(parsed.pciAspmOff),
      diskSleepOff: readOptBool(parsed.diskSleepOff),
      gameDvrEnabled: readOptBool(parsed.gameDvrEnabled),
      gameModeEnabled: readOptBool(parsed.gameModeEnabled),
      hagsEnabled: readOptBool(parsed.hagsEnabled),
      windowedOptEnabled: readOptBool(parsed.windowedOptEnabled),
      mouseAccelEnabled: readOptBool(parsed.mouseAccelEnabled),
      usbPowerSavingOff: readOptBool(parsed.usbPowerSavingOff),
      transparencyDisabled: readOptBool(parsed.transparencyDisabled),
      uwpBackgroundDisabled: readOptBool(parsed.uwpBackgroundDisabled),
      networkTweaksApplied: readOptBool(parsed.networkTweaksApplied),
      gpuPriorityHigh: readOptBool(parsed.gpuPriorityHigh),
      win32PrioritySep38: readOptBool(parsed.win32PrioritySep38),
      diagTrackRunning: readOptBool(parsed.diagTrackRunning),
      deliveryOptP2P: readOptBool(parsed.deliveryOptP2P),
      nagleDisabled: readOptBool(parsed.nagleDisabled),
      nicPowerSavingOff: readOptBool(parsed.nicPowerSavingOff),
      ntfsLastAccessOff: readOptBool(parsed.ntfsLastAccessOff),
      fastDnsConfigured: readOptBool(parsed.fastDnsConfigured),
      secureBootEnabled: readOptBool(parsed.secureBootEnabled),
      tpmReady: readOptBool(parsed.tpmReady),
      vbsEnabled: readOptBool(parsed.vbsEnabled),
      mpoDisabled: readOptBool(parsed.mpoDisabled),
      bcdTimerActive: readOptBool(parsed.bcdTimerActive),
      fseOverrideActive: readOptBool(parsed.fseOverrideActive),
      autoEndTasksActive: readOptBool(parsed.autoEndTasksActive),
      moboName: readOptStr(parsed.moboName),
      biosVersion: readOptStr(parsed.biosVersion),
      biosDate: readOptStr(parsed.biosDate),
      biosAgeDays: readOptNum(parsed.biosAgeDays),
      bootMode: readOptStr(parsed.bootMode),
      rebarEnabled: parsed.rebarEnabled === null ? null : readOptBool(parsed.rebarEnabled),
      virtualizationEnabled: readOptBool(parsed.virtualizationEnabled),
      ramRatedMhz: readOptNum(parsed.ramRatedMhz),
      systemDriveBus: readOptStr(parsed.systemDriveBus),
      ssdHealth: readOptStr(parsed.ssdHealth),
      pageFileMb: readOptNum(parsed.pageFileMb),
      tcpRscEnabled: readOptBool(parsed.tcpRscEnabled),
      qosReservedPercent: readOptNum(parsed.qosReservedPercent),
      llmnrEnabled: readOptBool(parsed.llmnrEnabled),
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
  const ramXmpOk = Boolean(
    report.ramSpeedMhz &&
      report.ramSpeedMhz > 2400 &&
      report.ramSpeedMhz !== 4800 &&
      (!report.ramRatedMhz || report.ramSpeedMhz >= report.ramRatedMhz - 50),
  );
  if (ramXmpOk) {
    checked.push('xmp');
  }
  if (report.ssdFreePercent !== undefined && report.ssdFreePercent >= 15) checked.push('ssd');
  if (report.tempSizeMb !== undefined && report.tempSizeMb < 500) checked.push('temp');
  if (report.gpuDriverAgeDays !== undefined && report.gpuDriverAgeDays < 120) checked.push('gpu_driver');
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
          ? 'В панели NVIDIA выберите «Макс. производительность» и Low Latency Mode (Вкл).'
          : gpuInfo.vendor === 'amd'
            ? 'В AMD Adrenalin включите Radeon Anti-Lag и Smart Access Memory (ReBAR).'
            : 'Проверьте актуальность драйвера GPU.',
      fpsImpact: '+5–12% 1% Low',
      moduleIds: ['gameTweaks', 'gpuPriority'],
    });
  }

  // 2. CPU cores
  const effectiveThreads = input.windowsReport?.cpuThreads ?? input.cpuCores;
  if (effectiveThreads <= 4) {
    score -= 14;
    recommendations.push({
      id: 'cpu-low',
      priority: 'high',
      title: `Мало потоков процессора (${effectiveThreads})`,
      reason:
        'На 2–4 потоках фоновые задачи Windows, телеметрия и оверлеи напрямую отбирают процессорное время у игр.',
      action:
        'Отключите лишнюю автозагрузку, службу телеметрии DiagTrack, фоновые UWP и включите профиль максимальной производительности.',
      fpsImpact: '+10–18% FPS',
      moduleIds: ['restorePoint', 'ultimatePower', 'telemetryLite', 'disableOverlays', 'gameTweaks'],
    });
  } else if (effectiveThreads <= 6) {
    score -= 4;
    recommendations.push({
      id: 'cpu-mid',
      priority: 'medium',
      title: `Средний запас потоков CPU (${effectiveThreads})`,
      reason:
        'Процессор справится с большинством игр, но при десятках фоновых служб возможны микростаттеры.',
      action:
        'Включите профиль высокой/максимальной производительности и задайте приоритет MMCSS для игр.',
      fpsImpact: '+6–10% стабильности',
      moduleIds: ['ultimatePower', 'gpuPriority', 'gameTweaks'],
    });
  } else {
    recommendations.push({
      id: 'cpu-ok',
      priority: 'ok',
      title: `Отличный запас потоков процессора (${effectiveThreads})`,
      reason: 'Многопоточности достаточно для современных игр и фоновых приложений.',
      action: 'Зафиксируйте схему производительности, отключите парковку ядер и настройте MMCSS.',
      fpsImpact: 'Стабильный фреймтайм',
      moduleIds: ['ultimatePower', 'cpuCoreParkingOff', 'gpuPriority'],
    });
  }

  // 3. RAM evaluation
  const exactRamGb = input.windowsReport?.ramTotalGb ?? input.deviceMemoryGb;
  if (exactRamGb !== null && exactRamGb <= 4) {
    score -= 18;
    recommendations.push({
      id: 'ram-critical',
      priority: 'high',
      title: `Критически мало ОЗУ (~${exactRamGb} ГБ)`,
      reason:
        'При 4 ГБ памяти Windows постоянно сбрасывает данные на диск (файл подкачки), что вызывает жёсткие фризы.',
      action:
        'Отключите фоновые UWP-приложения, телеметрию и прозрачность интерфейса; желателен апгрейд до 16 ГБ.',
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
      action: 'Очистите автозагрузку, временные файлы и закройте браузер перед игрой.',
      fpsImpact: '+8–15% 1% Low',
      moduleIds: ['cleanTemp', 'telemetryLite', 'disableOverlays'],
    });
  }

  // 4. Refresh rate, frame jitter, event loop lag, battery
  if (input.measuredHz <= 62 && (!input.windowsReport?.windowsMaxHz || input.windowsReport.windowsMaxHz <= 62)) {
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
        'Отключите GameDVR, фоновые UWP, парковку ядер CPU и проверьте режим питания от сети.',
      fpsImpact: '+12–20% 1% Low',
      moduleIds: [
        'restorePoint',
        'ultimatePower',
        'cpuCoreParkingOff',
        'gameTweaks',
        'disableOverlays',
      ],
    });
  }

  if (
    input.gpuStressJitterMs !== undefined &&
    input.gpuStressJitterMs !== null
  ) {
    checksCount += 1;
    const gpuJitterBad =
      input.gpuStressJitterMs > 4.0 || (input.gpuStressDrops ?? 0) >= 3;
    if (gpuJitterBad) {
      score -= 8;
      recommendations.push({
        id: 'gpu-stress-freeze',
        priority: 'high',
        title: `Под нагрузкой GPU видны просадки (${input.gpuStressFps ?? '?'} FPS, джиттер ${input.gpuStressJitterMs} мс)`,
        reason: `Нагрузочный прогон WebGL зафиксировал ${input.gpuStressDrops ?? 0} дропов кадра — при реальной игровой сцене возможны фризы.`,
        action:
          'Включите HAGS, схему питания «Макс. производительность», отключите GameDVR, парковку ядер CPU и очистите старый кэш шейдеров.',
        fpsImpact: '-Фризы под GPU',
        moduleIds: [
          'hagsAndGameMode',
          'ultimatePower',
          'cpuCoreParkingOff',
          'gameTweaks',
          'cleanShaderCache',
        ],
      });
    }
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
          'Планировщик задач отвечает с задержкой — возможна высокая фоновая нагрузка на CPU.',
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

  // 5. Deep Windows diagnostic checks (30+ checks for hardware health, OS optimization, anti-cheat readiness & harmful-tweak conflicts)
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
    checksCount += verifiedChecks.length; // updated cleanly below as well

    // --- A. Risky / Artifact / Anti-Cheat Conflict Checks ---
    if (wr.bcdTimerActive !== undefined) {
      recordCheck(
        'conflict_bcd',
        'BCD-таймеры ядра',
        7,
        !wr.bcdTimerActive,
        wr.bcdTimerActive ? 'Изменены (риск!)' : 'Безопасный сток',
      );
      if (wr.bcdTimerActive) {
        recommendations.push({
          id: 'win-conflict-bcd',
          priority: 'high',
          title: 'Обнаружены изменённые BCD-таймеры (useplatformtick / disabledynamictick)',
          reason:
            'Эти флаги вызывают ошибки античитов (Vanguard, FACEIT AC, BattlEye), рассинхрон таймеров и микростаттеры на современных CPU.',
          action:
            'Сбросьте таймеры в штатный режим через безопасный модуль «Сбросить проблемные флаги MPO / FSE / BCD».',
          fpsImpact: 'Без вылетов и банов',
          moduleIds: ['repairDisplayArtifacts'],
        });
      }
    }

    if (wr.mpoDisabled !== undefined) {
      recordCheck(
        'conflict_mpo',
        'Режим DWM / MPO',
        6,
        !wr.mpoDisabled,
        wr.mpoDisabled ? 'Отключён (OverlayTestMode=5)' : 'Штатный (без мерцаний)',
      );
      if (wr.mpoDisabled) {
        recommendations.push({
          id: 'win-conflict-mpo',
          priority: 'high',
          title: 'Обнаружен отключённый MPO (OverlayTestMode=5)',
          reason:
            'Принудительное отключение MPO в новых драйверах NVIDIA/AMD вызывает мерцание экрана, чёрные кадры и артефакты G-Sync/FreeSync.',
          action:
            'Удалите OverlayTestMode через модуль очистки артефактов и включите штатную оптимизацию оконного режима Windows 11.',
          fpsImpact: 'Убирает мерцания',
          moduleIds: ['repairDisplayArtifacts', 'windowedOptWin11'],
        });
      }
    }

    if (wr.fseOverrideActive !== undefined) {
      recordCheck(
        'conflict_fse',
        'Глобальный FSE-оверрайд',
        5,
        !wr.fseOverrideActive,
        wr.fseOverrideActive ? 'Форсирован (риск Alt-Tab)' : 'Безопасный',
      );
      if (wr.fseOverrideActive) {
        recommendations.push({
          id: 'win-conflict-fse',
          priority: 'medium',
          title: 'Форсирован глобальный GameDVR_FSEBehaviorMode=2',
          reason:
            'Переопределение полноэкранного режима через реестр ломает Flip Model в DX12 и вызывает чёрные экраны при Alt-Tab.',
          action: 'Удалите флаг GameDVR_FSEBehaviorMode модулем очистки артефактов.',
          fpsImpact: 'Чистый Alt-Tab',
          moduleIds: ['repairDisplayArtifacts'],
        });
      }
    }

    if (wr.autoEndTasksActive !== undefined) {
      recordCheck(
        'conflict_autoend',
        'AutoEndTasks',
        4,
        !wr.autoEndTasksActive,
        wr.autoEndTasksActive ? 'Включён (риск вылетов)' : 'Выключен',
      );
      if (wr.autoEndTasksActive) {
        recommendations.push({
          id: 'win-conflict-autoend',
          priority: 'medium',
          title: 'Активен AutoEndTasks=1 в реестре',
          reason: 'Windows может принудительно закрывать зависшие на загрузке игры без ожидания.',
          action: 'Запустите скрипт отката или отключите AutoEndTasks в разделе Desktop.',
          fpsImpact: 'Без случайных вылетов',
          moduleIds: [],
        });
      }
    }

    // --- B. Anti-Cheat & Launch Readiness ---
    if (wr.secureBootEnabled !== undefined) {
      recordCheck(
        'secure_boot',
        'Secure Boot (античиты)',
        5,
        wr.secureBootEnabled,
        wr.secureBootEnabled ? 'Включён' : 'Выключен!',
      );
      if (!wr.secureBootEnabled) {
        recommendations.push({
          id: 'win-secureboot-off',
          priority: 'high',
          title: 'Secure Boot выключен в BIOS',
          reason:
            'Античиты уровня ядра (Riot Vanguard в Valorant/LoL, EA Javelin в BF2042/FC, FACEIT AC на Win 11) отказываются запускать игры без Secure Boot.',
          action: 'Включите UEFI Secure Boot в настройках BIOS (раздел Security / Boot).',
          fpsImpact: 'Запуск античитов',
          moduleIds: [],
        });
      }
    }

    if (wr.tpmReady !== undefined) {
      verifiedChecks.push({
        id: 'tpm',
        label: 'TPM 2.0 модуль',
        valueText: wr.tpmReady ? 'Готов' : 'Не активен',
        passed: wr.tpmReady,
      });
    }

    // --- B2. Deep BIOS / UEFI & Hardware Firmware Audit ---
    if (wr.bootMode !== undefined && wr.bootMode !== 'Unknown') {
      const isUefi = wr.bootMode.toUpperCase() === 'UEFI';
      recordCheck(
        'boot_mode',
        'Режим загрузки (BIOS)',
        5,
        isUefi,
        isUefi ? 'UEFI' : 'Legacy (MBR!)',
      );
      if (!isUefi) {
        score -= 6;
        recommendations.push({
          id: 'win-legacy-boot',
          priority: 'high',
          title: 'Система загружается в устаревшем режиме BIOS Legacy вместо UEFI',
          reason:
            'В Legacy-режиме не работают Resizable BAR, Secure Boot (для Vanguard/FACEIT на Win 11) и быстрый GPT-старт NVMe.',
          action:
            'Конвертируйте системный диск в GPT через mbr2gpt и переключите BIOS в режим UEFI без CSM.',
          fpsImpact: 'ReBAR + Античиты',
          moduleIds: [],
        });
      }
    }

    if (wr.biosAgeDays !== undefined) {
      const biosFresh = wr.biosAgeDays <= 730;
      recordCheck(
        'bios_age',
        'Версия и возраст BIOS',
        4,
        biosFresh,
        wr.biosVersion
          ? `${wr.biosVersion} (${Math.floor(wr.biosAgeDays / 30)} мес.)`
          : `${wr.biosAgeDays} дн.`,
      );
      if (!biosFresh) {
        recommendations.push({
          id: 'win-bios-old',
          priority: 'medium',
          title: `Прошивка BIOS не обновлялась более ${Math.floor(wr.biosAgeDays / 365)} лет`,
          reason:
            'Старый BIOS (AGESA / Intel ME) может вызывать статтеры fTPM, нестабильность XMP/EXPO и не поддерживать свежие CPU/GPU.',
          action:
            'Проверьте официальный сайт материнской платы и обновите BIOS при наличии фиксов стабильности.',
          fpsImpact: 'Фикс статтеров',
          moduleIds: [],
        });
      }
    }

    if (wr.rebarEnabled !== undefined && wr.rebarEnabled !== null) {
      recordCheck(
        'rebar',
        'Resizable BAR (BIOS GPU)',
        5,
        wr.rebarEnabled,
        wr.rebarEnabled ? 'Активен (Large BAR)' : 'Выключен в BIOS',
      );
      if (!wr.rebarEnabled) {
        recommendations.push({
          id: 'win-rebar-off',
          priority: 'medium',
          title: 'Выключен Resizable BAR / Above 4G Decoding в BIOS',
          reason:
            'Процессор обращается к видеопамяти маленькими окнами по 256 МБ вместо всей VRAM целиком.',
          action:
            'Включите Above 4G Decoding и Re-Size BAR Support в BIOS (в разделе PCIe / IO Ports).',
          fpsImpact: '+4–10% FPS',
          moduleIds: [],
        });
      }
    }

    if (wr.virtualizationEnabled !== undefined) {
      verifiedChecks.push({
        id: 'virt_fw',
        label: 'Виртуализация (VT-x/SVM)',
        valueText: wr.virtualizationEnabled ? 'Включена в BIOS' : 'Выключена',
        passed: wr.virtualizationEnabled,
      });
    }

    // --- C. Display, Driver & System Health ---
    if (wr.windowsDisplayHz !== undefined) {
      const hzMismatch =
        wr.windowsMaxHz !== undefined &&
        wr.windowsMaxHz > wr.windowsDisplayHz + 5;
      recordCheck(
        'display_hz',
        'Герцовка в Windows',
        7,
        !hzMismatch,
        hzMismatch
          ? `${wr.windowsDisplayHz} Гц (доступно ${wr.windowsMaxHz}!)`
          : `${wr.windowsDisplayHz} Гц`,
      );
      if (hzMismatch) {
        score -= 10;
        recommendations.push({
          id: 'win-hz-mismatch',
          priority: 'high',
          title: `Монитор работает на ${wr.windowsDisplayHz} Гц вместо доступных ${wr.windowsMaxHz} Гц!`,
          reason: 'В настройках экрана Windows не выбрана максимальная частота обновления монитора.',
          action: `Откройте «Параметры → Система → Дисплей → Расширенные параметры» и переключите на ${wr.windowsMaxHz} Гц.`,
          fpsImpact: 'До 2.4× плавнее',
          moduleIds: [],
        });
      }
    }

    if (wr.gpuDriverAgeDays !== undefined) {
      const driverFresh = wr.gpuDriverAgeDays < 150;
      recordCheck(
        'gpu_driver_age',
        'Возраст драйвера GPU',
        5,
        driverFresh,
        wr.gpuDriverVersion
          ? `${wr.gpuDriverAgeDays} дн. (${wr.gpuDriverVersion})`
          : `${wr.gpuDriverAgeDays} дн.`,
      );
      if (!driverFresh) {
        recommendations.push({
          id: 'win-gpu-driver-old',
          priority: 'medium',
          title: `Драйвер видеокарты не обновлялся ${wr.gpuDriverAgeDays} дней`,
          reason:
            'Старый драйвер не содержит исправлений артефактов, мерцаний и оптимизаций шейдеров для новых игр.',
          action: 'Обновите драйвер GPU с официального сайта NVIDIA / AMD (выберите «Чистая установка»).',
          fpsImpact: '-Артефакты и фризы',
          moduleIds: ['cleanShaderCache'],
        });
      }
    }

    if (wr.systemDriveType !== undefined) {
      const isSsd = wr.systemDriveType.toUpperCase() !== 'HDD';
      const busLabel = wr.systemDriveBus ? ` ${wr.systemDriveBus}` : '';
      recordCheck(
        'drive_type',
        'Системный диск C:',
        6,
        isSsd,
        isSsd ? `${wr.systemDriveType}${busLabel}` : 'HDD (медленный!)',
      );
      if (!isSsd) {
        score -= 12;
        recommendations.push({
          id: 'win-hdd-boot',
          priority: 'high',
          title: 'Windows работает на механическом HDD вместо SSD',
          reason:
            'Медленное чтение с HDD вызывает жёсткие фризы при подгрузке текстур, карт и файла подкачки.',
          action: 'Перенесите Windows и онлайн-игры на NVMe/SATA SSD накопитель.',
          fpsImpact: '-80% статтеров',
          moduleIds: [],
        });
      }
    }

    if (wr.ssdHealth !== undefined) {
      const healthOk = wr.ssdHealth.toLowerCase() === 'healthy';
      recordCheck(
        'ssd_health',
        'Здоровье SSD (SMART)',
        5,
        healthOk,
        healthOk ? 'Healthy (норма)' : `${wr.ssdHealth} (риск!)`,
      );
      if (!healthOk) {
        score -= 10;
        recommendations.push({
          id: 'win-ssd-health',
          priority: 'high',
          title: `Предупреждение SMART системного диска (${wr.ssdHealth})`,
          reason:
            'Накопитель сообщает об ошибках или деградации ячеек — это причина жёстких фризов и риска потери данных.',
          action:
            'Срочно сделайте резервную копию важных файлов и проверьте диск утилитой производителя (CrystalDiskInfo).',
          fpsImpact: 'Защита от сбоев',
          moduleIds: [],
        });
      }
    }

    if (wr.pageFileMb !== undefined) {
      const pfOk = wr.pageFileMb !== 0;
      recordCheck(
        'pagefile',
        'Файл подкачки Windows',
        4,
        pfOk,
        wr.pageFileMb === -1
          ? 'Авто (системный)'
          : wr.pageFileMb > 0
            ? `${wr.pageFileMb} МБ`
            : 'Отключён (риск вылетов!)',
      );
      if (!pfOk) {
        recommendations.push({
          id: 'win-pagefile-off',
          priority: 'high',
          title: 'Файл подкачки (Pagefile) полностью отключён',
          reason:
            'Даже при 16–32 ГБ ОЗУ некоторые игры и движки (Unreal/Unity) вылетают или фризят при отсутствии виртуальной памяти.',
          action: 'Включите «Автоматически выбирать объём файла подкачки» в Win+R → sysdm.cpl.',
          fpsImpact: 'Без вылетов ОЗУ',
          moduleIds: [],
        });
      }
    }

    if (wr.uptimeDays !== undefined) {
      const uptimeOk = wr.uptimeDays <= 5;
      recordCheck(
        'uptime',
        'Время без перезагрузки',
        4,
        uptimeOk,
        `${wr.uptimeDays} дн.${wr.fastStartupOn ? ' (FastStartup)' : ''}`,
      );
      if (!uptimeOk) {
        recommendations.push({
          id: 'win-uptime-high',
          priority: 'medium',
          title: `Система не перезагружалась ${wr.uptimeDays} дней`,
          reason:
            'Из-за «Быстрого запуска» обычное выключение не очищает ядро и память драйверов — накапливаются утечки ОЗУ и микрофризы.',
          action: 'Нажмите именно «Пуск → Перезагрузка» для полной очистки состояния драйверов.',
          fpsImpact: 'Чище память',
          moduleIds: [],
        });
      }
    }

    if (wr.pendingReboot !== undefined) {
      recordCheck(
        'pending_reboot',
        'Очередь перезагрузки ОС',
        3,
        !wr.pendingReboot,
        wr.pendingReboot ? 'Требует ребута!' : 'Чисто',
      );
      if (wr.pendingReboot) {
        recommendations.push({
          id: 'win-pending-reboot',
          priority: 'medium',
          title: 'Windows ожидает перезагрузки для завершения обновлений',
          reason: 'Незавершённые обновления блокируют файлы системы и драйверов в фоне.',
          action: 'Перезагрузите компьютер перед игровой сессией.',
          fpsImpact: 'Стабильность ОС',
          moduleIds: [],
        });
      }
    }

    if (wr.cpuLoadPercent !== undefined) {
      const cpuIdleOk = wr.cpuLoadPercent < 25;
      recordCheck(
        'cpu_bg_load',
        'Фон. нагрузка CPU',
        5,
        cpuIdleOk,
        `${wr.cpuLoadPercent}% в покое`,
      );
      if (!cpuIdleOk) {
        recommendations.push({
          id: 'win-cpu-bg-load',
          priority: 'high',
          title: `Высокая фоновая нагрузка на CPU (${wr.cpuLoadPercent}% без игр)`,
          reason: 'Посторонние программы или фоновые службы нагружают процессор ещё до запуска игры.',
          action:
            'Откройте Диспетчер задач (Ctrl+Shift+Esc) и закройте процессы, грузящие CPU в простое.',
          fpsImpact: '+10–25% FPS',
          moduleIds: ['telemetryLite', 'disableOverlays'],
        });
      }
    }

    if (wr.ramFreeGb !== undefined && wr.ramTotalGb) {
      const ramFreeOk = wr.ramFreeGb >= 4 || wr.ramTotalGb <= 8;
      recordCheck(
        'ram_free',
        'Свободно ОЗУ сейчас',
        4,
        ramFreeOk,
        wr.topRamApp
          ? `${wr.ramFreeGb} ГБ (${wr.topRamApp}: ${wr.topRamMb ?? '?'} МБ)`
          : `${wr.ramFreeGb} ГБ`,
      );
      if (!ramFreeOk) {
        recommendations.push({
          id: 'win-ram-full',
          priority: 'high',
          title: `Осталось всего ${wr.ramFreeGb} ГБ свободной ОЗУ`,
          reason: `Больше всего памяти сейчас занимает «${wr.topRamApp || 'фоновое приложение'}» (${wr.topRamMb ?? '?'} МБ). Игре придётся уходить в файл подкачки.`,
          action: `Закройте «${wr.topRamApp || 'лишние вкладки и лаунчеры'}» перед запуском игры.`,
          fpsImpact: '-50% фризов',
          moduleIds: ['disableOverlays', 'cleanTemp'],
        });
      }
    }

    // --- D. Power, Scheduling, GPU, Input & Network Settings ---
    if (wr.powerPlan) {
      const ok = wr.powerPlan === 'ultimate' || wr.powerPlan === 'high';
      const labelMap: Record<string, string> = {
        ultimate: 'Макс. производительность',
        high: 'Высокая',
        balanced: 'Сбалансированная',
        powersaver: 'Экономия энергии',
      };
      recordCheck('power', 'Схема питания', 8, ok, labelMap[wr.powerPlan] || wr.powerPlan);
      if (!ok) {
        score -= 8;
        recommendations.push({
          id: 'win-power',
          priority: 'high',
          title:
            wr.powerPlan === 'powersaver'
              ? 'Включена схема «Экономия энергии»!'
              : 'Активна схема питания «Сбалансированная»',
          reason:
            'Процессор сбрасывает турбо-частоты между кадрами, что увеличивает задержку ввода.',
          action: 'Активируйте схему «Максимальная производительность» безопасным модулем OptiCore.',
          fpsImpact: '-3 мс Input Lag',
          moduleIds: ['restorePoint', 'ultimatePower'],
        });
      }
    }

    if (wr.powerThrottlingOff !== undefined) {
      recordCheck(
        'power_throttling',
        'Power Throttling',
        5,
        wr.powerThrottlingOff,
        wr.powerThrottlingOff ? 'Отключён' : 'Активен (сток)',
      );
      if (!wr.powerThrottlingOff) {
        recommendations.push({
          id: 'win-power-throttling',
          priority: 'medium',
          title: 'Включён системный Power Throttling Windows',
          reason: 'Windows может снижать частоту потоков при смешанной нагрузке.',
          action: 'Примените твик «Отключить системный Power Throttling».',
          fpsImpact: '+3–8% 1% Low',
          moduleIds: ['disablePowerThrottling'],
        });
      }
    }

    if (wr.cpuCoreParkingOff !== undefined) {
      recordCheck(
        'core_parking',
        'Парковка ядер CPU',
        5,
        wr.cpuCoreParkingOff,
        wr.cpuCoreParkingOff ? 'Отключена (100%)' : 'Включена (сток)',
      );
      if (!wr.cpuCoreParkingOff) {
        recommendations.push({
          id: 'win-core-parking',
          priority: 'medium',
          title: 'Включена парковка ядер CPU',
          reason: 'Ядра процессора уходят в сон в простых сценах и тормозят при резких взрывах/перестрелках.',
          action: 'Примените безопасный твик «Отключить парковку ядер CPU».',
          fpsImpact: '+5–10% 1% Low',
          moduleIds: ['cpuCoreParkingOff'],
        });
      }
    }

    if (wr.pciAspmOff !== undefined) {
      recordCheck(
        'pci_aspm',
        'Питание PCIe (ASPM)',
        4,
        wr.pciAspmOff,
        wr.pciAspmOff ? 'Без экономии' : 'Экономия вкл.',
      );
      if (!wr.pciAspmOff) {
        recommendations.push({
          id: 'win-pci-aspm',
          priority: 'medium',
          title: 'Включено энергосбережение шины PCI Express (ASPM)',
          reason: 'Могут возникать микролаги пробуждения видеокарты или NVMe-накопителя.',
          action: 'Отключите ASPM в активной схеме питания модулем OptiCore.',
          fpsImpact: 'Стабильнее GPU/NVMe',
          moduleIds: ['pciExpressPowerOff'],
        });
      }
    }

    if (wr.gameModeEnabled !== undefined) {
      recordCheck(
        'gamemode',
        'Игровой режим',
        4,
        wr.gameModeEnabled,
        wr.gameModeEnabled ? 'Включён' : 'Выключен',
      );
    }

    if (wr.hagsEnabled !== undefined) {
      recordCheck('hags', 'HAGS (GPU)', 5, wr.hagsEnabled, wr.hagsEnabled ? 'Включён' : 'Выключен');
      if (!wr.hagsEnabled) {
        score -= 4;
        recommendations.push({
          id: 'win-hags',
          priority: 'medium',
          title: 'Отключено аппаратное планирование GPU (HAGS)',
          reason: 'На Windows 10/11 HAGS снижает задержку очереди кадров и нужен для Frame Generation.',
          action: 'Включите безопасный модуль «Включить HAGS и Игровой режим Windows».',
          fpsImpact: '-1–2 мс Latency',
          moduleIds: ['hagsAndGameMode'],
        });
      }
    }

    if (wr.windowedOptEnabled !== undefined) {
      recordCheck(
        'windowed_opt',
        'Оптим. оконных игр',
        4,
        wr.windowedOptEnabled,
        wr.windowedOptEnabled ? 'Включена (Flip)' : 'Сток',
      );
      if (!wr.windowedOptEnabled) {
        recommendations.push({
          id: 'win-windowed-opt',
          priority: 'medium',
          title: 'Не включена штатная оптимизация игр в оконном режиме',
          reason: 'Официальный режим Flip Model снижает задержку ввода без артефактов и мерцаний.',
          action: 'Добавьте безопасный модуль «Оптимизация для игр в оконном режиме».',
          fpsImpact: '-1–3 мс Input Lag',
          moduleIds: ['windowedOptWin11'],
        });
      }
    }

    if (wr.gameDvrEnabled !== undefined) {
      recordCheck(
        'gamedvr',
        'Xbox GameDVR',
        6,
        !wr.gameDvrEnabled,
        wr.gameDvrEnabled ? 'Включён (пишет фон)' : 'Отключён',
      );
      if (wr.gameDvrEnabled) {
        score -= 5;
        recommendations.push({
          id: 'win-gamedvr',
          priority: 'medium',
          title: 'Включена фоновая запись Xbox GameDVR',
          reason: 'Windows буферизует видео в фоне и снижает стабильность 1% Low FPS.',
          action: 'Отключите GameDVR безопасным модулем OptiCore.',
          fpsImpact: '+5–8% 1% Low',
          moduleIds: ['gameTweaks'],
        });
      }
    }

    if (wr.networkTweaksApplied !== undefined || wr.gpuPriorityHigh !== undefined) {
      const mmcssOk = wr.networkTweaksApplied === true && wr.gpuPriorityHigh !== false;
      recordCheck(
        'mmcss',
        'Приоритет MMCSS / GPU',
        6,
        mmcssOk,
        mmcssOk ? 'Настроен' : 'Сток Windows',
      );
      if (!mmcssOk) {
        score -= 4;
        recommendations.push({
          id: 'win-mmcss',
          priority: 'medium',
          title: 'Не настроен игровой приоритет MMCSS / GPU Priority',
          reason: 'Мультимедиа-планировщик резервирует ресурсы и оставляет игры на стандартном приоритете.',
          action: 'Примените модули «Отключить GameDVR» и «Приоритет MMCSS Tasks\\Games».',
          fpsImpact: '+5–10% стабильности',
          moduleIds: ['gameTweaks', 'gpuPriority'],
        });
      }
    }

    if (wr.win32PrioritySep38 !== undefined) {
      recordCheck(
        'win32prio',
        'Win32PrioritySeparation',
        5,
        wr.win32PrioritySep38,
        wr.win32PrioritySep38 ? '38 (0x26)' : 'Сток Windows',
      );
      if (!wr.win32PrioritySep38) {
        recommendations.push({
          id: 'win-win32prio',
          priority: 'medium',
          title: 'Не настроен приоритет активного окна (Win32PrioritySeparation)',
          reason: 'Короткие кванты 38 (0x26) повышают отзывчивость активного окна игры.',
          action: 'Примените безопасный модуль win32PrioritySep.',
          fpsImpact: '-1–3 мс Input Lag',
          moduleIds: ['win32PrioritySep'],
        });
      }
    }

    if (wr.mouseAccelEnabled !== undefined) {
      recordCheck(
        'mouse',
        'Акселерация мыши',
        5,
        !wr.mouseAccelEnabled,
        wr.mouseAccelEnabled ? 'Включена' : 'Выключена (1:1)',
      );
      if (wr.mouseAccelEnabled) {
        score -= 4;
        recommendations.push({
          id: 'win-mouse-accel',
          priority: 'medium',
          title: 'Включена акселерация мыши Windows',
          reason: 'Повышенная точность указателя искажает мышечную память при резких движениях.',
          action: 'Примените твик «Отключить акселерацию мыши Windows».',
          fpsImpact: 'Честный ввод 1:1',
          moduleIds: ['mouseRawInput'],
        });
      }
    }

    if (wr.usbPowerSavingOff !== undefined) {
      recordCheck(
        'usb',
        'Энергосбережение USB',
        4,
        wr.usbPowerSavingOff,
        wr.usbPowerSavingOff ? 'Отключено' : 'Включено (сток)',
      );
      if (!wr.usbPowerSavingOff) {
        recommendations.push({
          id: 'win-usb',
          priority: 'medium',
          title: 'Включено автоотключение питания USB-портов',
          reason: 'Контроллер USB может усыплять мышь/гарнитуру и создавать микрозадержки.',
          action: 'Отключите Selective Suspend модулем usbPowerSavingOff.',
          fpsImpact: 'Стабильный отклик мыши',
          moduleIds: ['usbPowerSavingOff'],
        });
      }
    }

    if (wr.nicPowerSavingOff !== undefined) {
      recordCheck(
        'nic_pm',
        'Энергосб. сетевой карты',
        4,
        wr.nicPowerSavingOff,
        wr.nicPowerSavingOff ? 'Отключено' : 'Разрешено ОС',
      );
      if (!wr.nicPowerSavingOff) {
        recommendations.push({
          id: 'win-nic-power',
          priority: 'medium',
          title: 'Разрешено отключение сетевой карты / Wi-Fi для экономии энергии',
          reason: 'Адаптер может переходить в энергосбережение и вызывать потери пакетов.',
          action: 'Примените модуль nicPowerSavingOff.',
          fpsImpact: 'Стабильный пинг',
          moduleIds: ['nicPowerSavingOff'],
        });
      }
    }

    if (wr.transparencyDisabled !== undefined) {
      recordCheck(
        'transparency',
        'Прозрачность окон',
        3,
        wr.transparencyDisabled,
        wr.transparencyDisabled ? 'Отключена' : 'Включена',
      );
    }

    if (wr.uwpBackgroundDisabled !== undefined) {
      recordCheck(
        'uwp',
        'Фоновые UWP',
        3,
        wr.uwpBackgroundDisabled,
        wr.uwpBackgroundDisabled ? 'Запрещены' : 'Разрешены',
      );
    }

    if (wr.diagTrackRunning !== undefined) {
      recordCheck(
        'diagtrack',
        'Телеметрия DiagTrack',
        4,
        !wr.diagTrackRunning,
        wr.diagTrackRunning ? 'Работает в фоне' : 'Остановлена',
      );
      if (wr.diagTrackRunning) {
        recommendations.push({
          id: 'win-diagtrack',
          priority: 'medium',
          title: 'Работает фоновая служба телеметрии DiagTrack',
          reason: 'Периодически грузит диск и процессор в фоне.',
          action: 'Остановите безопасную службу DiagTrack в генераторе скриптов.',
          fpsImpact: '-Фоновые пики',
          moduleIds: ['telemetryLite'],
        });
      }
    }

    if (wr.deliveryOptP2P !== undefined) {
      recordCheck(
        'p2p',
        'P2P обновлений',
        4,
        !wr.deliveryOptP2P,
        wr.deliveryOptP2P ? 'Включена' : 'Отключена',
      );
      if (wr.deliveryOptP2P) {
        recommendations.push({
          id: 'win-p2p',
          priority: 'medium',
          title: 'Не отключена P2P-раздача обновлений Windows',
          reason: 'Windows может раздавать файлы обновлений другим ПК и вызывать скачки пинга.',
          action: 'Примените твик disableP2PUpdate.',
          fpsImpact: 'Ниже джиттер пинга',
          moduleIds: ['disableP2PUpdate'],
        });
      }
    }

    if (wr.nagleDisabled !== undefined) {
      recordCheck(
        'nagle',
        'Алгоритм Нагла',
        4,
        wr.nagleDisabled,
        wr.nagleDisabled ? 'Отключён' : 'Включён (сток)',
      );
      if (!wr.nagleDisabled) {
        recommendations.push({
          id: 'win-nagle',
          priority: 'medium',
          title: 'Не отключён алгоритм Нагла на сетевых адаптерах',
          reason: 'Сетевые пакеты буферизуются перед отправкой, повышая джиттер пинга.',
          action: 'Примените безопасный твик nagleDisable.',
          fpsImpact: 'Ниже джиттер пинга',
          moduleIds: ['nagleDisable'],
        });
      }
    }

    if (wr.fastDnsConfigured !== undefined) {
      recordCheck(
        'dns',
        'Быстрый DNS (1.1.1.1 / 8.8.8.8)',
        3,
        wr.fastDnsConfigured,
        wr.fastDnsConfigured ? 'Настроен' : 'Провайдерский',
      );
      if (!wr.fastDnsConfigured) {
        recommendations.push({
          id: 'win-dns-default',
          priority: 'medium',
          title: 'Используется стандартный DNS провайдера',
          reason: 'Публичный DNS Cloudflare (1.1.1.1) быстрее резолвит серверы игр и снижает задержки подключения.',
          action: 'Включите модуль dnsCloudflareQuad и сбросьте кэш DNS.',
          fpsImpact: 'Быстрый коннект',
          moduleIds: ['dnsCloudflareQuad', 'dnsFlush'],
        });
      }
    }

    if (wr.tcpRscEnabled !== undefined) {
      recordCheck(
        'tcp_rsc',
        'Склейка пакетов TCP (RSC)',
        4,
        !wr.tcpRscEnabled,
        wr.tcpRscEnabled ? 'Включена (пики пинга)' : 'Отключена',
      );
      if (wr.tcpRscEnabled) {
        recommendations.push({
          id: 'win-tcp-rsc',
          priority: 'medium',
          title: 'Включена склейка пакетов TCP RSC (Receive Segment Coalescing)',
          reason:
            'RSC объединяет пакеты для экономии CPU, но создаёт микрозадержки и скачки пинга в онлайн-шутерах.',
          action: 'Примените сетевой твик tcpRscAndEcnOptimize (отключит RSC и оставит RSS).',
          fpsImpact: '-Джиттер пинга',
          moduleIds: ['tcpRscAndEcnOptimize'],
        });
      }
    }

    if (wr.qosReservedPercent !== undefined) {
      const qosOk = wr.qosReservedPercent === 0;
      recordCheck(
        'qos_limit',
        'Резерв полосы QoS',
        3,
        qosOk,
        qosOk ? '0% (снят)' : `${wr.qosReservedPercent}% в резерве ОС`,
      );
      if (!qosOk) {
        recommendations.push({
          id: 'win-qos-reserve',
          priority: 'medium',
          title: `Windows резервирует ${wr.qosReservedPercent}% канала через QoS`,
          reason: 'По умолчанию планировщик пакетов Psched держит запас полосы под системные задачи.',
          action: 'Примените модуль qosPacketSchedulerZero (NonBestEffortLimit=0).',
          fpsImpact: '+Свободный канал',
          moduleIds: ['qosPacketSchedulerZero'],
        });
      }
    }

    if (wr.llmnrEnabled !== undefined) {
      recordCheck(
        'llmnr',
        'Широковещат. LLMNR',
        3,
        !wr.llmnrEnabled,
        wr.llmnrEnabled ? 'Включён (шум сети)' : 'Отключён',
      );
      if (wr.llmnrEnabled) {
        recommendations.push({
          id: 'win-llmnr',
          priority: 'medium',
          title: 'Включены широковещательные запросы LLMNR в локальной сети',
          reason: 'Windows рассылает фоновые multicast-запросы поиска устройств в LAN.',
          action: 'Отключите LLMNR и NetBIOS безопасным сетевым модулем disableNetBiosAndLlmnr.',
          fpsImpact: 'Чистый трафик',
          moduleIds: ['disableNetBiosAndLlmnr'],
        });
      }
    }

    if (wr.ntfsLastAccessOff !== undefined) {
      recordCheck(
        'ntfs',
        'NTFS LastAccess',
        3,
        wr.ntfsLastAccessOff,
        wr.ntfsLastAccessOff ? 'Ускорен' : 'Сток',
      );
    }

    if (wr.startupCount !== undefined) {
      const startupOk = wr.startupCount <= 8;
      const startupMid = wr.startupCount <= 14;
      winPossible += 5;
      if (startupOk) winEarned += 5;
      else if (startupMid) winEarned += 2;
      verifiedChecks.push({
        id: 'startup',
        label: 'Автозагрузка',
        valueText: `${wr.startupCount} прогр.`,
        passed: startupOk,
      });
      if (wr.startupCount > 10) {
        score -= 4;
        recommendations.push({
          id: 'win-startup',
          priority: 'medium',
          title: `Перегружена автозагрузка (${wr.startupCount} программ)`,
          reason: 'Фоновые апдейтеры и лаунчеры занимают ОЗУ и отбирают время CPU.',
          action: 'Откройте Диспетчер задач → Автозагрузка и отключите лишние программы.',
          fpsImpact: '-25% фоновых задач',
          moduleIds: ['disableStartupDelay', 'disableOverlays'],
        });
      }
    }

    if (wr.ssdFreePercent !== undefined || wr.tempSizeMb !== undefined) {
      const ssdOk = wr.ssdFreePercent === undefined || wr.ssdFreePercent >= 15;
      const tempOk = wr.tempSizeMb === undefined || wr.tempSizeMb < 500;
      const shaderOk = wr.shaderCacheMb === undefined || wr.shaderCacheMb < 1500;
      winPossible += 5;
      if (ssdOk && tempOk && shaderOk) winEarned += 5;
      else if (ssdOk && (tempOk || shaderOk)) winEarned += 2;
      const ssdParts: string[] = [];
      if (wr.ssdFreePercent !== undefined) ssdParts.push(`${wr.ssdFreePercent}% C:`);
      if (wr.tempSizeMb !== undefined) ssdParts.push(`Temp ${wr.tempSizeMb} МБ`);
      verifiedChecks.push({
        id: 'ssd_temp',
        label: 'SSD C:, Temp и шейдеры',
        valueText: ssdParts.join(' · ') || 'Проверено',
        passed: ssdOk && tempOk && shaderOk,
      });
      if (!ssdOk || (wr.tempSizeMb !== undefined && wr.tempSizeMb > 1000)) {
        score -= 7;
        recommendations.push({
          id: 'win-ssd',
          priority: 'high',
          title:
            wr.ssdFreePercent !== undefined && wr.ssdFreePercent < 15
              ? `На диске C: осталось всего ${wr.ssdFreePercent}% места (${wr.ssdFreeGb ?? '?'} ГБ)`
              : `Накопилось ${wr.tempSizeMb} МБ временного кэша Temp`,
          reason:
            'При заполнении SSD более чем на 85% падает скорость записи и появляются фризы при подгрузке уровней.',
          action: 'Очистите %TEMP%, кэш старых шейдеров GPU и удалите ненужные игры/архивы.',
          fpsImpact: 'Устранение фризов',
          moduleIds: ['cleanTemp', 'cleanShaderCache', 'memoryStorageBoost'],
        });
      }
      if (wr.shaderCacheMb !== undefined && wr.shaderCacheMb >= 1500) {
        recommendations.push({
          id: 'win-shader-bloat',
          priority: 'medium',
          title: `Разросся кэш шейдеров GPU (${wr.shaderCacheMb} МБ)`,
          reason: 'Старый кэш после обновлений драйверов может вызывать статтеры и артефакты.',
          action: 'Очистите устаревший кэш шейдеров безопасным модулем cleanShaderCache.',
          fpsImpact: 'Чистая компиляция',
          moduleIds: ['cleanShaderCache'],
        });
      }
    }

    if (wr.ramStickCount === 1) {
      score -= 10;
      recordCheck('ram_channel', 'Режим ОЗУ', 6, false, '1 планка (одноканал)');
      recommendations.push({
        id: 'win-single-channel',
        priority: 'high',
        title: 'Оперативная память работает в одноканальном режиме (1 планка)',
        reason:
          'При одной планке ОЗУ пропускная способность памяти урезана вдвое, что сильно снижает FPS.',
        action: 'Добавьте вторую аналогичную планку ОЗУ в парный слот A2/B2.',
        fpsImpact: '+15–25% FPS',
        moduleIds: [],
      });
    } else if (wr.ramStickCount && wr.ramStickCount >= 2) {
      recordCheck('ram_channel', 'Режим ОЗУ', 4, true, `${wr.ramStickCount} пл. (многоканал)`);
    }

    if (wr.ramSpeedMhz) {
      const belowRated =
        wr.ramRatedMhz !== undefined &&
        wr.ramRatedMhz > wr.ramSpeedMhz + 50;
      const xmpOk =
        wr.ramSpeedMhz > 2400 &&
        wr.ramSpeedMhz !== 4800 &&
        !belowRated;
      const speedLabel =
        belowRated && wr.ramRatedMhz
          ? `${wr.ramSpeedMhz} / ${wr.ramRatedMhz} МГц!`
          : `${wr.ramSpeedMhz} МГц`;
      recordCheck('xmp', 'Профиль ОЗУ (XMP)', 6, xmpOk, speedLabel);
      if (!xmpOk) {
        score -= 10;
        recommendations.push({
          id: 'win-xmp',
          priority: 'high',
          title:
            belowRated && wr.ramRatedMhz
              ? `ОЗУ работает на ${wr.ramSpeedMhz} МГц вместо паспортных ${wr.ramRatedMhz} МГц (XMP выключен)`
              : `ОЗУ работает на базовой частоте ${wr.ramSpeedMhz} МГц (XMP/EXPO выключен)`,
          reason:
            'Базовая частота DDR4 2133/2400 или DDR5 4800 МГц ограничивает скорость CPU и 1% Low FPS.',
          action: 'Зайдите в BIOS (Del/F2 при старте) и включите профиль XMP / DOCP / EXPO.',
          fpsImpact: '+10–18% FPS',
          moduleIds: [],
        });
      }
    }

    if (wr.vbsEnabled !== undefined) {
      verifiedChecks.push({
        id: 'vbs',
        label: 'Изоляция ядра (VBS)',
        valueText: wr.vbsEnabled ? 'Включена (безопасн.)' : 'Выключена',
        passed: !wr.vbsEnabled,
      });
      if (wr.vbsEnabled) {
        recommendations.push({
          id: 'win-vbs',
          priority: 'medium',
          title: 'Активна изоляция ядра Windows (VBS / Memory Integrity)',
          reason:
            'Повышает защиту системы, но может забирать 5–10% FPS. Некоторые античиты используют компоненты безопасности, поэтому менять стоит только осознанно.',
          action:
            'Проверьте в «Безопасность Windows → Безопасность устройства → Изоляция ядра» (если античит не требует — можно выключить вручную).',
          fpsImpact: '+5–10% FPS',
          moduleIds: [],
        });
      }
    }

    checksCount = 8 + verifiedChecks.length;
  } else if (input.isWindows) {
    recommendations.push({
      id: 'win-baseline',
      priority: 'high',
      title: 'Не проверены реальные настройки оптимизации Windows',
      reason:
        'Браузер по правилам безопасности не видит реестр, герцовку, драйвер GPU, Secure Boot, XMP и службы Windows. Без PowerShell-проверки невозможно назвать честный % оптимизации.',
      action:
        'Скопируйте или скачайте расширенный скрипт PowerShell ниже и вставьте строку OPTICORE:{...} — проверка найдёт все ошибки.',
      fpsImpact: 'Точный диагноз ОС',
      moduleIds: [
        'restorePoint',
        'ultimatePower',
        'cpuCoreParkingOff',
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
        'Перейдите на кабель Ethernet, отключите RSC и алгоритм Нагла, снимите резерв QoS и обновите DNS.',
      fpsImpact: 'Ниже пинг',
      moduleIds: [
        'dnsFlush',
        'dnsCloudflareQuad',
        'nagleDisable',
        'tcpRscAndEcnOptimize',
        'qosPacketSchedulerZero',
        'nicLowLatencyBuffers',
        'nicPowerSavingOff',
        'disableP2PUpdate',
      ],
    });
  }

  const hardwareScore = Math.max(15, Math.min(98, Math.round(score)));
  const windowsVerified = Boolean(wr && winPossible > 0);
  const optimizationScore = windowsVerified
    ? Math.max(0, Math.min(100, Math.round((winEarned / winPossible) * 100)))
    : null;

  const effectiveScore = optimizationScore !== null ? optimizationScore : hardwareScore;

  let verdictBadge = 'Требует настройки';
  let verdictTitle = 'Есть заметные проблемы и резерв оптимизации Windows';
  let verdictDescription =
    'Расширенный аудит показал параметры в стоке или конфликтные настройки. Пройдитесь по найденным проблемам ниже и примените безопасные исправления.';
  let estimatedFpsGain = '+15–35% FPS';

  if (!windowsVerified) {
    verdictBadge = input.isWindows ? 'Оптимизация ОС не проверена' : 'Оценка по браузеру';
    verdictTitle =
      hardwareScore >= 78
        ? 'Железо готово, но настройки Windows ещё не проверены'
        : 'Обнаружены аппаратные или кадровые ограничения';
    verdictDescription = input.isWindows
      ? `Браузер оценил базу (GPU, CPU, ${input.measuredHz} Гц, фреймтайм) на ${hardwareScore}/100, но не видит реестр и службы Windows. Запустите расширенный read-only скрипт PowerShell ниже, чтобы увидеть все проблемы и честный %.`
      : 'Оценка выполнена по параметрам, доступным из браузера (GPU, потоки CPU, герцовка и фреймтайм).';
    estimatedFpsGain = hardwareScore >= 78 ? 'Зависит от ОС' : '+15–35% FPS';
  } else if (optimizationScore !== null && optimizationScore >= 84) {
    verdictBadge = 'Отлично оптимизирован';
    verdictTitle = 'Система настроена грамотно, без конфликтных флагов';
    verdictDescription =
      'Питание CPU, планировщик GPU, герцовка, периферия и сетевой стек работают стабильно и безопасно.';
    estimatedFpsGain = '+2–8% 1% Low';
  } else if (optimizationScore !== null && optimizationScore >= 56) {
    verdictBadge = 'Частично оптимизирован';
    verdictTitle = 'База настроена, но остались узкие места в Windows';
    verdictDescription =
      'Исправьте оставшиеся пункты ниже — это уберёт фоновые просадки 1% Low и снизит Input Lag без риска для игр.';
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
