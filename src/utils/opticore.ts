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

export interface ScriptModule {
  id: string;
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
  {
    id: 'restorePoint',
    title: 'Создать точку восстановления (рекомендуется)',
    desc: 'Автоматический бэкап реестра перед применением твиков',
    defaultEnabled: true,
    bat: String.raw`echo [1/6] Создание точки восстановления...
powershell -Command "Checkpoint-Computer -Description 'OptiCore_Backup' -RestorePointType 'MODIFY_SETTINGS'" 2>nul`,
    ps1: String.raw`Write-Host "[1/6] Создание точки восстановления..." -ForegroundColor Cyan
Checkpoint-Computer -Description "OptiCore_Backup" -RestorePointType "MODIFY_SETTINGS" -ErrorAction SilentlyContinue`,
  },
  {
    id: 'ultimatePower',
    title: 'Включить схему «Максимальная производительность»',
    desc: 'Активирует скрытый профиль Ultimate Performance',
    defaultEnabled: true,
    bat: String.raw`echo [2/6] Активация схемы Максимальной производительности...
powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 >nul
powercfg /setactive SCHEME_MIN`,
    ps1: String.raw`Write-Host "[2/6] Активация схемы Максимальной производительности..." -ForegroundColor Cyan
powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 | Out-Null
powercfg /setactive SCHEME_MIN`,
  },
  {
    id: 'cleanTemp',
    title: 'Очистить временные файлы (%TEMP% и Windows Temp)',
    desc: 'Безопасно удаляет кэш без потери личных данных',
    defaultEnabled: true,
    bat: String.raw`echo [3/6] Очистка временных файлов...
del /s /f /q "%temp%\*.*" >nul 2>&1
del /s /f /q "C:\Windows\Temp\*.*" >nul 2>&1`,
    ps1: String.raw`Write-Host "[3/6] Очистка временных файлов..." -ForegroundColor Cyan
Remove-Item "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue`,
  },
  {
    id: 'gameTweaks',
    title: 'Игровые твики реестра (GameDVR Off + Network Throttling)',
    desc: 'Отключает фоновую запись экрана Xbox и лимит сетевых пакетов',
    defaultEnabled: true,
    bat: String.raw`echo [4/6] Применение игровых твиков реестра...
reg add "HKCU\System\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 0 /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "NetworkThrottlingIndex" /t REG_DWORD /d 4294967295 /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "SystemResponsiveness" /t REG_DWORD /d 0 /f >nul`,
    ps1: String.raw`Write-Host "[4/6] Применение игровых твиков реестра..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Value 0 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "NetworkThrottlingIndex" -Value 0xffffffff -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "SystemResponsiveness" -Value 0 -ErrorAction SilentlyContinue`,
  },
  {
    id: 'dnsFlush',
    title: 'Сбросить кэш DNS и обновить сетевой стек',
    desc: 'Очищает устаревшие маршруты и уменьшает задержки подключения',
    defaultEnabled: false,
    bat: String.raw`echo [5/6] Сброс DNS-кэша...
ipconfig /flushdns >nul`,
    ps1: String.raw`Write-Host "[5/6] Сброс DNS-кэша..." -ForegroundColor Cyan
Clear-DnsClientCache`,
  },
  {
    id: 'telemetryLite',
    title: 'Отключить телеметрию диагностики (DiagTrack)',
    desc: 'Останавливает фоновую отправку отчётов использования Windows',
    defaultEnabled: false,
    bat: String.raw`echo [6/6] Отключение службы DiagTrack...
sc stop DiagTrack >nul 2>&1
sc config DiagTrack start= disabled >nul 2>&1`,
    ps1: String.raw`Write-Host "[6/6] Отключение службы DiagTrack..." -ForegroundColor Cyan
Stop-Service "DiagTrack" -Force -ErrorAction SilentlyContinue
Set-Service "DiagTrack" -StartupType Disabled -ErrorAction SilentlyContinue`,
  },
];

export const FAQ_DATA: FaqEntry[] = [
  {
    q: 'Безопасно ли запускать сгенерированный скрипт?',
    a: 'Да. В скрипте используются только встроенные утилиты Windows (powercfg, reg, ipconfig, sc). Весь код открыт перед скачиванием, а первый пункт автоматически создаёт точку восстановления.',
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

export function generateOptimizationScript(
  format: ScriptFormat,
  selectedModules: Record<string, boolean>,
): string {
  const active = SCRIPT_MODULES.filter((m) => selectedModules[m.id]);

  if (format === 'bat') {
    let code = `@echo off
chcp 65001 >nul
title OptiCore PC Optimizer
echo ==========================================
echo   OptiCore — Безопасная оптимизация ПК
echo ==========================================
echo.

`;
    if (active.length === 0) {
      code += `echo Выбери хотя бы один модуль слева!\n`;
    } else {
      code +=
        active.map((m) => m.bat).join('\n\n') +
        `\n\necho.\necho Готово! Перезагрузи ПК для применения всех настроек.\n`;
    }
    code += `pause`;
    return code;
  }

  let code = `# OptiCore PC Optimizer (PowerShell)
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  OptiCore — Безопасная оптимизация ПК" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

`;
  if (active.length === 0) {
    code += `Write-Host "Выбери хотя бы один модуль слева!" -ForegroundColor Yellow\n`;
  } else {
    code +=
      active.map((m) => m.ps1).join('\n\n') +
      `\n\nWrite-Host "\`nГотово! Перезагрузи ПК для применения всех настроек." -ForegroundColor Green\n`;
  }
  code += `Read-Host "Нажми Enter для выхода"`;
  return code;
}
