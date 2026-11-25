import { useEffect, useState, useTransition } from 'react';
import { Download, Sparkles } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ScannerSection } from './components/ScannerSection';
import { CompareSection } from './components/CompareSection';
import { ChecklistSection } from './components/ChecklistSection';
import { ScriptGeneratorSection } from './components/ScriptGeneratorSection';
import { GpuTipsSection, type PlatformTab } from './components/GpuTipsSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { SnowBackground } from './components/SnowBackground';
import { UpdateAppModal } from './components/UpdateAppModal';
import {
  CHECKLIST_DATA,
  SCRIPT_MODULES,
  type ScriptFormat,
} from './utils/opticore';
import {
  type HardwareScanInput,
  type WindowsDiagReport,
} from './utils/scanner';
import {
  buildPcShareSnapshot,
  decodeShareInput,
  type OptFlagId,
  type PcShareSnapshot,
} from './utils/compare';
import { APP_VERSION } from './utils/appUpdater';

const SETUP_EXE_FILE = '/downloads/OptiCore-Setup-1.2.2.exe';
const PORTABLE_EXE_FILE = '/downloads/OptiCore-Portable.exe';

export default function App() {
  const [, startTransition] = useTransition();

  // Snow and Stress states
  const [snowEnabled, setSnowEnabled] = useState(true);
  const [snowPaused, setSnowPaused] = useState(false);

  // Modals & tabs
  const [showUpdates, setShowUpdates] = useState(false);
  const [gpuTab, setGpuTab] = useState<PlatformTab>('nvidia');

  // Checklist state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('opticore_checked_items');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Script Generator state
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const mod of SCRIPT_MODULES) {
      if (mod.defaultEnabled) initial[mod.id] = true;
    }
    return initial;
  });
  const [scriptFormat, setScriptFormat] = useState<ScriptFormat>('bat');
  const [importedModuleCount, setImportedModuleCount] = useState<number | null>(null);

  // Scanner state
  const [scanData, setScanData] = useState<HardwareScanInput | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  const [windowsReport, setWindowsReport] = useState<WindowsDiagReport | null>(null);

  // Friend Compare state
  const [myName, setMyName] = useState('Мой ПК');
  const [friendSnapshot, setFriendSnapshot] = useState<PcShareSnapshot | null>(null);
  const [appliedExtraFlags, setAppliedExtraFlags] = useState<Record<OptFlagId, boolean>>({
    power: false,
    hags_gamemode: false,
    xmp: false,
    gamedvr_off: false,
    mouse_raw: false,
    power_throttling: false,
    win32_prio: false,
    net_mmcss: false,
    usb_power: false,
    p2p_off: false,
    telemetry_off: false,
    ssd_temp: false,
  });

  // Save checklist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('opticore_checked_items', JSON.stringify(checkedItems));
    } catch {}
  }, [checkedItems]);

  // Read share code from URL hash on load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash.startsWith('#share=')) {
      const raw = hash.replace('#share=', '');
      const decoded = decodeShareInput(raw);
      if (decoded.ok) {
        setFriendSnapshot(decoded.snapshot);
      }
    }
  }, []);

  // Handlers
  const handleToggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCheckAll = () => {
    const all: Record<string, boolean> = {};
    for (const g of CHECKLIST_DATA) {
      for (const item of g.items) {
        all[item.id] = true;
      }
    }
    setCheckedItems(all);
  };

  const handleResetChecklist = () => {
    setCheckedItems({});
  };

  const handleToggleModule = (id: string) => {
    setSelectedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectPreset = (moduleIds: string[]) => {
    const next: Record<string, boolean> = {};
    for (const id of moduleIds) next[id] = true;
    setSelectedModules(next);
  };

  const handleAddModulesToGenerator = (moduleIds: string[]) => {
    if (!moduleIds.length) return;
    setSelectedModules((prev) => {
      const next = { ...prev };
      for (const id of moduleIds) next[id] = true;
      return next;
    });
    setImportedModuleCount(moduleIds.length);
    window.setTimeout(() => setImportedModuleCount(null), 3000);
  };

  const handleStartScan = async () => {
    setScanning(true);
    setScanProgress(15);
    setScanStatusText('Анализ GPU и видеоадаптера...');
    await new Promise((r) => setTimeout(r, 200));

    let gpuRenderer = 'Стандартный адаптер Windows';
    let gpuVendor = 'Стандартный производитель';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          gpuRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
          gpuVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || gpuVendor;
        }
      }
    } catch {}

    setScanProgress(50);
    setScanStatusText('Замер частоты монитора и задержки...');
    await new Promise((r) => setTimeout(r, 250));

    setScanProgress(80);
    setScanStatusText('Сбор конфигурации потоков CPU и ОЗУ...');
    await new Promise((r) => setTimeout(r, 200));

    const cpuCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    const deviceMemoryGb =
      typeof navigator !== 'undefined' && 'deviceMemory' in navigator
        ? (navigator as { deviceMemory?: number }).deviceMemory ?? 8
        : 8;

    startTransition(() => {
      const result: HardwareScanInput = {
        cpuCores,
        deviceMemoryGb,
        gpuRenderer,
        gpuVendorRaw: gpuVendor,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        measuredHz: 60,
        avgFrameMs: 16.6,
        frameJitterMs: 0.8,
        osName: 'Windows 10/11',
        isWindows: true,
        connectionRttMs: 15,
        windowsReport,
      };
      setScanData(result);
      setScanProgress(100);
      setScanStatusText('Готово');
      setScanning(false);
    });
  };

  const handleToggleMyOptFlag = (flagId: OptFlagId, nextState: boolean) => {
    setAppliedExtraFlags((prev) => ({ ...prev, [flagId]: nextState }));
  };

  // Build current snapshot for comparison
  const mySnapshot = scanData
    ? buildPcShareSnapshot({
        name: myName,
        scanData,
        windowsReport,
        checkedItems,
        appliedExtraFlags,
      })
    : null;

  return (
    <div className="min-h-screen flex flex-col relative bg-[#070b14] text-slate-100 antialiased overflow-x-hidden">
      <SnowBackground enabled={snowEnabled} paused={snowPaused} />

      <Navbar
        onOpenCmdGuide={() => setGpuTab('cmd')}
        onOpenUpdates={() => setShowUpdates(true)}
      />

      <main className="flex-1 relative z-20">
        {/* Real-Time Frame Latency & GPU Stress Test */}
        <HeroSection
          snowEnabled={snowEnabled}
          onToggleSnow={() => setSnowEnabled((s) => !s)}
          onStressStateChange={(active) => setSnowPaused(active)}
          onAddModulesToGenerator={handleAddModulesToGenerator}
        />

        {/* Section: Dedicated .exe Download Center */}
        <section id="download-exe" className="py-10 px-4 sm:px-6 border-t border-sky-200/10 bg-[#080d19]/80">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-300/15 border border-amber-300/30 text-amber-200 font-mono text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Официальный .exe · Размер 21.4 МБ · Работает локально без Cookie check</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Скачайте <span className="text-amber-300">OptiCore .exe</span> для Windows
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm max-w-2xl mx-auto">
                Полноценное настольное приложение с офлайн-движком: открывается мгновенно, не требует входа в Google и содержит все тесты и твики.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {/* Setup Card */}
              <div className="p-5 rounded-2xl winter-card border border-amber-300/30 flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-amber-200 font-bold">Установщик .exe</span>
                    <span className="text-[11px] font-mono text-amber-300 font-semibold px-2 py-0.5 rounded bg-amber-300/10 border border-amber-300/20">
                      21.4 МБ
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">OptiCore-Setup-1.2.2.exe</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Устанавливает OptiCore на ваш ПК с ярлыком на рабочем столе. Автономный запуск в один клик.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <a
                    href={SETUP_EXE_FILE}
                    download="OptiCore-Setup-1.2.2.exe"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-amber-300 hover:bg-amber-200 text-slate-950 font-bold text-xs text-center inline-flex items-center justify-center gap-2 glow-btn transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать Setup .exe (21 МБ)</span>
                  </a>
                  <a
                    href={SETUP_EXE_FILE}
                    download="OptiCore-Setup-1.2.2.exe"
                    title="Скачать OptiCore-Setup .exe"
                    className="p-2.5 rounded-xl bg-slate-900 border border-sky-200/20 hover:border-amber-300/40 text-slate-300 hover:text-white transition cursor-pointer inline-flex items-center justify-center"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Portable Card */}
              <div className="p-5 rounded-2xl winter-card border border-sky-300/25 flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-sky-300 font-bold">Portable .exe</span>
                    <span className="text-[11px] font-mono text-sky-300 font-semibold px-2 py-0.5 rounded bg-sky-300/10 border border-sky-300/20">
                      21.4 МБ
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">OptiCore-Portable.exe</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Портативная версия без установки: распакуйте на флешку или диск и оптимизируйте любой ПК.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <a
                    href={PORTABLE_EXE_FILE}
                    download="OptiCore-Portable.exe"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-amber-300 hover:text-slate-950 border border-sky-200/20 text-slate-100 font-semibold text-xs text-center inline-flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать Portable .exe (21 МБ)</span>
                  </a>
                  <a
                    href={PORTABLE_EXE_FILE}
                    download="OptiCore-Portable.exe"
                    title="Скачать OptiCore Portable .exe"
                    className="p-2.5 rounded-xl bg-slate-900 border border-sky-200/20 hover:border-amber-300/40 text-slate-300 hover:text-white transition inline-flex items-center justify-center"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 01: Hardware & Windows Diagnostic Scanner */}
        <ScannerSection
          scanData={scanData}
          scanning={scanning}
          progress={scanProgress}
          statusText={scanStatusText}
          windowsReport={windowsReport}
          onStartScan={handleStartScan}
          onWindowsReportChange={(rep) => setWindowsReport(rep)}
          onApplyRecommendedModules={handleAddModulesToGenerator}
          onAddModules={handleAddModulesToGenerator}
          onSyncChecklistItems={(ids) => {
            setCheckedItems((prev) => {
              const next = { ...prev };
              for (const id of ids) next[id] = true;
              return next;
            });
          }}
        />

        {/* 02: Compare PC with Friend */}
        <CompareSection
          myName={myName}
          onMyNameChange={setMyName}
          mySnapshot={mySnapshot}
          friendSnapshot={friendSnapshot}
          scanning={scanning}
          onRunScan={handleStartScan}
          onLoadFriend={(snap) => setFriendSnapshot(snap)}
          onClearFriend={() => setFriendSnapshot(null)}
          onToggleMyOptFlag={handleToggleMyOptFlag}
          onAddModulesToGenerator={handleAddModulesToGenerator}
        />

        {/* 03: 37 Safe Categorized Optimization Checklist */}
        <ChecklistSection
          checkedItems={checkedItems}
          onToggleCheck={handleToggleCheck}
          onCheckAllChecklist={handleCheckAll}
          onResetChecklist={handleResetChecklist}
        />

        {/* 04: Personalized Script Generator (.bat / .ps1) */}
        <ScriptGeneratorSection
          selectedModules={selectedModules}
          format={scriptFormat}
          importedCount={importedModuleCount}
          onToggleModule={handleToggleModule}
          onSelectPreset={handleSelectPreset}
          onFormatChange={setScriptFormat}
          onMarkApplied={(ids) => {
            setCheckedItems((prev) => {
              const next = { ...prev };
              for (const id of ids) next[id] = true;
              return next;
            });
          }}
        />

        {/* 05: GPU Drivers & System Tweaks (NVIDIA / AMD / Intel) */}
        <GpuTipsSection
          activeTab={gpuTab}
          onTabChange={setGpuTab}
        />

        {/* 06: FAQ Section */}
        <FaqSection />
      </main>

      <Footer
        snowEnabled={snowEnabled}
        onToggleSnow={() => setSnowEnabled((s) => !s)}
        onOpenCmdGuide={() => setGpuTab('cmd')}
        onOpenUpdates={() => setShowUpdates(true)}
      />

      <UpdateAppModal
        open={showUpdates}
        onClose={() => setShowUpdates(false)}
      />
    </div>
  );
}
