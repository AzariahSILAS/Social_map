"use client";

import { useRef, useState } from "react";

import { Map, MapRef } from "@/components/Map";
import { SearchBar } from "@/components/SearchBar";
import { PhotoViewer } from "@/components/PhotoViewer";



export default function HomePage() {
  const mapRef = useRef<MapRef>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const handleLocationSelect = (lng: number, lat: number, _placeName: string) => {
    mapRef.current?.flyToLocation(lng, lat);
  };

  const handlePhotoClick = (photoUrl: string) => {
    setSelectedPhotoUrl(photoUrl);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950 text-slate-50">
      {/* Global header */}
  

      {/* Map section */}
      <main className="flex-1 relative">
        {/* Search bar overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full px-4 flex justify-center">
          <SearchBar onLocationSelect={handleLocationSelect} />
        </div>

        {/* Map */}
        <Map ref={mapRef} onPhotoClick={handlePhotoClick} />
      </main>

      {/* Global footer (camera + feed handled inside) */}
  

      {/* Fullscreen photo viewer */}
      <PhotoViewer
        photoUrl={selectedPhotoUrl}
        onClose={() => setSelectedPhotoUrl(null)}
      />
    </div>
  );
}
