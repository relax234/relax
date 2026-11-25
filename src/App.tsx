import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ScannerSection } from './components/ScannerSection';
import { ChecklistSection } from './components/ChecklistSection';
import { ScriptGeneratorSection } from './components/ScriptGeneratorSection';
import { GpuTipsSection } from './components/GpuTipsSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { SCRIPT_MODULES, type ScriptFormat } from './utils/opticore';

const STORAGE_KEY = 'opticore_checks';

function getInitialChecks(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function getDefaultModules(): Record<string, boolean> {
  const initial: Record<string, boolean> = {};
  for (const mod of SCRIPT_MODULES) {
    initial[mod.id] = mod.defaultEnabled;
  }
  return initial;
}

export default function App() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(getInitialChecks);
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>(getDefaultModules);
  const [format, setFormat] = useState<ScriptFormat>('bat');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedItems));
    } catch {
      // Ignore storage errors
    }
  }, [checkedItems]);

  const handleToggleCheck = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleResetChecklist = () => {
    setCheckedItems({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const handleToggleModule = (id: string) => {
    setSelectedModules((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <ScannerSection onApplyRecommendedModules={handleApplyRecommendedModules} />
        <ChecklistSection
          checkedItems={checkedItems}
          onToggleCheck={handleToggleCheck}
          onResetChecklist={handleResetChecklist}
        />
        <ScriptGeneratorSection
          selectedModules={selectedModules}
          format={format}
          onToggleModule={handleToggleModule}
          onFormatChange={setFormat}
        />
        <GpuTipsSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
