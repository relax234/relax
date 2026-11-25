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

test('evaluatePcScan scores strong hardware high and recommends baseline tweaks', () => {
  const result = evaluatePcScan(BASE_STRONG_PC);
  assert.ok(result.score >= 82);
  assert.equal(result.verdictBadge, 'Отличное состояние');
  assert.ok(result.checksCount >= 8);
  assert.ok(result.recommendedModuleIds.includes('restorePoint'));
  assert.ok(result.recommendedModuleIds.includes('gameTweaks'));
  assert.ok(result.recommendedModuleIds.includes('gpuPriority'));
});

test('evaluatePcScan detects deep Windows bottlenecks, single-channel RAM, HAGS, and battery throttle', () => {
  const result = evaluatePcScan({
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
      powerPlan: 'balanced',
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

  assert.ok(result.score < 45);
  assert.equal(result.verdictBadge, 'Требует внимания');
  assert.ok(result.checksCount >= 20);
  assert.ok(result.recommendations.some((r) => r.id === 'win-single-channel'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-xmp'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-hags'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-mouse-accel'));
  assert.ok(result.recommendations.some((r) => r.id === 'battery-throttle'));
  assert.ok(result.recommendedModuleIds.includes('hagsAndGameMode'));
  assert.ok(result.recommendedModuleIds.includes('mouseRawInput'));
  assert.ok(result.recommendedModuleIds.includes('disableP2PUpdate'));
});

test('parseWindowsDiagReport parses extended OPTICORE JSON and maps checklist items', () => {
  const bad = parseWindowsDiagReport('непонятный текст');
  assert.equal(bad.ok, false);

  const valid = parseWindowsDiagReport(
    'OPTICORE:{"cpuName":"Ryzen 7 5800X","gpuName":"NVIDIA GeForce RTX 3070","ramTotalGb":32,"ramSpeedMhz":3600,"ramStickCount":2,"powerPlan":"ultimate","gameDvrEnabled":false,"gameModeEnabled":true,"hagsEnabled":true,"mouseAccelEnabled":false,"deliveryOptP2P":false,"ssdFreePercent":45,"tempSizeMb":120,"startupCount":5,"win32PrioritySep38":true,"mpoDisabled":true,"usbPowerSavingOff":true}',
  );
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.report.ramTotalGb, 32);
    assert.equal(valid.report.hagsEnabled, true);
    assert.equal(valid.report.win32PrioritySep38, true);
    assert.equal(valid.report.mpoDisabled, true);
    assert.equal(valid.report.usbPowerSavingOff, true);
    const synced = getChecklistIdsFromWindowsReport(valid.report);
    assert.ok(synced.includes('power'));
    assert.ok(synced.includes('xmp'));
    assert.ok(synced.includes('gamemode'));
    assert.ok(synced.includes('mouse'));
    assert.ok(synced.includes('overlays'));
  }
});
