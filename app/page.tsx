'use client';

import { useRef, useState } from 'react';
import { Map, MapRef } from '@/components/Map';
import { SearchBar } from '@/components/SearchBar';
import { Camera as CameraComponent } from '@/components/Camera';
import { PhotoViewer } from '@/components/PhotoViewer';
import { Camera } from 'lucide-react';

export default function App() {
  const mapRef = useRef<MapRef>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const handleLocationSelect = (lng: number, lat: number, placeName: string) => {
    mapRef.current?.flyToLocation(lng, lat);
  };

  const handlePhotoSaved = () => {
    // Reload photos on the map after a new photo is saved
    mapRef.current?.reloadPhotos();
  };

  const handlePhotoClick = (photoUrl: string) => {
    setSelectedPhotoUrl(photoUrl);
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <header className="bg-slate-900 text-white p-4">
        <h1 className="text-center">Mapbox Map Demo</h1>
      </header>
      
      <main className="flex-1 relative">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <SearchBar onLocationSelect={handleLocationSelect} />
        </div>
        
        <Map ref={mapRef} onPhotoClick={handlePhotoClick} />
      </main>
      
      <footer className="bg-slate-900 text-white p-4 flex justify-center items-center">
        <button
          onClick={() => setIsCameraOpen(true)}
          className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Open camera"
        >
          <Camera className="w-6 h-6" />
        </button>
      </footer>

      <CameraComponent 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)}
        onPhotoSaved={handlePhotoSaved}
      />

      <PhotoViewer 
        photoUrl={selectedPhotoUrl}
        onClose={() => setSelectedPhotoUrl(null)}
      />
    </div>
  );
}