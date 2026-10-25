import React from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Spread } from '../utils/spreadEngine';
import { PageView } from './PageView';

import { MangaFilter } from '../types/manga';

interface SpreadRowProps {
  spread: Spread;
  pdfDoc?: PDFDocumentProxy | null;
  scale: number;
  fitMode: 'width' | 'height' | 'custom';
  containerWidth: number;
  containerHeight: number;
  isRtl: boolean;
  isActive?: boolean;
  mangaFilter?: MangaFilter;
}

export const SpreadRow: React.FC<SpreadRowProps> = ({
  spread,
  pdfDoc,
  scale,
  fitMode,
  containerWidth,
  containerHeight,
  isRtl,
  isActive = false,
  mangaFilter = 'none',
}) => {
  return (
    <div
      id={`spread-${spread.spreadIndex}`}
      data-spread-index={spread.spreadIndex}
      data-pages={spread.pages.map(p => p.pageNum).join(',')}
      className="flex justify-center items-center transition-transform duration-150"
      style={{
        marginBottom: '16px',
        minHeight: '200px',
      }}
    >
      <div
        className={`flex items-center justify-center transition-all duration-200 border border-[#2c2c32] shadow-[0_6px_0_#08080a] ${
          isActive ? 'ring-1 ring-[#d93829]' : ''
        }`}
        style={{
          // Zero seam gap between paired portrait pages!
          gap: 0,
        }}
      >
        {spread.displayPages.map((page, index) => {
          let positionInPair: 'left' | 'right' | 'single' = 'single';
          if (spread.isPaired) {
            positionInPair = index === 0 ? 'left' : 'right';
          }

          return (
            <PageView
              key={`page-${page.pageNum}`}
              pdfDoc={pdfDoc}
              pageInfo={page}
              scale={scale}
              fitMode={fitMode}
              containerWidth={containerWidth}
              containerHeight={containerHeight}
              isPaired={spread.isPaired}
              positionInPair={positionInPair}
              isRtl={isRtl}
              mangaFilter={mangaFilter}
            />
          );
        })}
      </div>
    </div>
  );
};
