'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useQRStore } from '@/lib/qr-store';
import { exportAsJSON, exportAsCSV, copyToClipboard, formatScansForDisplay } from '@/lib/export-utils';
import { Download, Copy, FileJson, FileText } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface ExportScansProps {
  isActive: boolean;
}

export function ExportScans({ isActive }: ExportScansProps) {
  const { scans } = useQRStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'success' | 'error' | null>(null);

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      exportAsJSON(scans);
      setExportStatus('success');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('error');
      setTimeout(() => setExportStatus(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      exportAsCSV(scans);
      setExportStatus('success');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('error');
      setTimeout(() => setExportStatus(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyAll = async () => {
    setIsExporting(true);
    try {
      const success = await copyToClipboard(scans);
      setExportStatus(success ? 'success' : 'error');
      setTimeout(() => setExportStatus(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">Export Scans</h2>
          <p className="text-muted-foreground">
            {scans.length === 0
              ? 'No scans to export yet. Start scanning QR codes to export data.'
              : `Export your ${scans.length} scanned QR code${scans.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {scans.length > 0 ? (
          <>
            {/* Export Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* JSON Export */}
              <div className="border-2 border-border rounded-lg p-6 bg-secondary hover:bg-secondary/80 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <FileJson className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold text-foreground">JSON Format</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Export as structured JSON data for processing or analysis.
                </p>
                <Button
                  onClick={handleExportJSON}
                  disabled={isExporting}
                  className="w-full"
                  variant="default"
                >
                  {isExporting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download JSON
                    </>
                  )}
                </Button>
              </div>

              {/* CSV Export */}
              <div className="border-2 border-border rounded-lg p-6 bg-secondary hover:bg-secondary/80 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold text-foreground">CSV Format</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Export as CSV for spreadsheets and data analysis tools.
                </p>
                <Button
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="w-full"
                  variant="default"
                >
                  {isExporting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Copy to Clipboard */}
            <div className="border border-border rounded-lg p-6 bg-secondary">
              <h3 className="font-semibold mb-4 text-foreground">Copy to Clipboard</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Copy all scan data as JSON to your clipboard for quick sharing.
              </p>
              <Button
                onClick={handleCopyAll}
                disabled={isExporting}
                variant="outline"
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Copying...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>

            {/* Format Preview */}
            <div className="border border-border rounded-lg p-6 bg-secondary">
              <h3 className="font-semibold mb-4 text-foreground">Preview</h3>
              <div className="bg-foreground/5 text-foreground rounded p-4 text-xs font-mono max-h-48 overflow-auto border border-border">
                <pre>{formatScansForDisplay(scans.slice(0, 5))}</pre>
                {scans.length > 5 && (
                  <p className="text-muted-foreground mt-2">... and {scans.length - 5} more</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center border border-border">
                <Download className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
            <p className="text-muted-foreground mb-4">
              Start scanning QR codes in the Scanner tab to enable exports.
            </p>
          </div>
        )}

        {/* Status Messages */}
        {exportStatus === 'success' && (
          <div className="fixed bottom-4 right-4 bg-accent text-accent-foreground rounded-lg px-4 py-2 text-sm animate-fade-in shadow-lg">
            ✓ {isExporting ? 'Processing...' : 'Export successful!'}
          </div>
        )}

        {exportStatus === 'error' && (
          <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground rounded-lg px-4 py-2 text-sm animate-fade-in shadow-lg">
            ✗ Export failed. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}
