import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyGpu,
  evaluatePcScan,
  getChecklistIdsFromWindowsReport,
  parseWindowsDiagReport,
  type HardwareScanInput,
} from './scanner';

const BASE_STRONG_PC: HardwareScanInput = {
  cpuCores: 12,
  deviceMemoryGb: 8,
  gpuRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0)',
  gpuVendorRaw: 'Google Inc. (NVIDIA)',
  webgl2Supported: true,
  maxTextureSize: 16384,
  screenWidth: 2560,
  screenHeight: 1440,
  measuredHz: 144,
  avgFrameMs: 6.9,
  frameJitterMs: 0.6,
  eventLoopLagMs: 0.25,
  onBattery: false,
  osName: 'Windows 10 / 11',
  isWindows: true,
  connectionRttMs: 30,
};

test('classifyGpu distinguishes discrete NVIDIA, integrated Intel, and SwiftShader software', () => {
  assert.deepEqual(
    classifyGpu('ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11)'),
    {
      vendor: 'nvidia',
      isIntegratedOrWeak: false,
      label: 'NVIDIA GeForce (дискретная)',
    },
  );
  assert.equal(classifyGpu('Intel(R) UHD Graphics 630').isIntegratedOrWeak, true);
  assert.equal(classifyGpu('Google SwiftShader').vendor, 'software');
});

test('evaluatePcScan refuses fake optimization % when Windows report is missing', () => {
  const result = evaluatePcScan(BASE_STRONG_PC);
  assert.equal(result.windowsVerified, false);
  assert.equal(result.optimizationScore, null);
  assert.ok(result.hardwareScore >= 82);
  assert.equal(result.verdictBadge, 'Оптимизация ОС не проверена');
  assert.ok(result.recommendations.some((r) => r.id === 'win-baseline'));
  assert.ok(result.recommendedModuleIds.includes('restorePoint'));
  assert.ok(result.recommendedModuleIds.includes('gameTweaks'));
  assert.ok(result.recommendedModuleIds.includes('gpuPriority'));
});

