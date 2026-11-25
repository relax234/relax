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
        title: 'Отключены лишние оверлеи (Discord, Xbox Game Bar)',
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
  // === SYSTEM (5) ===
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
    desc: 'Активирует скрытый профиль Ultimate Performance без сброса частот',
    defaultEnabled: true,
    bat: String.raw`echo Активация схемы Максимальной производительности...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d = powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>$null; if ($d -match '([0-9a-fA-F-]{36})') { powercfg /setactive $matches[1] } else { powercfg /setactive SCHEME_MIN }" >nul 2>&1`,
    ps1: String.raw`Write-Host "Активация схемы Максимальной производительности..." -ForegroundColor Cyan
$dup = powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>$null
if ($dup -match '([0-9a-fA-F-]{36})') { powercfg /setactive $matches[1] | Out-Null } else { powercfg /setactive SCHEME_MIN | Out-Null }`,
  },
  {
    id: 'timerResolutionBcd',
    category: 'system',
    impactTag: 'Ровный FrameTime',
    title: 'Стабилизировать системный таймер (BCDEDIT)',
    desc: 'Отключает плавающий тик (disabledynamictick) для ровного фреймтайма в играх',
    defaultEnabled: false,
    bat: String.raw`echo Настройка системного таймера BCDEDIT...
bcdedit /set disabledynamictick yes >nul 2>&1
bcdedit /set useplatformtick yes >nul 2>&1`,
    ps1: String.raw`Write-Host "Настройка системного таймера BCDEDIT..." -ForegroundColor Cyan
bcdedit /set disabledynamictick yes | Out-Null
bcdedit /set useplatformtick yes | Out-Null`,
  },
  {
    id: 'disableHibernation',
    category: 'system',
    impactTag: '+4–16 ГБ SSD',
    title: 'Отключить гибернацию и Fast Startup (hiberfil.sys)',
    desc: 'Освобождает место на SSD и убирает накопительные ошибки ядра после перезагрузки',
    defaultEnabled: false,
    bat: String.raw`echo Отключение гибернации...
powercfg /h off >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение гибернации..." -ForegroundColor Cyan
powercfg /h off`,
  },
  {
    id: 'telemetryLite',
    category: 'system',
    impactTag: '-Фон CPU',
    title: 'Отключить телеметрию диагностики (DiagTrack)',
    desc: 'Останавливает фоновую отправку отчётов использования Windows',
    defaultEnabled: false,
    bat: String.raw`echo Отключение службы DiagTrack и dmwappushservice...
sc stop DiagTrack >nul 2>&1
sc config DiagTrack start= disabled >nul 2>&1
sc stop dmwappushservice >nul 2>&1
sc config dmwappushservice start= disabled >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение службы DiagTrack..." -ForegroundColor Cyan
Stop-Service "DiagTrack" -Force -ErrorAction SilentlyContinue
Set-Service "DiagTrack" -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service "dmwappushservice" -Force -ErrorAction SilentlyContinue
Set-Service "dmwappushservice" -StartupType Disabled -ErrorAction SilentlyContinue`,
  },
  {
    id: 'cpuCoreParkingOff',
    category: 'system',
    impactTag: '-Статтеры CPU',
    title: 'Отключить парковку ядер процессора (100% активных ядер)',
    desc: 'Запрещает Windows усыплять ядра CPU в простое — убирает резкие просадки FPS',
    defaultEnabled: false,
    bat: String.raw`echo Отключение парковки ядер CPU (CPMINCORES = 100)...
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 100 >nul 2>&1
powercfg /setactive SCHEME_CURRENT >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение парковки ядер CPU..." -ForegroundColor Cyan
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 100 | Out-Null
powercfg /setactive SCHEME_CURRENT | Out-Null`,
  },
  {
    id: 'disableErrorReporting',
    category: 'system',
    impactTag: '-Фоновый диск',
    title: 'Отключить отчёты об ошибках (WerSvc) и веб-поиск Bing',
    desc: 'Убирает фоновый сбор дампов WerSvc и тормоза поиска в меню Пуск',
    defaultEnabled: false,
    bat: String.raw`echo Отключение службы отчётов WerSvc и веб-поиска в Пуске...
sc stop WerSvc >nul 2>&1
sc config WerSvc start= disabled >nul 2>&1
reg add "HKCU\Software\Policies\Microsoft\Windows\Explorer" /v "DisableSearchBoxSuggestions" /t REG_DWORD /d 1 /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение WerSvc и веб-поиска в Пуске..." -ForegroundColor Cyan
Stop-Service "WerSvc" -Force -ErrorAction SilentlyContinue
Set-Service "WerSvc" -StartupType Disabled -ErrorAction SilentlyContinue
New-Item -Path "HKCU:\Software\Policies\Microsoft\Windows\Explorer" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Policies\Microsoft\Windows\Explorer" -Name "DisableSearchBoxSuggestions" -Value 1 -ErrorAction SilentlyContinue`,
  },

  // === GAMING & GPU (5) ===
  {
    id: 'gameTweaks',
    category: 'gaming',
    impactTag: '1% Low FPS',
    title: 'Игровые твики реестра (GameDVR Off + SystemResponsiveness)',
    desc: 'Отключает фоновую запись Xbox GameDVR и лимит сетевых пакетов',
    defaultEnabled: true,
    bat: String.raw`echo Применение игровых твиков реестра...
reg add "HKCU\System\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 0 /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "NetworkThrottlingIndex" /t REG_DWORD /d 4294967295 /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "SystemResponsiveness" /t REG_DWORD /d 0 /f >nul`,
    ps1: String.raw`Write-Host "Применение игровых твиков реестра..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Value 0 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "NetworkThrottlingIndex" -Value 0xffffffff -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "SystemResponsiveness" -Value 0 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'gpuPriority',
    category: 'gaming',
    impactTag: 'MMCSS GPU',
    title: 'Высший приоритет GPU и CPU для игр (MMCSS)',
    desc: 'Выделяет играм максимальный приоритет планировщика Windows (Tasks\\Games)',
    defaultEnabled: false,
    bat: String.raw`echo Настройка приоритета GPU/CPU для игр (MMCSS)...
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" /v "GPU Priority" /t REG_DWORD /d 8 /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" /v "Priority" /t REG_DWORD /d 6 /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" /v "Scheduling Category" /t REG_SZ /d "High" /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" /v "SFIO Priority" /t REG_SZ /d "High" /f >nul`,
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
    desc: 'Активирует аппаратное планирование GPU (требуется перезагрузка)',
    defaultEnabled: false,
    bat: String.raw`echo Включение HAGS и Игрового режима Windows...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" /v "HwSchMode" /t REG_DWORD /d 2 /f >nul
reg add "HKCU\Software\Microsoft\GameBar" /v "AllowAutoGameMode" /t REG_DWORD /d 1 /f >nul
reg add "HKCU\Software\Microsoft\GameBar" /v "AutoGameModeEnabled" /t REG_DWORD /d 1 /f >nul`,
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
    desc: 'Популярный киберспортивный твик (0x26): отдаёт короткие кванты CPU активной игре',
    defaultEnabled: false,
    bat: String.raw`echo Настройка Win32PrioritySeparation (0x26 / 38)...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl" /v "Win32PrioritySeparation" /t REG_DWORD /d 38 /f >nul`,
    ps1: String.raw`Write-Host "Настройка Win32PrioritySeparation (0x26 / 38)..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" -Name "Win32PrioritySeparation" -Value 38 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'disableFullscreenOpt',
    category: 'gaming',
    impactTag: '-Статтеры MPO',
    title: 'Отключить MPO и повысить плавность DWM (OverlayTestMode=5)',
    desc: 'Убирает микроподёргивания и мерцания в играх и при Alt-Tab на Windows 10/11',
    defaultEnabled: false,
    bat: String.raw`echo Отключение Multi-Plane Overlay (MPO)...
reg add "HKLM\SOFTWARE\Microsoft\Windows\Dwm" /v "OverlayTestMode" /t REG_DWORD /d 5 /f >nul`,
    ps1: String.raw`Write-Host "Отключение Multi-Plane Overlay (MPO)..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\Dwm" -Name "OverlayTestMode" -Value 5 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'disablePowerThrottling',
    category: 'gaming',
    impactTag: 'Макс. частота CPU',
    title: 'Отключить системный Power Throttling (Windows 10/11)',
    desc: 'Запрещает планировщику Windows искусственно занижать частоты потоков игр',
    defaultEnabled: false,
    bat: String.raw`echo Отключение Power Throttling...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" /v "PowerThrottlingOff" /t REG_DWORD /d 1 /f >nul`,
    ps1: String.raw`Write-Host "Отключение Power Throttling..." -ForegroundColor Cyan
New-Item -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" -Name "PowerThrottlingOff" -Value 1 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'highProcessPriorityFse',
    category: 'gaming',
    impactTag: 'Плавный Alt-Tab',
    title: 'Оптимизировать полноэкранный режим DX11/DX12 (FSE)',
    desc: 'Уменьшает задержку вывода кадра в играх через DXGI Honor FSE',
    defaultEnabled: false,
    bat: String.raw`echo Настройка FSEBehaviorMode для полноэкранных игр...
reg add "HKCU\System\GameConfigStore" /v "GameDVR_FSEBehaviorMode" /t REG_DWORD /d 2 /f >nul
reg add "HKCU\System\GameConfigStore" /v "GameDVR_HonorUserFSEBehaviorMode" /t REG_DWORD /d 1 /f >nul
reg add "HKCU\System\GameConfigStore" /v "GameDVR_DXGIHonorFSEWindowsCompatible" /t REG_DWORD /d 1 /f >nul`,
    ps1: String.raw`Write-Host "Настройка FSEBehaviorMode для полноэкранных игр..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_FSEBehaviorMode" -Value 2 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_HonorUserFSEBehaviorMode" -Value 1 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_DXGIHonorFSEWindowsCompatible" -Value 1 -ErrorAction SilentlyContinue`,
  },

  // === INPUT & OVERLAYS (5) ===
  {
    id: 'mouseRawInput',
    category: 'input',
    impactTag: '1:1 Мышь',
    title: 'Отключить акселерацию мыши Windows',
    desc: 'Отключает «повышенную точность указателя» для честного отклика в шутерах',
    defaultEnabled: false,
    bat: String.raw`echo Отключение акселерации мыши (MouseSpeed=0)...
reg add "HKCU\Control Panel\Mouse" /v "MouseSpeed" /t REG_SZ /d "0" /f >nul
reg add "HKCU\Control Panel\Mouse" /v "MouseThreshold1" /t REG_SZ /d "0" /f >nul
reg add "HKCU\Control Panel\Mouse" /v "MouseThreshold2" /t REG_SZ /d "0" /f >nul`,
    ps1: String.raw`Write-Host "Отключение акселерации мыши (MouseSpeed=0)..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseSpeed" -Value "0" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseThreshold1" -Value "0" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseThreshold2" -Value "0" -ErrorAction SilentlyContinue`,
  },
  {
    id: 'disableOverlays',
    category: 'input',
    impactTag: '-Микрофризы',
    title: 'Отключить Xbox Game Bar и фон приложений UWP',
    desc: 'Убирает фоновый оверлей записи и скрытую активность системных приложений',
    defaultEnabled: false,
    bat: String.raw`echo Отключение Xbox Game Bar и фоновых UWP-приложений...
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" /v "AppCaptureEnabled" /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Software\Microsoft\GameBar" /v "UseNexusForGameBarEnabled" /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" /v "GlobalUserDisabled" /t REG_DWORD /d 1 /f >nul`,
    ps1: String.raw`Write-Host "Отключение Xbox Game Bar и фоновых UWP-приложений..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" -Name "AppCaptureEnabled" -Value 0 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Software\Microsoft\GameBar" -Name "UseNexusForGameBarEnabled" -Value 0 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 1 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'visualEffectsPerf',
    category: 'input',
    impactTag: '-Input Lag',
    title: 'Убрать прозрачность и лишнюю анимацию окон',
    desc: 'Снижает нагрузку на DWM-композитор Windows и ускоряет отклик в оконном режиме',
    defaultEnabled: false,
    bat: String.raw`echo Отключение прозрачности интерфейса...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" /v "EnableTransparency" /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Control Panel\Desktop\WindowMetrics" /v "MinAnimate" /t REG_SZ /d "0" /f >nul`,
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
reg add "HKCU\Control Panel\Accessibility\StickyKeys" /v "Flags" /t REG_SZ /d "506" /f >nul
reg add "HKCU\Control Panel\Accessibility\Keyboard Response" /v "Flags" /t REG_SZ /d "122" /f >nul
reg add "HKCU\Control Panel\Accessibility\ToggleKeys" /v "Flags" /t REG_SZ /d "58" /f >nul`,
    ps1: String.raw`Write-Host "Отключение залипания клавиш..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\Control Panel\Accessibility\StickyKeys" -Name "Flags" -Value "506" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Accessibility\Keyboard Response" -Name "Flags" -Value "122" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Accessibility\ToggleKeys" -Name "Flags" -Value "58" -ErrorAction SilentlyContinue`,
  },
  {
    id: 'usbPowerSavingOff',
    category: 'input',
    impactTag: 'Стабильный USB',
    title: 'Запретить отключение питания USB (DisableSelectiveSuspend)',
    desc: 'Мышь, клавиатура и гарнитура не засыпают в простое и не теряют отклик',
    defaultEnabled: false,
    bat: String.raw`echo Отключение энергосбережения USB-портов...
reg add "HKLM\SYSTEM\CurrentControlSet\Services\USB" /v "DisableSelectiveSuspend" /t REG_DWORD /d 1 /f >nul
powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 >nul 2>&1
powercfg /setactive SCHEME_CURRENT >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение энергосбережения USB-портов..." -ForegroundColor Cyan
New-Item -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USB" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USB" -Name "DisableSelectiveSuspend" -Value 1 -ErrorAction SilentlyContinue
powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 | Out-Null`,
  },
  {
    id: 'audioLatencyBoost',
    category: 'input',
    impactTag: '-DPC Звука',
    title: 'Приоритет аудиопотока Windows (Tasks\\Audio)',
    desc: 'Снижает микрозадержки и треск звука в шутерах при высокой нагрузке CPU',
    defaultEnabled: false,
    bat: String.raw`echo Оптимизация приоритета Tasks\Audio...
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Audio" /v "Priority" /t REG_DWORD /d 6 /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Audio" /v "Scheduling Category" /t REG_SZ /d "High" /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Audio" /v "SFIO Priority" /t REG_SZ /d "High" /f >nul`,
    ps1: String.raw`Write-Host "Оптимизация приоритета Tasks\Audio..." -ForegroundColor Cyan
$audioPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Audio"
Set-ItemProperty -Path $audioPath -Name "Priority" -Value 6 -ErrorAction SilentlyContinue
Set-ItemProperty -Path $audioPath -Name "Scheduling Category" -Value "High" -ErrorAction SilentlyContinue
Set-ItemProperty -Path $audioPath -Name "SFIO Priority" -Value "High" -ErrorAction SilentlyContinue`,
  },
  {
    id: 'csrWaitAndMenuDelay',
    category: 'input',
    impactTag: 'Быстрый UI',
    title: 'Мгновенный отклик интерфейса (MenuShowDelay = 0)',
    desc: 'Убирает задержки открытия меню и ускоряет реакцию рабочего стола',
    defaultEnabled: false,
    bat: String.raw`echo Ускорение отклика интерфейса Desktop...
reg add "HKCU\Control Panel\Desktop" /v "MenuShowDelay" /t REG_SZ /d "0" /f >nul
reg add "HKCU\Control Panel\Desktop" /v "HungAppTimeout" /t REG_SZ /d "1000" /f >nul
reg add "HKCU\Control Panel\Desktop" /v "AutoEndTasks" /t REG_SZ /d "1" /f >nul`,
    ps1: String.raw`Write-Host "Ускорение отклика интерфейса Desktop..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "MenuShowDelay" -Value "0" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "HungAppTimeout" -Value "1000" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "AutoEndTasks" -Value "1" -ErrorAction SilentlyContinue`,
  },

  // === NETWORK & STORAGE (5) ===
  {
    id: 'cleanTemp',
    category: 'network',
    impactTag: 'Очистка SSD',
    title: 'Очистить временные файлы (%TEMP%, Windows Temp, D3DSCache)',
    desc: 'Безопасно удаляет временный мусор и старый кэш шейдеров DirectX',
    defaultEnabled: true,
    bat: String.raw`echo Очистка временных файлов и кэша DirectX...
del /s /f /q "%temp%\*.*" >nul 2>&1
del /s /f /q "C:\Windows\Temp\*.*" >nul 2>&1
del /s /f /q "%localappdata%\D3DSCache\*.*" >nul 2>&1`,
    ps1: String.raw`Write-Host "Очистка временных файлов и кэша DirectX..." -ForegroundColor Cyan
Remove-Item "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:LOCALAPPDATA\D3DSCache\*" -Recurse -Force -ErrorAction SilentlyContinue`,
  },
  {
    id: 'dnsFlush',
    category: 'network',
    impactTag: '-Пинг',
    title: 'Сбросить кэш DNS и обновить сетевой стек',
    desc: 'Очищает устаревшие маршруты и переводит TCP Autotuning в игровой режим',
    defaultEnabled: false,
    bat: String.raw`echo Сброс DNS-кэша и оптимизация TCP...
ipconfig /flushdns >nul
netsh int tcp set global autotuninglevel=normal >nul 2>&1
netsh int tcp set global ecncapability=disabled >nul 2>&1`,
    ps1: String.raw`Write-Host "Сброс DNS-кэша и оптимизация TCP..." -ForegroundColor Cyan
Clear-DnsClientCache
netsh int tcp set global autotuninglevel=normal | Out-Null
netsh int tcp set global ecncapability=disabled | Out-Null`,
  },
  {
    id: 'disableP2PUpdate',
    category: 'network',
    impactTag: 'Стабильный пинг',
    title: 'Отключить P2P-раздачу обновлений Windows (Delivery Opt)',
    desc: 'Запрещает Windows раздавать файлы обновлений другим ПК и забивать канал',
    defaultEnabled: false,
    bat: String.raw`echo Отключение P2P-оптимизации доставки обновлений...
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" /v "DODownloadMode" /t REG_DWORD /d 0 /f >nul`,
    ps1: String.raw`Write-Host "Отключение P2P-оптимизации доставки обновлений..." -ForegroundColor Cyan
New-Item -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" -Name "DODownloadMode" -Value 0 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'nagleDisable',
    category: 'network',
    impactTag: '-Пинг / Лаги',
    title: 'Отключить алгоритм Нагла (TcpAckFrequency / TCPNoDelay)',
    desc: 'Сетевые пакеты отправляются мгновенно без буферизации — снижает джиттер пинга',
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
    id: 'memoryStorageBoost',
    category: 'network',
    impactTag: 'Быстрее SSD',
    title: 'Ускорить NTFS (DisableLastAccess) и отключить дампы памяти',
    desc: 'Снижает лишние операции записи на SSD при чтении файлов в играх',
    defaultEnabled: false,
    bat: String.raw`echo Оптимизация NTFS и отключение лишних дампов...
fsutil behavior set disablelastaccess 1 >nul 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Control\CrashControl" /v "CrashDumpEnabled" /t REG_DWORD /d 0 /f >nul 2>&1`,
    ps1: String.raw`Write-Host "Оптимизация NTFS и отключение лишних дампов..." -ForegroundColor Cyan
fsutil behavior set disablelastaccess 1 | Out-Null
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\CrashControl" -Name "CrashDumpEnabled" -Value 0 -ErrorAction SilentlyContinue`,
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
    id: 'disableRemoteAndMaps',
    category: 'network',
    impactTag: '-Фон службы',
    title: 'Отключить фоновые карты и факс (MapsBroker / Fax / RemoteReg)',
    desc: 'Освобождает оперативную память от неиспользуемых сетевых служб Windows',
    defaultEnabled: false,
    bat: String.raw`echo Отключение служб MapsBroker, Fax и RemoteRegistry...
sc stop MapsBroker >nul 2>&1
sc config MapsBroker start= disabled >nul 2>&1
sc config Fax start= disabled >nul 2>&1
sc config RemoteRegistry start= disabled >nul 2>&1`,
    ps1: String.raw`Write-Host "Отключение служб MapsBroker, Fax и RemoteRegistry..." -ForegroundColor Cyan
foreach ($svc in @("MapsBroker","Fax","RemoteRegistry")) {
  Stop-Service $svc -Force -ErrorAction SilentlyContinue
  Set-Service $svc -StartupType Disabled -ErrorAction SilentlyContinue
}`,
  },
];

