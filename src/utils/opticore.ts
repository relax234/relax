export interface ChecklistItem {
  id: string;
  title: string;
  desc: string;
  weight: number;
}

export interface ChecklistGroup {
  category: string;
  badge: string;
  items: ChecklistItem[];
}

export type ScriptCategory = 'system' | 'gaming' | 'input' | 'network';

export interface ScriptModule {
  id: string;
  category: ScriptCategory;
  impactTag: string;
  title: string;
  desc: string;
  defaultEnabled: boolean;
  bat: string;
  ps1: string;
}

export type ScriptFormat = 'bat' | 'ps1';

export interface FaqEntry {
  q: string;
  a: string;
}

export interface OptimizationScore {
  percent: number;
  stabilityBonus: number;
  label: string;
  badgeClass: string;
}

export const CHECKLIST_DATA: ChecklistGroup[] = [
  {
    category: 'Система и питание',
    badge: 'Высокий эффект',
    items: [
      {
        id: 'power',
        title: 'Схема питания «Максимальная производительность»',
        desc: 'Не даёт ядрам CPU сбрасывать частоты в играх',
        weight: 12,
      },
      {
        id: 'startup',
        title: 'Чистка автозагрузки в Диспетчере задач',
        desc: 'Отключи лаунчеры, торренты и лишние апдейтеры',
        weight: 10,
      },
      {
        id: 'gamemode',
        title: 'Игровой режим Windows + HAGS',
        desc: 'Планирование графического процессора с аппаратным ускорением',
        weight: 8,
      },
    ],
  },
  {
    category: 'Память и накопители',
    badge: 'Стабильность',
    items: [
      {
        id: 'xmp',
        title: 'Активирован профиль XMP / EXPO в BIOS',
        desc: 'Раскрывает полную частоту и тайминги оперативной памяти',
        weight: 14,
      },
      {
        id: 'ssd',
        title: 'Свободно минимум 15–20% места на SSD',
        desc: 'Сохраняет скорость записи и работу TRIM без фризов',
        weight: 8,
      },
      {
        id: 'temp',
        title: 'Очищены папки Temp и кэш DirectX',
        desc: 'Удаляет старые шейдеры и временный мусор обновлений',
        weight: 6,
      },
    ],
  },
  {
    category: 'Графика и ввод',
    badge: 'Input Lag',
    items: [
      {
        id: 'gpu_driver',
        title: 'Чистая установка свежего драйвера GPU',
        desc: 'Без ненужных оверлеев и фоновой телеметрии',
        weight: 10,
      },
      {
        id: 'mouse',
        title: 'Отключена повышенная точность указателя',
        desc: 'Честный 1:1 ввод мыши без акселерации Windows',
        weight: 8,
      },
      {
        id: 'overlays',
        title: 'Отключены лишние оверлеи (Discord, Xbox GameDVR)',
        desc: 'Убирает микростаттеры и падения 1% Low FPS',
        weight: 8,
      },
    ],
  },
  {
    category: 'Сеть и фоновые службы',
    badge: 'Пинг',
    items: [
      {
        id: 'dns',
        title: 'Быстрый DNS (Cloudflare 1.1.1.1 / Google 8.8.8.8)',
        desc: 'Ускоряет резолвинг серверов и стабильность соединения',
        weight: 5,
      },
      {
        id: 'delivery',
        title: 'Отключена оптимизация доставки P2P',
        desc: 'Windows не раздаёт обновления другим ПК в фоне',
        weight: 6,
      },
      {
        id: 'restore',
        title: 'Создана точка восстановления системы',
        desc: 'Гарантия безопасного отката за 1 минуту',
        weight: 5,
      },
    ],
  },
];

