"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onFile: (file: File) => void;
  busy: boolean;
  progressLabel?: string;
  progress?: number;
}

export function UploadZone({
  onFile,
  busy,
  progressLabel,
  progress = 0,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file && file.type === "application/pdf") {
        onFile(file);
      }
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !busy && inputRef.current?.click()}
      className={`group relative flex min-h-[220px] w-full cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-[28px] border transition-all duration-300 ${
        isDragging
          ? "border-brass-500 bg-shell-800 scale-[1.01]"
          : "border-shell-line bg-shell-900 hover:border-brass-600/60 hover:bg-shell-800/70"
      } ${busy ? "pointer-events-none" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Ribbon bookmark accent, echoes the reader's progress spine */}
      <div
        className={`absolute left-9 top-0 h-14 w-3 rounded-b-full bg-gradient-to-b from-brass-500 to-brass-600 shadow-[0_4px_16px_rgba(198,161,91,0.35)] transition-transform duration-500 ${
          isDragging ? "translate-y-1" : ""
        }`}
      />

      {busy ? (
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-brass-600/30 border-t-brass-300" />
          </div>
          <p className="font-ui text-sm text-cloud-100/80">
            {progressLabel ?? "Reading your book…"}
          </p>
          <div className="h-1 w-48 overflow-hidden rounded-full bg-shell-700">
            <div
              className="h-full rounded-full bg-brass-500 transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            className="text-brass-300"
          >
            <path
              d="M12 3v12m0 0-4-4m4 4 4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="font-display text-lg text-cloud-050">
            Drop a PDF to begin
          </p>
          <p className="max-w-[30ch] font-ui text-sm text-cloud-100/60">
            It becomes a clean, reflowable book — not a scanned page.
          </p>
        </div>
      )}
    </div>
  );
}
