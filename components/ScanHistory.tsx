'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQRStore } from '@/lib/qr-store';
import { Copy, Search } from 'lucide-react';

interface ScanHistoryProps {
  isActive: boolean;
}

export function ScanHistory({ isActive }: ScanHistoryProps) {
  const { scans, filteredScans, searchQuery, setSearchQuery } = useQRStore();
  const [isMounted, setIsMounted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCopy = async (value: string, id: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isMounted || !isActive) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Scan History</h2>
            {scans.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-3 py-1 text-sm font-medium">
                {scans.length} scans
              </span>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by QR value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Results Count */}
        {searchQuery && (
          <p className="text-sm text-muted-foreground">
            Found {filteredScans.length} of {scans.length} scans
          </p>
        )}

        {/* Scans List */}
        {filteredScans.length > 0 ? (
          <div className="space-y-3">
            {filteredScans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-start justify-between gap-3 bg-secondary border border-border rounded-lg p-4 hover:bg-secondary/80 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-2">{scan.formattedDate}</p>
                  <p className="font-mono text-sm break-all bg-card p-2 rounded border border-border text-foreground">
                    {scan.value}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(scan.value, scan.id)}
                    title="Copy to clipboard"
                    className="h-9 w-9 p-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'No scans found matching your search' : 'No scans yet'}
            </p>
            {scans.length > 0 && searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </Button>
            )}
          </div>
        )}



        {/* Copy Confirmation */}
        {copiedId && (
          <div className="fixed bottom-4 right-4 bg-accent text-accent-foreground rounded-lg px-4 py-2 text-sm shadow-lg">
            ✓ Copied to clipboard
          </div>
        )}
      </div>
    </div>
  );
}
