"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface PhotoViewerProps {
  photoUrl: string | null;
  onClose: () => void;
}

export function PhotoViewer({ photoUrl, onClose }: PhotoViewerProps) {
  if (!photoUrl) return null;

  // Allow Esc key to close the viewer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 bg-black/50 rounded-full p-2 text-white hover:bg-black/70 transition-colors z-10"
        aria-label="Close photo viewer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Photo */}
      <img
        src={photoUrl}
        alt="Captured photo"
        className="max-w-full max-h-full object-contain select-none rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
