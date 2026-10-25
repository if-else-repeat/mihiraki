/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { pdfjsLib } from './utils/pdfInit';
import {
  PageDimension,
  PageInfo,
  Spread,
  analyzePages,
  computeSpreads,
  getSpreadIndexForPage,
} from './utils/spreadEngine';
import {
  ViewMode,
  SpreadMode,
  ReadingDirection,
  FitMode,
  MangaFilter,
  FileMetadata,
} from './types/manga';
import { unpackComicArchive } from './utils/archiveReader';
import {
  saveRecentBook,
  updateRecentProgress,
  getRecentBookProgress,
  RecentBook,
} from './utils/recentLibrary';
import {
  loadGlobalSettings,
  saveGlobalSettings,
  loadBookLastPage,
  saveBookLastPage,
} from './utils/storage';
import { saveBookToOPFS, getBookFromOPFS } from './utils/opfsStorage';
import { SpreadRow } from './components/SpreadRow';
import { StealthHUD } from './components/StealthHUD';
import { EntryScreen } from './components/EntryScreen';

export default function App() {
  // Document State
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [fileMeta, setFileMeta] = useState<FileMetadata | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Reader Preferences: Restore remembered settings or fallback to defaults
  const initialSettings = useMemo(() => loadGlobalSettings(), []);
  const [viewMode, setViewMode] = useState<ViewMode>(initialSettings.viewMode);
  const [spreadMode, setSpreadMode] = useState<SpreadMode>(initialSettings.spreadMode);
  const [separateCover, setSeparateCover] = useState<boolean>(initialSettings.separateCover);
  const [readingDirection, setReadingDirection] = useState<ReadingDirection>(initialSettings.readingDirection);
  const [zoom, setZoom] = useState<number>(initialSettings.zoom);
  const [fitMode, setFitMode] = useState<FitMode>(initialSettings.fitMode);
  const [mangaFilter, setMangaFilter] = useState<MangaFilter>(initialSettings.mangaFilter);

  // Active View State
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [activePageNumber, setActivePageNumber] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Viewport Dimensions
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Compute Spreads using the Aspect-Ratio Aware Layout Engine
  const spreads: Spread[] = useMemo(() => {
    if (pages.length === 0) return [];
    return computeSpreads(pages, {
      isTwoPageMode: spreadMode === 'two-page',
      separateCover,
      isRtl: readingDirection === 'rtl',
    });
  }, [pages, spreadMode, separateCover, readingDirection]);

  const activeSpread = spreads[currentSpreadIndex] || spreads[0];

  // Helper to reliably scroll spread into view with retry loop
  const jumpToSpreadReliably = useCallback((spreadIdx: number) => {
    let attempts = 0;
    const tryScroll = () => {
      const spreadEl = document.getElementById(`spread-${spreadIdx}`);
      if (spreadEl) {
        spreadEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (attempts < 15) {
        attempts++;
        requestAnimationFrame(tryScroll);
      }
    };
    requestAnimationFrame(tryScroll);
  }, []);

  // Jump to specific page
  const handlePageJump = useCallback(
    (pageNum: number) => {
      if (spreads.length === 0) return;
      const targetPage = Math.max(1, Math.min(pageNum, fileMeta?.totalPages || pages.length));
      const targetSpreadIdx = getSpreadIndexForPage(spreads, targetPage);
      setCurrentSpreadIndex(targetSpreadIdx);
      setActivePageNumber(targetPage);

      if (fileMeta) {
        updateRecentProgress(fileMeta.name, targetPage);
        saveBookLastPage(fileMeta.name, fileMeta.size, targetPage);
      }

      if (viewMode === 'scroll') {
        jumpToSpreadReliably(targetSpreadIdx);
      }
    },
    [spreads, fileMeta, pages.length, viewMode, jumpToSpreadReliably]
  );

  // Load PDF from ArrayBuffer / Uint8Array
  const loadPdfData = async (
    data: Uint8Array,
    fileName: string,
    fileSize: number,
    bookId: string,
    initialPage: number = 1
  ) => {
    try {
      setIsLoading(true);
      setLoadingMessage('INITIALIZING PDF...');

      const loadingTask = pdfjsLib.getDocument({
        data,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/cmaps/',
        cMapPacked: true,
      });

      const doc = await loadingTask.promise;
      setPdfDoc(doc);

      setLoadingMessage(`INSPECTING ${doc.numPages} PAGES...`);

      const dimensions: PageDimension[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        dimensions.push({
          pageNum: i,
          width: viewport.width,
          height: viewport.height,
        });
      }

      const analyzed = analyzePages(dimensions);
      setPages(analyzed);

      setFileMeta({
        name: fileName,
        size: fileSize,
        totalPages: doc.numPages,
      });

      // Save to recent library and book storage with OPFS indicator
      saveRecentBook({
        id: bookId,
        name: fileName,
        totalPages: doc.numPages,
        lastPage: initialPage,
        format: 'pdf',
        size: fileSize,
        inOPFS: true,
      });
      saveBookLastPage(fileName, fileSize, initialPage);

      setIsLoading(false);
      setLoadingMessage('');

      // Pre-compute target spread index to jump immediately
      const computed = computeSpreads(analyzed, {
        isTwoPageMode: spreadMode === 'two-page',
        separateCover,
        isRtl: readingDirection === 'rtl',
      });
      const targetSpreadIdx = getSpreadIndexForPage(computed, initialPage);
      setCurrentSpreadIndex(targetSpreadIdx);
      setActivePageNumber(initialPage);

      if (initialPage > 1 && viewMode === 'scroll') {
        jumpToSpreadReliably(targetSpreadIdx);
      }
    } catch (err: any) {
      console.error('Failed to open PDF:', err);
      setIsLoading(false);
      alert(`Could not open PDF: ${err.message || 'Unknown error'}`);
    }
  };

  // Load Comic Archive (.cbz, .zip)
  const loadArchiveData = async (
    data: Uint8Array,
    fileName: string,
    fileSize: number,
    bookId: string,
    initialPage: number = 1
  ) => {
    try {
      setIsLoading(true);
      setPdfDoc(null);

      const archivePages = await unpackComicArchive(data, (msg) => setLoadingMessage(msg));
      setPages(archivePages);

      setFileMeta({
        name: fileName,
        size: fileSize,
        totalPages: archivePages.length,
      });

      saveRecentBook({
        id: bookId,
        name: fileName,
        totalPages: archivePages.length,
        lastPage: initialPage,
        format: fileName.toLowerCase().endsWith('.cbz') ? 'cbz' : 'zip',
        size: fileSize,
        inOPFS: true,
      });
      saveBookLastPage(fileName, fileSize, initialPage);

      setIsLoading(false);
      setLoadingMessage('');

      const computed = computeSpreads(archivePages, {
        isTwoPageMode: spreadMode === 'two-page',
        separateCover,
        isRtl: readingDirection === 'rtl',
      });
      const targetSpreadIdx = getSpreadIndexForPage(computed, initialPage);
      setCurrentSpreadIndex(targetSpreadIdx);
      setActivePageNumber(initialPage);

      if (initialPage > 1 && viewMode === 'scroll') {
        jumpToSpreadReliably(targetSpreadIdx);
      }
    } catch (err: any) {
      console.error('Failed to unpack archive:', err);
      setIsLoading(false);
      alert(`Could not open comic archive: ${err.message || 'Corrupted or unsupported format'}`);
    }
  };

  // Generic File Loader (.pdf, .cbz, .zip) with OPFS persistence & automatic last page restoration
  const handleFileSelect = async (file: File, explicitResumePage?: number, overrideName?: string) => {
    const originalName = overrideName || file.name;
    const name = originalName.toLowerCase();

    // Preserve extension in bookId
    const ext = originalName.includes('.') ? '.' + originalName.split('.').pop() : '';
    const base = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const bookId = `manga_${base}_${file.size}${ext}`;

    // Look up remembered page if explicit resume page not specified
    const resumePage =
      explicitResumePage && explicitResumePage >= 1
        ? explicitResumePage
        : loadBookLastPage(originalName, file.size) ??
          getRecentBookProgress(originalName) ??
          1;

    // Persist into OPFS sandboxed local storage in background (zero cloud latency)
    saveBookToOPFS(bookId, file).catch((err) =>
      console.warn('OPFS background save notification:', err)
    );

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Magic byte sniffing: ZIP/CBZ archives start with PK (0x50, 0x4B)
    const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;

    if (isZip || name.endsWith('.cbz') || name.endsWith('.zip')) {
      await loadArchiveData(bytes, originalName, file.size, bookId, resumePage);
    } else {
      await loadPdfData(bytes, originalName, file.size, bookId, resumePage);
    }
  };

  // Select Recent Volume: Instantly reads file directly from OPFS, resuming at last-read page
  const handleSelectRecent = async (book: RecentBook) => {
    try {
      setIsLoading(true);
      setLoadingMessage(`READING ${book.name} FROM OPFS...`);

      const file = await getBookFromOPFS(book.id);
      if (file) {
        await handleFileSelect(file, book.lastPage, book.name);
      } else {
        setIsLoading(false);
        alert(`Volume not found in local OPFS storage. Please drop or re-select "${book.name}".`);
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error('Failed to open from OPFS:', err);
      alert(`Could not open offline file: ${err.message || 'Storage error'}`);
    }
  };

  // Google Drive URL streamer
  const handleOpenDriveUrl = async (urlOrId: string) => {
    setIsLoading(true);
    setLoadingMessage('STREAMING FROM GOOGLE DRIVE...');

    let fileId = urlOrId.trim();
    const match = urlOrId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || urlOrId.match(/id=([a-zA-Z0-9_-]+)/);
    if (match) {
      fileId = match[1];
    }

    const downloadUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

    try {
      const resp = await fetch(downloadUrl);
      if (!resp.ok) {
        throw new Error(`Drive response status: ${resp.status}`);
      }
      const buffer = await resp.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
      const fileName = isZip ? `Drive_${fileId.slice(0, 6)}.cbz` : `Drive_${fileId.slice(0, 6)}.pdf`;
      const bookId = `drive_${fileId}_${bytes.byteLength}`;

      const rememberedPage = loadBookLastPage(fileName, bytes.byteLength) ?? 1;

      // Save streamed Google Drive file into OPFS so future opens are instantaneous offline!
      saveBookToOPFS(bookId, bytes).catch((e) => console.warn('OPFS save error:', e));

      if (isZip) {
        await loadArchiveData(bytes, fileName, bytes.byteLength, bookId, rememberedPage);
      } else {
        await loadPdfData(bytes, fileName, bytes.byteLength, bookId, rememberedPage);
      }
    } catch (err: any) {
      setIsLoading(false);
      throw new Error(`Could not stream file from Google Drive: ${err.message || 'Check sharing permissions'}`);
    }
  };

  // Reset to Home / Switch File
  const handleSwitchFile = () => {
    setPdfDoc(null);
    setFileMeta(null);
    setPages([]);
  };

  // Toggle Handlers with immediate global settings persistence
  const handleToggleViewMode = () => {
    setViewMode((prev) => {
      const next = prev === 'scroll' ? 'paginated' : 'scroll';
      saveGlobalSettings({ viewMode: next });
      return next;
    });
  };

  const handleToggleSpreadMode = () => {
    setSpreadMode((prev) => {
      const next = prev === 'two-page' ? 'single' : 'two-page';
      saveGlobalSettings({ spreadMode: next });
      return next;
    });
  };

  const handleToggleSeparateCover = () => {
    setSeparateCover((prev) => {
      const next = !prev;
      saveGlobalSettings({ separateCover: next });
      return next;
    });
  };

  const handleToggleReadingDirection = () => {
    setReadingDirection((prev) => {
      const next = prev === 'rtl' ? 'ltr' : 'rtl';
      saveGlobalSettings({ readingDirection: next });
      return next;
    });
  };

  const handleSelectFilter = (filter: MangaFilter) => {
    setMangaFilter(filter);
    saveGlobalSettings({ mangaFilter: filter });
  };

  const handleCycleFilter = useCallback(() => {
    setMangaFilter((prev) => {
      let next: MangaFilter = 'none';
      if (prev === 'none') next = 'bw-ink';
      else if (prev === 'bw-ink') next = 'warm-sepia';
      else if (prev === 'warm-sepia') next = 'oled-night';
      else next = 'none';
      saveGlobalSettings({ mangaFilter: next });
      return next;
    });
  }, []);

  const handleZoomIn = () => {
    setZoom((prev) => {
      const next = Math.min(3.0, Number((prev + 0.15).toFixed(2)));
      saveGlobalSettings({ zoom: next });
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(0.4, Number((prev - 0.15).toFixed(2)));
      saveGlobalSettings({ zoom: next });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setFitMode('width');
    saveGlobalSettings({ zoom: 1.0, fitMode: 'width' });
  };

  const handleToggleFit = () => {
    setFitMode((prev) => {
      const next = prev === 'width' ? 'height' : 'width';
      saveGlobalSettings({ fitMode: next, zoom: 1.0 });
      return next;
    });
    setZoom(1.0);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleSpreadJump = useCallback(
    (spreadIdx: number) => {
      if (spreadIdx < 0 || spreadIdx >= spreads.length) return;
      setCurrentSpreadIndex(spreadIdx);
      const targetSpread = spreads[spreadIdx];
      if (targetSpread && targetSpread.pages.length > 0) {
        const firstPage = targetSpread.pages[0].pageNum;
        setActivePageNumber(firstPage);
        if (fileMeta) {
          updateRecentProgress(fileMeta.name, firstPage);
          saveBookLastPage(fileMeta.name, fileMeta.size, firstPage);
        }
      }

      if (viewMode === 'scroll') {
        jumpToSpreadReliably(spreadIdx);
      }
    },
    [spreads, fileMeta, viewMode, jumpToSpreadReliably]
  );

  const handleNextSpread = useCallback(() => {
    if (currentSpreadIndex < spreads.length - 1) {
      handleSpreadJump(currentSpreadIndex + 1);
    }
  }, [currentSpreadIndex, spreads.length, handleSpreadJump]);

  const handlePrevSpread = useCallback(() => {
    if (currentSpreadIndex > 0) {
      handleSpreadJump(currentSpreadIndex - 1);
    }
  }, [currentSpreadIndex, handleSpreadJump]);

  // Track active spread during continuous vertical scrolling
  useEffect(() => {
    if (viewMode !== 'scroll' || spreads.length === 0) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const containerRect = container.getBoundingClientRect();
          const centerY = containerRect.top + containerRect.height / 2;

          let closestIdx = 0;
          let minDistance = Infinity;

          for (let i = 0; i < spreads.length; i++) {
            const el = document.getElementById(`spread-${i}`);
            if (el) {
              const rect = el.getBoundingClientRect();
              const elCenterY = rect.top + rect.height / 2;
              const distance = Math.abs(centerY - elCenterY);
              if (distance < minDistance) {
                minDistance = distance;
                closestIdx = i;
              }
            }
          }

          if (closestIdx !== currentSpreadIndex) {
            setCurrentSpreadIndex(closestIdx);
            const spread = spreads[closestIdx];
            if (spread && spread.pages.length > 0) {
              const activePg = spread.pages[0].pageNum;
              setActivePageNumber(activePg);
              if (fileMeta) {
                updateRecentProgress(fileMeta.name, activePg);
                saveBookLastPage(fileMeta.name, fileMeta.size, activePg);
              }
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [viewMode, spreads, currentSpreadIndex, fileMeta]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault();
          if (readingDirection === 'rtl') {
            handleNextSpread();
          } else {
            handlePrevSpread();
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (readingDirection === 'rtl') {
            handlePrevSpread();
          } else {
            handleNextSpread();
          }
          break;
        }
        case 'ArrowDown':
        case ' ': {
          if (viewMode === 'scroll' && scrollContainerRef.current) {
            e.preventDefault();
            scrollContainerRef.current.scrollBy({
              top: e.key === ' ' ? 380 : 120,
              behavior: 'smooth',
            });
          } else if (viewMode === 'paginated') {
            e.preventDefault();
            handleNextSpread();
          }
          break;
        }
        case 'ArrowUp': {
          if (viewMode === 'scroll' && scrollContainerRef.current) {
            e.preventDefault();
            scrollContainerRef.current.scrollBy({ top: -120, behavior: 'smooth' });
          } else if (viewMode === 'paginated') {
            e.preventDefault();
            handlePrevSpread();
          }
          break;
        }
        case 'e':
        case 'E': {
          e.preventDefault();
          handleCycleFilter();
          break;
        }
        case '+':
        case '=': {
          e.preventDefault();
          handleZoomIn();
          break;
        }
        case '-': {
          e.preventDefault();
          handleZoomOut();
          break;
        }
        case '0': {
          e.preventDefault();
          handleResetZoom();
          break;
        }
        case 'f':
        case 'F': {
          e.preventDefault();
          handleToggleFullscreen();
          break;
        }
        case 'd':
        case 'D': {
          e.preventDefault();
          handleToggleSpreadMode();
          break;
        }
        case 'm':
        case 'M': {
          e.preventDefault();
          handleToggleReadingDirection();
          break;
        }
        case 'c':
        case 'C': {
          e.preventDefault();
          handleToggleSeparateCover();
          break;
        }
        case 'v':
        case 'V': {
          e.preventDefault();
          handleToggleViewMode();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    readingDirection,
    viewMode,
    handleCycleFilter,
    handleNextSpread,
    handlePrevSpread,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleToggleFullscreen,
    handleToggleSpreadMode,
    handleToggleReadingDirection,
    handleToggleSeparateCover,
    handleToggleViewMode,
  ]);

  // Click & Drag Panning when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !scrollContainerRef.current) return;
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: scrollContainerRef.current.scrollLeft,
      scrollTop: scrollContainerRef.current.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !scrollContainerRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    scrollContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    scrollContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // If no document is loaded, show the clean zero-text entry screen
  if (!fileMeta || pages.length === 0) {
    return (
      <EntryScreen
        onFileSelect={handleFileSelect}
        onSelectRecent={handleSelectRecent}
        onOpenDriveUrl={handleOpenDriveUrl}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
      />
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b0b0d] text-[#f5f2eb] flex flex-col select-none">
      {/* Stealth Top-Right Corner HUD: 0 visible UI during reading */}
      <StealthHUD
        currentPage={activePageNumber}
        totalPages={fileMeta.totalPages}
        viewMode={viewMode}
        spreadMode={spreadMode}
        separateCover={separateCover}
        readingDirection={readingDirection}
        zoom={zoom}
        fitMode={fitMode}
        isFullscreen={isFullscreen}
        mangaFilter={mangaFilter}
        onPageJump={handlePageJump}
        onToggleViewMode={handleToggleViewMode}
        onToggleSpreadMode={handleToggleSpreadMode}
        onToggleSeparateCover={handleToggleSeparateCover}
        onToggleReadingDirection={handleToggleReadingDirection}
        onSelectFilter={handleSelectFilter}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onToggleFit={handleToggleFit}
        onToggleFullscreen={handleToggleFullscreen}
        onSwitchFile={handleSwitchFile}
      />

      {/* Main 100% Pure Reading Canvas Viewport with No Scrollbars */}
      <main
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 w-full h-full overflow-auto bg-[#0b0b0d] no-scrollbar ${
          isPanning ? 'cursor-grabbing' : zoom > 1.05 ? 'cursor-grab' : 'cursor-default'
        }`}
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        <div
          className={`min-h-full w-full flex flex-col items-center py-4 px-0 ${
            viewMode === 'paginated' ? 'justify-center' : 'justify-start'
          }`}
        >
          {viewMode === 'scroll' ? (
            /* Continuous Vertical Scroll View with 16px #0b0b0d Gap */
            <div className="w-full flex flex-col items-center">
              {spreads.map((spread) => (
                <SpreadRow
                  key={spread.id}
                  spread={spread}
                  pdfDoc={pdfDoc}
                  scale={zoom}
                  fitMode={fitMode}
                  containerWidth={viewportSize.width}
                  containerHeight={viewportSize.height}
                  isRtl={readingDirection === 'rtl'}
                  isActive={spread.spreadIndex === currentSpreadIndex}
                  mangaFilter={mangaFilter}
                />
              ))}
            </div>
          ) : (
            /* Paginated Flip Mode (Single Spread Centered) */
            <div className="w-full flex items-center justify-center animate-in fade-in duration-150">
              {activeSpread && (
                <SpreadRow
                  spread={activeSpread}
                  pdfDoc={pdfDoc}
                  scale={zoom}
                  fitMode={fitMode}
                  containerWidth={viewportSize.width}
                  containerHeight={viewportSize.height}
                  isRtl={readingDirection === 'rtl'}
                  isActive={true}
                  mangaFilter={mangaFilter}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
