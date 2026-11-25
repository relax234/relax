import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFrameMetrics, formatShortGpuName, snapMonitorRefreshRate } from './frameMonitor';

test('snapMonitorRefreshRate snaps near standard monitor rates', () => {
  assert.equal(snapMonitorRefreshRate(59.9), 60);
  assert.equal(snapMonitorRefreshRate(143.8), 144);
  assert.equal(snapMonitorRefreshRate(239.5), 240);
});

test('computeFrameMetrics detects 144Hz steady cadence as stable', () => {
  const deltas = Array.from({ length: 30 }, () => 6.94);
  const res = computeFrameMetrics(deltas);
  assert.equal(res.detectedHz, 144);
  assert.equal(res.fps, 144);
  assert.equal(res.stabilityStatus, 'ok');
  assert.equal(res.jitterMs, 0);
});

test('computeFrameMetrics detects frame spikes and computes 1% low drop', () => {
  const deltas = [
    ...Array.from({ length: 26 }, () => 16.6),
    36.0,
    42.0,
    38.0,
    45.0,
  ];
  const res = computeFrameMetrics(deltas);
  assert.equal(res.detectedHz, 60);
  assert.ok(res.onePercentLowFps < res.fps);
  assert.equal(res.stabilityStatus, 'bad');
  assert.equal(res.stabilityLabel, 'Есть микрофризы');
});

test('formatShortGpuName strips ANGLE boilerplate cleanly', () => {
  assert.equal(
    formatShortGpuName('ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)'),
    'RTX 3070',
  );
  assert.equal(
    formatShortGpuName(
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
    ),
    'SwiftShader (Software)',
  );
});
