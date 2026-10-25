/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Origin Private File System (OPFS) Storage Engine
 * High-speed, zero-cloud sandboxed filesystem storage for 1GB+ manga volumes.
 */

const OPFS_DIR_NAME = 'mihiraki_volumes';

/**
 * Checks if OPFS is supported in the current browser runtime.
 */
export function isOPFSSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.storage &&
    typeof navigator.storage.getDirectory === 'function'
  );
}

/**
 * Gets or creates the Mihiraki OPFS root directory handle.
 */
async function getMihirakiDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isOPFSSupported()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(OPFS_DIR_NAME, { create: true });
  } catch (err) {
    console.warn('OPFS not accessible:', err);
    return null;
  }
}

/**
 * Persists a manga volume (.pdf, .cbz, .zip) into the browser's OPFS sandbox.
 */
export async function saveBookToOPFS(
  bookId: string,
  data: File | Blob | Uint8Array
): Promise<boolean> {
  try {
    const dir = await getMihirakiDirectory();
    if (!dir) return false;

    // Sanitize bookId for filesystem safety
    const safeId = bookId.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileHandle = await dir.getFileHandle(safeId, { create: true });
    
    // Create high-throughput streaming writable
    const writable = await fileHandle.createWritable();

    if (data instanceof Uint8Array) {
      await writable.write(data as any);
    } else {
      await writable.write(data);
    }

    await writable.close();
    return true;
  } catch (err) {
    console.warn(`Failed to save volume ${bookId} to OPFS:`, err);
    return false;
  }
}

/**
 * Retrieves a saved manga volume from the browser's OPFS sandbox.
 */
export async function getBookFromOPFS(bookId: string): Promise<File | null> {
  try {
    const dir = await getMihirakiDirectory();
    if (!dir) return null;

    const safeId = bookId.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileHandle = await dir.getFileHandle(safeId);
    return await fileHandle.getFile();
  } catch (err) {
    // File not found or failed to read
    return null;
  }
}

/**
 * Checks if a manga volume exists in OPFS.
 */
export async function hasBookInOPFS(bookId: string): Promise<boolean> {
  try {
    const dir = await getMihirakiDirectory();
    if (!dir) return false;

    const safeId = bookId.replace(/[^a-zA-Z0-9._-]/g, '_');
    await dir.getFileHandle(safeId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes a volume from OPFS to free local disk space.
 */
export async function deleteBookFromOPFS(bookId: string): Promise<boolean> {
  try {
    const dir = await getMihirakiDirectory();
    if (!dir) return false;

    const safeId = bookId.replace(/[^a-zA-Z0-9._-]/g, '_');
    await dir.removeEntry(safeId);
    return true;
  } catch {
    return false;
  }
}
