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

  // ⏳ Wait until camera video is ready
  const waitForVideo = () =>
    new Promise<void>((resolve) => {
      const check = () => {
        const video = document.querySelector("video") as HTMLVideoElement;
        if (video && video.videoWidth > 0) resolve();
        else requestAnimationFrame(check);
      };
      check();
    });

  // 📸 Capture frame from live video
  const captureScanImage = async (): Promise<Blob | null> => {
    try {
      const video = document.querySelector("video") as HTMLVideoElement;

      if (!video || video.videoWidth === 0) {
        console.warn("Video not ready for capture");
        return null;
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      return await new Promise((resolve) =>
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85),
      );
    } catch (err) {
      console.warn("Capture failed:", err);
      return null;
    }
  };

  // ☁️ Upload image to Supabase
  const uploadScanImage = async (blob: Blob) => {
    const fileName = `scan-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from("qr-scans")
      .upload(fileName, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage.from("qr-scans").getPublicUrl(fileName);

    return data.publicUrl;
  };

  // 💾 Save scan to DB
  const saveToCloud = async (value: string, imageUrl?: string) => {
    try {
      const { error } = await supabase.from("scans").insert({
        value,
        image_url: imageUrl || null,
      });

      if (error) throw error;

      console.log("Saved to Supabase ✔");
    } catch (err) {
      console.warn("Supabase save failed:", err);
    }
  };

  useEffect(() => {
    if (!isMounted || !isActive) return;

    let isComponentMounted = true;

    const startScanner = async () => {
      if (!isScannerActive) return;

      try {
        clearError();

        // stop previous instance safely
        if (scannerRef.current && isScannerRunningRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {}
          scannerRef.current = null;
          isScannerRunningRef.current = false;
        }

        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras.length) throw new Error("No cameras found");

        const cameraId = cameras[cameras.length - 1].id;

        await scanner.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            addNewScan(decodedText);

            // ⏳ ensure video is ready before capture
            await waitForVideo();

            const imageBlob = await captureScanImage();

            console.log("Captured blob:", imageBlob);

            let imageUrl = null;

            if (imageBlob) {
              try {
                imageUrl = await uploadScanImage(imageBlob);
              } catch (err) {
                console.warn("Upload failed:", err);
              }
            } else {
              console.warn("No image captured");
            }

            await saveToCloud(decodedText, imageUrl);

            if ("vibrate" in navigator) navigator.vibrate(100);
          },
          (err) => {
            console.debug("Scan error:", err);
          },
        );

        isScannerRunningRef.current = true;

        if (isComponentMounted) setIsScanning(true);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Camera start failed";

        setError(message);
        setIsScanning(false);
      }
    };

    const stopScanner = async () => {
      if (scannerRef.current && isScannerRunningRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}

        scannerRef.current = null;
        isScannerRunningRef.current = false;
        setIsScanning(false);
      }
    };

    if (isScannerActive) startScanner();
    else stopScanner();

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
