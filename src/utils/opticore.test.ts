import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKLIST_DATA,
  SCRIPT_MODULES,
  buildWingetUpgradeCommand,
  calculateOptimizationScore,
  generateOptimizationScript,
  generateRollbackScript,
  generateWingetUpdateScript,
} from './opticore';

test('calculateOptimizationScore returns 0% base stock when nothing is checked', () => {
  const result = calculateOptimizationScore({});
  assert.equal(result.percent, 0);
  assert.equal(result.stabilityBonus, 0);
  assert.equal(result.label, 'Базовый сток');
});

test('calculateOptimizationScore reaches 100% and +25% stability when all items checked', () => {
  const allChecked: Record<string, boolean> = {};
  for (const group of CHECKLIST_DATA) {
    for (const item of group.items) {
      allChecked[item.id] = true;
    }
  }
  const result = calculateOptimizationScore(allChecked);
  assert.equal(result.percent, 100);
  assert.equal(result.stabilityBonus, 25);
  assert.equal(result.label, 'Максимум FPS');
});

test('SCRIPT_MODULES contains 37 safe categorized tweaks (13 network + 8 each in other categories) with unique IDs', () => {
  assert.equal(SCRIPT_MODULES.length, 37);
  const ids = new Set(SCRIPT_MODULES.map((m) => m.id));
  assert.equal(ids.size, 37);
  assert.equal(SCRIPT_MODULES.filter((m) => m.category === 'system').length, 8);
  assert.equal(SCRIPT_MODULES.filter((m) => m.category === 'gaming').length, 8);
  assert.equal(SCRIPT_MODULES.filter((m) => m.category === 'input').length, 8);
  assert.equal(SCRIPT_MODULES.filter((m) => m.category === 'network').length, 13);
});

test('optimization modules avoid risky anti-cheat, flicker, or stability hacks', () => {
  const safeModules = SCRIPT_MODULES.filter((m) => m.id !== 'repairDisplayArtifacts');
  const allSafeSelected: Record<string, boolean> = {};
  for (const mod of safeModules) {
    allSafeSelected[mod.id] = true;
  }

  const batAll = generateOptimizationScript('bat', allSafeSelected);
  const ps1All = generateOptimizationScript('ps1', allSafeSelected);

  for (const script of [batAll, ps1All]) {
    assert.doesNotMatch(script, /disabledynamictick/i);
    assert.doesNotMatch(script, /useplatformtick/i);
    assert.doesNotMatch(script, /OverlayTestMode/i);
    assert.doesNotMatch(script, /GameDVR_FSEBehaviorMode/i);
    assert.doesNotMatch(script, /AutoEndTasks/i);
    assert.doesNotMatch(script, /HungAppTimeout/i);
    assert.doesNotMatch(script, /powercfg\s+\/h\s+off/i);
    assert.doesNotMatch(script, /WerSvc/i);
    assert.doesNotMatch(script, /CrashDumpEnabled/i);
  }
});

test('generateOptimizationScript builds valid .bat script with Windows paths and UAC header', () => {
  const defaults: Record<string, boolean> = {};
  for (const mod of SCRIPT_MODULES) {
    defaults[mod.id] = mod.defaultEnabled;
  }

  const bat = generateOptimizationScript('bat', defaults);
  assert.match(bat, /^@echo off/);
  assert.match(bat, /:ADMIN_OK/);
  assert.match(bat, /C:\\Windows\\Temp\\\*.\*/);
  assert.match(bat, /HKCU\\System\\GameConfigStore/);
  assert.doesNotMatch(bat, /ipconfig \/flushdns/);
});