export const FAQ_DATA: FaqEntry[] = [
  {
    q: 'Безопасно ли запускать сгенерированный скрипт?',
    a: 'Да. В скрипте используются только встроенные утилиты Windows (powercfg, reg, ipconfig, netsh, bcdedit, fsutil, sc). Весь код открыт перед скачиванием, первый пункт создаёт точку восстановления, а также доступен скрипт отката в сток.',
  },
  {
    q: 'Как правильно запустить .bat или .ps1 файл?',
    a: 'Для .bat: нажми правой кнопкой мыши по скачанному файлу → «Запуск от имени администратора». Для .ps1: открой PowerShell от имени администратора и запусти скрипт.',
  },
  {
    q: 'Почему не стоит использовать «авто-оптимизаторы» и чистильщики реестра?',
    a: 'Большинство бесплатных программ-ускорителей сами висят в автозагрузке, потребляют ОЗУ, показывают рекламу или ломают системные службы Windows без возможности отката.',
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
      badgeClass: 'bg-slate-800 text-slate-300',
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
      badgeClass: 'bg-cyan-500/20 text-cyan-300',
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
echo Возврат параметров Windows по умолчанию...
powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e >nul 2>&1
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 5 >nul 2>&1
powercfg /setactive SCHEME_CURRENT >nul 2>&1
powercfg /h on >nul 2>&1
bcdedit /deletevalue disabledynamictick >nul 2>&1
bcdedit /deletevalue useplatformtick >nul 2>&1
reg add "HKCU\System\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 1 /f >nul 2>&1
reg delete "HKCU\System\GameConfigStore" /v "GameDVR_FSEBehaviorMode" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "NetworkThrottlingIndex" /t REG_DWORD /d 10 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "SystemResponsiveness" /t REG_DWORD /d 20 /f >nul 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl" /v "Win32PrioritySeparation" /t REG_DWORD /d 2 /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" /v "PowerThrottlingOff" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\Dwm" /v "OverlayTestMode" /f >nul 2>&1
reg add "HKCU\Control Panel\Mouse" /v "MouseSpeed" /t REG_SZ /d "1" /f >nul 2>&1
reg add "HKCU\Control Panel\Mouse" /v "MouseThreshold1" /t REG_SZ /d "6" /f >nul 2>&1
reg add "HKCU\Control Panel\Mouse" /v "MouseThreshold2" /t REG_SZ /d "10" /f >nul 2>&1
reg add "HKCU\Control Panel\Desktop" /v "MenuShowDelay" /t REG_SZ /d "400" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" /v "EnableTransparency" /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" /v "GlobalUserDisabled" /t REG_DWORD /d 0 /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\USB" /v "DisableSelectiveSuspend" /f >nul 2>&1
sc config DiagTrack start= auto >nul 2>&1
sc start DiagTrack >nul 2>&1
sc config WerSvc start= demand >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses }" >nul 2>&1
echo.
echo Готово! Перезагрузи ПК для полного отката.
pause
`);
  }

  return String.raw`# OptiCore Rollback — Возврат параметров Windows в сток
${PS1_ADMIN_HEADER}
Write-Host "Возврат параметров Windows по умолчанию..." -ForegroundColor Yellow
powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e | Out-Null
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 5 | Out-Null
powercfg /setactive SCHEME_CURRENT | Out-Null
powercfg /h on
bcdedit /deletevalue disabledynamictick | Out-Null
bcdedit /deletevalue useplatformtick | Out-Null
Set-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Value 1 -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_FSEBehaviorMode" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "NetworkThrottlingIndex" -Value 10 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "SystemResponsiveness" -Value 20 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" -Name "Win32PrioritySeparation" -Value 2 -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" -Name "PowerThrottlingOff" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\Dwm" -Name "OverlayTestMode" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseSpeed" -Value "1" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseThreshold1" -Value "6" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Mouse" -Name "MouseThreshold2" -Value "10" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "MenuShowDelay" -Value "400" -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "EnableTransparency" -Value 1 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 0 -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USB" -Name "DisableSelectiveSuspend" -ErrorAction SilentlyContinue
Set-Service "DiagTrack" -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service "DiagTrack" -ErrorAction SilentlyContinue
Set-Service "WerSvc" -StartupType Manual -ErrorAction SilentlyContinue
Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses -ErrorAction SilentlyContinue }
Write-Host "Готово! Перезагрузи ПК для полного отката." -ForegroundColor Green
Read-Host "Нажми Enter для выхода"`;
}