test('evaluatePcScan shows genuine low % and detects Windows errors, conflicts, and hardware bottlenecks', () => {
  const result = evaluatePcScan({
    ...BASE_STRONG_PC,
    windowsReport: {
      ramTotalGb: 16,
      ramFreeGb: 2.1,
      ramSpeedMhz: 2133,
      ramStickCount: 2,
      cpuLoadPercent: 42,
      gpuVramGb: 12,
      gpuDriverVersion: '31.0.15.3623',
      gpuDriverAgeDays: 220,
      windowsDisplayHz: 60,
      windowsMaxHz: 165,
      systemDriveType: 'HDD',
      uptimeDays: 14,
      pendingReboot: true,
      topRamApp: 'chrome',
      topRamMb: 4800,
      powerPlan: 'balanced',
      powerThrottlingOff: false,
      cpuCoreParkingOff: false,
      pciAspmOff: false,
      windowedOptEnabled: false,
      gameDvrEnabled: true,
      gameModeEnabled: false,
      hagsEnabled: false,
      mouseAccelEnabled: true,
      vbsEnabled: true,
      networkTweaksApplied: false,
      gpuPriorityHigh: false,
      diagTrackRunning: true,
      deliveryOptP2P: true,
      ssdFreePercent: 10,
      tempSizeMb: 1800,
      shaderCacheMb: 2100,
      startupCount: 15,
      win32PrioritySep38: false,
      usbPowerSavingOff: false,
      nagleDisabled: false,
      nicPowerSavingOff: false,
      transparencyDisabled: false,
      uwpBackgroundDisabled: false,
      secureBootEnabled: false,
      tpmReady: true,
      mpoDisabled: true,
      bcdTimerActive: true,
      fseOverrideActive: true,
      autoEndTasksActive: true,
    },
  });

  assert.equal(result.windowsVerified, true);
  assert.ok(result.optimizationScore !== null && result.optimizationScore < 25);
  assert.equal(result.verdictBadge, 'Требует настройки');
  assert.ok(result.verifiedChecks.length >= 25);
  assert.ok(result.recommendations.some((r) => r.id === 'win-conflict-bcd'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-conflict-mpo'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-conflict-fse'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-conflict-autoend'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-secureboot-off'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-hz-mismatch'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-gpu-driver-old'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-hdd-boot'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-uptime-high'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-pending-reboot'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-cpu-bg-load'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-ram-full'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-xmp'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-power'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-power-throttling'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-core-parking'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-pci-aspm'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-windowed-opt'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-win32prio'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-usb'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-nic-power'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-nagle'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-ssd'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-shader-bloat'));
  assert.ok(result.recommendedModuleIds.includes('repairDisplayArtifacts'));
});

test('evaluatePcScan detects hardware bottlenecks plus Windows issues and scores high when cleanly optimized', () => {
  const weakResult = evaluatePcScan({
    ...BASE_STRONG_PC,
    cpuCores: 4,
    deviceMemoryGb: 4,
    gpuRenderer: 'Google SwiftShader',
    measuredHz: 60,
    frameJitterMs: 7.5,
    onBattery: true,
    batteryLevelPercent: 45,
    windowsReport: {
      ramTotalGb: 8,
      ramSpeedMhz: 2133,
      ramStickCount: 1,
      powerPlan: 'powersaver',
      gameDvrEnabled: true,
      hagsEnabled: false,
      mouseAccelEnabled: true,
      vbsEnabled: true,
      networkTweaksApplied: false,
      diagTrackRunning: true,
      deliveryOptP2P: true,
      ssdFreePercent: 8,
      tempSizeMb: 2400,
      startupCount: 16,
    },
  });

  assert.ok(weakResult.optimizationScore !== null && weakResult.optimizationScore < 25);
  assert.ok(weakResult.recommendations.some((r) => r.id === 'win-single-channel'));
  assert.ok(weakResult.recommendations.some((r) => r.id === 'battery-throttle'));
  assert.ok(weakResult.recommendedModuleIds.includes('hagsAndGameMode'));
  assert.ok(weakResult.recommendedModuleIds.includes('mouseRawInput'));
  assert.ok(weakResult.recommendedModuleIds.includes('disableP2PUpdate'));

  const optimizedResult = evaluatePcScan({
    ...BASE_STRONG_PC,
    windowsReport: {
      ramTotalGb: 32,
      ramFreeGb: 24.5,
      ramSpeedMhz: 3600,
      ramStickCount: 2,
      cpuLoadPercent: 3,
      gpuDriverAgeDays: 18,
      windowsDisplayHz: 144,
      windowsMaxHz: 144,
      systemDriveType: 'SSD',
      uptimeDays: 0.5,
      pendingReboot: false,
      powerPlan: 'ultimate',
      powerThrottlingOff: true,
      cpuCoreParkingOff: true,
      pciAspmOff: true,
      windowedOptEnabled: true,
      gameDvrEnabled: false,
      gameModeEnabled: true,
      hagsEnabled: true,
      mouseAccelEnabled: false,
      vbsEnabled: false,
      networkTweaksApplied: true,
      gpuPriorityHigh: true,
      diagTrackRunning: false,
      deliveryOptP2P: false,
      ssdFreePercent: 52,
      tempSizeMb: 85,
      shaderCacheMb: 320,
      startupCount: 4,
      win32PrioritySep38: true,
      usbPowerSavingOff: true,
      nagleDisabled: true,
      nicPowerSavingOff: true,
      transparencyDisabled: true,
      uwpBackgroundDisabled: true,
      fastDnsConfigured: true,
      ntfsLastAccessOff: true,
      secureBootEnabled: true,
      tpmReady: true,
      mpoDisabled: false,
      bcdTimerActive: false,
      fseOverrideActive: false,
      autoEndTasksActive: false,
    },
  });

  assert.equal(optimizedResult.windowsVerified, true);
  assert.ok(optimizedResult.optimizationScore !== null && optimizedResult.optimizationScore >= 95);
  assert.equal(optimizedResult.verdictBadge, 'Отлично оптимизирован');
});

test('parseWindowsDiagReport parses extended 30+ parameter OPTICORE JSON and maps checklist items', () => {
  const bad = parseWindowsDiagReport('непонятный текст');
  assert.equal(bad.ok, false);

  const valid = parseWindowsDiagReport(
    'OPTICORE:{"cpuName":"Ryzen 7 5800X","cpuCoresPhysical":8,"cpuThreads":16,"gpuName":"NVIDIA GeForce RTX 3070","gpuVramGb":8,"gpuDriverVersion":"32.0.15.6636","gpuDriverAgeDays":15,"windowsDisplayHz":165,"windowsMaxHz":165,"ramTotalGb":32,"ramFreeGb":22.4,"ramSpeedMhz":3600,"ramStickCount":2,"systemDriveType":"SSD","powerPlan":"ultimate","powerThrottlingOff":true,"cpuCoreParkingOff":true,"pciAspmOff":true,"gameDvrEnabled":false,"gameModeEnabled":true,"hagsEnabled":true,"windowedOptEnabled":true,"mouseAccelEnabled":false,"deliveryOptP2P":false,"ssdFreePercent":45,"tempSizeMb":120,"startupCount":5,"win32PrioritySep38":true,"usbPowerSavingOff":true,"nicPowerSavingOff":true,"transparencyDisabled":true,"uwpBackgroundDisabled":true,"gpuPriorityHigh":true,"fastDnsConfigured":true,"secureBootEnabled":true,"tpmReady":true,"mpoDisabled":false,"bcdTimerActive":false,"fseOverrideActive":false,"autoEndTasksActive":false}',
  );
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.report.ramTotalGb, 32);
    assert.equal(valid.report.gpuVramGb, 8);
    assert.equal(valid.report.gpuDriverVersion, '32.0.15.6636');
    assert.equal(valid.report.windowsDisplayHz, 165);
    assert.equal(valid.report.secureBootEnabled, true);
    assert.equal(valid.report.bcdTimerActive, false);
    assert.equal(valid.report.mpoDisabled, false);
    assert.equal(valid.report.windowedOptEnabled, true);
    assert.equal(valid.report.nicPowerSavingOff, true);
    const synced = getChecklistIdsFromWindowsReport(valid.report);
    assert.ok(synced.includes('power'));
    assert.ok(synced.includes('xmp'));
    assert.ok(synced.includes('gamemode'));
    assert.ok(synced.includes('gpu_driver'));
    assert.ok(synced.includes('mouse'));
    assert.ok(synced.includes('overlays'));
    assert.ok(synced.includes('dns'));
  }
});