test('generateOptimizationScript builds valid .ps1 script including expanded safe tweaks', () => {
  const emptyPs1 = generateOptimizationScript('ps1', {});
  assert.match(emptyPs1, /Выбери хотя бы один модуль слева!/);

  const fullPs1 = generateOptimizationScript('ps1', {
    dnsFlush: true,
    gpuPriority: true,
    hagsAndGameMode: true,
    mouseRawInput: true,
    win32PrioritySep: true,
    windowedOptWin11: true,
    pciExpressPowerOff: true,
    processorBoostMax: true,
    nagleDisable: true,
    nicPowerSavingOff: true,
    usbPowerSavingOff: true,
    cpuCoreParkingOff: true,
    disablePowerThrottling: true,
    audioLatencyBoost: true,
    menuShowDelayOnly: true,
    cleanShaderCache: true,
    dnsCloudflareQuad: true,
    noAutoRebootDuringGame: true,
    repairDisplayArtifacts: true,
    nicLowLatencyBuffers: true,
    tcpRscAndEcnOptimize: true,
    qosPacketSchedulerZero: true,
    disableNetBiosAndLlmnr: true,
    tcpPortsAndTtlOptimize: true,
  });
  assert.match(fullPs1, /Clear-DnsClientCache/);
  assert.match(fullPs1, /GPU Priority/);
  assert.match(fullPs1, /HwSchMode/);
  assert.match(fullPs1, /SwapEffectUpgradeEnable=1/);
  assert.match(fullPs1, /SUB_PCIEXPRESS ASPM 0/);
  assert.match(fullPs1, /PROCTHROTTLEMIN 100/);
  assert.match(fullPs1, /MouseSpeed/);
  assert.match(fullPs1, /Win32PrioritySeparation/);
  assert.match(fullPs1, /TcpAckFrequency/);
  assert.match(fullPs1, /Disable-NetAdapterPowerManagement/);
  assert.match(fullPs1, /DisableSelectiveSuspend/);
  assert.match(fullPs1, /CPMINCORES 100/);
  assert.match(fullPs1, /PowerThrottlingOff/);
  assert.match(fullPs1, /Tasks\\Audio/);
  assert.match(fullPs1, /MenuShowDelay/);
  assert.match(fullPs1, /D3DSCache/);
  assert.match(fullPs1, /NoAutoRebootWithLoggedOnUsers/);
  assert.match(fullPs1, /1\.1\.1\.1/);
  assert.match(fullPs1, /Remove-ItemProperty.*OverlayTestMode/);
  assert.match(fullPs1, /bcdedit \/deletevalue disabledynamictick/);
  assert.match(fullPs1, /Disable-NetAdapterRsc|rsc=disabled/i);
  assert.match(fullPs1, /NonBestEffortLimit/);
  assert.match(fullPs1, /EnableMulticast/);
  assert.match(fullPs1, /MaxUserPort/);
  assert.match(fullPs1, /InterruptModeration/i);
  assert.match(fullPs1, /Read-Host/);
});

test('generateRollbackScript builds reversible stock scripts and cleans risky flags', () => {
  const batRollback = generateRollbackScript('bat');
  assert.match(batRollback, /GameDVR_Enabled.*\/d 1/);
  assert.match(batRollback, /MouseSpeed.*1/);
  assert.match(batRollback, /PowerThrottlingOff/);
  assert.match(batRollback, /reg delete.*OverlayTestMode/);
  assert.match(batRollback, /bcdedit \/deletevalue useplatformtick/);
  assert.match(batRollback, /rsc=enabled/);
  assert.match(batRollback, /NonBestEffortLimit/);

  const ps1Rollback = generateRollbackScript('ps1');
  assert.match(ps1Rollback, /Win32PrioritySeparation.*-Value 2/);
  assert.match(ps1Rollback, /Remove-ItemProperty.*OverlayTestMode/);
  assert.match(ps1Rollback, /CPMINCORES 5/);
  assert.match(ps1Rollback, /Enable-NetAdapterRsc|rsc=enabled/i);
  assert.match(ps1Rollback, /DefaultTTL/);
});

test('buildWingetUpgradeCommand and generateWingetUpdateScript produce working CRLF .bat with pause', () => {
  const baseCmd = buildWingetUpgradeCommand({ includeUnknown: false, silent: false });
  assert.equal(
    baseCmd,
    'winget upgrade --all --accept-package-agreements --accept-source-agreements',
  );

  const fullCmd = buildWingetUpgradeCommand({ includeUnknown: true, silent: true });
  assert.equal(
    fullCmd,
    'winget upgrade --all --include-unknown --silent --accept-package-agreements --accept-source-agreements',
  );

  const bat = generateWingetUpdateScript({ includeUnknown: true, silent: true });
  assert.match(bat, /^@echo off\r\n/);
  assert.match(bat, /chcp 65001/);
  assert.match(bat, /:ADMIN_OK/);
  assert.match(bat, /where winget/);
  assert.match(bat, /winget source update/);
  assert.match(bat, /winget upgrade --all --include-unknown --silent --accept-package-agreements --accept-source-agreements/);
  assert.match(bat, /pause\r\n$/);
});

