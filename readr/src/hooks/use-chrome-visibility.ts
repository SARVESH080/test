"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shows chrome (top bar / progress bar) on mount, mouse movement, or tap,
 * and hides it after a period of inactivity — mirroring Kindle / Books apps.
 */
export function useChromeVisibility(idleMs = 2800) {
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function reveal() {
      setVisible(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), idleMs);
    }
    reveal();
    window.addEventListener("mousemove", reveal);
    window.addEventListener("touchstart", reveal);
    window.addEventListener("keydown", reveal);
    return () => {
      window.removeEventListener("mousemove", reveal);
      window.removeEventListener("touchstart", reveal);
      window.removeEventListener("keydown", reveal);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [idleMs]);

  return { visible, setVisible };
}
