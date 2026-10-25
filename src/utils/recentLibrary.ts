import { deleteBookFromOPFS } from './opfsStorage';

export interface RecentBook {
  id: string;
  name: string;
  totalPages: number;
  lastPage: number;
  format: 'pdf' | 'cbz' | 'zip';
  size?: number;
  inOPFS?: boolean;
  updatedAt: number;
}

const RECENT_KEY = 'mihiraki_recent_books';

export function getRecentBooks(): RecentBook[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const filtered = Array.isArray(parsed)
      ? parsed.filter((b) => !b?.name?.includes('Blade_of_Shadows'))
      : [];
    return filtered.slice(0, 6);
  } catch {
    return [];
  }
}

export function saveRecentBook(book: Omit<RecentBook, 'updatedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRecentBooks().filter((b) => b.id !== book.id && b.name !== book.name);
    const updated: RecentBook[] = [
      {
        ...book,
        updatedAt: Date.now(),
      },
      ...existing,
    ].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save recent book', e);
  }
}

export function updateRecentProgress(bookName: string, lastPage: number): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRecentBooks();
    const target = existing.find((b) => b.name === bookName);
    if (target) {
      target.lastPage = lastPage;
      target.updatedAt = Date.now();
      localStorage.setItem(RECENT_KEY, JSON.stringify(existing));
    }
  } catch {
    // Ignore
  }
}

export function getRecentBookProgress(idOrName: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = getRecentBooks();
    const target = existing.find((b) => b.id === idOrName || b.name === idOrName);
    if (target && typeof target.lastPage === 'number' && target.lastPage >= 1) {
      return target.lastPage;
    }
  } catch {
    // Ignore
  }
  return null;
}

export async function removeRecentBook(id: string): Promise<RecentBook[]> {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getRecentBooks().filter((b) => b.id !== id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(existing));
    // Also remove from OPFS
    await deleteBookFromOPFS(id);
    return existing;
  } catch {
    return [];
  }
}
