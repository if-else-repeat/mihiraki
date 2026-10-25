import React, { useState, useRef, useEffect } from 'react';
import {
  Minus,
  Plus,
  Maximize2,
  Minimize2,
  FolderOpen,
  Scan,
} from 'lucide-react';
import { MihirakiEmblem } from './MihirakiEmblem';
import { ViewMode, SpreadMode, ReadingDirection, FitMode, MangaFilter } from '../types/manga';

interface StealthHUDProps {
  currentPage: number;
  totalPages: number;
  viewMode: ViewMode;
  spreadMode: SpreadMode;
  separateCover: boolean;
  readingDirection: ReadingDirection;
  zoom: number;
  fitMode: FitMode;
  isFullscreen: boolean;
  mangaFilter: MangaFilter;
  onPageJump: (page: number) => void;
  onToggleViewMode: () => void;
  onToggleSpreadMode: () => void;
  onToggleSeparateCover: () => void;
  onToggleReadingDirection: () => void;
  onSelectFilter: (filter: MangaFilter) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleFit: () => void;
  onToggleFullscreen: () => void;
  onSwitchFile: () => void;
}

export const StealthHUD: React.FC<StealthHUDProps> = ({
  currentPage,
  totalPages,
  viewMode,
  spreadMode,
  separateCover,
  readingDirection,
  zoom,
  fitMode,
  isFullscreen,
  mangaFilter,
  onPageJump,
  onToggleViewMode,
  onToggleSpreadMode,
  onToggleSeparateCover,
  onToggleReadingDirection,
  onSelectFilter,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFit,
  onToggleFullscreen,
  onSwitchFile,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHoveringTrigger, setIsHoveringTrigger] = useState(false);
  const [pageInput, setPageInput] = useState(String(currentPage));
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Collapse popover on outside scroll or ESC key
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput.trim(), 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageJump(p);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      onPageJump(val);
    }
  };

  const progressPercent = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      ref={containerRef}
      className="fixed top-4 right-4 z-50 select-none"
      onMouseEnter={() => setIsHoveringTrigger(true)}
      onMouseLeave={() => {
        setIsHoveringTrigger(false);
      }}
    >
      {/* Micro Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
          isOpen || isHoveringTrigger
            ? 'opacity-100 bg-[#1a1a1e] border-2 border-[#2c2c32] shadow-[0_4px_0_#08080a] scale-100'
            : 'opacity-25 hover:opacity-100'
        }`}
        title="Open Mihiraki Menu (Esc / Tab)"
        aria-label="Toggle Mihiraki Menu"
      >
        {isOpen || isHoveringTrigger ? (
          <MihirakiEmblem size={26} />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-[#d93829]" />
        )}
      </button>

      {/* Compact Command Popover */}
      {isOpen && (
        <div
          className="absolute top-12 right-0 w-[260px] bg-[#1a1a1e] border-2 border-[#2c2c32] shadow-[0_12px_0_#08080a] rounded-xl p-3 flex flex-col gap-3 text-[#f5f2eb] animate-in fade-in zoom-in-95 duration-150"
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* 1. Page Scrubber Row */}
          <div className="flex flex-col gap-1.5 bg-[#0b0b0d] p-2 rounded-lg border border-[#2c2c32]">
            <div className="flex items-center justify-between text-xs font-mono">
              <form onSubmit={handlePageSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={handlePageSubmit}
                  className="w-10 h-5 px-1 text-center bg-[#1a1a1e] border border-[#2c2c32] text-[#f5f2eb] font-bold rounded focus:outline-none focus:border-[#d93829]"
                  aria-label="Current page number"
                />
                <span className="text-[#c9c2b4]">/</span>
                <span className="text-[#c9c2b4]">{totalPages}</span>
              </form>
              <span className="text-[10px] text-[#c9c2b4] font-semibold">
                {Math.round(progressPercent)}%
              </span>
            </div>

            {/* Scrubber Range Track */}
            <div className="relative flex items-center h-2">
              <input
                type="range"
                min="1"
                max={Math.max(1, totalPages)}
                value={currentPage}
                onChange={handleScrubberChange}
                className="w-full h-1 bg-[#2c2c32] appearance-none rounded cursor-pointer accent-[#d93829]"
                aria-label="Page scrubber track"
              />
            </div>
          </div>

          {/* 2. 2x2 Segmented Quick-Toggles */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono font-bold">
            {/* 2-PAGE vs 1-PAGE */}
            <button
              type="button"
              onClick={onToggleSpreadMode}
              className={`py-1.5 px-2 rounded border transition-colors flex items-center justify-center ${
                spreadMode === 'two-page'
                  ? 'bg-[#d93829] text-[#f5f2eb] border-[#08080a] shadow-[0_2px_0_#08080a]'
                  : 'bg-[#0b0b0d] text-[#c9c2b4] border-[#2c2c32] hover:text-[#f5f2eb]'
              }`}
            >
              {spreadMode === 'two-page' ? '2-PAGE' : '1-PAGE'}
            </button>

            {/* RTL vs LTR */}
            <button
              type="button"
              onClick={onToggleReadingDirection}
              className={`py-1.5 px-2 rounded border transition-colors flex items-center justify-center ${
                readingDirection === 'rtl'
                  ? 'bg-[#d93829] text-[#f5f2eb] border-[#08080a] shadow-[0_2px_0_#08080a]'
                  : 'bg-[#0b0b0d] text-[#c9c2b4] border-[#2c2c32] hover:text-[#f5f2eb]'
              }`}
            >
              {readingDirection === 'rtl' ? 'RTL' : 'LTR'}
            </button>

            {/* COVER OFF vs COVER 1P */}
            <button
              type="button"
              onClick={onToggleSeparateCover}
              className={`py-1.5 px-2 rounded border transition-colors flex items-center justify-center ${
                separateCover
                  ? 'bg-[#d93829] text-[#f5f2eb] border-[#08080a] shadow-[0_2px_0_#08080a]'
                  : 'bg-[#0b0b0d] text-[#c9c2b4] border-[#2c2c32] hover:text-[#f5f2eb]'
              }`}
            >
              {separateCover ? 'COVER 1P' : 'COVER OFF'}
            </button>

            {/* SCROLL vs FLIP */}
            <button
              type="button"
              onClick={onToggleViewMode}
              className={`py-1.5 px-2 rounded border transition-colors flex items-center justify-center ${
                viewMode === 'scroll'
                  ? 'bg-[#d93829] text-[#f5f2eb] border-[#08080a] shadow-[0_2px_0_#08080a]'
                  : 'bg-[#0b0b0d] text-[#c9c2b4] border-[#2c2c32] hover:text-[#f5f2eb]'
              }`}
            >
              {viewMode === 'scroll' ? 'SCROLL' : 'FLIP'}
            </button>
          </div>

          {/* 3. E-Ink / Manga Shading Filter Row */}
          <div className="flex flex-col gap-1.5 bg-[#0b0b0d] p-1.5 rounded-lg border border-[#2c2c32]">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#c9c2b4] px-0.5">
              <span>E-INK FILTER (E)</span>
              <span className="text-[#d93829] font-bold">
                {mangaFilter === 'none' ? 'OFF' : mangaFilter.toUpperCase().replace('-', ' ')}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[9px] font-mono font-bold">
              <button
                type="button"
                onClick={() => onSelectFilter('none')}
                className={`py-1 rounded border transition-colors flex items-center justify-center ${
                  mangaFilter === 'none'
                    ? 'bg-[#d93829] text-[#f5f2eb] border-[#08080a]'
                    : 'bg-[#1a1a1e] text-[#c9c2b4] border-[#2c2c32] hover:text-[#f5f2eb]'
                }`}
              >
                OFF
              </button>
              <button
                type="button"
                onClick={() => onSelectFilter('bw-ink')}
                className={`py-1 rounded border transition-colors flex items-center justify-center ${
                  mangaFilter === 'bw-ink'
                    ? 'bg-[#d93829] text-[#f5f2eb] border-[#08080a]'
                    : 'bg-[#1a1a1e] text-[#c9c2b4] border-[#2c2c32] hover:text-[#f5f2eb]'
                }`}
                title="B&W Ink: High-contrast ink, sharpens screentones"
              >
                INK
              </button>
              <button
                type="button"
                onClick={() => onSelectFilter('warm-sepia')}
                className={`py-1 rounded border transition-colors flex items-center justify-center ${
                  mangaFilter === 'warm-sepia'
                    ? 'bg-[#d93829] text-[#f5f2eb] border-[#08080a]'
                    : 'bg-[#1a1a1e] text-[#c9c2b4] border-[#2c2c32] hover:text-[#f5f2eb]'
                }`}
                title="Warm Sepia: Tankōbon paper tone, low eye strain"
              >
                SEPIA
              </button>
              <button
                type="button"
                onClick={() => onSelectFilter('oled-night')}
                className={`py-1 rounded border transition-colors flex items-center justify-center ${
                  mangaFilter === 'oled-night'
                    ? 'bg-[#d93829] text-[#f5f2eb] border-[#08080a]'
                    : 'bg-[#1a1a1e] text-[#c9c2b4] border-[#2c2c32] hover:text-[#f5f2eb]'
                }`}
                title="OLED Night: Inverted dark canvas for dark rooms"
              >
                OLED
              </button>
            </div>
          </div>

          {/* 4. Zoom Row */}
          <div className="flex items-center justify-between bg-[#0b0b0d] border border-[#2c2c32] rounded-lg p-1 text-xs font-mono">
            <button
              type="button"
              onClick={onZoomOut}
              disabled={zoom <= 0.4}
              className="p-1 rounded hover:bg-[#1a1a1e] text-[#c9c2b4] hover:text-[#f5f2eb] disabled:opacity-30"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onResetZoom}
              className="px-2 py-0.5 rounded text-[11px] font-semibold text-[#f5f2eb] hover:bg-[#1a1a1e]"
              title="Reset Zoom (0)"
            >
              {zoomPercent}%
            </button>

            <button
              type="button"
              onClick={onZoomIn}
              disabled={zoom >= 3.0}
              className="p-1 rounded hover:bg-[#1a1a1e] text-[#c9c2b4] hover:text-[#f5f2eb] disabled:opacity-30"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleFit}
              className="px-2 py-0.5 rounded text-[10px] font-bold border border-[#2c2c32] bg-[#1a1a1e] text-[#c9c2b4] hover:text-[#f5f2eb] flex items-center gap-1"
              title="Toggle Fit Mode"
            >
              <Scan className="w-3 h-3 text-[#d93829]" />
              <span>{fitMode.toUpperCase()}</span>
            </button>
          </div>

          {/* 4. Footer Actions */}
          <div className="flex items-center gap-2 pt-1 border-t border-[#2c2c32]">
            <button
              type="button"
              onClick={onSwitchFile}
              className="flex-1 py-1.5 px-2 bg-[#0b0b0d] hover:bg-[#2c2c32]/50 border border-[#2c2c32] rounded-lg text-xs font-mono font-medium text-[#ebe6dc] hover:text-[#f5f2eb] flex items-center justify-center gap-1.5 transition-colors"
              title="Open different file or Google Drive"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#d93829]" />
              <span>LIBRARY</span>
            </button>

            <button
              type="button"
              onClick={onToggleFullscreen}
              className="py-1.5 px-3 bg-[#0b0b0d] hover:bg-[#2c2c32]/50 border border-[#2c2c32] rounded-lg text-xs font-mono text-[#ebe6dc] hover:text-[#f5f2eb] flex items-center justify-center transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
