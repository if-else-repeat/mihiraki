import { PageInfo, Spread } from '../utils/spreadEngine';

export type ViewMode = 'scroll' | 'paginated';
export type SpreadMode = 'single' | 'two-page';
export type ReadingDirection = 'rtl' | 'ltr';
export type FitMode = 'width' | 'height' | 'custom';
export type MangaFilter = 'none' | 'bw-ink' | 'warm-sepia' | 'oled-night';

export interface FileMetadata {
  name: string;
  size: number;
  totalPages: number;
  lastModified?: number;
}

export interface ReaderPreferences {
  viewMode: ViewMode;
  spreadMode: SpreadMode;
  separateCover: boolean;
  readingDirection: ReadingDirection;
  zoom: number; // 1.0 = 100%
  fitMode: FitMode;
  lastPage: number;
  mangaFilter: MangaFilter;
}

export const DEFAULT_PREFERENCES: ReaderPreferences = {
  viewMode: 'scroll',
  spreadMode: 'two-page',
  separateCover: false, // OFF by default
  readingDirection: 'rtl', // RTL Japanese manga order by default
  zoom: 1.0,
  fitMode: 'width',
  lastPage: 1,
  mangaFilter: 'none',
};
