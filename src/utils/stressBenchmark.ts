import { computeFrameMetrics } from './frameMonitor';

export type StressIntensity = 'medium' | 'extreme';

export interface StressAntiFreezeTip {
  id: string;
  severity: 'high' | 'medium' | 'ok';
  title: string;
  reason: string;
  action: string;
  moduleIds: string[];
}

export interface StressBenchmarkSummary {
  intensity: StressIntensity;
  durationSec: number;
  avgFps: number;
  onePercentLowFps: number;
  worstFrameMs: number;
  jitterMs: number;
  dropCount: number;
  stabilityPercent: number;
  cpuWorkersUsed: number;
  gpuWorkloadLabel: string;
  verdict: string;
  verdictTone: 'good' | 'warn' | 'bad';
  antiFreezeTips: StressAntiFreezeTip[];
}

export function buildStressAntiFreezeTips(params: {
  avgFps: number;
  onePercentLowFps: number;
  worstFrameMs: number;
  jitterMs: number;
  targetFrameMs: number;
  dropCount: number;
  stabilityPercent: number;
  gpuWorkloadLabel: string;
  isSoftwareRenderer?: boolean;
}): StressAntiFreezeTip[] {
  const tips: StressAntiFreezeTip[] = [];
  const isSoftware =
    params.isSoftwareRenderer ||
    /canvas|swiftshader|llvmpipe|192×192/i.test(params.gpuWorkloadLabel);

  if (isSoftware) {
    tips.push({
      id: 'gpu-hw-accel',
      severity: 'high',
      title: 'Тест шёл без аппаратного ускорения видеокарты',
      reason: 'В браузере активен программный рендер (SwiftShader / 2D) — из-за этого любая 3D-нагрузка грузит CPU.',
      action: 'Включите «Аппаратное ускорение» в настройках браузера и переустановите свежий драйвер GPU.',
      moduleIds: ['hagsAndGameMode', 'cleanShaderCache'],
    });
  }

  if (
    params.dropCount >= 4 ||
    params.worstFrameMs >= params.targetFrameMs * 2.2 ||
    params.stabilityPercent < 78
  ) {
    tips.push({
      id: 'freeze-cpu-power',
      severity: 'high',
      title: 'Просадки кадров и фризы под смешанной нагрузкой CPU + GPU',
      reason: `Пик кадра доходил до ${params.worstFrameMs} мс (${params.dropCount} дропов) — ядра CPU сбрасывают частоты или мешают фоновые процессы.`,
      action: 'Включите схему «Макс. производительность», отключите парковку ядер CPU, Power Throttling и энергосбережение PCIe.',
      moduleIds: [
        'restorePoint',
        'ultimatePower',
        'cpuCoreParkingOff',
        'disablePowerThrottling',
        'pciExpressPowerOff',
      ],
    });
    tips.push({
      id: 'freeze-overlays-cache',
      severity: 'medium',
      title: 'Убрать фоновые буферы экрана и пересобрать кэш шейдеров',
      reason: 'Xbox GameDVR, фоновые UWP и битые старые шейдеры DirectX вызывают резкие пики фреймтайма в момент компиляции.',
      action: 'Отключите GameDVR, дайте играм приоритет MMCSS Tasks\\Games и очистите старый DX-кэш.',
      moduleIds: ['gameTweaks', 'gpuPriority', 'disableOverlays', 'cleanShaderCache'],
    });
  } else if (
    params.jitterMs >= 2.2 ||
    params.onePercentLowFps < params.avgFps * 0.72 ||
    params.dropCount > 0
  ) {
    tips.push({
      id: 'freeze-frame-pacing',
      severity: 'medium',
      title: `Небольшой джиттер кадра (${params.jitterMs} мс) под нагрузкой видеокарты`,
      reason: `1% Low просел до ${params.onePercentLowFps} FPS при среднем ${params.avgFps} FPS — очередь кадров DWM/GPU можно разгрузить.`,
      action: 'Включите HAGS, оптимизацию оконного режима Flip Model и запретите усыпление дисков с текстурами.',
      moduleIds: ['hagsAndGameMode', 'windowedOptWin11', 'win32PrioritySep', 'diskSleepOff'],
    });
  } else {
    tips.push({
      id: 'freeze-ok',
      severity: 'ok',
      title: 'Видеокарта и потоки держат нагрузку ровно без фризов',
      reason: `1% Low ${params.onePercentLowFps} FPS, джиттер ${params.jitterMs} мс — критичных статтеров не обнаружено.`,
      action: 'Для закрепления минимального Input Lag в играх можно добавить приоритет MMCSS и HAGS.',
      moduleIds: ['gpuPriority', 'hagsAndGameMode'],
    });
  }

  return tips;
}

