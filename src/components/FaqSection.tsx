import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQ_DATA } from '../utils/opticore';

export function FaqSection() {
  const [openIndices, setOpenIndices] = useState<Record<number, boolean>>({});

  const toggleFaq = (idx: number) => {
    setOpenIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <section id="faq" className="py-9 sm:py-11 px-4 sm:px-6 border-t border-zinc-800/80">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <div className="text-xs font-mono text-zinc-400 tracking-wide mb-1">
            06 · Безопасность и запуск
          </div>
          <h2 className="text-2xl font-bold text-white">
            Частые вопросы
          </h2>
        </div>
        <div className="space-y-2.5">
          {FAQ_DATA.map((item, idx) => {
            const isOpen = !!openIndices[idx];
            return (
              <div
                key={item.q}
                className={`rounded-xl bg-[#111113] border transition-colors overflow-hidden ${
                  isOpen ? 'border-zinc-500' : 'border-zinc-800'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-zinc-100 hover:text-white transition cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-3.5 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-2.5">
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
