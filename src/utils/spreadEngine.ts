/**
 * Smart Two-Page Layout Engine for Manga PDF Reading
 * Handles landscape spread detection, vertical page pairing, cover page isolation,
 * and RTL (Right-to-Left) manga reading order.
 */

export interface PageDimension {
  pageNum: number;
  width: number;
  height: number;
}

export interface PageInfo extends PageDimension {
  isLandscape: boolean;
  aspectRatio: number; // width / height
  imageUrl?: string;
}

export interface Spread {
  id: string;
  spreadIndex: number;
  pages: PageInfo[]; // In logical reading order [first, second]
  displayPages: PageInfo[]; // In visual rendering order [left, right]
  isPaired: boolean;
  isLandscapeSpread: boolean;
  combinedAspectRatio: number; // width / height of the entire spread box
}

/**
 * Determines whether a page is landscape (wide spread) or portrait (standard vertical).
 * Rule: width > height or width / height > 1.1
 */
export function isLandscapePage(width: number, height: number): boolean {
  if (height <= 0 || width <= 0) return false;
  return width > height || (width / height) > 1.1;
}

export function analyzePages(dimensions: PageDimension[]): PageInfo[] {
  return dimensions.map(d => {
    const isLandscape = isLandscapePage(d.width, d.height);
    const aspectRatio = d.height > 0 ? d.width / d.height : 1;
    return {
      ...d,
      isLandscape,
      aspectRatio,
    };
  });
}

export interface SpreadEngineOptions {
  isTwoPageMode: boolean;
  separateCover: boolean;
  isRtl: boolean; // true = Japanese Manga (Right-to-Left), false = Western Comic (Left-to-Right)
}

/**
 * Computes spreads based on page aspect ratios and user configuration.
 */
export function computeSpreads(
  pages: PageInfo[],
  options: SpreadEngineOptions
): Spread[] {
  if (!pages || pages.length === 0) return [];

  const { isTwoPageMode, separateCover, isRtl } = options;
  const spreads: Spread[] = [];
  let spreadIndex = 0;

  if (!isTwoPageMode) {
    // Single page mode: each page stands alone
    for (const page of pages) {
      spreads.push({
        id: `spread-single-${page.pageNum}`,
        spreadIndex: spreadIndex++,
        pages: [page],
        displayPages: [page],
        isPaired: false,
        isLandscapeSpread: page.isLandscape,
        combinedAspectRatio: page.aspectRatio,
      });
    }
    return spreads;
  }

  // Two-page mode with Aspect-Ratio Aware Layout
  let i = 0;
  while (i < pages.length) {
    const currentPage = pages[i];

    // Rule C: Cover Page Offset Toggle
    // When ON, Page 1 always stands alone
    if (separateCover && currentPage.pageNum === 1) {
      spreads.push({
        id: `spread-cover-${currentPage.pageNum}`,
        spreadIndex: spreadIndex++,
        pages: [currentPage],
        displayPages: [currentPage],
        isPaired: false,
        isLandscapeSpread: currentPage.isLandscape,
        combinedAspectRatio: currentPage.aspectRatio,
      });
      i += 1;
      continue;
    }

    // Rule A (Wide Spreads Stand Alone):
    // If page i is Landscape, it occupies an entire screen row by itself.
    if (currentPage.isLandscape) {
      spreads.push({
        id: `spread-wide-${currentPage.pageNum}`,
        spreadIndex: spreadIndex++,
        pages: [currentPage],
        displayPages: [currentPage],
        isPaired: false,
        isLandscapeSpread: true,
        combinedAspectRatio: currentPage.aspectRatio,
      });
      i += 1;
      continue;
    }

    // Rule B (Vertical Pages Pair Up):
    // If page i is Portrait, check page i + 1
    const nextPage = i + 1 < pages.length ? pages[i + 1] : null;

    if (nextPage && !nextPage.isLandscape) {
      // Both are portrait: Pair them side-by-side
      const logicalPages = [currentPage, nextPage];
      // In RTL (Manga): Page i is on the RIGHT, Page i+1 is on the LEFT.
      // So visual order from left to right is [nextPage, currentPage].
      // In LTR: Page i is on the LEFT, Page i+1 is on the RIGHT.
      const displayPages = isRtl ? [nextPage, currentPage] : [currentPage, nextPage];

      const totalWidth = currentPage.width + nextPage.width;
      const maxHeight = Math.max(currentPage.height, nextPage.height);
      const combinedAspectRatio = maxHeight > 0 ? totalWidth / maxHeight : currentPage.aspectRatio * 2;

      spreads.push({
        id: `spread-pair-${currentPage.pageNum}-${nextPage.pageNum}`,
        spreadIndex: spreadIndex++,
        pages: logicalPages,
        displayPages,
        isPaired: true,
        isLandscapeSpread: false,
        combinedAspectRatio,
      });
      i += 2;
    } else {
      // Next page is landscape or doesn't exist: Page i stands alone on this row
      spreads.push({
        id: `spread-portrait-solo-${currentPage.pageNum}`,
        spreadIndex: spreadIndex++,
        pages: [currentPage],
        displayPages: [currentPage],
        isPaired: false,
        isLandscapeSpread: false,
        combinedAspectRatio: currentPage.aspectRatio,
      });
      i += 1;
    }
  }

  return spreads;
}

/**
 * Finds which spread contains a given 1-indexed page number.
 */
export function getSpreadIndexForPage(spreads: Spread[], pageNum: number): number {
  if (!spreads || spreads.length === 0) return 0;
  const targetPage = Math.max(1, pageNum);
  const foundIndex = spreads.findIndex(spread =>
    spread.pages.some(p => p.pageNum === targetPage)
  );
  return foundIndex >= 0 ? foundIndex : 0;
}

/**
 * Returns human-readable label for a spread (e.g., "1", "2 - 3", "4 (Spread)")
 */
export function formatSpreadLabel(spread: Spread): string {
  if (!spread || spread.pages.length === 0) return '';
  if (spread.pages.length === 1) {
    const p = spread.pages[0];
    return p.isLandscape ? `${p.pageNum} (Wide)` : `${p.pageNum}`;
  }
  const first = spread.pages[0].pageNum;
  const second = spread.pages[1].pageNum;
  return `${first} - ${second}`;
}
