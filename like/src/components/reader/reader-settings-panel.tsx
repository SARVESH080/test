"use client";

import * as React from "react";
import { Sun, Moon, Coffee, AlignJustify } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ReaderPreferences, FontFamilyKey, ReadingWidth } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ReaderSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefs: ReaderPreferences;
  onChange: (patch: Partial<ReaderPreferences>) => void;
  /** Article/EPUB expose full typographic control; PDF only exposes theme + zoom is handled separately */
  showTypography?: boolean;
}

const FONT_OPTIONS: { key: FontFamilyKey; label: string; sample: string }[] = [
  { key: "reading", label: "Literata", sample: "font-reading" },
  { key: "serif", label: "Source Serif", sample: "font-serif" },
  { key: "sans", label: "Inter", sample: "font-sans" },
];

const WIDTH_OPTIONS: { key: ReadingWidth; label: string }[] = [
  { key: "narrow", label: "Narrow" },
  { key: "medium", label: "Medium" },
  { key: "wide", label: "Wide" },
];

export function ReaderSettingsPanel({
  open,
  onOpenChange,
  prefs,
  onChange,
  showTypography = true,
}: ReaderSettingsPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Display settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-1">
          {/* Theme */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Theme
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "light" as const, label: "Light", icon: Sun, bg: "bg-white", fg: "text-stone-900", border: "border-stone-300" },
                { key: "sepia" as const, label: "Sepia", icon: Coffee, bg: "bg-[#e8dcc0]", fg: "text-[#3d2b12]", border: "border-[#c9b183]" },
                { key: "dark" as const, label: "Dark", icon: Moon, bg: "bg-[#161311]", fg: "text-stone-100", border: "border-stone-700" },
              ].map(({ key, label, icon: Icon, bg, fg, border }) => (
                <button
                  key={key}
                  onClick={() => onChange({ theme: key })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all",
                    bg,
                    border,
                    prefs.theme === key
                      ? "ring-2 ring-accent ring-offset-2 ring-offset-background"
                      : "opacity-70 hover:opacity-100"
                  )}
                >
                  <Icon className={cn("h-4 w-4", fg)} />
                  <span className={cn("text-xs font-medium", fg)}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {showTypography && (
            <>
              {/* Font family */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Font
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => onChange({ fontFamily: f.key })}
                      className={cn(
                        "rounded-lg border px-2 py-2.5 text-sm transition-all",
                        f.sample,
                        prefs.fontFamily === f.key
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border hover:bg-secondary"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font size */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Font size
                  </p>
                  <span className="text-xs text-muted-foreground">{prefs.fontSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">A</span>
                  <Slider
                    min={14}
                    max={28}
                    step={1}
                    value={[prefs.fontSize]}
                    onValueChange={([v]) => onChange({ fontSize: v })}
                  />
                  <span className="text-lg text-muted-foreground">A</span>
                </div>
              </div>

              {/* Line spacing */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Line spacing
                  </p>
                  <AlignJustify className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <Slider
                  min={1.3}
                  max={2.2}
                  step={0.1}
                  value={[prefs.lineSpacing]}
                  onValueChange={([v]) => onChange({ lineSpacing: v })}
                />
              </div>

              {/* Reading width */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reading width
                </p>
                <ToggleGroup
                  type="single"
                  value={prefs.readingWidth}
                  onValueChange={(v) => v && onChange({ readingWidth: v as ReadingWidth })}
                  className="grid grid-cols-3 gap-2"
                >
                  {WIDTH_OPTIONS.map((w) => (
                    <ToggleGroupItem
                      key={w.key}
                      value={w.key}
                      className="border border-border data-[state=on]:border-accent"
                    >
                      {w.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
