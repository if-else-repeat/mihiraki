import React, { useRef, useState, useEffect } from 'react';
import { MihirakiEmblem } from './MihirakiEmblem';
import { RecentBook, getRecentBooks, removeRecentBook } from '../utils/recentLibrary';
import { GoogleDriveModal } from './GoogleDriveModal';
import { Loader2, HardDrive, Trash2 } from 'lucide-react';

interface EntryScreenProps {
  onFileSelect: (file: File) => void;
  onSelectRecent: (book: RecentBook) => void;
  onOpenDriveUrl: (urlOrId: string) => Promise<void>;
  isLoading: boolean;
  loadingMessage?: string;
}

export const EntryScreen: React.FC<EntryScreenProps> = ({
  onFileSelect,
  onSelectRecent,
  onOpenDriveUrl,
  isLoading,
  loadingMessage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [recentBooks, setRecentBooks] = useState<RecentBook[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setRecentBooks(getRecentBooks());
  }, []);

  // Global window drag and drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDragOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        onFileSelect(file);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={`min-h-screen w-full bg-[#0b0b0d] bg-grid-blueprint text-[#f5f2eb] flex flex-col items-center justify-center p-4 transition-all duration-200 select-none ${
        isDragOver ? 'ring-4 ring-[#d93829] ring-inset' : ''
      }`}
    >
      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.cbz,.zip,application/pdf,application/zip,application/x-zip-compressed,application/x-cbz"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload comic file"
      />

      {/* Center Stage Structural Card */}
      <div className="w-full max-w-[420px] bg-[#1a1a1e] border-2 border-[#2c2c32] shadow-[0_10px_0_#08080a] rounded-2xl p-8 flex flex-col items-center">
        {isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#d93829]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#ebe6dc]">
              {loadingMessage || 'INITIALIZING MANGA SPREADS...'}
            </span>
          </div>
        ) : (
          <>
            {/* Card Header: Emblem + Tracked-out Wordmark */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 mb-3">
                <MihirakiEmblem size={56} />
              </div>
              <h1 className="font-mono font-black text-2xl tracking-[0.25em] text-[#f5f2eb]">
                MIHIRAKI
              </h1>
            </div>

            {/* Two Tactile Action Buttons */}
            <div className="w-full flex flex-col gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-12 bg-[#d93829] hover:bg-[#d93829]/95 text-[#f5f2eb] font-mono font-black text-xs uppercase tracking-[0.15em] rounded-xl border-2 border-[#08080a] shadow-[0_4px_0_#08080a] active:translate-y-[2px] active:shadow-[0_2px_0_#08080a] transition-all flex items-center justify-center cursor-pointer"
              >
                OPEN LOCAL FILE
              </button>

              <button
                type="button"
                onClick={() => setIsDriveModalOpen(true)}
                className="w-full h-12 bg-[#0b0b0d] hover:border-[#d93829] text-[#f5f2eb] font-mono font-bold text-xs uppercase tracking-[0.15em] rounded-xl border-2 border-[#2c2c32] active:translate-y-[2px] transition-colors flex items-center justify-center cursor-pointer"
              >
                GOOGLE DRIVE
              </button>
            </div>
          </>
        )}
      </div>

      {/* Recent Library Strip (Conditional) */}
      {!isLoading && recentBooks.length > 0 && (
        <div className="mt-8 w-full max-w-[420px] flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#c9c2b4]">
              RECENT VOLUMES (OPFS OFFLINE)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {recentBooks.map((book) => {
              const progress = book.totalPages > 0 ? (book.lastPage / book.totalPages) * 100 : 0;
              const formatSize = (bytes?: number) => {
                if (!bytes) return '';
                if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
                if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
                return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
              };

              const handleRemove = async (e: React.MouseEvent) => {
                e.stopPropagation();
                const updated = await removeRecentBook(book.id);
                setRecentBooks(updated);
              };

              return (
                <div
                  key={book.id || book.name}
                  onClick={() => onSelectRecent(book)}
                  className="group relative bg-[#1a1a1e] border-2 border-[#2c2c32] hover:border-[#d93829] shadow-[0_4px_0_#08080a] rounded-xl p-2.5 flex flex-col justify-between text-left transition-all active:translate-y-[2px] active:shadow-[0_2px_0_#08080a] cursor-pointer"
                >
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="absolute top-1.5 right-1.5 p-1 rounded bg-[#0b0b0d] text-[#c9c2b4] hover:text-[#d93829] opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from offline library"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>

                  <div className="flex flex-col mb-2 pr-3">
                    <span className="text-[11px] font-mono font-bold text-[#f5f2eb] truncate max-w-full">
                      {book.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-mono text-[#c9c2b4] uppercase">
                        p.{book.lastPage}/{book.totalPages}
                      </span>
                      {book.size && (
                        <span className="text-[8px] font-mono text-[#ebe6dc]/60">
                          {formatSize(book.size)}
                        </span>
                      )}
                      <span title="Stored in local OPFS sandbox" className="inline-flex items-center">
                        <HardDrive className="w-2.5 h-2.5 text-[#d93829]" />
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1 bg-[#0b0b0d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#d93829]"
                      style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Google Drive Modal */}
      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onLoadDriveUrl={onOpenDriveUrl}
        isLoading={isLoading}
      />
    </div>
  );
};
