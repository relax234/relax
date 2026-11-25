import type { HardwareScanInput } from './scanner';

interface NavigatorExtended extends Navigator {
  deviceMemory?: number;
  connection?: {
    rtt?: number;
  };
  userAgentData?: {
    platform?: string;
  };
}

function detectWebGlGpu(): { renderer: string; vendor: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);

    if (!gl) {
      return { renderer: 'Не определена', vendor: '' };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
      const vendor = String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '');
      if (renderer) {
        return { renderer, vendor };
      }
    }

    return {
      renderer: String(gl.getParameter(gl.RENDERER) || 'Не определена'),
      vendor: String(gl.getParameter(gl.VENDOR) || ''),
    };
  } catch {
    return { renderer: 'Не определена', vendor: '' };
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
    const maxFrames = 36;

    const tick = (now: number) => {
      if (lastTime > 0) {
        const dt = now - lastTime;
        if (dt > 1 && dt < 120) {
          deltas.push(dt);
        }
      }
      lastTime = now;
      frameCount += 1;

      if (frameCount < maxFrames) {
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

export async function runBrowserHardwareProbe(
  onStep: (progress: number, statusText: string) => void,
): Promise<HardwareScanInput> {
  const nav = navigator as NavigatorExtended;

  onStep(15, 'Определение видеокарты через WebGL...');
  const gpu = detectWebGlGpu();

  onStep(40, 'Анализ потоков CPU, памяти и экрана...');
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

  onStep(70, 'Замер герцовки дисплея и стабильности фреймтайма...');
  const cadence = await measureDisplayCadence();

  onStep(100, 'Формирование отчёта и рекомендаций FPS...');

  return {
    cpuCores,
    deviceMemoryGb,
    gpuRenderer: gpu.renderer,
    gpuVendorRaw: gpu.vendor,
    screenWidth,
    screenHeight,
    measuredHz: cadence.measuredHz,
    avgFrameMs: cadence.avgFrameMs,
    frameJitterMs: cadence.frameJitterMs,
    frameDeltas: cadence.deltas,
    osName,
    isWindows,
    connectionRttMs,
  };
}
