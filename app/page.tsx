'use client';

import { useRef } from 'react';
import { Map, MapRef } from '@/components/Map';
import { SearchBar } from '@/components/SearchBar';
import { Camera as CameraComponent } from '@/components/Camera';
import { Camera } from 'lucide-react';
import { useState } from 'react';

export default function App() {
  const mapRef = useRef<MapRef>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleLocationSelect = (lng: number, lat: number, placeName: string) => {
    mapRef.current?.flyToLocation(lng, lat);
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
        
        <Map ref={mapRef} />
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
      />
    </div>
  );
}