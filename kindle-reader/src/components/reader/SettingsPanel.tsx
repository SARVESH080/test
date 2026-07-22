"use client";

import type { ReaderSettings, ThemeName } from "@/lib/types";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onChange: (settings: ReaderSettings) => void;
}

const THEMES: { id: ThemeName; label: string; bg: string; fg: string }[] = [
  { id: "light", label: "Light", bg: "#fdfbf6", fg: "#241f18" },
  { id: "sepia", label: "Sepia", bg: "#f1e4c8", fg: "#3a2f1c" },
  { id: "dark", label: "Dark", bg: "#17140f", fg: "#e8e0cd" },
];

const WIDTHS = [
  { label: "Narrow", value: 520 },
  { label: "Medium", value: 640 },
  { label: "Wide", value: 780 },
];

export function SettingsPanel({
  open,
  onClose,
  settings,
  onChange,
}: SettingsPanelProps) {
  const update = (patch: Partial<ReaderSettings>) =>
    onChange({ ...settings, ...patch });

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[300px] transform border-l border-shell-line bg-shell-900 px-6 py-7 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-display text-lg text-cloud-050">Display</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-cloud-100/60 hover:bg-shell-800 hover:text-cloud-050"
            aria-label="Close settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-7">
          <div>
            <label className="mb-2 block font-ui text-xs uppercase tracking-wide text-cloud-100/45">
              Text size
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-shell-line bg-shell-800/60 p-1.5">
              <StepButton
                label="A−"
                onClick={() =>
                  update({ fontSizePx: Math.max(14, settings.fontSizePx - 1) })
                }
              />
              <span className="flex-1 text-center font-ui text-sm text-cloud-100/70">
                {settings.fontSizePx}px
              </span>
              <StepButton
                label="A+"
                onClick={() =>
                  update({ fontSizePx: Math.min(28, settings.fontSizePx + 1) })
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block font-ui text-xs uppercase tracking-wide text-cloud-100/45">
              Line spacing
            </label>
            <div className="flex gap-2">
              {[1.4, 1.7, 2.0].map((lh) => (
                <button
                  key={lh}
                  onClick={() => update({ lineHeight: lh })}
                  className={`flex-1 rounded-lg border py-2 font-ui text-xs transition-colors ${
                    settings.lineHeight === lh
                      ? "border-brass-500 bg-brass-500/15 text-brass-300"
                      : "border-shell-line text-cloud-100/60 hover:bg-shell-800"
                  }`}
                >
                  {lh === 1.4 ? "Cozy" : lh === 1.7 ? "Comfort" : "Airy"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block font-ui text-xs uppercase tracking-wide text-cloud-100/45">
              Page width
            </label>
            <div className="flex gap-2">
              {WIDTHS.map((w) => (
                <button
                  key={w.value}
                  onClick={() => update({ contentWidth: w.value })}
                  className={`flex-1 rounded-lg border py-2 font-ui text-xs transition-colors ${
                    settings.contentWidth === w.value
                      ? "border-brass-500 bg-brass-500/15 text-brass-300"
                      : "border-shell-line text-cloud-100/60 hover:bg-shell-800"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block font-ui text-xs uppercase tracking-wide text-cloud-100/45">
              Typeface
            </label>
            <div className="flex gap-2">
              {(["serif", "sans"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => update({ fontFamily: f })}
                  className={`flex-1 rounded-lg border py-2 font-ui text-xs capitalize transition-colors ${
                    settings.fontFamily === f
                      ? "border-brass-500 bg-brass-500/15 text-brass-300"
                      : "border-shell-line text-cloud-100/60 hover:bg-shell-800"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block font-ui text-xs uppercase tracking-wide text-cloud-100/45">
              Theme
            </label>
            <div className="flex gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => update({ theme: t.id })}
                  className={`flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl border transition-all ${
                    settings.theme === t.id
                      ? "border-brass-500 ring-1 ring-brass-500/50"
                      : "border-shell-line"
                  }`}
                  style={{ background: t.bg }}
                >
                  <span
                    className="font-display text-sm"
                    style={{ color: t.fg }}
                  >
                    Aa
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function StepButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 w-9 items-center justify-center rounded-lg font-ui text-sm text-cloud-100/80 hover:bg-shell-700"
    >
      {label}
    </button>
  );
}
