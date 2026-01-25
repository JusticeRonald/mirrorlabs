import { useState, useEffect, useCallback } from 'react';
import { ProjectListViewMode, PreferencePageKey, DEFAULT_VIEW_MODES } from '@/types/preferences';

const STORAGE_KEY_PREFIX = 'mirrorlabs-view-pref-';

function getStorageKey(pageKey: PreferencePageKey): string {
  return `${STORAGE_KEY_PREFIX}${pageKey}`;
}

function loadPreference(pageKey: PreferencePageKey): ProjectListViewMode {
  try {
    const stored = localStorage.getItem(getStorageKey(pageKey));
    if (stored && ['grid', 'list', 'compact'].includes(stored)) {
      return stored as ProjectListViewMode;
    }
  } catch (e) {
    // localStorage may not be available (SSR, private browsing, etc.)
    if (import.meta.env.DEV) {
      console.warn('[useViewPreference] Failed to load preference:', e);
    }
  }
  return DEFAULT_VIEW_MODES[pageKey];
}

function savePreference(pageKey: PreferencePageKey, mode: ProjectListViewMode): void {
  try {
    localStorage.setItem(getStorageKey(pageKey), mode);
  } catch (e) {
    // localStorage may not be available
    if (import.meta.env.DEV) {
      console.warn('[useViewPreference] Failed to save preference:', e);
    }
  }
}

export function useViewPreference(pageKey: PreferencePageKey): [ProjectListViewMode, (mode: ProjectListViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ProjectListViewMode>(() => loadPreference(pageKey));

  // Sync with localStorage on mount (handles SSR hydration)
  useEffect(() => {
    setViewModeState(loadPreference(pageKey));
  }, [pageKey]);

  const setViewMode = useCallback((mode: ProjectListViewMode) => {
    setViewModeState(mode);
    savePreference(pageKey, mode);
  }, [pageKey]);

  return [viewMode, setViewMode];
}