test('evaluatePcScan detects BIOS/UEFI, ReBAR, RAM SPD mismatch, SSD SMART, network RSC/QoS/LLMNR, and GPU stress stutters', () => {
  const result = evaluatePcScan({
    ...BASE_STRONG_PC,
    gpuStressFps: 42,
    gpuStressJitterMs: 6.2,
    gpuStressDrops: 5,
    gpuStressWorkloadLabel: 'WebGL Shaders 512×512',
    windowsReport: {
      ramTotalGb: 16,
      ramFreeGb: 9.5,
      ramSpeedMhz: 2666,
      ramRatedMhz: 3600,
      ramStickCount: 2,
      powerPlan: 'ultimate',
      bootMode: 'Legacy',
      biosVersion: 'F10',
      biosAgeDays: 900,
      rebarEnabled: false,
      ssdHealth: 'Warning',
      pageFileMb: 0,
      tcpRscEnabled: true,
      qosReservedPercent: 20,
      llmnrEnabled: true,
      gameDvrEnabled: false,
      gameModeEnabled: true,
      hagsEnabled: true,
      mouseAccelEnabled: false,
    },
  });

  assert.equal(result.windowsVerified, true);
  assert.ok(result.recommendations.some((r) => r.id === 'gpu-stress-freeze'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-legacy-boot'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-bios-old'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-rebar-off'));
  assert.ok(
    result.recommendations.some(
      (r) => r.id === 'win-xmp' && r.title.includes('паспортных 3600 МГц'),
    ),
  );
  assert.ok(result.recommendations.some((r) => r.id === 'win-ssd-health'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-pagefile-off'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-tcp-rsc'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-qos-reserve'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-llmnr'));
  assert.ok(result.recommendedModuleIds.includes('tcpRscAndEcnOptimize'));
  assert.ok(result.recommendedModuleIds.includes('qosPacketSchedulerZero'));
  assert.ok(result.recommendedModuleIds.includes('disableNetBiosAndLlmnr'));
});
