'use client';

import { useRef } from 'react';
import { Map, MapRef } from '@/components/Map';
import { SearchBar } from '@/components/SearchBar';

export default function Home() {
  const mapRef = useRef<MapRef>(null);

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
      
      <footer className="bg-slate-100 p-3 text-center text-slate-600">
        <p className="text-sm">
          Click anywhere on the map to add a marker • Right-click markers to delete
        </p>
      </footer>
    </div>
  );
}