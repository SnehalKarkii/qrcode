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
  const isRunningRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  const {
    addNewScan,
    setError,
    clearError,
    isScanning,
    setIsScanning,
    isScannerActive,
    setIsScannerActive,
    lastScannedValue,
    error,
  } = useQRStore();

  useEffect(() => setMounted(true), []);

  // ⏳ Wait for camera video readiness
  const waitForVideo = () =>
    new Promise<void>((resolve) => {
      const check = () => {
        const video = document.querySelector("video") as HTMLVideoElement;
        if (video && video.videoWidth > 0) resolve();
        else requestAnimationFrame(check);
      };
      check();
    });

  // 📸 Capture frame
  const captureImage = async (): Promise<Blob | null> => {
    const video = document.querySelector("video") as HTMLVideoElement;

    if (!video || video.videoWidth === 0) {
      console.warn("Video not ready");
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  };

  // ☁️ Upload image to Supabase Storage
  const uploadImage = async (blob: Blob) => {
    const fileName = `scan-${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from("qr-scans")
      .upload(fileName, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from("qr-scans")
      .getPublicUrl(fileName);

    return publicUrl.publicUrl;
  };

  // 💾 Save to DB
  const saveToDB = async (value: string, imageUrl?: string) => {
    const { error } = await supabase.from("scans").insert({
      value,
      image_url: imageUrl || null,
    });

    if (error) throw error;
  };

  useEffect(() => {
    if (!mounted || !isActive) return;

    let alive = true;

    const startScanner = async () => {
      if (!isScannerActive) return;

      try {
        clearError();

        if (scannerRef.current && isRunningRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {}
          scannerRef.current = null;
          isRunningRef.current = false;
        }

        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras.length) throw new Error("No camera found");

        const cameraId = cameras[cameras.length - 1].id;

        await scanner.start(
          cameraId,
          { fps: 10, qrbox: 250 },
          async (decodedText) => {
            try {
              addNewScan(decodedText);

              // 🔥 ensure camera is ready
              await waitForVideo();
              await new Promise((r) => setTimeout(r, 300));

              const blob = await captureImage();

              let imageUrl = null;

              if (blob) {
                imageUrl = await uploadImage(blob);
              }

              await saveToDB(decodedText, imageUrl ?? undefined);

              console.log("Saved:", { decodedText, imageUrl });

              if ("vibrate" in navigator) navigator.vibrate(100);
            } catch (err) {
              console.warn("Processing error:", err);
            }
          },
          (err) => console.debug("Scan error:", err),
        );

        isRunningRef.current = true;

        if (alive) setIsScanning(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Scanner error");
        setIsScanning(false);
      }
    };

    const stopScanner = async () => {
      if (scannerRef.current && isRunningRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}

        scannerRef.current = null;
        isRunningRef.current = false;
        setIsScanning(false);
      }
    };

    if (isScannerActive) startScanner();
    else stopScanner();

    return () => {
      alive = false;

      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
        isRunningRef.current = false;
      }
    };
  }, [mounted, isActive, isScannerActive]);

  if (!mounted || !isActive) return null;

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
            Start
          </Button>

          <Button
            onClick={() => setIsScannerActive(false)}
            disabled={!isScannerActive}
            variant="outline"
          >
            Stop
          </Button>
        </div>

        {error && <p className="text-red-500">{error}</p>}

        {isScannerActive && (
          <div className="border rounded-lg overflow-hidden">
            <div id="qr-reader" style={{ width: "100%", minHeight: 400 }} />
          </div>
        )}

        {isScanning && <p className="text-center">Scanning...</p>}

        {lastScannedValue && (
          <div className="p-3 bg-gray-100 rounded">{lastScannedValue}</div>
        )}
      </div>
    </div>
  );
}
