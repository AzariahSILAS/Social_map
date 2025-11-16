"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { photosAPI, type Photo } from "@/utils/supabase/client";

type DistancePhoto = Photo & {
  distanceKm?: number | null;
};

interface LatLng {
  lat: number;
  lng: number;
}

// Haversine distance in kilometers
function distanceInKm(a: LatLng, b: LatLng): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const aVal =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

export default function FeedPage() {
  const [photos, setPhotos] = useState<DistancePhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);
  const [locError, setLocError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const THRESHOLD = 50; // px needed to count as a swipe

  // Focus container so keyboard events work
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  // Navigate between posts
  const goNext = useCallback(() => {
    setCurrentIndex((prev) =>
      prev < photos.length - 1 ? prev + 1 : prev
    );
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  // Get user location, then load + sort photos by distance
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setLocError(null);

      let loc: LatLng | null = null;

      if ("geolocation" in navigator) {
        try {
          loc = await new Promise<LatLng>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) =>
                resolve({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                }),
              (err) => reject(err),
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              }
            );
          });
          if (!cancelled) {
            setUserLocation(loc);
          }
        } catch (err: any) {
          console.warn("Feed geolocation error:", err);
          if (!cancelled) {
            setLocError(
              "Could not get your location. Showing unsorted posts."
            );
            setUserLocation(null);
          }
        }
      } else {
        setLocError(
          "Geolocation not supported in this browser. Showing unsorted posts."
        );
      }

      try {
        const data = await photosAPI.getAll();

        if (cancelled) return;

        let withDistances: DistancePhoto[] = data;

        if (loc) {
          withDistances = data.map((p) => {
            const distKm = distanceInKm(
              { lat: loc!.lat, lng: loc!.lng },
              { lat: p.latitude, lng: p.longitude }
            );
            return { ...p, distanceKm: distKm };
          });

          withDistances.sort((a, b) => {
            const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
            const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
            return da - db;
          });
        } else {
          // fallback: newest first if no location
          withDistances = [...data].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
        }

        setPhotos(withDistances);
        setCurrentIndex(0);
      } catch (err: any) {
        console.error("Feed load error:", err);
        if (!cancelled) {
          setError(err?.message ?? "Failed to load feed.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  // Touch handlers for swipe up/down
// Touch handlers for swipe up/down (no pull-to-refresh)
const onTouchStart = (e: React.TouchEvent) => {
  e.preventDefault();
  touchEndY.current = null;
  touchStartY.current = e.targetTouches[0].clientY;
};

const onTouchMove = (e: React.TouchEvent) => {
  e.preventDefault();
  touchEndY.current = e.targetTouches[0].clientY;
};

const onTouchEnd = (e: React.TouchEvent) => {
  e.preventDefault();
  if (!touchStartY.current || !touchEndY.current) return;

  const deltaY = touchEndY.current - touchStartY.current;
  if (Math.abs(deltaY) < THRESHOLD) return;

  if (deltaY < 0) goNext();
  else goPrev();
};


  // Optional: support arrow keys / PgUp / PgDn
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      goPrev();
    } else if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      goNext();
    }
  };

  const currentPhoto =
    photos.length > 0 ? photos[currentIndex] : null;

  // Convert km to miles for display, since you're in the US
  const displayDistance = (p: DistancePhoto | null) => {
    if (!p?.distanceKm && p?.distanceKm !== 0) return null;
    const miles = p.distanceKm * 0.621371;
    if (miles < 0.1) return "< 0.1 mi away";
    if (miles < 10) return `${miles.toFixed(1)} mi away`;
    return `${Math.round(miles)} mi away`;
  };

  return (
    <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="
    h-[calc(100vh-56px-56px)]
    w-full
    bg-black
    text-white
    outline-none
    overscroll-contain
    overflow-hidden
  "
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        >

      {/* Loading / errors */}
      {loading && (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-slate-300">
            Loading posts near you…
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="flex h-full items-center justify-center px-4 text-center">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}

      {!loading && !error && photos.length === 0 && (
        <div className="flex h-full items-center justify-center px-4 text-center">
          <p className="text-sm text-slate-300">
            No posts yet. Open the camera tab and add the first one!
          </p>
        </div>
      )}

      {/* Distance warning (if any) */}
      {!loading && locError && (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-1 text-xs text-slate-300 border border-slate-700/60">
          {locError}
        </div>
      )}

      {/* Main full-screen post */}
      {currentPhoto && (
  <div className="relative h-full w-full overflow-hidden bg-black">
    {/* Centered image, scaled to fit */}
    <div className="flex h-full w-full items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentPhoto.signedUrl}
        alt="Post"
        className="max-h-full max-w-full object-contain"
      />
    </div>

    {/* Gradient overlays (optional, keep if you like the text fade) */}
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent" />
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent" />

    {/* Top info */}
    <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 pt-6 text-xs text-slate-200">
      <span className="rounded-full bg-black/50 px-3 py-1">
        {currentIndex + 1} / {photos.length}
      </span>
      {currentPhoto.distanceKm !== undefined && userLocation && (
        <span className="rounded-full bg-black/50 px-3 py-1">
          {displayDistance(currentPhoto)}
        </span>
      )}
    </div>

    {/* Bottom info */}
    <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-8">
      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Post #{currentIndex + 1}</span>
        <span className="text-xs text-slate-300">
          Swipe up/down to see more posts nearby.
        </span>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
