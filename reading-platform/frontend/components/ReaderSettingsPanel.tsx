'use client';

import { motion, AnimatePresence } from 'framer-motion';

export interface ReaderSettings {
  theme: 'light' | 'sepia' | 'dark' | 'amoled';
  fontFamily: 'reading' | 'sans';
  fontSize: number; // px
  lineHeight: number;
  pageWidth: number; // px, max-width of content column
}

const THEMES: { id: ReaderSettings['theme']; label: string; swatch: string }[] = [
  { id: 'light', label: 'Light', swatch: '#FBFAF6' },
  { id: 'sepia', label: 'Sepia', swatch: '#F1E7D0' },
  { id: 'dark', label: 'Dark', swatch: '#1B1E22' },
  { id: 'amoled', label: 'AMOLED', swatch: '#000000' },
];

export function ReaderSettingsPanel({
  open,
  onClose,
  settings,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onChange: (s: ReaderSettings) => void;
}) {
  function update<K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink-900/30"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="fixed right-0 top-0 z-50 h-full w-80 overflow-y-auto bg-white p-6 shadow-xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-lg text-ink-900">Display</h3>
              <button onClick={onClose} className="text-ink-900/40 hover:text-ink-900">
                ✕
              </button>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-900/50">Theme</p>
              <div className="grid grid-cols-4 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => update('theme', t.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-md border p-2 text-[10px] ${
                      settings.theme === t.id ? 'border-brass-500 ring-1 ring-brass-500' : 'border-ink-900/10'
                    }`}
                  >
                    <span
                      className="h-6 w-6 rounded-full border border-ink-900/10"
                      style={{ backgroundColor: t.swatch }}
                    />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-900/50">
                Font family
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => update('fontFamily', 'reading')}
                  className={`flex-1 rounded-md border py-2 text-sm font-reading ${
                    settings.fontFamily === 'reading' ? 'border-brass-500 ring-1 ring-brass-500' : 'border-ink-900/10'
                  }`}
                >
                  Serif
                </button>
                <button
                  onClick={() => update('fontFamily', 'sans')}
                  className={`flex-1 rounded-md border py-2 text-sm font-sans ${
                    settings.fontFamily === 'sans' ? 'border-brass-500 ring-1 ring-brass-500' : 'border-ink-900/10'
                  }`}
                >
                  Sans
                </button>
              </div>
            </div>

            <SliderRow
              label="Font size"
              value={settings.fontSize}
              min={14}
              max={28}
              step={1}
              display={`${settings.fontSize}px`}
              onChange={(v) => update('fontSize', v)}
            />
            <SliderRow
              label="Line height"
              value={settings.lineHeight}
              min={1.3}
              max={2.2}
              step={0.1}
              display={settings.lineHeight.toFixed(1)}
              onChange={(v) => update('lineHeight', v)}
            />
            <SliderRow
              label="Page width"
              value={settings.pageWidth}
              min={480}
              max={900}
              step={20}
              display={`${settings.pageWidth}px`}
              onChange={(v) => update('pageWidth', v)}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-900/50">{label}</p>
        <span className="text-xs text-ink-900/60">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-brass-500"
      />
    </div>
  );
}
