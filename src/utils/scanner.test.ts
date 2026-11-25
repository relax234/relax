import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyGpu,
  evaluatePcScan,
  parseWindowsDiagReport,
  type HardwareScanInput,
} from './scanner';

const BASE_STRONG_PC: HardwareScanInput = {
  cpuCores: 12,
  deviceMemoryGb: 8,
  gpuRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0)',
  gpuVendorRaw: 'Google Inc. (NVIDIA)',
  screenWidth: 2560,
  screenHeight: 1440,
  measuredHz: 144,
  avgFrameMs: 6.9,
  frameJitterMs: 0.6,
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
  assert.ok(result.score >= 80);
  assert.equal(result.verdictBadge, 'Отличное состояние');
  assert.ok(result.recommendedModuleIds.includes('restorePoint'));
  assert.ok(result.recommendedModuleIds.includes('gameTweaks'));
});

test('evaluatePcScan lowers score and adds high-priority warnings for bottlenecks', () => {
  const result = evaluatePcScan({
    ...BASE_STRONG_PC,
    cpuCores: 4,
    deviceMemoryGb: 4,
    gpuRenderer: 'Google SwiftShader',
    measuredHz: 60,
    frameJitterMs: 7.5,
    windowsReport: {
      ramTotalGb: 8,
      ramSpeedMhz: 2133,
      powerPlan: 'balanced',
      gameDvrEnabled: true,
      ssdFreePercent: 8,
      startupCount: 16,
    },
  });

  assert.ok(result.score < 50);
  assert.equal(result.verdictBadge, 'Требует внимания');
  assert.ok(result.recommendations.some((r) => r.id === 'win-xmp'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-power'));
  assert.ok(result.recommendations.some((r) => r.id === 'win-ssd'));
  assert.ok(result.recommendedModuleIds.includes('cleanTemp'));
  assert.ok(result.recommendedModuleIds.includes('ultimatePower'));
});

test('parseWindowsDiagReport parses OPTICORE JSON and rejects malformed input', () => {
  const bad = parseWindowsDiagReport('непонятный текст');
  assert.equal(bad.ok, false);

  const valid = parseWindowsDiagReport(
    'OPTICORE:{"cpuName":"Ryzen 7 5800X","gpuName":"NVIDIA GeForce RTX 3070","ramTotalGb":32,"ramSpeedMhz":3600,"powerPlan":"ultimate","gameDvrEnabled":false,"ssdFreePercent":45,"startupCount":5}',
  );
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.report.ramTotalGb, 32);
    assert.equal(valid.report.ramSpeedMhz, 3600);
    assert.equal(valid.report.powerPlan, 'ultimate');
  }
});
