import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKLIST_DATA,
  SCRIPT_MODULES,
  calculateOptimizationScore,
  generateOptimizationScript,
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

test('SCRIPT_MODULES contains 12 categorized tweaks with unique IDs', () => {
  assert.equal(SCRIPT_MODULES.length, 12);
  const ids = new Set(SCRIPT_MODULES.map((m) => m.id));
  assert.equal(ids.size, 12);
});

test('generateOptimizationScript builds valid .bat script with Windows paths preserved', () => {
  const defaults: Record<string, boolean> = {};
  for (const mod of SCRIPT_MODULES) {
    defaults[mod.id] = mod.defaultEnabled;
  }

  const bat = generateOptimizationScript('bat', defaults);
  assert.match(bat, /^@echo off/);
  assert.match(bat, /C:\\Windows\\Temp\\\*.\*/);
  assert.match(bat, /HKCU\\System\\GameConfigStore/);
  assert.doesNotMatch(bat, /ipconfig \/flushdns/);
});

test('generateOptimizationScript builds valid .ps1 script including new gaming and input tweaks', () => {
  const emptyPs1 = generateOptimizationScript('ps1', {});
  assert.match(emptyPs1, /Выбери хотя бы один модуль слева!/);

  const fullPs1 = generateOptimizationScript('ps1', {
    dnsFlush: true,
    gpuPriority: true,
    hagsAndGameMode: true,
    mouseRawInput: true,
  });
  assert.match(fullPs1, /Clear-DnsClientCache/);
  assert.match(fullPs1, /GPU Priority/);
  assert.match(fullPs1, /HwSchMode/);
  assert.match(fullPs1, /MouseSpeed/);
  assert.match(fullPs1, /Read-Host/);
});
