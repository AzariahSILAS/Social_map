'use client';

import { useRef, useState } from 'react';
import { Map, type MapRef } from '@/components/Map';
import { SearchBar } from '@/components/SearchBar';
import { Camera as CameraIcon } from 'lucide-react';
import { Camera as CameraComponent } from '@/components/Camera';
import { PhotoViewer } from '@/components/PhotoViewer';

export default function Page() {
  const mapRef = useRef<MapRef>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const handleLocationSelect = (lng: number, lat: number) => {
    mapRef.current?.flyToLocation(lng, lat);
  };

  const handlePhotoSaved = () => {
    mapRef.current?.reloadPhotos();
  };

  return (
    <div className="relative flex h-dvh flex-col bg-background">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-3 shadow-md">
        <h1 className="text-center text-base font-medium">Social Map</h1>
      </header>

      {/* Map section */}
      <main className="relative flex-1 min-h-0">
        <div className="absolute inset-0">
          <Map
            ref={mapRef}
            onPhotoClick={(url) => setSelectedPhotoUrl(url)}
          />
        </div>

        {/* Floating Search Bar */}
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 w-full max-w-md px-3 safe-top">
          <div className="pointer-events-auto">
            <SearchBar onLocationSelect={handleLocationSelect} />
          </div>
        </div>
      </main>

      {/* Footer — matches old dark look */}
      <footer className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-center border-t border-slate-800 bg-slate-900 px-4 py-3 safe-bottom">
        <button
          onClick={() => setIsCameraOpen(true)}
          className="rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
          aria-label="Open camera"
        >
          <CameraIcon className="h-6 w-6" />
        </button>
      </footer>

      {/* Camera overlay */}
      <CameraComponent
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoSaved={handlePhotoSaved}
      />

      {/* Photo viewer overlay */}
      <PhotoViewer
        photoUrl={selectedPhotoUrl}
        onClose={() => setSelectedPhotoUrl(null)}
      />
    </div>
  );
}