export function computeStressSummary(params: {
  deltas: number[];
  intensity: StressIntensity;
  cpuWorkersUsed: number;
  gpuWorkloadLabel: string;
  durationSec: number;
  isSoftwareRenderer?: boolean;
}): StressBenchmarkSummary {
  const valid = params.deltas.filter((d) => Number.isFinite(d) && d > 0.5 && d < 250);
  const metrics = computeFrameMetrics(valid);

  const dropThreshold = metrics.targetFrameMs * 1.5;
  let dropCount = 0;
  for (const dt of valid) {
    if (dt > dropThreshold) {
      dropCount += 1;
    }
  }

  const dropRatio = valid.length > 0 ? dropCount / valid.length : 0;
  const jitterPenalty = Math.min(45, metrics.jitterMs * 4.5);
  const ratioPenalty = Math.min(45, dropRatio * 100);
  const fpsRatio = metrics.detectedHz > 0 ? Math.min(1, metrics.onePercentLowFps / metrics.detectedHz) : 1;
  const lowFpsPenalty = fpsRatio < 0.7 ? (0.7 - fpsRatio) * 50 : 0;

  const stabilityPercent = Math.max(
    10,
    Math.min(100, Math.round(100 - jitterPenalty - ratioPenalty - lowFpsPenalty)),
  );

  let verdict = 'Отличная выносливость под нагрузкой';
  let verdictTone: StressBenchmarkSummary['verdictTone'] = 'good';
  if (stabilityPercent < 60 || dropRatio > 0.25) {
    verdict = 'Сильные просадки и фризы под нагрузкой';
    verdictTone = 'bad';
  } else if (stabilityPercent < 82 || dropCount >= 4) {
    verdict = 'Умеренные просадки — есть запас для твиков';
    verdictTone = 'warn';
  }

  const antiFreezeTips = buildStressAntiFreezeTips({
    avgFps: metrics.fps,
    onePercentLowFps: metrics.onePercentLowFps,
    worstFrameMs: metrics.worstFrameMs,
    jitterMs: metrics.jitterMs,
    targetFrameMs: metrics.targetFrameMs,
    dropCount,
    stabilityPercent,
    gpuWorkloadLabel: params.gpuWorkloadLabel,
    isSoftwareRenderer: params.isSoftwareRenderer,
  });

  return {
    intensity: params.intensity,
    durationSec: Number(params.durationSec.toFixed(1)),
    avgFps: metrics.fps,
    onePercentLowFps: metrics.onePercentLowFps,
    worstFrameMs: metrics.worstFrameMs,
    jitterMs: metrics.jitterMs,
    dropCount,
    stabilityPercent,
    cpuWorkersUsed: params.cpuWorkersUsed,
    gpuWorkloadLabel: params.gpuWorkloadLabel,
    verdict,
    verdictTone,
    antiFreezeTips,
  };
}

export interface CpuWorkerPool {
  workerCount: number;
  stop: () => void;
}

export function startCpuStressWorkers(
  intensity: StressIntensity,
  hardwareConcurrency: number,
  isSoftwareRenderer: boolean,
): CpuWorkerPool {
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
    return { workerCount: 0, stop: () => {} };
  }

  const maxCores = Math.max(2, Math.min(12, hardwareConcurrency || 4));
  const targetWorkers = isSoftwareRenderer
    ? 1
    : intensity === 'extreme'
      ? Math.min(8, maxCores)
      : Math.min(3, Math.max(2, Math.floor(maxCores / 2)));

  const burstMs = isSoftwareRenderer ? 12 : intensity === 'extreme' ? 42 : 24;
  const restMs = isSoftwareRenderer ? 14 : intensity === 'extreme' ? 3 : 8;

  const workerSource = `
    const buf = new Float64Array(4096);
    for (let i = 0; i < buf.length; i++) buf[i] = i * 0.137 + 1.0;
    let running = true;
    self.onmessage = (e) => { if (e.data === 'stop') running = false; };
    function cycle() {
      if (!running) return;
      const start = performance.now();
      let acc = 0.5;
      while (performance.now() - start < ${burstMs}) {
        for (let i = 0; i < 1024; i++) {
          const v = buf[i];
          acc = Math.sin(v + acc * 0.001) * Math.cos(v * 0.5) + Math.sqrt(Math.abs(acc) + 1.0);
          buf[i] = acc;
        }
      }
      setTimeout(cycle, ${restMs});
    }
    cycle();
  `;

  let blobUrl = '';
  const workers: Worker[] = [];
  try {
    const blob = new Blob([workerSource], { type: 'application/javascript' });
    blobUrl = URL.createObjectURL(blob);
    for (let i = 0; i < targetWorkers; i++) {
      const w = new Worker(blobUrl);
      workers.push(w);
    }
  } catch {
    for (const w of workers) {
      try {
        w.terminate();
      } catch {
        // Ignore cleanup errors
      }
    }
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    return { workerCount: 0, stop: () => {} };
  }

  return {
    workerCount: workers.length,
    stop: () => {
      for (const w of workers) {
        try {
          w.postMessage('stop');
          w.terminate();
        } catch {
          // Ignore cleanup errors
        }
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    },
  };
}

export interface GpuStressEngine {
  label: string;
  renderPass: (timeMs: number) => void;
  dispose: () => void;
}