export const SCRIPT_MODULES: ScriptModule[] = [
  // === SYSTEM (8 safe modules — no BCDEDIT hacks, no kernel/anti-cheat conflicts) ===
  {
    id: 'restorePoint',
    category: 'system',
    impactTag: 'Бэкап',
    title: 'Создать точку восстановления (рекомендуется)',
    desc: 'Автоматический бэкап реестра перед применением твиков',
    defaultEnabled: true,
    bat: String.raw`echo Создание точки восстановления...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Checkpoint-Computer -Description 'OptiCore_Backup' -RestorePointType 'MODIFY_SETTINGS'" >nul 2>&1`,
    ps1: String.raw`Write-Host "Создание точки восстановления..." -ForegroundColor Cyan
Checkpoint-Computer -Description "OptiCore_Backup" -RestorePointType "MODIFY_SETTINGS" -ErrorAction SilentlyContinue`,
  },
  {
    id: 'ultimatePower',
    category: 'system',
    impactTag: 'CPU Буст',
    title: 'Включить схему «Максимальная производительность»',
    desc: 'Активирует штатный профиль Ultimate / High Performance без сброса частот',
    defaultEnabled: true,
    bat: String.raw`echo Активация схемы Максимальной производительности...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d = powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>$null; if ($d -match '([0-9a-fA-F-]{36})') { powercfg /setactive $matches[1] } else { powercfg /setactive SCHEME_MIN }" >nul 2>&1`,
    ps1: String.raw`Write-Host "Активация схемы Максимальной производительности..." -ForegroundColor Cyan
$dup = powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>$null
if ($dup -match '([0-9a-fA-F-]{36})') { powercfg /setactive $matches[1] | Out-Null } else { powercfg /setactive SCHEME_MIN | Out-Null }`,
  },
  {
    id: 'cpuCoreParkingOff',
    category: 'system',
    impactTag: '-Статтеры CPU',
    title: 'Отключить парковку ядер процессора (100% активных ядер)',
    desc: 'Штатная настройка powercfg: не даёт Windows усыплять ядра CPU в играх',
    defaultEnabled: false,
    bat: String.raw`echo Отключение парковки ядер CPU (CPMINCORES = 100)...
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 100 >nul 2>&1
powercfg /setactive SCHEME_CURRENT >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение парковки ядер CPU..." -ForegroundColor Cyan
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 100 | Out-Null
powercfg /setactive SCHEME_CURRENT | Out-Null`,
  },
  {
    id: 'disablePowerThrottling',
    category: 'system',
    impactTag: 'Макс. частота CPU',
    title: 'Отключить системный Power Throttling (Windows 10/11)',
    desc: 'Запрещает планировщику Windows искусственно занижать частоты рабочих потоков',
    defaultEnabled: false,
    bat: String.raw`echo Отключение Power Throttling...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" /v "PowerThrottlingOff" /t REG_DWORD /d 1 /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение Power Throttling..." -ForegroundColor Cyan
New-Item -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" -Name "PowerThrottlingOff" -Value 1 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'pciExpressPowerOff',
    category: 'system',
    impactTag: 'Стабильный GPU',
    title: 'Отключить энергосбережение шины PCI Express (ASPM Off)',
    desc: 'Видеокарта и NVMe SSD получают стабильное питание без микролагов пробуждения',
    defaultEnabled: false,
    bat: String.raw`echo Отключение энергосбережения PCI Express Link State...
powercfg -setacvalueindex SCHEME_CURRENT SUB_PCIEXPRESS ASPM 0 >nul 2>&1
powercfg /setactive SCHEME_CURRENT >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение энергосбережения PCI Express Link State..." -ForegroundColor Cyan
powercfg -setacvalueindex SCHEME_CURRENT SUB_PCIEXPRESS ASPM 0 | Out-Null
powercfg /setactive SCHEME_CURRENT | Out-Null`,
  },
  {
    id: 'processorBoostMax',
    category: 'system',
    impactTag: 'Буст CPU',
    title: 'Зафиксировать турбо-буст и мин. состояние CPU от сети',
    desc: 'Разрешает максимальную частоту CPU (100%) и режим агрессивного буста без сбросов',
    defaultEnabled: false,
    bat: String.raw`echo Настройка частоты и буста процессора от сети...
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMIN 100 >nul 2>&1
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMAX 100 >nul 2>&1
powercfg /setactive SCHEME_CURRENT >nul 2>&1`,
    ps1: String.raw`Write-Host "Настройка частоты и буста процессора от сети..." -ForegroundColor Cyan
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMIN 100 | Out-Null
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMAX 100 | Out-Null
powercfg /setactive SCHEME_CURRENT | Out-Null`,
  },
  {
    id: 'disableStartupDelay',
    category: 'system',
    impactTag: 'Быстрый старт',
    title: 'Убрать задержку автозагрузки Windows (StartupDelay = 0)',
    desc: 'Убирает искусственную 10-секундную паузу запуска приложений после входа в систему',
    defaultEnabled: false,
    bat: String.raw`echo Ускорение старта автозагрузки...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize" /v "StartupDelayInMSec" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\Software\Policies\Microsoft\Windows\Explorer" /v "DisableSearchBoxSuggestions" /t REG_DWORD /d 1 /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Ускорение старта автозагрузки..." -ForegroundColor Cyan
New-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize" -Name "StartupDelayInMSec" -Value 0 -ErrorAction SilentlyContinue
New-Item -Path "HKCU:\Software\Policies\Microsoft\Windows\Explorer" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Policies\Microsoft\Windows\Explorer" -Name "DisableSearchBoxSuggestions" -Value 1 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'telemetryLite',
    category: 'system',
    impactTag: '-Фон CPU',
    title: 'Отключить фоновую телеметрию диагностики (DiagTrack)',
    desc: 'Останавливает только службу отправки телеметрии, не ломая центр обновлений и игры',
    defaultEnabled: false,
    bat: String.raw`echo Отключение службы телеметрии DiagTrack...
sc stop DiagTrack >nul 2>&1
sc config DiagTrack start= disabled >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение службы телеметрии DiagTrack..." -ForegroundColor Cyan
Stop-Service "DiagTrack" -Force -ErrorAction SilentlyContinue
Set-Service "DiagTrack" -StartupType Disabled -ErrorAction SilentlyContinue`,
  },

  // === GAMING & GPU (8 safe, artifact-free modules — no MPO disable, no forced FSE) ===
  {
    id: 'gameTweaks',
    category: 'gaming',
    impactTag: '1% Low FPS',
    title: 'Отключить фоновую запись Xbox GameDVR и сетевой лимит',
    desc: 'Выключает запись клипов в фоне без вмешательства в драйвер экрана (без мерцаний)',
    defaultEnabled: true,
    bat: String.raw`echo Применение безопасных игровых твиков реестра...
reg add "HKCU\System\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" /v "AppCaptureEnabled" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "NetworkThrottlingIndex" /t REG_DWORD /d 4294967295 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "SystemResponsiveness" /t REG_DWORD /d 10 /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Применение безопасных игровых твиков реестра..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Value 0 -ErrorAction SilentlyContinue
New-Item -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" -Name "AppCaptureEnabled" -Value 0 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "NetworkThrottlingIndex" -Value 0xffffffff -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "SystemResponsiveness" -Value 10 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'gpuPriority',
    category: 'gaming',
    impactTag: 'MMCSS GPU',
    title: 'Высший приоритет GPU и CPU для игр (MMCSS Tasks\\Games)',
    desc: 'Официальный планировщик мультимедиа Windows выделяет играм приоритетную очередь',
    defaultEnabled: false,
    bat: String.raw`echo Настройка приоритета GPU/CPU для игр (MMCSS)...
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" /v "GPU Priority" /t REG_DWORD /d 8 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" /v "Priority" /t REG_DWORD /d 6 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" /v "Scheduling Category" /t REG_SZ /d "High" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" /v "SFIO Priority" /t REG_SZ /d "High" /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Настройка приоритета GPU/CPU для игр (MMCSS)..." -ForegroundColor Cyan
$gamesPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
Set-ItemProperty -Path $gamesPath -Name "GPU Priority" -Value 8 -ErrorAction SilentlyContinue
Set-ItemProperty -Path $gamesPath -Name "Priority" -Value 6 -ErrorAction SilentlyContinue
Set-ItemProperty -Path $gamesPath -Name "Scheduling Category" -Value "High" -ErrorAction SilentlyContinue
Set-ItemProperty -Path $gamesPath -Name "SFIO Priority" -Value "High" -ErrorAction SilentlyContinue`,
  },
  {
    id: 'hagsAndGameMode',
    category: 'gaming',
    impactTag: '-Задержка GPU',
    title: 'Включить HAGS и Игровой режим Windows',
    desc: 'Штатное аппаратное планирование GPU и Game Mode (без конфликтов с античитами)',
    defaultEnabled: false,
    bat: String.raw`echo Включение HAGS и Игрового режима Windows...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" /v "HwSchMode" /t REG_DWORD /d 2 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\GameBar" /v "AllowAutoGameMode" /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\GameBar" /v "AutoGameModeEnabled" /t REG_DWORD /d 1 /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Включение HAGS и Игрового режима Windows..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -Name "HwSchMode" -Value 2 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Software\Microsoft\GameBar" -Name "AllowAutoGameMode" -Value 1 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Software\Microsoft\GameBar" -Name "AutoGameModeEnabled" -Value 1 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'win32PrioritySep',
    category: 'gaming',
    impactTag: '+Отклик CPU',
    title: 'Приоритет активного окна (Win32PrioritySeparation = 38)',
    desc: 'Оптимизирует распределение квантов времени CPU для активного окна игры (0x26)',
    defaultEnabled: false,
    bat: String.raw`echo Настройка Win32PrioritySeparation (0x26 / 38)...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl" /v "Win32PrioritySeparation" /t REG_DWORD /d 38 /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Настройка Win32PrioritySeparation (0x26 / 38)..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" -Name "Win32PrioritySeparation" -Value 38 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'windowedOptWin11',
    category: 'gaming',
    impactTag: 'Flip Model',
    title: 'Оптимизация для игр в оконном режиме (Windows 11 Flip Model)',
    desc: 'Снижает задержку вывода и убирает тиринг/мерцания в оконном и безрамочном режиме',
    defaultEnabled: false,
    bat: String.raw`echo Включение оптимизации оконного режима DXGI (SwapEffectUpgradeEnable)...
reg add "HKCU\Software\Microsoft\DirectX\UserGpuPreferences" /v "DirectXUserGlobalSettings" /t REG_SZ /d "SwapEffectUpgradeEnable=1;" /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Включение оптимизации оконного режима DXGI..." -ForegroundColor Cyan
New-Item -Path "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences" -Name "DirectXUserGlobalSettings" -Value "SwapEffectUpgradeEnable=1;" -ErrorAction SilentlyContinue`,
  },
  {
    id: 'diskSleepOff',
    category: 'gaming',
    impactTag: 'Без подфризов',
    title: 'Запретить усыпление SSD/HDD в простое (DISKIDLE = 0)',
    desc: 'Убирает фризы и подвисания игр при обращении к второму диску с текстурами',
    defaultEnabled: false,
    bat: String.raw`echo Запрет отключения накопителей от сети...
powercfg -setacvalueindex SCHEME_CURRENT SUB_DISK DISKIDLE 0 >nul 2>&1
powercfg /setactive SCHEME_CURRENT >nul 2>&1`,
    ps1: String.raw`Write-Host "Запрет отключения накопителей от сети..." -ForegroundColor Cyan
powercfg -setacvalueindex SCHEME_CURRENT SUB_DISK DISKIDLE 0 | Out-Null
powercfg /setactive SCHEME_CURRENT | Out-Null`,
  },
  {
    id: 'cleanShaderCache',
    category: 'gaming',
    impactTag: '-Артефакты кэша',
    title: 'Очистить старый кэш шейдеров DirectX / NVIDIA / AMD',
    desc: 'Удаляет битые старые шейдеры после обновлений драйвера — лечит микрофризы',
    defaultEnabled: false,
    bat: String.raw`echo Очистка устаревшего кэша шейдеров GPU...
del /s /f /q "%localappdata%\D3DSCache\*.*" >nul 2>&1
del /s /f /q "%localappdata%\NVIDIA\DXCache\*.*" >nul 2>&1
del /s /f /q "%localappdata%\AMD\DxCache\*.*" >nul 2>&1`,
    ps1: String.raw`Write-Host "Очистка устаревшего кэша шейдеров GPU..." -ForegroundColor Cyan
Remove-Item "$env:LOCALAPPDATA\D3DSCache\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:LOCALAPPDATA\NVIDIA\DXCache\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:LOCALAPPDATA\AMD\DxCache\*" -Recurse -Force -ErrorAction SilentlyContinue`,
  },
  {
    id: 'repairDisplayArtifacts',
    category: 'gaming',
    impactTag: 'Сброс в безопасное',
    title: 'Сбросить проблемные флаги MPO / FSE / BCD-таймеры (анти-мерцание)',
    desc: 'Удаляет опасные сторонние твики, из-за которых бывают мерцания, артефакты и баги античитов',
    defaultEnabled: false,
    bat: String.raw`echo Очистка конфликтных флагов MPO, FSE и BCD-таймеров...
reg delete "HKLM\SOFTWARE\Microsoft\Windows\Dwm" /v "OverlayTestMode" /f >nul 2>&1
reg delete "HKCU\System\GameConfigStore" /v "GameDVR_FSEBehaviorMode" /f >nul 2>&1
reg delete "HKCU\System\GameConfigStore" /v "GameDVR_HonorUserFSEBehaviorMode" /f >nul 2>&1
reg delete "HKCU\System\GameConfigStore" /v "GameDVR_DXGIHonorFSEWindowsCompatible" /f >nul 2>&1
bcdedit /deletevalue disabledynamictick >nul 2>&1
bcdedit /deletevalue useplatformtick >nul 2>&1`,
    ps1: String.raw`Write-Host "Очистка конфликтных флагов MPO, FSE и BCD-таймеров..." -ForegroundColor Cyan
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\Dwm" -Name "OverlayTestMode" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_FSEBehaviorMode" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_HonorUserFSEBehaviorMode" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_DXGIHonorFSEWindowsCompatible" -ErrorAction SilentlyContinue
bcdedit /deletevalue disabledynamictick | Out-Null
bcdedit /deletevalue useplatformtick | Out-Null`,
  },

  // === INPUT & OVERLAYS (8 safe modules — no AutoEndTasks/HungAppTimeout) ===
  {
    id: 'mouseRawInput',
    category: 'input',
    impactTag: '1:1 Мышь',
    title: 'Отключить акселерацию мыши Windows',
    desc: 'Отключает «повышенную точность указателя» для честного отклика 1:1 в играх',
    defaultEnabled: false,
    bat: String.raw`echo Отключение акселерации мыши (MouseSpeed=0)...
reg add "HKCU\Control Panel\Mouse" /v "MouseSpeed" /t REG_SZ /d "0" /f >nul 2>&1
reg add "HKCU\Control Panel\Mouse" /v "MouseThreshold1" /t REG_SZ /d "0" /f >nul 2>&1
reg add "HKCU\Control Panel\Mouse" /v "MouseThreshold2" /t REG_SZ /d "0" /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение акселерации мыши (MouseSpeed=0)..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseSpeed" -Value "0" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseThreshold1" -Value "0" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseThreshold2" -Value "0" -ErrorAction SilentlyContinue`,
  },
  {
    id: 'usbPowerSavingOff',
    category: 'input',
    impactTag: 'Стабильный USB',
    title: 'Запретить отключение питания USB (DisableSelectiveSuspend)',
    desc: 'Мышь, клавиатура и гарнитура не засыпают в простое и не теряют отклик',
    defaultEnabled: false,
    bat: String.raw`echo Отключение энергосбережения USB-портов...
reg add "HKLM\SYSTEM\CurrentControlSet\Services\USB" /v "DisableSelectiveSuspend" /t REG_DWORD /d 1 /f >nul 2>&1
powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 >nul 2>&1
powercfg /setactive SCHEME_CURRENT >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение энергосбережения USB-портов..." -ForegroundColor Cyan
New-Item -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USB" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USB" -Name "DisableSelectiveSuspend" -Value 1 -ErrorAction SilentlyContinue
powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 | Out-Null
powercfg /setactive SCHEME_CURRENT | Out-Null`,
  },
  {
    id: 'disableOverlays',
    category: 'input',
    impactTag: '-Микрофризы',
    title: 'Отключить фоновые приложения UWP и подсказки Game Bar',
    desc: 'Убирает фоновую активность встроенных приложений без поломки служб Xbox и входа',
    defaultEnabled: false,
    bat: String.raw`echo Отключение фоновых UWP-приложений и подсказок Game Bar...
reg add "HKCU\Software\Microsoft\GameBar" /v "UseNexusForGameBarEnabled" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\GameBar" /v "ShowStartupPanel" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" /v "GlobalUserDisabled" /t REG_DWORD /d 1 /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение фоновых UWP-приложений и подсказок Game Bar..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\Software\Microsoft\GameBar" -Name "UseNexusForGameBarEnabled" -Value 0 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Software\Microsoft\GameBar" -Name "ShowStartupPanel" -Value 0 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 1 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'visualEffectsPerf',
    category: 'input',
    impactTag: '-Нагрузка DWM',
    title: 'Убрать прозрачность и анимацию сворачивания окон',
    desc: 'Облегчает работу рабочего стола DWM без отключения сглаживания шрифтов и теней',
    defaultEnabled: false,
    bat: String.raw`echo Отключение прозрачности интерфейса...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" /v "EnableTransparency" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\Control Panel\Desktop\WindowMetrics" /v "MinAnimate" /t REG_SZ /d "0" /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение прозрачности интерфейса..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "EnableTransparency" -Value 0 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Desktop\WindowMetrics" -Name "MinAnimate" -Value "0" -ErrorAction SilentlyContinue`,
  },
  {
    id: 'disableStickyKeys',
    category: 'input',
    impactTag: 'Без Alt-Tab',
    title: 'Отключить залипание клавиш (StickyKeys / FilterKeys)',
    desc: 'Исключает случайное сворачивание игры при частом нажатии Shift / Ctrl',
    defaultEnabled: false,
    bat: String.raw`echo Отключение залипания клавиш...
reg add "HKCU\Control Panel\Accessibility\StickyKeys" /v "Flags" /t REG_SZ /d "506" /f >nul 2>&1
reg add "HKCU\Control Panel\Accessibility\Keyboard Response" /v "Flags" /t REG_SZ /d "122" /f >nul 2>&1
reg add "HKCU\Control Panel\Accessibility\ToggleKeys" /v "Flags" /t REG_SZ /d "58" /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение залипания клавиш..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\Control Panel\Accessibility\StickyKeys" -Name "Flags" -Value "506" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Accessibility\Keyboard Response" -Name "Flags" -Value "122" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Accessibility\ToggleKeys" -Name "Flags" -Value "58" -ErrorAction SilentlyContinue`,
  },
  {
    id: 'audioLatencyBoost',
    category: 'input',
    impactTag: '-Треск звука',
    title: 'Приоритет аудиопотока Windows (Tasks\\Audio)',
    desc: 'Снижает задержки и хрипы звука при высокой нагрузке на процессор в играх',
    defaultEnabled: false,
    bat: String.raw`echo Оптимизация приоритета Tasks\Audio...
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Audio" /v "Priority" /t REG_DWORD /d 6 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Audio" /v "Scheduling Category" /t REG_SZ /d "High" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Audio" /v "SFIO Priority" /t REG_SZ /d "High" /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Оптимизация приоритета Tasks\Audio..." -ForegroundColor Cyan
$audioPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Audio"
Set-ItemProperty -Path $audioPath -Name "Priority" -Value 6 -ErrorAction SilentlyContinue
Set-ItemProperty -Path $audioPath -Name "Scheduling Category" -Value "High" -ErrorAction SilentlyContinue
Set-ItemProperty -Path $audioPath -Name "SFIO Priority" -Value "High" -ErrorAction SilentlyContinue`,
  },
  {
    id: 'menuShowDelayOnly',
    category: 'input',
    impactTag: 'Быстрый UI',
    title: 'Быстрый отклик меню и повтор клавиш (без принуд. закрытия)',
    desc: 'Убирает задержку открытия меню (MenuShowDelay=0) и ускоряет повтор клавиатуры безопасно',
    defaultEnabled: false,
    bat: String.raw`echo Безопасное ускорение меню и отклика клавиатуры...
reg add "HKCU\Control Panel\Desktop" /v "MenuShowDelay" /t REG_SZ /d "0" /f >nul 2>&1
reg add "HKCU\Control Panel\Keyboard" /v "KeyboardDelay" /t REG_SZ /d "0" /f >nul 2>&1
reg add "HKCU\Control Panel\Keyboard" /v "KeyboardSpeed" /t REG_SZ /d "31" /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Безопасное ускорение меню и отклика клавиатуры..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "MenuShowDelay" -Value "0" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Keyboard" -Name "KeyboardDelay" -Value "0" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Keyboard" -Name "KeyboardSpeed" -Value "31" -ErrorAction SilentlyContinue`,
  },
  {
    id: 'disableGameNotifications',
    category: 'input',
    impactTag: 'Без всплывашек',
    title: 'Отключить всплывающие советы Windows и шум уведомлений в игре',
    desc: 'Отключает рекламные советы системы, чтобы баннеры не сбивали фокус во время матча',
    defaultEnabled: false,
    bat: String.raw`echo Отключение системных рекламных подсказок Windows...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" /v "SubscribedContent-338389Enabled" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" /v "SoftLandingEnabled" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings" /v "NOC_GLOBAL_SETTING_ALLOW_TOASTS_ABOVE_LOCK" /t REG_DWORD /d 0 /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение системных рекламных подсказок Windows..." -ForegroundColor Cyan
$cdm = "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager"
Set-ItemProperty -Path $cdm -Name "SubscribedContent-338389Enabled" -Value 0 -ErrorAction SilentlyContinue
Set-ItemProperty -Path $cdm -Name "SoftLandingEnabled" -Value 0 -ErrorAction SilentlyContinue
New-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings" -Name "NOC_GLOBAL_SETTING_ALLOW_TOASTS_ABOVE_LOCK" -Value 0 -ErrorAction SilentlyContinue`,
  },

  // === NETWORK & STORAGE (8 safe modules) ===
  {
    id: 'cleanTemp',
    category: 'network',
    impactTag: 'Очистка SSD',
    title: 'Очистить временные файлы (%TEMP%, Windows Temp)',
    desc: 'Безопасно удаляет временный мусор обновлений и установщиков с системного SSD',
    defaultEnabled: true,
    bat: String.raw`echo Очистка временных файлов...
del /s /f /q "%temp%\*.*" >nul 2>&1
del /s /f /q "C:\Windows\Temp\*.*" >nul 2>&1`,
    ps1: String.raw`Write-Host "Очистка временных файлов..." -ForegroundColor Cyan
Remove-Item "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue`,
  },
  {
    id: 'dnsFlush',
    category: 'network',
    impactTag: '-Пинг',
    title: 'Сбросить кэш DNS и выставить нормальный TCP Autotuning',
    desc: 'Очищает устаревшие маршруты и держит стандартный безопасный режим TCP Windows',
    defaultEnabled: false,
    bat: String.raw`echo Сброс DNS-кэша и проверка TCP Autotuning...
ipconfig /flushdns >nul 2>&1
netsh int tcp set global autotuninglevel=normal >nul 2>&1`,
    ps1: String.raw`Write-Host "Сброс DNS-кэша и проверка TCP Autotuning..." -ForegroundColor Cyan
Clear-DnsClientCache -ErrorAction SilentlyContinue
netsh int tcp set global autotuninglevel=normal | Out-Null`,
  },
  {
    id: 'disableP2PUpdate',
    category: 'network',
    impactTag: 'Стабильный пинг',
    title: 'Отключить P2P-раздачу обновлений Windows (Delivery Opt)',
    desc: 'Запрещает Windows раздавать файлы обновлений другим ПК и забивать канал',
    defaultEnabled: false,
    bat: String.raw`echo Отключение P2P-оптимизации доставки обновлений...
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" /v "DODownloadMode" /t REG_DWORD /d 0 /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение P2P-оптимизации доставки обновлений..." -ForegroundColor Cyan
New-Item -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" -Name "DODownloadMode" -Value 0 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'nagleDisable',
    category: 'network',
    impactTag: '-Джиттер пинга',
    title: 'Отключить алгоритм Нагла (TcpAckFrequency / TCPNoDelay)',
    desc: 'Убирает микробуферизацию мелких пакетов — снижает скачки пинга в онлайн-играх',
    defaultEnabled: false,
    bat: String.raw`echo Отключение алгоритма Нагла для сетевых адаптеров...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces' | ForEach-Object { Set-ItemProperty -Path $_.PSPath -Name 'TcpAckFrequency' -Value 1 -ErrorAction SilentlyContinue; Set-ItemProperty -Path $_.PSPath -Name 'TCPNoDelay' -Value 1 -ErrorAction SilentlyContinue }" >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение алгоритма Нагла для сетевых адаптеров..." -ForegroundColor Cyan
Get-ChildItem "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" | ForEach-Object {
  Set-ItemProperty -Path $_.PSPath -Name "TcpAckFrequency" -Value 1 -ErrorAction SilentlyContinue
  Set-ItemProperty -Path $_.PSPath -Name "TCPNoDelay" -Value 1 -ErrorAction SilentlyContinue
}`,
  },
  {
    id: 'nicPowerSavingOff',
    category: 'network',
    impactTag: 'Сеть без обрывов',
    title: 'Запретить отключение сетевой карты / Wi-Fi для экономии энергии',
    desc: 'Не даёт Windows усыплять Ethernet/Wi-Fi адаптер во время матчей',
    defaultEnabled: false,
    bat: String.raw`echo Отключение энергосбережения сетевых адаптеров...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetAdapter -Physical -ErrorAction SilentlyContinue | ForEach-Object { Disable-NetAdapterPowerManagement -Name $_.Name -ErrorAction SilentlyContinue }" >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение энергосбережения сетевых адаптеров..." -ForegroundColor Cyan
Get-NetAdapter -Physical -ErrorAction SilentlyContinue | ForEach-Object {
  Disable-NetAdapterPowerManagement -Name $_.Name -ErrorAction SilentlyContinue
}`,
  },
  {
    id: 'memoryStorageBoost',
    category: 'network',
    impactTag: 'Быстрее SSD',
    title: 'Ускорить NTFS (DisableLastAccess = 1)',
    desc: 'Снижает лишние операции записи на SSD (без отключения системных дампов и защиты)',
    defaultEnabled: false,
    bat: String.raw`echo Включение ускорения NTFS (DisableLastAccess = 1)...
fsutil behavior set disablelastaccess 1 >nul 2>&1`,
    ps1: String.raw`Write-Host "Включение ускорения NTFS (DisableLastAccess = 1)..." -ForegroundColor Cyan
fsutil behavior set disablelastaccess 1 | Out-Null`,
  },
  {
    id: 'dnsCloudflareQuad',
    category: 'network',
    impactTag: 'Быстрый DNS',
    title: 'Установить быстрый DNS Cloudflare (1.1.1.1 / 1.0.0.1)',
    desc: 'Ускоряет поиск игровых серверов и снижает задержку резолвинга IPv4',
    defaultEnabled: false,
    bat: String.raw`echo Настройка быстрого DNS Cloudflare (1.1.1.1)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses ('1.1.1.1','1.0.0.1') }" >nul 2>&1`,
    ps1: String.raw`Write-Host "Настройка быстрого DNS Cloudflare (1.1.1.1)..." -ForegroundColor Cyan
Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | ForEach-Object {
  Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses ("1.1.1.1","1.0.0.1") -ErrorAction SilentlyContinue
}`,
  },
  {
    id: 'noAutoRebootDuringGame',
    category: 'network',
    impactTag: 'Без ребута в игре',
    title: 'Запретить автоперезагрузку Windows при активном пользователе',
    desc: 'Windows установит обновления позже и не перезагрузит ПК посреди игры',
    defaultEnabled: false,
    bat: String.raw`echo Запрет внезапной перезагрузки Windows Update...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v "NoAutoRebootWithLoggedOnUsers" /t REG_DWORD /d 1 /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Запрет внезапной перезагрузки Windows Update..." -ForegroundColor Cyan
New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\WindowsUpdate\AU" -Name "NoAutoRebootWithLoggedOnUsers" -Value 1 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'nicLowLatencyBuffers',
    category: 'network',
    impactTag: '-Задержка NIC',
    title: 'Отключить буферизацию прерываний и EEE на сетевой карте',
    desc: 'Отключает Interrupt Moderation, Energy-Efficient Ethernet и Flow Control на активном адаптере',
    defaultEnabled: false,
    bat: String.raw`echo Настройка сетевого адаптера на минимальную задержку пакетов...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq 'Up'} | ForEach-Object { foreach ($k in @('*InterruptModeration','*EEE','GreenEthernet','*FlowControl','PowerSavingMode')) { Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword $k -RegistryValue 0 -NoRestart -ErrorAction SilentlyContinue } }" >nul 2>&1`,
    ps1: String.raw`Write-Host "Настройка сетевого адаптера на минимальную задержку пакетов..." -ForegroundColor Cyan
Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq 'Up'} | ForEach-Object {
  foreach ($k in @('*InterruptModeration','*EEE','GreenEthernet','*FlowControl','PowerSavingMode')) {
    Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword $k -RegistryValue 0 -NoRestart -ErrorAction SilentlyContinue
  }
}`,
  },
  {
    id: 'tcpRscAndEcnOptimize',
    category: 'network',
    impactTag: '-Скачки пинга',
    title: 'Отключить склейку пакетов RSC и ECN (включить RSS)',
    desc: 'Receive Segment Coalescing вызывает микрофризы и скачки пинга; RSS распределяет сеть по ядрам CPU',
    defaultEnabled: false,
    bat: String.raw`echo Оптимизация глобального стека TCP (RSS On, RSC/ECN/Timestamps Off)...
netsh int tcp set global rss=enabled >nul 2>&1
netsh int tcp set global rsc=disabled >nul 2>&1
netsh int tcp set global ecncapability=disabled >nul 2>&1
netsh int tcp set global timestamps=disabled >nul 2>&1
netsh int tcp set global nonsackrttresiliency=disabled >nul 2>&1`,
    ps1: String.raw`Write-Host "Оптимизация глобального стека TCP (RSS On, RSC/ECN/Timestamps Off)..." -ForegroundColor Cyan
netsh int tcp set global rss=enabled | Out-Null
netsh int tcp set global rsc=disabled | Out-Null
netsh int tcp set global ecncapability=disabled | Out-Null
netsh int tcp set global timestamps=disabled | Out-Null
netsh int tcp set global nonsackrttresiliency=disabled | Out-Null`,
  },
  {
    id: 'qosPacketSchedulerZero',
    category: 'network',
    impactTag: '+20% канала',
    title: 'Снять системный резерв полосы QoS (0% вместо 20%)',
    desc: 'Убирает политику Psched NonBestEffortLimit, ограничивающую канал фоновыми службами',
    defaultEnabled: false,
    bat: String.raw`echo Снятие 20%% резерва пропускной способности QoS...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Psched" /v "NonBestEffortLimit" /t REG_DWORD /d 0 /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Снятие 20% резерва пропускной способности QoS..." -ForegroundColor Cyan
New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Psched" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Psched" -Name "NonBestEffortLimit" -Value 0 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'disableNetBiosAndLlmnr',
    category: 'network',
    impactTag: '-Шум сети',
    title: 'Отключить лишние широковещательные запросы LLMNR и NetBIOS',
    desc: 'Убирает фоновый мультикаст-трафик поиска устройств в локальной сети во время игры',
    defaultEnabled: false,
    bat: String.raw`echo Отключение LLMNR и NetBIOS поверх TCP/IP...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient" /v "EnableMulticast" /t REG_DWORD /d 0 /f >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Services\NetBT\Parameters\Interfaces' -ErrorAction SilentlyContinue | ForEach-Object { Set-ItemProperty -Path $_.PSPath -Name 'NetbiosOptions' -Value 2 -ErrorAction SilentlyContinue }" >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение LLMNR и NetBIOS поверх TCP/IP..." -ForegroundColor Cyan
New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient" -Name "EnableMulticast" -Value 0 -ErrorAction SilentlyContinue
Get-ChildItem "HKLM:\SYSTEM\CurrentControlSet\Services\NetBT\Parameters\Interfaces" -ErrorAction SilentlyContinue | ForEach-Object {
  Set-ItemProperty -Path $_.PSPath -Name "NetbiosOptions" -Value 2 -ErrorAction SilentlyContinue
}`,
  },
  {
    id: 'tcpPortsAndTtlOptimize',
    category: 'network',
    impactTag: 'Быстрые сокеты',
    title: 'Расширить TCP-порты и ускорить освобождение сокетов',
    desc: 'Выставляет MaxUserPort=65534, TcpTimedWaitDelay=30 и DefaultTTL=64 для стабильных матчей',
    defaultEnabled: false,
    bat: String.raw`echo Оптимизация параметров TCP/IP (MaxUserPort, TcpTimedWaitDelay, DefaultTTL)...
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "MaxUserPort" /t REG_DWORD /d 65534 /f >nul 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpTimedWaitDelay" /t REG_DWORD /d 30 /f >nul 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpMaxDataRetransmissions" /t REG_DWORD /d 3 /f >nul 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DefaultTTL" /t REG_DWORD /d 64 /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Оптимизация параметров TCP/IP (MaxUserPort, TcpTimedWaitDelay, DefaultTTL)..." -ForegroundColor Cyan
$tcpParams = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
Set-ItemProperty -Path $tcpParams -Name "MaxUserPort" -Value 65534 -ErrorAction SilentlyContinue
Set-ItemProperty -Path $tcpParams -Name "TcpTimedWaitDelay" -Value 30 -ErrorAction SilentlyContinue
Set-ItemProperty -Path $tcpParams -Name "TcpMaxDataRetransmissions" -Value 3 -ErrorAction SilentlyContinue
Set-ItemProperty -Path $tcpParams -Name "DefaultTTL" -Value 64 -ErrorAction SilentlyContinue`,
  },
];

export const FAQ_DATA: FaqEntry[] = [
  {
    q: 'Почему в OptiCore нет твиков BCDEdit, отключения MPO и агрессивного урезания служб?',
    a: 'Внешние «секретные твики» вроде useplatformtick, OverlayTestMode=5, принудительного FSE и AutoEndTasks часто вызывают мерцание экрана, артефакты DX12, вылеты игр на загрузке и блокировки античитов (Vanguard, FACEIT AC). Мы оставили только безопасные и проверенные настройки, которые не ломают ПК и не приводят к банам.',
  },
  {
    q: 'Безопасно ли запускать сгенерированный скрипт и как он работает?',
    a: 'Да. Скрипт использует только стандартные команды Windows (powercfg, reg, netsh, fsutil, sc), сам запрашивает права администратора, создаёт точку восстановления и полностью обратим через вкладку «Откат».',
  },
  {
    q: 'Как правильно запустить .bat или .ps1 файл?',
    a: 'Достаточно двойного клика по скачанному .bat файлу — он сам запросит права администратора (UAC) и не закроется до нажатия клавиши. Для .ps1 также предусмотрен автозапрос прав администратора или запуск через PowerShell.',
  },
];

export function calculateOptimizationScore(
  checkedItems: Record<string, boolean>,
): OptimizationScore {
  let total = 0;
  let earned = 0;

  for (const group of CHECKLIST_DATA) {
    for (const item of group.items) {
      total += item.weight;
      if (checkedItems[item.id]) {
        earned += item.weight;
      }
    }
  }

  const percent = total > 0 ? Math.round((earned / total) * 100) : 0;
  const stabilityBonus = Math.round(percent * 0.25);

  if (percent === 0) {
    return {
      percent,
      stabilityBonus,
      label: 'Базовый сток',
      badgeClass: 'bg-zinc-800 text-zinc-300',
    };
  }
  if (percent < 50) {
    return {
      percent,
      stabilityBonus,
      label: 'Начальный тюнинг',
      badgeClass: 'bg-amber-500/20 text-amber-300',
    };
  }
  if (percent < 90) {
    return {
      percent,
      stabilityBonus,
      label: 'Игровой уровень',
      badgeClass: 'bg-zinc-700 text-white',
    };
  }
  return {
    percent,
    stabilityBonus,
    label: 'Максимум FPS',
    badgeClass: 'bg-emerald-500/20 text-emerald-300',
  };
}

function toBatchSafeEcho(text: string): string {
  return text
    .replace(/%/g, '')
    .replace(/[&|<>^]/g, ' ');
}

function toCrlf(text: string): string {
  return text.replace(/\r?\n/g, '\r\n');
}

const BAT_ADMIN_HEADER = `@echo off
chcp 65001 >nul 2>&1
title OptiCore PC Optimizer

net session >nul 2>&1
if not errorlevel 1 goto :ADMIN_OK

echo Запрос прав администратора для применения настроек Windows...
set "OPTICORE_SELF=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath $env:OPTICORE_SELF -Verb RunAs" >nul 2>&1
if not errorlevel 1 exit /b

echo.
echo [ВНИМАНИЕ] Скрипт запущен без прав администратора.
echo Нажмите правой кнопкой мыши по файлу и выберите Запуск от имени администратора.
echo.
pause
exit /b

:ADMIN_OK`;

const PS1_ADMIN_HEADER = `$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "Запрос прав администратора..." -ForegroundColor Yellow
  Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File \`"$PSCommandPath\`"" -Verb RunAs
  exit
}`;

export function generateOptimizationScript(
  format: ScriptFormat,
  selectedModules: Record<string, boolean>,
): string {
  const active = SCRIPT_MODULES.filter((m) => selectedModules[m.id]);

  if (format === 'bat') {
    let code = `${BAT_ADMIN_HEADER}
echo ==========================================
echo   OptiCore — Безопасная оптимизация ПК
echo ==========================================
echo.

`;
    if (active.length === 0) {
      code += `echo Выбери хотя бы один модуль слева!\n`;
    } else {
      code +=
        active
          .map(
            (m, i) =>
              `echo [${i + 1}/${active.length}] ${toBatchSafeEcho(m.title)}\n${m.bat}`,
          )
          .join('\n\n') +
        `\n\necho.\necho ==========================================\necho   Готово! Перезагрузи ПК для применения.\necho ==========================================\n`;
    }
    code += `pause\n`;
    return toCrlf(code);
  }

  let code = `# OptiCore PC Optimizer (PowerShell)
${PS1_ADMIN_HEADER}
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  OptiCore — Безопасная оптимизация ПК" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

`;
  if (active.length === 0) {
    code += `Write-Host "Выбери хотя бы один модуль слева!" -ForegroundColor Yellow\n`;
  } else {
    code +=
      active
        .map(
          (m, i) =>
            `Write-Host "[${i + 1}/${active.length}] ${m.title}" -ForegroundColor Gray\n${m.ps1}`,
        )
        .join('\n\n') +
      `\n\nWrite-Host ""\nWrite-Host "Готово! Перезагрузи ПК для применения всех настроек." -ForegroundColor Green\n`;
  }
  code += `Read-Host "Нажми Enter для выхода"`;
  return code;
}

export function generateRollbackScript(format: ScriptFormat): string {
  if (format === 'bat') {
    return toCrlf(String.raw`${BAT_ADMIN_HEADER}
echo Возврат параметров Windows по умолчанию и очистка рискованных флагов...
powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e >nul 2>&1
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 5 >nul 2>&1
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMIN 5 >nul 2>&1
powercfg -setacvalueindex SCHEME_CURRENT SUB_PCIEXPRESS ASPM 2 >nul 2>&1
powercfg /setactive SCHEME_CURRENT >nul 2>&1
bcdedit /deletevalue disabledynamictick >nul 2>&1
bcdedit /deletevalue useplatformtick >nul 2>&1
reg add "HKCU\System\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 1 /f >nul 2>&1
reg delete "HKCU\System\GameConfigStore" /v "GameDVR_FSEBehaviorMode" /f >nul 2>&1
reg delete "HKCU\System\GameConfigStore" /v "GameDVR_HonorUserFSEBehaviorMode" /f >nul 2>&1
reg delete "HKCU\System\GameConfigStore" /v "GameDVR_DXGIHonorFSEWindowsCompatible" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "NetworkThrottlingIndex" /t REG_DWORD /d 10 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "SystemResponsiveness" /t REG_DWORD /d 20 /f >nul 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl" /v "Win32PrioritySeparation" /t REG_DWORD /d 2 /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" /v "PowerThrottlingOff" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\Dwm" /v "OverlayTestMode" /f >nul 2>&1
reg add "HKCU\Control Panel\Mouse" /v "MouseSpeed" /t REG_SZ /d "1" /f >nul 2>&1
reg add "HKCU\Control Panel\Mouse" /v "MouseThreshold1" /t REG_SZ /d "6" /f >nul 2>&1
reg add "HKCU\Control Panel\Mouse" /v "MouseThreshold2" /t REG_SZ /d "10" /f >nul 2>&1
reg add "HKCU\Control Panel\Desktop" /v "MenuShowDelay" /t REG_SZ /d "400" /f >nul 2>&1
reg add "HKCU\Control Panel\Desktop" /v "AutoEndTasks" /t REG_SZ /d "0" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" /v "EnableTransparency" /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" /v "GlobalUserDisabled" /t REG_DWORD /d 0 /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\USB" /v "DisableSelectiveSuspend" /f >nul 2>&1
sc config DiagTrack start= auto >nul 2>&1
sc start DiagTrack >nul 2>&1
netsh int tcp set global rsc=enabled >nul 2>&1
netsh int tcp set global ecncapability=default >nul 2>&1
netsh int tcp set global timestamps=default >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\Psched" /v "NonBestEffortLimit" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient" /v "EnableMulticast" /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "MaxUserPort" /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpTimedWaitDelay" /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpMaxDataRetransmissions" /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DefaultTTL" /f >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses }; Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq 'Up'} | ForEach-Object { Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword '*InterruptModeration' -RegistryValue 1 -NoRestart -ErrorAction SilentlyContinue }" >nul 2>&1
echo.
echo Готово! Перезагрузи ПК для полного отката.
pause
`);
  }

  return String.raw`# OptiCore Rollback — Возврат параметров Windows в сток
${PS1_ADMIN_HEADER}
Write-Host "Возврат параметров Windows по умолчанию и очистка рискованных флагов..." -ForegroundColor Yellow
powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e | Out-Null
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 5 | Out-Null
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMIN 5 | Out-Null
powercfg -setacvalueindex SCHEME_CURRENT SUB_PCIEXPRESS ASPM 2 | Out-Null
powercfg /setactive SCHEME_CURRENT | Out-Null
bcdedit /deletevalue disabledynamictick | Out-Null
bcdedit /deletevalue useplatformtick | Out-Null
Set-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Value 1 -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_FSEBehaviorMode" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_HonorUserFSEBehaviorMode" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_DXGIHonorFSEWindowsCompatible" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "NetworkThrottlingIndex" -Value 10 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "SystemResponsiveness" -Value 20 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" -Name "Win32PrioritySeparation" -Value 2 -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" -Name "PowerThrottlingOff" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\Dwm" -Name "OverlayTestMode" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseSpeed" -Value "1" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseThreshold1" -Value "6" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseThreshold2" -Value "10" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "MenuShowDelay" -Value "400" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "AutoEndTasks" -Value "0" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "EnableTransparency" -Value 1 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 0 -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USB" -Name "DisableSelectiveSuspend" -ErrorAction SilentlyContinue
Set-Service "DiagTrack" -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service "DiagTrack" -ErrorAction SilentlyContinue
netsh int tcp set global rsc=enabled | Out-Null
netsh int tcp set global ecncapability=default | Out-Null
netsh int tcp set global timestamps=default | Out-Null
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Psched" -Name "NonBestEffortLimit" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient" -Name "EnableMulticast" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "MaxUserPort" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpTimedWaitDelay" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpMaxDataRetransmissions" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "DefaultTTL" -ErrorAction SilentlyContinue
Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses -ErrorAction SilentlyContinue }
Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq 'Up'} | ForEach-Object { Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword '*InterruptModeration' -RegistryValue 1 -NoRestart -ErrorAction SilentlyContinue }
Write-Host "Готово! Перезагрузи ПК для полного отката." -ForegroundColor Green
Read-Host "Нажми Enter для выхода"`;
}

export interface WingetUpdateOptions {
  includeUnknown?: boolean;
  silent?: boolean;
}

export function buildWingetUpgradeCommand(options: WingetUpdateOptions = {}): string {
  const parts = ['winget upgrade --all'];
  if (options.includeUnknown) {
    parts.push('--include-unknown');
  }
  if (options.silent) {
    parts.push('--silent');
  }
  parts.push('--accept-package-agreements', '--accept-source-agreements');
  return parts.join(' ');
}

export function generateWingetUpdateScript(options: WingetUpdateOptions = {}): string {
  const upgradeCmd = buildWingetUpgradeCommand(options);
  return toCrlf(String.raw`${BAT_ADMIN_HEADER}
title OptiCore — Обновление программ через CMD (winget)
echo ====================================================
echo   OptiCore — Обновление всех программ через winget
echo ====================================================
echo.

where winget >nul 2>&1
if errorlevel 1 (
  echo [ОШИБКА] Команда winget не найдена в системе.
  echo Откройте Microsoft Store, найдите "Установщик приложений" ^(App Installer^)
  echo от Microsoft и нажмите "Установить" или "Обновить", затем запустите файл снова.
  echo.
  pause
  exit /b 1
)

echo [1/2] Обновление базы источников winget...
winget source update
echo.
echo [2/2] Поиск и обновление установленных программ...
${upgradeCmd}
echo.
if errorlevel 1 (
  echo [ИНФО] Часть программ могла быть запущена или не требует обновления.
  echo Закройте программы из трея ^(Discord, Steam, браузер^) или выполните:
  echo   winget source reset --force ^&^& winget source update
) else (
  echo [ГОТОВО] Все найденные обновления успешно обработаны.
)
echo.
pause
`);
}

