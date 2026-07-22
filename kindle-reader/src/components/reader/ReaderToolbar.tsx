"use client";

interface ReaderToolbarProps {
  visible: boolean;
  title: string;
  onBack: () => void;
  onToggleToc: () => void;
  onToggleSettings: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export function ReaderToolbar({
  visible,
  title,
  onBack,
  onToggleToc,
  onToggleSettings,
  onToggleFullscreen,
  isFullscreen,
}: ReaderToolbarProps) {
  return (
    <header
      className={`fixed left-0 right-0 top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 transition-transform duration-300 sm:px-6 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="flex items-center gap-1 rounded-full border border-shell-line bg-shell-900/85 p-1 pl-1 backdrop-blur-md">
        <IconButton label="Back to shelf" onClick={onBack}>
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </IconButton>
        <span className="max-w-[40vw] truncate px-2 font-ui text-sm text-cloud-100/75 sm:max-w-xs">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-full border border-shell-line bg-shell-900/85 p-1 backdrop-blur-md">
        <IconButton label="Contents" onClick={onToggleToc}>
          <path
            d="M4 6h16M4 12h10M4 18h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </IconButton>
        <IconButton label="Toggle fullscreen" onClick={onToggleFullscreen}>
          {isFullscreen ? (
            <path
              d="M9 4v3a2 2 0 0 1-2 2H4M20 9h-3a2 2 0 0 1-2-2V4M4 15h3a2 2 0 0 1 2 2v3M15 20v-3a2 2 0 0 1 2-2h3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : (
            <path
              d="M4 9V6a2 2 0 0 1 2-2h3M20 9V6a2 2 0 0 0-2-2h-3M4 15v3a2 2 0 0 0 2 2h3M20 15v3a2 2 0 0 1-2 2h-3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </IconButton>
        <IconButton label="Display settings" onClick={onToggleSettings}>
          <path
            d="M4 7h9m3 0h4M4 12h4m3 0h9M4 17h13m3 0h1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="15" cy="7" r="1.8" fill="currentColor" />
          <circle cx="9" cy="12" r="1.8" fill="currentColor" />
          <circle cx="18" cy="17" r="1.8" fill="currentColor" />
        </IconButton>
      </div>
    </header>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-cloud-100/75 transition-colors hover:bg-shell-700 hover:text-brass-300"
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        {children}
      </svg>
    </button>
  );
}
