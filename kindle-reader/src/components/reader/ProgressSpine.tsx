"use client";

interface ProgressSpineProps {
  fraction: number;
  hidden?: boolean;
}

export function ProgressSpine({ fraction, hidden }: ProgressSpineProps) {
  const pct = Math.min(100, Math.max(0, fraction * 100));
  return (
    <div
      className={`pointer-events-none fixed left-0 top-0 z-30 hidden h-full w-[5px] bg-shell-800/60 transition-opacity duration-500 sm:block ${
        hidden ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden
    >
      <div
        className="absolute left-0 top-0 w-full rounded-b-full bg-gradient-to-b from-brass-300 to-brass-600 transition-[height] duration-300 ease-out"
        style={{ height: `${pct}%` }}
      />
    </div>
  );
}
