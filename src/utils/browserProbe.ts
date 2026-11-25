import { classifyGpu, type HardwareScanInput } from './scanner';
import { createGpuStressEngine } from './stressBenchmark';

interface NavigatorExtended extends Navigator {
  deviceMemory?: number;
  connection?: {
    rtt?: number;
    effectiveType?: string;
  };
  userAgentData?: {
    platform?: string;
  };
  getBattery?: () => Promise<{
    charging: boolean;
    level: number;
  }>;
}

export function detectWebGlInfo(): {
  renderer: string;
  vendor: string;
  webgl2Supported: boolean;
  maxTextureSize: number | null;
} {
  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    const gl = gl2 || (canvas.getContext('webgl') as WebGLRenderingContext | null);

    if (!gl) {
      return {
        renderer: 'Не определена',
        vendor: '',
        webgl2Supported: false,
        maxTextureSize: null,
      };
    }

    const maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || null;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
      const vendor = String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '');
      if (renderer) {
        return { renderer, vendor, webgl2Supported: !!gl2, maxTextureSize };
      }
    }

    return {
      renderer: String(gl.getParameter(gl.RENDERER) || 'Не определена'),
      vendor: String(gl.getParameter(gl.VENDOR) || ''),
      webgl2Supported: !!gl2,
      maxTextureSize,
    };
  } catch {
    return {
      renderer: 'Не определена',
      vendor: '',
      webgl2Supported: false,
      maxTextureSize: null,
    };
  }
}

function detectOs(): { osName: string; isWindows: boolean } {
  const nav = navigator as NavigatorExtended;
  const platform = nav.userAgentData?.platform || navigator.platform || '';
  const ua = navigator.userAgent || '';

  if (/Win/i.test(platform) || /Windows/i.test(ua)) {
    return { osName: 'Windows 10 / 11', isWindows: true };
  }
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) {
    return { osName: 'macOS', isWindows: false };
  }
  if (/Linux/i.test(platform) || /Linux/i.test(ua)) {
    return { osName: 'Linux', isWindows: false };
  }
  return { osName: platform || 'Неизвестная ОС', isWindows: false };
}

function snapRefreshRate(rawHz: number): number {
  const standardRates = [60, 75, 90, 100, 120, 144, 165, 180, 240, 360];
  let best = Math.round(rawHz);
  for (const rate of standardRates) {
    if (Math.abs(rawHz - rate) <= 4) {
      best = rate;
      break;
    }
  }
  return Math.max(30, Math.min(360, best));
}

function measureDisplayCadence(): Promise<{
  measuredHz: number;
  avgFrameMs: number;
  frameJitterMs: number;
  deltas: number[];
}> {
  return new Promise((resolve) => {
    const deltas: number[] = [];
    let lastTime = 0;
    let frameCount = 0;
    const warmupFrames = 2;
    const maxFrames = 38;
    const startAt = performance.now();

    const tick = (now: number) => {
      if (lastTime > 0 && frameCount >= warmupFrames) {
        const dt = now - lastTime;
        if (dt > 1 && dt < 150) {
          deltas.push(dt);
        }
      }
      lastTime = now;
      frameCount += 1;

      const elapsed = now - startAt;
      const doneByFrames = frameCount >= maxFrames;
      const doneByBudget = elapsed >= 1400 && deltas.length >= 6;
      const hardCap = elapsed >= 2200;

      if (!doneByFrames && !doneByBudget && !hardCap) {
        window.requestAnimationFrame(tick);
      } else {
        if (deltas.length < 4) {
          resolve({ measuredHz: 60, avgFrameMs: 16.7, frameJitterMs: 0.8, deltas: [] });
          return;
        }
        const sorted = [...deltas].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        const variance =
          deltas.reduce((acc, d) => acc + Math.abs(d - median), 0) / deltas.length;

        resolve({
          measuredHz: snapRefreshRate(1000 / median),
          avgFrameMs: Number(avg.toFixed(1)),
          frameJitterMs: Number(variance.toFixed(1)),
          deltas: deltas.map((d) => Number(d.toFixed(1))),
        });
      }
    };

    window.requestAnimationFrame(tick);
  });
}

export function measureEventLoopLag(): Promise<number> {
  return new Promise((resolve) => {
    if (typeof MessageChannel === 'undefined') {
      resolve(0.2);
      return;
    }

    const channel = new MessageChannel();
    const samples: number[] = [];
    let count = 0;
    let start = performance.now();

    channel.port1.onmessage = () => {
      const lag = Math.max(0, performance.now() - start);
      samples.push(lag);
      count += 1;

      if (count < 12) {
        start = performance.now();
        channel.port2.postMessage(null);
      } else {
        channel.port1.close();
        channel.port2.close();
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        resolve(Number(avg.toFixed(2)));
      }
    };

    channel.port2.postMessage(null);
  });
}

async function detectBatteryStatus(): Promise<{
  onBattery: boolean | null;
  batteryLevelPercent: number | null;
}> {
  const nav = navigator as NavigatorExtended;
  if (typeof nav.getBattery !== 'function') {
    return { onBattery: null, batteryLevelPercent: null };
  }
  try {
    const battery = await Promise.race([
      nav.getBattery(),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 400)),
    ]);
    if (!battery) {
      return { onBattery: null, batteryLevelPercent: null };
    }
    return {
      onBattery: !battery.charging,
      batteryLevelPercent: Math.round((battery.level ?? 1) * 100),
    };
  } catch {
    return { onBattery: null, batteryLevelPercent: null };
  }
}

