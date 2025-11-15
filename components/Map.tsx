"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { photosAPI, type Photo } from "@/utils/supabase/client";

const photoIcon = "/gallery.png";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
if (!TOKEN) {
  console.warn("⚠️ Missing NEXT_PUBLIC_MAPBOX_TOKEN. Add it to .env.local and restart the dev server.");
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

  // Red “focus” marker moved via the exposed ref methods
  const focusMarker = useRef<mapboxgl.Marker | null>(null);

  // Photo markers keyed by photo id
  const photoMarkers = useRef<Record<string, mapboxgl.Marker>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);

  // ---- data ----
  const loadPhotos = async () => {
    try {
      const data = await photosAPI.getAll();
      setPhotos(data);
    } catch (err) {
      console.error("Failed to load photos:", err);
    }
  };

  useEffect(() => {
    void loadPhotos();
  }, []);

  // ---- map init ----
 useEffect(() => {
  if (map.current || !mapContainer.current) return;

  const defaultCenter: [number, number] = [-74.5, 40]; // fallback if geo fails

  // helper to actually create the map once we know the center
  const initMap = (center: [number, number]) => {
    if (!mapContainer.current) return;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 13, // a bit more zoomed in since it's "your location"
    });

    map.current = m;

    // Compass only (no zoom buttons)
    m.addControl(
      new mapboxgl.NavigationControl({ showZoom: false, showCompass: true }),
      "top-right"
    );

    // “Go to my current location” button
    m.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserLocation: true,
      }),
      "top-right"
    );

    // Focus marker at initial center
    focusMarker.current = new mapboxgl.Marker({ color: "#ef4444" })
      .setLngLat(center)
      .addTo(m);
  };

  // Try to get user location BEFORE creating the map
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [
          pos.coords.longitude,
          pos.coords.latitude,
        ];
        initMap(loc);
      },
      (err) => {
        console.log("Geolocation failed, using default center:", err.message);
        initMap(defaultCenter);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    // No geolocation support → just use default
    initMap(defaultCenter);
  }

  return () => {
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
  };
}, []);


  // ---- render photo markers only (single element with padding respected) ----
  useEffect(() => {
    if (!map.current) return;

    // remove old
    Object.values(photoMarkers.current).forEach((mk) => mk.remove());
    photoMarkers.current = {};

    photos.forEach((photo) => {
      if (!map.current) return;

      const el = document.createElement("div");
      el.className = "camera-marker";
      el.style.width = "40px";
      el.style.height = "40px";
      el.style.padding = "8px"; // visible “breathing room”
      el.style.borderRadius = "50%";
      el.style.cursor = "pointer";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      el.style.backgroundImage = `url(${photoIcon})`;
      el.style.backgroundRepeat = "no-repeat";
      el.style.backgroundPosition = "center";
      el.style.backgroundSize = "80%";
      el.style.backgroundOrigin = "padding-box"; // ← make padding affect bg

      // open viewer
      el.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onPhotoClick?.(photo.signedUrl);
      });

      // right-click delete
      el.addEventListener("contextmenu", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!confirm("Delete this photo?")) return;
        try {
          await photosAPI.delete(photo.id);
          setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
        } catch (err) {
          console.error("Delete failed:", err);
          alert("Failed to delete photo. Please try again.");
        }
      });

      const mk = new mapboxgl.Marker({ element: el })
        .setLngLat([photo.longitude, photo.latitude])
        .addTo(map.current);

      photoMarkers.current[photo.id] = mk;
    });
  }, [photos, onPhotoClick]);

  // ---- expose methods ----
  useImperativeHandle(ref, () => ({
    flyToLocation: (lng: number, lat: number) => {
      const m = map.current;
      if (!m) return;
      m.flyTo({ center: [lng, lat], zoom: 14, essential: true });
      focusMarker.current?.setLngLat([lng, lat]);
    },
    requestUserLocation: () => {
      const m = map.current;
      if (!m || !("geolocation" in navigator)) {
        alert("Geolocation not supported in this browser.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          m.flyTo({ center: loc, zoom: 13, essential: true });
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

  return <div ref={mapContainer} className="h-full w-full" />;
});
