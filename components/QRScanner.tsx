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

  // ⏳ wait until camera is ready
  const waitForVideo = () =>
    new Promise<void>((resolve) => {
      const check = () => {
        const video = document.querySelector("video") as HTMLVideoElement;
        if (video && video.videoWidth > 0) resolve();
        else requestAnimationFrame(check);
      };
      check();
    });

  // 📸 capture frame from video
  const captureImage = async (): Promise<Blob | null> => {
    const video = document.querySelector("video") as HTMLVideoElement;

    if (!video) {
      console.warn("❌ Video not found");
      return null;
    }

    if (video.videoWidth === 0 || video.readyState < 2) {
      console.warn("❌ Video not ready");
      return null;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          console.log("📸 Captured blob size:", blob?.size);
          resolve(blob);
        },
        "image/jpeg",
        0.9,
      );
    });
  };

  // ☁️ upload image to Supabase
  const uploadImage = async (blob: Blob) => {
    const fileName = `scan-${Date.now()}.jpg`;

    console.log("📦 Uploading blob size:", blob.size);

    const result = await supabase.storage
      .from("qr-scans")
      .upload(fileName, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    console.log("📤 Upload result:", result);

    if (result.error) {
      console.error("❌ Upload error:", result.error.message);
      return null;
    }

    const { data } = supabase.storage.from("qr-scans").getPublicUrl(fileName);

    console.log("🌍 Public URL:", data.publicUrl);

    return data.publicUrl;
  };

  // 💾 save to DB
  const saveToDB = async (value: string, imageUrl?: string | null) => {
    const { error } = await supabase.from("scans").insert({
      value,
      image_url: imageUrl ?? null,
    });

    if (error) {
      console.error("❌ DB error:", error.message);
      throw error;
    }
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
          { fps: 20, qrbox: { width: 180, height: 180 } },
          async (decodedText) => {
            try {
              addNewScan(decodedText);

              console.log("📱 QR detected:", decodedText);

              // wait camera stability
              await waitForVideo();
              await new Promise((r) => setTimeout(r, 800));

              const blob = await captureImage();

              let imageUrl: string | null = null;

              if (blob && blob.size > 0) {
                imageUrl = await uploadImage(blob);
              } else {
                console.warn("⚠️ No image captured");
              }

              await saveToDB(decodedText, imageUrl);

              console.log("✅ Saved scan:", { decodedText, imageUrl });

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
