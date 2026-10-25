import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isLandscapePage,
  analyzePages,
  computeSpreads,
  getSpreadIndexForPage,
  formatSpreadLabel,
  type PageDimension,
} from './spreadEngine';

test('isLandscapePage correctly classifies landscape and portrait ratios', () => {
  // Portrait: typical manga page ~ 800 x 1200
  assert.equal(isLandscapePage(800, 1200), false);
  // Landscape: double spread scan ~ 1600 x 1200
  assert.equal(isLandscapePage(1600, 1200), true);
  // Square: 1000 x 1000 -> not landscape (> 1.1 required)
  assert.equal(isLandscapePage(1000, 1000), false);
  // Borderline ratio 1.15
  assert.equal(isLandscapePage(1150, 1000), true);
});

test('Rule A & Rule B: Wide spreads stand alone and portrait pages pair up', () => {
  // 6 pages:
  // p1: portrait
  // p2: portrait
  // p3: landscape spread (e.g. dramatic battle spread)
  // p4: portrait
  // p5: portrait
  // p6: portrait (odd leftover)
  const dims: PageDimension[] = [
    { pageNum: 1, width: 800, height: 1200 },
    { pageNum: 2, width: 800, height: 1200 },
    { pageNum: 3, width: 1600, height: 1200 }, // landscape!
    { pageNum: 4, width: 800, height: 1200 },
    { pageNum: 5, width: 800, height: 1200 },
    { pageNum: 6, width: 800, height: 1200 },
  ];
  const pages = analyzePages(dims);

  const spreads = computeSpreads(pages, {
    isTwoPageMode: true,
    separateCover: false,
    isRtl: false,
  });

  // Spread 0: [p1, p2]
  assert.equal(spreads[0].pages.length, 2);
  assert.equal(spreads[0].pages[0].pageNum, 1);
  assert.equal(spreads[0].pages[1].pageNum, 2);
  assert.equal(spreads[0].isPaired, true);

  // Spread 1: [p3] (Landscape stands alone!)
  assert.equal(spreads[1].pages.length, 1);
  assert.equal(spreads[1].pages[0].pageNum, 3);
  assert.equal(spreads[1].isLandscapeSpread, true);
  assert.equal(spreads[1].isPaired, false);

  // Spread 2: [p4, p5]
  assert.equal(spreads[2].pages.length, 2);
  assert.equal(spreads[2].pages[0].pageNum, 4);
  assert.equal(spreads[2].pages[1].pageNum, 5);

  // Spread 3: [p6] (Alone at the end)
  assert.equal(spreads[3].pages.length, 1);
  assert.equal(spreads[3].pages[0].pageNum, 6);
});

test('Rule C: Separate Cover Page keeps Page 1 alone and pairs Page 2 and 3', () => {
  const dims: PageDimension[] = [
    { pageNum: 1, width: 800, height: 1200 }, // Cover
    { pageNum: 2, width: 800, height: 1200 },
    { pageNum: 3, width: 800, height: 1200 },
    { pageNum: 4, width: 800, height: 1200 },
  ];
  const pages = analyzePages(dims);

  const spreads = computeSpreads(pages, {
    isTwoPageMode: true,
    separateCover: true,
    isRtl: false,
  });

  // Spread 0: Cover page alone
  assert.equal(spreads[0].pages.length, 1);
  assert.equal(spreads[0].pages[0].pageNum, 1);

  // Spread 1: [p2, p3] paired
  assert.equal(spreads[1].pages.length, 2);
  assert.equal(spreads[1].pages[0].pageNum, 2);
  assert.equal(spreads[1].pages[1].pageNum, 3);

  // Spread 2: [p4] alone
  assert.equal(spreads[2].pages.length, 1);
  assert.equal(spreads[2].pages[0].pageNum, 4);
});

test('RTL Manga reading direction displays earlier page on right, later page on left', () => {
  const dims: PageDimension[] = [
    { pageNum: 2, width: 800, height: 1200 },
    { pageNum: 3, width: 800, height: 1200 },
  ];
  const pages = analyzePages(dims);

  // In RTL mode:
  const rtlSpreads = computeSpreads(pages, {
    isTwoPageMode: true,
    separateCover: false,
    isRtl: true,
  });

  // displayPages visual order: [leftPage, rightPage]
  // In Japanese manga: p2 is read first (on right), p3 is read second (on left).
  // So left is p3, right is p2!
  assert.equal(rtlSpreads[0].displayPages[0].pageNum, 3);
  assert.equal(rtlSpreads[0].displayPages[1].pageNum, 2);

  // In LTR mode:
  const ltrSpreads = computeSpreads(pages, {
    isTwoPageMode: true,
    separateCover: false,
    isRtl: false,
  });
  assert.equal(ltrSpreads[0].displayPages[0].pageNum, 2);
  assert.equal(ltrSpreads[0].displayPages[1].pageNum, 3);
});

test('Single page mode generates 1 spread per page regardless of aspect ratio', () => {
  const dims: PageDimension[] = [
    { pageNum: 1, width: 800, height: 1200 },
    { pageNum: 2, width: 1600, height: 1200 },
    { pageNum: 3, width: 800, height: 1200 },
  ];
  const pages = analyzePages(dims);
  const spreads = computeSpreads(pages, {
    isTwoPageMode: false,
    separateCover: false,
    isRtl: true,
  });

  assert.equal(spreads.length, 3);
  assert.equal(spreads[0].pages[0].pageNum, 1);
  assert.equal(spreads[1].pages[0].pageNum, 2);
  assert.equal(spreads[2].pages[0].pageNum, 3);
});

test('getSpreadIndexForPage accurately maps page to spread index', () => {
  const dims: PageDimension[] = [
    { pageNum: 1, width: 800, height: 1200 },
    { pageNum: 2, width: 800, height: 1200 },
    { pageNum: 3, width: 800, height: 1200 },
    { pageNum: 4, width: 1600, height: 1200 },
  ];
  const pages = analyzePages(dims);
  const spreads = computeSpreads(pages, {
    isTwoPageMode: true,
    separateCover: true,
    isRtl: true,
  });
  // Spread 0: [p1]
  // Spread 1: [p2, p3]
  // Spread 2: [p4] (wide)

  assert.equal(getSpreadIndexForPage(spreads, 1), 0);
  assert.equal(getSpreadIndexForPage(spreads, 2), 1);
  assert.equal(getSpreadIndexForPage(spreads, 3), 1);
  assert.equal(getSpreadIndexForPage(spreads, 4), 2);
});

test('formatSpreadLabel formats single and paired page labels', () => {
  const dims: PageDimension[] = [
    { pageNum: 1, width: 800, height: 1200 },
    { pageNum: 2, width: 800, height: 1200 },
    { pageNum: 3, width: 800, height: 1200 },
    { pageNum: 4, width: 1600, height: 1200 },
  ];
  const pages = analyzePages(dims);
  const spreads = computeSpreads(pages, {
    isTwoPageMode: true,
    separateCover: false,
    isRtl: true,
  });

  assert.equal(formatSpreadLabel(spreads[0]), '1 - 2');
  assert.equal(formatSpreadLabel(spreads[1]), '3');
  assert.equal(formatSpreadLabel(spreads[2]), '4 (Wide)');
});
