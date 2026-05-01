"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { useQRStore } from "@/lib/qr-store";

interface QRScannerProps {
  isActive: boolean;
}

export function QRScanner({ isActive }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunningRef = useRef(false);
  const lastScanRef = useRef<string | null>(null);

  const [isMounted, setIsMounted] = useState(false);

  const {
    addNewScan,
    setError,
    clearError,
    error,
    isScanning,
    setIsScanning,
    isScannerActive,
    setIsScannerActive,
    lastScannedValue,
  } = useQRStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !isActive) return;

    let isComponentMounted = true;

    const startScanning = async () => {
      if (!isScannerActive) return;

      try {
        clearError();

        // Stop existing scanner if running
        if (scannerRef.current && isScannerRunningRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {
            // ignore
          }
          scannerRef.current = null;
          isScannerRunningRef.current = false;
        }

        scannerRef.current = new Html5Qrcode("qr-reader");

        const cameras = await Html5Qrcode.getCameras();

        if (cameras.length === 0) {
          throw new Error("No cameras found on this device");
        }

        // Prefer rear camera if available
        const cameraId = cameras[cameras.length - 1].id;

        await scannerRef.current.start(
          cameraId,
          {
            fps: 20, // 🔥 increased sensitivity
            qrbox: { width: 200, height: 200 }, // 🎯 tighter scan area
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText) => {
            // 🚫 prevent duplicate scans
            if (decodedText === lastScanRef.current) return;

            lastScanRef.current = decodedText;

            addNewScan(decodedText);

            if ("vibrate" in navigator) {
              navigator.vibrate(100);
            }
          },
          (error) => {
            console.debug("[scan error]", error);
          },
        );

        isScannerRunningRef.current = true;

        if (isComponentMounted) {
          setIsScanning(true);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to start camera";

        console.error("[camera error]", message);

        isScannerRunningRef.current = false;

        if (isComponentMounted) {
          setError(message);
          setIsScanning(false);
        }
      }
    };

    const stopScanning = async () => {
      if (scannerRef.current && isScannerRunningRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore
        }

        scannerRef.current = null;
        isScannerRunningRef.current = false;

        if (isComponentMounted) {
          setIsScanning(false);
        }
      }
    };

    if (isScannerActive) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      isComponentMounted = false;

      if (scannerRef.current && isScannerRunningRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
            isScannerRunningRef.current = false;
          });
      }
    };
  }, [isMounted, isActive, isScannerActive]);

  if (!isMounted || !isActive) return null;

  const handleStartScanner = () => {
    clearError();
    lastScanRef.current = null; // reset duplicate tracking
    setIsScannerActive(true);
  };

  const handleStopScanner = () => {
    setIsScannerActive(false);
    setIsScanning(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={handleStartScanner}
            disabled={isScannerActive}
            size="lg"
          >
            Start Scanner
          </Button>

          <Button
            onClick={handleStopScanner}
            disabled={!isScannerActive}
            variant="outline"
            size="lg"
          >
            Stop Scanner
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Camera */}
        {isScannerActive && (
          <div className="rounded-lg overflow-hidden border-2">
            <div id="qr-reader" style={{ width: "100%", minHeight: "400px" }} />
          </div>
        )}

        {!isScannerActive && !error && (
          <div className="rounded-lg bg-secondary border p-8 text-center">
            <p>Click "Start Scanner" to begin scanning QR codes</p>
          </div>
        )}

        {/* Status */}
        {isScannerActive && (
          <div className="space-y-4">
            {isScanning && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Camera active - Point at QR code</span>
              </div>
            )}

            {lastScannedValue && (
              <div className="bg-secondary border rounded-lg p-4">
                <p className="text-xs mb-2">Last scanned:</p>
                <p className="font-mono text-sm break-all">
                  {lastScannedValue}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
