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

test('evaluatePcScan shows genuine low % and concrete Windows errors for unoptimized stock Windows even on RTX 4070', () => {
  const result = evaluatePcScan({
    ...BASE_STRONG_PC,
    windowsReport: {
      ramTotalGb: 16,
      ramSpeedMhz: 2133,
      ramStickCount: 2,
      powerPlan: 'balanced',
      powerThrottlingOff: false,
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
      startupCount: 15,
      win32PrioritySep38: false,
      mpoDisabled: false,
      usbPowerSavingOff: false,
      nagleDisabled: false,
      transparencyDisabled: false,
      uwpBackgroundDisabled: false,
    },
  });

  assert.equal(result.windowsVerified, true);
  assert.ok(result.optimizationScore !== null && result.optimizationScore < 35);
  assert.equal(result.verdictBadge, 'Требует настройки');
  assert.ok(result.verifiedChecks.length >= 16);
  assert.ok(result.recommendations.some((r) => r.id === 'win-xmp'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-power'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-power-throttling'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-win32prio'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-mpo'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-usb'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-nagle'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-ssd'));
});

test('evaluatePcScan detects hardware bottlenecks plus Windows issues and scores high when fully optimized', () => {
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
      ramSpeedMhz: 3600,
      ramStickCount: 2,
      powerPlan: 'ultimate',
      powerThrottlingOff: true,
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
      startupCount: 4,
      win32PrioritySep38: true,
      mpoDisabled: true,
      usbPowerSavingOff: true,
      nagleDisabled: true,
      transparencyDisabled: true,
      uwpBackgroundDisabled: true,
    },
  });

  assert.equal(optimizedResult.windowsVerified, true);
  assert.ok(optimizedResult.optimizationScore !== null && optimizedResult.optimizationScore >= 90);
  assert.equal(optimizedResult.verdictBadge, 'Отлично оптимизирован');
});

test('parseWindowsDiagReport parses extended OPTICORE JSON and maps checklist items', () => {
  const bad = parseWindowsDiagReport('непонятный текст');
  assert.equal(bad.ok, false);

  const valid = parseWindowsDiagReport(
    'OPTICORE:{"cpuName":"Ryzen 7 5800X","gpuName":"NVIDIA GeForce RTX 3070","ramTotalGb":32,"ramSpeedMhz":3600,"ramStickCount":2,"powerPlan":"ultimate","powerThrottlingOff":true,"gameDvrEnabled":false,"gameModeEnabled":true,"hagsEnabled":true,"mouseAccelEnabled":false,"deliveryOptP2P":false,"ssdFreePercent":45,"tempSizeMb":120,"startupCount":5,"win32PrioritySep38":true,"mpoDisabled":true,"usbPowerSavingOff":true,"transparencyDisabled":true,"uwpBackgroundDisabled":true,"gpuPriorityHigh":true,"fastDnsConfigured":true}',
  );
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.report.ramTotalGb, 32);
    assert.equal(valid.report.hagsEnabled, true);
    assert.equal(valid.report.powerThrottlingOff, true);
    assert.equal(valid.report.transparencyDisabled, true);
    assert.equal(valid.report.uwpBackgroundDisabled, true);
    assert.equal(valid.report.gpuPriorityHigh, true);
    assert.equal(valid.report.fastDnsConfigured, true);
    const synced = getChecklistIdsFromWindowsReport(valid.report);
    assert.ok(synced.includes('power'));
    assert.ok(synced.includes('xmp'));
    assert.ok(synced.includes('gamemode'));
    assert.ok(synced.includes('mouse'));
    assert.ok(synced.includes('overlays'));
    assert.ok(synced.includes('dns'));
  }
});
