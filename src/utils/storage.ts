import { ReaderPreferences, DEFAULT_PREFERENCES, MangaFilter, ViewMode, SpreadMode, ReadingDirection, FitMode } from '../types/manga';

const GLOBAL_SETTINGS_KEY = 'mihiraki_global_settings';

export interface GlobalSettings {
  viewMode: ViewMode;
  spreadMode: SpreadMode;
  separateCover: boolean;
  readingDirection: ReadingDirection;
  zoom: number;
  fitMode: FitMode;
  mangaFilter: MangaFilter;
}

export function loadGlobalSettings(): GlobalSettings {
  if (typeof window === 'undefined') {
    return {
      viewMode: DEFAULT_PREFERENCES.viewMode,
      spreadMode: DEFAULT_PREFERENCES.spreadMode,
      separateCover: DEFAULT_PREFERENCES.separateCover,
      readingDirection: DEFAULT_PREFERENCES.readingDirection,
      zoom: DEFAULT_PREFERENCES.zoom,
      fitMode: DEFAULT_PREFERENCES.fitMode,
      mangaFilter: DEFAULT_PREFERENCES.mangaFilter,
    };
  }

  try {
    const raw = localStorage.getItem(GLOBAL_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        viewMode: parsed.viewMode ?? DEFAULT_PREFERENCES.viewMode,
        spreadMode: parsed.spreadMode ?? DEFAULT_PREFERENCES.spreadMode,
        separateCover: typeof parsed.separateCover === 'boolean' ? parsed.separateCover : DEFAULT_PREFERENCES.separateCover,
        readingDirection: parsed.readingDirection ?? DEFAULT_PREFERENCES.readingDirection,
        zoom: typeof parsed.zoom === 'number' ? parsed.zoom : DEFAULT_PREFERENCES.zoom,
        fitMode: parsed.fitMode ?? DEFAULT_PREFERENCES.fitMode,
        mangaFilter: parsed.mangaFilter ?? DEFAULT_PREFERENCES.mangaFilter,
      };
    }
  } catch (e) {
    console.warn('Failed to load global settings from localStorage', e);
  }

  return {
    viewMode: DEFAULT_PREFERENCES.viewMode,
    spreadMode: DEFAULT_PREFERENCES.spreadMode,
    separateCover: DEFAULT_PREFERENCES.separateCover,
    readingDirection: DEFAULT_PREFERENCES.readingDirection,
    zoom: DEFAULT_PREFERENCES.zoom,
    fitMode: DEFAULT_PREFERENCES.fitMode,
    mangaFilter: DEFAULT_PREFERENCES.mangaFilter,
  };
}

export function saveGlobalSettings(settings: Partial<GlobalSettings>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadGlobalSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save global settings to localStorage', e);
  }
}

export function getFileStorageKey(filename: string, fileSize?: number): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `mihiraki_book_${safeName}_${fileSize || 0}`;
}

export function loadBookLastPage(filename: string, fileSize?: number): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getFileStorageKey(filename, fileSize);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.lastPage === 'number' && parsed.lastPage >= 1) {
        return parsed.lastPage;
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

export function saveBookLastPage(filename: string, fileSize: number | undefined, pageNum: number): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getFileStorageKey(filename, fileSize);
    localStorage.setItem(key, JSON.stringify({ lastPage: pageNum, updatedAt: Date.now() }));
  } catch {
    // Ignore
  }
}
