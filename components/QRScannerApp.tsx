'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRScanner } from './QRScanner';
import { ScanHistory } from './ScanHistory';
import { ExportScans } from './ExportScans';
import { useQRStore } from '@/lib/qr-store';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function QRScannerApp() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [isMounted, setIsMounted] = useState(false);
  const { loadScans, error, clearError, lastScanSuccess, clearLastScanSuccess } = useQRStore();

  useEffect(() => {
    setIsMounted(true);
    loadScans();
  }, [loadScans]);

  // Auto-switch to history after successful scan
  useEffect(() => {
    if (lastScanSuccess && activeTab === 'scanner') {
      setActiveTab('history');
      clearLastScanSuccess();
    }
  }, [lastScanSuccess, activeTab, clearLastScanSuccess]);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary mb-4">
            <svg
              className="w-6 h-6 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">QR Code Scanner</h1>
          <p className="text-muted-foreground text-base">Scan, track, and export QR codes with ease</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="ml-4 text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="bg-card rounded-lg shadow-lg overflow-hidden border border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-card border-border p-0">
              <TabsTrigger
                value="scanner"
                className="rounded-none border-b-2 border-transparent px-4 md:px-6 py-4 font-medium transition-colors data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="hidden sm:inline">Scanner</span>
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="history"
                className="rounded-none border-b-2 border-transparent px-4 md:px-6 py-4 font-medium transition-colors data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="hidden sm:inline">History</span>
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="export"
                className="rounded-none border-b-2 border-transparent px-4 md:px-6 py-4 font-medium transition-colors data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span className="hidden sm:inline">Export</span>
                </span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="py-8">
              <TabsContent value="scanner" className="m-0">
                <QRScanner isActive={activeTab === 'scanner'} />
              </TabsContent>

              <TabsContent value="history" className="m-0">
                <ScanHistory isActive={activeTab === 'history'} />
              </TabsContent>

              <TabsContent value="export" className="m-0">
                <ExportScans isActive={activeTab === 'export'} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Data is stored locally in your browser. Nothing is sent to any server.</p>
        </div>
      </div>
    </div>
  );
}
