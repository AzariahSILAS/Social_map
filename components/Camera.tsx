"use client";

import { useEffect, useRef, useState } from "react";
import { X, RefreshCcw } from "lucide-react";
import { photosAPI, getCurrentUser } from "@/utils/supabase/client";

interface CameraProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoSaved?: () => void;
}

export function Camera({ isOpen, onClose, onPhotoSaved }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragDistance, setDragDistance] = useState(0);
  const [isCaptured, setIsCaptured] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [useFront, setUseFront] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // ---------- lifecycle (open/close) ----------
  useEffect(() => {
    if (isOpen) {
      startCamera();
      getCurrentLocation();

      // load user id when camera opens
      (async () => {
        try {
          const user = await getCurrentUser();
          setCurrentUserId(user?.id ?? null);
        } catch (err) {
          console.error("Error getting current user for camera:", err);
        }
      })();
    } else {
      stopCamera();
      setCurrentUserId(null);
    }

    return () => {
      stopCamera();
      setCurrentUserId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ---------- geolocation ----------
  const getCurrentLocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (error) => console.warn("Location error:", error)
    );
  };

  // ---------- camera control ----------
  const startCamera = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const facingMode = useFront ? "user" : "environment";
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      let stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Some devices ignore facingMode; try exact as a fallback
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      const gotFront = settings.facingMode === "user";
      const gotBack = settings.facingMode === "environment";
      if ((useFront && !gotFront) || (!useFront && !gotBack)) {
        try {
          track.stop();
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { exact: facingMode as "user" | "environment" } },
          });
        } catch {
          // keep original stream if exact fails
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setIsCaptured(false);
    } catch (err) {
      console.error("getUserMedia error:", err);
      alert("Unable to access camera. Check permissions and try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const stopCamera = () => {
    if (!streamRef.current) return;
    try {
      streamRef.current.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    streamRef.current = null;
    setIsCaptured(false);
  };

  // ---------- capture / save ----------
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const { videoWidth, videoHeight } = video;
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    setIsCaptured(true);
  };

  const handleRetake = () => setIsCaptured(false);

  const handleSavePhoto = async () => {
    const canvas = canvasRef.current;

    if (!currentUserId) {
      alert("You must be logged in to save photos.");
      return;
    }

    if (!canvas || !currentLocation) {
      alert("Location not available. Please enable location and try again.");
      return;
    }

    setIsUploading(true);
    try {
      const base64Data = canvas.toDataURL("image/jpeg", 0.85);
      await photosAPI.upload(
        base64Data,
        `photo-${Date.now()}.jpg`,
        currentLocation.lat,
        currentLocation.lng,
        currentUserId
      );

      onPhotoSaved?.();
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // ---------- drag-to-close ----------
  const handleTouchStart = (e: React.TouchEvent) =>
    setDragStart(e.touches[0].clientY);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStart === null) return;
    const d = e.touches[0].clientY - dragStart;
    if (d > 0) setDragDistance(d);
  };

  const endDrag = () => {
    if (dragDistance > 100) onClose();
    setDragStart(null);
    setDragDistance(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => setDragStart(e.clientY);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart === null) return;
    const d = e.clientY - dragStart;
    if (d > 0) setDragDistance(d);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-black"
      style={{
        transform: `translateY(${dragDistance}px)`,
        transition: dragStart === null ? "transform 0.25s ease-out" : "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={endDrag}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-3">
        <div className="mx-auto h-1 w-10 rounded-full bg-white/40" />
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Preview */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`h-full w-full object-cover ${isCaptured ? "hidden" : ""}`}
        />
        <canvas
          ref={canvasRef}
          className={`h-full w-full object-cover ${isCaptured ? "" : "hidden"}`}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 bg-black/60 p-5">
        {!isCaptured ? (
          <>
            <button
              onClick={() => {
                setUseFront((v) => !v);
                // restart camera with new facing mode
                stopCamera();
                void startCamera();
              }}
              disabled={isStarting}
              className="rounded-lg bg-white/15 px-4 py-2 text-white backdrop-blur transition-colors hover:bg-white/25 disabled:opacity-50"
              aria-label="Flip camera"
              title="Flip camera"
            >
              <RefreshCcw className="h-5 w-5" />
            </button>

            <button
              onClick={handleCapture}
              disabled={isStarting}
              className="h-16 w-16 rounded-full border-4 border-gray-300 bg-white transition-colors hover:bg-gray-100 disabled:opacity-50"
              aria-label="Capture"
            />
          </>
        ) : (
          <>
            <button
              onClick={handleRetake}
              className="rounded-lg bg-white/20 px-5 py-3 text-white transition-colors hover:bg-white/30"
            >
              Retake
            </button>
            <button
              onClick={handleSavePhoto}
              disabled={isUploading}
              className="rounded-lg bg-blue-500 px-5 py-3 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? "Saving..." : "Use Photo"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
