// Utility functions for QR code scanning and data management

export interface QRScan {
  id: string;
  value: string;
  timestamp: number;
  formattedDate: string;
}

const STORAGE_KEY = 'qr_scans';
const DUPLICATE_WINDOW_MS = 3000; // 3 seconds to prevent duplicate scans

/**
 * Get all scans from localStorage
 */
export function getScans(): QRScan[] {
  try {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('Error reading scans from localStorage');
    return [];
  }
}

/**
 * Save a new scan to localStorage with duplicate prevention
 */
export function addScan(value: string): QRScan | null {
  try {
    if (typeof window === 'undefined') return null;

    const scans = getScans();
    const now = Date.now();

    // Check for duplicates within the window
    const isDuplicate = scans.some(
      (scan) =>
        scan.value === value &&
        now - scan.timestamp < DUPLICATE_WINDOW_MS
    );

    if (isDuplicate) {
      return null; // Prevent duplicate
    }

    const newScan: QRScan = {
      id: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      value,
      timestamp: now,
      formattedDate: new Date(now).toLocaleString(),
    };

    scans.unshift(newScan); // Add to beginning for most recent first
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
    return newScan;
  } catch {
    console.error('Error saving scan to localStorage');
    return null;
  }
}

/**
 * Delete a scan by ID
 */
export function deleteScan(id: string): boolean {
  try {
    if (typeof window === 'undefined') return false;

    const scans = getScans();
    const filtered = scans.filter((scan) => scan.id !== id);

    if (filtered.length === scans.length) return false; // Not found

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    console.error('Error deleting scan from localStorage');
    return false;
  }
}

/**
 * Delete all scans
 */
export function deleteAllScans(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.error('Error clearing scans from localStorage');
  }
}

/**
 * Search scans by value
 */
export function searchScans(query: string): QRScan[] {
  const scans = getScans();
  const lowerQuery = query.toLowerCase();
  return scans.filter((scan) =>
    scan.value.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get scan statistics
 */
export function getScanStats() {
  const scans = getScans();
  return {
    total: scans.length,
    lastScan: scans.length > 0 ? scans[0].formattedDate : null,
    uniqueValues: new Set(scans.map((s) => s.value)).size,
  };
}
