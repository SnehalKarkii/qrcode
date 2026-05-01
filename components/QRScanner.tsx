"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { useQRStore } from "@/lib/qr-store";
import { supabase } from "@/lib/supabase";

interface QRScannerProps {
  isActive: boolean;
}

export function QRScanner({ isActive }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunningRef = useRef(false);
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

  // 📸 Capture current camera frame
  const captureScanImage = async (): Promise<Blob | null> => {
    try {
      const video = document.querySelector(
        "#qr-reader video",
      ) as HTMLVideoElement;

      if (!video) return null;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      return await new Promise((resolve) =>
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8),
      );
    } catch (err) {
      console.warn("Capture failed:", err);
      return null;
    }
  };

  // ☁️ Upload image to Supabase Storage
  const uploadScanImage = async (blob: Blob) => {
    const fileName = `scan-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from("qr-scans")
      .upload(fileName, blob, {
        contentType: "image/jpeg",
      });

    if (error) throw error;

    const { data } = supabase.storage.from("qr-scans").getPublicUrl(fileName);

    return data.publicUrl;
  };

  // 💾 Save scan to DB
  const saveToCloud = async (value: string, imageUrl?: string) => {
    console.log("Saving to cloud:", value, imageUrl);
    try {
      const { error } = await supabase.from("scans").insert({
        value,
        image_url: imageUrl || null,
      });

      if (error) throw error;
    } catch (err) {
      console.warn("Supabase save failed:", err);
    }
  };

  useEffect(() => {
    if (!isMounted || !isActive) return;

    let isComponentMounted = true;

    const startScanning = async () => {
      if (!isScannerActive) return;

      try {
        clearError();

        if (scannerRef.current && isScannerRunningRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {}
          scannerRef.current = null;
          isScannerRunningRef.current = false;
        }

        scannerRef.current = new Html5Qrcode("qr-reader");

        const cameras = await Html5Qrcode.getCameras();

        if (!cameras.length) {
          throw new Error("No cameras found");
        }

        await scannerRef.current.start(
          cameras[cameras.length - 1].id,
          {
            fps: 20,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            addNewScan(decodedText);

            // 📸 capture frame
            const imageBlob = await captureScanImage();

            let imageUrl = null;

            if (imageBlob) {
              try {
                imageUrl = await uploadScanImage(imageBlob);
              } catch (err) {
                console.warn("Image upload failed:", err);
              }
            }

            // 💾 save both text + image
            await saveToCloud(decodedText, imageUrl || undefined);

            if ("vibrate" in navigator) {
              navigator.vibrate(100);
            }
          },
          (error) => {
            console.debug("Scan error:", error);
          },
        );

        isScannerRunningRef.current = true;

        if (isComponentMounted) {
          setIsScanning(true);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Camera start failed";

        setError(message);
        setIsScanning(false);
      }
    };

    const stopScanning = async () => {
      if (scannerRef.current && isScannerRunningRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}

        scannerRef.current = null;
        isScannerRunningRef.current = false;
        setIsScanning(false);
      }
    };

    if (isScannerActive) startScanning();
    else stopScanning();

    return () => {
      isComponentMounted = false;

      if (scannerRef.current && isScannerRunningRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
        isScannerRunningRef.current = false;
      }
    };
  }, [isMounted, isActive, isScannerActive]);

  if (!isMounted || !isActive) return null;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => {
              clearError();
              setIsScannerActive(true);
            }}
            disabled={isScannerActive}
          >
            Start Scanner
          </Button>

          <Button
            onClick={() => setIsScannerActive(false)}
            disabled={!isScannerActive}
            variant="outline"
          >
            Stop Scanner
          </Button>
        </div>

        {error && <p className="text-red-500">{error}</p>}

        {isScannerActive && (
          <div className="border rounded-lg overflow-hidden">
            <div id="qr-reader" style={{ width: "100%", minHeight: 400 }} />
          </div>
        )}

        {isScanning && <p className="text-center text-sm">Scanning...</p>}

        {lastScannedValue && (
          <div className="p-3 bg-gray-100 rounded">{lastScannedValue}</div>
        )}
      </div>
    </div>
  );
}
