export interface FrameMonitorMetrics {
  fps: number;
  onePercentLowFps: number;
  avgFrameMs: number;
  jitterMs: number;
  worstFrameMs: number;
  detectedHz: number;
  targetFrameMs: number;
  stabilityStatus: 'ok' | 'warn' | 'bad';
  stabilityLabel: string;
}

const STANDARD_REFRESH_RATES = [60, 75, 90, 100, 120, 144, 165, 180, 240, 360];

export function snapMonitorRefreshRate(rawHz: number): number {
  let best = Math.round(rawHz);
  for (const rate of STANDARD_REFRESH_RATES) {
    if (Math.abs(rawHz - rate) <= 5) {
      best = rate;
      break;
    }
  }
  return Math.max(30, Math.min(360, best));
}

export function computeFrameMetrics(deltas: number[]): FrameMonitorMetrics {
  const valid = deltas.filter((d) => Number.isFinite(d) && d >= 1.5 && d <= 150);
  if (valid.length === 0) {
    return {
      fps: 60,
      onePercentLowFps: 58,
      avgFrameMs: 16.7,
      jitterMs: 0.0,
      worstFrameMs: 16.7,
      detectedHz: 60,
      targetFrameMs: 16.7,
      stabilityStatus: 'ok',
      stabilityLabel: 'Замер...',
    };
  }

  const sorted = [...valid].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const avg = valid.reduce((acc, v) => acc + v, 0) / valid.length;
  const jitter = valid.reduce((acc, v) => acc + Math.abs(v - median), 0) / valid.length;
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const worstFrameMs = sorted[p95Index];

  const detectedHz = snapMonitorRefreshRate(1000 / median);
  const targetFrameMs = Number((1000 / detectedHz).toFixed(1));
  const fps = Math.min(360, Math.max(10, Math.round(1000 / avg)));
  const onePercentLowFps = Math.min(fps, Math.max(5, Math.round(1000 / worstFrameMs)));

  let stabilityStatus: 'ok' | 'warn' | 'bad' = 'ok';
  let stabilityLabel = 'Ровный фреймтайм';

  if (jitter > 4.2 || worstFrameMs > targetFrameMs * 2.2) {
    stabilityStatus = 'bad';
    stabilityLabel = 'Есть микрофризы';
  } else if (jitter > 1.8 || worstFrameMs > targetFrameMs * 1.55) {
    stabilityStatus = 'warn';
    stabilityLabel = 'Небольшие пики';
  }

  return {
    fps,
    onePercentLowFps,
    avgFrameMs: Number(avg.toFixed(1)),
    jitterMs: Number(jitter.toFixed(1)),
    worstFrameMs: Number(worstFrameMs.toFixed(1)),
    detectedHz,
    targetFrameMs,
    stabilityStatus,
    stabilityLabel,
  };
}

export function formatShortGpuName(rawRenderer: string): string {
  if (!rawRenderer || rawRenderer === 'Не определена') return 'Не определён';
  if (/swiftshader/i.test(rawRenderer)) return 'SwiftShader (Software)';
  if (/llvmpipe/i.test(rawRenderer)) return 'llvmpipe (Software)';

  const gpuMatch = rawRenderer.match(
    /(NVIDIA\s+GeForce\s+[^,()]+|AMD\s+Radeon(?:\(TM\))?\s+[^,()]+|Intel\(R\)\s+[^,()]+|Apple\s+M[0-9][^,()]*)/i,
  );
  const base = gpuMatch
    ? gpuMatch[1]
    : (rawRenderer.match(/ANGLE\s*\([^,]*,\s*([^,]+)/i)?.[1] ?? rawRenderer);

  const cleaned = base
    .replace(/NVIDIA\s+GeForce\s+/i, '')
    .replace(/AMD\s+Radeon\(TM\)\s+/i, 'Radeon ')
    .replace(/AMD\s+Radeon\s+/i, 'Radeon ')
    .replace(/Intel\(R\)\s+/i, 'Intel ')
    .replace(/Direct3D[0-9]+\s+vs_[0-9_]+\s+ps_[0-9_]+/i, '')
    .trim();
  return cleaned.length > 26 ? `${cleaned.slice(0, 24)}…` : cleaned;
}
