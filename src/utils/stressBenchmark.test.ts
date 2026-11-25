import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStressSummary } from './stressBenchmark';

test('computeStressSummary reports high stability when stress deltas stay near 60Hz target', () => {
  const steadyDeltas = Array.from({ length: 120 }, () => 16.67);
  const summary = computeStressSummary({
    deltas: steadyDeltas,
    intensity: 'extreme',
    cpuWorkersUsed: 8,
    gpuWorkloadLabel: 'WebGL 1280×720',
    durationSec: 8,
  });

  assert.equal(summary.avgFps, 60);
  assert.equal(summary.dropCount, 0);
  assert.ok(summary.stabilityPercent >= 95);
  assert.equal(summary.verdictTone, 'good');
  assert.equal(summary.cpuWorkersUsed, 8);
  assert.ok(summary.antiFreezeTips.some((t) => t.id === 'freeze-ok'));
});

test('computeStressSummary catches severe frame drops and stutters under load', () => {
  const spikyDeltas = [
    ...Array.from({ length: 40 }, () => 16.6),
    48.0,
    56.0,
    42.0,
    60.0,
    38.0,
    44.0,
    52.0,
    45.0,
    39.0,
    47.0,
    51.0,
    49.0,
    44.0,
    55.0,
  ];
  const summary = computeStressSummary({
    deltas: spikyDeltas,
    intensity: 'extreme',
    cpuWorkersUsed: 4,
    gpuWorkloadLabel: 'WebGL 1280×720',
    durationSec: 8,
  });

  assert.ok(summary.dropCount >= 10);
  assert.ok(summary.worstFrameMs >= 55);
  assert.ok(summary.stabilityPercent < 65);
  assert.equal(summary.verdictTone, 'bad');
  assert.ok(summary.antiFreezeTips.some((t) => t.id === 'freeze-cpu-power'));
  assert.ok(summary.antiFreezeTips.some((t) => t.id === 'freeze-overlays-cache'));
});
