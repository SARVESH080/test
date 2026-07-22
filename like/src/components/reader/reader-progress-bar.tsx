"use client";

import { cn } from "@/lib/utils";

interface ReaderProgressBarProps {
  progress: number; // 0-100
  visible: boolean;
}

export function ReaderProgressBar({ progress, visible }: ReaderProgressBarProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 top-[49px] z-20 transition-opacity duration-300 sm:top-[57px]",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="page-progress-track">
        <div
          className="page-progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
