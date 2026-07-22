"use client";

import type { TocEntry } from "@/lib/types";

interface TocPanelProps {
  open: boolean;
  onClose: () => void;
  toc: TocEntry[];
  onSelect: (paragraphIndex: number) => void;
  currentParagraph: number;
}

export function TocPanel({
  open,
  onClose,
  toc,
  onSelect,
  currentParagraph,
}: TocPanelProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[300px] transform border-r border-shell-line bg-shell-900 px-6 py-7 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-display text-lg text-cloud-050">Contents</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-cloud-100/60 hover:bg-shell-800 hover:text-cloud-050"
            aria-label="Close contents"
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

        {toc.length === 0 ? (
          <p className="font-ui text-sm text-cloud-100/45">
            No chapters were detected in this document.
          </p>
        ) : (
          <nav className="flex max-h-[calc(100%-4rem)] flex-col gap-0.5 overflow-y-auto pr-1">
            {toc.map((entry, i) => {
              const active =
                i === toc.length - 1
                  ? currentParagraph >= entry.paragraphIndex
                  : currentParagraph >= entry.paragraphIndex &&
                    currentParagraph < toc[i + 1].paragraphIndex;
              return (
                <button
                  key={i}
                  onClick={() => onSelect(entry.paragraphIndex)}
                  className={`rounded-lg px-3 py-2 text-left font-ui text-sm transition-colors ${
                    active
                      ? "bg-brass-500/15 text-brass-300"
                      : "text-cloud-100/65 hover:bg-shell-800 hover:text-cloud-050"
                  }`}
                >
                  {entry.title}
                </button>
              );
            })}
          </nav>
        )}
      </aside>
    </>
  );
}
