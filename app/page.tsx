"use client";

import { useRef, useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

import { Map, MapRef } from "@/components/Map";
import { SearchBar } from "@/components/SearchBar";
import { Camera as CameraComponent } from "@/components/Camera";
import { PhotoViewer } from "@/components/PhotoViewer";
import { supabase } from "@/utils/supabase/client";


import { AppFooter } from "@/components/AppFooter";

export default function HomePage() {
  const router = useRouter();

  const mapRef = useRef<MapRef>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Load current user and subscribe to auth changes
  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        setUser(data.user ?? null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    void loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleLocationSelect = (lng: number, lat: number, _placeName: string) => {
    mapRef.current?.flyToLocation(lng, lat);
  };

  const handlePhotoSaved = () => {
    mapRef.current?.reloadPhotos();
  };

  const handlePhotoClick = (photoUrl: string) => {
    setSelectedPhotoUrl(photoUrl);
  };

  const handleOpenCamera = () => {
    if (!user) {
      router.push("/auth");
      return;
    }
    setIsCameraOpen(true);
  };

  const handleFeedClick = () => {
    // later: router.push("/feed")
    console.log("Feed clicked (placeholder)");
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950 text-slate-50">


      <main className="flex-1 relative">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full px-4 flex justify-center">
          <SearchBar onLocationSelect={handleLocationSelect} />
        </div>

        <Map ref={mapRef} onPhotoClick={handlePhotoClick} />
      </main>

      <AppFooter
        isLoggedIn={!!user}
        onClickFeed={handleFeedClick}
        onClickCamera={handleOpenCamera}
      />

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
