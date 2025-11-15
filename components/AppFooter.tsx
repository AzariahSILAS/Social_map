"use client";

import { usePathname, useRouter } from "next/navigation";
import { Camera, Home, Map } from "lucide-react";

export function AppFooter() {
  const pathname = usePathname();
  const router = useRouter();

  const isCameraPage = pathname === "/camera";
  const isLoggedIn = true; // later: replace with real auth state

  return (
    <footer className=" border-t border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md text-white">
      <div className="max-w-5xl mx-auto flex items-center justify-around px-4 py-2">
        {/* Home */}
        <button
          onClick={() => router.push("/")}
          className="flex flex-col items-center text-xs hover:text-white/80 transition"
        >
          <Home
            className={`w-6 h-6 ${
              pathname === "/" ? "text-white" : "text-white/60"
            }`}
          />
          <span>Home</span>
        </button>

        {/* Camera – only if logged in & not already on /camera */}
        {isLoggedIn && !isCameraPage && (
          <button
            onClick={() => router.push("/camera")}
            className="flex flex-col items-center text-xs hover:text-white/80 transition"
          >
            <Camera
              className={`w-6 h-6 ${
                pathname === "/camera" ? "text-white" : "text-white/60"
              }`}
            />
            <span>Camera</span>
          </button>
        )}

        {/* Feed placeholder */}
        <button
          onClick={() => router.push("/feed")}
          className="flex flex-col items-center text-xs hover:text-white/80 transition"
        >
          <Map
            className={`w-6 h-6 ${
              pathname === "/feed" ? "text-white" : "text-white/60"
            }`}
          />
          <span>Feed</span>
        </button>
      </div>
    </footer>
  );
}

