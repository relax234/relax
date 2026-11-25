import { useState } from 'react';
import { FAQ_DATA } from '../utils/opticore';

export function FaqSection() {
  const [openIndices, setOpenIndices] = useState<Record<number, boolean>>({});

  const toggleFaq = (idx: number) => {
    setOpenIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <section id="faq" className="py-16 px-4 sm:px-6 border-t border-slate-800/70 bg-slate-950/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center">
          Частые вопросы и безопасность
        </h2>
        <div className="space-y-3">
          {FAQ_DATA.map((item, idx) => {
            const isOpen = !!openIndices[idx];
            return (
              <div
                key={item.q}
                className="rounded-xl bg-[#0E1525] border border-slate-800 overflow-hidden"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-slate-100 hover:text-cyan-300 transition cursor-pointer"
                >
                  <span>{item.q}</span>
                  <span className="text-cyan-400 font-mono text-lg shrink-0" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
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
