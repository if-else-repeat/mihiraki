import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { PageInfo } from '../utils/spreadEngine';
import { Loader2 } from 'lucide-react';

import { MangaFilter } from '../types/manga';

interface PageViewProps {
  pdfDoc?: PDFDocumentProxy | null;
  pageInfo: PageInfo;
  scale: number; // visual scale multiplier
  fitMode: 'width' | 'height' | 'custom';
  containerWidth: number;
  containerHeight: number;
  isPaired: boolean;
  positionInPair?: 'left' | 'right' | 'single';
  isRtl?: boolean;
  mangaFilter?: MangaFilter;
}

export const PageView: React.FC<PageViewProps> = ({
  pdfDoc,
  pageInfo,
  scale,
  fitMode,
  containerWidth,
  containerHeight,
  isPaired,
  positionInPair = 'single',
  mangaFilter = 'none',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Calculate target CSS display dimensions based on fitMode, zoom scale, and whether paired
  const availableWidth = isPaired
    ? Math.max(280, (containerWidth - 64) / 2)
    : Math.max(300, containerWidth - 48);
  const availableHeight = Math.max(400, containerHeight - 120);

  let displayWidth = 0;
  let displayHeight = 0;

  if (fitMode === 'height') {
    displayHeight = availableHeight * scale;
    displayWidth = displayHeight * pageInfo.aspectRatio;
  } else {
    // fitMode === 'width' or 'custom'
    displayWidth = availableWidth * scale;
    displayHeight = displayWidth / pageInfo.aspectRatio;
  }

  displayWidth = Math.round(displayWidth);
  displayHeight = Math.round(displayHeight);

  // Lazy-load using IntersectionObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          if (entry.boundingClientRect.top > 2500 || entry.boundingClientRect.bottom < -2500) {
            setIsVisible(false);
          }
        }
      },
      {
        root: null,
        rootMargin: '600px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render PDF page to canvas when visible or dimensions change
  useEffect(() => {
    // If it's an image-based page (CBZ / ZIP), no PDF rendering needed
    if (pageInfo.imageUrl) {
      return;
    }

    if (!isVisible || !pdfDoc) return;

    let isCancelled = false;
    let renderTask: any = null;

    const renderPage = async () => {
      try {
        setIsRendering(true);
        setRenderError(null);

        const page: PDFPageProxy = await pdfDoc.getPage(pageInfo.pageNum);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const actualWidth = displayWidth;
        const actualHeight = displayHeight;

        canvas.width = Math.floor(actualWidth * dpr);
        canvas.height = Math.floor(actualHeight * dpr);
        canvas.style.width = `${actualWidth}px`;
        canvas.style.height = `${actualHeight}px`;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const scaleFactor = (actualWidth * dpr) / unscaledViewport.width;
        const viewport = page.getViewport({ scale: scaleFactor });

        const renderContext = {
          canvasContext: ctx,
          canvas,
          viewport,
          intent: 'display',
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;

        if (!isCancelled) {
          setIsRendered(true);
          setIsRendering(false);
        }
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') {
          return;
        }
        if (!isCancelled) {
          console.error(`Error rendering page ${pageInfo.pageNum}:`, err);
          setRenderError(err.message || 'Render error');
          setIsRendering(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask && typeof renderTask.cancel === 'function') {
        try {
          renderTask.cancel();
        } catch {
          // Ignored
        }
      }
    };
  }, [isVisible, pdfDoc, pageInfo.pageNum, pageInfo.imageUrl, displayWidth, displayHeight]);

  // Spine shadow styling
  let spineClasses = '';
  if (positionInPair === 'left') {
    spineClasses = 'shadow-[inset_-3px_0_6px_rgba(8,8,10,0.45)] border-r border-[#08080a]';
  } else if (positionInPair === 'right') {
    spineClasses = 'shadow-[inset_3px_0_6px_rgba(8,8,10,0.45)] border-l border-[#08080a]';
  }

  const getFilterStyle = (filter: MangaFilter = 'none'): React.CSSProperties => {
    switch (filter) {
      case 'bw-ink':
        return { filter: 'grayscale(100%) contrast(165%) brightness(95%)' };
      case 'warm-sepia':
        return { filter: 'sepia(45%) contrast(108%) brightness(96%) hue-rotate(-15deg)' };
      case 'oled-night':
        return { filter: 'invert(100%) hue-rotate(180%) contrast(125%) brightness(90%)' };
      case 'none':
      default:
        return {};
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative select-none bg-[#0b0b0d] overflow-hidden ${spineClasses}`}
      style={{
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        maxWidth: '100%',
      }}
      data-testid={`page-container-${pageInfo.pageNum}`}
    >
      {/* If Image Page (from CBZ/ZIP) */}
      {pageInfo.imageUrl ? (
        <img
          src={pageInfo.imageUrl}
          alt={`Page ${pageInfo.pageNum}`}
          onLoad={() => setIsRendered(true)}
          style={getFilterStyle(mangaFilter)}
          className={`block w-full h-full object-contain ${
            isRendered ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-150`}
          loading="lazy"
        />
      ) : (
        /* If PDF Page */
        <canvas
          ref={canvasRef}
          style={getFilterStyle(mangaFilter)}
          className={`block w-full h-full object-contain ${
            isRendered ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-150`}
          aria-label={`PDF Page ${pageInfo.pageNum}`}
        />
      )}

      {/* Loading Placeholder */}
      {(!isRendered || isRendering) && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1e] text-[#c9c2b4] select-none"
          aria-hidden="true"
        >
          <Loader2 className="w-5 h-5 animate-spin text-[#d93829] mb-2" />
          <span className="text-xs font-mono text-[#ebe6dc]">
            Page {pageInfo.pageNum}
          </span>
          {pageInfo.isLandscape && (
            <span className="text-[10px] mt-1 px-1.5 py-0.5 rounded bg-[#0b0b0d] text-[#f5f2eb] border border-[#2c2c32] font-medium">
              Landscape Spread
            </span>
          )}
        </div>
      )}

      {/* Error state */}
      {renderError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1e] text-[#d93829] p-4 text-center border border-[#d93829]">
          <p className="text-xs font-semibold">Failed to render Page {pageInfo.pageNum}</p>
          <p className="text-[10px] mt-1 text-[#ebe6dc] font-mono">{renderError}</p>
        </div>
      )}
    </div>
  );
};
