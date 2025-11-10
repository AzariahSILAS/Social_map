"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { photosAPI, Photo } from "@/utils/supabase/client"; // ensure this path matches your file
const cameraIcon = "/blueicon.png";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
if (!TOKEN) {
  console.warn("⚠️ Missing NEXT_PUBLIC_MAPBOX_TOKEN. Check your .env.local and restart dev server.");
}
mapboxgl.accessToken = TOKEN;

export interface MapRef {
  flyToLocation: (lng: number, lat: number) => void;
  requestUserLocation: () => void;
  reloadPhotos: () => void;
}

interface MapProps {
  onPhotoClick?: (photoUrl: string) => void;
}

export const Map = forwardRef<MapRef, MapProps>(({ onPhotoClick }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  // Optional: a movable marker to show the "current selection"/search result
  const focusMarker = useRef<mapboxgl.Marker | null>(null);

  const photoMarkers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [photos, setPhotos] = useState<Photo[]>([]);

  // Load photos
  const loadPhotos = async () => {
    try {
      const data = await photosAPI.getAll();
      setPhotos(data);
    } catch (error) {
      console.error("Failed to load photos:", error);
    }
  };

  useEffect(() => {
    void loadPhotos();
  }, []);

  // Init map (no add-on-click handlers)
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const defaultCenter: [number, number] = [-74.5, 40]; // fallback (NY)

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: defaultCenter,
      zoom: 9,
    });

    const m = map.current;
    m.addControl(new mapboxgl.NavigationControl(), "top-right");

    // A red focus marker you can move via ref methods (not user-added)
    focusMarker.current = new mapboxgl.Marker({ color: "#ef4444" })
      .setLngLat(defaultCenter)
      .addTo(m);

    // Try user geolocation (no marker creation)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          m.flyTo({ center: loc, zoom: 13, essential: true });
          focusMarker.current?.setLngLat(loc);
        },
        (err) => {
          console.log("Unable to get user location, using default:", err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Render photo markers only
  useEffect(() => {
    if (!map.current) return;

    // clear existing
    Object.values(photoMarkers.current).forEach((mk) => mk.remove());
    photoMarkers.current = {};

    photos.forEach((photo) => {
      if (!map.current) return;

      const el = document.createElement("div");
      el.className = "camera-marker";
      el.style.backgroundImage = `url(${cameraIcon})`;
      el.style.width = "40px";
      el.style.height = "40px";
      el.style.backgroundSize = "contain";
      el.style.backgroundRepeat = "no-repeat";
      el.style.cursor = "pointer";
      el.style.borderRadius = "50%";
      el.style.padding = "8px";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";

      // Prevent map click/move handlers from ever firing from this element
      el.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onPhotoClick?.(photo.signedUrl);
      });

      el.addEventListener("contextmenu", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const confirmDelete = confirm("Delete this photo?");
        if (!confirmDelete) return;
        try {
          await photosAPI.delete(photo.id);
          setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
        } catch (error) {
          console.error("Failed to delete photo:", error);
          alert("Failed to delete photo. Please try again.");
        }
      });

      const mk = new mapboxgl.Marker({ element: el })
        .setLngLat([photo.longitude, photo.latitude])
        .addTo(map.current);

      photoMarkers.current[photo.id] = mk;
    });
  }, [photos, onPhotoClick]);

  useImperativeHandle(ref, () => ({
    flyToLocation: (lng: number, lat: number) => {
      if (!map.current) return;
      map.current.flyTo({ center: [lng, lat], zoom: 14, essential: true });
      focusMarker.current?.setLngLat([lng, lat]);
    },
    requestUserLocation: () => {
      if (!map.current || !("geolocation" in navigator)) {
        alert("Geolocation not supported in this browser.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          map.current!.flyTo({ center: loc, zoom: 13, essential: true });
          focusMarker.current?.setLngLat(loc);
        },
        (err) => alert(`Unable to get your location: ${err.message}`),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    },
    reloadPhotos: () => {
      void loadPhotos();
    },
  }));

  return <div ref={mapContainer} className="w-full h-full" />;
});
