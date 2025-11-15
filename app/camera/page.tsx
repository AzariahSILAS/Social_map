"use client";

import { useRouter } from "next/navigation";
import { Camera as CameraComponent } from "@/components/Camera";

export default function CameraPage() {
  const router = useRouter();

  const handleClose = () => {
    // Go back to where the user came from (usually the map)
    router.back();
  };

  const handlePhotoSaved = () => {
    // After saving a photo, go back to the map so they see the pin
    router.back();
  };

  return (
    <div className="w-full h-screen bg-black">
      <CameraComponent
        isOpen={true}
        onClose={handleClose}
        onPhotoSaved={handlePhotoSaved}
      />
    </div>
  );
}
