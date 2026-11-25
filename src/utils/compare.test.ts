import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPcShareSnapshot,
  buildShareUrl,
  comparePcProfiles,
  createDemoFriendSnapshot,
  decodeShareInput,
  encodeShareCode,
} from './compare';
import type { HardwareScanInput } from './scanner';

const MY_SAMPLE_SCAN: HardwareScanInput = {
  cpuCores: 12,
  deviceMemoryGb: 8,
  gpuRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11)',
  gpuVendorRaw: 'Google Inc. (NVIDIA)',
  webgl2Supported: true,
  screenWidth: 1920,
  screenHeight: 1080,
  measuredHz: 165,
  avgFrameMs: 6.1,
  frameJitterMs: 0.5,
  osName: 'Windows 10 / 11',
  isWindows: true,
  connectionRttMs: 25,
};

test('encodeShareCode and decodeShareInput round-trip Cyrillic names, hardware, and opt flags', () => {
  const snapshot = buildPcShareSnapshot({
    name: 'Илья (ПК для КС2)',
    scanData: MY_SAMPLE_SCAN,
    windowsReport: {
      cpuName: 'AMD Ryzen 7 7800X3D',
      gpuName: 'NVIDIA GeForce RTX 4060',
      ramTotalGb: 32,
      ramSpeedMhz: 6000,
      ramStickCount: 2,
      powerPlan: 'ultimate',
      hagsEnabled: true,
      gameModeEnabled: true,
      gameDvrEnabled: false,
      mouseAccelEnabled: false,
      mpoDisabled: true,
      win32PrioritySep38: true,
      networkTweaksApplied: true,
      usbPowerSavingOff: false,
      deliveryOptP2P: false,
      diagTrackRunning: false,
      ssdFreePercent: 40,
      tempSizeMb: 80,
    },
    checkedItems: {},
    appliedExtraFlags: {},
  });

  const code = encodeShareCode(snapshot);
  assert.ok(code.startsWith('OC1:'));

  const url = buildShareUrl('https://opticore.example.com/', snapshot);
  const decodedFromUrl = decodeShareInput(url);
  assert.equal(decodedFromUrl.ok, true);
  if (decodedFromUrl.ok) {
    assert.equal(decodedFromUrl.snapshot.name, 'Илья (ПК для КС2)');
    assert.equal(decodedFromUrl.snapshot.hw.hz, 165);
    assert.equal(decodedFromUrl.snapshot.hw.ramGb, 32);
    assert.equal(decodedFromUrl.snapshot.opts.power, 'on');
    assert.equal(decodedFromUrl.snapshot.opts.mpo_off, 'on');
    assert.equal(decodedFromUrl.snapshot.opts.usb_power, 'off');
  }
});

test('decodeShareInput accepts raw PowerShell OPTICORE report directly and rejects junk', () => {
  const bad = decodeShareInput('просто текст без кода');
  assert.equal(bad.ok, false);

  const rawPs =
    'OPTICORE:{"cpuName":"Intel Core i5-12400F","gpuName":"AMD Radeon RX 6700 XT","ramTotalGb":16,"ramSpeedMhz":3200,"ramStickCount":2,"powerPlan":"balanced","hagsEnabled":false,"mouseAccelEnabled":false}';
  const parsed = decodeShareInput(rawPs);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.snapshot.hw.gpu, 'AMD Radeon RX 6700 XT');
    assert.equal(parsed.snapshot.opts.power, 'off');
    assert.equal(parsed.snapshot.opts.mouse_raw, 'on');
  }
});

test('comparePcProfiles identifies hardware leaders and missing friend optimizations', () => {
  const mine = buildPcShareSnapshot({
    name: 'Мой ПК',
    scanData: {
      ...MY_SAMPLE_SCAN,
      measuredHz: 60,
      frameJitterMs: 2.2,
    },
    windowsReport: null,
    checkedItems: {
      power: true,
      mouse: false,
      overlays: false,
    },
    appliedExtraFlags: {},
  });

  const friend = createDemoFriendSnapshot();
  const cmp = comparePcProfiles(mine, friend);

  assert.equal(cmp.totalOptItems, 12);
  assert.ok(cmp.friendOnCount > cmp.myOnCount);
  assert.ok(cmp.onlyFriendOnCount > 0);
  assert.ok(cmp.missingForMeModuleIds.includes('mouseRawInput'));
  assert.ok(cmp.missingForMeModuleIds.includes('win32PrioritySep'));

  const hzRow = cmp.hardwareRows.find((r) => r.id === 'hz');
  assert.equal(hzRow?.leader, 'friend');
});