export function createGpuStressEngine(
  intensity: StressIntensity,
  isSoftwareRenderer: boolean,
): GpuStressEngine {
  const width = isSoftwareRenderer ? 192 : intensity === 'extreme' ? 1280 : 768;
  const height = isSoftwareRenderer ? 192 : intensity === 'extreme' ? 720 : 432;
  const shaderIters = isSoftwareRenderer ? 4 : intensity === 'extreme' ? 48 : 18;
  const triangleCount = isSoftwareRenderer ? 120 : intensity === 'extreme' ? 9000 : 2600;
  const repeatDraws = !isSoftwareRenderer && intensity === 'extreme' ? 2 : 1;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const gl =
    canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    }) ||
    (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

  if (gl) {
    const vertSrc = `
      attribute vec2 a_pos;
      uniform float u_time;
      varying vec2 v_uv;
      void main() {
        float c = cos(u_time * 0.4 + a_pos.x * 1.7);
        float s = sin(u_time * 0.4 + a_pos.y * 1.7);
        vec2 p = vec2(a_pos.x * c - a_pos.y * s * 0.15, a_pos.y);
        v_uv = p * 0.5 + 0.5;
        gl_Position = vec4(p, 0.0, 1.0);
      }
    `;

    const fragSrc = `
      precision highp float;
      uniform float u_time;
      varying vec2 v_uv;
      void main() {
        vec2 p = v_uv * 3.0 - 1.5;
        float acc = 0.0;
        for (int i = 0; i < ${shaderIters}; i++) {
          float fi = float(i);
          p = abs(p) / max(0.15, dot(p, p)) - vec2(0.78 + 0.08 * sin(u_time + fi));
          acc += length(p) * 0.045;
        }
        gl_FragColor = vec4(
          0.5 + 0.5 * sin(acc + u_time),
          0.5 + 0.5 * cos(acc * 1.3 - u_time),
          0.5 + 0.5 * sin(acc * 0.7),
          0.18
        );
      }
    `;

    const compileShader = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compileShader(gl.VERTEX_SHADER, vertSrc);
    const fs = compileShader(gl.FRAGMENT_SHADER, fragSrc);
    const prog = vs && fs ? gl.createProgram() : null;

    if (vs && fs && prog) {
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);

      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        // Fullscreen quad (2 triangles) + overlapping stress triangles
        const totalVerts = 6 + triangleCount * 3;
        const verts = new Float32Array(totalVerts * 2);
        // Quad
        verts.set([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1], 0);
        // Overlapping triangles across viewport for heavy raster/blend overdraw
        for (let t = 0; t < triangleCount; t++) {
          const base = 12 + t * 6;
          const ox = ((t * 73) % 100) / 100 - 0.5;
          const oy = ((t * 137) % 100) / 100 - 0.5;
          const sz = 0.55;
          verts[base] = ox - sz;
          verts[base + 1] = oy - sz;
          verts[base + 2] = ox + sz;
          verts[base + 3] = oy - sz * 0.5;
          verts[base + 4] = ox;
          verts[base + 5] = oy + sz;
        }

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(prog, 'a_pos');
        const timeLoc = gl.getUniformLocation(prog, 'u_time');

        gl.viewport(0, 0, width, height);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const label = isSoftwareRenderer
          ? `WebGL Шейдер (${width}×${height})`
          : `WebGL ${width}×${height} · ${shaderIters}×${repeatDraws} шейдер + ${triangleCount} треуг.`;

        return {
          label,
          renderPass: (timeMs: number) => {
            gl.useProgram(prog);
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
            gl.clearColor(0.02, 0.03, 0.06, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            for (let pass = 0; pass < repeatDraws; pass++) {
              gl.uniform1f(timeLoc, timeMs * 0.0015 + pass * 0.37);
              gl.drawArrays(gl.TRIANGLES, 0, totalVerts);
            }
            gl.flush();
          },
          dispose: () => {
            try {
              gl.deleteBuffer(vbo);
              gl.deleteProgram(prog);
              gl.deleteShader(vs);
              gl.deleteShader(fs);
              gl.getExtension('WEBGL_lose_context')?.loseContext();
            } catch {
              // Ignore cleanup errors
            }
          },
        };
      }
    }
  }

  // Fallback heavy 2D canvas pass if WebGL fails
  const ctx = canvas.getContext('2d');
  const rectCount = isSoftwareRenderer ? 40 : intensity === 'extreme' ? 1400 : 450;
  return {
    label: `2D Canvas (${width}×${height} · ${rectCount} слоёв)`,
    renderPass: (timeMs: number) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < rectCount; i++) {
        const x = (timeMs * 0.17 + i * 41) % (width - 48);
        const y = (timeMs * 0.11 + i * 67) % (height - 48);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(34,211,238,0.16)' : 'rgba(139,92,246,0.16)';
        ctx.fillRect(x, y, 48, 48);
      }
    },
    dispose: () => {},
  };
}
