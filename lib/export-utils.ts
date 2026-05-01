// Utility functions for exporting scans data

import { QRScan } from './qr-utils';

/**
 * Convert scans to JSON and trigger download
 */
export function exportAsJSON(scans: QRScan[]): void {
  try {
    const dataStr = JSON.stringify(scans, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    downloadFile(dataBlob, `qr-scans-${Date.now()}.json`);
  } catch (error) {
    console.error('Error exporting JSON:', error);
  }
}

/**
 * Convert scans to CSV and trigger download
 */
export function exportAsCSV(scans: QRScan[]): void {
  try {
    const headers = ['ID', 'Value', 'Timestamp', 'Date'];
    const rows = scans.map((scan) => [
      scan.id,
      `"${scan.value.replace(/"/g, '""')}"`, // Escape quotes for CSV
      scan.timestamp,
      scan.formattedDate,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(dataBlob, `qr-scans-${Date.now()}.csv`);
  } catch (error) {
    console.error('Error exporting CSV:', error);
  }
}

/**
 * Helper function to trigger file download
 */
function downloadFile(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Copy scans data to clipboard as JSON
 */
export async function copyToClipboard(scans: QRScan[]): Promise<boolean> {
  try {
    const dataStr = JSON.stringify(scans, null, 2);
    await navigator.clipboard.writeText(dataStr);
    return true;
  } catch {
    console.error('Error copying to clipboard');
    return false;
  }
}

/**
 * Format scans for display in a table format
 */
export function formatScansForDisplay(scans: QRScan[]): string {
  return scans
    .map(
      (scan, index) =>
        `${index + 1}. [${scan.formattedDate}] ${scan.value}`
    )
    .join('\n');
}
