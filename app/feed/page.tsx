// app/feed/page.tsx
"use client";

import { useEffect, useState } from "react";
import { photosAPI, type Photo } from "@/utils/supabase/client";
import { PhotoViewer } from "@/components/PhotoViewer";

export default function FeedPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await photosAPI.getAll();
        // optional: newest first
        setPhotos(
          [...data].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
        );
      } catch (err: any) {
        console.error("Feed load error:", err);
        setError(err?.message ?? "Failed to load feed");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="min-h-[calc(100vh-56px-56px)] bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <h1 className="text-lg font-semibold mb-3">Feed</h1>

        {loading && <p className="text-sm text-slate-400">Loading photos…</p>}
        {error && (
          <p className="text-sm text-red-400 mb-2">
            {error}
          </p>
        )}

        {!loading && !error && photos.length === 0 && (
          <p className="text-sm text-slate-400">
            No photos yet. Be the first to post from the camera tab!
          </p>
        )}

        {/* Grid of photos */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 mt-2">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhotoUrl(photo.signedUrl)}
              className="relative w-full pb-[100%] overflow-hidden rounded-lg bg-slate-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.signedUrl}
                alt="Photo"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Reuse your existing viewer */}
      <PhotoViewer
        photoUrl={selectedPhotoUrl}
        onClose={() => setSelectedPhotoUrl(null)}
      />
    </div>
  );
}