function measureGpuLoadCadence(
  targetHz: number,
  isSoftwareRenderer: boolean,
): Promise<{
  gpuStressFps: number;
  gpuStressJitterMs: number;
  gpuStressDrops: number;
  gpuStressWorkloadLabel: string;
}> {
  return new Promise((resolve) => {
    const engine = createGpuStressEngine(isSoftwareRenderer ? 'medium' : 'extreme', isSoftwareRenderer);
    const deltas: number[] = [];
    let lastTime = 0;
    let frameCount = 0;
    const totalFrames = isSoftwareRenderer ? 12 : 28;
    const startAt = performance.now();

    const tick = (now: number) => {
      try {
        engine.renderPass(now);
      } catch {
        // Ignore single frame errors
      }

      if (lastTime > 0 && frameCount >= 2) {
        const dt = now - lastTime;
        if (dt > 1 && dt < 220) {
          deltas.push(dt);
        }
      }
      lastTime = now;
      frameCount += 1;

      const elapsed = now - startAt;
      const doneByFrames = frameCount >= totalFrames;
      const doneByBudget = elapsed >= 1500 && deltas.length >= 4;
      const hardCap = elapsed >= 2200;

      if (!doneByFrames && !doneByBudget && !hardCap) {
        window.requestAnimationFrame(tick);
      } else {
        engine.dispose();
        if (deltas.length < 4) {
          resolve({
            gpuStressFps: targetHz,
            gpuStressJitterMs: 0.9,
            gpuStressDrops: 0,
            gpuStressWorkloadLabel: engine.label,
          });
          return;
        }
        const sorted = [...deltas].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        const jitter =
          deltas.reduce((acc, d) => acc + Math.abs(d - median), 0) / deltas.length;
        const targetMs = 1000 / Math.max(30, targetHz);
        const drops = deltas.filter((d) => d > targetMs * 1.5).length;

        resolve({
          gpuStressFps: Math.max(10, Math.min(360, Math.round(1000 / avg))),
          gpuStressJitterMs: Number(jitter.toFixed(1)),
          gpuStressDrops: drops,
          gpuStressWorkloadLabel: engine.label,
        });
      }
    };

    window.requestAnimationFrame(tick);
  });
}

export async function runBrowserHardwareProbe(
  onStep: (progress: number, statusText: string) => void,
): Promise<HardwareScanInput> {
  const nav = navigator as NavigatorExtended;

  onStep(15, 'Определение видеокарты, WebGL2 и текстурного буфера...');
  const gpu = detectWebGlInfo();
  const isSoftwareRenderer = classifyGpu(gpu.renderer).vendor === 'software';

  onStep(32, 'Анализ потоков CPU, ОЗУ, батареи и сети...');
  const cpuCores = navigator.hardwareConcurrency || 4;
  const deviceMemoryGb =
    typeof nav.deviceMemory === 'number' && Number.isFinite(nav.deviceMemory)
      ? nav.deviceMemory
      : null;
  const dpr = window.devicePixelRatio || 1;
  const screenWidth = Math.round((window.screen.width || 1920) * dpr);
  const screenHeight = Math.round((window.screen.height || 1080) * dpr);
  const { osName, isWindows } = detectOs();
  const connectionRttMs =
    typeof nav.connection?.rtt === 'number' && Number.isFinite(nav.connection.rtt)
      ? nav.connection.rtt
      : null;
  const battery = await detectBatteryStatus();

  onStep(52, 'Замер задержки планировщика событий (Input Lag)...');
  const eventLoopLagMs = await measureEventLoopLag();

  onStep(70, 'Замер герцовки дисплея и базового фреймтайма...');
  const cadence = await measureDisplayCadence();

  onStep(88, 'Нагрузочный тест видеокарты (WebGL шейдеры и рендер)...');
  const gpuLoad = await measureGpuLoadCadence(cadence.measuredHz, isSoftwareRenderer);

  onStep(100, 'Формирование подробного отчёта, BIOS-аудита и твиков...');

  return {
    cpuCores,
    deviceMemoryGb,
    gpuRenderer: gpu.renderer,
    gpuVendorRaw: gpu.vendor,
    webgl2Supported: gpu.webgl2Supported,
    maxTextureSize: gpu.maxTextureSize,
    screenWidth,
    screenHeight,
    measuredHz: cadence.measuredHz,
    avgFrameMs: cadence.avgFrameMs,
    frameJitterMs: cadence.frameJitterMs,
    frameDeltas: cadence.deltas,
    gpuStressFps: gpuLoad.gpuStressFps,
    gpuStressJitterMs: gpuLoad.gpuStressJitterMs,
    gpuStressDrops: gpuLoad.gpuStressDrops,
    gpuStressWorkloadLabel: gpuLoad.gpuStressWorkloadLabel,
    eventLoopLagMs,
    onBattery: battery.onBattery,
    batteryLevelPercent: battery.batteryLevelPercent,
    osName,
    isWindows,
    connectionRttMs,
  };
}
