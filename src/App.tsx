import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ScannerSection } from './components/ScannerSection';
import { CompareSection } from './components/CompareSection';
import { ChecklistSection } from './components/ChecklistSection';
import { ScriptGeneratorSection } from './components/ScriptGeneratorSection';
import { GpuTipsSection } from './components/GpuTipsSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { runBrowserHardwareProbe } from './utils/browserProbe';
import {
  OPT_MODULE_TO_FLAGS,
  OPTIMIZATION_COMPARE_ITEMS,
  buildPcShareSnapshot,
  decodeShareInput,
  type OptFlagId,
  type PcShareSnapshot,
} from './utils/compare';
import { CHECKLIST_DATA, SCRIPT_MODULES, type ScriptFormat } from './utils/opticore';
import type { HardwareScanInput, WindowsDiagReport } from './utils/scanner';

const STORAGE_KEYS = {
  checks: 'opticore_checks',
  optFlags: 'opticore_opt_flags',
  myName: 'opticore_my_name',
  scan: 'opticore_my_scan',
  winReport: 'opticore_win_report',
  friend: 'opticore_friend_pc',
} as const;

function readStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getInitialFriendFromUrlOrStorage(): {
  snapshot: PcShareSnapshot | null;
  fromUrl: boolean;
} {
  try {
    const params = new URLSearchParams(window.location.search);
    const pcParam = params.get('pc');
    if (pcParam) {
      const decoded = decodeShareInput(pcParam);
      if (decoded.ok) {
        return { snapshot: decoded.snapshot, fromUrl: true };
      }
    }
  } catch {
    // Ignore URL parsing errors
  }
  return {
    snapshot: readStorageJson<PcShareSnapshot | null>(STORAGE_KEYS.friend, null),
    fromUrl: false,
  };
}

function getDefaultModules(): Record<string, boolean> {
  const initial: Record<string, boolean> = {};
  for (const mod of SCRIPT_MODULES) {
    initial[mod.id] = mod.defaultEnabled;
  }
  return initial;
}

