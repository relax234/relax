export function GpuTipsSection() {
  return (
    <section id="gpu-tips" className="py-16 px-4 sm:px-6 border-t border-slate-800/70">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
            Шаг 3 • Тонкая настройка
          </span>
          <h2 className="text-3xl font-bold mt-1">Быстрые настройки драйверов и системы</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#0E1525] border border-slate-800 hover:border-emerald-500/40 transition">
            <div className="text-emerald-400 font-mono text-xs font-bold mb-2">
              NVIDIA CONTROL PANEL
            </div>
            <h3 className="text-lg font-bold mb-3">Минимум задержки в играх</h3>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                • <b>Режим управления электропитанием:</b> Предпочтителен режим максимальной
                производительности
              </li>
              <li>
                • <b>Режим низкой задержки:</b> Вкл (или Ультра, если GPU загружен на 95%+)
              </li>
              <li>
                • <b>Фильтрация текстур — качество:</b> Высокая производительность
              </li>
              <li>
                • <b>Размер кэша шейдеров:</b> 10 ГБ или Без ограничений
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-[#0E1525] border border-slate-800 hover:border-rose-500/40 transition">
            <div className="text-rose-400 font-mono text-xs font-bold mb-2">AMD ADRENALIN</div>
            <h3 className="text-lg font-bold mb-3">Плавный фреймтайм Radeon</h3>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                • <b>Radeon Anti-Lag:</b> Включено для соревновательных шутеров
              </li>
              <li>
                • <b>Radeon Chill / Boost:</b> Отключить для стабильного отклика мыши
              </li>
              <li>
                • <b>Оптимизация формата поверхности:</b> Включено
              </li>
              <li>
                • <b>Smart Access Memory (ReBAR):</b> Включить в BIOS + Adrenalin
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-[#0E1525] border border-slate-800 hover:border-cyan-500/40 transition">
            <div className="text-cyan-400 font-mono text-xs font-bold mb-2">BIOS И ПАМЯТЬ</div>
            <h3 className="text-lg font-bold mb-3">Бесплатный прирост железа</h3>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                • <b>XMP / DOCP / EXPO:</b> Включи профиль ОЗУ, иначе память работает на 2133/4800
                МГц
              </li>
              <li>
                • <b>Above 4G Decoding + ReBAR:</b> +5–10% FPS в современных DX12/Vulkan играх
              </li>
              <li>
                • <b>Температуры под нагрузкой:</b> Держи CPU &lt; 85°C и GPU &lt; 80°C против
                троттлинга
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
