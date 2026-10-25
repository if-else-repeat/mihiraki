import React, { useState } from 'react';
import { X, Cloud, ArrowRight, Loader2 } from 'lucide-react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDriveUrl: (urlOrId: string) => Promise<void>;
  isLoading: boolean;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onLoadDriveUrl,
  isLoading,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setError(null);
    try {
      await onLoadDriveUrl(urlInput.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch file from Google Drive');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0b0d]/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-[380px] bg-[#1a1a1e] border-2 border-[#2c2c32] shadow-[0_12px_0_#08080a] rounded-2xl p-5 text-[#f5f2eb]">
        <div className="flex items-center justify-between pb-3 border-b border-[#2c2c32] mb-4">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#d93829]" />
            <h3 className="font-mono font-bold text-sm tracking-wider uppercase">Google Drive</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#c9c2b4] hover:text-[#f5f2eb] hover:bg-[#2c2c32] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-xs font-mono text-[#c9c2b4]">
            Paste Google Drive Share Link or File ID
          </label>
          <input
            type="text"
            placeholder="https://drive.google.com/file/d/..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={isLoading}
            autoFocus
            className="w-full h-10 px-3 bg-[#0b0b0d] border-2 border-[#2c2c32] text-sm text-[#f5f2eb] font-mono rounded-lg focus:outline-none focus:border-[#d93829]"
          />

          {error && (
            <p className="text-[11px] text-[#d93829] font-mono leading-tight">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || !urlInput.trim()}
            className="w-full h-10 mt-1 bg-[#d93829] hover:bg-[#d93829]/90 disabled:opacity-40 text-[#f5f2eb] font-mono font-bold text-xs uppercase tracking-wider rounded-lg border-2 border-[#08080a] shadow-[0_4px_0_#08080a] active:translate-y-[2px] active:shadow-[0_2px_0_#08080a] transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Stream Volume</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
