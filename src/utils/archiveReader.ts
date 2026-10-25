import { unzip, Unzipped } from 'fflate';
import { PageInfo, isLandscapePage } from './spreadEngine';

export interface ArchivePage extends PageInfo {
  imageUrl: string;
  fileName: string;
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'bmp']);

function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

function getMimeType(filename: string): string {
  const ext = getExtension(filename);
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

/**
 * Loads image dimensions asynchronously from a Blob URL.
 */
function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 800,
        height: img.naturalHeight || 1200,
      });
    };
    img.onerror = () => {
      // Fallback portrait dimensions
      resolve({ width: 800, height: 1200 });
    };
    img.src = url;
  });
}

/**
 * Unpacks a CBZ or ZIP comic archive, extracts images in natural alphanumeric order,
 * inspects dimensions, and formats them for the Smart Two-Page Spread Engine.
 */
export async function unpackComicArchive(
  data: Uint8Array,
  onProgress?: (message: string) => void
): Promise<ArchivePage[]> {
  onProgress?.('Decompressing comic archive...');

  const unzipped: Unzipped = await new Promise((resolve, reject) => {
    unzip(data, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  const validEntries: Array<{ name: string; data: Uint8Array }> = [];

  for (const [name, fileBytes] of Object.entries(unzipped)) {
    // Ignore hidden Mac/system files and directories
    if (
      name.startsWith('__MACOSX') ||
      name.includes('/__MACOSX/') ||
      name.startsWith('.') ||
      name.includes('/.') ||
      fileBytes.length === 0
    ) {
      continue;
    }

    const ext = getExtension(name);
    if (IMAGE_EXTENSIONS.has(ext)) {
      validEntries.push({ name, data: fileBytes });
    }
  }

  if (validEntries.length === 0) {
    throw new Error('No valid images (.jpg, .png, .webp, .avif) found in comic archive.');
  }

  // Natural alphanumeric sorting (Page_2 before Page_10)
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  validEntries.sort((a, b) => collator.compare(a.name, b.name));

  onProgress?.(`Inspecting ${validEntries.length} pages & aspect ratios...`);

  const pages: ArchivePage[] = [];

  for (let i = 0; i < validEntries.length; i++) {
    const entry = validEntries[i];
    const mime = getMimeType(entry.name);
    const blob = new Blob([entry.data as BlobPart], { type: mime });
    const imageUrl = URL.createObjectURL(blob);
    const { width, height } = await loadImageDimensions(imageUrl);

    const isLandscape = isLandscapePage(width, height);
    const aspectRatio = height > 0 ? width / height : 0.67;

    pages.push({
      pageNum: i + 1,
      width,
      height,
      isLandscape,
      aspectRatio,
      imageUrl,
      fileName: entry.name,
    });
  }

  return pages;
}
