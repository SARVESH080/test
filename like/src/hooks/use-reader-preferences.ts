"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PREFERENCES, type ReaderPreferences } from "@/lib/types";
import { loadPreferences, savePreferences } from "@/lib/storage";

export function useReaderPreferences() {
  const [prefs, setPrefs] = useState<ReaderPreferences>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(loadPreferences());
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<ReaderPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  return { prefs, update, hydrated };
}