export default function App() {
  const initialFriend = useMemo(() => getInitialFriendFromUrlOrStorage(), []);

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() =>
    readStorageJson(STORAGE_KEYS.checks, {}),
  );
  const [appliedExtraFlags, setAppliedExtraFlags] = useState<Record<string, boolean>>(() =>
    readStorageJson(STORAGE_KEYS.optFlags, {}),
  );
  const [myName, setMyName] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.myName) || 'Мой ПК';
    } catch {
      return 'Мой ПК';
    }
  });
  const [scanData, setScanData] = useState<HardwareScanInput | null>(() =>
    readStorageJson<HardwareScanInput | null>(STORAGE_KEYS.scan, null),
  );
  const [windowsReport, setWindowsReport] = useState<WindowsDiagReport | null>(() =>
    readStorageJson<WindowsDiagReport | null>(STORAGE_KEYS.winReport, null),
  );
  const [friendSnapshot, setFriendSnapshot] = useState<PcShareSnapshot | null>(
    initialFriend.snapshot,
  );

  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>(getDefaultModules);
  const [format, setFormat] = useState<ScriptFormat>('bat');

  // Auto-scroll to #compare when opening a shared friend link (?pc=...)
  useEffect(() => {
    if (!initialFriend.fromUrl) return;
    const timer = window.setTimeout(() => {
      document.getElementById('compare')?.scrollIntoView({ behavior: 'smooth' });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [initialFriend.fromUrl]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.checks, JSON.stringify(checkedItems));
    } catch {
      // Ignore storage errors
    }
  }, [checkedItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.optFlags, JSON.stringify(appliedExtraFlags));
    } catch {
      // Ignore storage errors
    }
  }, [appliedExtraFlags]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.myName, myName);
    } catch {
      // Ignore storage errors
    }
  }, [myName]);

  useEffect(() => {
    try {
      if (scanData) {
        localStorage.setItem(STORAGE_KEYS.scan, JSON.stringify(scanData));
      }
    } catch {
      // Ignore storage errors
    }
  }, [scanData]);

  useEffect(() => {
    try {
      if (windowsReport) {
        localStorage.setItem(STORAGE_KEYS.winReport, JSON.stringify(windowsReport));
      } else {
        localStorage.removeItem(STORAGE_KEYS.winReport);
      }
    } catch {
      // Ignore storage errors
    }
  }, [windowsReport]);

  useEffect(() => {
    try {
      if (friendSnapshot) {
        localStorage.setItem(STORAGE_KEYS.friend, JSON.stringify(friendSnapshot));
      } else {
        localStorage.removeItem(STORAGE_KEYS.friend);
      }
    } catch {
      // Ignore storage errors
    }
  }, [friendSnapshot]);

  const handleRunScan = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setProgress(5);
    setStatusText('Запуск диагностики оборудования...');
    try {
      const result = await runBrowserHardwareProbe((pct, text) => {
        setProgress(pct);
        setStatusText(text);
      });
      setScanData(result);
    } finally {
      setScanning(false);
    }
  }, [scanning]);

  const handleWindowsReportChange = (report: WindowsDiagReport | null) => {
    setWindowsReport(report);
    // Reset manual overrides so fresh Windows telemetry reflects exact OS settings
    if (report) {
      setAppliedExtraFlags({});
    }
  };

  const handleToggleCheck = (id: string) => {
    const nextVal = !checkedItems[id];
    setCheckedItems((prev) => ({
      ...prev,
      [id]: nextVal,
    }));
    const matchingOpt = OPTIMIZATION_COMPARE_ITEMS.find((i) => i.checklistId === id);
    if (matchingOpt) {
      setAppliedExtraFlags((prev) => ({ ...prev, [matchingOpt.id]: nextVal }));
    }
  };

  const handleResetChecklist = () => {
    setCheckedItems({});
    setAppliedExtraFlags({});
    try {
      localStorage.removeItem(STORAGE_KEYS.checks);
      localStorage.removeItem(STORAGE_KEYS.optFlags);
    } catch {
      // Ignore storage errors
    }
  };

  const handleCheckAllChecklist = () => {
    const allChecked: Record<string, boolean> = {};
    const allFlags: Record<string, boolean> = { ...appliedExtraFlags };
    for (const group of CHECKLIST_DATA) {
      for (const item of group.items) {
        allChecked[item.id] = true;
        const matchingOpt = OPTIMIZATION_COMPARE_ITEMS.find((i) => i.checklistId === item.id);
        if (matchingOpt) {
          allFlags[matchingOpt.id] = true;
        }
      }
    }
    setCheckedItems(allChecked);
    setAppliedExtraFlags(allFlags);
  };

  const handleToggleMyOptFlag = (flagId: OptFlagId, nextState: boolean) => {
    setAppliedExtraFlags((prev) => ({
      ...prev,
      [flagId]: nextState,
    }));
    const meta = OPTIMIZATION_COMPARE_ITEMS.find((i) => i.id === flagId);
    if (meta?.checklistId) {
      setCheckedItems((prev) => ({
        ...prev,
        [meta.checklistId!]: nextState,
      }));
    }
  };

  const handleMarkGeneratorApplied = (moduleIds: string[]) => {
    const nextFlags = { ...appliedExtraFlags };
    const nextChecklist = { ...checkedItems };

    for (const modId of moduleIds) {
      const mappedFlags = OPT_MODULE_TO_FLAGS[modId];
      if (!mappedFlags) continue;
      for (const flagId of mappedFlags) {
        nextFlags[flagId] = true;
        const meta = OPTIMIZATION_COMPARE_ITEMS.find((i) => i.id === flagId);
        if (meta?.checklistId) {
          nextChecklist[meta.checklistId] = true;
        }
      }
      if (modId === 'restorePoint') {
        nextChecklist.restore = true;
      }
    }

    setAppliedExtraFlags(nextFlags);
    setCheckedItems(nextChecklist);
  };

  const handleToggleModule = (id: string) => {
    setSelectedModules((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectPresetModules = (moduleIds: string[]) => {
    setSelectedModules(() => {
      const next: Record<string, boolean> = {};
      for (const mod of SCRIPT_MODULES) {
        next[mod.id] = moduleIds.includes(mod.id);
      }
      return next;
    });
  };

  const handleApplyRecommendedModules = (moduleIds: string[]) => {
    setSelectedModules(() => {
      const next: Record<string, boolean> = {};
      for (const mod of SCRIPT_MODULES) {
        next[mod.id] = moduleIds.includes(mod.id) || mod.id === 'restorePoint';
      }
      return next;
    });
    const el = document.getElementById('generator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAddSingleRecModules = (moduleIds: string[]) => {
    setSelectedModules((prev) => {
      const next: Record<string, boolean> = { ...prev, restorePoint: true };
      for (const id of moduleIds) {
        next[id] = true;
      }
      return next;
    });
    const el = document.getElementById('generator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSyncChecklistItems = (itemIds: string[]) => {
    if (itemIds.length === 0) return;
    setCheckedItems((prev) => {
      const next = { ...prev };
      for (const id of itemIds) {
        next[id] = true;
      }
      return next;
    });
  };

  const mySnapshot = useMemo(() => {
    if (!scanData) return null;
    return buildPcShareSnapshot({
      name: myName,
      scanData,
      windowsReport,
      checkedItems,
      appliedExtraFlags,
    });
  }, [myName, scanData, windowsReport, checkedItems, appliedExtraFlags]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <ScannerSection
          scanData={scanData}
          scanning={scanning}
          progress={progress}
          statusText={statusText}
          windowsReport={windowsReport}
          onStartScan={handleRunScan}
          onWindowsReportChange={handleWindowsReportChange}
          onApplyRecommendedModules={handleApplyRecommendedModules}
          onAddModules={handleAddSingleRecModules}
          onSyncChecklistItems={handleSyncChecklistItems}
        />
        <CompareSection
          myName={myName}
          onMyNameChange={setMyName}
          mySnapshot={mySnapshot}
          friendSnapshot={friendSnapshot}
          scanning={scanning}
          onRunScan={handleRunScan}
          onLoadFriend={setFriendSnapshot}
          onClearFriend={() => setFriendSnapshot(null)}
          onToggleMyOptFlag={handleToggleMyOptFlag}
          onAddModulesToGenerator={handleAddSingleRecModules}
        />
        <ChecklistSection
          checkedItems={checkedItems}
          onToggleCheck={handleToggleCheck}
          onCheckAllChecklist={handleCheckAllChecklist}
          onResetChecklist={handleResetChecklist}
        />
        <ScriptGeneratorSection
          selectedModules={selectedModules}
          format={format}
          onToggleModule={handleToggleModule}
          onSelectPreset={handleSelectPresetModules}
          onFormatChange={setFormat}
          onMarkApplied={handleMarkGeneratorApplied}
        />
        <GpuTipsSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
