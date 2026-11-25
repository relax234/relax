import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQ_DATA } from '../utils/opticore';

export function FaqSection() {
  const [openIndices, setOpenIndices] = useState<Record<number, boolean>>({});

  const toggleFaq = (idx: number) => {
    setOpenIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <section id="faq" className="py-16 px-4 sm:px-6 border-t border-slate-800/70">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-xs font-mono text-slate-400 tracking-wide mb-1.5">
            06 · Безопасность и запуск
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Частые вопросы и безопасность
          </h2>
        </div>
        <div className="space-y-3">
          {FAQ_DATA.map((item, idx) => {
            const isOpen = !!openIndices[idx];
            return (
              <div
                key={item.q}
                className={`rounded-xl bg-[#0C1220] border transition-colors overflow-hidden ${
                  isOpen ? 'border-cyan-500/40' : 'border-slate-800/90'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-slate-100 hover:text-cyan-300 transition cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-cyan-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-slate-800/70 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
